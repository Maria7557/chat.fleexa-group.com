-- CRM Marketing source mapping layer.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.marketing_source_mappings (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  platform varchar(100) NOT NULL,
  ad_account_id varchar(255),
  campaign_id varchar(255),
  source_key varchar(100) NOT NULL,
  source_label varchar(255) NOT NULL,
  entry_point_key varchar(255),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_marketing_source_mappings_account_id'
      AND conrelid = 'public.marketing_source_mappings'::regclass
  ) THEN
    ALTER TABLE public.marketing_source_mappings
      ADD CONSTRAINT fk_marketing_source_mappings_account_id
      FOREIGN KEY (account_id)
      REFERENCES public.accounts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketing_source_mappings_account_platform
  ON public.marketing_source_mappings (account_id, platform)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_source_mappings_campaign
  ON public.marketing_source_mappings (
    account_id,
    platform,
    ad_account_id,
    campaign_id
  )
  WHERE is_active = true
    AND ad_account_id IS NOT NULL
    AND campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_source_mappings_campaign_platform
  ON public.marketing_source_mappings (
    account_id,
    platform,
    campaign_id
  )
  WHERE is_active = true
    AND ad_account_id IS NULL
    AND campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_source_mappings_ad_account
  ON public.marketing_source_mappings (
    account_id,
    platform,
    ad_account_id
  )
  WHERE is_active = true
    AND ad_account_id IS NOT NULL
    AND campaign_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_source_mappings_platform
  ON public.marketing_source_mappings (
    account_id,
    platform
  )
  WHERE is_active = true
    AND ad_account_id IS NULL
    AND campaign_id IS NULL;
