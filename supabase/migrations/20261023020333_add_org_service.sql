-- MedicBridges v2 schema -- org_service: org-level service evidence
--
-- Mirrors live migration 20261023020333, with IF NOT EXISTS guards.
-- data_source values in use: 'website_crawl' | 'website_manual' (no CHECK
-- constraint in live; none added here so the repo matches the database).
-- Rows: scripts/sql/20261023_fl_org_data.sql. Read grants: 20261023023734.

create table if not exists public.org_service (
  org_id        uuid    not null references public.organization(id) on delete cascade,
  service_id    integer not null references public.service(service_id),
  data_source   text    not null,
  source_url    text    not null,
  confidence    numeric not null check (confidence >= 0 and confidence <= 1),
  is_verified   boolean not null default false,
  extracted_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  primary key (org_id, service_id, data_source)
);
comment on table public.org_service is 'Services an organization offers somewhere in its network (org-level evidence, e.g. website pages). Not a claim that every site offers the service.';
create index if not exists org_service_service_idx on public.org_service (service_id);
alter table public.org_service enable row level security;
