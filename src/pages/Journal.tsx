import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookHeart, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import PostComposer from "@/components/journal/PostComposer";
import PostCard, { FeedPost, PostMedia } from "@/components/journal/PostCard";

const PAGE_SIZE = 12;

/**
 * Lightweight ranking: blends recency with engagement so the feed feels alive
 * without being a strict timeline. Recompute each refresh.
 */
function rankPosts(posts: (FeedPost & { _reactions: number; _comments: number })[]) {
  const now = Date.now();
  return [...posts]
    .map((p) => {
      const ageHrs = Math.max(1, (now - new Date(p.created_at).getTime()) / 36e5);
      const engagement = p._reactions * 1.4 + p._comments * 2;
      const recency = 24 / (ageHrs + 6);
      const jitter = Math.random() * 0.6;
      return { ...p, _score: recency + engagement * 0.35 + jitter };
    })
    .sort((a, b) => b._score - a._score);
}

export default function Journal() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("journal_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE * 2);
    if (error) { toast.error("Couldn't load feed"); return; }
    const rawPosts = (data ?? []) as any[];

    // Fetch authors + engagement counts in parallel
    const ids = Array.from(new Set(rawPosts.map((p) => p.user_id)));
    const postIds = rawPosts.map((p) => p.id);
    const [{ data: profs }, { data: rxns }, { data: cmts }] = await Promise.all([
      ids.length
        ? supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_reactions").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_comments").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const rxnCount = new Map<string, number>();
    (rxns ?? []).forEach((r: any) => rxnCount.set(r.post_id, (rxnCount.get(r.post_id) ?? 0) + 1));
    const cmtCount = new Map<string, number>();
    (cmts ?? []).forEach((c: any) => cmtCount.set(c.post_id, (cmtCount.get(c.post_id) ?? 0) + 1));

    const decorated = rawPosts.map((p) => ({
      ...p,
      media_urls: Array.isArray(p.media_urls) ? (p.media_urls as PostMedia[]) : [],
      author: pmap.get(p.user_id) ?? null,
      _reactions: rxnCount.get(p.id) ?? 0,
      _comments: cmtCount.get(p.id) ?? 0,
    }));
    const ranked = rankPosts(decorated).slice(0, PAGE_SIZE);
    setPosts(ranked as FeedPost[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [user, loadFeed]);

  const doRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
    setPull(0);
  };

  // Pull-to-refresh (touch + mouse) at scroll top of the page.
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy, 120));
    };
    const onTouchEnd = () => {
      if (pull > 70) doRefresh(); else setPull(0);
      startY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull]);

  return (
    <div className="min-h-screen pt-4 sm:pt-8 pb-12 px-4 relative">
      {/* Pull indicator */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none"
        style={{ transform: `translate(-50%, ${Math.min(pull, 100)}px)`, opacity: Math.min(pull / 70, 1) }}
      >
        <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 text-xs font-handwritten text-accent">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : pull > 70 ? "Release to refresh" : "Pull down"}
        </div>
      </div>

      <div className="container mx-auto max-w-2xl" ref={scrollerRef}>
        <header className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold flex items-center gap-3">
              <BookHeart className="w-7 h-7 text-primary" />
              Movie Journal
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-handwritten">
              <Sparkles className="inline w-3.5 h-3.5 mr-1" />
              A cozy social diary — share clips, snaps & reviews.
            </p>
          </div>
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="p-2 rounded-full bg-card border border-border hover:bg-secondary"
            aria-label="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        <div className="mb-5">
          <PostComposer onPosted={doRefresh} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={BookHeart}
            title="Your feed is empty"
            description="Be the first to share a clip or a tiny review."
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onChanged={doRefresh} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
