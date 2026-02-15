-- Safe version of migration - skips already-applied changes

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'registrations'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN email text;
  END IF;
END $$;

-- Make user_id nullable (safe to run even if already nullable)
ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;

-- Drop and recreate the check constraint
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_user_or_email_check;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_user_or_email_check
  CHECK ((user_id IS NOT NULL) OR (email IS NOT NULL AND email != ''));

-- Drop old unique index
DROP INDEX IF EXISTS registrations_active_unique;

-- Create new unique indexes (drop first if they exist)
DROP INDEX IF EXISTS registrations_active_unique_auth;
CREATE UNIQUE INDEX registrations_active_unique_auth
  ON public.registrations (event_id, ride_level, user_id)
  WHERE cancelled_at IS NULL AND user_id IS NOT NULL;

DROP INDEX IF EXISTS registrations_active_unique_guest;
CREATE UNIQUE INDEX registrations_active_unique_guest
  ON public.registrations (event_id, ride_level, lower(email))
  WHERE cancelled_at IS NULL AND user_id IS NULL AND email IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS registrations_select_own ON public.registrations;
DROP POLICY IF EXISTS registrations_insert_own ON public.registrations;
DROP POLICY IF EXISTS registrations_select_policy ON public.registrations;
DROP POLICY IF EXISTS registrations_insert_policy ON public.registrations;

-- New select policy
CREATE POLICY registrations_select_policy
  ON public.registrations
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR true
  );

-- New insert policy
CREATE POLICY registrations_insert_policy
  ON public.registrations
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND email IS NOT NULL)
  );

-- Add email index if it doesn't exist
DROP INDEX IF EXISTS registrations_email_idx;
CREATE INDEX registrations_email_idx ON public.registrations (lower(email))
  WHERE email IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.registrations.email IS 'Email address for guest signups. Either user_id or email must be present.';
COMMENT ON COLUMN public.registrations.user_id IS 'Supabase auth user ID for authenticated signups. Either user_id or email must be present.';
