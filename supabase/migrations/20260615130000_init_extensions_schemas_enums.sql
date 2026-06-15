-- MedicBridges v2 schema -- 01: extensions, schemas, enums
--
-- Clean from-scratch rebuild. Two schemas:
--   staging : verbatim landing tables, one per source (text columns). Not exposed.
--   public  : curated, constrained, the only layer the app/PostgREST reads.

CREATE SCHEMA IF NOT EXISTS staging;

-- PostGIS lives in its own schema (Supabase convention).
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Geocoding lifecycle. A coordinate is NEVER used as a flag: a failure is
-- geocode_status = 'failed' with NULL latitude/longitude.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geocode_status') THEN
    CREATE TYPE public.geocode_status AS ENUM ('pending', 'ok', 'failed', 'needs_review');
  END IF;
END
$$;

-- How a covered_entity (340B world) was reconciled to an organization (HRSA world).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_method') THEN
    CREATE TYPE public.match_method AS ENUM ('grant', 'npi', 'address', 'none');
  END IF;
END
$$;

-- Status of a queued geocoding job.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geocode_job_status') THEN
    CREATE TYPE public.geocode_job_status AS ENUM ('queued', 'in_progress', 'done', 'failed');
  END IF;
END
$$;
