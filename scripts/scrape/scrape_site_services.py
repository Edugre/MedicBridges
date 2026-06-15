"""Scrape FQHC site websites and extract offered services -> Supabase site_service.

For each active service-delivery site in the target state, fetches the site's
listed website (falling back to the most common URL among the same
organization's sites), crawls the homepage plus a few likely services pages,
and maps page text onto `service` catalog entries using keyword/phrase
matching with per-service confidence scores.

Rows are written with data_source='Site website (keyword extraction)' and never
overwrite rows sourced from HRSA datasets.

Usage:
    python -m scripts.scrape.scrape_site_services [--state FL] [--min-confidence 0.7] [--limit N]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import time
import urllib.parse
from datetime import datetime, timezone

import requests
import urllib3
from bs4 import BeautifulSoup

from scripts.db import get_client
from scripts.paths import SCRAPE_FAILURES_CSV, SITE_HTML_DIR, ensure_data_dirs

DATA_SOURCE = "Site website (keyword extraction)"
REQUEST_TIMEOUT = 20
REQUEST_DELAY_SECONDS = 0.5
MAX_EXTRA_PAGES = 4
UPSERT_BATCH_SIZE = 500
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

STRONG_CONFIDENCE = 0.9
WEAK_CONFIDENCE = 0.7

# service_id -> (strong phrases, weak phrases). Matched with word boundaries,
# case-insensitive. Strong phrases are specific enough to stand alone; weak
# phrases are suggestive but more ambiguous.
SERVICE_KEYWORDS: dict[int, tuple[list[str], list[str]]] = {
    1: (["primary care", "family medicine", "family practice", "internal medicine", "adult medicine"], []),
    2: (["preventive care", "preventive health", "immunizations", "vaccinations", "annual exams", "health screenings"], ["wellness"]),
    3: (["pediatrics", "pediatric care", "well-child", "children's health", "child health"], []),
    4: (["obstetrics", "gynecology", "ob/gyn", "ob-gyn", "obgyn", "prenatal care", "women's health", "midwife", "midwifery"], []),
    5: (["dental services", "dentistry", "dental care", "oral health", "dental clinic"], ["dental"]),
    6: (["pediatric dentistry", "pediatric dental", "children's dental", "kids' dental"], []),
    7: (["mental health", "behavioral health", "psychotherapy"], ["counseling", "therapy"]),
    8: (["psychiatry", "psychiatric services", "psychiatrist"], []),
    9: (["substance use", "substance abuse", "addiction treatment", "addiction medicine", "medication-assisted treatment", "opioid treatment", "suboxone", "recovery services"], []),
    10: (["laboratory services", "lab services", "on-site lab", "onsite lab", "phlebotomy", "blood draw"], ["laboratory"]),
    11: (["x-ray", "x-rays", "radiology", "diagnostic imaging", "ultrasound", "mammography", "mammogram"], ["imaging"]),
    12: (["optometry", "eye care", "vision care", "eye exams", "ophthalmology", "optical"], []),
    13: (["pharmacy", "340b", "dispensary", "prescription assistance"], ["prescriptions"]),
    14: (["case management", "care coordination", "patient navigation", "care management"], []),
    15: (["interpretation services", "interpreter services", "translation services", "language services", "language assistance"], []),
    16: (["transportation services", "transportation assistance", "patient transportation", "free transportation"], ["transportation"]),
}

# Internal links worth crawling beyond the homepage.
SERVICE_LINK_HINTS = re.compile(
    r"service|care|medical|dental|behavioral|mental|pharmacy|health|program|what-we|locations?",
    re.IGNORECASE,
)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def normalize_supabase_url(url: str) -> str:
    return url.rstrip("/").removesuffix("/rest/v1")


def normalize_site_url(raw: str | None) -> str | None:
    if not raw:
        return None
    url = re.sub(r"\s+", "", raw).rstrip("/")
    if not url:
        return None
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "https://" + url
    return url.lower()


def compile_patterns() -> dict[int, tuple[list[re.Pattern], list[re.Pattern]]]:
    compiled = {}
    for service_id, (strong, weak) in SERVICE_KEYWORDS.items():
        compiled[service_id] = (
            [re.compile(r"\b" + re.escape(p) + r"\b", re.IGNORECASE) for p in strong],
            [re.compile(r"\b" + re.escape(p) + r"\b", re.IGNORECASE) for p in weak],
        )
    return compiled


PATTERNS = compile_patterns()


def fetch_page(session: requests.Session, url: str) -> str | None:
    cache_key = hashlib.sha1(url.encode()).hexdigest()
    cache_path = SITE_HTML_DIR / f"{cache_key}.html"
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8", errors="ignore")

    for verify in (True, False):
        try:
            response = session.get(url, timeout=REQUEST_TIMEOUT, verify=verify, allow_redirects=True)
            if response.status_code >= 400:
                return None
            html = response.text
            cache_path.write_text(html, encoding="utf-8")
            time.sleep(REQUEST_DELAY_SECONDS)
            return html
        except requests.exceptions.SSLError:
            continue
        except requests.exceptions.RequestException:
            return None
    return None


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(separator=" "))


def candidate_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    base_host = urllib.parse.urlparse(base_url).netloc
    seen: list[str] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        label = f"{href} {anchor.get_text(strip=True)}"
        if not SERVICE_LINK_HINTS.search(label):
            continue
        absolute = urllib.parse.urljoin(base_url + "/", href)
        parsed = urllib.parse.urlparse(absolute)
        if parsed.scheme not in ("http", "https") or parsed.netloc != base_host:
            continue
        cleaned = parsed._replace(fragment="", query="").geturl().rstrip("/")
        if cleaned != base_url and cleaned not in seen:
            seen.append(cleaned)
        if len(seen) >= MAX_EXTRA_PAGES:
            break
    return seen


def extract_services(pages: dict[str, str]) -> dict[int, tuple[float, str]]:
    """Return {service_id: (confidence, source_page_url)}."""
    found: dict[int, tuple[float, str]] = {}
    for page_url, text in pages.items():
        for service_id, (strong, weak) in PATTERNS.items():
            confidence = 0.0
            if any(p.search(text) for p in strong):
                confidence = STRONG_CONFIDENCE
            elif any(p.search(text) for p in weak):
                confidence = WEAK_CONFIDENCE
            if confidence and confidence > found.get(service_id, (0.0, ""))[0]:
                found[service_id] = (confidence, page_url)
    return found


def scrape_url(session: requests.Session, url: str) -> dict[int, tuple[float, str]] | None:
    homepage = fetch_page(session, url)
    if homepage is None:
        return None
    pages = {url: extract_text(homepage)}
    for link in candidate_links(homepage, url):
        html = fetch_page(session, link)
        if html:
            pages[link] = extract_text(html)
    return extract_services(pages)


def fetch_sites(client, state: str) -> list[dict]:
    sites: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        response = (
            client.table("v_site")
            .select("site_id,bphc_site_num,website,org_website,grant_number,center_type")
            .eq("state", state)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        sites.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return [s for s in sites if "Service Delivery" in (s.get("center_type") or "")]


def fetch_protected_pairs(client, site_ids: list[str]) -> set[tuple[str, int]]:
    """(site_id, service) pairs sourced from HRSA datasets; never overwritten."""
    protected: set[tuple[str, int]] = set()
    chunk_size = 200
    page_size = 1000
    for start in range(0, len(site_ids), chunk_size):
        chunk = site_ids[start : start + chunk_size]
        offset = 0
        while True:
            response = (
                client.table("site_service")
                .select("site_id,service_id,data_source")
                .in_("site_id", chunk)
                .like("data_source", "HRSA%")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = response.data or []
            for row in rows:
                protected.add((row["site_id"], row["service_id"]))
            if len(rows) < page_size:
                break
            offset += page_size
    return protected


def assign_fallback_urls(sites: list[dict]) -> None:
    """Sites with no URL inherit the most common URL among their org's sites."""
    org_urls: dict[str, dict[str, int]] = {}
    for site in sites:
        url = normalize_site_url(site.get("website") or site.get("org_website"))
        site["resolved_url"] = url
        org = site.get("grant_number")
        if url and org:
            org_urls.setdefault(org, {})
            org_urls[org][url] = org_urls[org].get(url, 0) + 1
    for site in sites:
        if site["resolved_url"]:
            continue
        org = site.get("grant_number")
        counts = org_urls.get(org)
        if counts:
            site["resolved_url"] = max(counts, key=counts.get)


