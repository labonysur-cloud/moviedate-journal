
-- 1. Add UPDATE policy for journal_entries
CREATE POLICY "Users can update their own journal entries"
ON public.journal_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Restrict journal-media storage bucket to owners
DROP POLICY IF EXISTS "Authenticated users can view journal media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view journal media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view journal media" ON storage.objects;
DROP POLICY IF EXISTS "Journal media is viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Public read journal-media" ON storage.objects;

CREATE POLICY "Journal media owners can read their files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Restrict profiles.is_blocked column visibility
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, display_name, avatar_url, created_at, updated_at)
  ON public.profiles TO authenticated;

-- 4. Remove overly permissive INSERT policy on room_messages
DROP POLICY IF EXISTS "Users can send messages" ON public.room_messages;

-- 5. Revoke EXECUTE on SECURITY DEFINER functions from anon/public,
--    keep for authenticated (and service_role via default).
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;
