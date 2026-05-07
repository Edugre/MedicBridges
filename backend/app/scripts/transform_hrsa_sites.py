from __future__ import annotations

import argparse
import asyncio
import logging
import uuid
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, engine
from app.models import Organization, RawHrsaSite, Site

logger = logging.getLogger("transform_hrsa_sites")

DEFAULT_SOURCE_FILE = "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
SITE_BATCH_SIZE = 1000


async def _load_latest_raw_rows(
    session: AsyncSession, source_file: str
) -> list[dict]:
    """Return raw_data JSONB blobs from the most recent ingestion of source_file."""
    latest = (
        select(func.max(RawHrsaSite.ingested_at))
        .where(RawHrsaSite.source_file == source_file)
        .scalar_subquery()
    )
    stmt = (
        select(RawHrsaSite.raw_data)
        .where(RawHrsaSite.source_file == source_file)
        .where(RawHrsaSite.ingested_at == latest)
    )
    result = await session.execute(stmt)
    return [row[0] for row in result.all()]


async def _upsert_organizations(
    session: AsyncSession, rows: Iterable[dict]
) -> dict[str, uuid.UUID]:
    """Dedupe rows by BHCMIS Org ID, upsert, and return {bhcmis_org_id: id}."""
    seen: dict[str, dict] = {}
    for row in rows:
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
    result = await session.execute(stmt)
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


async def _upsert_sites(
    session: AsyncSession,
    rows: Iterable[dict],
    org_id_by_bhcmis: dict[str, uuid.UUID],
) -> int:
    """Upsert sites in batches keyed by bhcmis_id (BPHC Assigned Number)."""
    values: list[dict] = []
    for row in rows:
        bhcmis_org_id = (row.get("BHCMIS Organization Identification Number") or "").strip()
        organization_id = org_id_by_bhcmis.get(bhcmis_org_id)
        if organization_id is None:
            continue
        bhcmis_id = (row.get("BPHC Assigned Number") or "").strip()
        site_name = (row.get("Site Name") or "").strip()
        if not bhcmis_id or not site_name:
            continue
        values.append(
            {
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
        )

    total = 0
    for i in range(0, len(values), SITE_BATCH_SIZE):
        chunk = values[i : i + SITE_BATCH_SIZE]
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
            },
        )
        await session.execute(stmt)
        total += len(chunk)
        logger.info("upserted %s sites", total)
    return total


async def transform(source_file: str) -> tuple[int, int]:
    async with SessionLocal() as session:
        rows = await _load_latest_raw_rows(session, source_file)
        if not rows:
            logger.warning("no rows found for source_file=%s", source_file)
            return 0, 0
        org_id_by_bhcmis = await _upsert_organizations(session, rows)
        n_sites = await _upsert_sites(session, rows, org_id_by_bhcmis)
        await session.commit()
    logger.info("done: %s organizations, %s sites", len(org_id_by_bhcmis), n_sites)
    return len(org_id_by_bhcmis), n_sites


async def _run(source_file: str) -> None:
    try:
        await transform(source_file)
    finally:
        await engine.dispose()


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