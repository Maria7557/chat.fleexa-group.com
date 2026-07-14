-- CRM Marketing Meta Ads mock Airbyte ingestion.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Local mock Airbyte source rows for Meta Ads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airbyte_meta_ads_daily_spend_mock (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  external_row_id varchar(255) NOT NULL,
  spend_date date NOT NULL,
  ad_account_id varchar(255) NOT NULL,
  ad_account_name varchar(255),
  campaign_id varchar(255) NOT NULL,
  campaign_name varchar(255),
  spend decimal(12,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'AED',
  synced_at timestamp NOT NULL DEFAULT NOW(),
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_airbyte_meta_ads_daily_spend_mock_account_id'
      AND conrelid = 'public.airbyte_meta_ads_daily_spend_mock'::regclass
  ) THEN
    ALTER TABLE public.airbyte_meta_ads_daily_spend_mock
      ADD CONSTRAINT fk_airbyte_meta_ads_daily_spend_mock_account_id
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
    WHERE conname = 'chk_airbyte_meta_ads_daily_spend_mock_spend'
      AND conrelid = 'public.airbyte_meta_ads_daily_spend_mock'::regclass
  ) THEN
    ALTER TABLE public.airbyte_meta_ads_daily_spend_mock
      ADD CONSTRAINT chk_airbyte_meta_ads_daily_spend_mock_spend
      CHECK (spend >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_airbyte_meta_ads_daily_spend_mock_currency'
      AND conrelid = 'public.airbyte_meta_ads_daily_spend_mock'::regclass
  ) THEN
    ALTER TABLE public.airbyte_meta_ads_daily_spend_mock
      ADD CONSTRAINT chk_airbyte_meta_ads_daily_spend_mock_currency
      CHECK (char_length(currency) = 3);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_airbyte_meta_ads_daily_spend_mock_external_row
  ON public.airbyte_meta_ads_daily_spend_mock (account_id, external_row_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_airbyte_meta_ads_daily_spend_mock_grain
  ON public.airbyte_meta_ads_daily_spend_mock (
    account_id,
    spend_date,
    ad_account_id,
    campaign_id,
    currency
  );

CREATE INDEX IF NOT EXISTS idx_airbyte_meta_ads_daily_spend_mock_account_date
  ON public.airbyte_meta_ads_daily_spend_mock (account_id, spend_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_spend_daily_meta_ads
  ON public.marketing_spend_daily (
    account_id,
    source_system,
    spend_date,
    ad_account_id,
    campaign_id,
    source_currency
  )
  WHERE import_type = 'airbyte'
    AND source_system = 'meta_ads';

CREATE INDEX IF NOT EXISTS idx_marketing_spend_daily_airbyte_meta_ads
  ON public.marketing_spend_daily (account_id, spend_date, source_system)
  WHERE import_type = 'airbyte'
    AND source_system = 'meta_ads';
