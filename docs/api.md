# MedicBridges API

FastAPI service over the Supabase/PostGIS curated schema. Spatial work runs in
PostGIS; the API validates input, assembles the org-nested payload, and enforces
a stable error contract. Public reads use the anon key; admin routes use the
service-role key behind `X-Admin-Key`.

## Run

```bash
pip install -r requirements.txt
cp .env.example .env   # fill SUPABASE_URL / keys / ADMIN_API_KEY
uvicorn api.main:app --reload
```

Interactive docs: `http://localhost:8000/docs`.

## Apply the migration

The API needs `supabase/migrations/20260615194000_api_search_rpcs.sql`
(`search_orgs_nearby`, the `medication` cache table, `search_medications`). Apply
with the Supabase CLI / your migration flow, then seed medications:

```bash
python -m scripts.etl.etl_medications
```

## Routes

### Resource discovery — `/api/v1/resources`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/nearby` | Proximity search. `lat`, `lon` required; `radius_km` (1–20, default 5); `limit` (≤100); `cursor`; filters `service_categories`, `accepts_sliding_scale`, `has_340b`, `resource_types`, `include_pharmacies_outside_radius`. |
| GET | `/organizations/{org_id}` | Full org: all active sites + 340B pharmacies. |
| GET | `/sites/{site_id}` | Single site detail. |

`GET /api/v1/services` — service taxonomy for filter UIs.

**Payload** is organization-nested:

```json
{
  "query": { "lat": 25.76, "lon": -80.19, "radius_km": 5 },
  "organizations": [
    { "org_id": "…", "name": "…", "has_340b": true, "distance_m": 100.0,
      "sites": [ { "site_id": "…", "within_radius": true, "distance_m": 90.0, … } ],
      "contract_pharmacies": [ { "pharmacy_id": "…", "within_radius": false, … } ] }
  ],
  "meta": { "organization_count": 1, "truncated": false, "next_cursor": null, "healthcare_desert": false }
}
```

Pagination is **cursor-based** over organizations (keyset on `distance_m, org_id`).
Follow `meta.next_cursor` while `meta.truncated` is true.

### Medication reference — `/api/v1/medications`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/autocomplete?q=&limit=` | Typeahead (prefix + trigram), Postgres cache. |
| GET | `/search?q=&limit=` | Name or NDC search. |
| GET | `/{rxcui}` | Lookup by RxNorm concept id. |

### Admin / ingestion — `/api/v1/admin` (requires `X-Admin-Key`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/pipeline/status` | Latest run per pipeline + data-quality summary. |
| GET | `/pipeline/runs?pipeline_name=&limit=&offset=` | Paginated ETL history. |

Triggering pipelines is intentionally out of scope for v1 (read-only monitoring).

## Error contract

| Status | `error` | When |
|--------|---------|------|
| 422 | `invalid_coordinates` | lat/lon out of range or non-numeric |
| 422 | `radius_exceeds_max` | `radius_km` > 20 (includes `max_km`) |
| 400 | `invalid_cursor` | malformed/expired cursor |
| 401 | `unauthorized` | missing/invalid admin key |
| 404 | `not_found` | unknown org/site/medication (includes `resource`) |
| 200 | — | empty results (healthcare desert) → `meta.healthcare_desert: true` |
| 502 | `upstream_error` | Supabase/PostgREST failure |

Empty or partial data never returns 5xx.

## Tests

```bash
pytest tests/api
```
