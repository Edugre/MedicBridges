-- MedicBridges v2 schema -- 06: Row Level Security + grants
--
-- Curated tables + views are world-readable (public health data). Operational
-- tables (etl_run, data_quality_review, geocode_queue) and the staging schema
-- are service-role only.

-- ---- curated, world-readable ----
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'location', 'organization', 'covered_entity', 'site',
    'contract_pharmacy', 'shipping_address', 'service', 'site_service'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (true);', t
    );
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', t);
  END LOOP;
END
$$;

-- ---- operational, service-role only (RLS on, no anon/authenticated policy) ----
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['etl_run', 'data_quality_review', 'geocode_queue']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', t);
  END LOOP;
END
$$;

-- ---- views ----
GRANT SELECT ON public.v_site               TO anon, authenticated;
GRANT SELECT ON public.v_contract_pharmacy  TO anon, authenticated;
GRANT SELECT ON public.v_org_services       TO anon, authenticated;
GRANT SELECT ON public.v_resource           TO anon, authenticated;
GRANT SELECT ON public.v_data_quality_summary TO anon, authenticated;

-- ---- staging schema is never exposed ----
REVOKE ALL ON SCHEMA staging FROM anon, authenticated;
