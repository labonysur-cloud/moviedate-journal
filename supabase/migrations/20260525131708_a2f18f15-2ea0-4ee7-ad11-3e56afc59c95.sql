
-- 1. Avatar upload ownership
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. room_members SELECT restricted to same-room members
DROP POLICY IF EXISTS "Members can view room members" ON public.room_members;
CREATE POLICY "Members can view room members"
ON public.room_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
  )
);

-- 3. room_messages SELECT restricted to room members
DROP POLICY IF EXISTS "Members can view messages" ON public.room_messages;
CREATE POLICY "Members can view messages"
ON public.room_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_messages.room_id AND rm.user_id = auth.uid()
  )
);

-- 4. Realtime: deny broadcast/presence subscriptions (app uses postgres_changes only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Deny realtime broadcast by default" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Deny realtime broadcast by default" ON realtime.messages FOR SELECT TO authenticated USING (false)';
  END IF;
END $$;

-- 5. Revoke EXECUTE on internal trigger functions from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- 6. Revoke anon access on get_booked_seats (only authenticated users need it)
REVOKE EXECUTE ON FUNCTION public.get_booked_seats(uuid) FROM anon, public;
