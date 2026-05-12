from __future__ import annotations

import argparse
import asyncio
import logging
import re
import sys
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone

from rapidfuzz import fuzz as rfuzz
from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, dispose_engine
from app.models import IngestRun, NpiMatchCandidate, RawHrsaSite, RawNppesProvider, Site

logger = logging.getLogger("match_nppes_sites")

HRSA_SOURCE_FILE = "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
NPPES_SOURCE_FILE = "npidata_pfile_20050523-20260510.csv"
MATCH_SOURCE_FILE = "match_nppes_sites"

FQHC_TYPE = "Federally Qualified Health Center (FQHC)"
BATCH_SIZE = 500
ERROR_TRUNCATE = 2000

T1_NAME_SIM_ACCEPT = 0.80
T2_ADDR_SIM_MIN    = 0.85
T2_NAME_SIM_MIN    = 0.70
T2_SCORE_ACCEPT    = 0.85
T3_NAME_SIM_MIN    = 0.80

_SUITE_RE = re.compile(
    r'[,\s]*\b(?:STE|SUITE|APT|UNIT|BLDG|FL|RM|ROOM)\b.*$'
    r'|[,\s]*#.*$'
)
_TRAILING_PUNCT_RE = re.compile(r'[,.\s]+$')


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

def _normalize(s: str) -> str:
    return re.sub(r'\s+', ' ', s.upper().strip())


def _normalize_address(s: str) -> str:
    return _TRAILING_PUNCT_RE.sub('', _SUITE_RE.sub('', _normalize(s)))


def _normalize_zip(s: str) -> str:
    return s.strip()[:5]


# ---------------------------------------------------------------------------
# NPPES in-memory lookup
# ---------------------------------------------------------------------------

@dataclass
class _NppesRow:
    npi: str
    legal_name: str       # raw, for DB storage
    legal_name_norm: str
    raw_address: str      # raw, for DB storage
    address_norm: str
    city: str             # raw
    city_norm: str
    state: str            # raw
    state_norm: str
    zip5: str


async def _load_nppes_lookup(
    session: AsyncSession,
    nppes_run_id: uuid.UUID,
) -> tuple[
    dict[tuple[str, str], list[_NppesRow]],
    dict[str, list[_NppesRow]],
    dict[str, list[_NppesRow]],
]:
    """Load all staged NPPES rows into three in-memory lookup dicts.

    Returns (by_address, by_zip, by_state). 18 K rows fit in memory;
    no server-side cursor needed.
    """
    stmt = select(RawNppesProvider.raw_data).where(
        RawNppesProvider.ingest_run_id == nppes_run_id
    )
    raw_rows = (await session.execute(stmt)).scalars().all()

    by_address: dict[tuple[str, str], list[_NppesRow]] = defaultdict(list)
    by_zip: dict[str, list[_NppesRow]] = defaultdict(list)
    by_state: dict[str, list[_NppesRow]] = defaultdict(list)

    for raw in raw_rows:
        npi = (raw.get("NPI") or "").strip()
        legal_name = (raw.get("Provider Organization Name (Legal Business Name)") or "").strip()
        raw_address = (raw.get("Provider First Line Business Practice Location Address") or "").strip()
        city = (raw.get("Provider Business Practice Location Address City Name") or "").strip()
        state = (raw.get("Provider Business Practice Location Address State Name") or "").strip()
        zip_raw = (raw.get("Provider Business Practice Location Address Postal Code") or "").strip()

        if not npi or not legal_name:
            continue

        row = _NppesRow(
            npi=npi,
            legal_name=legal_name,
            legal_name_norm=_normalize(legal_name),
            raw_address=raw_address,
            address_norm=_normalize_address(raw_address),
            city=city,
            city_norm=_normalize(city),
            state=state,
            state_norm=_normalize(state),
            zip5=_normalize_zip(zip_raw),
        )
        by_address[(row.zip5, row.address_norm)].append(row)
        by_zip[row.zip5].append(row)
        by_state[row.state_norm].append(row)

    logger.info("loaded %s NPPES rows into lookup", len(raw_rows))
    return by_address, by_zip, by_state


# ---------------------------------------------------------------------------
# Ingest run helpers
# ---------------------------------------------------------------------------

async def _resolve_latest_ingest_run_id(
    session: AsyncSession, source_file: str
) -> uuid.UUID | None:
    stmt = (
        select(IngestRun.id)
        .where(IngestRun.source_file == source_file)
        .where(IngestRun.status == "completed")
        .order_by(IngestRun.completed_at.desc())
        .limit(1)
    )
    return await session.scalar(stmt)


# ---------------------------------------------------------------------------
# Match logic (pure)
# ---------------------------------------------------------------------------

@dataclass
class _MatchResult:
    candidate: _NppesRow
    score: float
    tier: int
    status: str
    matched_on: dict


