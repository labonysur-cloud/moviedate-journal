
-- Role enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blocking flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE user_id = _user_id LIMIT 1), false)
$$;

-- Admin can update any profile (e.g., block/unblock); users still update their own
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed admin role for the requested email (if exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'labonysur473@gmail.com'
ON CONFLICT DO NOTHING;

-- Auto-assign on signup
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'labonysur473@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup();

-- Movies: admin override + block check
DROP POLICY IF EXISTS "Users can delete own movies" ON public.movies;
DROP POLICY IF EXISTS "Users can update own movies" ON public.movies;
DROP POLICY IF EXISTS "Users can insert movies" ON public.movies;

CREATE POLICY "Insert movies if not blocked" ON public.movies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = added_by AND NOT public.is_blocked(auth.uid()));

CREATE POLICY "Update own movies or admin" ON public.movies
  FOR UPDATE TO authenticated
  USING (auth.uid() = added_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete own movies or admin" ON public.movies
  FOR DELETE TO authenticated
  USING (auth.uid() = added_by OR public.has_role(auth.uid(), 'admin'));

-- Block check on chat and friend requests
DROP POLICY IF EXISTS "Members can post messages" ON public.room_messages;
CREATE POLICY "Members can post messages" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_blocked(auth.uid())
    AND EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_messages.room_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND NOT public.is_blocked(auth.uid()));
