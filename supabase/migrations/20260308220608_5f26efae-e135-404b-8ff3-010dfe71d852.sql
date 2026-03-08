
CREATE TABLE public.watch_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  movie_title text NOT NULL,
  embed_url text,
  host_id uuid NOT NULL,
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.room_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE public.room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- watch_rooms policies
CREATE POLICY "Authenticated users can view active rooms" ON public.watch_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create rooms" ON public.watch_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update rooms" ON public.watch_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- room_members policies
CREATE POLICY "Members can view room members" ON public.room_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms" ON public.room_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- room_messages policies
CREATE POLICY "Members can view messages" ON public.room_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send messages" ON public.room_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
