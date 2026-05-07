# backend/app/scripts/ingest_hrsa_sites.py
from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import sys
from pathlib import Path
from typing import Iterator

from sqlalchemy import delete, func, insert, select

from app.db.session import SessionLocal, engine
from app.models import RawHrsaSite

logger = logging.getLogger("ingest_hrsa_sites")

DEFAULT_CSV = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
)
BATCH_SIZE = 1000


class IngestRefused(Exception):
    """Raised when prior data exists for source_file and neither --force nor --replace was passed."""


def iter_csv_rows(csv_path: Path) -> Iterator[dict[str, str]]:
    """Yield each CSV row as a dict, dropping the empty trailing column
    that comes from the trailing comma in the header."""
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row.pop("", None)
            yield row


async def ingest(
    csv_path: Path,
    batch_size: int = BATCH_SIZE,
    *,
    force: bool = False,
    replace: bool = False,
) -> int:
    source_file = csv_path.name
    total = 0
    batch: list[dict] = []

    async with SessionLocal() as session:
        existing = await session.scalar(
            select(func.count())
            .select_from(RawHrsaSite)
            .where(RawHrsaSite.source_file == source_file)
        )

        if existing:
            if replace:
                deleted = await session.execute(
                    delete(RawHrsaSite).where(
                        RawHrsaSite.source_file == source_file
                    )
                )
                await session.flush()
                logger.info(
                    "deleted %s prior rows for source_file=%s",
                    deleted.rowcount,
                    source_file,
                )
            elif force:
                logger.warning(
                    "%s prior rows exist for source_file=%s; --force given, "
                    "appending a new batch alongside",
                    existing,
                    source_file,
                )
            else:
                raise IngestRefused(
                    f"{existing} prior rows exist for source_file={source_file!r}; "
                    "pass --force to add a new batch alongside, or --replace to "
                    "delete prior rows before ingesting"
                )

        for row in iter_csv_rows(csv_path):
            batch.append({"source_file": source_file, "raw_data": row})
            if len(batch) >= batch_size:
                await session.execute(insert(RawHrsaSite), batch)
                total += len(batch)
                batch.clear()
                logger.info("inserted %s rows", total)

        if batch:
            await session.execute(insert(RawHrsaSite), batch)
            total += len(batch)

        await session.commit()

    logger.info("done: %s rows from %s", total, source_file)
    return total


async def _run(
    csv_path: Path, batch_size: int, *, force: bool, replace: bool
) -> None:
    try:
        await ingest(csv_path, batch_size, force=force, replace=replace)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest HRSA site CSV into raw_hrsa_sites"
    )
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--force",
        action="store_true",
        help="Append a new batch even if rows already exist for this source_file",
    )
    mode.add_argument(
        "--replace",
        action="store_true",
        help="Delete prior rows for this source_file before ingesting",
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
                force=args.force,
                replace=args.replace,
            )
        )
    except IngestRefused as e:
        sys.exit(f"REFUSED: {e}")


if __name__ == "__main__":
    main()
