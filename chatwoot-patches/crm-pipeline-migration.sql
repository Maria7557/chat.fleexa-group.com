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
  rotting_since timestamp,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

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
