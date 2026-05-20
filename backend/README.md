# MedicBridges Backend

FastAPI async backend for ingesting, enriching, and serving HRSA Federally Qualified Health Center (FQHC) site data. Backed by PostgreSQL/PostGIS via Supabase.

## Stack

- **Python 3.14** / **uv** for dependency management
- **FastAPI** (async) + **uvicorn**
- **SQLAlchemy 2** (async ORM) + **asyncpg** driver
- **PostgreSQL** with **PostGIS** and **pg_trgm** extensions
- **Alembic** for schema migrations
- **rapidfuzz** for fuzzy string matching in the NPI pipeline

## Getting Started

```bash
# From backend/
uv sync                                      # install all deps including dev group
cp ../.env.example ../.env.local             # configure database URLs

uv run alembic upgrade head                  # apply migrations
uv run uvicorn app.main:app --reload         # dev server → http://localhost:8000
```

Two database URLs are required in `.env.{APP_ENV}` (files live at repo root):

| Variable | Driver | Used by |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://` | App + pipeline scripts |
| `DATABASE_URL_DIRECT` | `postgresql+psycopg://` | Alembic only (no pooler) |

Before running migrations on a fresh database, enable the required extensions:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Running the Review UI

```bash
make review        # build frontend then serve at http://localhost:8000/review-ui/
make review-dev    # Vite dev server + FastAPI hot reload (http://localhost:5173)
```

---

## Architecture

### Database Layer

**`app/db/session.py`** — lazy-initialized async engine. `SessionLocal()` returns an `AsyncSession` context manager. `_prepare_asyncpg_url` strips libpq params asyncpg doesn't accept and sets `statement_cache_size=0` for PgBouncer pooler hosts. `dispose_engine()` is called on FastAPI lifespan shutdown and at the end of every pipeline script.

**`app/db/base.py`** — `DeclarativeBase` with a `MetaData` naming convention so constraint names in migrations are derived automatically.

**`app/db/types.py`** — shared mixins:
- `UUIDPrimaryKeyMixin` — `id` UUID, `server_default=gen_random_uuid()`
- `TimestampMixin` — `created_at` / `updated_at`, both `server_default=now()`. Upsert statements that bypass the ORM must include `"updated_at": func.now()` in the `set_` dict explicitly.

### Models

| Table | Purpose |
|---|---|
| `organizations` | Top-level FQHC entity. GIN trigram index on `legal_name`. `npi` is NULL (HRSA CSV has no org-level NPI). |
| `sites` | Physical clinic location. PostGIS `Geography` point + GIN trigram on `site_name`. `bhcmis_id` is the HRSA stable identifier and upsert key. `npi` = HRSA-sourced NPI; `org_npi` = NPPES-promoted NPI. |
| `ingest_runs` | Operational catalog of every pipeline attempt. `status`: `running → completed / failed`. JSONB `stats` for per-script metrics (tier counts, conflict counts, etc.). Scripts commit the row before processing so in-flight runs are observable. |
| `raw_hrsa_sites` | Verbatim JSONB staging for HRSA CSV rows. FK to `ingest_runs`. |
| `raw_nppes_providers` | Verbatim JSONB staging for filtered NPPES rows. FK to `ingest_runs`. |
| `npi_match_candidates` | One row per `(site_id, candidate_npi)` pair. Tracks match tier, score, matched fields, and review status through its full lifecycle. |

> **Note on `sites.npi`:** not unique. The HRSA dataset has legitimate duplicate NPIs — the same NPI can appear at multiple physical locations. A unique constraint was applied and reverted (migration `b5f2c3d4e6a1`); do not re-add it.

---

## HRSA Data Pipeline

Loads HRSA Health Center Service Delivery CSV into normalized `organizations` and `sites` records.

```bash
uv run python -m app.scripts.ingest_hrsa_sites [--csv PATH] [--replace]
uv run python -m app.scripts.transform_hrsa_sites [--source-file FILENAME]
uv run python -m app.scripts.verify_hrsa_load [--min-orgs N] [--min-sites N]
```

### Stage 1 — Ingest (`ingest_hrsa_sites.py`)

