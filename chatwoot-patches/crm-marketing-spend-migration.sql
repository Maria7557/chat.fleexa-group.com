-- CRM Marketing spend normalized foundation.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Manual spend source records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_spend_entries (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  source_key varchar(100) NOT NULL,
  source_label varchar(255) NOT NULL,
  platform varchar(100) NOT NULL,
  vendor_name varchar(255),
  campaign_name varchar(255),
  notes text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_budget decimal(12,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'AED',
  allocation_mode varchar(30) NOT NULL DEFAULT 'even_by_day',
  fx_rate_to_aed decimal(18,6) NOT NULL DEFAULT 1,
  total_budget_aed decimal(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_manual_spend_entries_account_id'
      AND conrelid = 'public.manual_spend_entries'::regclass
  ) THEN
    ALTER TABLE public.manual_spend_entries
      ADD CONSTRAINT fk_manual_spend_entries_account_id
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
    WHERE conname = 'fk_manual_spend_entries_created_by'
      AND conrelid = 'public.manual_spend_entries'::regclass
  ) THEN
    ALTER TABLE public.manual_spend_entries
      ADD CONSTRAINT fk_manual_spend_entries_created_by
      FOREIGN KEY (created_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_manual_spend_entries_dates'
      AND conrelid = 'public.manual_spend_entries'::regclass
  ) THEN
    ALTER TABLE public.manual_spend_entries
      ADD CONSTRAINT chk_manual_spend_entries_dates
      CHECK (end_date >= start_date);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_manual_spend_entries_allocation_mode'
      AND conrelid = 'public.manual_spend_entries'::regclass
  ) THEN
    ALTER TABLE public.manual_spend_entries
      ADD CONSTRAINT chk_manual_spend_entries_allocation_mode
      CHECK (allocation_mode IN ('even_by_day'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_manual_spend_entries_budget'
      AND conrelid = 'public.manual_spend_entries'::regclass
  ) THEN
    ALTER TABLE public.manual_spend_entries
      ADD CONSTRAINT chk_manual_spend_entries_budget
      CHECK (
        total_budget >= 0
        AND fx_rate_to_aed > 0
        AND total_budget_aed >= 0
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_manual_spend_entries_account_id
  ON public.manual_spend_entries (account_id);

CREATE INDEX IF NOT EXISTS idx_manual_spend_entries_account_dates
  ON public.manual_spend_entries (account_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_manual_spend_entries_account_source_key
  ON public.manual_spend_entries (account_id, source_key);

-- ---------------------------------------------------------------------------
-- Normalized daily spend facts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_spend_daily (
  id bigserial PRIMARY KEY,
  account_id integer NOT NULL,
  spend_date date NOT NULL,
  import_type varchar(30) NOT NULL,
  source_system varchar(100) NOT NULL,
  source_key varchar(100) NOT NULL,
  source_label varchar(255) NOT NULL,
  platform varchar(100),
  vendor_name varchar(255),
  ad_account_id varchar(255),
  ad_account_name varchar(255),
  campaign_id varchar(255),
  campaign_name varchar(255),
  source_currency varchar(3) NOT NULL DEFAULT 'AED',
  source_spend decimal(12,2) NOT NULL,
  fx_rate_to_aed decimal(18,6) NOT NULL DEFAULT 1,
  spend_aed decimal(12,2) NOT NULL,
  fx_date date,
  sync_status varchar(50),
  last_synced_at timestamp,
  raw_row_id varchar(255),
  manual_spend_entry_id bigint,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_marketing_spend_daily_account_id'
      AND conrelid = 'public.marketing_spend_daily'::regclass
  ) THEN
    ALTER TABLE public.marketing_spend_daily
      ADD CONSTRAINT fk_marketing_spend_daily_account_id
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
    WHERE conname = 'fk_marketing_spend_daily_manual_entry'
      AND conrelid = 'public.marketing_spend_daily'::regclass
  ) THEN
    ALTER TABLE public.marketing_spend_daily
      ADD CONSTRAINT fk_marketing_spend_daily_manual_entry
      FOREIGN KEY (manual_spend_entry_id)
      REFERENCES public.manual_spend_entries(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_marketing_spend_daily_manual_entry'
      AND conrelid = 'public.marketing_spend_daily'::regclass
  ) THEN
    ALTER TABLE public.marketing_spend_daily
      ADD CONSTRAINT chk_marketing_spend_daily_manual_entry
      CHECK (import_type <> 'manual' OR manual_spend_entry_id IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_marketing_spend_daily_amounts'
      AND conrelid = 'public.marketing_spend_daily'::regclass
  ) THEN
    ALTER TABLE public.marketing_spend_daily
      ADD CONSTRAINT chk_marketing_spend_daily_amounts
      CHECK (
        source_spend >= 0
        AND fx_rate_to_aed > 0
        AND spend_aed >= 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'marketing_spend_daily'
      AND indexname = 'uq_marketing_spend_daily_manual'
  ) THEN
    CREATE UNIQUE INDEX uq_marketing_spend_daily_manual
      ON public.marketing_spend_daily (
        account_id,
        spend_date,
        import_type,
        manual_spend_entry_id
      )
      WHERE import_type = 'manual';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketing_spend_daily_account_date
  ON public.marketing_spend_daily (account_id, spend_date);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_daily_account_source
  ON public.marketing_spend_daily (account_id, source_key, platform);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_daily_manual_entry
  ON public.marketing_spend_daily (manual_spend_entry_id);
