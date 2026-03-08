
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Movie Lover'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  poster TEXT,
  description TEXT,
  rating TEXT,
  watch_url TEXT,
  embed_url TEXT,
  total_seasons INTEGER,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view movies" ON public.movies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert movies" ON public.movies FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);
CREATE POLICY "Users can update own movies" ON public.movies FOR UPDATE TO authenticated USING (auth.uid() = added_by);
CREATE POLICY "Users can delete own movies" ON public.movies FOR DELETE TO authenticated USING (auth.uid() = added_by);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  movie_title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  seat TEXT NOT NULL,
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Shared tickets (for watching together)
CREATE TABLE public.shared_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, shared_with)
);

ALTER TABLE public.shared_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared tickets they sent or received" ON public.shared_tickets FOR SELECT TO authenticated USING (auth.uid() = shared_by OR auth.uid() = shared_with);
CREATE POLICY "Users can share own tickets" ON public.shared_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = shared_by);

-- Friends system
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user, to_user)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friend requests" ON public.friend_requests FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);
CREATE POLICY "Users can update requests sent to them" ON public.friend_requests FOR UPDATE TO authenticated USING (auth.uid() = to_user);

-- Friend links (share via link)
CREATE TABLE public.friend_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.friend_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links" ON public.friend_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own links" ON public.friend_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone authenticated can lookup links by code" ON public.friend_links FOR SELECT TO authenticated USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