CSV → `raw_hrsa_sites` (JSONB). Records SHA256, byte count, and status in `ingest_runs`. `--replace` wipes prior staging rows; without it, the script refuses if rows already exist.

### Stage 2 — Transform (`transform_hrsa_sites.py`)

`raw_hrsa_sites` → `organizations` + `sites` via PostgreSQL upserts keyed on `bhcmis_org_id` / `bhcmis_id`. Resolves the snapshot from `ingest_runs` (latest `completed` run) to pin both passes to the same data load.

Uses a **two-session design**: `read_session` holds a server-side cursor (`session.stream()`), `write_session` executes upserts. These must be on separate connections — asyncpg server-side cursors block all other statements on the same connection.

`organizations.npi` is intentionally left `NULL` — the HRSA site-delivery CSV has no org-level NPI.

### Stage 3 — Verify (`verify_hrsa_load.py`)

Data-quality gates (non-zero exit on failure):

| Check | Floor |
|---|---|
| Organization count | ≥ 1,000 |
| Site count | ≥ 15,000 |
| Geocoded ratio | ≥ 95% |
| Distinct states | ≥ 50 |
| Orphan sites | 0 |

Also reports informational metrics: `sites_with_npi` (HRSA-sourced NPI, i.e. `sites.npi IS NOT NULL`) and `npi_via_nppes` (distinct sites with a `promoted` candidate in `npi_match_candidates`). Note: NPPES-promoted NPIs land in `sites.org_npi`, not `sites.npi`, so the two metrics are independent.

**Real-data baseline (dev, 2026-05-12):** 1,527 orgs · 18,911 sites · 99.71% geocoded · 32% HRSA-sourced NPI coverage.

---

## NPPES NPI Enrichment Pipeline

Matches HRSA FQHC sites against the 9.5M-row CMS NPPES provider registry and writes confirmed org-level NPIs to `sites.org_npi`. `sites.npi` is not modified by this pipeline.

```bash
uv run python -m app.scripts.ingest_nppes [--csv PATH] [--replace]
uv run python -m app.scripts.match_nppes_sites [--replace]
uv run python -m app.scripts.promote_npi_matches [--dry-run]
uv run python -m app.scripts.bulk_accept_pending [--execute]   # dry-run by default
```

### Stage 1 — Ingest (`ingest_nppes.py`)

Filters NPPES CSV to FQHC organizations only: Entity Type 2 + taxonomy `261QF0400X` + no deactivation date. ~0.19% pass rate → ~18K rows staged in `raw_nppes_providers`.

### Stage 2 — Match (`match_nppes_sites.py`)

Loads all staged NPPES rows into three in-memory lookup dicts (`by_address`, `by_zip`, `by_state`). Streams every FQHC site and attempts a three-tier match:

| Tier | Strategy | Score | Default status |
|---|---|---|---|
| T1 | Exact `(zip5, normalized_address)` | 1.0 (or name-sim for multi-NPI addresses) | `accepted` |
| T2 | Fuzzy address in same ZIP (`addr_sim ≥ 0.85`, `name_sim ≥ 0.70`) | Mean of both sims | `accepted` if score ≥ 0.85, else `pending` |
| T3 | Name similarity in same city + state (`name_sim ≥ 0.80`) | name-sim | `pending` |

Sites where HRSA already has an NPI that differs from the NPPES candidate → `conflict`.

Address normalization strips suite tokens (`STE`, `SUITE`, `APT`, `UNIT`, `BLDG`, `FL`, `RM`, `ROOM`, `#`) and everything after them. The same normalizer runs on both HRSA and NPPES addresses so that `150 SARGENT DR STE 1` and `150 SARGENT DR` hit T1.

**Real-data match results (dev, 2026-05-12):** 17,969 sites → T1 9,737 / T2 327 / T3 249 / conflict 694 / no-match 6,962.

### Stage 3 — Promote (`promote_npi_matches.py`)

Streams `accepted` candidates and writes `candidate_npi` to `sites.org_npi` in 500-row batches via a `CASE`-expression `UPDATE`. After the promotion loop, all remaining `conflict` candidates are transitioned to `requires_review` for human review — they are never auto-promoted.

