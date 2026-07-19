-- Stage 4 hardening for Manager retry/concurrency safety.
-- lock_version enables Rails optimistic locking for crm_deals.
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS lock_version integer;

UPDATE public.crm_deals
  SET lock_version = 0
  WHERE lock_version IS NULL;

ALTER TABLE public.crm_deals
  ALTER COLUMN lock_version SET DEFAULT 0,
  ALTER COLUMN lock_version SET NOT NULL;

-- One Manager conversation may have at most one linked deal per account.
-- If legacy duplicates exist, do not fail deployment; keep code-level locking
-- active and surface the cleanup need through migration logs.
DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_groups
  FROM (
    SELECT account_id, conversation_id
    FROM public.crm_deals
    WHERE conversation_id IS NOT NULL
    GROUP BY account_id, conversation_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE WARNING 'Skipping uq_crm_deals_account_conversation_id_nonempty: % duplicate account_id/conversation_id groups exist.', duplicate_groups;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_deals_account_conversation_id_nonempty
      ON public.crm_deals (account_id, conversation_id)
      WHERE conversation_id IS NOT NULL;
  END IF;
END $$;
