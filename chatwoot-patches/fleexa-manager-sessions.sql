CREATE TABLE IF NOT EXISTS public.fleexa_manager_sessions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id bigint REFERENCES public.accounts(id) ON DELETE SET NULL,
  token_digest varchar(128) NOT NULL,
  client_platform varchar(32) NOT NULL DEFAULT 'web',
  user_agent_hash varchar(128),
  ip_hash varchar(128),
  expires_at timestamp(6) without time zone NOT NULL,
  revoked_at timestamp(6) without time zone,
  last_used_at timestamp(6) without time zone,
  created_at timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fleexa_manager_sessions_client_platform_check
    CHECK (client_platform IN ('web', 'ios', 'native'))
);

ALTER TABLE public.fleexa_manager_sessions
  ADD COLUMN IF NOT EXISTS account_id bigint,
  ADD COLUMN IF NOT EXISTS token_digest varchar(128),
  ADD COLUMN IF NOT EXISTS client_platform varchar(32) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS user_agent_hash varchar(128),
  ADD COLUMN IF NOT EXISTS ip_hash varchar(128),
  ADD COLUMN IF NOT EXISTS expires_at timestamp(6) without time zone,
  ADD COLUMN IF NOT EXISTS revoked_at timestamp(6) without time zone,
  ADD COLUMN IF NOT EXISTS last_used_at timestamp(6) without time zone,
  ADD COLUMN IF NOT EXISTS created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.fleexa_manager_sessions
  ALTER COLUMN token_digest SET NOT NULL,
  ALTER COLUMN client_platform SET DEFAULT 'web',
  ALTER COLUMN client_platform SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fleexa_manager_sessions_client_platform_check'
  ) THEN
    ALTER TABLE public.fleexa_manager_sessions
      ADD CONSTRAINT fleexa_manager_sessions_client_platform_check
      CHECK (client_platform IN ('web', 'ios', 'native'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS index_fleexa_manager_sessions_on_token_digest
  ON public.fleexa_manager_sessions (token_digest);

CREATE INDEX IF NOT EXISTS index_fleexa_manager_sessions_on_user_active
  ON public.fleexa_manager_sessions (user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS index_fleexa_manager_sessions_on_account_active
  ON public.fleexa_manager_sessions (account_id, revoked_at, expires_at);
