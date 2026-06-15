-- Link FQHC sites to 340B covered entities (many sites -> one CE)
ALTER TABLE public.fqhc_site
  ADD COLUMN IF NOT EXISTS opais_id character varying(50);

UPDATE public.fqhc_site fs
SET opais_id = ce.opais_id
FROM public.ce ce
WHERE fs.hcp_merged_grant_lal_key = ce.grant_number
  AND ce.grant_number IS NOT NULL
  AND fs.opais_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ce_grant_number_unique_idx
  ON public.ce (grant_number)
  WHERE grant_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS fqhc_site_opais_id_idx
  ON public.fqhc_site (opais_id)
  WHERE opais_id IS NOT NULL;

ALTER TABLE public.fqhc_site
  ADD CONSTRAINT fqhc_site_opais_id_fkey
  FOREIGN KEY (opais_id) REFERENCES public.ce (opais_id)
  ON DELETE SET NULL;

ALTER TABLE public.site_services
  ADD CONSTRAINT site_services_bphc_site_num_fkey
  FOREIGN KEY (bphc_site_num) REFERENCES public.fqhc_site (bphc_site_num)
  ON DELETE CASCADE;

-- Keep fqhc_site.opais_id in sync when sites are inserted/updated
CREATE OR REPLACE FUNCTION public.sync_fqhc_site_opais_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.hcp_merged_grant_lal_key IS NOT NULL THEN
    SELECT ce.opais_id
    INTO NEW.opais_id
    FROM public.ce ce
    WHERE ce.grant_number = NEW.hcp_merged_grant_lal_key
    LIMIT 1;
  ELSE
    NEW.opais_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fqhc_site_sync_opais_id ON public.fqhc_site;

CREATE TRIGGER fqhc_site_sync_opais_id
  BEFORE INSERT OR UPDATE OF hcp_merged_grant_lal_key
  ON public.fqhc_site
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fqhc_site_opais_id();

-- Propagate CE changes to linked FQHC sites
CREATE OR REPLACE FUNCTION public.sync_fqhc_sites_from_ce()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.grant_number IS NOT NULL THEN
    UPDATE public.fqhc_site fs
    SET opais_id = NEW.opais_id
    WHERE fs.hcp_merged_grant_lal_key = NEW.grant_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ce_sync_fqhc_site_opais_id ON public.ce;

CREATE TRIGGER ce_sync_fqhc_site_opais_id
  AFTER INSERT OR UPDATE OF opais_id, grant_number
  ON public.ce
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fqhc_sites_from_ce();
