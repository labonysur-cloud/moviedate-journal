
REVOKE EXECUTE ON FUNCTION public.assign_admin_on_signup() FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
