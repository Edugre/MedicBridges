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

logger = logging.getLogger("promote_npi_matches")

PROMOTE_SOURCE_FILE = "promote_npi_matches"
BATCH_SIZE = 500
ERROR_TRUNCATE = 2000


# ---------------------------------------------------------------------------
# Flush
# ---------------------------------------------------------------------------

async def _flush_promote_chunk(
    session: AsyncSession,
    chunk: list[dict],
    dry_run: bool,
) -> None:
    if dry_run:
        for row in chunk:
            logger.info(
                "DRY-RUN promote site_id=%s candidate_npi=%s",
                row["site_id"], row["candidate_npi"],
            )
        return

    site_npi_map = {row["site_id"]: row["candidate_npi"] for row in chunk}
    candidate_ids = [row["candidate_id"] for row in chunk]

    # CASE WHEN id = :uuid THEN :npi ... ELSE org_npi END — two queries per batch
    org_npi_expr = case(
        *[(Site.id == site_id, npi) for site_id, npi in site_npi_map.items()],
        else_=Site.org_npi,
    )
    await session.execute(
        update(Site)
        .where(Site.id.in_(list(site_npi_map.keys())))
        .values(org_npi=org_npi_expr, updated_at=func.now())
    )
    await session.execute(
        update(NpiMatchCandidate)
        .where(NpiMatchCandidate.id.in_(candidate_ids))
        .values(status="promoted", updated_at=func.now())
    )


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

async def _run_promote(dry_run: bool) -> dict:
    counts = {
        "promoted_accepted": 0,
        "held_for_review": 0,
    }
    chunk: list[dict] = []

    stream_stmt = (
        select(
            NpiMatchCandidate.id,
            NpiMatchCandidate.site_id,
            NpiMatchCandidate.candidate_npi,
        )
        .where(NpiMatchCandidate.status == "accepted")
    )

    async with SessionLocal() as read_session, SessionLocal() as write_session:
        result = await read_session.stream(stream_stmt)
        try:
            async with write_session.begin():
                async for cand_id, site_id, candidate_npi in result:
                    chunk.append({
                        "candidate_id": cand_id,
                        "site_id": site_id,
                        "candidate_npi": candidate_npi,
                    })
                    counts["promoted_accepted"] += 1

                    if len(chunk) >= BATCH_SIZE:
                        await _flush_promote_chunk(write_session, chunk, dry_run)
                        chunk.clear()
                        logger.info("promoted=%s", counts["promoted_accepted"])

                if chunk:
                    await _flush_promote_chunk(write_session, chunk, dry_run)

                if not dry_run:
                    res = await write_session.execute(
                        update(NpiMatchCandidate)
                        .where(NpiMatchCandidate.status == "conflict")
                        .values(status="requires_review", updated_at=func.now())
                    )
                    counts["held_for_review"] = res.rowcount
                else:
                    counts["held_for_review"] = (await write_session.scalar(
                        select(func.count())
                        .select_from(NpiMatchCandidate)
                        .where(NpiMatchCandidate.status == "conflict")
                    )) or 0
        finally:
            await result.close()

    return counts


async def promote(dry_run: bool = False) -> dict:
    async with SessionLocal() as session:
        skipped_pending = (await session.scalar(
            select(func.count())
            .select_from(NpiMatchCandidate)
            .where(NpiMatchCandidate.status == "pending")
        )) or 0
        already_promoted = (await session.scalar(
            select(func.count())
            .select_from(NpiMatchCandidate)
            .where(NpiMatchCandidate.status == "promoted")
        )) or 0

        started_at = datetime.now(timezone.utc)
        run = IngestRun(
            source_file=PROMOTE_SOURCE_FILE,
            started_at=started_at,
            status="running",
        )
        session.add(run)
        await session.flush()
        run_id = run.id
        await session.commit()

    try:
        counts = await _run_promote(dry_run)
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

    total_evaluated = (
        counts["promoted_accepted"]
        + counts["held_for_review"]
        + skipped_pending
        + already_promoted
    )

    async with SessionLocal() as session:
        await session.execute(
            update(IngestRun)
            .where(IngestRun.id == run_id)
            .values(
                status="completed",
                completed_at=func.now(),
                row_count=counts["promoted_accepted"],
                rows_read=total_evaluated,
                rows_passed_filter=counts["promoted_accepted"],
                stats={
                    "promoted_accepted": counts["promoted_accepted"],
                    "held_for_review":   counts["held_for_review"],
                    "skipped_pending":   skipped_pending,
                    "already_promoted":  already_promoted,
                    "total_evaluated":   total_evaluated,
                    "dry_run":           dry_run,
                },
            )
        )
        await session.commit()

    logger.info(
        "done: promoted=%s held_for_review=%s skipped_pending=%s already_promoted=%s (run_id=%s%s)",
        counts["promoted_accepted"],
        counts["held_for_review"],
        skipped_pending,
        already_promoted,
        run_id,
        " DRY-RUN" if dry_run else "",
    )
    return counts


async def _run(dry_run: bool) -> None:
    try:
        await promote(dry_run=dry_run)
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promote accepted NPI match candidates to sites.npi"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log what would be promoted without writing to the database",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(_run(dry_run=args.dry_run))
    except RuntimeError as e:
        sys.exit(f"ERROR: {e}")


if __name__ == "__main__":
    main()
