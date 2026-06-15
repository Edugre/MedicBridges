-- pg_safeupdate (enabled on Supabase) rejects UPDATE without WHERE.
-- Reset only rows that carry a prior match before recomputing.

CREATE OR REPLACE FUNCTION public.reconcile_covered_entities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.covered_entity
    SET org_id = NULL, match_method = 'none', match_confidence = NULL
  WHERE org_id IS NOT NULL
     OR match_method IS DISTINCT FROM 'none'
     OR match_confidence IS NOT NULL;

  UPDATE public.covered_entity ce
    SET org_id = o.id, match_method = 'grant', match_confidence = 1.0
  FROM public.organization o
  WHERE ce.org_id IS NULL
    AND ce.grant_number IS NOT NULL
    AND o.grant_number = ce.grant_number;

  UPDATE public.covered_entity ce
    SET org_id = o.id, match_method = 'npi', match_confidence = 0.8
  FROM public.organization o
  WHERE ce.org_id IS NULL
    AND ce.npi IS NOT NULL
    AND o.npi IS NOT NULL
    AND o.npi = ce.npi;

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
