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
from app.models import IngestRun, RawNppesProvider

logger = logging.getLogger("ingest_nppes")

DEFAULT_CSV = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "npidata_pfile_20050523-20260510.csv"
)
BATCH_SIZE = 1000
HASH_READ_CHUNK = 64 * 1024
ERROR_TRUNCATE = 2000

FQHC_TAXONOMY = "261QF0400X"
_TAXONOMY_CODE_COLS = tuple(
    f"Healthcare Provider Taxonomy Code_{i}" for i in range(1, 16)
)

# Columns extracted into raw_data; everything else is discarded.
_KEEP_COLS: frozenset[str] = frozenset({
    "NPI",
    "Entity Type Code",
    "Employer Identification Number (EIN)",
    "Provider Organization Name (Legal Business Name)",
    "Provider First Line Business Practice Location Address",
    "Provider Second Line Business Practice Location Address",
    "Provider Business Practice Location Address City Name",
    "Provider Business Practice Location Address State Name",
    "Provider Business Practice Location Address Postal Code",
    "Provider Enumeration Date",
    "NPI Deactivation Date",
    "NPI Reactivation Date",
    *_TAXONOMY_CODE_COLS,
    *(f"Healthcare Provider Primary Taxonomy Switch_{i}" for i in range(1, 16)),
})


class IngestRefused(Exception):
    """Raised when prior data exists for source_file and --replace was not passed."""


def _passes_filter(row: dict[str, str]) -> bool:
    """Return True iff the row should be staged.

    Drops: non-org entities, deactivated NPIs, and rows with no FQHC taxonomy.
    """
    if row.get("Entity Type Code") != "2":
        return False
    if row.get("NPI Deactivation Date", "").strip():
        return False
    return any(
        row.get(col, "").strip() == FQHC_TAXONOMY for col in _TAXONOMY_CODE_COLS
    )


def _extract_fields(row: dict[str, str]) -> dict[str, str]:
    return {k: v for k, v in row.items() if k in _KEEP_COLS}


def _iter_csv_rows(csv_path: Path) -> Iterator[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        actual = set(reader.fieldnames or [])
        missing = _KEEP_COLS - actual
        if missing:
            raise ValueError(
                f"CSV is missing {len(missing)} required column(s): "
                + ", ".join(sorted(missing))
            )
        for row in reader:
            yield row


def _hash_file(csv_path: Path) -> tuple[str, int]:
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
    ``status='running'`` IngestRun and return its id."""
    async with SessionLocal() as session:
        existing = await session.scalar(
            select(func.count())
            .select_from(RawNppesProvider)
            .where(RawNppesProvider.source_file == source_file)
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
) -> tuple[int, int, int]:
    """Filter the CSV, insert staging rows, mark IngestRun completed.

    Returns (rows_read, rows_passed_filter, rows_staged).
    All writes happen in a single transaction so a partial failure leaves the
    DB clean and the IngestRun in 'running' state for _record_failure to update.
    """
    rows_read = 0
    rows_passed = 0
    rows_staged = 0
    batch: list[dict] = []

    async with SessionLocal() as session:
        if replace:
            deleted = await session.execute(
                delete(RawNppesProvider).where(
                    RawNppesProvider.source_file == source_file
                )
            )
            logger.info(
                "deleted %s prior rows for source_file=%s",
                deleted.rowcount,
                source_file,
            )

        for row in _iter_csv_rows(csv_path):
            rows_read += 1
            if not _passes_filter(row):
                continue
            rows_passed += 1
            batch.append(
                {
                    "source_file": source_file,
                    "ingest_run_id": run_id,
                    "raw_data": _extract_fields(row),
                    "ingested_at": ingested_at,
                }
            )
            if len(batch) >= batch_size:
                await session.execute(insert(RawNppesProvider), batch)
                rows_staged += len(batch)
                batch.clear()
                logger.info(
                    "read=%s passed=%s staged=%s",
                    rows_read,
                    rows_passed,
                    rows_staged,
                )

        if batch:
            await session.execute(insert(RawNppesProvider), batch)
            rows_staged += len(batch)

        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="completed",
                completed_at=func.now(),
                row_count=rows_staged,
                rows_read=rows_read,
                rows_passed_filter=rows_passed,
            )
        )
        await session.commit()

    return rows_read, rows_passed, rows_staged


async def _record_failure(run_id: uuid.UUID, error: str) -> None:
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
) -> tuple[int, int, int]:
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
        rows_read, rows_passed, rows_staged = await _load_staging(
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
        "done: read=%s passed_filter=%s staged=%s (run_id=%s sha256=%s)",
        rows_read,
        rows_passed,
        rows_staged,
        run_id,
        file_sha256,
    )
    return rows_read, rows_passed, rows_staged


async def _run(csv_path: Path, batch_size: int, *, replace: bool) -> None:
    try:
        await ingest(csv_path, batch_size, replace=replace)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Ingest filtered NPPES provider rows into raw_nppes_providers. "
            "Keeps only active Entity Type 2 organizations with FQHC taxonomy "
            f"({FQHC_TAXONOMY}). Records the attempt in ingest_runs."
        )
    )
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument(
        "--replace",
        action="store_true",
        help=(
            "Delete prior rows for this source_file before ingesting. "
            "Without this flag, ingest refuses if any rows already exist."
        ),
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(_run(args.csv, args.batch_size, replace=args.replace))
    except IngestRefused as e:
        sys.exit(f"REFUSED: {e}")


if __name__ == "__main__":
    main()
