-- MedicBridges v2 schema -- organization.display_name
--
-- Schema half of live migration 20261023021832. The 10 brand names it set
-- are in scripts/sql/20261023_fl_org_data.sql.

alter table public.organization add column if not exists display_name text;
comment on column public.organization.display_name is 'Patient-facing brand name. NULL means use name (HRSA legal grantee name): coalesce(display_name, name).';
