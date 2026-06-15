"""Run the full MedicBridges v2 ingestion pipeline in dependency order.

    python -m scripts.run_pipeline [--skip-uds] [--geocode]

Order matters:
  1. HRSA sites      -> organization + site
  2. OPAIS entities  -> covered_entity              (scope filter applied)
  3. OPAIS pharmacies-> contract_pharmacy           (needs covered_entity for FK)
  4. OPAIS shipping  -> shipping_address + reconcile (needs covered_entity + site)
  5. UDS services    -> site_service                (needs site)

Geocoding (OSM queue) is run separately by default; pass --geocode to also drain
the queue at the end.
"""

from __future__ import annotations

import argparse

from scripts.db import get_client
from scripts.etl import etl_340b_pharmacy, etl_ce, etl_fqhc_sites, etl_pharmacies, etl_uds_services


def print_summary() -> None:
    client = get_client()
    response = client.table("v_data_quality_summary").select("*").execute()
    if response.data:
        print("\n=== data quality summary ===")
        for key, value in response.data[0].items():
            print(f"  {key:28} {value}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-uds", action="store_true", help="Skip the UDS services step")
    parser.add_argument("--geocode", action="store_true", help="Drain the geocode queue at the end")
    args = parser.parse_args()

    steps = [
        ("HRSA sites -> organization + site", etl_fqhc_sites.main),
        ("OPAIS -> covered_entity", etl_ce.main),
        ("OPAIS -> contract_pharmacy", etl_pharmacies.main),
        ("OPAIS shipping + reconcile", etl_340b_pharmacy.main),
    ]
    if not args.skip_uds:
        steps.append(("UDS -> site_service", etl_uds_services.main))

    for label, step in steps:
        print(f"\n========== {label} ==========")
        step()

    if args.geocode:
        from scripts.geocode import run_geocode_queue

        print("\n========== geocode queue (OSM) ==========")
        run_geocode_queue.main([])

    print_summary()
    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
