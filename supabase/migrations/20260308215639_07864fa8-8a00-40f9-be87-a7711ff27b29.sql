
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  movie_title text NOT NULL,
  content text NOT NULL,
  mood text DEFAULT '',
  author text DEFAULT '',
  date text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
