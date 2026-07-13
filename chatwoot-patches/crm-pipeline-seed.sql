-- CRM Pipeline default stage seed data.
-- Replace ACCOUNT_ID before running. Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.crm_pipeline_stages
    WHERE account_id = ACCOUNT_ID
      AND slug = 'in_progress'
  ) THEN
    UPDATE public.crm_pipeline_stages
      SET position = position + 100
      WHERE account_id = ACCOUNT_ID
        AND position >= 2
        AND position < 999;

    UPDATE public.crm_pipeline_stages
      SET position = position - 99
      WHERE account_id = ACCOUNT_ID
        AND position >= 102
        AND position < 1099;
  END IF;
END $$;

INSERT INTO public.crm_pipeline_stages (
  account_id,
  slug,
  name,
  color,
  position,
  is_system,
  rotting_enabled,
  rotting_after_minutes,
  fleet_status_trigger,
  created_at,
  updated_at
)
VALUES
  (
    ACCOUNT_ID,
    'unassigned',
    'Неразобранное',
    '#6B7280',
    1,
    true,
    true,
    5,
    NULL,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'in_progress',
    'В работе',
    '#8B5CF6',
    2,
    false,
    false,
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'reserved',
    'Бронь',
    '#3B82F6',
    3,
    false,
    false,
    NULL,
    'reserved',
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'rental',
    'В аренде',
    '#14B8A6',
    4,
    false,
    false,
    NULL,
    'rental',
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'closed_won',
    'Завершено',
    '#22C55E',
    999,
    true,
    false,
    NULL,
    'done',
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'closed_lost',
    'Отмена',
    '#DC2626',
    1000,
    true,
    false,
    NULL,
    'cancel',
    NOW(),
    NOW()
  )
ON CONFLICT (account_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  position = EXCLUDED.position,
  is_system = EXCLUDED.is_system,
  rotting_enabled = EXCLUDED.rotting_enabled,
  rotting_after_minutes = EXCLUDED.rotting_after_minutes,
  fleet_status_trigger = EXCLUDED.fleet_status_trigger,
  updated_at = NOW();

INSERT INTO public.crm_deal_field_definitions (
  account_id,
  key,
  label,
  field_type,
  storage_type,
  position,
  options,
  is_system,
  is_active,
  created_at,
  updated_at
)
VALUES
  (ACCOUNT_ID, 'title', 'Title', 'text', 'system_column', 10, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'car_model', 'Selected Car', 'text', 'system_column', 20, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'booking_id', 'Booking №', 'text', 'system_column', 30, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'rental_start', 'Rental start', 'date', 'system_column', 40, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'rental_end', 'Rental end', 'date', 'system_column', 50, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'amount', 'Budget', 'number', 'system_column', 60, '[]'::jsonb, true, true, NOW(), NOW()),
  (ACCOUNT_ID, 'debt_amount', 'Debt', 'number', 'system_column', 70, '[]'::jsonb, true, true, NOW(), NOW()),
  (
    ACCOUNT_ID,
    'source_request',
    'Source Request',
    'select',
    'custom_attribute',
    100,
    '["WEBSITE", "INST/FB", "DUBIZZLE", "FRIEND''S ADVICE", "REGULAR", "MAPS", "MAILING LIST", "CALL CENTER", "UNKNOWN"]'::jsonb,
    true,
    true,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'car_type',
    'Car type',
    'select',
    'custom_attribute',
    110,
    '["Super & Sport", "Premium", "SUV", "Middle & Muscle", "Budget & Small"]'::jsonb,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'client_status',
    'Client',
    'select',
    'custom_attribute',
    120,
    '["NEW", "REG"]'::jsonb,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'client_type',
    'Client Type',
    'select',
    'custom_attribute',
    130,
    '["B2C", "B2B"]'::jsonb,
    false,
    true,
    NOW(),
    NOW()
  ),
  (
    ACCOUNT_ID,
    'language',
    'Language',
    'select',
    'custom_attribute',
    140,
    '["RU", "EN"]'::jsonb,
    false,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (account_id, key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  storage_type = EXCLUDED.storage_type,
  position = EXCLUDED.position,
  options = EXCLUDED.options,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

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
      WHERE required_field.account_id = ACCOUNT_ID
        AND required_field.field_definition_id IS NULL
        AND required_field.account_id = field_definition.account_id
        AND required_field.field_key = field_definition.key;
  END IF;
END $$;

WITH required_fields(stage_slug, field_key) AS (
  VALUES
    ('reserved', 'car_model'),
    ('reserved', 'amount'),
    ('reserved', 'source_request'),
    ('rental', 'car_model'),
    ('rental', 'rental_start'),
    ('rental', 'rental_end'),
    ('rental', 'amount'),
    ('rental', 'booking_id'),
    ('closed_won', 'booking_id'),
    ('closed_won', 'car_model'),
    ('closed_won', 'rental_start'),
    ('closed_won', 'rental_end'),
    ('closed_won', 'amount'),
    ('closed_lost', 'source_request')
)
INSERT INTO public.crm_pipeline_stage_required_fields (
  account_id,
  stage_id,
  field_definition_id,
  created_at,
  updated_at
)
SELECT
  ACCOUNT_ID,
  stage.id,
  field_definition.id,
  NOW(),
  NOW()
FROM required_fields
INNER JOIN public.crm_pipeline_stages stage
  ON stage.account_id = ACCOUNT_ID
  AND stage.slug = required_fields.stage_slug
INNER JOIN public.crm_deal_field_definitions field_definition
  ON field_definition.account_id = ACCOUNT_ID
  AND field_definition.key = required_fields.field_key
ON CONFLICT (stage_id, field_definition_id) DO UPDATE SET
  updated_at = NOW();

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
