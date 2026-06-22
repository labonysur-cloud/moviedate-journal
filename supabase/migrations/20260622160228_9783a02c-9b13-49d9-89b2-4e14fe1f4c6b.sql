
-- ============ JOURNAL POSTS ============
CREATE TABLE public.journal_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  movie_title text,
  mood text,
  audience text NOT NULL DEFAULT 'public' CHECK (audience IN ('private','friends','select_friends','public')),
  allowed_user_ids uuid[] NOT NULL DEFAULT '{}',
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_posts TO authenticated;
GRANT ALL ON public.journal_posts TO service_role;
ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_journal_posts_created ON public.journal_posts(created_at DESC);
CREATE INDEX idx_journal_posts_user ON public.journal_posts(user_id);

-- ============ REACTIONS ============
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.journal_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('love','like','dislike','wow','sad','cry','happy','laugh','care','angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);

-- ============ COMMENTS ============
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.journal_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_comments_post ON public.post_comments(post_id, created_at);

-- ============ USER BLOCKS ============
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'accepted'
      AND ((from_user = _a AND to_user = _b) OR (from_user = _b AND to_user = _a))
  );
$$;

CREATE OR REPLACE FUNCTION public.has_blocked(_blocker uuid, _blocked uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = _blocker AND blocked_id = _blocked);
$$;

CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journal_posts p
    WHERE p.id = _post_id
      AND NOT public.has_blocked(p.user_id, _viewer)
      AND (
        p.user_id = _viewer
        OR (
          NOT p.is_hidden
          AND (
            p.audience = 'public'
            OR (p.audience = 'friends' AND public.are_friends(p.user_id, _viewer))
            OR (p.audience = 'select_friends' AND _viewer = ANY(p.allowed_user_ids))
          )
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_blocked(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) TO authenticated;

-- ============ RLS POLICIES: journal_posts ============
CREATE POLICY "View posts allowed by audience"
  ON public.journal_posts FOR SELECT TO authenticated
  USING (public.can_view_post(id, auth.uid()));

CREATE POLICY "Users insert own posts"
  ON public.journal_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own posts"
  ON public.journal_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own posts"
  ON public.journal_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ RLS POLICIES: post_reactions ============
CREATE POLICY "View reactions on visible posts"
  ON public.post_reactions FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

CREATE POLICY "Insert own reactions on visible posts"
  ON public.post_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_post(post_id, auth.uid()));

CREATE POLICY "Update own reaction"
  ON public.post_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own reaction"
  ON public.post_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ RLS POLICIES: post_comments ============
CREATE POLICY "View non-hidden comments on visible posts"
  ON public.post_comments FOR SELECT TO authenticated
  USING (
    public.can_view_post(post_id, auth.uid())
    AND (
      NOT is_hidden
      OR user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.journal_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
    )
  );

CREATE POLICY "Insert own comment on visible post"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_post(post_id, auth.uid()));

CREATE POLICY "Author or post owner can update comment"
  ON public.post_comments FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.journal_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Author or post owner can delete comment"
  ON public.post_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.journal_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

-- ============ RLS POLICIES: user_blocks ============
CREATE POLICY "View own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Create own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Remove own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ============ TRIGGERS ============
CREATE TRIGGER trg_journal_posts_updated
  BEFORE UPDATE ON public.journal_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE POLICIES (journal-media bucket) ============
CREATE POLICY "Journal media readable by signed-in users"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'journal-media');

CREATE POLICY "Users upload own journal media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own journal media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own journal media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
