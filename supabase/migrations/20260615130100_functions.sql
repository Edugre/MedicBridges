-- MedicBridges v2 schema -- 02: shared helper functions (triggers + transforms reuse these)

-- Deterministic physical-address key: 'street_number:zip5'. Mirrors scripts/address.py
-- exactly so Python and Postgres agree. NULL when unparseable -> such rows get their
-- own (non-deduplicated) location.
CREATE OR REPLACE FUNCTION public.address_match_key(address text, zip_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN address IS NULL OR zip_code IS NULL OR length(btrim(zip_code)) < 5 THEN NULL
    WHEN (regexp_match(
      lower(regexp_replace(address, '[^a-z0-9 ]', ' ', 'g')),
      '^\s*(\d+)\s'
    )) IS NULL THEN NULL
    ELSE (regexp_match(
      lower(regexp_replace(address, '[^a-z0-9 ]', ' ', 'g')),
      '^\s*(\d+)\s'
    ))[1] || ':' || left(btrim(zip_code), 5)
  END;
$$;

-- Maintain geom from latitude/longitude on the location table.
CREATE OR REPLACE FUNCTION public.sync_point_geom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Maintain address_key on the location table.
CREATE OR REPLACE FUNCTION public.sync_address_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.address_key := public.address_match_key(NEW.address_line_1, NEW.zip);
  RETURN NEW;
END;
$$;

-- Generic updated_at touch.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
