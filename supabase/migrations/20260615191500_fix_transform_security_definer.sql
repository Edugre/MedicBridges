-- Restore SECURITY DEFINER on transforms after CREATE OR REPLACE stripped it.

ALTER FUNCTION public.transform_covered_entities(timestamptz, text[]) SECURITY DEFINER;
ALTER FUNCTION public.transform_covered_entities(timestamptz, text[]) SET search_path = staging, public;

ALTER FUNCTION public.transform_contract_pharmacies(timestamptz) SECURITY DEFINER;
ALTER FUNCTION public.transform_contract_pharmacies(timestamptz) SET search_path = staging, public;
