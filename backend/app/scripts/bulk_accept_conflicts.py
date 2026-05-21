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

logger = logging.getLogger("bulk_accept_conflicts")

SCRIPT_SOURCE_FILE = "bulk_accept_conflicts"
BATCH_SIZE = 500
ERROR_TRUNCATE = 2000

T1_SCORE_MIN = 0.90


def _qualifying_stmt():
    return (
        select(
            NpiMatchCandidate.id,
            NpiMatchCandidate.site_id,
            NpiMatchCandidate.candidate_npi,
        )
        .join(Site, NpiMatchCandidate.site_id == Site.id)
        .where(NpiMatchCandidate.status == "requires_review")
        .where(NpiMatchCandidate.match_tier == 1)
        .where(NpiMatchCandidate.match_score >= T1_SCORE_MIN)
        .where(Site.org_npi.is_(None))
        .order_by(NpiMatchCandidate.created_at)
    )


async def _count_qualifying(session: AsyncSession) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .join(Site, NpiMatchCandidate.site_id == Site.id)
        .where(NpiMatchCandidate.status == "requires_review")
        .where(NpiMatchCandidate.match_tier == 1)
        .where(NpiMatchCandidate.match_score >= T1_SCORE_MIN)
        .where(Site.org_npi.is_(None))
    ) or 0


async def _flush_batch(session: AsyncSession, chunk: list[dict]) -> int:
    site_npi_map = {row["site_id"]: row["candidate_npi"] for row in chunk}
    candidate_ids = [row["candidate_id"] for row in chunk]
    now_utc = datetime.now(timezone.utc)

    org_npi_expr = case(
        *[(Site.id == site_id, npi) for site_id, npi in site_npi_map.items()],
        else_=Site.org_npi,
    )
    await session.execute(
        update(Site)
        .where(Site.id.in_(list(site_npi_map.keys())))
        .where(Site.org_npi.is_(None))
        .values(org_npi=org_npi_expr, updated_at=func.now())
    )

    await session.execute(
        update(NpiMatchCandidate)
        .where(NpiMatchCandidate.id.in_(candidate_ids))
        .values(
            status="promoted",
            reviewed_at=now_utc,
            reviewed_by="bulk_accept_conflicts",
            updated_at=func.now(),
        )
    )

    return len(chunk)


async def _run_bulk_accept() -> int:
    promoted = 0
    chunk: list[dict] = []

    async with SessionLocal() as read_session, SessionLocal() as write_session:
        result = await read_session.stream(_qualifying_stmt())
        try:
            async with write_session.begin():
                async for cand_id, site_id, candidate_npi in result:
                    chunk.append({
                        "candidate_id":  cand_id,
                        "site_id":       site_id,
                        "candidate_npi": candidate_npi,
                    })

                    if len(chunk) >= BATCH_SIZE:
                        promoted += await _flush_batch(write_session, chunk)
                        chunk.clear()
                        logger.info("promoted=%s", promoted)

                if chunk:
                    promoted += await _flush_batch(write_session, chunk)
        finally:
            await result.close()

    return promoted


async def bulk_accept_conflicts(*, execute: bool = False) -> dict:
    async with SessionLocal() as session:
        total_qualifying = await _count_qualifying(session)

    print(f"Tier 1, score >= {T1_SCORE_MIN}, org_npi IS NULL: {total_qualifying} candidates")

    if not execute:
        print("\nDry-run mode — pass --execute to apply changes.")
        return {"qualifying": total_qualifying, "promoted": 0}

    if total_qualifying == 0:
        print("\nNothing to promote.")
        return {"qualifying": 0, "promoted": 0}

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
        promoted = await _run_bulk_accept()
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
                row_count=promoted,
                rows_read=total_qualifying,
                rows_passed_filter=promoted,
                stats={
                    "qualifying": total_qualifying,
                    "promoted":   promoted,
                    "criteria":   f"requires_review, tier=1, score>={T1_SCORE_MIN}, org_npi IS NULL",
                },
            )
        )
        await session.commit()

    print(f"\nEvaluated: {total_qualifying}")
    print(f"Promoted:  {promoted}")
    logger.info(
        "done: evaluated=%s promoted=%s (run_id=%s)",
        total_qualifying, promoted, run_id,
    )
    return {"qualifying": total_qualifying, "promoted": promoted}


async def _run(*, execute: bool) -> None:
    try:
        await bulk_accept_conflicts(execute=execute)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Bulk-promote high-confidence requires_review NPI match candidates "
            f"(T1, score >= {T1_SCORE_MIN}, site org_npi IS NULL)"
        )
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
