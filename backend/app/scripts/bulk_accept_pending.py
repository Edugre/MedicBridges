from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime, timezone

from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, dispose_engine
from app.models import IngestRun, NpiMatchCandidate, Site

logger = logging.getLogger("bulk_accept_pending")

SCRIPT_SOURCE_FILE = "bulk_accept_pending"
BATCH_SIZE = 500
ERROR_TRUNCATE = 2000

T2_SCORE_MIN = 0.84
T3_SCORE_MIN = 0.95


def _qualifying_where():
    return (NpiMatchCandidate.status == "pending") & (
        ((NpiMatchCandidate.match_tier == 2) & (NpiMatchCandidate.match_score >= T2_SCORE_MIN))
        | ((NpiMatchCandidate.match_tier == 3) & (NpiMatchCandidate.match_score >= T3_SCORE_MIN))
    )


async def _count_qualifying(session: AsyncSession) -> dict:
    t2 = await session.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .where(NpiMatchCandidate.status == "pending")
        .where(NpiMatchCandidate.match_tier == 2)
        .where(NpiMatchCandidate.match_score >= T2_SCORE_MIN)
    ) or 0
    t3 = await session.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .where(NpiMatchCandidate.status == "pending")
        .where(NpiMatchCandidate.match_tier == 3)
        .where(NpiMatchCandidate.match_score >= T3_SCORE_MIN)
    ) or 0
    return {"tier2": t2, "tier3": t3, "total": t2 + t3}


async def _flush_batch(
    session: AsyncSession,
    chunk: list[dict],
) -> tuple[int, int]:
    site_npi_map = {row["site_id"]: row["candidate_npi"] for row in chunk}
    candidate_ids = [row["candidate_id"] for row in chunk]
    now_utc = datetime.now(timezone.utc)

    org_npi_expr = case(
        *[(Site.id == site_id, npi) for site_id, npi in site_npi_map.items()],
        else_=Site.org_npi,
    )
    site_result = await session.execute(
        update(Site)
        .where(Site.id.in_(list(site_npi_map.keys())))
        .where(Site.org_npi.is_(None))
        .values(org_npi=org_npi_expr, updated_at=func.now())
    )
    sites_updated = site_result.rowcount

    await session.execute(
        update(NpiMatchCandidate)
        .where(NpiMatchCandidate.id.in_(candidate_ids))
        .values(
            status="promoted",
            reviewed_at=now_utc,
            reviewed_by="bulk_accept",
            updated_at=func.now(),
        )
    )

    skipped = len(chunk) - sites_updated
    return sites_updated, skipped


async def _run_bulk_accept() -> dict:
    counts = {"promoted": 0, "skipped": 0}
    chunk: list[dict] = []

    stream_stmt = (
        select(
            NpiMatchCandidate.id,
            NpiMatchCandidate.site_id,
            NpiMatchCandidate.candidate_npi,
        )
        .where(_qualifying_where())
        .order_by(NpiMatchCandidate.created_at)
    )

    async with SessionLocal() as read_session, SessionLocal() as write_session:
        result = await read_session.stream(stream_stmt)
        try:
            async with write_session.begin():
                async for cand_id, site_id, candidate_npi in result:
                    chunk.append({
                        "candidate_id":  cand_id,
                        "site_id":       site_id,
                        "candidate_npi": candidate_npi,
                    })

                    if len(chunk) >= BATCH_SIZE:
                        promoted, skipped = await _flush_batch(write_session, chunk)
                        counts["promoted"] += promoted
                        counts["skipped"] += skipped
                        chunk.clear()
                        logger.info(
                            "promoted=%s skipped=%s",
                            counts["promoted"], counts["skipped"],
                        )

                if chunk:
                    promoted, skipped = await _flush_batch(write_session, chunk)
                    counts["promoted"] += promoted
                    counts["skipped"] += skipped
        finally:
            await result.close()

    return counts


async def bulk_accept(*, execute: bool = False) -> dict:
    async with SessionLocal() as session:
        qualifying = await _count_qualifying(session)

    print(f"Tier 2 (score >= {T2_SCORE_MIN}): {qualifying['tier2']} candidates")
    print(f"Tier 3 (score >= {T3_SCORE_MIN}): {qualifying['tier3']} candidates")
    print(f"Total to promote: {qualifying['total']}")

    if not execute:
        print("\nDry-run mode — pass --execute to apply changes.")
        return qualifying

    if qualifying["total"] == 0:
        print("\nNothing to promote.")
        return qualifying

    async with SessionLocal() as session:
        run = IngestRun(
            source_file=SCRIPT_SOURCE_FILE,
            started_at=datetime.now(timezone.utc),
            status="running",
        )
        session.add(run)
        await session.flush()
        run_id = run.id
        await session.commit()

    try:
        counts = await _run_bulk_accept()
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

    async with SessionLocal() as session:
        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="completed",
                completed_at=func.now(),
                row_count=counts["promoted"],
                rows_read=qualifying["total"],
                rows_passed_filter=counts["promoted"],
                stats={
                    "tier2_qualifying": qualifying["tier2"],
                    "tier3_qualifying": qualifying["tier3"],
                    "promoted":         counts["promoted"],
                    "skipped_org_npi_already_set": counts["skipped"],
                },
            )
        )
        await session.commit()

    print(f"\nPromoted: {counts['promoted']}")
    print(f"Skipped (org_npi already set): {counts['skipped']}")
    logger.info(
        "done: promoted=%s skipped=%s (run_id=%s)",
        counts["promoted"], counts["skipped"], run_id,
    )
    return counts


async def _run(*, execute: bool) -> None:
    try:
        await bulk_accept(execute=execute)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bulk-promote high-confidence pending NPI match candidates"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply changes (default is dry-run)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(_run(execute=args.execute))
    except RuntimeError as e:
        sys.exit(f"ERROR: {e}")


if __name__ == "__main__":
    main()
