-- MedicBridges v2 schema -- v_org_service_combined (as first applied)
--
-- Mirrors live migration 20261023020443 verbatim. Superseded by
-- 20261023023816_org_display_name_services_county.sql, which reclassifies
-- UDS-derived site_service rows as level 'org'.

create or replace view public.v_org_service_combined
with (security_invoker = true) as
select o.id as org_id, o.grant_number, sv.service_id, sv.code, 'org'::text as level,
       os.data_source, os.source_url, os.confidence, os.is_verified
from public.org_service os
join public.organization o on o.id = os.org_id
join public.service sv on sv.service_id = os.service_id
union all
select o.id, o.grant_number, sv.service_id, sv.code, 'site'::text,
       min(ss.data_source), min(ss.source_url), max(ss.confidence), bool_or(ss.is_verified)
from public.site_service ss
join public.site s on s.id = ss.site_id and s.is_active
join public.organization o on o.id = s.org_id
join public.service sv on sv.service_id = ss.service_id
group by o.id, o.grant_number, sv.service_id, sv.code;
comment on view public.v_org_service_combined is 'Org-level (org_service) and site-derived (site_service) services per organization. level tells the evidence granularity; do not treat level=org as every-site.';
