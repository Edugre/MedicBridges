# MedicBridges Database v2 — Target Schema & Rebuild Plan

Status: **Draft for review** · Owner: Eduardo · Last updated: 2026-06-15

This document proposes a cleaner, from-scratch rebuild of the clinic database and the
plan to migrate to it. It is a design to review **before** any code is written. Nothing
here has been applied.

---

## 1. Goals

1. **One source of truth for geocoding.** Eliminate the magic-number coordinate
   sentinels (`0.0` / `-1.0`) and the three-way disagreement between the two geocoders
   and the SQL migration. Replace with an explicit `geocode_status`.
2. **Normalize addresses.** Stop repeating `address_line_1 / city / state / zip` plus
   geocoding columns across four tables.
3. **Consistent, readable naming.** Replace raw HRSA column names
   (`bphc_site_num`, `hcp_merged_grant_lal_key`, `hcc_typ_desc`, `tot_oper_hr_per_week`)
   with clear, consistent `snake_case`.
4. **Enforce integrity that the current schema can't.** Real foreign keys, CHECK
   constraints, and a clear health-center scope.
5. **Separate raw from curated.** A `staging` layer that holds source data verbatim, and
   a curated layer the app reads — so the clean model can be re-derived deterministically
   and repeatedly.
6. **Fix the silent ETL-logging failure.** Pipelines must write `etl_run` rows (they
   currently don't, because the anon key is blocked by RLS and the error is swallowed).

### Non-goals
- Changing the upstream data sources or what entities are in scope (still 340B health
  centers + their sites/pharmacies/services).
- Building new app features. The frontend does not query the DB yet, so this is a
  low-risk moment to change the schema.

---

## 2. Why a schema rebuild alone won't fix data quality

The issues found in the review are mostly **pipeline/data** problems, not schema shape:
the `(0,0)` geocodes, missing NPIs, expired contracts, and orphaned `opais_id`s all come
from the ETL and sources. **A rebuild only pays off if the ETL is fixed at the same
time.** This plan therefore couples the schema redesign with targeted ETL changes
(Section 7).

---

## 3. Source systems (inputs)

| Source | File / endpoint | Feeds today | Loaded by |
|---|---|---|---|
| OPAIS 340B daily export (JSON) | `id340B`, `entityType`, `npiNumbers`, `streetAddress`, `shippingAddresses`, `contractPharmacies[]` | `ce`, `ce_shipping_address`, `ce_contract_pharmacy` | `etl_ce.py`, `etl_340b_pharmacy.py`, `etl_pharmacies.py` |
| HRSA Health Center sites (CSV) | `BPHC Assigned Number`, `Health Center Number`, geocoding X/Y, etc. | `fqhc_site`, `health_center_org` (derived) | `etl_fqhc_sites.py`, `supabase_orgs.py` |
| HRSA UDS 2024 Table 5 (XLSX, H80 + LAL) | staffing/utilization lines → service flags | `org_services`, `site_services` | `etl_uds_services.py` |
| Clinic website scrape | keyword extraction + verification | `site_services` | `scrape/scrape_site_services.py`, `scrape/verify_services.py` |
| Nominatim (OSM) then Google Geocoding | lat/lon for pharmacies | `ce_contract_pharmacy` | `geocode/delta_geocode_pharmacies.py`, `geocode/cascade_geocode_google.py` |

Key scope fact: `etl_ce.py` already filters covered entities to health-center types
(`ALLOWED_ENTITY_TYPES = {"CH", "FQHCLA"}`), but `etl_pharmacies.py` imports pharmacies
for **all** entity types in the export. That mismatch produced the ~21k out-of-scope
pharmacy rows. **v2 imports pharmacies only for in-scope covered entities**, which makes a
real foreign key possible.

---

## 4. Target architecture

Two schemas:

- **`staging`** — raw landing tables, one per source, columns as text, plus
  `loaded_at`, `source_file`, `run_id`. Truncated/replaced per run. **Not exposed** via
  the API. ETL writes here first.
- **`public`** — curated, constrained, the only thing the app and PostgREST read. Derived
  from `staging` by deterministic transform steps.

```
sources ──▶ staging.* (verbatim)  ──transform──▶  public.* (clean, constrained)  ──▶ app/views
                                                     │
                                              geocoding fills public.location
```

---

## 5. Target schema (`public`)

Conventions: `id uuid` surrogate PKs; stable external ids kept as `UNIQUE NOT NULL`
natural keys; `created_at`/`updated_at` (touch trigger) everywhere; `last_refreshed_at`
set by ETL.

### 5.1 Enum

```sql
CREATE TYPE geocode_status AS ENUM ('pending', 'ok', 'failed', 'needs_review');
```

### 5.2 `location` — shared addresses + geocoding (the central change)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| address_line_1 | text | |
| city | text | |
| state | char(2) | CHECK `^[A-Z]{2}$` |
| zip | text | CHECK `^[0-9]{5}(-[0-9]{4})?$` |
| address_key | text | generated: `street_number:zip5` (mirrors `address.py`) |
| latitude | numeric(9,6) | NULL until geocoded |
| longitude | numeric(9,6) | NULL until geocoded |
| geom | geography(Point,4326) | maintained by trigger from lat/lon |
| geocode_status | geocode_status | NOT NULL DEFAULT `'pending'` |
| geocode_source | text | `nominatim` / `google` / `hrsa` |
| geocoded_at | timestamptz | |
| created_at / updated_at | timestamptz | |

Constraints: `latitude BETWEEN -90 AND 90`, `longitude BETWEEN -180 AND 180`,
`NOT (latitude = 0 AND longitude = 0)`. **No coordinate is ever used as a flag** — failure
is `geocode_status='failed'` with NULL coordinates.

**Dedup (DECIDED — D2):** `address_key` is UNIQUE so a single physical address is
geocoded once and reused by every entity at that address. Rows whose `address_key` is NULL
(unparseable) get their own location. This directly cuts the re-geocoding volume incurred
by the rebuild. ETL upserts-and-links locations rather than embedding addresses.

### 5.3 `organization` (was `health_center_org`)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| grant_number | text UNIQUE NOT NULL | HRSA Health Center Number |
| name | text | |
| state | char(2) | |
| website | text | |
| opais_id | text | link to `covered_entity`, nullable |
| created_at / updated_at / last_refreshed_at | timestamptz | |

### 5.4 `covered_entity` (was `ce`, health-center scope)

| column | type | notes |
|---|---|---|
| id | uuid PK | surrogate (D4) |
| opais_id | text UNIQUE NOT NULL | 340B ID (stable natural key; FK target) |
| ce_id | text | |
| entity_type | text NOT NULL | `CH`, `FQHCLA`, … |
| name | text NOT NULL | |
| grant_number | text → organization(grant_number) | |
| npi | char(10) | CHECK 10 digits |
| is_participating | boolean NOT NULL DEFAULT true | |
| participating_start_date | date | |
| termination_date | date | CHECK `>= participating_start_date` |
| location_id | uuid → location | |
| hrsa_edit_date | date | was `last_updated_by_hrsa` |
| created_at / updated_at / last_refreshed_at | | |

### 5.5 `site` (was `fqhc_site`)

| column | type | was |
|---|---|---|
| id | uuid PK | |
| bphc_site_num | text UNIQUE NOT NULL | `bphc_site_num` |
| org_id | uuid NOT NULL → organization | `org_id` |
| location_id | uuid → location | site_address/city/state/zip + lat/lon |
| name | text NOT NULL | `site_name` |
| npi | char(10) | `fqhc_site_npi_num` |
| phone | text | `site_phone_num` |
| website | text | `site_url` |
| operating_hours_per_week | numeric | `tot_oper_hr_per_week` |
| status | text | `hcc_status_desc` |
| center_type | text | `hcc_typ_desc` |
| location_type | text | `hcc_loc_desc` |
| location_setting | text | `hcc_loc_setting_desc` |
| accepts_sliding_scale | boolean DEFAULT true | same |
| created_at / updated_at / last_refreshed_at | | |

### 5.6 `contract_pharmacy` (was `ce_contract_pharmacy`)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| pharmacy_id | text UNIQUE NOT NULL | HRSA pharmacy id |
| opais_id | text NOT NULL → covered_entity | **real FK** (v2 loads in-scope only) |
| location_id | uuid → location | |
| name | text NOT NULL | |
| phone | text | |
| contract_begin_date | date | |
| contract_term_date | date | CHECK `>= contract_begin_date` |
| created_at / updated_at | | |

`is_active` (term date in future or null) is exposed via a view, not stored.

### 5.7 `shipping_address` (was `ce_shipping_address`)

`id uuid PK`, `opais_id text → covered_entity`, `shipping_organization text`,
`location_id uuid → location`.

### 5.8 Services

- `service` (catalog): `id`, `name UNIQUE NOT NULL`, `code`, `description`, `category`.
- `site_service` (**canonical** grain — care is delivered at sites):
  `site_id → site`, `service_id → service`, `data_source`, `source_url`,
  `confidence numeric`, `is_verified boolean`, `extracted_at`, PK `(site_id, service_id)`.
- `org_service` (**table**, since 2026-10-23): org-level evidence that the organization
  offers a service *somewhere in its network* — not at every site. `org_id`, `service_id`,
  `data_source` (`website_crawl` | `website_manual`), `source_url`, `confidence 0–1`,
  `is_verified` (default false), `extracted_at`; PK `(org_id, service_id, data_source)`.
- `v_org_service_combined`: one row per (org, service, evidence) with `level`:
  - `site` — evidence about specific sites (`site_ids`): the site's own web page,
    the FACHC directory, or a row verified at that site.
  - `org` — everything else: `org_service`, and HRSA UDS Table 5 rows that
    `transform_uds_services()` copies onto every service-delivery site. All 83,820
    `site_service` rows were UDS-derived on 2026-10-23, so none are `site` yet.
- `staging_org_web_finding` (service-role only): crawler review queue. Never exposed.

### 5.8a Names and geography

- `organization.name` = HRSA legal grantee name (55 Florida orgs corrected on
  2026-10-22; previous site-style names in `organization_name_backup`, service-role only).
- `organization.display_name` (nullable) = patient-facing brand. Every app-facing
  name is `coalesce(display_name, name)` (`v_site.org_name`, `v_org_services.org_name`,
  `v_resource.affiliation`, `search_orgs_nearby.org_name`).
- `location.county` / `county_fips` from the HRSA sites file; 18 Florida site
  locations are still null.
- Data for all of the above: `scripts/sql/20261023_fl_org_data.sql`.
- **Known gap:** `transform_organizations()` still sets `name`/`website` from HRSA
  *site* rows, so re-running `etl_fqhc_sites` reverts the name and website fixes.

### 5.9 Operational tables

- `etl_run` — unchanged shape; ETL must write to it with the **service role** key.
- `data_quality_review` — log of corrections (carried over from the cleanup work).

### 5.10 Views (exposed to the app)

- `v_site` — site + organization + location (lat/lon/geom) + aggregated services array.
- `v_contract_pharmacy` — pharmacy + location + `is_active`.
- `v_org_services` — org-level rollup of `site_service` (legacy; the API uses
  `v_org_service_combined`).
- `v_org_service_combined` — org + site services with `level` (see 5.8).
- `v_data_quality_summary` — monitoring counts.

### 5.11 Indexes & RLS

- GIST on `location.geom`; btree on all FKs, `location.address_key`, `*.state`,
  `site_service.service_id`.
- `public_read` SELECT policy for `anon`/`authenticated` on curated tables + views.
- `staging` not exposed; `etl_run` and `data_quality_review` restricted to `service_role`.
- `org_service` and `v_org_service_combined` are world-readable (same `public_read` shape).
  `organization_name_backup` and `staging_org_web_finding` have RLS with no policy and all
  anon/authenticated privileges revoked (Supabase's default privileges had granted ALL).

---

## 6. Entity relationships

```
organization 1───* site *───* service        (via site_service)
     │                 │
     │ opais_id        │ location_id
     ▼                 ▼
covered_entity ───* location *─── contract_pharmacy
     │                 ▲
     │ location_id     │ location_id
     └──*  shipping_address
```

---

## 7. Required ETL changes

1. **Staging-first loads.** Each `etl_*.py` writes verbatim rows to `staging.*`; a SQL
   transform step (or a thin Python step) upserts into the curated tables. Keeps raw data
   for re-derivation and debugging.
2. **Address/location linking.** ETL upserts `location` by `address_key`, then sets
   `location_id` on the owning row instead of copying address columns.
3. **Geocoding rewrite (both scripts):**
   - Select work by `geocode_status = 'pending'` on `location` (not `latitude = 0.0`).
   - On success: set lat/lon + `geocode_status='ok'` + source + `geocoded_at`.
   - On failure: leave lat/lon NULL, set `geocode_status='failed'`. **Never write 0.0/-1.0.**
   - Cascade Google reads `geocode_status='failed' AND geocode_source='nominatim'` (or a
     `needs_review` status) instead of `latitude = 0.0`.
   - Dedup means each address is geocoded once regardless of how many pharmacies share it.
4. **Pharmacy scope filter.** `etl_pharmacies.py` imports only pharmacies whose
   `opais_id` is an in-scope covered entity, enabling the FK.
5. **Use the service-role key for writes** so `etl_run` logging actually records runs.

---

## 8. Rebuild & cutover plan

Because all curated data re-derives from sources and the frontend isn't wired to the DB,
we can rebuild safely with a staged cutover.

- **Phase 0 — Safety.** `pg_dump` the current project (schema + data) and archive it. The
  existing project stays running until v2 is validated (rollback path).
- **Phase 1 — New project + schema (DECIDED — D1).** Create a new Supabase project for v2.
  Capture its `SUPABASE_URL` / keys. Author v2 migrations there: `staging` schema,
  `geocode_status` enum, curated tables, constraints, triggers, indexes, RLS, views.
- **Phase 2 — ETL.** Update the Python scripts per Section 7. Add the SQL transform step.
- **Phase 3 — Load.** Run ETL into v2: OPAIS → CEs/pharmacies/shipping, HRSA sites → orgs/
  sites, UDS + scrape → services. Then geocode (`pending` → `ok`/`failed`).
- **Phase 4 — Validate.** Re-run the review queries (orphans, date ranges, NPI/zip/state
  formats, coordinate sanity, completeness) against v2 until clean. Compare row counts to
  the v1 snapshot.
- **Phase 5 — Cutover.** Point the ETL/geocode scripts and the app `.env` at the new
  project's URL/keys. Pause or retire the old project once validated.
- **Rollback.** The old project remains intact until sign-off; restore from the Phase 0
  dump if needed.

Estimated re-geocoding: with location dedup, only distinct addresses are geocoded once
(far fewer than 45k pharmacy rows), reducing Google cost and runtime.

---

## 9. Decisions

Resolved:
- **D1 — Where to build v2?** ✅ **Brand-new Supabase project** (clean isolation; new keys
  + setup, `.env` updated at cutover).
- **D2 — Deduplicate `location` by `address_key`?** ✅ **Yes** (geocode each unique address
  once).
- **D4 — Keys.** ✅ **uuid surrogate PKs + natural keys as UNIQUE.**
- **D3 — `org_service` as a view or a table?** ✅ **Table** for org-level evidence, plus
  `v_org_service_combined` to read both grains with an explicit `level`.

Still open (can be decided when writing the DDL):
- **D5 — Contract pharmacy scope.** Confirm v2 imports **only health-center-linked**
  pharmacies (enables the FK) and drops out-of-scope entity types entirely.

---

## 10. Risks

- **Re-geocoding cost/time** (Google API) — mitigated by `location` dedup.
- **Source format drift** — the OPAIS export already appears in two shapes (flat vs API
  camelCase); the staging layer absorbs this.
- **Service data confidence** — most `site_service` rows are inferred
  ("Federal Mandate Assumption"); v2 keeps provenance/confidence so the app can disclose it.
- **Scope loss** — dropping non-health-center pharmacies is intentional but irreversible in
  v2; the Phase 0 dump preserves them.
