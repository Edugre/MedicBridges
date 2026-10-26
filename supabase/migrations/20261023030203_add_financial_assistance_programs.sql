-- Financial assistance programs (e.g. Jackson Prime, JFAP) and the facilities they apply to.

create table public.assistance_program (
  program_id text primary key,
  organization text not null,
  program_name text not null,
  program_type text not null,
  short_description text,
  eligibility_summary text,
  residency_required text,                    -- e.g. 'miami-dade'; null = not limited in all cases
  residency_rule text,
  income_rule text,
  fpl_max_percent int check (fpl_max_percent is null or fpl_max_percent > 0),
  requires_uninsured boolean,                 -- true = uninsured patients only; null = not stated
  asks_for_status_documentation boolean,      -- applicants are asked to document citizenship/immigration status
  eligibility_rules jsonb not null default '[]'::jsonb,  -- one entry per eligibility path
  discount_tiers_published boolean not null default false,
  documents_summary text,
  application_url text,
  renewal_url text,
  summary_url text,
  required_documents_url text,
  application_form_url text,
  policy_url text,
  policy_revised date,
  last_checked date,
  public_copy text not null,
  caveat text,
  source_basis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.assistance_program is
  'Hospital/system financial assistance programs. Patient-facing copy must say eligibility is decided by the provider; never "free" or "you qualify".';

create table public.assistance_facility (
  facility_id text primary key,
  name text not null,
  category text,
  address text,
  city text,
  state char(2) check (state is null or state ~ '^[A-Z]{2}$'),
  zip text check (zip is null or zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  phone text,
  npi char(10) check (npi is null or npi ~ '^[0-9]{10}$'),
  ccn text check (ccn is null or ccn ~ '^[0-9A-Za-z]{6}$'),
  assistance_mapping_status text not null check (assistance_mapping_status in
    ('policy_explicit','policy_category_supported','needs_review','service_exclusion_review')),
  mapping_basis text,
  needs_review text,
  source_location_url text,
  policy_url text,
  policy_revised date,
  last_checked date,
  site_id uuid references public.site(id),                    -- set when crosswalk matches an HRSA site
  covered_entity_id uuid references public.covered_entity(id), -- set when crosswalk matches a 340B entity
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistance_facility_npi_idx on public.assistance_facility(npi) where npi is not null;
create index assistance_facility_site_idx on public.assistance_facility(site_id) where site_id is not null;
create index assistance_facility_ce_idx on public.assistance_facility(covered_entity_id) where covered_entity_id is not null;

create table public.facility_assistance (
  facility_id text not null references public.assistance_facility(facility_id) on delete cascade,
  program_id text not null references public.assistance_program(program_id) on delete cascade,
  relationship_status text not null default 'candidate_pending_npi_ccn_crosswalk',
  match_basis text,
  publishable boolean not null default false,
  review_note text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (facility_id, program_id)
);
create index facility_assistance_program_idx on public.facility_assistance(program_id);

-- A link can only be published once the facility has an NPI or CCN from the crosswalk.
create or replace function public.enforce_publishable_needs_identifier()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.publishable and not exists (
    select 1 from public.assistance_facility f
    where f.facility_id = new.facility_id and (f.npi is not null or f.ccn is not null)
  ) then
    raise exception 'facility % has no NPI/CCN; cannot publish assistance link', new.facility_id;
  end if;
  return new;
end $$;

create trigger facility_assistance_publishable_guard
  before insert or update of publishable on public.facility_assistance
  for each row execute function public.enforce_publishable_needs_identifier();

-- RLS: programs are public; facilities and links are visible only once a link is published.
alter table public.assistance_program enable row level security;
alter table public.assistance_facility enable row level security;
alter table public.facility_assistance enable row level security;
revoke all on public.assistance_program, public.assistance_facility, public.facility_assistance from anon, authenticated;

create policy public_read on public.assistance_program
  for select to anon, authenticated using (true);
create policy public_read_published on public.facility_assistance
  for select to anon, authenticated using (publishable);
create policy public_read_published on public.assistance_facility
  for select to anon, authenticated using (
    exists (select 1 from public.facility_assistance fa
            where fa.facility_id = assistance_facility.facility_id and fa.publishable)
  );

grant select on public.assistance_program, public.assistance_facility, public.facility_assistance to anon, authenticated;

create view public.v_facility_assistance_public with (security_invoker = true) as
select f.facility_id, f.name as facility_name, f.category, f.address, f.city, f.state, f.zip, f.phone,
       f.npi, f.ccn, f.site_id, f.covered_entity_id,
       p.program_id, p.program_name, p.short_description, p.residency_required, p.fpl_max_percent,
       p.requires_uninsured, p.asks_for_status_documentation, p.eligibility_rules,
       p.discount_tiers_published, p.application_url, p.policy_url, p.policy_revised, p.last_checked,
       p.public_copy, p.caveat
from public.facility_assistance fa
join public.assistance_facility f using (facility_id)
join public.assistance_program p using (program_id)
where fa.publishable;
revoke all on public.v_facility_assistance_public from anon, authenticated;
grant select on public.v_facility_assistance_public to anon, authenticated;
