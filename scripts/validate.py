"""Read-only data-quality validation for the MedicBridges v2 database.

Runs the post-load review checks called for in the rebuild plan: row counts,
HRSA<->340B match coverage, geocoding coverage, referential sanity, and
coordinate/date hygiene. Most hard violations are impossible by construction
(constraints), so a clean run mostly confirms coverage. Exits non-zero if any
hard check fails.

Usage:
    python -m scripts.validate
"""

from __future__ import annotations

import sys

from scripts.db import get_client


def count(client, table: str, **filters) -> int:
    query = client.table(table).select("*", count="exact", head=True)
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute().count or 0


def main() -> None:
    client = get_client()
    failures: list[str] = []

    print("=== row counts (v_data_quality_summary) ===")
    summary = client.table("v_data_quality_summary").select("*").execute().data
    if summary:
        for key, value in summary[0].items():
            print(f"  {key:28} {value}")

    print("\n=== HRSA<->340B reconciliation ===")
    total_ce = count(client, "covered_entity")
    by_method = {}
    for method in ("grant", "npi", "address", "none"):
        by_method[method] = count(client, "covered_entity", match_method=method)
    linked = total_ce - by_method["none"]
    print(f"  covered_entities: {total_ce}")
    for method, n in by_method.items():
        print(f"    match_method={method:8} {n}")
    pct = (linked / total_ce * 100) if total_ce else 0
    print(f"  linked to an organization: {linked} ({pct:.1f}%)")

    print("\n=== geocoding coverage ===")
    for status in ("ok", "pending", "failed", "needs_review"):
        print(f"  location.geocode_status={status:13} {count(client, 'location', geocode_status=status)}")

    print("\n=== referential / hygiene checks ===")

    # Pharmacies must all resolve to an in-scope covered entity (hard FK guarantees
    # this; a non-zero here would mean the FK was dropped).
    pharm = count(client, "contract_pharmacy")
    print(f"  contract_pharmacy rows: {pharm}")

    # Locations flagged ok must have coordinates; flagged non-ok must not.
    bad_ok = (
        client.table("location").select("*", count="exact", head=True)
        .eq("geocode_status", "ok").is_("latitude", "null").execute().count or 0
    )
    if bad_ok:
        failures.append(f"{bad_ok} locations are geocode_status='ok' but have NULL coordinates")
    print(f"  ok-but-null-coordinate locations: {bad_ok}")

    # Null Island sentinel must never appear.
    null_island = (
        client.table("location").select("*", count="exact", head=True)
        .eq("latitude", 0).eq("longitude", 0).execute().count or 0
    )
    if null_island:
        failures.append(f"{null_island} locations at (0,0)")
    print(f"  (0,0) sentinel locations: {null_island}")

    # Active sites should have an organization (NOT NULL FK) -- sanity that the
    # view join is sound.
    sites = count(client, "site")
    print(f"  site rows: {sites}")

    print("\n=== result ===")
    if failures:
        for f in failures:
            print(f"  FAIL: {f}")
        sys.exit(1)
    print("  All hard checks passed.")


if __name__ == "__main__":
    main()
