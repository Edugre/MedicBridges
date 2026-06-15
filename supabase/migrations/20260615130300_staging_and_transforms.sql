-- MedicBridges v2 schema -- 04: staging landing tables + deterministic transforms
--
-- ETL writes verbatim text rows into staging.*, then calls a transform_*()
-- function which upserts into the curated public.* tables by natural key,
-- links/deduplicates locations, enqueues geocoding, and soft-deactivates rows
-- that disappeared from the latest source export.

-- =====================================================================
-- staging tables (verbatim, all text)
-- =====================================================================
CREATE TABLE IF NOT EXISTS staging.hrsa_site (
  bphc_assigned_number text,
  health_center_number text,
  site_name            text,
  site_address         text,
  site_city            text,
  site_state_abbr      text,
  site_postal_code     text,
  site_phone_num       text,
  site_url             text,
  operating_hours      text,
  site_status_desc     text,
  center_type_desc     text,
  location_type_desc   text,
  location_setting_desc text,
  site_npi             text,
  longitude            text,
  latitude             text,
  loaded_at            timestamptz NOT NULL DEFAULT now(),
  source_file          text,
  run_id               uuid
);

CREATE TABLE IF NOT EXISTS staging.opais_covered_entity (
  opais_id                 text,
  ce_id                    text,
  entity_type              text,
  entity_name              text,
  grant_number             text,
  npi                      text,
  is_participating         text,
  participating_start_date text,
  termination_date         text,
  address_line_1           text,
  city                     text,
  state                    text,
  zip_code                 text,
  hrsa_edit_date           text,
  loaded_at                timestamptz NOT NULL DEFAULT now(),
  source_file              text,
  run_id                   uuid
);

CREATE TABLE IF NOT EXISTS staging.opais_contract_pharmacy (
  pharmacy_id         text,
  opais_id            text,
  pharmacy_name       text,
  contract_begin_date text,
  contract_term_date  text,
  address_line_1      text,
  city                text,
  state               text,
  zip_code            text,
  phone_number        text,
  loaded_at           timestamptz NOT NULL DEFAULT now(),
  source_file         text,
  run_id              uuid
);

CREATE TABLE IF NOT EXISTS staging.opais_shipping_address (
  opais_id              text,
  shipping_organization text,
  address_line_1        text,
  city                  text,
  state                 text,
  zip_code              text,
  loaded_at             timestamptz NOT NULL DEFAULT now(),
  source_file           text,
  run_id                uuid
);

CREATE TABLE IF NOT EXISTS staging.uds_org_service (
  grant_number text,
  service_id   text,
  source_url   text,
  loaded_at    timestamptz NOT NULL DEFAULT now(),
  source_file  text,
  run_id       uuid
);

