-- MedicBridges -- add clinic_registration table
--
-- Backing store for the public "Register Your Clinic" form (/clinic-signup).
-- One row per submission; the team reviews it and reaches out. Multi-select
-- answers (services, patients served, languages) are stored as stable,
-- language-independent keys so EN and ES submissions compare equally.
--
-- Same posture as data_quality_report: writes come from the backend service
-- role (bypasses RLS); anon/authenticated get no access. Submissions contain
-- contact PII, so they must never be readable through the public API.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinic_registration_status') THEN
    CREATE TYPE public.clinic_registration_status AS ENUM (
      'new', 'contacted', 'listed', 'rejected'
    );
  END IF;
END
$$;

CREATE TABLE public.clinic_registration (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name        text NOT NULL,
  clinic_type        text NOT NULL,
  zip                text NOT NULL,
  phone              text NOT NULL,
  address            text NOT NULL,
  website            text,
  hours              text NOT NULL,
  description        text,
  contact_name       text NOT NULL,
  contact_role       text NOT NULL,
  contact_email      text NOT NULL,
  contact_phone      text,
  services           text[] NOT NULL DEFAULT '{}',
  patients_served    text[] NOT NULL DEFAULT '{}',
  dispenses_meds     text,
  languages          text[] NOT NULL DEFAULT '{}',
  plan               text NOT NULL DEFAULT 'basic',
  lang               text,
  status             public.clinic_registration_status NOT NULL DEFAULT 'new',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clinic_registration_required_not_blank CHECK (
    length(trim(clinic_name)) > 0 AND length(trim(clinic_type)) > 0
    AND length(trim(zip)) > 0 AND length(trim(phone)) > 0
    AND length(trim(address)) > 0 AND length(trim(hours)) > 0
    AND length(trim(contact_name)) > 0 AND length(trim(contact_role)) > 0
    AND length(trim(contact_email)) > 0
  ),
  CONSTRAINT clinic_registration_plan_valid
    CHECK (plan IN ('basic', 'featured', 'partner'))
);

CREATE TRIGGER clinic_registration_touch_updated_at
  BEFORE UPDATE ON public.clinic_registration
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX clinic_registration_status_idx
  ON public.clinic_registration (status, created_at DESC);

ALTER TABLE public.clinic_registration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_registration FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Teardown reference (manual rollback; migrations are forward-only)
-- ---------------------------------------------------------------------------
--   DROP TABLE IF EXISTS public.clinic_registration;
--   DROP TYPE  IF EXISTS public.clinic_registration_status;
