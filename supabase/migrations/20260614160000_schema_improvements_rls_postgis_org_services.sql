-- Schema improvements: RLS, PostGIS, org_services, indexes, address keys

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

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

CREATE OR REPLACE FUNCTION public.sync_point_geom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_address_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'fqhc_site' THEN
    NEW.address_key := public.address_match_key(NEW.site_address, NEW.site_zip_cd);
  ELSIF TG_TABLE_NAME = 'ce' THEN
    NEW.address_key := public.address_match_key(NEW.address_line_1, NEW.zip_code);
  ELSIF TG_TABLE_NAME = 'ce_shipping_address' THEN
    NEW.address_key := public.address_match_key(NEW.address_line_1, NEW.zip_code);
  END IF;
  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.sync_org_from_ce()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.grant_number IS NOT NULL THEN
    UPDATE public.health_center_org
    SET opais_id = NEW.opais_id,
        org_name = COALESCE(NEW.entity_name, org_name),
        updated_at = now()
    WHERE grant_number = NEW.grant_number;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_fqhc_site_org_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.hcp_merged_grant_lal_key IS NOT NULL THEN
    SELECT o.org_id INTO NEW.org_id
    FROM public.health_center_org o
    WHERE o.grant_number = NEW.hcp_merged_grant_lal_key
    LIMIT 1;
  END IF;
  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'fqhc_site row requires org_id or a known hcp_merged_grant_lal_key';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.etl_run (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  rows_affected integer,
  source_file text,
  error_message text
);

ALTER TABLE public.health_center_org
  ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;

ALTER TABLE public.fqhc_site
  ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS address_key text,
  ADD COLUMN IF NOT EXISTS geom extensions.geography(Point, 4326);

ALTER TABLE public.ce
  ADD COLUMN IF NOT EXISTS address_key text,
  ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;

ALTER TABLE public.ce_shipping_address
  ADD COLUMN IF NOT EXISTS address_key text;

ALTER TABLE public.ce_contract_pharmacy
  ADD COLUMN IF NOT EXISTS geom extensions.geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS geocode_source text,
  ADD COLUMN IF NOT EXISTS geocode_status text,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

ALTER TABLE public.ce_contract_pharmacy
  DROP CONSTRAINT IF EXISTS ce_contract_pharmacy_geocode_status_check;

ALTER TABLE public.ce_contract_pharmacy
  ADD CONSTRAINT ce_contract_pharmacy_geocode_status_check
  CHECK (geocode_status IS NULL OR geocode_status IN ('ok', 'failed', 'needs_review'));

CREATE TABLE IF NOT EXISTS public.org_services (
  org_id uuid NOT NULL REFERENCES public.health_center_org (org_id) ON DELETE CASCADE,
  service_id integer NOT NULL REFERENCES public.service_catalog (service_id) ON DELETE CASCADE,
  data_source character varying(100),
  is_verified boolean DEFAULT false,
  source_url text,
  confidence numeric,
  extracted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, service_id)
);

UPDATE public.fqhc_site SET address_key = public.address_match_key(site_address, site_zip_cd) WHERE address_key IS NULL;
UPDATE public.fqhc_site SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
UPDATE public.ce SET address_key = public.address_match_key(address_line_1, zip_code) WHERE address_key IS NULL;
UPDATE public.ce_shipping_address SET address_key = public.address_match_key(address_line_1, zip_code) WHERE address_key IS NULL;
UPDATE public.ce_contract_pharmacy SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
UPDATE public.ce_contract_pharmacy SET geocode_status = CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'ok' ELSE 'needs_review' END, geocode_source = CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'legacy' ELSE NULL END WHERE geocode_status IS NULL;

INSERT INTO public.org_services (org_id, service_id, data_source, is_verified, source_url, confidence, extracted_at)
SELECT DISTINCT ON (fs.org_id, ss.service_id)
  fs.org_id, ss.service_id, ss.data_source, ss.is_verified, ss.source_url, ss.confidence, ss.extracted_at
FROM public.site_services ss
JOIN public.fqhc_site fs ON fs.bphc_site_num = ss.bphc_site_num
WHERE ss.data_source LIKE 'HRSA%'
ORDER BY fs.org_id, ss.service_id, ss.is_verified DESC, ss.extracted_at DESC NULLS LAST
ON CONFLICT (org_id, service_id) DO NOTHING;

DROP TRIGGER IF EXISTS fqhc_site_sync_geom ON public.fqhc_site;
CREATE TRIGGER fqhc_site_sync_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON public.fqhc_site FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();
DROP TRIGGER IF EXISTS fqhc_site_sync_address_key ON public.fqhc_site;
CREATE TRIGGER fqhc_site_sync_address_key BEFORE INSERT OR UPDATE OF site_address, site_zip_cd ON public.fqhc_site FOR EACH ROW EXECUTE FUNCTION public.sync_address_key();
DROP TRIGGER IF EXISTS ce_sync_address_key ON public.ce;
CREATE TRIGGER ce_sync_address_key BEFORE INSERT OR UPDATE OF address_line_1, zip_code ON public.ce FOR EACH ROW EXECUTE FUNCTION public.sync_address_key();
DROP TRIGGER IF EXISTS ce_shipping_address_sync_address_key ON public.ce_shipping_address;
CREATE TRIGGER ce_shipping_address_sync_address_key BEFORE INSERT OR UPDATE OF address_line_1, zip_code ON public.ce_shipping_address FOR EACH ROW EXECUTE FUNCTION public.sync_address_key();
DROP TRIGGER IF EXISTS ce_contract_pharmacy_sync_geom ON public.ce_contract_pharmacy;
CREATE TRIGGER ce_contract_pharmacy_sync_geom BEFORE INSERT OR UPDATE OF latitude, longitude ON public.ce_contract_pharmacy FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();
DROP TRIGGER IF EXISTS health_center_org_touch_updated_at ON public.health_center_org;
CREATE TRIGGER health_center_org_touch_updated_at BEFORE UPDATE ON public.health_center_org FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_fqhc_site_state ON public.fqhc_site (site_state_abbr);
CREATE INDEX IF NOT EXISTS idx_fqhc_site_hcc_typ ON public.fqhc_site (hcc_typ_desc);
CREATE INDEX IF NOT EXISTS idx_fqhc_site_address_key ON public.fqhc_site (address_key) WHERE address_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fqhc_site_geom ON public.fqhc_site USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_health_center_org_state ON public.health_center_org (org_state);
CREATE INDEX IF NOT EXISTS idx_site_services_service_verified ON public.site_services (service_id, is_verified);
CREATE INDEX IF NOT EXISTS idx_ce_address_key ON public.ce (address_key) WHERE address_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_shipping_address_key ON public.ce_shipping_address (address_key) WHERE address_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_contract_pharmacy_geom ON public.ce_contract_pharmacy USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_org_services_service_id ON public.org_services (service_id);
DROP INDEX IF EXISTS public.idx_ce_grant_number;

ALTER TABLE public.health_center_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read ON public.health_center_org;
CREATE POLICY public_read ON public.health_center_org FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.org_services;
CREATE POLICY public_read ON public.org_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.ce;
CREATE POLICY public_read ON public.ce FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.fqhc_site;
CREATE POLICY public_read ON public.fqhc_site FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.site_services;
CREATE POLICY public_read ON public.site_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.service_catalog;
CREATE POLICY public_read ON public.service_catalog FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.ce_contract_pharmacy;
CREATE POLICY public_read ON public.ce_contract_pharmacy FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read ON public.ce_shipping_address;
CREATE POLICY public_read ON public.ce_shipping_address FOR SELECT TO anon, authenticated USING (true);
