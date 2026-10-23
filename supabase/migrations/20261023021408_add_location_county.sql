-- MedicBridges v2 schema -- location.county / county_fips
--
-- Mirrors live migration 20261023021408 verbatim. Values were backfilled
-- outside the ETL; the repo copy is in scripts/sql/20261023_fl_org_data.sql.

alter table public.location
  add column if not exists county text,
  add column if not exists county_fips text;
comment on column public.location.county is 'County name from the HRSA service delivery sites file (Complete County Name).';
comment on column public.location.county_fips is '5-digit state+county FIPS code from HRSA.';
create index if not exists location_county_idx on public.location (state, county);
