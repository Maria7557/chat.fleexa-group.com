-- CRM Pipeline default stage seed data.
-- Replace ACCOUNT_ID before running. Safe to run multiple times.

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
    'reserved',
    'Бронь',
    '#F59E0B',
    2,
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
    '#8B5CF6',
    3,
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
    '#16A34A',
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
