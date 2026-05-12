from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone

from rapidfuzz.distance import Levenshtein
from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, dispose_engine
from app.models import IngestRun, NpiMatchCandidate, Site

logger = logging.getLogger("promote_npi_matches")

PROMOTE_SOURCE_FILE = "promote_npi_matches"
BATCH_SIZE = 500
ERROR_TRUNCATE = 2000
CONFLICT_EDIT_DIST_MAX = 2


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
                "DRY-RUN promote site_id=%s candidate_npi=%s (status=%s)",
                row["site_id"], row["candidate_npi"], row["status"],
            )
        return

    site_npi_map = {row["site_id"]: row["candidate_npi"] for row in chunk}
    candidate_ids = [row["candidate_id"] for row in chunk]

    # CASE WHEN id = :uuid THEN :npi ... ELSE npi END — two queries per batch
    npi_expr = case(
        *[(Site.id == site_id, npi) for site_id, npi in site_npi_map.items()],
        else_=Site.npi,
    )
    await session.execute(
        update(Site)
        .where(Site.id.in_(list(site_npi_map.keys())))
        .values(npi=npi_expr, updated_at=func.now())
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
        "promoted_conflict": 0,
        "skipped_conflict": 0,
    }
    chunk: list[dict] = []

    stream_stmt = (
        select(
            NpiMatchCandidate.id,
            NpiMatchCandidate.site_id,
            NpiMatchCandidate.candidate_npi,
            NpiMatchCandidate.status,
            Site.npi.label("site_npi"),
        )
        .join(Site, NpiMatchCandidate.site_id == Site.id)
        .where(NpiMatchCandidate.status.in_(["accepted", "conflict"]))
    )

    async with SessionLocal() as read_session, SessionLocal() as write_session:
        result = await read_session.stream(stream_stmt)
        try:
            async with write_session.begin():
                async for cand_id, site_id, candidate_npi, status, site_npi in result:
                    if status == "accepted":
                        chunk.append({
                            "candidate_id": cand_id,
                            "site_id": site_id,
                            "candidate_npi": candidate_npi,
                            "status": status,
                        })
                        counts["promoted_accepted"] += 1
                    else:  # conflict
                        dist = Levenshtein.distance(site_npi or "", candidate_npi)
                        if dist <= CONFLICT_EDIT_DIST_MAX:
                            chunk.append({
                                "candidate_id": cand_id,
                                "site_id": site_id,
                                "candidate_npi": candidate_npi,
                                "status": status,
                            })
                            counts["promoted_conflict"] += 1
                        else:
                            counts["skipped_conflict"] += 1

                    if len(chunk) >= BATCH_SIZE:
                        await _flush_promote_chunk(write_session, chunk, dry_run)
                        chunk.clear()
                        logger.info(
                            "promoted=%s (accepted=%s conflict=%s) skipped_conflict=%s",
                            counts["promoted_accepted"] + counts["promoted_conflict"],
                            counts["promoted_accepted"],
                            counts["promoted_conflict"],
                            counts["skipped_conflict"],
                        )

                if chunk:
                    await _flush_promote_chunk(write_session, chunk, dry_run)
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

    total_promoted = counts["promoted_accepted"] + counts["promoted_conflict"]
    total_evaluated = (
        total_promoted
        + counts["skipped_conflict"]
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
                row_count=total_promoted,
                rows_read=total_evaluated,
                rows_passed_filter=total_promoted,
                stats={
                    "promoted_accepted": counts["promoted_accepted"],
                    "promoted_conflict": counts["promoted_conflict"],
                    "skipped_conflict":  counts["skipped_conflict"],
                    "skipped_pending":   skipped_pending,
                    "already_promoted":  already_promoted,
                    "total_evaluated":   total_evaluated,
                    "dry_run":           dry_run,
                },
            )
        )
        await session.commit()

    logger.info(
        "done: promoted=%s (accepted=%s conflict=%s) skipped_conflict=%s "
        "skipped_pending=%s already_promoted=%s (run_id=%s%s)",
        total_promoted,
        counts["promoted_accepted"],
        counts["promoted_conflict"],
        counts["skipped_conflict"],
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
