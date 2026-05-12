from __future__ import annotations

import argparse
import asyncio
import logging
import uuid
from collections.abc import AsyncIterator

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, dispose_engine
from app.models import IngestRun, Organization, RawHrsaSite, Site

logger = logging.getLogger("transform_hrsa_sites")

DEFAULT_SOURCE_FILE = "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
SITE_BATCH_SIZE = 1000


async def _resolve_latest_ingest_run_id(
    session: AsyncSession, source_file: str
) -> uuid.UUID | None:
    """Return the ingest run id for the most recent successful ingest.

    Staging rows are keyed by ``ingest_run_id`` so the snapshot is unambiguous
    even if two runs share the same ``started_at`` clock value. Both passes
    below filter on this id so they see the same batch under READ COMMITTED.
    """
    stmt = (
        select(IngestRun.id)
        .where(IngestRun.source_file == source_file)
        .where(IngestRun.status == "completed")
        .order_by(IngestRun.completed_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _stream_raw_rows(
    session: AsyncSession, source_file: str, ingest_run_id: uuid.UUID
) -> AsyncIterator[dict]:
    """Yield raw_data JSONB blobs for the snapshot one row at a time.

    Uses a server-side cursor so memory is bounded by the driver's prefetch
    window instead of the full snapshot size. The caller must not run other
    statements on the same session while iterating; flushes during the site
    pass go through a separate write session.
    """
    stmt = (
        select(RawHrsaSite.raw_data)
        .where(RawHrsaSite.source_file == source_file)
        .where(RawHrsaSite.ingest_run_id == ingest_run_id)
    )
    result = await session.stream(stmt)
    try:
        async for (raw_data,) in result:
            yield raw_data
    finally:
        await result.close()


async def _upsert_organizations(
    read_session: AsyncSession,
    write_session: AsyncSession,
    source_file: str,
    ingest_run_id: uuid.UUID,
) -> dict[str, uuid.UUID]:
    """Stream the snapshot, dedupe by BHCMIS Org ID, upsert, return {bhcmis_org_id: id}.

    The stream is fully drained before the upsert runs, so the cursor on
    read_session is closed by the time write_session executes.

    Note: HRSA's site-delivery CSV does not expose an organization-level NPI;
    the only NPI column is "FQHC Site NPI Number", which is per-site and is
    written to sites.npi in _upsert_sites. organizations.npi is intentionally
    left unset here and is expected to be populated from another source
    (e.g. NPPES) by a separate transform.
    """
    seen: dict[str, dict] = {}
    async for row in _stream_raw_rows(read_session, source_file, ingest_run_id):
        bhcmis_org_id = (row.get("BHCMIS Organization Identification Number") or "").strip()
        legal_name = (row.get("Health Center Name") or "").strip()
        if not bhcmis_org_id or not legal_name:
            continue
        seen[bhcmis_org_id] = {
            "bhcmis_org_id": bhcmis_org_id,
            "legal_name": legal_name,
        }

    if not seen:
        return {}

    stmt = pg_insert(Organization).values(list(seen.values()))
    stmt = stmt.on_conflict_do_update(
        index_elements=["bhcmis_org_id"],
        set_={"legal_name": stmt.excluded.legal_name},
    ).returning(Organization.id, Organization.bhcmis_org_id)
    result = await write_session.execute(stmt)
    return {r.bhcmis_org_id: r.id for r in result}


def _location_expr(row: dict):
    x = (row.get("Geocoding Artifact Address Primary X Coordinate") or "").strip()
    y = (row.get("Geocoding Artifact Address Primary Y Coordinate") or "").strip()
    if not x or not y:
        return None
    try:
        float(x)
        float(y)
    except ValueError:
        return None
    return func.ST_GeogFromText(f"SRID=4326;POINT({x} {y})")


def _site_values(row: dict, org_id_by_bhcmis: dict[str, uuid.UUID]) -> dict | None:
    bhcmis_org_id = (row.get("BHCMIS Organization Identification Number") or "").strip()
    organization_id = org_id_by_bhcmis.get(bhcmis_org_id)
    if organization_id is None:
        return None
    bhcmis_id = (row.get("BPHC Assigned Number") or "").strip()
    site_name = (row.get("Site Name") or "").strip()
    if not bhcmis_id or not site_name:
        return None
    return {
        "organization_id": organization_id,
        "bhcmis_id": bhcmis_id,
        "site_name": site_name,
        "address": (row.get("Site Address") or None),
        "city": (row.get("Site City") or None),
        "state": (row.get("Site State Abbreviation") or None),
        "zip_code": (row.get("Site Postal Code") or None),
        "phone": (row.get("Site Telephone Number") or None),
        "npi": (row.get("FQHC Site NPI Number") or None),
        "location": _location_expr(row),
    }


async def _flush_site_chunk(session: AsyncSession, chunk: list[dict]) -> None:
    stmt = pg_insert(Site).values(chunk)
    stmt = stmt.on_conflict_do_update(
        index_elements=["bhcmis_id"],
        set_={
            "organization_id": stmt.excluded.organization_id,
            "site_name": stmt.excluded.site_name,
            "address": stmt.excluded.address,
            "city": stmt.excluded.city,
            "state": stmt.excluded.state,
            "zip_code": stmt.excluded.zip_code,
            "phone": stmt.excluded.phone,
            "npi": stmt.excluded.npi,
            "location": stmt.excluded.location,
            "updated_at": func.now(),
        },
    )
    await session.execute(stmt)


async def _upsert_sites(
    read_session: AsyncSession,
    write_session: AsyncSession,
    source_file: str,
    ingest_run_id: uuid.UUID,
    org_id_by_bhcmis: dict[str, uuid.UUID],
) -> int:
    """Stream the snapshot again; flush sites in SITE_BATCH_SIZE chunks.

    Reads use the streaming read_session; writes go to write_session so the
    server-side cursor on read_session's connection isn't blocked by the
    upsert statement.
    """
    chunk: list[dict] = []
    total = 0
    async for row in _stream_raw_rows(read_session, source_file, ingest_run_id):
        values = _site_values(row, org_id_by_bhcmis)
        if values is None:
            continue
        chunk.append(values)
        if len(chunk) >= SITE_BATCH_SIZE:
            await _flush_site_chunk(write_session, chunk)
            total += len(chunk)
            chunk = []
            logger.info("upserted %s sites", total)
    if chunk:
        await _flush_site_chunk(write_session, chunk)
        total += len(chunk)
        logger.info("upserted %s sites", total)
    return total


async def transform(source_file: str) -> tuple[int, int]:
    async with SessionLocal() as read_session, SessionLocal() as write_session:
        ingest_run_id = await _resolve_latest_ingest_run_id(read_session, source_file)
        if ingest_run_id is None:
            logger.warning(
                "no completed ingest_run found for source_file=%s", source_file
            )
            return 0, 0
        async with write_session.begin():
            org_id_by_bhcmis = await _upsert_organizations(
                read_session, write_session, source_file, ingest_run_id
            )
            n_sites = await _upsert_sites(
                read_session,
                write_session,
                source_file,
                ingest_run_id,
                org_id_by_bhcmis,
            )
    logger.info("done: %s organizations, %s sites", len(org_id_by_bhcmis), n_sites)
    return len(org_id_by_bhcmis), n_sites


async def _run(source_file: str) -> None:
    try:
        await transform(source_file)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Transform raw_hrsa_sites into organizations + sites"
    )
    parser.add_argument("--source-file", default=DEFAULT_SOURCE_FILE)
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )
    asyncio.run(_run(args.source_file))


if __name__ == "__main__":
    main()

