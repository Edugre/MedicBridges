# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `backend/`. The project uses `uv` (`[dependency-groups]` in pyproject.toml is a uv-only feature).

```bash
uv sync                          # install all deps including dev group
uv run uvicorn app.main:app --reload  # dev server (http://localhost:8000)
uv run pytest                    # run tests
uv run pytest path/to/test.py::test_name  # single test
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

### HRSA data pipeline

Three-stage pipeline for loading HRSA Health Center site data:

**Stage 1 — Ingest** (`ingest_hrsa_sites.py`):  
CSV → `raw_hrsa_sites` (JSONB staging). Every attempt is recorded in `ingest_runs` with SHA256, byte count, and status (`running` → `completed` / `failed`). The ingest commits the `IngestRun` in its own transaction before staging begins so in-flight runs are observable. All staging rows receive `ingested_at` set to the same `started_at` Python timestamp from their `IngestRun` — this equality is the bridge to Stage 2. `--replace` wipes prior staging rows before inserting; without it, ingest refuses if rows already exist.

**Stage 2 — Transform** (`transform_hrsa_sites.py`):  
`raw_hrsa_sites` → `organizations` + `sites` via PostgreSQL upserts keyed on `bhcmis_org_id` and `bhcmis_id` respectively. Resolves the snapshot timestamp from `ingest_runs` (latest `completed` run) rather than scanning staging — this pins both passes to the same snapshot.

Uses a **two-session design**: `read_session` holds a server-side cursor (via `session.stream()`) while `write_session` executes upserts. These must be on separate connections — a server-side cursor blocks other statements on the same connection in asyncpg.

`organizations.npi` is intentionally left `NULL` by this transform. The HRSA site-delivery CSV only has per-site NPI (`FQHC Site NPI Number` → `sites.npi`); org-level NPI is expected to come from a separate NPPES transform.

**Stage 3 — Verify** (`verify_hrsa_load.py`):  
Data-quality checks: org count ≥ 1000, site count ≥ 15000, geocoded ratio ≥ 95%, distinct states ≥ 50, zero orphan sites. Exits non-zero on failure.

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
