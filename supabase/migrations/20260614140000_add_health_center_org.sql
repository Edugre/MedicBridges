-- Org-level hub for HRSA health center organizations
CREATE TABLE public.health_center_org (
  org_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_number character varying(50) NOT NULL,
  org_name character varying(255),
  org_state character varying(2),
  org_url text,
  opais_id character varying(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT health_center_org_grant_number_key UNIQUE (grant_number),
  CONSTRAINT health_center_org_opais_id_fkey
    FOREIGN KEY (opais_id) REFERENCES public.ce (opais_id) ON DELETE SET NULL
);

CREATE INDEX health_center_org_opais_id_idx
  ON public.health_center_org (opais_id)
  WHERE opais_id IS NOT NULL;

-- Seed one org per distinct HRSA grant number
INSERT INTO public.health_center_org (grant_number, org_name, org_state, opais_id)
SELECT DISTINCT ON (fs.hcp_merged_grant_lal_key)
  fs.hcp_merged_grant_lal_key,
  COALESCE(ce.entity_name, fs.site_name),
  fs.site_state_abbr,
  COALESCE(ce.opais_id, fs.opais_id)
FROM public.fqhc_site fs
LEFT JOIN public.ce ce ON ce.grant_number = fs.hcp_merged_grant_lal_key
WHERE fs.hcp_merged_grant_lal_key IS NOT NULL
ORDER BY fs.hcp_merged_grant_lal_key, fs.bphc_site_num;

-- Most common site URL per org
WITH url_counts AS (
  SELECT
    fs.hcp_merged_grant_lal_key AS grant_number,
    fs.site_url,
    COUNT(*) AS n,
    ROW_NUMBER() OVER (
      PARTITION BY fs.hcp_merged_grant_lal_key
      ORDER BY COUNT(*) DESC, fs.site_url
    ) AS rn
  FROM public.fqhc_site fs
  WHERE fs.site_url IS NOT NULL AND btrim(fs.site_url) <> ''
  GROUP BY fs.hcp_merged_grant_lal_key, fs.site_url
)
UPDATE public.health_center_org o
SET org_url = uc.site_url
FROM url_counts uc
WHERE o.grant_number = uc.grant_number
  AND uc.rn = 1;

-- Prefer CE entity name when available
UPDATE public.health_center_org o
SET org_name = ce.entity_name,
    updated_at = now()
FROM public.ce ce
WHERE ce.grant_number = o.grant_number
  AND ce.entity_name IS NOT NULL;

-- Link sites to orgs
ALTER TABLE public.fqhc_site
  ADD COLUMN org_id uuid;

UPDATE public.fqhc_site fs
SET org_id = o.org_id
FROM public.health_center_org o
WHERE fs.hcp_merged_grant_lal_key = o.grant_number;

ALTER TABLE public.fqhc_site
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE public.fqhc_site
  ADD CONSTRAINT fqhc_site_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.health_center_org (org_id) ON DELETE RESTRICT;

CREATE INDEX fqhc_site_org_id_idx ON public.fqhc_site (org_id);

-- Remove site-level opais_id (now owned by org)
DROP TRIGGER IF EXISTS fqhc_site_sync_opais_id ON public.fqhc_site;
DROP FUNCTION IF EXISTS public.sync_fqhc_site_opais_id();

ALTER TABLE public.fqhc_site
  DROP CONSTRAINT IF EXISTS fqhc_site_opais_id_fkey;

DROP INDEX IF EXISTS fqhc_site_opais_id_idx;

ALTER TABLE public.fqhc_site
  DROP COLUMN IF EXISTS opais_id;

-- CE changes propagate to org, not individual sites
DROP TRIGGER IF EXISTS ce_sync_fqhc_site_opais_id ON public.ce;
DROP FUNCTION IF EXISTS public.sync_fqhc_sites_from_ce();

CREATE OR REPLACE FUNCTION public.sync_org_from_ce()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE TRIGGER ce_sync_org_from_ce
  AFTER INSERT OR UPDATE OF opais_id, grant_number, entity_name
  ON public.ce
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_from_ce();

-- Resolve org_id when sites are loaded with grant key only
CREATE OR REPLACE FUNCTION public.sync_fqhc_site_org_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.hcp_merged_grant_lal_key IS NOT NULL THEN
    SELECT o.org_id
    INTO NEW.org_id
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

CREATE TRIGGER fqhc_site_sync_org_id
  BEFORE INSERT OR UPDATE OF hcp_merged_grant_lal_key, org_id
  ON public.fqhc_site
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fqhc_site_org_id();
