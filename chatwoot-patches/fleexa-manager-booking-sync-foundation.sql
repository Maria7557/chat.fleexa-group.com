-- Fleexa Manager Booking -> Chat Pipeline sync foundation.
-- Safe to run multiple times.
--
-- Identifier contract:
-- booking_id = Fleexa Booking Order.id, stored as a non-display string.
-- booking_number = display only and belongs in crm_deals.custom_attributes.
-- booking_client_id = Fleexa Booking Contact.id and belongs in contacts.custom_attributes.
-- pipeline_deal_id = public.crm_deals.id.
-- phone values are lookup candidates only and are never a client identity key.
--
-- Feature flags:
-- Chat receiver capability is account-scoped and default-off when absent:
-- accounts.settings['fleexa_booking_pipeline_sync']['receiver_enabled'] = true.
-- Booking outbound sync enablement belongs to CRM _ RENT, not this Chat receiver.
-- Vehicle catalog outbound credentials are intentionally not created here.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Booking service credentials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fleexa_manager_booking_credentials (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  fleexa_company_id varchar(100) NOT NULL,
  token_digest varchar(128) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamp,
  created_by_id bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fleexa_manager_booking_credentials
  ADD COLUMN IF NOT EXISTS fleexa_company_id varchar(100),
  ADD COLUMN IF NOT EXISTS token_digest varchar(128),
  ADD COLUMN IF NOT EXISTS scopes jsonb,
  ADD COLUMN IF NOT EXISTS active boolean,
  ADD COLUMN IF NOT EXISTS last_used_at timestamp,
  ADD COLUMN IF NOT EXISTS created_by_id bigint,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.fleexa_manager_booking_credentials
  SET scopes = '[]'::jsonb
  WHERE scopes IS NULL;

UPDATE public.fleexa_manager_booking_credentials
  SET active = true
  WHERE active IS NULL;

UPDATE public.fleexa_manager_booking_credentials
  SET metadata = '{}'::jsonb
  WHERE metadata IS NULL;

ALTER TABLE public.fleexa_manager_booking_credentials
  ALTER COLUMN fleexa_company_id SET NOT NULL,
  ALTER COLUMN token_digest SET NOT NULL,
  ALTER COLUMN scopes SET DEFAULT '[]'::jsonb,
  ALTER COLUMN scopes SET NOT NULL,
  ALTER COLUMN active SET DEFAULT true,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_fleexa_manager_booking_credentials_account_id'
      AND conrelid = 'public.fleexa_manager_booking_credentials'::regclass
  ) THEN
    ALTER TABLE public.fleexa_manager_booking_credentials
      ADD CONSTRAINT fk_fleexa_manager_booking_credentials_account_id
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
    WHERE conname = 'fk_fleexa_manager_booking_credentials_created_by_id'
      AND conrelid = 'public.fleexa_manager_booking_credentials'::regclass
  ) THEN
    ALTER TABLE public.fleexa_manager_booking_credentials
      ADD CONSTRAINT fk_fleexa_manager_booking_credentials_created_by_id
      FOREIGN KEY (created_by_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_fleexa_manager_booking_credentials_scopes_array'
      AND conrelid = 'public.fleexa_manager_booking_credentials'::regclass
  ) THEN
    ALTER TABLE public.fleexa_manager_booking_credentials
      ADD CONSTRAINT chk_fleexa_manager_booking_credentials_scopes_array
      CHECK (jsonb_typeof(scopes) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fleexa_manager_booking_credentials_account_id
  ON public.fleexa_manager_booking_credentials (account_id);

CREATE INDEX IF NOT EXISTS idx_fleexa_manager_booking_credentials_company
  ON public.fleexa_manager_booking_credentials (fleexa_company_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fleexa_manager_booking_credentials_active_digest
  ON public.fleexa_manager_booking_credentials (token_digest)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fleexa_manager_booking_credentials_active_company
  ON public.fleexa_manager_booking_credentials (account_id, fleexa_company_id)
  WHERE active = true;

-- ---------------------------------------------------------------------------
-- Booking identity protection
-- ---------------------------------------------------------------------------
-- Preflight duplicate report before adding automatic Booking -> deal identity.
-- If duplicates already exist, the sync service must keep the code-level guard
-- and this SQL will skip the unique index until data is cleaned.
DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_groups
  FROM (
    SELECT account_id, booking_id
    FROM public.crm_deals
    WHERE booking_id IS NOT NULL
      AND booking_id <> ''
    GROUP BY account_id, booking_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE WARNING 'Skipping uq_crm_deals_account_booking_id_nonempty: % duplicate account_id/booking_id groups exist.', duplicate_groups;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_deals_account_booking_id_nonempty
      ON public.crm_deals (account_id, booking_id)
      WHERE booking_id IS NOT NULL
        AND booking_id <> '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deals_account_booking_id_lookup
  ON public.crm_deals (account_id, booking_id)
  WHERE booking_id IS NOT NULL
    AND booking_id <> '';

CREATE INDEX IF NOT EXISTS idx_contacts_booking_client_id_custom_attributes
  ON public.contacts (account_id, ((custom_attributes ->> 'booking_client_id')))
  WHERE custom_attributes ? 'booking_client_id';
