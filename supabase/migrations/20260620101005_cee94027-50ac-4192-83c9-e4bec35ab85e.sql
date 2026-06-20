
-- Restore Data API access to profiles after security tightening removed grants.
-- Keep is_blocked invisible to non-admins by routing admin reads through a SECURITY DEFINER function.

GRANT SELECT (id, user_id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT INSERT (id, user_id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, updated_at, is_blocked) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  is_blocked boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.is_blocked, p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.display_name;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
