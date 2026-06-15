-- Sanitize inverted date ranges from messy OPAIS exports.
-- When end < start, keep start and NULL the end date rather than failing ingestion.

CREATE OR REPLACE FUNCTION public.safe_end_date(p_start date, p_end date)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_end IS NULL THEN NULL
    WHEN p_start IS NOT NULL AND p_end < p_start THEN NULL
    ELSE p_end
  END;
$$;

CREATE OR REPLACE FUNCTION public.transform_covered_entities(
  p_ts timestamptz DEFAULT now(),
  p_allowed_types text[] DEFAULT ARRAY['CH', 'FQHCLA']
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_start date;
  v_end date;
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
    v_start := public.safe_date(r.participating_start_date);
    v_end := public.safe_end_date(v_start, public.safe_date(r.termination_date));

    INSERT INTO public.covered_entity (
      opais_id, ce_id, entity_type, name, npi, is_participating,
      participating_start_date, termination_date, location_id, grant_number,
      hrsa_edit_date, last_refreshed_at, last_seen_at, is_active
    )
    VALUES (
      r.opais_id, r.ce_id, r.entity_type, r.entity_name, public.safe_npi(r.npi),
      public.safe_bool(r.is_participating), v_start, v_end, v_loc, r.grant_number,
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

CREATE OR REPLACE FUNCTION public.transform_contract_pharmacies(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE
  r RECORD;
  v_existing uuid;
  v_loc uuid;
  v_begin date;
  v_term date;
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
    v_begin := public.safe_date(r.contract_begin_date);
    v_term := public.safe_end_date(v_begin, public.safe_date(r.contract_term_date));

    INSERT INTO public.contract_pharmacy (
      pharmacy_id, opais_id, location_id, name, phone,
      contract_begin_date, contract_term_date, last_refreshed_at, last_seen_at, is_active
    )
    VALUES (
      r.pharmacy_id, r.opais_id, v_loc, r.pharmacy_name, nullif(btrim(r.phone_number), ''),
      v_begin, v_term, p_ts, p_ts, true
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
