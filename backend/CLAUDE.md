# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `backend/`. The project uses `uv` (`[dependency-groups]` in pyproject.toml is a uv-only feature).

```bash
uv sync                          # install all deps including dev group
uv run uvicorn app.main:app --reload  # dev server (http://localhost:8000)
uv run pytest app/tests/unit     # unit tests (no DB required)
uv run pytest app/tests/integration  # integration tests (requires .env.test)
uv run pytest                    # all tests
uv run pytest app/tests/integration/test_transform.py::test_upsert_updates_site_name  # single test
uv run ruff check .              # lint
uv run ruff format .             # format
uv run mypy .                    # type-check
```

**HRSA pipeline scripts** (run from `backend/`, require DATABASE_URL in env):

```bash
uv run python -m app.scripts.ingest_hrsa_sites [--csv PATH] [--replace]
uv run python -m app.scripts.transform_hrsa_sites [--source-file FILENAME]
uv run python -m app.scripts.verify_hrsa_load [--min-orgs N] [--min-sites N]
```

**NPPES NPI enrichment pipeline** (run from `backend/`, require DATABASE_URL in env):

```bash
uv run python -m app.scripts.ingest_nppes [--csv PATH] [--replace]
uv run python -m app.scripts.match_nppes_sites [--replace]
uv run python -m app.scripts.promote_npi_matches [--dry-run]
```

**Alembic** (must use `DATABASE_URL_DIRECT`, not the pooler URL):

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"
uv run alembic downgrade -1
```

## Environment

Env files live at **repo root** (not inside `backend/`), named `.env.{APP_ENV}`. `APP_ENV` defaults to `local`. Copy `.env.example` → `.env.local` to get started.

Two database URLs are required:
- `DATABASE_URL` — `postgresql+asyncpg://...` — used by the app (supports PgBouncer pooler)
- `DATABASE_URL_DIRECT` — `postgresql+psycopg://...` — used by Alembic only (requires a direct connection)

`INCLUDE_ENV_IN_HEALTHZ` is optional; if unset, `GET /healthz` omits `app_env` in production and includes it otherwise.

## Tests

Tests live in `app/tests/` and split into two layers:

**Unit** (`app/tests/unit/`) — pure functions, no database:
- `test_config.py` — `healthz_includes_app_env` logic
- `test_session.py` — `_prepare_asyncpg_url` (SSL stripping, pooler detection)
- `test_transform_helpers.py` — `_location_expr` and `_site_values`

**Integration** (`app/tests/integration/`) — require a live PostgreSQL database. Create `.env.test` at the repo root (same format as `.env.example`) pointing at a test database with `postgis` and `pg_trgm` enabled. Alembic migrations run automatically once per test session; all tables are truncated between tests.
- `test_ingest.py` — staging rows, `IngestRun` catalog, `--replace` semantics
- `test_transform.py` — org/site upserts, geocoding, NPI backfill, `updated_at` refresh, snapshot isolation
- `test_api.py` — `/healthz` and `/healthz/db` endpoints

**Python 3.14 asyncio requirement**: `pyproject.toml` sets both `asyncio_default_fixture_loop_scope = "session"` and `asyncio_default_test_loop_scope = "session"`. Both are required — without the test scope setting, async fixtures and tests run in different event loops and asyncpg raises "Future attached to a different loop". The `conftest.py` teardown uses `asyncio.run(engine.dispose())` rather than `asyncio.get_event_loop().run_until_complete(...)` because Python 3.14 no longer implicitly creates an event loop. Do not change these without understanding the cross-loop implications.

## Architecture

### Database session (`app/db/session.py`)

The engine is **lazily initialized** — importing the module does not call `get_settings()` or open a connection. Use:
- `SessionLocal()` — returns an `AsyncSession` context manager (backed by `_SessionLocalProxy`)
- `get_engine()` — returns the shared `AsyncEngine`, creating it on first call
- `dispose_engine()` — disposes the engine and resets cached state (called in FastAPI lifespan and script `_run` cleanup)

