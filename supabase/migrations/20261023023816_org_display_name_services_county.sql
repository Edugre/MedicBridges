-- MedicBridges v2 schema -- display names, org-level services, county
--
--   1. Every org name the API reads (v_site.org_name, v_org_services.org_name,
--      and through them v_resource.affiliation + search_orgs_nearby.org_name)
--      becomes coalesce(display_name, name). Column names are unchanged.
--   2. v_org_service_combined: level 'site' only for evidence about a
--      specific site; everything else is level 'org'.
--   3. county / county_fips appended to v_site and v_contract_pharmacy.
--   4. search_orgs_nearby: service filter matches org- and site-level
--      services; new optional p_county filter.
--
-- CREATE OR REPLACE VIEW only appends columns, so dependants (v_resource)
-- and existing clients keep working.

-- =====================================================================
-- v_site
-- =====================================================================
CREATE OR REPLACE VIEW public.v_site
WITH (security_invoker = true) AS
SELECT
  s.id                       AS site_id,
  s.bphc_site_num,
  s.name,
  s.npi,
  s.phone,
  s.website,
  s.operating_hours_per_week,
  s.status,
  s.center_type,
  s.location_type,
  s.location_setting,
  s.accepts_sliding_scale,
  s.is_active,
  s.last_refreshed_at,
  o.id                       AS org_id,
  o.grant_number,
  COALESCE(o.display_name, o.name) AS org_name,
  o.website                  AS org_website,
  l.address_line_1,
  l.city,
  l.state,
  l.zip,
  l.latitude,
  l.longitude,
  l.geom,
  l.geocode_status,
  EXISTS (
    SELECT 1 FROM public.covered_entity ce
    WHERE ce.org_id = o.id AND ce.is_active
  ) AS has_340b,
  COALESCE(svc.service_ids,        ARRAY[]::integer[]) AS service_ids,
  COALESCE(svc.verified_service_ids, ARRAY[]::integer[]) AS verified_service_ids,
  COALESCE(svc.service_categories, ARRAY[]::text[])    AS service_categories,
  COALESCE(svc.service_count, 0)                       AS service_count,
  l.county,
  l.county_fips
FROM public.site s
JOIN public.organization o ON o.id = s.org_id
LEFT JOIN public.location l ON l.id = s.location_id
LEFT JOIN LATERAL (
  SELECT
    array_agg(DISTINCT ss.service_id ORDER BY ss.service_id) AS service_ids,
    array_agg(DISTINCT ss.service_id ORDER BY ss.service_id)
      FILTER (WHERE ss.is_verified) AS verified_service_ids,
    array_agg(DISTINCT sv.category) AS service_categories,
    count(DISTINCT ss.service_id) AS service_count
  FROM public.site_service ss
  JOIN public.service sv ON sv.service_id = ss.service_id
  WHERE ss.site_id = s.id
) svc ON true;

-- =====================================================================
-- v_contract_pharmacy (county appended)
-- =====================================================================
CREATE OR REPLACE VIEW public.v_contract_pharmacy
WITH (security_invoker = true) AS
SELECT
  p.id                AS pharmacy_uuid,
  p.pharmacy_id,
  p.name,
  p.phone,
  p.opais_id,
  ce.name             AS covered_entity_name,
  ce.org_id,
  l.address_line_1,
  l.city,
  l.state,
  l.zip,
  l.latitude,
  l.longitude,
  l.geom,
  l.geocode_status,
  p.contract_begin_date,
  p.contract_term_date,
  (p.contract_term_date IS NULL OR p.contract_term_date >= current_date) AS is_currently_contracted,
  p.is_active,
  l.county,
  l.county_fips
FROM public.contract_pharmacy p
JOIN public.covered_entity ce ON ce.opais_id = p.opais_id
LEFT JOIN public.location l ON l.id = p.location_id;

-- =====================================================================
-- v_org_services (display name only; service arrays unchanged)
-- =====================================================================
CREATE OR REPLACE VIEW public.v_org_services
WITH (security_invoker = true) AS
SELECT
  o.id          AS org_id,
  o.grant_number,
  COALESCE(o.display_name, o.name) AS org_name,
  COALESCE(array_agg(DISTINCT ss.service_id ORDER BY ss.service_id)
    FILTER (WHERE ss.service_id IS NOT NULL), ARRAY[]::integer[]) AS service_ids,
  COALESCE(array_agg(DISTINCT sv.category)
    FILTER (WHERE sv.category IS NOT NULL), ARRAY[]::text[])      AS service_categories
FROM public.organization o
LEFT JOIN public.site s        ON s.org_id = o.id AND s.is_active
LEFT JOIN public.site_service ss ON ss.site_id = s.id
LEFT JOIN public.service sv     ON sv.service_id = ss.service_id
GROUP BY o.id, o.grant_number, o.display_name, o.name;