def _sim(a: str, b: str) -> float:
    return rfuzz.token_sort_ratio(a, b) / 100.0


def _match_site(
    name_norm: str,
    addr_norm: str,
    city_norm: str,
    state_norm: str,
    zip5: str,
    by_address: dict,
    by_zip: dict,
    by_state: dict,
) -> _MatchResult | None:
    # Tier 1 — exact (zip5, normalised address)
    t1 = by_address.get((zip5, addr_norm), [])
    if t1:
        if len(t1) == 1:
            c = t1[0]
            return _MatchResult(c, 1.0, 1, "accepted", {"zip": zip5, "address": addr_norm})
        best = max(t1, key=lambda r: _sim(name_norm, r.legal_name_norm))
        name_sim = _sim(name_norm, best.legal_name_norm)
        status = "accepted" if name_sim >= T1_NAME_SIM_ACCEPT else "pending"
        return _MatchResult(best, name_sim, 1, status, {"zip": zip5, "address": addr_norm})

    # Tier 2 — fuzzy address within same ZIP
    best_t2: _MatchResult | None = None
    for c in by_zip.get(zip5, []):
        addr_sim = _sim(addr_norm, c.address_norm)
        name_sim = _sim(name_norm, c.legal_name_norm)
        if addr_sim >= T2_ADDR_SIM_MIN and name_sim >= T2_NAME_SIM_MIN:
            score = (addr_sim + name_sim) / 2
            if best_t2 is None or score > best_t2.score:
                best_t2 = _MatchResult(
                    c, score,
                    2,
                    "accepted" if score >= T2_SCORE_ACCEPT else "pending",
                    {"zip": zip5, "addr_sim": round(addr_sim, 4), "name_sim": round(name_sim, 4)},
                )
    if best_t2:
        return best_t2

    # Tier 3 — name similarity within same city + state
    best_t3: _MatchResult | None = None
    for c in by_state.get(state_norm, []):
        if c.city_norm != city_norm:
            continue
        name_sim = _sim(name_norm, c.legal_name_norm)
        if name_sim >= T3_NAME_SIM_MIN:
            if best_t3 is None or name_sim > best_t3.score:
                best_t3 = _MatchResult(
                    c, name_sim, 3, "pending",
                    {"city": city_norm, "state": state_norm, "name_sim": round(name_sim, 4)},
                )
    return best_t3


# ---------------------------------------------------------------------------
# Flush
# ---------------------------------------------------------------------------

async def _flush_candidates(session: AsyncSession, chunk: list[dict]) -> None:
    stmt = pg_insert(NpiMatchCandidate).values(chunk)
    stmt = stmt.on_conflict_do_update(
        index_elements=["site_id", "candidate_npi"],
        set_={
            "match_tier":       stmt.excluded.match_tier,
            "match_score":      stmt.excluded.match_score,
            "matched_on":       stmt.excluded.matched_on,
            "nppes_legal_name": stmt.excluded.nppes_legal_name,
            "nppes_address":    stmt.excluded.nppes_address,
            "nppes_city":       stmt.excluded.nppes_city,
            "nppes_state":      stmt.excluded.nppes_state,
            "nppes_zip5":       stmt.excluded.nppes_zip5,
            "status":           stmt.excluded.status,
            "ingest_run_id":    stmt.excluded.ingest_run_id,
            "updated_at":       func.now(),
        },
    )
    await session.execute(stmt)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

async def _run_match(
    run_id: uuid.UUID,
    hrsa_run_id: uuid.UUID,
    by_address: dict,
    by_zip: dict,
    by_state: dict,
) -> dict:
    counts = {"tier1": 0, "tier2": 0, "tier3": 0, "conflict": 0, "no_match": 0, "total": 0}
    chunk: list[dict] = []

    stream_stmt = (
        select(Site.id, Site.site_name, Site.npi, RawHrsaSite.raw_data)
        .join(
            RawHrsaSite,
            and_(
                RawHrsaSite.ingest_run_id == hrsa_run_id,
                RawHrsaSite.raw_data["BPHC Assigned Number"].astext == Site.bhcmis_id,
            ),
        )
        .where(RawHrsaSite.raw_data["Health Center Type"].astext == FQHC_TYPE)
        .where(Site.bhcmis_id.is_not(None))
    )

    async with SessionLocal() as read_session, SessionLocal() as write_session:
        result = await read_session.stream(stream_stmt)
        try:
            async with write_session.begin():
                async for site_id, site_name, site_npi, raw in result:
                    counts["total"] += 1

                    addr_norm  = _normalize_address((raw.get("Site Address") or "").strip())
                    name_norm  = _normalize(site_name)
                    city_norm  = _normalize((raw.get("Site City") or "").strip())
                    state_norm = _normalize((raw.get("Site State Abbreviation") or "").strip())
                    zip5       = _normalize_zip((raw.get("Site Postal Code") or "").strip())

                    m = _match_site(name_norm, addr_norm, city_norm, state_norm, zip5,
                                    by_address, by_zip, by_state)
                    if m is None:
                        counts["no_match"] += 1
                        continue

                    status = m.status
                    if site_npi and m.candidate.npi != site_npi:
                        status = "conflict"
                        counts["conflict"] += 1
                    else:
                        counts[f"tier{m.tier}"] += 1

                    chunk.append({
                        "site_id":          site_id,
                        "ingest_run_id":    run_id,
                        "candidate_npi":    m.candidate.npi,
                        "match_tier":       m.tier,
                        "match_score":      round(m.score, 4),
                        "matched_on":       m.matched_on,
                        "nppes_legal_name": m.candidate.legal_name,
                        "nppes_address":    m.candidate.raw_address,
                        "nppes_city":       m.candidate.city,
                        "nppes_state":      m.candidate.state,
                        "nppes_zip5":       m.candidate.zip5,
                        "status":           status,
                    })

                    if len(chunk) >= BATCH_SIZE:
                        await _flush_candidates(write_session, chunk)
                        chunk.clear()
                        logger.info(
                            "processed=%s t1=%s t2=%s t3=%s conflict=%s no_match=%s",
                            counts["total"], counts["tier1"], counts["tier2"],
                            counts["tier3"], counts["conflict"], counts["no_match"],
                        )

                if chunk:
                    await _flush_candidates(write_session, chunk)
        finally:
            await result.close()

    return counts


