-- CRM Pipeline database foundation for Chatwoot.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- CRM pipeline stages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  slug varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#6B7280',
  position integer NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  rotting_enabled boolean NOT NULL DEFAULT false,
  rotting_after_minutes integer,
  fleet_status_trigger varchar(20),
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_pipeline_stages_account_id'
      AND conrelid = 'public.crm_pipeline_stages'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stages
      ADD CONSTRAINT fk_crm_pipeline_stages_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_crm_pipeline_stages_account_slug'
      AND conrelid = 'public.crm_pipeline_stages'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stages
      ADD CONSTRAINT uq_crm_pipeline_stages_account_slug
      UNIQUE (account_id, slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_crm_pipeline_stages_account_position'
      AND conrelid = 'public.crm_pipeline_stages'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stages
      ADD CONSTRAINT uq_crm_pipeline_stages_account_position
      UNIQUE (account_id, position);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_account_id
  ON public.crm_pipeline_stages (account_id);

-- ---------------------------------------------------------------------------
-- CRM deals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  stage_id bigint NOT NULL,
  contact_id integer,
  conversation_id integer,
  assigned_to integer,
  title varchar(255) NOT NULL,
  booking_id varchar(100),
  fleet_sync_status varchar(20) NOT NULL DEFAULT 'none',
  car_model varchar(100),
  client_phone varchar(50),
  rental_start timestamp,
  rental_end timestamp,
  amount decimal(10,2),
  debt_amount decimal(10,2),
  custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  rotting_since timestamp,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS custom_attributes jsonb;

UPDATE public.crm_deals
  SET custom_attributes = '{}'::jsonb
  WHERE custom_attributes IS NULL;

ALTER TABLE public.crm_deals
  ALTER COLUMN custom_attributes SET DEFAULT '{}'::jsonb,
  ALTER COLUMN custom_attributes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deals_account_id'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT fk_crm_deals_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deals_stage_id'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT fk_crm_deals_stage_id
      FOREIGN KEY (stage_id)
      REFERENCES public.crm_pipeline_stages(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deals_contact_id'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT fk_crm_deals_contact_id
      FOREIGN KEY (contact_id)
      REFERENCES public.contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deals_conversation_id'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT fk_crm_deals_conversation_id
      FOREIGN KEY (conversation_id)
      REFERENCES public.conversations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deals_assigned_to'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT fk_crm_deals_assigned_to
      FOREIGN KEY (assigned_to)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_crm_deals_fleet_sync_status'
      AND conrelid = 'public.crm_deals'::regclass
  ) THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT chk_crm_deals_fleet_sync_status
      CHECK (fleet_sync_status IN ('none', 'linked', 'syncing', 'error'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deals_account_id
  ON public.crm_deals (account_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage_id
  ON public.crm_deals (stage_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_booking_id
  ON public.crm_deals (booking_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_contact_id
  ON public.crm_deals (contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned_to
  ON public.crm_deals (assigned_to);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_crm_deals_account_conversation_id'
      AND tablename = 'crm_deals'
  ) THEN
    CREATE UNIQUE INDEX idx_crm_deals_account_conversation_id
      ON public.crm_deals (account_id, conversation_id)
      WHERE conversation_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deals_custom_attributes
  ON public.crm_deals USING gin (custom_attributes);

-- ---------------------------------------------------------------------------
-- CRM configurable deal fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_deal_field_definitions (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  key varchar(64) NOT NULL,
  label varchar(120) NOT NULL,
  field_type varchar(30) NOT NULL DEFAULT 'text',
  storage_type varchar(30) NOT NULL DEFAULT 'custom_attribute',
  position integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_deal_field_definitions
  ADD COLUMN IF NOT EXISTS storage_type varchar(30);

UPDATE public.crm_deal_field_definitions
  SET storage_type = CASE
    WHEN is_system THEN 'system_column'
    ELSE 'custom_attribute'
  END
  WHERE storage_type IS NULL;

ALTER TABLE public.crm_deal_field_definitions
  ALTER COLUMN storage_type SET DEFAULT 'custom_attribute',
  ALTER COLUMN storage_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_field_definitions_account_id'
      AND conrelid = 'public.crm_deal_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_field_definitions
      ADD CONSTRAINT fk_crm_deal_field_definitions_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_crm_deal_field_definitions_account_key'
      AND conrelid = 'public.crm_deal_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_field_definitions
      ADD CONSTRAINT uq_crm_deal_field_definitions_account_key
      UNIQUE (account_id, key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_crm_deal_field_definitions_field_type'
      AND conrelid = 'public.crm_deal_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_field_definitions
      ADD CONSTRAINT chk_crm_deal_field_definitions_field_type
      CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_crm_deal_field_definitions_storage_type'
      AND conrelid = 'public.crm_deal_field_definitions'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_field_definitions
      ADD CONSTRAINT chk_crm_deal_field_definitions_storage_type
      CHECK (storage_type IN ('system_column', 'custom_attribute'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deal_field_definitions_account_id
  ON public.crm_deal_field_definitions (account_id);

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stage_required_fields (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  stage_id bigint NOT NULL,
  field_definition_id bigint NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_pipeline_stage_required_fields
  ADD COLUMN IF NOT EXISTS field_definition_id bigint;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_pipeline_stage_required_fields'
      AND column_name = 'field_key'
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ALTER COLUMN field_key DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_pipeline_stage_required_fields'
      AND column_name = 'field_key'
  ) THEN
    UPDATE public.crm_pipeline_stage_required_fields required_field
      SET field_definition_id = field_definition.id
      FROM public.crm_deal_field_definitions field_definition
      WHERE required_field.field_definition_id IS NULL
        AND required_field.account_id = field_definition.account_id
        AND required_field.field_key = field_definition.key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.crm_pipeline_stage_required_fields
    WHERE field_definition_id IS NULL
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ALTER COLUMN field_definition_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_pipeline_stage_required_fields_account_id'
      AND conrelid = 'public.crm_pipeline_stage_required_fields'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ADD CONSTRAINT fk_crm_pipeline_stage_required_fields_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_pipeline_stage_required_fields_stage_id'
      AND conrelid = 'public.crm_pipeline_stage_required_fields'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ADD CONSTRAINT fk_crm_pipeline_stage_required_fields_stage_id
      FOREIGN KEY (stage_id)
      REFERENCES public.crm_pipeline_stages(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_pipeline_stage_required_fields_field_definition_id'
      AND conrelid = 'public.crm_pipeline_stage_required_fields'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ADD CONSTRAINT fk_crm_pipeline_stage_required_fields_field_definition_id
      FOREIGN KEY (field_definition_id)
      REFERENCES public.crm_deal_field_definitions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_crm_pipeline_stage_required_fields_stage_field_definition'
      AND conrelid = 'public.crm_pipeline_stage_required_fields'::regclass
  ) THEN
    ALTER TABLE public.crm_pipeline_stage_required_fields
      ADD CONSTRAINT uq_crm_pipeline_stage_required_fields_stage_field_definition
      UNIQUE (stage_id, field_definition_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stage_required_fields_account_id
  ON public.crm_pipeline_stage_required_fields (account_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stage_required_fields_stage_id
  ON public.crm_pipeline_stage_required_fields (stage_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stage_required_fields_field_definition_id
  ON public.crm_pipeline_stage_required_fields (field_definition_id);

-- ---------------------------------------------------------------------------
-- CRM deal activities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_deal_activities (
  id bigserial PRIMARY KEY,
  deal_id bigint NOT NULL,
  account_id integer NOT NULL,
  user_id integer,
  activity_type varchar(50) NOT NULL,
  from_stage_id bigint,
  to_stage_id bigint,
  note text,
  created_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_activities_deal_id'
      AND conrelid = 'public.crm_deal_activities'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_activities
      ADD CONSTRAINT fk_crm_deal_activities_deal_id
      FOREIGN KEY (deal_id)
      REFERENCES public.crm_deals(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_activities_account_id'
      AND conrelid = 'public.crm_deal_activities'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_activities
      ADD CONSTRAINT fk_crm_deal_activities_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_activities_user_id'
      AND conrelid = 'public.crm_deal_activities'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_activities
      ADD CONSTRAINT fk_crm_deal_activities_user_id
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_activities_from_stage_id'
      AND conrelid = 'public.crm_deal_activities'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_activities
      ADD CONSTRAINT fk_crm_deal_activities_from_stage_id
      FOREIGN KEY (from_stage_id)
      REFERENCES public.crm_pipeline_stages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_deal_activities_to_stage_id'
      AND conrelid = 'public.crm_deal_activities'::regclass
  ) THEN
    ALTER TABLE public.crm_deal_activities
      ADD CONSTRAINT fk_crm_deal_activities_to_stage_id
      FOREIGN KEY (to_stage_id)
      REFERENCES public.crm_pipeline_stages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_deal_id
  ON public.crm_deal_activities (deal_id);

CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_account_id
  ON public.crm_deal_activities (account_id);

CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_user_id
  ON public.crm_deal_activities (user_id);

-- ---------------------------------------------------------------------------
-- CRM loss reason options
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_loss_reason_options (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  label varchar(120) NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_crm_loss_reason_options_account_id'
      AND conrelid = 'public.crm_loss_reason_options'::regclass
  ) THEN
    ALTER TABLE public.crm_loss_reason_options
      ADD CONSTRAINT fk_crm_loss_reason_options_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_loss_reason_options_account_id
  ON public.crm_loss_reason_options (account_id);
