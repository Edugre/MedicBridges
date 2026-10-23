"""Static checks on supabase/migrations + the API's read surface.

These run without a database. They pin the exposure rules from
20260615130500_rls_grants.sql / 20261023023734_expose_org_service_read.sql and
the coalesce(display_name, name) contract. An opt-in live check against a real
project runs only when MB_LIVE_ANON_TEST=1 (uses SUPABASE_URL + SUPABASE_ANON_KEY).
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
PRIVATE_TABLES = ("organization_name_backup", "staging_org_web_finding")


def _sql(path: Path) -> str:
    # strip -- comments so prose never satisfies or trips an assertion
    return re.sub(r"--[^\n]*", "", path.read_text()).lower()


def _latest_view_definition(view: str) -> str:
    pattern = re.compile(
        rf"create\s+or\s+replace\s+view\s+public\.{view}\b(.*?);\s*(?:\n|$)", re.S
    )
    found = None
    for path in MIGRATIONS:
        for match in pattern.finditer(_sql(path)):
            found = match.group(1)
    assert found is not None, f"no migration defines {view}"
    return found


def test_migration_versions_are_unique():
    versions = [p.name.split("_", 1)[0] for p in MIGRATIONS]
    assert len(versions) == len(set(versions))


@pytest.mark.parametrize("table", PRIVATE_TABLES)
def test_private_tables_never_granted_or_policied_for_clients(table):
    for path in MIGRATIONS:
        sql = _sql(path)
        assert not re.search(rf"grant\s+[^;]*\bon\s+(table\s+)?public\.{table}\b", sql), path.name
        assert not re.search(rf"create\s+policy\s+[^;]*\bon\s+public\.{table}\b", sql), path.name


@pytest.mark.parametrize("table", PRIVATE_TABLES)
def test_private_tables_have_rls_and_revoke(table):
    sql = "\n".join(_sql(p) for p in MIGRATIONS)
    assert re.search(rf"alter table public\.{table} enable row level security", sql)
    assert f"'{table}'" in sql and "revoke all on public.%i from anon, authenticated" in sql


def test_org_service_and_combined_view_are_readable():
    sql = _sql(next(p for p in MIGRATIONS if p.name.startswith("20261023023734")))
    assert "create policy public_read on public.org_service" in sql
    assert "grant select on public.org_service to anon, authenticated" in sql
    assert "grant select on public.v_org_service_combined to anon, authenticated" in sql


@pytest.mark.parametrize("table", PRIVATE_TABLES)
def test_api_never_reads_private_tables(table):
    for path in (ROOT / "api").rglob("*.py"):
        assert table not in path.read_text(), path


@pytest.mark.parametrize("view", ["v_site", "v_org_services"])
def test_org_name_is_coalesced_display_name(view):
    body = _latest_view_definition(view)
    assert "coalesce(o.display_name, o.name) as org_name" in body


def test_combined_view_reclassifies_uds_as_org_level():
    body = _latest_view_definition("v_org_service_combined")
    assert "'site'::text" in body and "is_site_scoped" in body
    assert "where not ss.is_site_scoped" in body


@pytest.mark.skipif(os.environ.get("MB_LIVE_ANON_TEST") != "1", reason="live check is opt-in")
@pytest.mark.parametrize("table", PRIVATE_TABLES)
def test_live_anon_cannot_read_private_tables(table):
    from api.config import get_settings
    from scripts._supabase_py import create_client

    settings = get_settings()
    client = create_client(settings.base_url, settings.supabase_anon_key)
    try:
        rows = client.table(table).select("*").limit(1).execute().data
    except Exception:
        return  # permission denied after the revoke migration
    assert rows == []  # RLS with no policy
