-- MedicBridges v2 schema -- 03: curated public tables, constraints, triggers, indexes

-- =====================================================================
-- location -- shared addresses + geocoding (the central dedup table)
-- =====================================================================
CREATE TABLE public.location (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_line_1  text,
  city            text,
  state           char(2),
  zip             text,
  address_key     text,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  geom            extensions.geography(Point, 4326),
  geocode_status  public.geocode_status NOT NULL DEFAULT 'pending',
  geocode_source  text,
  geocoded_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_state_format CHECK (state IS NULL OR state ~ '^[A-Z]{2}$'),
  CONSTRAINT location_zip_format   CHECK (zip IS NULL OR zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  CONSTRAINT location_lat_range    CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  CONSTRAINT location_lon_range    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT location_no_null_island CHECK (NOT (latitude = 0 AND longitude = 0)),
  -- coordinates are present together or not at all
  CONSTRAINT location_coords_paired CHECK ((latitude IS NULL) = (longitude IS NULL)),
  -- a successful geocode must have coordinates; a non-success must not
  CONSTRAINT location_status_coords CHECK (
    (geocode_status = 'ok' AND latitude IS NOT NULL)
    OR (geocode_status <> 'ok' AND latitude IS NULL)
  )
);

-- one physical address (parseable key) is stored + geocoded exactly once
CREATE UNIQUE INDEX location_address_key_uniq ON public.location (address_key) WHERE address_key IS NOT NULL;
CREATE INDEX location_geom_gix     ON public.location USING GIST (geom);
CREATE INDEX location_state_idx    ON public.location (state);
CREATE INDEX location_geocode_status_idx ON public.location (geocode_status);

CREATE TRIGGER location_sync_address_key
  BEFORE INSERT OR UPDATE OF address_line_1, zip ON public.location
  FOR EACH ROW EXECUTE FUNCTION public.sync_address_key();
CREATE TRIGGER location_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.location
  FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();
CREATE TRIGGER location_touch_updated_at
  BEFORE UPDATE ON public.location
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- organization -- HRSA grantee (Health Center Number)
-- =====================================================================
CREATE TABLE public.organization (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_number      text NOT NULL UNIQUE,
  name              text,
  state             char(2),
  website           text,
  npi               char(10),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz,
  last_seen_at      timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  CONSTRAINT organization_npi_format CHECK (npi IS NULL OR npi ~ '^[0-9]{10}$'),
  CONSTRAINT organization_state_format CHECK (state IS NULL OR state ~ '^[A-Z]{2}$')
);

CREATE INDEX organization_state_idx ON public.organization (state);
CREATE INDEX organization_active_idx ON public.organization (is_active);

CREATE TRIGGER organization_touch_updated_at
  BEFORE UPDATE ON public.organization
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- covered_entity -- OPAIS 340B entity (health-center scope: CH / FQHCLA)
-- =====================================================================
CREATE TABLE public.covered_entity (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opais_id                 text NOT NULL UNIQUE,            -- 340B ID, FK target for pharmacies/shipping
  ce_id                    text,
  entity_type              text NOT NULL,
  name                     text NOT NULL,
  npi                      char(10),
  is_participating         boolean NOT NULL DEFAULT true,
  participating_start_date date,
  termination_date         date,
  location_id              uuid REFERENCES public.location (id) ON DELETE SET NULL,
  -- reconciliation to the HRSA world (may not exist -> soft, nullable link)
  org_id                   uuid REFERENCES public.organization (id) ON DELETE SET NULL,
  grant_number             text,
  match_method             public.match_method NOT NULL DEFAULT 'none',
  match_confidence         numeric,
  hrsa_edit_date           date,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at        timestamptz,
  last_seen_at             timestamptz,
  is_active                boolean NOT NULL DEFAULT true,
  CONSTRAINT covered_entity_npi_format CHECK (npi IS NULL OR npi ~ '^[0-9]{10}$'),
  CONSTRAINT covered_entity_dates CHECK (
    termination_date IS NULL OR participating_start_date IS NULL
    OR termination_date >= participating_start_date
  ),
  CONSTRAINT covered_entity_confidence_range CHECK (
    match_confidence IS NULL OR match_confidence BETWEEN 0 AND 1
  )
);

CREATE INDEX covered_entity_org_id_idx      ON public.covered_entity (org_id);
CREATE INDEX covered_entity_location_id_idx ON public.covered_entity (location_id);
CREATE INDEX covered_entity_grant_idx       ON public.covered_entity (grant_number) WHERE grant_number IS NOT NULL;
CREATE INDEX covered_entity_active_idx      ON public.covered_entity (is_active);

CREATE TRIGGER covered_entity_touch_updated_at
  BEFORE UPDATE ON public.covered_entity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- site -- HRSA service-delivery site (the user-facing "place")
-- =====================================================================
CREATE TABLE public.site (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bphc_site_num            text NOT NULL UNIQUE,
  org_id                   uuid NOT NULL REFERENCES public.organization (id) ON DELETE RESTRICT,
  location_id              uuid REFERENCES public.location (id) ON DELETE SET NULL,
  name                     text NOT NULL,
  npi                      char(10),
  phone                    text,
  website                  text,
  operating_hours_per_week numeric,
  status                   text,
  center_type              text,
  location_type            text,
  location_setting         text,
  accepts_sliding_scale    boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at        timestamptz,
  last_seen_at             timestamptz,
  is_active                boolean NOT NULL DEFAULT true,
  CONSTRAINT site_npi_format CHECK (npi IS NULL OR npi ~ '^[0-9]{10}$')
);

CREATE INDEX site_org_id_idx       ON public.site (org_id);
CREATE INDEX site_location_id_idx  ON public.site (location_id);
CREATE INDEX site_center_type_idx  ON public.site (center_type);
CREATE INDEX site_sliding_idx      ON public.site (accepts_sliding_scale);
CREATE INDEX site_active_idx       ON public.site (is_active);

CREATE TRIGGER site_touch_updated_at
  BEFORE UPDATE ON public.site
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- contract_pharmacy -- 340B contract pharmacies (in-scope only -> hard FK)
-- =====================================================================
CREATE TABLE public.contract_pharmacy (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id         text NOT NULL UNIQUE,
  opais_id            text NOT NULL REFERENCES public.covered_entity (opais_id) ON DELETE CASCADE,
  location_id         uuid REFERENCES public.location (id) ON DELETE SET NULL,
  name                text NOT NULL,
  phone               text,
  contract_begin_date date,
  contract_term_date  date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at   timestamptz,
  last_seen_at        timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  CONSTRAINT contract_pharmacy_dates CHECK (
    contract_term_date IS NULL OR contract_begin_date IS NULL
    OR contract_term_date >= contract_begin_date
  )
);

CREATE INDEX contract_pharmacy_opais_idx    ON public.contract_pharmacy (opais_id);
CREATE INDEX contract_pharmacy_location_idx ON public.contract_pharmacy (location_id);
CREATE INDEX contract_pharmacy_active_idx   ON public.contract_pharmacy (is_active);

CREATE TRIGGER contract_pharmacy_touch_updated_at
  BEFORE UPDATE ON public.contract_pharmacy
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- shipping_address -- 340B shipping destinations for covered entities
-- =====================================================================
CREATE TABLE public.shipping_address (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opais_id             text NOT NULL REFERENCES public.covered_entity (opais_id) ON DELETE CASCADE,
  shipping_organization text,
  location_id          uuid REFERENCES public.location (id) ON DELETE SET NULL,
  -- deterministic natural key (opais + raw address) so reloads upsert in place
  dedup_key            text NOT NULL UNIQUE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at         timestamptz,
  is_active            boolean NOT NULL DEFAULT true
);

CREATE INDEX shipping_address_opais_idx    ON public.shipping_address (opais_id);
CREATE INDEX shipping_address_location_idx ON public.shipping_address (location_id);

CREATE TRIGGER shipping_address_touch_updated_at
  BEFORE UPDATE ON public.shipping_address
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- service -- catalog with a built-in category taxonomy
-- (integer PK preserved so existing ETL service-id maps stay valid)
-- =====================================================================
CREATE TABLE public.service (
  service_id  integer PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  code        text,
  description text,
  category    text NOT NULL
);

CREATE INDEX service_category_idx ON public.service (category);

-- =====================================================================
-- site_service -- canonical service grain (care is delivered at sites)
-- =====================================================================
CREATE TABLE public.site_service (
  site_id      uuid    NOT NULL REFERENCES public.site (id) ON DELETE CASCADE,
  service_id   integer NOT NULL REFERENCES public.service (service_id) ON DELETE CASCADE,
  data_source  text,
  source_url   text,
  confidence   numeric,
  is_verified  boolean NOT NULL DEFAULT false,
  extracted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, service_id)
);

CREATE INDEX site_service_service_idx ON public.site_service (service_id);
CREATE INDEX site_service_verified_idx ON public.site_service (service_id, is_verified);

-- =====================================================================
-- geocode_queue -- OSM (Nominatim) rate-limit management
-- =====================================================================
CREATE TABLE public.geocode_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL UNIQUE REFERENCES public.location (id) ON DELETE CASCADE,
  status          public.geocode_job_status NOT NULL DEFAULT 'queued',
  attempts        integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX geocode_queue_due_idx ON public.geocode_queue (status, next_attempt_at);

CREATE TRIGGER geocode_queue_touch_updated_at
  BEFORE UPDATE ON public.geocode_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- operational tables
-- =====================================================================
CREATE TABLE public.etl_run (
  run_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  rows_affected integer,
  source_file   text,
  error_message text
);

CREATE INDEX etl_run_pipeline_idx ON public.etl_run (pipeline_name, started_at DESC);

CREATE TABLE public.data_quality_review (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text,
  record_key  text,
  issue       text,
  action      text,
  old_value   text,
  new_value   text,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
