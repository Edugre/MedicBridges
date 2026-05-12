# backend/app/scripts/ingest_hrsa_sites.py
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from sqlalchemy import delete, func, insert, select, update

from app.db.session import SessionLocal, dispose_engine
from app.models import IngestRun, RawHrsaSite

logger = logging.getLogger("ingest_hrsa_sites")

DEFAULT_CSV = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
)
BATCH_SIZE = 1000
HASH_READ_CHUNK = 64 * 1024
ERROR_TRUNCATE = 2000


class IngestRefused(Exception):
    """Raised when prior data exists for source_file and --replace was not passed."""


def iter_csv_rows(csv_path: Path) -> Iterator[dict[str, str]]:
    """Yield each CSV row as a dict, dropping the empty trailing column
    that comes from the trailing comma in the header."""
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row.pop("", None)
            yield row


def _hash_file(csv_path: Path) -> tuple[str, int]:
    """Stream the file once to compute sha256 and total bytes.

    Done before any DB work so the ingest catalog can record the byte-level
    identity of the source artifact even if the staging load fails.
    """
    h = hashlib.sha256()
    total = 0
    with csv_path.open("rb") as f:
        while True:
            chunk = f.read(HASH_READ_CHUNK)
            if not chunk:
                break
            h.update(chunk)
            total += len(chunk)
    return h.hexdigest(), total


async def _open_ingest_run(
    source_file: str,
    started_at: datetime,
    file_sha256: str,
    bytes_count: int,
    *,
    replace: bool,
) -> uuid.UUID:
    """Refuse if staging is non-empty without --replace, otherwise commit a
    ``status='running'`` IngestRun and return its id.

    Committed in its own transaction so the in-flight run is observable and
    survives a crash of the staging load that follows.
    """
    async with SessionLocal() as session:
        existing = await session.scalar(
            select(func.count())
            .select_from(RawHrsaSite)
            .where(RawHrsaSite.source_file == source_file)
        )
        if existing and not replace:
            raise IngestRefused(
                f"{existing} prior rows exist for source_file={source_file!r}; "
                "pass --replace to delete prior rows before ingesting"
            )

        run = IngestRun(
            source_file=source_file,
            started_at=started_at,
            status="running",
            file_sha256=file_sha256,
            bytes=bytes_count,
        )
        session.add(run)
        await session.flush()
        run_id = run.id
        await session.commit()
        return run_id


async def _load_staging(
    csv_path: Path,
    source_file: str,
    ingested_at: datetime,
    run_id: uuid.UUID,
    batch_size: int,
    *,
    replace: bool,
) -> int:
    """Insert staging rows and mark the IngestRun completed in one transaction.

    All staging rows are written with ``ingested_at`` set explicitly to the
    same timestamp as the IngestRun's ``started_at``, and ``ingest_run_id``
    set to this run's id, so the transform can resolve the snapshot via the
    catalog and filter staging on a stable batch key.
    """
    total = 0
    batch: list[dict] = []

    async with SessionLocal() as session:
        if replace:
            deleted = await session.execute(
                delete(RawHrsaSite).where(RawHrsaSite.source_file == source_file)
            )
            logger.info(
                "deleted %s prior rows for source_file=%s",
                deleted.rowcount,
                source_file,
            )

        for row in iter_csv_rows(csv_path):
            batch.append(
                {
                    "source_file": source_file,
                    "ingest_run_id": run_id,
                    "raw_data": row,
                    "ingested_at": ingested_at,
                }
            )
            if len(batch) >= batch_size:
                await session.execute(insert(RawHrsaSite), batch)
                total += len(batch)
                batch.clear()
                logger.info("inserted %s rows", total)

        if batch:
            await session.execute(insert(RawHrsaSite), batch)
            total += len(batch)

        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="completed",
                completed_at=func.now(),
                row_count=total,
            )
        )
        await session.commit()

    return total


async def _record_failure(run_id: uuid.UUID, error: str) -> None:
    """Persist the failure in its own transaction so the forensic record
    survives even when the staging-load transaction rolled back."""
    async with SessionLocal() as session:
        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="failed",
                completed_at=func.now(),
                error=error[:ERROR_TRUNCATE],
            )
        )
        await session.commit()


async def ingest(
    csv_path: Path,
    batch_size: int = BATCH_SIZE,
    *,
    replace: bool = False,
) -> int:
    source_file = csv_path.name

    file_sha256, bytes_count = _hash_file(csv_path)
    started_at = datetime.now(timezone.utc)

    run_id = await _open_ingest_run(
        source_file,
        started_at,
        file_sha256,
        bytes_count,
        replace=replace,
    )

    try:
        total = await _load_staging(
            csv_path,
            source_file,
            started_at,
            run_id,
            batch_size,
            replace=replace,
        )
    except Exception as e:
        await _record_failure(run_id, repr(e))
        raise

    logger.info(
        "done: %s rows from %s (run_id=%s sha256=%s)",
        total,
        source_file,
        run_id,
        file_sha256,
    )
    return total


async def _run(
    csv_path: Path, batch_size: int, *, replace: bool
) -> None:
    try:
        await ingest(csv_path, batch_size, replace=replace)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Ingest an HRSA site CSV into raw_hrsa_sites. Records the attempt "
            "in ingest_runs (kept across --replace) for operational history."
        )
    )
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument(
        "--replace",
        action="store_true",
        help=(
            "Delete prior rows for this source_file before ingesting. "
            "Without this flag, ingest refuses if any rows already exist for "
            "the file; the ingest_runs catalog is preserved either way."
        ),
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(
            _run(
                args.csv,
                args.batch_size,
                replace=args.replace,
            )
        )
    except IngestRefused as e:
        sys.exit(f"REFUSED: {e}")


if __name__ == "__main__":
    main()
