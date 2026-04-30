
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- for gen_random_uuid alternatives if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy text search on clinic names

-- Sanity check — these will appear in container logs on first boot
SELECT 'PostGIS version: ' || PostGIS_Version();
SELECT 'PostgreSQL version: ' || version();
