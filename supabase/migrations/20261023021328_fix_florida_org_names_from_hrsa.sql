-- MedicBridges v2 schema -- organization_name_backup (service-role only)
--
-- Schema half of live migration 20261023021328. The live migration also
-- renamed 55 Florida organizations to their HRSA grantee name; that data
-- step lives in scripts/sql/20261023_fl_org_data.sql so schema migrations
-- stay data-free.

create table if not exists public.organization_name_backup (
  org_id uuid primary key references public.organization(id) on delete cascade,
  grant_number text not null,
  old_name text,
  new_name text,
  reason text not null default 'HRSA grantee name (Health Center Name), 2026-10-22',
  changed_at timestamptz not null default now()
);
alter table public.organization_name_backup enable row level security;
