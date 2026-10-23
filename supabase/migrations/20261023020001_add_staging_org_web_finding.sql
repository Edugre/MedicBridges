-- MedicBridges v2 schema -- crawler review queue (service-role only)
--
-- Mirrors live migration 20261023020001 (applied outside the repo), with
-- IF NOT EXISTS guards added so it is safe to re-run. Not an API surface:
-- RLS on, no policies; anon/authenticated privileges revoked in
-- 20261023023734_expose_org_service_read.sql.

create table if not exists public.staging_org_web_finding (
  id            uuid primary key default gen_random_uuid(),
  grant_number  text        not null,
  website       text,
  source_url    text        not null,
  finding_type  text        not null,
  code          text,
  value         text        not null,
  evidence      text,
  confidence    text        not null,
  retrieved_at  timestamptz not null default now(),
  review_status text        not null default 'pending',
  reviewed_at   timestamptz,
  reviewed_by   text,
  created_at    timestamptz not null default now(),
  constraint staging_finding_type_chk
    check (finding_type in ('service','sliding_fee_tier','price_point','pharmacy','org_name','crawl_status')),
  constraint staging_finding_confidence_chk
    check (confidence in ('page','mention','llm_verified','n/a')),
  constraint staging_finding_review_chk
    check (review_status in ('pending','accepted','rejected')),
  constraint staging_finding_unique
    unique (grant_number, source_url, finding_type, value)
);

create index if not exists staging_finding_grant_idx  on public.staging_org_web_finding (grant_number);
create index if not exists staging_finding_review_idx on public.staging_org_web_finding (review_status);

alter table public.staging_org_web_finding enable row level security;
