
CREATE TABLE public.movie_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, user_id)
);

CREATE INDEX movie_favorites_movie_id_idx ON public.movie_favorites(movie_id);
CREATE INDEX movie_favorites_user_id_idx ON public.movie_favorites(user_id);

GRANT SELECT, INSERT, DELETE ON public.movie_favorites TO authenticated;
GRANT ALL ON public.movie_favorites TO service_role;

ALTER TABLE public.movie_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view favorites"
ON public.movie_favorites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can favorite movies as themselves"
ON public.movie_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite"
ON public.movie_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
