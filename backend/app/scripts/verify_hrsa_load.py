from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal, dispose_engine
from app.models import Organization, Site

logger = logging.getLogger("verify_hrsa_load")

DEFAULT_MIN_ORGS = 1000
DEFAULT_MIN_SITES = 15000
DEFAULT_MIN_GEOCODE_PCT = 0.95
DEFAULT_MIN_DISTINCT_STATES = 50


class CheckFailed(Exception):
    """Raised when one or more data-quality checks fail."""


async def _scalar_int(session: AsyncSession, stmt) -> int:
    result = await session.execute(stmt)
    value = result.scalar_one()
    return int(value or 0)


async def verify(
    min_orgs: int,
    min_sites: int,
    min_geocode_pct: float,
    min_distinct_states: int,
) -> None:
    async with SessionLocal() as session:
        n_orgs = await _scalar_int(
            session, select(func.count()).select_from(Organization)
        )
        n_sites = await _scalar_int(
            session, select(func.count()).select_from(Site)
        )
        n_with_loc = await _scalar_int(
            session,
            select(func.count())
            .select_from(Site)
            .where(Site.location.is_not(None)),
        )
        n_orphans = await _scalar_int(
            session,
            select(func.count())
            .select_from(Site)
            .outerjoin(Organization, Site.organization_id == Organization.id)
            .where(Organization.id.is_(None)),
        )
        n_states = await _scalar_int(
            session, select(func.count(distinct(Site.state))).select_from(Site)
        )

    geocode_pct = (n_with_loc / n_sites) if n_sites else 0.0

    logger.info(
        "orgs=%s sites=%s sites_with_location=%s (%.2f%%) distinct_states=%s orphan_sites=%s",
        n_orgs,
        n_sites,
        n_with_loc,
        geocode_pct * 100,
        n_states,
        n_orphans,
    )

    problems: list[str] = []
    if n_orgs < min_orgs:
        problems.append(f"organizations={n_orgs} below floor {min_orgs}")
    if n_sites < min_sites:
        problems.append(f"sites={n_sites} below floor {min_sites}")
    if n_orphans:
        problems.append(f"orphan sites with missing organization: {n_orphans}")
    if geocode_pct < min_geocode_pct:
        problems.append(
            f"geocoded ratio {geocode_pct:.3f} below floor {min_geocode_pct:.3f}"
        )
    if n_states < min_distinct_states:
        problems.append(
            f"distinct states={n_states} below floor {min_distinct_states}"
        )

    if problems:
        for p in problems:
            logger.error(p)
        raise CheckFailed(f"{len(problems)} check(s) failed")

    logger.info("all checks passed")


async def _run(args: argparse.Namespace) -> None:
    try:
        await verify(
            min_orgs=args.min_orgs,
            min_sites=args.min_sites,
            min_geocode_pct=args.min_geocode_pct,
            min_distinct_states=args.min_distinct_states,
        )
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify the HRSA load (organizations + sites) looks healthy"
    )
    parser.add_argument("--min-orgs", type=int, default=DEFAULT_MIN_ORGS)
    parser.add_argument("--min-sites", type=int, default=DEFAULT_MIN_SITES)
    parser.add_argument(
        "--min-geocode-pct", type=float, default=DEFAULT_MIN_GEOCODE_PCT
    )
    parser.add_argument(
        "--min-distinct-states",
        type=int,
        default=DEFAULT_MIN_DISTINCT_STATES,
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        force=True,
    )

    try:
        asyncio.run(_run(args))
    except CheckFailed as e:
        sys.exit(f"FAIL: {e}")


if __name__ == "__main__":
    main()
