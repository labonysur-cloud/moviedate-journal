import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal, Trash2, EyeOff, Eye, Shield, Globe, Users, UserCheck, Lock,
  MessageCircle, Send, Loader2, Smile,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ReactionStamp, ReactionPicker, ReactionKey, REACTION_MAP } from "./ReactionStamps";

export interface PostMedia { url: string; type: "image" | "video" }

export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  movie_title: string | null;
  mood: string | null;
  audience: "public" | "friends" | "select_friends" | "private";
  media_urls: PostMedia[];
  is_hidden: boolean;
  created_at: string;
  author: { display_name: string | null; avatar_url: string | null } | null;
}

interface Comment {
  id: string; post_id: string; user_id: string;
  content: string; is_hidden: boolean; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null } | null;
}

const audienceIcon = { public: Globe, friends: Users, select_friends: UserCheck, private: Lock } as const;

export default function PostCard({
  post, onChanged,
}: { post: FeedPost; onChanged: () => void }) {
  const { user } = useAuth();
  const isOwner = user?.id === post.user_id;

  const [reactions, setReactions] = useState<{ reaction: ReactionKey; user_id: string }[]>([]);
  const [myReaction, setMyReaction] = useState<ReactionKey | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("post_reactions")
        .select("reaction,user_id")
        .eq("post_id", post.id);
      const list = (data ?? []) as { reaction: ReactionKey; user_id: string }[];
      setReactions(list);
      const mine = list.find((r) => r.user_id === user?.id);
      setMyReaction(mine?.reaction ?? null);
    })();
  }, [post.id, user?.id]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids);
      const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
      list.forEach((c) => (c.author = map.get(c.user_id) ?? null));
    }
    setComments(list);
  };

  useEffect(() => { if (showComments) loadComments(); /* eslint-disable-next-line */ }, [showComments]);

  const setReaction = async (r: ReactionKey | null) => {
    if (!user) return;
    const previous = myReaction;
    setMyReaction(r); // optimistic
    setReactions((cur) => {
      const without = cur.filter((x) => x.user_id !== user.id);
      return r ? [...without, { reaction: r, user_id: user.id }] : without;
    });
    if (!r) {
      const { error } = await supabase.from("post_reactions").delete()
        .eq("post_id", post.id).eq("user_id", user.id);
      if (error) { toast.error("Couldn't remove reaction"); setMyReaction(previous); }
      return;
    }
    const { error } = await supabase.from("post_reactions").upsert(
      { post_id: post.id, user_id: user.id, reaction: r },
      { onConflict: "post_id,user_id" }
    );
    if (error) { toast.error("Couldn't react"); setMyReaction(previous); }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    setPosting(true);
    const { data, error } = await supabase.from("post_comments")
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
      .select().single();
    setPosting(false);
    if (error) { toast.error("Couldn't comment"); return; }
    setNewComment("");
    setComments((p) => [...p, { ...(data as Comment), author: { display_name: user.user_metadata?.full_name ?? "You", avatar_url: null } }]);
  };

  const deleteComment = async (c: Comment) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", c.id);
    if (error) return toast.error("Couldn't delete");
    setComments((p) => p.filter((x) => x.id !== c.id));
  };

  const toggleHideComment = async (c: Comment) => {
    const { error } = await supabase.from("post_comments").update({ is_hidden: !c.is_hidden }).eq("id", c.id);
    if (error) return toast.error("Couldn't update");
    setComments((p) => p.map((x) => x.id === c.id ? { ...x, is_hidden: !c.is_hidden } : x));
  };

  const deletePost = async () => {
    setBusy(true);
    const { error } = await supabase.from("journal_posts").delete().eq("id", post.id);
    setBusy(false);
    if (error) return toast.error("Couldn't delete");
    toast.success("Post deleted");
    onChanged();
  };

  const togglePostHidden = async () => {
    const { error } = await supabase.from("journal_posts")
      .update({ is_hidden: !post.is_hidden }).eq("id", post.id);
    if (error) return toast.error("Couldn't update");
    toast.success(post.is_hidden ? "Post visible again" : "Post hidden from others");
    onChanged();
  };

  const blockUser = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_blocks")
      .insert({ blocker_id: user.id, blocked_id: post.user_id });
    if (error && !error.message.includes("duplicate")) return toast.error("Couldn't block");
    toast.success("User blocked. You won't see their posts.");
    onChanged();
  };

  // Group reactions by type
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] ?? 0) + 1; return acc;
  }, {});
  const topReactions = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const AudienceIcon = audienceIcon[post.audience];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Avatar className="w-10 h-10 ring-2 ring-accent/30">
          <AvatarImage src={post.author?.avatar_url ?? undefined} />
          <AvatarFallback>{post.author?.display_name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate">{post.author?.display_name ?? "Movie Lover"}</span>
            {post.is_hidden && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">hidden</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AudienceIcon className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            {post.movie_title && (
              <>
                <span>·</span>
                <span className="font-handwritten text-accent text-sm">{post.movie_title}</span>
              </>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-full hover:bg-secondary" aria-label="More">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner ? (
              <>
                <DropdownMenuItem onClick={togglePostHidden}>
                  {post.is_hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  {post.is_hidden ? "Unhide post" : "Hide from others"}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={deletePost} disabled={busy}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <DropdownMenuItem onClick={blockUser} className="text-destructive">
                <Shield className="w-4 h-4 mr-2" /> Block user
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm sm:text-base whitespace-pre-line text-foreground/90">{post.content}</p>
      )}

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className={`grid gap-1 ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.media_urls.map((m, i) => (
            <div key={i} className="bg-black/5 aspect-video">
              {m.type === "image"
                ? <img src={m.url} className="w-full h-full object-cover" loading="lazy" />
                : <video src={m.url} className="w-full h-full object-cover" controls playsInline />}
            </div>
          ))}
        </div>
      )}

      {/* Reactions summary + picker */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border/60 bg-background/40">
        <div className="flex items-center gap-1 flex-wrap">
          {topReactions.length === 0 ? (
            <span className="text-xs text-muted-foreground font-handwritten">Be the first to react</span>
          ) : (
            <>
              {topReactions.map(([k, n]) => (
                <ReactionStamp key={k} reaction={k as ReactionKey} count={n} size={18}
                  onClick={() => setReaction(myReaction === k ? null : (k as ReactionKey))}
                  active={myReaction === k}
                />
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-xs text-muted-foreground hover:text-foreground px-1">
                    See all
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 max-h-72 overflow-y-auto">
                  <ReactionList postId={post.id} />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-secondary">
                <Smile className="w-4 h-4" /> React
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none">
              <ReactionPicker selected={myReaction} onPick={setReaction} />
            </PopoverContent>
          </Popover>
          <button
            onClick={() => setShowComments((p) => !p)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-secondary"
          >
            <MessageCircle className="w-4 h-4" /> {comments.length || ""} Comment
          </button>
        </div>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No comments yet.</p>}
              {comments.map((c) => {
                const isAuthor = c.user_id === user?.id;
                const canModerate = isOwner || isAuthor;
                if (c.is_hidden && !canModerate) return null;
                return (
                  <div key={c.id} className={`flex gap-2 group ${c.is_hidden ? "opacity-50" : ""}`}>
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={c.author?.avatar_url ?? undefined} />
                      <AvatarFallback>{c.author?.display_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary/60 rounded-xl px-3 py-1.5">
                        <div className="text-xs font-medium">{c.author?.display_name ?? "Movie Lover"}</div>
                        <div className="text-sm whitespace-pre-line break-words">{c.content}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 pl-2">
                        <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        {c.is_hidden && <span className="italic">hidden by owner</span>}
                        {isOwner && !isAuthor && (
                          <button onClick={() => toggleHideComment(c)} className="hover:text-foreground">
                            {c.is_hidden ? "Unhide" : "Hide"}
                          </button>
                        )}
                        {canModerate && (
                          <button onClick={() => deleteComment(c)} className="hover:text-destructive">Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {user && (
              <div className="flex items-center gap-2 p-3 border-t border-border/60">
                <Input
                  value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a kind comment…"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                />
                <Button size="sm" variant="warm" onClick={submitComment} disabled={posting || !newComment.trim()}>
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function ReactionList({ postId }: { postId: string }) {
  const [rows, setRows] = useState<{ reaction: ReactionKey; user_id: string; profile?: { display_name: string | null; avatar_url: string | null } }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("post_reactions").select("reaction,user_id").eq("post_id", postId);
      const list = (data ?? []) as any[];
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids);
        const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
        list.forEach((r) => (r.profile = map.get(r.user_id)));
      }
      setRows(list);
    })();
  }, [postId]);
  if (rows.length === 0) return <p className="text-xs text-muted-foreground p-2">No reactions yet.</p>;
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.user_id + r.reaction} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary">
          <Avatar className="w-7 h-7">
            <AvatarImage src={r.profile?.avatar_url ?? undefined} />
            <AvatarFallback>{r.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm flex-1 truncate">{r.profile?.display_name ?? "Movie Lover"}</span>
          <ReactionStamp reaction={r.reaction} size={16} />
        </div>
      ))}
    </div>
  );
}
