-- MedicBridges v2 schema -- 05: app-facing views (the only read surface besides tables)

-- =====================================================================
-- v_site -- site + organization + location + aggregated services
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
  o.name                     AS org_name,
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
  COALESCE(svc.service_count, 0)                       AS service_count
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
-- v_contract_pharmacy -- pharmacy + covered entity + location + active flag
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
  p.is_active
FROM public.contract_pharmacy p
JOIN public.covered_entity ce ON ce.opais_id = p.opais_id
LEFT JOIN public.location l ON l.id = p.location_id;

-- =====================================================================
-- v_org_services -- org-level service rollup across the org's sites
-- =====================================================================
CREATE OR REPLACE VIEW public.v_org_services
WITH (security_invoker = true) AS
SELECT
  o.id          AS org_id,
  o.grant_number,
  o.name        AS org_name,
  COALESCE(array_agg(DISTINCT ss.service_id ORDER BY ss.service_id)
    FILTER (WHERE ss.service_id IS NOT NULL), ARRAY[]::integer[]) AS service_ids,
  COALESCE(array_agg(DISTINCT sv.category)
    FILTER (WHERE sv.category IS NOT NULL), ARRAY[]::text[])      AS service_categories
FROM public.organization o
LEFT JOIN public.site s        ON s.org_id = o.id AND s.is_active
LEFT JOIN public.site_service ss ON ss.site_id = s.id
LEFT JOIN public.service sv     ON sv.service_id = ss.service_id
GROUP BY o.id, o.grant_number, o.name;

-- =====================================================================
-- v_resource -- UNIFIED, distance-rankable search surface (sites + pharmacies)
-- Filterable by resource_type, service_category (sites), accepts_sliding_scale.
-- App proximity queries: WHERE geom IS NOT NULL ORDER BY geom <-> :point.
-- =====================================================================
CREATE OR REPLACE VIEW public.v_resource
WITH (security_invoker = true) AS
SELECT
  'site'::text       AS resource_type,
  s.site_id          AS id,
  s.name,
  s.org_name         AS affiliation,
  s.phone,
  s.website,
  s.address_line_1,
  s.city,
  s.state,
  s.zip,
  s.latitude,
  s.longitude,
  s.geom,
  s.geocode_status,
  s.center_type      AS subtype,
  s.accepts_sliding_scale,
  s.has_340b,
  s.service_categories,
  s.is_active
FROM public.v_site s
UNION ALL
SELECT
  'pharmacy'::text   AS resource_type,
  p.pharmacy_uuid    AS id,
  p.name,
  p.covered_entity_name AS affiliation,
  p.phone,
  NULL::text         AS website,
  p.address_line_1,
  p.city,
  p.state,
  p.zip,
  p.latitude,
  p.longitude,
  p.geom,
  p.geocode_status,
  '340B Contract Pharmacy'::text AS subtype,
  NULL::boolean      AS accepts_sliding_scale,
  true               AS has_340b,
  ARRAY[]::text[]    AS service_categories,
  (p.is_active AND p.is_currently_contracted) AS is_active
FROM public.v_contract_pharmacy p;

-- =====================================================================
-- v_data_quality_summary -- monitoring counts
-- =====================================================================
CREATE OR REPLACE VIEW public.v_data_quality_summary
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.organization)                                          AS organizations,
  (SELECT count(*) FROM public.organization WHERE is_active)                          AS organizations_active,
  (SELECT count(*) FROM public.site)                                                  AS sites,
  (SELECT count(*) FROM public.site WHERE is_active)                                  AS sites_active,
  (SELECT count(*) FROM public.covered_entity)                                        AS covered_entities,
  (SELECT count(*) FROM public.covered_entity WHERE org_id IS NOT NULL)               AS covered_entities_linked,
  (SELECT count(*) FROM public.contract_pharmacy)                                     AS contract_pharmacies,
  (SELECT count(*) FROM public.shipping_address)                                      AS shipping_addresses,
  (SELECT count(*) FROM public.location)                                              AS locations,
  (SELECT count(*) FROM public.location WHERE geocode_status = 'ok')                  AS locations_geocoded,
  (SELECT count(*) FROM public.location WHERE geocode_status = 'pending')             AS locations_pending,
  (SELECT count(*) FROM public.location WHERE geocode_status = 'failed')              AS locations_failed,
  (SELECT count(*) FROM public.location WHERE geocode_status = 'needs_review')        AS locations_needs_review,
  (SELECT count(*) FROM public.geocode_queue WHERE status = 'queued')                 AS geocode_jobs_queued,
  (SELECT count(*) FROM public.site_service)                                          AS site_services;
