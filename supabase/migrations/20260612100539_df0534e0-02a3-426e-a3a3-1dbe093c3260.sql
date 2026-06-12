
-- 1. friend_links: drop the "true" policy, add secure lookup function
DROP POLICY IF EXISTS "Anyone authenticated can lookup links by code" ON public.friend_links;

CREATE OR REPLACE FUNCTION public.lookup_friend_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.friend_links WHERE code = _code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_friend_by_code(text) TO authenticated;

-- 2. watch_rooms: replace permissive policy with host/member scoped access + secure invite lookup
DROP POLICY IF EXISTS "Authenticated users can view active rooms" ON public.watch_rooms;

CREATE POLICY "Hosts can view own rooms"
ON public.watch_rooms FOR SELECT
TO authenticated
USING (auth.uid() = host_id);

CREATE POLICY "Members can view their rooms"
ON public.watch_rooms FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.room_members rm
  WHERE rm.room_id = watch_rooms.id AND rm.user_id = auth.uid()
));

-- Secure invite code lookup: returns only the room id when an active room matches
CREATE OR REPLACE FUNCTION public.lookup_room_by_invite_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.watch_rooms WHERE invite_code = _code AND is_active = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_room_by_invite_code(text) TO authenticated;