def upsert_in_batches(client, rows: list[dict], batch_size: int = UPSERT_BATCH_SIZE) -> None:
    total = len(rows)
    for start in range(0, total, batch_size):
        batch = rows[start : start + batch_size]
        client.table("site_service").upsert(
            batch,
            on_conflict="site_id,service_id",
        ).execute()
        print(f"Upserted rows {start + 1}-{min(start + batch_size, total)} of {total}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", default="FL")
    parser.add_argument("--min-confidence", type=float, default=0.7)
    parser.add_argument("--limit", type=int, default=None, help="Max distinct URLs to scrape (for testing)")
    args = parser.parse_args()

    ensure_data_dirs()
    client = get_client()

    sites = fetch_sites(client, args.state.upper())
    assign_fallback_urls(sites)
    sites_with_url = [s for s in sites if s["resolved_url"]]
    print(f"{len(sites)} service-delivery sites; {len(sites_with_url)} have a resolvable URL")

    url_to_sites: dict[str, list[dict]] = {}
    for site in sites_with_url:
        url_to_sites.setdefault(site["resolved_url"], []).append(site)
    urls = sorted(url_to_sites)
    if args.limit:
        urls = urls[: args.limit]
    print(f"Scraping {len(urls)} distinct URLs")

    protected = fetch_protected_pairs(client, [s["site_id"] for s in sites_with_url])

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    extracted_at = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    failures: list[dict] = []

    for index, url in enumerate(urls, start=1):
        services = scrape_url(session, url)
        if services is None:
            failures.append({"url": url, "sites": len(url_to_sites[url])})
            print(f"[{index}/{len(urls)}] FAIL {url}")
            continue
        kept = {sid: v for sid, v in services.items() if v[0] >= args.min_confidence}
        print(f"[{index}/{len(urls)}] OK {url} -> {sorted(kept)}")
        for site in url_to_sites[url]:
            for service_id, (confidence, page_url) in kept.items():
                if (site["site_id"], service_id) in protected:
                    continue
                rows.append(
                    {
                        "site_id": site["site_id"],
                        "service_id": service_id,
                        "data_source": DATA_SOURCE,
                        "is_verified": False,
                        "source_url": page_url,
                        "confidence": confidence,
                        "extracted_at": extracted_at,
                    }
                )

    if failures:
        with SCRAPE_FAILURES_CSV.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["url", "sites"])
            writer.writeheader()
            writer.writerows(failures)
        print(f"{len(failures)} URLs failed; logged to {SCRAPE_FAILURES_CSV}")

    print(f"Prepared {len(rows)} site-service rows.")
    upsert_in_batches(client, rows)
    print("Scrape complete.")


if __name__ == "__main__":
    main()