-- =====================================================================
-- scalar sanitation helpers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.safe_numeric(p text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN btrim(coalesce(p, '')) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(p)::numeric END;
$$;

CREATE OR REPLACE FUNCTION public.safe_date(p text)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p IS NULL OR btrim(p) = '' THEN RETURN NULL; END IF;
  RETURN btrim(p)::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_npi(p text)
RETURNS char(10) LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN regexp_replace(coalesce(p, ''), '\D', '', 'g') ~ '^[0-9]{10}$'
    THEN regexp_replace(p, '\D', '', 'g')::char(10)
  END;
$$;

CREATE OR REPLACE FUNCTION public.safe_state(p text)
RETURNS char(2) LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN upper(btrim(coalesce(p, ''))) ~ '^[A-Z]{2}$' THEN upper(btrim(p))::char(2)
  END;
$$;

CREATE OR REPLACE FUNCTION public.safe_zip(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT substring(btrim(coalesce(p, '')) FROM '^[0-9]{5}');
$$;

CREATE OR REPLACE FUNCTION public.safe_bool(p text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(btrim(coalesce(p, ''))) IN ('yes', 'true', '1', 'y', 't') THEN true
    WHEN lower(btrim(coalesce(p, ''))) IN ('no', 'false', '0', 'n', 'f') THEN false
    ELSE false
  END;
$$;

-- =====================================================================
-- resolve_location -- dedup by address_key, idempotent for unparseable rows
-- =====================================================================
CREATE OR REPLACE FUNCTION public.resolve_location(
  p_addr text, p_city text, p_state text, p_zip text, p_existing uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_addr  text := nullif(btrim(coalesce(p_addr, '')), '');
  v_city  text := nullif(btrim(coalesce(p_city, '')), '');
  v_state char(2) := public.safe_state(p_state);
  v_zip   text := public.safe_zip(p_zip);
  v_key   text;
  v_id    uuid;
BEGIN
  v_key := public.address_match_key(v_addr, v_zip);

  IF v_key IS NOT NULL THEN
    INSERT INTO public.location (address_line_1, city, state, zip)
    VALUES (v_addr, v_city, v_state, v_zip)
    ON CONFLICT (address_key) WHERE address_key IS NOT NULL
    DO UPDATE SET
      city  = COALESCE(location.city, EXCLUDED.city),
      state = COALESCE(location.state, EXCLUDED.state)
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  -- Unparseable address: cannot dedup. Reuse the owner's existing location to
  -- stay idempotent across reloads; otherwise create one (if there is anything
  -- worth storing).
  IF p_existing IS NOT NULL THEN
    UPDATE public.location
      SET address_line_1 = v_addr, city = v_city, state = v_state, zip = v_zip
      WHERE id = p_existing;
    RETURN p_existing;
  END IF;

  IF v_addr IS NULL AND v_city IS NULL AND v_state IS NULL AND v_zip IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.location (address_line_1, city, state, zip)
  VALUES (v_addr, v_city, v_state, v_zip)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- =====================================================================
-- enqueue_pending_geocodes -- queue geocodable, not-yet-resolved locations
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enqueue_pending_geocodes()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.geocode_queue (location_id)
  SELECT l.id
  FROM public.location l
  LEFT JOIN public.geocode_queue q ON q.location_id = l.id
  WHERE l.geocode_status = 'pending'
    AND l.address_line_1 IS NOT NULL
    AND q.id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_organizations -- derive one org per HRSA grant from sites
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_organizations(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH src AS (
    SELECT
      btrim(health_center_number) AS grant_number,
      nullif(btrim(site_name), '')  AS name,
      public.safe_state(site_state_abbr) AS state,
      nullif(btrim(site_url), '')   AS website
    FROM staging.hrsa_site
    WHERE btrim(coalesce(health_center_number, '')) <> ''
      AND site_status_desc = 'Active'
  ),
  agg AS (
    SELECT
      grant_number,
      mode() WITHIN GROUP (ORDER BY name)    AS name,
      mode() WITHIN GROUP (ORDER BY state)   AS state,
      mode() WITHIN GROUP (ORDER BY website) AS website
    FROM src
    GROUP BY grant_number
  )
  INSERT INTO public.organization (grant_number, name, state, website, last_refreshed_at, last_seen_at, is_active)
  SELECT grant_number, name, state, website, p_ts, p_ts, true
  FROM agg
  ON CONFLICT (grant_number) DO UPDATE SET
    name              = COALESCE(EXCLUDED.name, organization.name),
    state             = COALESCE(EXCLUDED.state, organization.state),
    website           = COALESCE(EXCLUDED.website, organization.website),
    last_refreshed_at = EXCLUDED.last_refreshed_at,
    last_seen_at      = EXCLUDED.last_seen_at,
    is_active         = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.organization
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_sites
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_sites(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (btrim(s.bphc_assigned_number))
      btrim(s.bphc_assigned_number) AS site_key,
      o.id AS org_id,
      s.site_name, s.site_address, s.site_city, s.site_state_abbr, s.site_postal_code,
      s.site_phone_num, s.site_url, s.operating_hours, s.site_status_desc,
      s.center_type_desc, s.location_type_desc, s.location_setting_desc, s.site_npi
    FROM staging.hrsa_site s
    JOIN public.organization o ON o.grant_number = btrim(s.health_center_number)
    WHERE s.site_status_desc = 'Active'
      AND btrim(coalesce(s.bphc_assigned_number, '')) <> ''
    ORDER BY btrim(s.bphc_assigned_number)
  LOOP
    SELECT location_id INTO v_existing FROM public.site WHERE bphc_site_num = r.site_key;
    v_loc := public.resolve_location(r.site_address, r.site_city, r.site_state_abbr, r.site_postal_code, v_existing);

    INSERT INTO public.site (
      bphc_site_num, org_id, location_id, name, npi, phone, website,
      operating_hours_per_week, status, center_type, location_type, location_setting,
      last_refreshed_at, last_seen_at, is_active
    )
    VALUES (
      r.site_key, r.org_id, v_loc, nullif(btrim(r.site_name), ''), public.safe_npi(r.site_npi),
      nullif(btrim(r.site_phone_num), ''), nullif(btrim(r.site_url), ''),
      public.safe_numeric(r.operating_hours), nullif(btrim(r.site_status_desc), ''),
      nullif(btrim(r.center_type_desc), ''), nullif(btrim(r.location_type_desc), ''),
      nullif(btrim(r.location_setting_desc), ''), p_ts, p_ts, true
    )
    ON CONFLICT (bphc_site_num) DO UPDATE SET
      org_id                   = EXCLUDED.org_id,
      location_id              = EXCLUDED.location_id,
      name                     = COALESCE(EXCLUDED.name, site.name),
      npi                      = COALESCE(EXCLUDED.npi, site.npi),
      phone                    = EXCLUDED.phone,
      website                  = EXCLUDED.website,
      operating_hours_per_week = EXCLUDED.operating_hours_per_week,
      status                   = EXCLUDED.status,
      center_type              = EXCLUDED.center_type,
      location_type            = EXCLUDED.location_type,
      location_setting         = EXCLUDED.location_setting,
      last_refreshed_at        = EXCLUDED.last_refreshed_at,
      last_seen_at             = EXCLUDED.last_seen_at,
      is_active                = true;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.site
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_covered_entities -- health-center scope only (CH / FQHCLA)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_covered_entities(
  p_ts timestamptz DEFAULT now(),
  p_allowed_types text[] DEFAULT ARRAY['CH', 'FQHCLA']
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (btrim(c.opais_id))
      btrim(c.opais_id) AS opais_id,
      nullif(btrim(c.ce_id), '') AS ce_id,
      btrim(c.entity_type) AS entity_type,
      nullif(btrim(c.entity_name), '') AS entity_name,
      nullif(btrim(c.grant_number), '') AS grant_number,
      c.npi, c.is_participating, c.participating_start_date, c.termination_date,
      c.address_line_1, c.city, c.state, c.zip_code, c.hrsa_edit_date
    FROM staging.opais_covered_entity c
    WHERE btrim(coalesce(c.opais_id, '')) <> ''
      AND btrim(coalesce(c.entity_name, '')) <> ''
      AND btrim(c.entity_type) = ANY (p_allowed_types)
    ORDER BY btrim(c.opais_id)
  LOOP
    SELECT location_id INTO v_existing FROM public.covered_entity WHERE opais_id = r.opais_id;
    v_loc := public.resolve_location(r.address_line_1, r.city, r.state, r.zip_code, v_existing);

    INSERT INTO public.covered_entity (
      opais_id, ce_id, entity_type, name, npi, is_participating,
      participating_start_date, termination_date, location_id, grant_number,
      hrsa_edit_date, last_refreshed_at, last_seen_at, is_active
    )
    VALUES (
      r.opais_id, r.ce_id, r.entity_type, r.entity_name, public.safe_npi(r.npi),
      public.safe_bool(r.is_participating), public.safe_date(r.participating_start_date),
      public.safe_date(r.termination_date), v_loc, r.grant_number,
      public.safe_date(r.hrsa_edit_date), p_ts, p_ts, true
    )
    ON CONFLICT (opais_id) DO UPDATE SET
      ce_id                    = EXCLUDED.ce_id,
      entity_type              = EXCLUDED.entity_type,
      name                     = COALESCE(EXCLUDED.name, covered_entity.name),
      npi                      = COALESCE(EXCLUDED.npi, covered_entity.npi),
      is_participating         = EXCLUDED.is_participating,
      participating_start_date = EXCLUDED.participating_start_date,
      termination_date         = EXCLUDED.termination_date,
      location_id              = EXCLUDED.location_id,
      grant_number             = EXCLUDED.grant_number,
      hrsa_edit_date           = EXCLUDED.hrsa_edit_date,
      last_refreshed_at        = EXCLUDED.last_refreshed_at,
      last_seen_at             = EXCLUDED.last_seen_at,
      is_active                = true;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.covered_entity
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_contract_pharmacies -- in-scope only (FK to covered_entity)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_contract_pharmacies(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (btrim(p.pharmacy_id))
      btrim(p.pharmacy_id) AS pharmacy_id,
      btrim(p.opais_id) AS opais_id,
      nullif(btrim(p.pharmacy_name), '') AS pharmacy_name,
      p.contract_begin_date, p.contract_term_date,
      p.address_line_1, p.city, p.state, p.zip_code, p.phone_number
    FROM staging.opais_contract_pharmacy p
    JOIN public.covered_entity ce ON ce.opais_id = btrim(p.opais_id)
    WHERE btrim(coalesce(p.pharmacy_id, '')) <> ''
      AND btrim(coalesce(p.pharmacy_name, '')) <> ''
    ORDER BY btrim(p.pharmacy_id)
  LOOP
    SELECT location_id INTO v_existing FROM public.contract_pharmacy WHERE pharmacy_id = r.pharmacy_id;
    v_loc := public.resolve_location(r.address_line_1, r.city, r.state, r.zip_code, v_existing);

    INSERT INTO public.contract_pharmacy (
      pharmacy_id, opais_id, location_id, name, phone,
      contract_begin_date, contract_term_date, last_refreshed_at, last_seen_at, is_active
    )
    VALUES (
      r.pharmacy_id, r.opais_id, v_loc, r.pharmacy_name, nullif(btrim(r.phone_number), ''),
      public.safe_date(r.contract_begin_date), public.safe_date(r.contract_term_date),
      p_ts, p_ts, true
    )
    ON CONFLICT (pharmacy_id) DO UPDATE SET
      opais_id            = EXCLUDED.opais_id,
      location_id         = EXCLUDED.location_id,
      name                = COALESCE(EXCLUDED.name, contract_pharmacy.name),
      phone               = EXCLUDED.phone,
      contract_begin_date = EXCLUDED.contract_begin_date,
      contract_term_date  = EXCLUDED.contract_term_date,
      last_refreshed_at   = EXCLUDED.last_refreshed_at,
      last_seen_at        = EXCLUDED.last_seen_at,
      is_active           = true;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.contract_pharmacy
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_shipping_addresses
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_shipping_addresses(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_key text;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT
      btrim(sa.opais_id) AS opais_id,
      nullif(btrim(sa.shipping_organization), '') AS shipping_organization,
      sa.address_line_1, sa.city, sa.state, sa.zip_code,
      md5(lower(btrim(sa.opais_id) || '|' || coalesce(btrim(sa.address_line_1), '') || '|' || coalesce(public.safe_zip(sa.zip_code), ''))) AS dedup_key
    FROM staging.opais_shipping_address sa
    JOIN public.covered_entity ce ON ce.opais_id = btrim(sa.opais_id)
    WHERE btrim(coalesce(sa.address_line_1, '')) <> ''
  LOOP
    SELECT location_id INTO v_existing FROM public.shipping_address WHERE dedup_key = r.dedup_key;
    v_loc := public.resolve_location(r.address_line_1, r.city, r.state, r.zip_code, v_existing);

    INSERT INTO public.shipping_address (
      opais_id, shipping_organization, location_id, dedup_key, last_seen_at, is_active
    )
    VALUES (r.opais_id, r.shipping_organization, v_loc, r.dedup_key, p_ts, true)
    ON CONFLICT (dedup_key) DO UPDATE SET
      shipping_organization = EXCLUDED.shipping_organization,
      location_id           = EXCLUDED.location_id,
      last_seen_at          = EXCLUDED.last_seen_at,
      is_active             = true;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.shipping_address
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;

-- =====================================================================
-- reconcile_covered_entities -- best-available HRSA<->340B match + confidence
-- Priority: grant_number (1.0) -> NPI (0.8) -> address_key (0.6)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reconcile_covered_entities()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- reset before recompute so stale matches do not linger
  UPDATE public.covered_entity
    SET org_id = NULL, match_method = 'none', match_confidence = NULL
  WHERE org_id IS NOT NULL
     OR match_method IS DISTINCT FROM 'none'
     OR match_confidence IS NOT NULL;

  -- 1) exact grant number match
  UPDATE public.covered_entity ce
    SET org_id = o.id, match_method = 'grant', match_confidence = 1.0
  FROM public.organization o
  WHERE ce.org_id IS NULL
    AND ce.grant_number IS NOT NULL
    AND o.grant_number = ce.grant_number;

  -- 2) NPI match (org NPI populated from sites/CE) for the still-unmatched
  UPDATE public.covered_entity ce
    SET org_id = o.id, match_method = 'npi', match_confidence = 0.8
  FROM public.organization o
  WHERE ce.org_id IS NULL
    AND ce.npi IS NOT NULL
    AND o.npi IS NOT NULL
    AND o.npi = ce.npi;

  -- 3) shared physical address (via location.address_key) for what remains
  UPDATE public.covered_entity ce
    SET org_id = sub.org_id, match_method = 'address', match_confidence = 0.6
  FROM (
    SELECT DISTINCT ON (cl.id) cl.id AS ce_loc_id, s.org_id
    FROM public.location cl
    JOIN public.location sl ON sl.address_key = cl.address_key AND cl.address_key IS NOT NULL
    JOIN public.site s ON s.location_id = sl.id
    ORDER BY cl.id, s.org_id
  ) sub
  WHERE ce.org_id IS NULL
    AND ce.location_id = sub.ce_loc_id;

  SELECT count(*) INTO v_count FROM public.covered_entity WHERE org_id IS NOT NULL;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- transform_uds_services -- propagate org-grain UDS services to sites
-- =====================================================================
CREATE OR REPLACE FUNCTION public.transform_uds_services(
  p_ts timestamptz DEFAULT now(),
  p_data_source text DEFAULT 'HRSA UDS 2024 Table 5 (org-level)'
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH src AS (
    SELECT DISTINCT
      btrim(u.grant_number) AS grant_number,
      btrim(u.service_id)::integer AS service_id,
      nullif(btrim(u.source_url), '') AS source_url
    FROM staging.uds_org_service u
    WHERE btrim(coalesce(u.grant_number, '')) <> ''
      AND btrim(coalesce(u.service_id, '')) ~ '^[0-9]+$'
  ),
  expanded AS (
    SELECT s.id AS site_id, src.service_id, src.source_url
    FROM src
    JOIN public.organization o ON o.grant_number = src.grant_number
    JOIN public.site s ON s.org_id = o.id
      AND s.is_active
      AND s.center_type ILIKE '%Service Delivery%'
    JOIN public.service sv ON sv.service_id = src.service_id
  )
  INSERT INTO public.site_service (site_id, service_id, data_source, source_url, is_verified, extracted_at)
  SELECT site_id, service_id, p_data_source, source_url, false, p_ts
  FROM expanded
  ON CONFLICT (site_id, service_id) DO UPDATE SET
    -- keep an independent verification; otherwise refresh provenance
    data_source = CASE WHEN site_service.is_verified THEN site_service.data_source ELSE EXCLUDED.data_source END,
    source_url  = COALESCE(EXCLUDED.source_url, site_service.source_url),
    extracted_at = EXCLUDED.extracted_at;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