-- =====================================================================
-- v_org_service_combined
--
-- level 'site' = evidence about that specific site: a site-scoped source
-- (the site's own web page, the FACHC directory) or a row verified at that
-- site. Everything else is level 'org', including HRSA UDS Table 5, which is
-- reported per grantee and copied onto every service-delivery site by
-- transform_uds_services(). A level 'org' row never means every site offers
-- the service.
--
-- Appended columns: site_ids (sites with the evidence; NULL for 'org'),
-- service_name, category.
-- =====================================================================
CREATE OR REPLACE VIEW public.v_org_service_combined
WITH (security_invoker = true) AS
WITH ss AS (
  SELECT
    s.org_id,
    ss.site_id,
    ss.service_id,
    ss.data_source,
    ss.source_url,
    ss.confidence,
    ss.is_verified,
    (ss.is_verified
      OR ss.data_source IN ('Site website (keyword extraction)', 'FACHC directory')) AS is_site_scoped
  FROM public.site_service ss
  JOIN public.site s ON s.id = ss.site_id AND s.is_active
)
SELECT o.id AS org_id, o.grant_number, sv.service_id, sv.code, 'org'::text AS level,
       os.data_source, os.source_url, os.confidence, os.is_verified,
       NULL::uuid[] AS site_ids, sv.name AS service_name, sv.category
FROM public.org_service os
JOIN public.organization o ON o.id = os.org_id
JOIN public.service sv ON sv.service_id = os.service_id
UNION ALL
SELECT o.id, o.grant_number, sv.service_id, sv.code, 'org'::text,
       min(ss.data_source), min(ss.source_url), max(ss.confidence), bool_or(ss.is_verified),
       NULL::uuid[], sv.name, sv.category
FROM ss
JOIN public.organization o ON o.id = ss.org_id
JOIN public.service sv ON sv.service_id = ss.service_id
WHERE NOT ss.is_site_scoped
GROUP BY o.id, o.grant_number, sv.service_id, sv.code, sv.name, sv.category
UNION ALL
SELECT o.id, o.grant_number, sv.service_id, sv.code, 'site'::text,
       min(ss.data_source), min(ss.source_url), max(ss.confidence), bool_or(ss.is_verified),
       array_agg(DISTINCT ss.site_id ORDER BY ss.site_id), sv.name, sv.category
FROM ss
JOIN public.organization o ON o.id = ss.org_id
JOIN public.service sv ON sv.service_id = ss.service_id
WHERE ss.is_site_scoped
GROUP BY o.id, o.grant_number, sv.service_id, sv.code, sv.name, sv.category;

COMMENT ON VIEW public.v_org_service_combined IS 'Services per organization with evidence granularity. level=site: evidence for the sites in site_ids. level=org: offered somewhere in the network (org_service website evidence, HRSA UDS); never means every site.';

-- grants survive CREATE OR REPLACE; restated for a fresh rebuild
GRANT SELECT ON public.v_site                 TO anon, authenticated;
GRANT SELECT ON public.v_contract_pharmacy    TO anon, authenticated;
GRANT SELECT ON public.v_org_services         TO anon, authenticated;
GRANT SELECT ON public.v_org_service_combined TO anon, authenticated;

-- =====================================================================
-- search_orgs_nearby: + p_county; service filter over both levels
--
-- New trailing parameter = new signature, so drop the old one (otherwise
-- PostgREST sees two overloads). Return columns are unchanged.
-- =====================================================================
DROP FUNCTION IF EXISTS public.search_orgs_nearby(
  double precision, double precision, double precision, integer,
  double precision, uuid, text[], boolean, boolean
);

CREATE OR REPLACE FUNCTION public.search_orgs_nearby(
  p_lat                double precision,
  p_lon                double precision,
  p_radius_m           double precision,
  p_limit              integer DEFAULT 25,
  p_after_distance     double precision DEFAULT NULL,
  p_after_org          uuid DEFAULT NULL,
  p_service_categories text[] DEFAULT NULL,
  p_sliding            boolean DEFAULT NULL,
  p_has_340b           boolean DEFAULT NULL,
  p_county             text DEFAULT NULL
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
  -- 'Miami-Dade', 'miami-dade county' and '12086' all match Miami-Dade County.
  cty AS (
    SELECT
      nullif(btrim(p_county), '') AS raw,
      lower(regexp_replace(btrim(p_county), '\s+county$', '', 'i')) AS norm
  ),
  matched AS (
    SELECT
      s.org_id,
      s.grant_number,
      s.org_name,
      s.org_website,
      s.has_340b,
      min(ST_Distance(s.geom, pt.g)) AS distance_m
    FROM public.v_site s, pt, cty
    WHERE s.geom IS NOT NULL
      AND s.geocode_status = 'ok'
      AND s.is_active
      AND ST_DWithin(s.geom, pt.g, p_radius_m)
      AND (p_sliding IS NULL OR s.accepts_sliding_scale = p_sliding)
      AND (p_has_340b IS NULL OR s.has_340b = p_has_340b)
      AND (
        cty.raw IS NULL
        OR s.county_fips = cty.raw
        OR lower(regexp_replace(s.county, '\s+county$', '', 'i')) = cty.norm
      )
      -- Org-level match: the org offers a requested category somewhere in its
      -- network. The site that ranks it is not claimed to offer it.
      AND (
        p_service_categories IS NULL
        OR cardinality(p_service_categories) = 0
        OR EXISTS (
          SELECT 1 FROM public.v_org_service_combined c
          WHERE c.org_id = s.org_id
            AND c.category = ANY (p_service_categories)
        )
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
  double precision, uuid, text[], boolean, boolean, text
) TO anon, authenticated;
