
-- 1. Profiles: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.lookup_friend_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_room_by_invite_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_booked_seats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_friend_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_room_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booked_seats(uuid) TO authenticated;

-- 3. Room members: require valid invite code or be host
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
CREATE POLICY "Host can add self to room"
  ON public.room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.watch_rooms wr
      WHERE wr.id = room_members.room_id
        AND wr.host_id = auth.uid()
        AND wr.is_active = true
    )
  );

-- Server-side join helper: validates invite code, inserts membership
CREATE OR REPLACE FUNCTION public.join_room_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_room_id
  FROM public.watch_rooms
  WHERE invite_code = _code AND is_active = true
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.room_members (room_id, user_id)
  VALUES (v_room_id, v_uid)
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN v_room_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_room_with_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_room_with_code(text) TO authenticated;

-- 4. Shared tickets: allow sender to delete
DROP POLICY IF EXISTS "Senders can revoke shared tickets" ON public.shared_tickets;
CREATE POLICY "Senders can revoke shared tickets"
  ON public.shared_tickets FOR DELETE
  TO authenticated
  USING (auth.uid() = shared_by);

-- 5. user_roles: explicit restrictive policy preventing non-admin writes
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. Hide watch_rooms.invite_code column from clients; provide host-only RPC
REVOKE SELECT (invite_code) ON public.watch_rooms FROM authenticated, anon, PUBLIC;

CREATE OR REPLACE FUNCTION public.get_room_invite_code(_room_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT invite_code
  FROM public.watch_rooms
  WHERE id = _room_id
    AND host_id = auth.uid()
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_room_invite_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_room_invite_code(uuid) TO authenticated;
