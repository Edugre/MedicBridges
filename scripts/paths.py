"""Shared filesystem paths for the healthcare ETL project."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
CACHE = DATA / "cache"
OUTPUT = DATA / "output"
LOGS = ROOT / "logs"

HRSA_SITES_CSV = RAW / "hrsa" / "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
OPAIS_JSON = RAW / "opais" / "OPA_CE_DAILY_PUBLIC.JSON"
OPAIS_JSON_FALLBACKS = (
    RAW / "opais" / "Covered_Entity_Daily_Export.json",
    RAW / "opais" / "OPA_CE_DAILY_PUBLIC.JSON",
    RAW / "opais" / "OPA_CE_DAILY_PUBLIC.json",
)
UDS_DIR = RAW / "uds"

FACHC_CACHE = CACHE / "fachc_directory.html"
SITE_HTML_DIR = CACHE / "site_html"
SCRAPE_FAILURES_CSV = OUTPUT / "scrape_failures.csv"
FACHC_REPORT_CSV = OUTPUT / "fachc_verification_report.csv"


def ensure_data_dirs() -> None:
    for path in (RAW / "hrsa", RAW / "opais", UDS_DIR, CACHE, SITE_HTML_DIR, OUTPUT, LOGS):
        path.mkdir(parents=True, exist_ok=True)


def resolve_opais_json() -> Path:
    for path in OPAIS_JSON_FALLBACKS:
        if path.exists():
            return path
    searched = ", ".join(str(path) for path in OPAIS_JSON_FALLBACKS)
    raise FileNotFoundError(f"OPAIS JSON file not found. Checked: {searched}")