`_prepare_asyncpg_url` strips libpq query params that asyncpg doesn't accept (`sslmode`, `channel_binding`) and sets `statement_cache_size=0` when the host contains `-pooler` (PgBouncer transaction-mode requirement).

### Models

All models inherit from `Base` (`app/db/base.py`) which has a `MetaData` naming convention — constraint names in migrations are derived from this convention. When adding constraints to models, use the short form (`name="my_constraint"`) and let the convention expand it; in migrations use `op.f('ck_table_name_my_constraint')`.

Shared mixins in `app/db/types.py`:
- `UUIDPrimaryKeyMixin` — `id` UUID with `server_default=gen_random_uuid()`
- `TimestampMixin` — `created_at` / `updated_at` (both `server_default=now()`)

`updated_at` is only refreshed by ORM-level saves. Upsert statements that bypass the ORM must include `"updated_at": func.now()` in the `set_` dict explicitly (see `_flush_site_chunk` in `transform_hrsa_sites.py`).

`IngestRun` tracks pipeline attempts with `status` (`running` → `completed` / `failed`), `rows_read`, `rows_passed_filter`, `row_count`, and a `stats` JSONB column for per-script metrics (tier breakdowns, conflict counts, etc.). Scripts commit the `IngestRun` row before processing begins so in-flight runs are observable, then update it to `completed` or `failed` at the end.

`Index()` names in model files use plain strings (`Index("ix_table_col", "col")`). `op.f(...)` is Alembic-only — do not use it inside model class definitions.

### HRSA data pipeline

Three-stage pipeline for loading HRSA Health Center site data:

**Stage 1 — Ingest** (`ingest_hrsa_sites.py`):  
CSV → `raw_hrsa_sites` (JSONB staging). Every attempt is recorded in `ingest_runs` with SHA256, byte count, and status (`running` → `completed` / `failed`). The ingest commits the `IngestRun` in its own transaction before staging begins so in-flight runs are observable. All staging rows receive `ingested_at` set to the same `started_at` Python timestamp from their `IngestRun` — this equality is the bridge to Stage 2. `--replace` wipes prior staging rows before inserting; without it, ingest refuses if rows already exist.

**Stage 2 — Transform** (`transform_hrsa_sites.py`):  
`raw_hrsa_sites` → `organizations` + `sites` via PostgreSQL upserts keyed on `bhcmis_org_id` and `bhcmis_id` respectively. Resolves the snapshot timestamp from `ingest_runs` (latest `completed` run) rather than scanning staging — this pins both passes to the same snapshot.

Uses a **two-session design**: `read_session` holds a server-side cursor (via `session.stream()`) while `write_session` executes upserts. These must be on separate connections — a server-side cursor blocks other statements on the same connection in asyncpg.

`organizations.npi` is intentionally left `NULL` by this transform. The HRSA site-delivery CSV only has per-site NPI (`FQHC Site NPI Number` → `sites.npi`); org-level NPI is expected to come from a separate NPPES transform.

`sites.npi` is **not unique**. The HRSA dataset has duplicate NPI values — the same NPI can appear at multiple physical locations for a single credentialed provider. A unique constraint was applied and then reverted (see migration `b5f2c3d4e6a1`); do not re-add it. After NPPES promotion, NPI coverage reaches ~59% of sites; the remaining ~41% have no match in the FQHC taxonomy slice of NPPES and will need a different enrichment strategy.

**Stage 3 — Verify** (`verify_hrsa_load.py`):  
Data-quality checks: org count ≥ 1000, site count ≥ 15000, geocoded ratio ≥ 95%, distinct states ≥ 50, zero orphan sites. Exits non-zero on failure. Also reports `sites_with_npi` (total NPI coverage) and `npi_via_nppes` (sites whose NPI came from NPPES promotion) as informational metrics.

### NPPES NPI enrichment pipeline

Three-stage pipeline that matches HRSA FQHC sites against the CMS NPPES provider registry and writes confirmed NPIs back to `sites.npi`.

