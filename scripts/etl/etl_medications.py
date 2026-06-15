"""ETL: RxNorm concepts -> public.medication (the API's typeahead cache).

Seeds the medication reference cache the FastAPI `/medications` routes read from,
so autocomplete never blocks on an external RxNorm/openFDA round trip. Pulls the
clinically useful term types (ingredients, brand names, clinical/branded drugs)
from the public RxNav `allconcepts` endpoint and upserts them by rxcui.

Usage:
    python -m scripts.etl.etl_medications
    python -m scripts.etl.etl_medications --ttys IN BN SCD SBD PIN

Network: requires access to https://rxnav.nlm.nih.gov.
"""

from __future__ import annotations

import argparse
from typing import Any

import requests

from scripts.db import get_client
from scripts.supabase_etl import etl_run

RXNAV_ALLCONCEPTS = "https://rxnav.nlm.nih.gov/REST/allconcepts.json"
DEFAULT_TTYS = ["IN", "PIN", "BN", "SCD", "SBD"]
UPSERT_BATCH = 1000
GENERIC_TTYS = {"IN", "PIN"}  # ingredient term types act as the generic name


def fetch_concepts(ttys: list[str]) -> list[dict[str, Any]]:
    resp = requests.get(
        RXNAV_ALLCONCEPTS, params={"tty": "+".join(ttys)}, timeout=120
    )
    resp.raise_for_status()
    payload = resp.json()
    concepts = (payload.get("minConceptGroup") or {}).get("minConcept") or []
    return concepts


def to_rows(concepts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for c in concepts:
        rxcui = str(c.get("rxcui") or "").strip()
        name = (c.get("name") or "").strip()
        tty = (c.get("tty") or "").strip() or None
        if not rxcui or not name:
            continue
        rows[rxcui] = {
            "rxcui": rxcui,
            "name": name,
            "tty": tty,
            "generic_name": name if tty in GENERIC_TTYS else None,
            "synonyms": [],
            "ndcs": [],
            "source": "rxnorm",
        }
    return list(rows.values())


def _chunks(rows: list[dict[str, Any]], size: int):
    for start in range(0, len(rows), size):
        yield rows[start : start + size]


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed public.medication from RxNorm.")
    parser.add_argument("--ttys", nargs="+", default=DEFAULT_TTYS, help="RxNorm term types")
    args = parser.parse_args()

    client = get_client()
    with etl_run(client, "etl_medications", source_file=RXNAV_ALLCONCEPTS) as ctx:
        concepts = fetch_concepts(args.ttys)
        rows = to_rows(concepts)

        loaded = 0
        for batch in _chunks(rows, UPSERT_BATCH):
            client.table("medication").upsert(batch, on_conflict="rxcui").execute()
            loaded += len(batch)
            print(f"  upserted {loaded}/{len(rows)} medications")
        ctx.add_rows(loaded)
        print(f"Done: {loaded} medications cached from TTYs {args.ttys}")


if __name__ == "__main__":
    main()
