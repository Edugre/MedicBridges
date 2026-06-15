-- MedicBridges v2 schema -- 09: API read surface (proximity search + medication cache)
--
-- Adds the only pieces the FastAPI service needs that the schema didn't already
-- expose:
--   1. search_orgs_nearby(...)  -- authoritative PostGIS proximity query. Returns
--      the matching organizations ranked by their nearest in-radius site, with
--      stable keyset pagination on (distance_m, org_id). The app derives the
--      org-nested payload (sites + 340B contract pharmacies) from the curated
--      views; only the radius filter + ranking live here, in PostGIS.
--   2. medication cache table + search_medications(...) -- typeahead source so the
--      medication routes never block on an external RxNorm/openFDA round trip.
--
-- Both functions are SECURITY INVOKER and read only world-readable curated data,
-- so the anon key is sufficient (RLS already grants public SELECT).

-- =====================================================================
-- Proximity search: organizations near a point
-- =====================================================================
CREATE OR REPLACE FUNCTION public.search_orgs_nearby(
  p_lat                double precision,
  p_lon                double precision,
  p_radius_m           double precision,
  p_limit              integer DEFAULT 25,
  p_after_distance     double precision DEFAULT NULL,
  p_after_org          uuid DEFAULT NULL,
  p_service_categories text[] DEFAULT NULL,
  p_sliding            boolean DEFAULT NULL,
  p_has_340b           boolean DEFAULT NULL
)
RETURNS TABLE (
  org_id       uuid,
  grant_number text,
  org_name     text,
  org_website  text,
  has_340b     boolean,
  distance_m   double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH pt AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography AS g
  ),
  matched AS (
    SELECT
      s.org_id,
      s.grant_number,
      s.org_name,
      s.org_website,
      s.has_340b,
      min(ST_Distance(s.geom, pt.g)) AS distance_m
    FROM public.v_site s, pt
    WHERE s.geom IS NOT NULL
      AND s.geocode_status = 'ok'
      AND s.is_active
      AND ST_DWithin(s.geom, pt.g, p_radius_m)
      AND (p_sliding IS NULL OR s.accepts_sliding_scale = p_sliding)
      AND (p_has_340b IS NULL OR s.has_340b = p_has_340b)
      AND (
        p_service_categories IS NULL
        OR cardinality(p_service_categories) = 0
        OR s.service_categories && p_service_categories
      )
    GROUP BY s.org_id, s.grant_number, s.org_name, s.org_website, s.has_340b
  )
  SELECT org_id, grant_number, org_name, org_website, has_340b, distance_m
  FROM matched
  WHERE (
    p_after_distance IS NULL
    OR ROW(distance_m, org_id) > ROW(p_after_distance, p_after_org)
  )
  ORDER BY distance_m, org_id
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_orgs_nearby(
  double precision, double precision, double precision, integer,
  double precision, uuid, text[], boolean, boolean
) TO anon, authenticated;

-- =====================================================================
-- Medication reference cache (RxNorm / openFDA), filled by scripts/etl/etl_medications.py
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.medication (
  rxcui        text PRIMARY KEY,
  name         text NOT NULL,
  tty          text,                 -- RxNorm term type: IN, SCD, SBD, BN, ...
  generic_name text,
  synonyms     text[] NOT NULL DEFAULT ARRAY[]::text[],
  ndcs         text[] NOT NULL DEFAULT ARRAY[]::text[],
  source       text,                 -- 'rxnorm' | 'openfda'
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medication_name_trgm_idx
  ON public.medication USING gin (lower(name) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medication_ndcs_idx
  ON public.medication USING gin (ndcs);
CREATE INDEX IF NOT EXISTS medication_generic_idx
  ON public.medication (lower(generic_name));

DROP TRIGGER IF EXISTS medication_touch_updated_at ON public.medication;
CREATE TRIGGER medication_touch_updated_at
  BEFORE UPDATE ON public.medication
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- public health reference data: world-readable, same policy shape as the other curated tables
ALTER TABLE public.medication ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read ON public.medication;
CREATE POLICY public_read ON public.medication
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.medication TO anon, authenticated;

-- =====================================================================
-- Medication typeahead: prefix-first, trigram-fuzzy fallback
-- =====================================================================
CREATE OR REPLACE FUNCTION public.search_medications(
  p_q     text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  rxcui        text,
  name         text,
  tty          text,
  generic_name text,
  score        real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    m.rxcui,
    m.name,
    m.tty,
    m.generic_name,
    similarity(lower(m.name), lower(p_q)) AS score
  FROM public.medication m
  WHERE p_q IS NOT NULL
    AND length(btrim(p_q)) >= 2
    AND (
      lower(m.name) LIKE lower(btrim(p_q)) || '%'
      OR lower(m.name) % lower(btrim(p_q))
    )
  ORDER BY
    (lower(m.name) LIKE lower(btrim(p_q)) || '%') DESC,
    similarity(lower(m.name), lower(p_q)) DESC,
    length(m.name)
  LIMIT GREATEST(LEAST(p_limit, 25), 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_medications(text, integer) TO anon, authenticated;
