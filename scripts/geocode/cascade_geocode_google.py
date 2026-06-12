"""Cascade geocoding (Google): resolve OSM failures on ce_contract_pharmacy."""

from __future__ import annotations

import os
import sys
import time
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import Client, create_client

from scripts.paths import ROOT

BATCH_LIMIT = 50
TABLE_NAME = "ce_contract_pharmacy"
PRIMARY_KEY = "pharmacy_id"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
OSM_FAILURE_FLAG = 0.0
ULTIMATE_DEAD_FLAG = -1.0
RATE_LIMIT_SECONDS = 0.1

SELECT_COLUMNS = (
    "pharmacy_id",
    "pharmacy_name",
    "address_line_1",
    "city",
    "state",
    "zip_code",
)


def normalize_supabase_url(url: str) -> str:
    """Return the base project URL expected by the Supabase Python client."""
    return url.rstrip("/").removesuffix("/rest/v1")


def build_address(record: dict[str, Any]) -> str:
    """Concatenate address fields, omitting empty or null values."""
    parts: list[str] = []
    for field in ("address_line_1", "city", "state", "zip_code"):
        value = record.get(field)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    return ", ".join(parts)


def fetch_osm_failures(client: Client) -> list[dict[str, Any]]:
    response = (
        client.table(TABLE_NAME)
        .select(",".join(SELECT_COLUMNS))
        .eq("latitude", OSM_FAILURE_FLAG)
        .limit(BATCH_LIMIT)
        .execute()
    )
    return response.data or []


def geocode_with_google(address: str, api_key: str) -> tuple[float, float] | None:
    """Return (latitude, longitude) from Google, or None if not found."""
    try:
        response = requests.get(
            GOOGLE_GEOCODE_URL,
            params={"address": address, "key": api_key},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
    finally:
        time.sleep(RATE_LIMIT_SECONDS)

    if payload.get("status") != "OK":
        return None

    results = payload.get("results") or []
    if not results:
        return None

    location = results[0]["geometry"]["location"]
    return float(location["lat"]), float(location["lng"])


def patch_coordinates(
    client: Client,
    pharmacy_id: str,
    latitude: float,
    longitude: float,
) -> None:
    (
        client.table(TABLE_NAME)
        .update({"latitude": latitude, "longitude": longitude})
        .eq(PRIMARY_KEY, pharmacy_id)
        .execute()
    )


def main() -> None:
    load_dotenv(ROOT / ".env")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    maps_api_key = os.getenv("Maps_API_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")
    if not maps_api_key:
        raise ValueError("Maps_API_KEY must be set in the .env file.")

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    records = fetch_osm_failures(client)

    if not records:
        print(f"No pharmacies with latitude={OSM_FAILURE_FLAG} found. Nothing to geocode.")
        return

    total = len(records)
    print(
        f"Fetched {total} OSM-failure record(s) "
        f"(latitude={OSM_FAILURE_FLAG}, limit={BATCH_LIMIT})."
    )

    geocoded = 0
    ultimate_dead = 0

    for index, record in enumerate(records, start=1):
        pharmacy_id = record["pharmacy_id"]
        pharmacy_name = record.get("pharmacy_name") or "(unnamed)"
        address = build_address(record)

        if not address:
            latitude, longitude = ULTIMATE_DEAD_FLAG, ULTIMATE_DEAD_FLAG
            ultimate_dead += 1
            print(
                f"[{index}/{total}] No address fields for {pharmacy_name} "
                f"-> Ultimate Dead Flag {ULTIMATE_DEAD_FLAG}"
            )
        else:
            coords = geocode_with_google(address, maps_api_key)
            if coords is None:
                latitude, longitude = ULTIMATE_DEAD_FLAG, ULTIMATE_DEAD_FLAG
                ultimate_dead += 1
                print(
                    f"[{index}/{total}] Google failed for {pharmacy_name} ({address}) "
                    f"-> Ultimate Dead Flag {ULTIMATE_DEAD_FLAG}"
                )
            else:
                latitude, longitude = coords
                geocoded += 1
                print(
                    f"[{index}/{total}] Google found {pharmacy_name} ({address}) "
                    f"-> Lat: {latitude}, Lng: {longitude}"
                )

        patch_coordinates(client, pharmacy_id, latitude, longitude)

    print(
        f"\nDone. Google geocoded: {geocoded}, ultimate dead: {ultimate_dead}, "
        f"total processed: {total}."
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.", file=sys.stderr)
        sys.exit(130)
