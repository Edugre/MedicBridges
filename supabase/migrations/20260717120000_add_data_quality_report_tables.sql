-- MedicBridges v2 schema -- add data_quality_report tables
--
-- Backing store for the "Report an issue" flow on the Clinic Detail page:
-- anyone (no account) can report wrong info, a closed/moved site, a duplicate
-- listing, or leave general feedback. A report may carry zero or more per-field
-- corrections (data_quality_report_field), e.g. wrong hours + wrong phone.
--
-- This is a NEW, separate concern from the operational data_quality_review
-- table (internal ETL/QA log) -- that table is intentionally left untouched.
--
-- Native Postgres enum types are created explicitly (same DO $$ guard pattern
-- as geocode_status / match_method in 20260615130000). Writes come from the
-- backend service role, which bypasses RLS; anon/authenticated get no access.

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_category') THEN
    CREATE TYPE public.report_category AS ENUM (
      'wrong_info', 'site_closed', 'site_moved', 'duplicate', 'general_feedback'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_subject_type') THEN
    CREATE TYPE public.report_subject_type AS ENUM (
      'site', 'organization', 'covered_entity', 'contract_pharmacy'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_field') THEN
    CREATE TYPE public.report_field AS ENUM (
      'hours', 'phone', 'address', 'website'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_topic') THEN
    CREATE TYPE public.feedback_topic AS ENUM (
      'accessibility', 'staff_service', 'wait_times', 'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM (
      'new', 'reviewing', 'accepted', 'rejected'
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Parent table: one row per submitted report
-- ---------------------------------------------------------------------------
CREATE TABLE public.data_quality_report (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type          public.report_subject_type NOT NULL,
  subject_key           text                       NOT NULL,
  category              public.report_category     NOT NULL,
  new_address           text,                      -- set only when category = site_moved
  feedback_topic        public.feedback_topic,     -- set only when category = general_feedback
  description           text,
  reporter_name         text,
  reporter_organization text,
  reporter_email        text,
  status                public.report_status NOT NULL DEFAULT 'new',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT data_quality_report_subject_key_not_blank
    CHECK (length(trim(subject_key)) > 0),
  -- A relocation must record where the site moved to.
  CONSTRAINT data_quality_report_moved_has_address
    CHECK (category <> 'site_moved'
           OR (new_address IS NOT NULL AND length(trim(new_address)) > 0)),
  -- General feedback must actually say something.
  CONSTRAINT data_quality_report_feedback_has_description
    CHECK (category <> 'general_feedback'
           OR (description IS NOT NULL AND length(trim(description)) > 0))
);

-- Keep updated_at fresh on every mutation, via the shared trigger function
-- public.touch_updated_at() (defined in 20260615130100_functions.sql and used
-- by location / organization / site).
CREATE TRIGGER data_quality_report_touch_updated_at
  BEFORE UPDATE ON public.data_quality_report
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Child table: per-field corrections attached to a report
-- ---------------------------------------------------------------------------
CREATE TABLE public.data_quality_report_field (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL
                      REFERENCES public.data_quality_report(id) ON DELETE CASCADE,
  field             public.report_field NOT NULL,
  currently_listed  text,
  should_be         text,

  CONSTRAINT data_quality_report_field_unique_field UNIQUE (report_id, field)
);

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX data_quality_report_status_idx
  ON public.data_quality_report (status);
CREATE INDEX data_quality_report_subject_idx
  ON public.data_quality_report (subject_type, subject_key);
CREATE INDEX data_quality_report_field_report_id_idx
  ON public.data_quality_report_field (report_id);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security: enabled, no policies. Same posture as the other
-- operational tables (etl_run, data_quality_review, geocode_queue): the
-- backend writes with the service role (bypasses RLS); anon/authenticated
-- get no direct access.
-- ---------------------------------------------------------------------------
ALTER TABLE public.data_quality_report       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_report_field ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.data_quality_report       FROM anon, authenticated;
REVOKE ALL ON public.data_quality_report_field FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Teardown reference (manual rollback)
-- ---------------------------------------------------------------------------
-- Supabase migrations in this repo are forward-only, so there is no downgrade
-- step. If you need to reverse this migration by hand, run the following in
-- order -- child table, parent table, then the enum types:
--
--   DROP TABLE IF EXISTS public.data_quality_report_field;
--   DROP TABLE IF EXISTS public.data_quality_report;  -- also drops its trigger
--   DROP TYPE  IF EXISTS public.report_status;
--   DROP TYPE  IF EXISTS public.feedback_topic;
--   DROP TYPE  IF EXISTS public.report_field;
--   DROP TYPE  IF EXISTS public.report_subject_type;
--   DROP TYPE  IF EXISTS public.report_category;
