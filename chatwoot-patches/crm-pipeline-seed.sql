-- CRM Pipeline system stage seed data.
-- Replace ACCOUNT_ID before running. Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- System stage: unassigned
-- ---------------------------------------------------------------------------
INSERT INTO public.crm_pipeline_stages (
  account_id,
  slug,
  name,
  color,
  position,
  is_system,
  rotting_enabled,
  rotting_after_minutes
)
SELECT
  ACCOUNT_ID,
  'unassigned',
  'Неразобранное',
  '#6B7280',
  1,
  true,
  true,
  5
WHERE NOT EXISTS (
  SELECT 1
  FROM public.crm_pipeline_stages
  WHERE account_id = ACCOUNT_ID
    AND slug = 'unassigned'
);

-- ---------------------------------------------------------------------------
-- System stage: closed won
-- ---------------------------------------------------------------------------
INSERT INTO public.crm_pipeline_stages (
  account_id,
  slug,
  name,
  color,
  position,
  is_system,
  rotting_enabled,
  rotting_after_minutes
)
SELECT
  ACCOUNT_ID,
  'closed_won',
  'Завершено',
  '#16A34A',
  999,
  true,
  false,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.crm_pipeline_stages
  WHERE account_id = ACCOUNT_ID
    AND slug = 'closed_won'
);

-- ---------------------------------------------------------------------------
-- System stage: closed lost
-- ---------------------------------------------------------------------------
INSERT INTO public.crm_pipeline_stages (
  account_id,
  slug,
  name,
  color,
  position,
  is_system,
  rotting_enabled,
  rotting_after_minutes
)
SELECT
  ACCOUNT_ID,
  'closed_lost',
  'Отказ',
  '#DC2626',
  1000,
  true,
  false,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.crm_pipeline_stages
  WHERE account_id = ACCOUNT_ID
    AND slug = 'closed_lost'
);