async def match(
    hrsa_source_file: str = HRSA_SOURCE_FILE,
    nppes_source_file: str = NPPES_SOURCE_FILE,
    *,
    replace: bool = False,
) -> dict:
    async with SessionLocal() as session:
        existing = await session.scalar(
            select(func.count()).select_from(NpiMatchCandidate)
        )
        if existing and not replace:
            raise RuntimeError(
                f"{existing} match candidates already exist; pass --replace to re-run"
            )

        hrsa_run_id = await _resolve_latest_ingest_run_id(session, hrsa_source_file)
        nppes_run_id = await _resolve_latest_ingest_run_id(session, nppes_source_file)

        if hrsa_run_id is None:
            raise RuntimeError(f"no completed ingest_run for {hrsa_source_file!r}")
        if nppes_run_id is None:
            raise RuntimeError(f"no completed ingest_run for {nppes_source_file!r}")

        started_at = datetime.now(timezone.utc)
        run = IngestRun(
            source_file=MATCH_SOURCE_FILE,
            started_at=started_at,
            status="running",
        )
        session.add(run)
        await session.flush()
        run_id = run.id
        await session.commit()

    try:
        async with SessionLocal() as session:
            if replace:
                await session.execute(delete(NpiMatchCandidate))
                await session.commit()
            by_address, by_zip, by_state = await _load_nppes_lookup(session, nppes_run_id)

        counts = await _run_match(run_id, hrsa_run_id, by_address, by_zip, by_state)

    except Exception as e:
        async with SessionLocal() as session:
            await session.execute(
                update(IngestRun)
                .where(IngestRun.id == run_id)
                .values(
                    status="failed",
                    completed_at=func.now(),
                    error=repr(e)[:ERROR_TRUNCATE],
                )
            )
            await session.commit()
        raise

    total_matched = counts["tier1"] + counts["tier2"] + counts["tier3"] + counts["conflict"]
    async with SessionLocal() as session:
        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="completed",
                completed_at=func.now(),
                row_count=total_matched,
                rows_read=counts["total"],
                rows_passed_filter=total_matched,
                stats={
                    "sites_processed": counts["total"],
                    "tier1_matches":   counts["tier1"],
                    "tier2_matches":   counts["tier2"],
                    "tier3_matches":   counts["tier3"],
                    "conflicts":       counts["conflict"],
                    "no_match":        counts["no_match"],
                },
            )
        )
        await session.commit()

    logger.info(
        "done: processed=%s t1=%s t2=%s t3=%s conflict=%s no_match=%s (run_id=%s)",
        counts["total"], counts["tier1"], counts["tier2"],
        counts["tier3"], counts["conflict"], counts["no_match"], run_id,
    )
    return counts


async def _run(
    hrsa_source_file: str,
    nppes_source_file: str,
    *,
    replace: bool,
) -> None:
    try:
        await match(hrsa_source_file, nppes_source_file, replace=replace)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Match HRSA FQHC sites against staged NPPES providers"
    )
    parser.add_argument("--hrsa-source-file", default=HRSA_SOURCE_FILE)
    parser.add_argument("--nppes-source-file", default=NPPES_SOURCE_FILE)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete all existing npi_match_candidates before running",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(
            _run(args.hrsa_source_file, args.nppes_source_file, replace=args.replace)
        )
    except RuntimeError as e:
        sys.exit(f"ERROR: {e}")


if __name__ == "__main__":
    main()
