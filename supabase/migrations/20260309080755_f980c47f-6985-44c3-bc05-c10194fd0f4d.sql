
-- Allow users to delete friend requests they are part of (unfriend)
CREATE POLICY "Users can delete own friendships"
ON public.friend_requests FOR DELETE
TO authenticated
USING ((auth.uid() = from_user) OR (auth.uid() = to_user));