**Stage 1 — Ingest** (`ingest_nppes.py`):  
Filters the 9.5M-row NPPES CSV to the ~18K FQHC organisations (Entity Type 2, taxonomy `261QF0400X`, no deactivation date) and stages 42 selected columns as JSONB into `raw_nppes_providers`. Pass rate is ~0.19% (18,104 of 9,551,447 rows). Records `rows_read`, `rows_passed_filter`, and `row_count` in `ingest_runs`. `--replace` wipes prior staging rows.

**Stage 2 — Match** (`match_nppes_sites.py`):  
Loads all staged NPPES rows into three in-memory lookup dicts (`by_address`, `by_zip`, `by_state`), then streams every FQHC site joined to `raw_hrsa_sites` via JSONB `BPHC Assigned Number` and attempts a three-tier match:

- **Tier 1** — exact `(zip5, normalised_address)` key; score = 1.0, or name-sim when multiple NPIs share the same address
- **Tier 2** — fuzzy address within same ZIP (`addr_sim ≥ 0.85`, `name_sim ≥ 0.70`); score = mean of both sims
- **Tier 3** — name similarity within same city + state (`name_sim ≥ 0.80`); always written as `status = 'pending'`

Writes results to `npi_match_candidates` (upsert on `site_id, candidate_npi`). Sites where HRSA already has a non-null NPI that differs from the NPPES match are written with `status = 'conflict'`. `--replace` wipes the table before running.

Address normalisation strips suite tokens (`STE`, `SUITE`, `APT`, `UNIT`, `BLDG`, `FL`, `RM`, `ROOM`, `#`) and everything after them, including any trailing letter or number (e.g. `STE F`, `STE 250`, `# 2100`). A leading comma before the token is also absorbed. The same normaliser runs on both HRSA and NPPES sides so that `150 SARGENT DR STE 1` and `150 SARGENT DR` match at Tier 1. See `_normalize_address`, `_SUITE_RE`, and `_TRAILING_PUNCT_RE` in the script.

Real-data match results (dev, 2026-05-12): 17,969 FQHC sites → T1 9,737 / T2 327 / T3 249 / conflict 694 / no-match 6,962.

**Stage 3 — Promote** (`promote_npi_matches.py`):  
Streams `npi_match_candidates` with `status = 'accepted'` and writes `candidate_npi` to `sites.npi`. Uses two SQL statements per 500-row batch: a `CASE`-expression `UPDATE sites` and an `IN`-list `UPDATE npi_match_candidates SET status = 'promoted'`. After the promotion loop, all remaining `conflict` candidates are transitioned to `requires_review` in a single bulk update — they are never auto-promoted. `--dry-run` logs what would be promoted and counts conflicts without writing anything.

Real-data promotion results (dev, 2026-05-12): 8,337 accepted promoted; 694 conflicts held for review.

**`npi_match_candidates` status lifecycle:**

| Status | Meaning |
|---|---|
| `accepted` | Auto-accepted by match algorithm; ready to promote |
| `pending` | Tier 3 or low-confidence Tier 2; requires human review |
| `conflict` | HRSA NPI ≠ NPPES candidate; promote transitions to `requires_review` |
| `requires_review` | Conflict held for human review via UI; never auto-promoted |
| `promoted` | `candidate_npi` has been written to `sites.npi` |
| `rejected` | Manually rejected; will never be promoted |

### API layer

New routes belong in `app/api/v1/`. Register routers on the `app` instance in `app/main.py`.

### Migrations

GeoAlchemy2 registers Alembic helpers in `alembic/env.py` (`include_object`, `writer`, `render_item`). When autogenerating migrations involving the `location` column (PostGIS `Geography`), Alembic will emit `op.create_geospatial_table` / `op.create_geospatial_index` — do not replace these with the plain `op.create_table` / `op.create_index` equivalents.

Two PostgreSQL extensions must be enabled before running migrations on a fresh database:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

`postgis` is required for the `Geography` column on `sites.location`. `pg_trgm` is required for the GIN trigram indexes on `organizations.legal_name` and `sites.site_name`.
