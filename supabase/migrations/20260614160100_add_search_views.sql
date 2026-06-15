CREATE OR REPLACE VIEW public.site_search_v
WITH (security_invoker = true)
AS
SELECT
  fs.bphc_site_num,
  fs.site_name,
  fs.site_address,
  fs.site_city,
  fs.site_state_abbr,
  fs.site_zip_cd,
  fs.site_phone_num,
  fs.site_url,
  fs.latitude,
  fs.longitude,
  fs.geom,
  fs.address_key,
  fs.hcc_typ_desc,
  fs.hcc_loc_setting_desc,
  fs.tot_oper_hr_per_week,
  fs.accepts_sliding_scale,
  fs.fqhc_site_npi_num,
  fs.last_refreshed_at,
  o.org_id,
  o.grant_number,
  o.org_name,
  o.org_url,
  o.org_state,
  o.opais_id,
  (o.opais_id IS NOT NULL) AS has_340b,
  COALESCE(svc.service_ids, ARRAY[]::integer[]) AS service_ids,
  COALESCE(svc.verified_service_ids, ARRAY[]::integer[]) AS verified_service_ids,
  COALESCE(svc.service_count, 0) AS service_count
FROM public.fqhc_site fs
JOIN public.health_center_org o ON o.org_id = fs.org_id
LEFT JOIN LATERAL (
  SELECT
    array_agg(DISTINCT ss.service_id ORDER BY ss.service_id) AS service_ids,
    array_agg(DISTINCT ss.service_id ORDER BY ss.service_id)
      FILTER (WHERE ss.is_verified) AS verified_service_ids,
    COUNT(DISTINCT ss.service_id) AS service_count
  FROM public.site_services ss
  WHERE ss.bphc_site_num = fs.bphc_site_num
) svc ON true;

CREATE OR REPLACE VIEW public.org_summary_v
WITH (security_invoker = true)
AS
SELECT
  o.org_id,
  o.grant_number,
  o.org_name,
  o.org_state,
  o.org_url,
  o.opais_id,
  (o.opais_id IS NOT NULL) AS has_340b,
  o.last_refreshed_at,
  COUNT(fs.bphc_site_num) AS site_count,
  COUNT(fs.bphc_site_num) FILTER (
    WHERE fs.hcc_typ_desc LIKE '%Service Delivery%'
  ) AS service_delivery_site_count,
  COALESCE(array_agg(DISTINCT fs.site_state_abbr ORDER BY fs.site_state_abbr)
    FILTER (WHERE fs.site_state_abbr IS NOT NULL), ARRAY[]::varchar[]) AS site_states,
  COALESCE(os.org_service_ids, ARRAY[]::integer[]) AS org_service_ids,
  COALESCE(os.verified_org_service_ids, ARRAY[]::integer[]) AS verified_org_service_ids
FROM public.health_center_org o
LEFT JOIN public.fqhc_site fs ON fs.org_id = o.org_id
LEFT JOIN LATERAL (
  SELECT
    array_agg(osr.service_id ORDER BY osr.service_id) AS org_service_ids,
    array_agg(osr.service_id ORDER BY osr.service_id)
      FILTER (WHERE osr.is_verified) AS verified_org_service_ids
  FROM public.org_services osr
  WHERE osr.org_id = o.org_id
) os ON true
GROUP BY
  o.org_id,
  o.grant_number,
  o.org_name,
  o.org_state,
  o.org_url,
  o.opais_id,
  o.last_refreshed_at,
  os.org_service_ids,
  os.verified_org_service_ids;

GRANT SELECT ON public.site_search_v TO anon, authenticated;
GRANT SELECT ON public.org_summary_v TO anon, authenticated;
