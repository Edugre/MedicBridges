-- MedicBridges v2 schema -- 08: staging load RPCs + function security
--
-- The staging schema is never exposed via PostgREST, so ETL loads it through
-- SECURITY DEFINER RPCs that accept a JSONB batch. Reset truncates a staging
-- table before a fresh run; each stage_*() appends a batch.

CREATE OR REPLACE FUNCTION public.reset_staging(p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
BEGIN
  IF p_table NOT IN (
    'hrsa_site', 'opais_covered_entity', 'opais_contract_pharmacy',
    'opais_shipping_address', 'uds_org_service'
  ) THEN
    RAISE EXCEPTION 'Unknown staging table: %', p_table;
  END IF;
  EXECUTE format('TRUNCATE staging.%I;', p_table);
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_hrsa_site(p_rows jsonb, p_source text DEFAULT NULL, p_run uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO staging.hrsa_site (
    bphc_assigned_number, health_center_number, site_name, site_address, site_city,
    site_state_abbr, site_postal_code, site_phone_num, site_url, operating_hours,
    site_status_desc, center_type_desc, location_type_desc, location_setting_desc,
    site_npi, longitude, latitude, source_file, run_id
  )
  SELECT
    bphc_assigned_number, health_center_number, site_name, site_address, site_city,
    site_state_abbr, site_postal_code, site_phone_num, site_url, operating_hours,
    site_status_desc, center_type_desc, location_type_desc, location_setting_desc,
    site_npi, longitude, latitude, p_source, p_run
  FROM jsonb_to_recordset(p_rows) AS x(
    bphc_assigned_number text, health_center_number text, site_name text, site_address text,
    site_city text, site_state_abbr text, site_postal_code text, site_phone_num text,
    site_url text, operating_hours text, site_status_desc text, center_type_desc text,
    location_type_desc text, location_setting_desc text, site_npi text, longitude text, latitude text
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_opais_covered_entity(p_rows jsonb, p_source text DEFAULT NULL, p_run uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO staging.opais_covered_entity (
    opais_id, ce_id, entity_type, entity_name, grant_number, npi, is_participating,
    participating_start_date, termination_date, address_line_1, city, state, zip_code,
    hrsa_edit_date, source_file, run_id
  )
  SELECT
    opais_id, ce_id, entity_type, entity_name, grant_number, npi, is_participating,
    participating_start_date, termination_date, address_line_1, city, state, zip_code,
    hrsa_edit_date, p_source, p_run
  FROM jsonb_to_recordset(p_rows) AS x(
    opais_id text, ce_id text, entity_type text, entity_name text, grant_number text,
    npi text, is_participating text, participating_start_date text, termination_date text,
    address_line_1 text, city text, state text, zip_code text, hrsa_edit_date text
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_opais_contract_pharmacy(p_rows jsonb, p_source text DEFAULT NULL, p_run uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO staging.opais_contract_pharmacy (
    pharmacy_id, opais_id, pharmacy_name, contract_begin_date, contract_term_date,
    address_line_1, city, state, zip_code, phone_number, source_file, run_id
  )
  SELECT
    pharmacy_id, opais_id, pharmacy_name, contract_begin_date, contract_term_date,
    address_line_1, city, state, zip_code, phone_number, p_source, p_run
  FROM jsonb_to_recordset(p_rows) AS x(
    pharmacy_id text, opais_id text, pharmacy_name text, contract_begin_date text,
    contract_term_date text, address_line_1 text, city text, state text, zip_code text, phone_number text
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_opais_shipping_address(p_rows jsonb, p_source text DEFAULT NULL, p_run uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO staging.opais_shipping_address (
    opais_id, shipping_organization, address_line_1, city, state, zip_code, source_file, run_id
  )
  SELECT
    opais_id, shipping_organization, address_line_1, city, state, zip_code, p_source, p_run
  FROM jsonb_to_recordset(p_rows) AS x(
    opais_id text, shipping_organization text, address_line_1 text, city text, state text, zip_code text
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_uds_org_service(p_rows jsonb, p_source text DEFAULT NULL, p_run uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO staging.uds_org_service (grant_number, service_id, source_url, source_file, run_id)
  SELECT grant_number, service_id, source_url, p_source, p_run
  FROM jsonb_to_recordset(p_rows) AS x(grant_number text, service_id text, source_url text);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- =====================================================================
-- function security: mutating RPCs are service-role only
-- (transforms are also SECURITY DEFINER so they can read/write staging)
-- =====================================================================
ALTER FUNCTION public.resolve_location(text, text, text, text, uuid) SECURITY DEFINER;
ALTER FUNCTION public.enqueue_pending_geocodes() SECURITY DEFINER;
ALTER FUNCTION public.transform_organizations(timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.transform_sites(timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.transform_covered_entities(timestamptz, text[]) SECURITY DEFINER;
ALTER FUNCTION public.transform_contract_pharmacies(timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.transform_shipping_addresses(timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.transform_uds_services(timestamptz, text) SECURITY DEFINER;
ALTER FUNCTION public.reconcile_covered_entities() SECURITY DEFINER;

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'reset_staging(text)',
    'stage_hrsa_site(jsonb, text, uuid)',
    'stage_opais_covered_entity(jsonb, text, uuid)',
    'stage_opais_contract_pharmacy(jsonb, text, uuid)',
    'stage_opais_shipping_address(jsonb, text, uuid)',
    'stage_uds_org_service(jsonb, text, uuid)',
    'resolve_location(text, text, text, text, uuid)',
    'enqueue_pending_geocodes()',
    'transform_organizations(timestamptz)',
    'transform_sites(timestamptz)',
    'transform_covered_entities(timestamptz, text[])',
    'transform_contract_pharmacies(timestamptz)',
    'transform_shipping_addresses(timestamptz)',
    'transform_uds_services(timestamptz, text)',
    'reconcile_covered_entities()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC;', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon, authenticated;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role;', fn);
  END LOOP;
END
$$;
