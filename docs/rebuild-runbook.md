# MedicBridges v2 Rebuild Runbook

Operational steps to stand up the from-scratch v2 schema and load it. The schema
and ETL are implemented; this runbook covers applying and cutting over. It
assumes a **new** Supabase project (decision D1).

## 1. Provision and configure

1. Create a new Supabase project. Note its URL and service-role key.
2. `cp .env.example .env` and fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`.
3. `pip install -r requirements.txt`.

## 2. Apply the schema

The migrations in `supabase/migrations/` are an ordered, self-contained v2 build:

| Order | File | What it creates |
|---|---|---|
| 01 | `..._init_extensions_schemas_enums.sql` | `staging` schema, PostGIS, enums |
| 02 | `..._functions.sql` | address-key / geom / touch triggers' functions |
| 03 | `..._core_tables.sql` | curated tables, constraints, triggers, indexes |
| 04 | `..._staging_and_transforms.sql` | staging tables + transform RPCs |
| 05 | `..._views.sql` | `v_resource`, `v_site`, `v_contract_pharmacy`, ... |
| 06 | `..._rls_grants.sql` | RLS + grants |
| 07 | `..._seed_services.sql` | service catalog + categories |
| 08 | `..._staging_load_rpcs.sql` | staging load RPCs + function security |

Apply with the Supabase CLI (`supabase db push`) or paste each file, in order,
into the SQL editor.

## 3. Load the data (staging-first)

Run the whole pipeline in dependency order:

```bash
python -m scripts.run_pipeline
```

Or run steps individually (order matters):

```bash
python -m scripts.etl.etl_fqhc_sites      # organization + site
python -m scripts.etl.etl_ce              # covered_entity (scope-filtered)
python -m scripts.etl.etl_pharmacies      # contract_pharmacy (needs covered_entity)
python -m scripts.etl.etl_340b_pharmacy   # shipping_address + reconcile
python -m scripts.etl.etl_uds_services    # site_service (UDS org->site)
```

Each script: loads source rows verbatim into `staging.*` via RPC, then calls a
`transform_*` RPC that upserts curated tables by natural key, dedups/links
locations, enqueues geocoding, and soft-deactivates rows missing from the latest
export.

Optional state-scoped service enrichment:

```bash
python -m scripts.scrape.scrape_site_services --state FL
python -m scripts.scrape.verify_services --state FL
```

## 4. Geocode (OSM-only queue)

```bash
python -m scripts.geocode.run_geocode_queue        # drains the queue
python -m scripts.geocode.run_geocode_queue --limit 500
```

Locations dedup by `address_key`, so each distinct address is geocoded once.
Failures leave coordinates NULL and set `geocode_status='failed'`/`'needs_review'`
-- never a `(0,0)` sentinel.

## 5. Validate

```bash
python -m scripts.validate
```

Reports counts, HRSA<->340B match coverage, geocoding coverage, and hard hygiene
checks. Exits non-zero on any failure.

## 6. Cutover

1. Confirm `python -m scripts.validate` is clean and counts look right.
2. Point the frontend `.env` (`medicbridges-frontend/`) at the new project URL +
   anon key.
3. Proximity queries read `public.v_resource` (unified sites + pharmacies):
   `... WHERE geom IS NOT NULL ORDER BY geom <-> :point` with filters on
   `resource_type`, `service_categories`, `accepts_sliding_scale`.
4. Keep the old project until sign-off (rollback path), then retire it.
