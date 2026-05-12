from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import IngestRun, RawHrsaSite
from app.scripts.ingest_hrsa_sites import IngestRefused, ingest


async def test_creates_completed_run_and_staging_rows(
    sample_csv: Path, db_session: AsyncSession
):
    total = await ingest(sample_csv)
    assert total == 3

    run = await db_session.scalar(
        select(IngestRun).where(IngestRun.source_file == sample_csv.name)
    )
    assert run is not None
    assert run.status == "completed"
    assert run.row_count == 3
    assert run.file_sha256 is not None
    assert run.bytes is not None

    count = await db_session.scalar(
        select(func.count()).select_from(RawHrsaSite)
        .where(RawHrsaSite.source_file == sample_csv.name)
    )
    assert count == 3


async def test_refuses_without_replace_flag(sample_csv: Path):
    await ingest(sample_csv)
    with pytest.raises(IngestRefused):
        await ingest(sample_csv)


async def test_replace_wipes_prior_staging_rows(
    sample_csv: Path, db_session: AsyncSession
):
    await ingest(sample_csv)
    await ingest(sample_csv, replace=True)

    count = await db_session.scalar(
        select(func.count()).select_from(RawHrsaSite)
        .where(RawHrsaSite.source_file == sample_csv.name)
    )
    assert count == 3  # not 6; prior rows were wiped


async def test_replace_preserves_ingest_run_history(
    sample_csv: Path, db_session: AsyncSession
):
    await ingest(sample_csv)
    await ingest(sample_csv, replace=True)

    run_count = await db_session.scalar(
        select(func.count()).select_from(IngestRun)
        .where(IngestRun.source_file == sample_csv.name)
    )
    assert run_count == 2  # both attempts recorded


async def test_missing_file_raises_before_creating_run(
    tmp_path: Path, db_session: AsyncSession
):
    with pytest.raises(FileNotFoundError):
        await ingest(tmp_path / "nonexistent.csv")

    run_count = await db_session.scalar(
        select(func.count()).select_from(IngestRun)
    )
    assert run_count == 0
