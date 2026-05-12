from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Site
from app.scripts.ingest_hrsa_sites import ingest
from app.scripts.transform_hrsa_sites import transform


@pytest.fixture
async def ingested(sample_csv: Path) -> str:
    """Ingest the sample CSV and return the source file name."""
    await ingest(sample_csv)
    return sample_csv.name


async def test_creates_orgs_and_sites(ingested: str, db_session: AsyncSession):
    n_orgs, n_sites = await transform(ingested)
    assert n_orgs == 2
    assert n_sites == 3

    orgs = (await db_session.execute(select(Organization))).scalars().all()
    assert {o.bhcmis_org_id for o in orgs} == {"ORG001", "ORG002"}

    sites = (await db_session.execute(select(Site))).scalars().all()
    assert {s.bhcmis_id for s in sites} == {"SITE001", "SITE002", "SITE003"}


async def test_sites_have_location(ingested: str, db_session: AsyncSession):
    await transform(ingested)
    sites = (await db_session.execute(select(Site))).scalars().all()
    assert all(s.location is not None for s in sites)


async def test_upsert_updates_site_name(
    sample_csv: Path, tmp_path: Path, db_session: AsyncSession
):
    await ingest(sample_csv)
    await transform(sample_csv.name)

    updated_csv = tmp_path / sample_csv.name
    updated_csv.write_text(
        sample_csv.read_text().replace("Alpha Main", "Alpha Main UPDATED")
    )
    await ingest(updated_csv, replace=True)

    site_before = await db_session.scalar(
        select(Site).where(Site.bhcmis_id == "SITE001")
    )
    assert site_before is not None
    updated_at_before = site_before.updated_at

    await transform(sample_csv.name)

    await db_session.refresh(site_before)
    assert site_before.site_name == "Alpha Main UPDATED"
    assert site_before.updated_at > updated_at_before


async def test_no_completed_run_returns_zeros(db_session: AsyncSession):
    n_orgs, n_sites = await transform("nonexistent.csv")
    assert n_orgs == 0
    assert n_sites == 0


async def test_org_npi_stays_null(ingested: str, db_session: AsyncSession):
    await transform(ingested)
    orgs = (await db_session.execute(select(Organization))).scalars().all()
    assert all(o.npi is None for o in orgs)


async def test_sites_have_npi(ingested: str, db_session: AsyncSession):
    await transform(ingested)
    sites = (await db_session.execute(select(Site))).scalars().all()
    assert all(s.npi is not None for s in sites)


async def test_site_npi_values(ingested: str, db_session: AsyncSession):
    await transform(ingested)
    sites = (await db_session.execute(select(Site))).scalars().all()
    assert {s.bhcmis_id: s.npi for s in sites} == {
        "SITE001": "1111111111",
        "SITE002": "2222222222",
        "SITE003": "3333333333",
    }
