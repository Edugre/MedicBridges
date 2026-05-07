# backend/app/scripts/ingest_hrsa_sites.py
from __future__ import annotations

import argparse
import asyncio
import csv
import logging
from pathlib import Path
from typing import Iterator

from sqlalchemy import insert

from app.db.session import SessionLocal, engine
from app.models import RawHrsaSite

logger = logging.getLogger("ingest_hrsa_sites")

DEFAULT_CSV = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
)
BATCH_SIZE = 1000


def iter_csv_rows(csv_path: Path) -> Iterator[dict[str, str]]:
    """Yield each CSV row as a dict, dropping the empty trailing column
    that comes from the trailing comma in the header."""
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row.pop("", None)
            yield row


async def ingest(csv_path: Path, batch_size: int = BATCH_SIZE) -> int:
    source_file = csv_path.name
    total = 0
    batch: list[dict] = []

    async with SessionLocal() as session:
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


async def _run(csv_path: Path, batch_size: int) -> None:
    try:
        await ingest(csv_path, batch_size)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest HRSA site CSV into raw_hrsa_sites")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    asyncio.run(_run(args.csv, args.batch_size))


if __name__ == "__main__":
    main()