**Real-data results (dev, 2026-05-12):** 8,337 accepted promoted · 694 conflicts held for review.

### Stage 4 — Bulk-accept pending (`bulk_accept_pending.py`)

Promotes high-confidence `pending` candidates that don't require full manual review:

| Tier | Score threshold |
|---|---|
| T2 | ≥ 0.84 |
| T3 | ≥ 0.95 |

Writes to `sites.org_npi` only where `org_npi IS NULL` — will not overwrite a value already set by Stage 3 or a manual UI review. Creates an `IngestRun` for observability. Default is dry-run.

```bash
make bulk-accept-pending          # dry-run
make bulk-accept-pending-execute  # apply
```

### `npi_match_candidates` Status Lifecycle

| Status | Meaning |
|---|---|
| `accepted` | Auto-accepted by match algorithm; ready to promote |
| `pending` | T3 or low-confidence T2; requires human or bulk review |
| `conflict` | HRSA NPI differs from NPPES candidate; never auto-promoted |
| `requires_review` | Conflict transitioned to manual review queue |
| `promoted` | `candidate_npi` written to `sites.org_npi` |
| `rejected` | Manually rejected; will not be promoted |

---

## Review API

REST endpoints for human review of the NPI match queue. Mounts at `/review/*`.

| Endpoint | Description |
|---|---|
| `GET /review/counts` | Counts of `requires_review` and `pending` candidates |
| `GET /review/queue` | Paginated queue with site + NPPES context (`?status=`, `?page=`, `?page_size=`) |
| `POST /review/{id}/accept` | Promote candidate → `sites.org_npi`, status → `promoted` |
| `POST /review/{id}/reject` | Status → `rejected` |

The queue endpoint LEFT JOINs `raw_nppes_providers` using the latest completed NPPES ingest run to hydrate each candidate with its full NPPES source record.

The built React frontend is served as static files at `/review-ui/` when `frontend/review/dist/` is present.

---

## Tests

```bash
uv run pytest app/tests/unit         # no database required
uv run pytest app/tests/integration  # requires .env.test pointing at a test DB
uv run pytest                        # all tests
```

**Unit (`app/tests/unit/`)** — pure functions, no database:
- `test_config.py` — `healthz_includes_app_env` logic
- `test_session.py` — `_prepare_asyncpg_url` (SSL stripping, pooler detection)
- `test_transform_helpers.py` — `_location_expr` and `_site_values`

**Integration (`app/tests/integration/`)** — require a live PostgreSQL database with `postgis` and `pg_trgm` enabled. Alembic migrations run once per test session; all tables are truncated between tests.
- `test_ingest.py` — staging rows, `IngestRun` catalog, `--replace` semantics
- `test_transform.py` — org/site upserts, geocoding, NPI backfill, `updated_at` refresh, snapshot isolation
- `test_api.py` — `/healthz` and `/healthz/db` endpoints

**Python 3.14 note:** `pyproject.toml` sets `asyncio_default_fixture_loop_scope = "session"` and `asyncio_default_test_loop_scope = "session"`. Both are required — asyncpg raises on cross-loop futures without them.

---

## Migrations

Managed by Alembic. Must use `DATABASE_URL_DIRECT` (direct connection, no pooler).

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"
uv run alembic downgrade -1
```

GeoAlchemy2 registers helpers in `alembic/env.py`. When autogenerating migrations that touch the `location` column (PostGIS `Geography`), Alembic emits `op.create_geospatial_table` / `op.create_geospatial_index` — do not replace these with the plain equivalents.

---

## Known Open Items

- `organizations.npi` is NULL for all rows — org-level NPI enrichment not yet built
- ~41% of FQHC sites have no NPPES match (6,962 no-match + 1,976 pending); secondary enrichment strategy TBD
- 678 conflict candidates with edit distance > 2 need manual review before promotion
- No tests for `match_nppes_sites.py`, `promote_npi_matches.py`, or `bulk_accept_pending.py`
- `app/api/v1/` directory exists but is currently empty — no versioned API yet
