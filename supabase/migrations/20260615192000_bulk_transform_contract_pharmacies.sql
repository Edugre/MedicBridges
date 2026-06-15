-- Set-based contract pharmacy transform (139k+ in-scope rows; row loop hits statement timeout).

CREATE OR REPLACE FUNCTION public.transform_contract_pharmacies(p_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = staging, public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('statement_timeout', '0', true);

  CREATE TEMP TABLE _pharm_src ON COMMIT DROP AS
  SELECT DISTINCT ON (btrim(p.pharmacy_id))
    btrim(p.pharmacy_id) AS pharmacy_id,
    btrim(p.opais_id) AS opais_id,
    nullif(btrim(p.pharmacy_name), '') AS pharmacy_name,
    public.safe_date(p.contract_begin_date) AS contract_begin_date,
    public.safe_end_date(
      public.safe_date(p.contract_begin_date),
      public.safe_date(p.contract_term_date)
    ) AS contract_term_date,
    nullif(btrim(p.address_line_1), '') AS address_line_1,
    nullif(btrim(p.city), '') AS city,
    public.safe_state(p.state) AS state,
    public.safe_zip(p.zip_code) AS zip,
    nullif(btrim(p.phone_number), '') AS phone,
    cp.location_id AS existing_location_id,
    public.address_match_key(
      nullif(btrim(p.address_line_1), ''),
      public.safe_zip(p.zip_code)
    ) AS addr_key,
    NULL::uuid AS resolved_location_id,
    gen_random_uuid() AS new_location_id
  FROM staging.opais_contract_pharmacy p
  JOIN public.covered_entity ce ON ce.opais_id = btrim(p.opais_id)
  LEFT JOIN public.contract_pharmacy cp ON cp.pharmacy_id = btrim(p.pharmacy_id)
  WHERE btrim(coalesce(p.pharmacy_id, '')) <> ''
    AND btrim(coalesce(p.pharmacy_name, '')) <> ''
  ORDER BY btrim(p.pharmacy_id);

  -- Dedupable addresses: upsert once per address_key.
  INSERT INTO public.location (address_line_1, city, state, zip)
  SELECT DISTINCT ON (ps.addr_key)
    ps.address_line_1, ps.city, ps.state, ps.zip
  FROM _pharm_src ps
  WHERE ps.addr_key IS NOT NULL
  ORDER BY ps.addr_key
  ON CONFLICT (address_key) WHERE address_key IS NOT NULL
  DO UPDATE SET
    city  = COALESCE(location.city, EXCLUDED.city),
    state = COALESCE(location.state, EXCLUDED.state);

  UPDATE _pharm_src ps
    SET resolved_location_id = l.id
  FROM public.location l
  WHERE ps.addr_key IS NOT NULL
    AND l.address_key = ps.addr_key;

  -- Unparseable addresses: reuse existing per-pharmacy location when present.
  UPDATE public.location l
    SET address_line_1 = ps.address_line_1,
        city           = ps.city,
        state          = ps.state,
        zip            = ps.zip
  FROM _pharm_src ps
  WHERE ps.addr_key IS NULL
    AND ps.existing_location_id = l.id;

  UPDATE _pharm_src ps
    SET resolved_location_id = ps.existing_location_id
  WHERE ps.addr_key IS NULL
    AND ps.existing_location_id IS NOT NULL;

  -- Unparseable, first load: one location row per pharmacy (pre-assigned UUID).
  INSERT INTO public.location (id, address_line_1, city, state, zip)
  SELECT ps.new_location_id, ps.address_line_1, ps.city, ps.state, ps.zip
  FROM _pharm_src ps
  WHERE ps.resolved_location_id IS NULL
    AND ps.addr_key IS NULL
    AND NOT (
      ps.address_line_1 IS NULL
      AND ps.city IS NULL
      AND ps.state IS NULL
      AND ps.zip IS NULL
    );

  UPDATE _pharm_src ps
    SET resolved_location_id = ps.new_location_id
  WHERE ps.resolved_location_id IS NULL
    AND ps.addr_key IS NULL
    AND NOT (
      ps.address_line_1 IS NULL
      AND ps.city IS NULL
      AND ps.state IS NULL
      AND ps.zip IS NULL
    );

  INSERT INTO public.contract_pharmacy (
    pharmacy_id, opais_id, location_id, name, phone,
    contract_begin_date, contract_term_date, last_refreshed_at, last_seen_at, is_active
  )
  SELECT
    ps.pharmacy_id, ps.opais_id, ps.resolved_location_id, ps.pharmacy_name, ps.phone,
    ps.contract_begin_date, ps.contract_term_date, p_ts, p_ts, true
  FROM _pharm_src ps
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

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.contract_pharmacy
    SET is_active = false
  WHERE is_active = true
    AND (last_seen_at IS NULL OR last_seen_at < p_ts);

  RETURN v_count;
END;
$$;
