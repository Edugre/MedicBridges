-- MedicBridges v2 schema -- read access for org-level services
--
-- Same shape as 20260615130500_rls_grants.sql: curated data gets a
-- public_read SELECT policy + SELECT grant; operational tables get RLS with
-- no policy and no privileges.
--
-- Supabase's default privileges gave anon/authenticated ALL (incl. INSERT,
-- UPDATE, DELETE, TRUNCATE) on every table/view created on 2026-10-23. RLS
-- blocks row access but not TRUNCATE, so revoke everything first, then grant
-- back only SELECT where it is intended.

-- ---- org_service: curated, world-readable ----
alter table public.org_service enable row level security;
revoke all on public.org_service from anon, authenticated;
drop policy if exists public_read on public.org_service;
create policy public_read on public.org_service
  for select to anon, authenticated using (true);
grant select on public.org_service to anon, authenticated;

-- ---- v_org_service_combined: view over curated tables (security_invoker) ----
revoke all on public.v_org_service_combined from anon, authenticated;
grant select on public.v_org_service_combined to anon, authenticated;

-- ---- operational, service-role only (RLS on, no anon/authenticated policy) ----
do $$
declare
  t text;
begin
  foreach t in array array['organization_name_backup', 'staging_org_web_finding']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end
$$;
