import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Liker {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  movieId: string;
  movieTitle: string;
  className?: string;
}

export default function MovieFavoriteButton({ movieId, movieTitle, className }: Props) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const [open, setOpen] = useState(false);
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("movie_favorites")
      .select("user_id")
      .eq("movie_id", movieId);
    const rows = data ?? [];
    setCount(rows.length);
    setLiked(!!user && rows.some((r) => r.user_id === user.id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, user?.id]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Sign in to favourite movies"); return; }
    setBusy(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("movie_favorites")
          .delete()
          .eq("movie_id", movieId)
          .eq("user_id", user.id);
        if (error) throw error;
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase
          .from("movie_favorites")
          .insert({ movie_id: movieId, user_id: user.id });
        if (error) throw error;
        setLiked(true);
        setCount((c) => c + 1);
        setPop(true);
        setTimeout(() => setPop(false), 400);
      }
      setLikers(null); // invalidate cached list
    } catch (err: any) {
      toast.error(err.message || "Couldn't update favourite");
    } finally {
      setBusy(false);
    }
  };

  const openLikers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count === 0) return;
    setOpen(true);
    if (likers) return;
    setLoadingLikers(true);
    const { data: favs } = await supabase
      .from("movie_favorites")
      .select("user_id, created_at")
      .eq("movie_id", movieId)
      .order("created_at", { ascending: false });
    const ids = (favs ?? []).map((f) => f.user_id);
    if (ids.length === 0) { setLikers([]); setLoadingLikers(false); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", ids);
    const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    setLikers(ids.map((id) => pmap.get(id) ?? { user_id: id, display_name: "Movie Lover", avatar_url: null }));
    setLoadingLikers(false);
  };

  return (
    <>
      <div className={cn("inline-flex items-center gap-1 rounded-full bg-card/85 backdrop-blur-sm border border-border shadow-sm", className)}>
        <button
          onClick={toggle}
          disabled={busy}
          aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          className="p-1.5 rounded-full hover:bg-primary/10 transition-transform active:scale-90"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Heart
              className={cn(
                "w-4 h-4 transition-all",
                liked ? "fill-primary text-primary" : "text-muted-foreground",
                pop && "animate-ping-once scale-125"
              )}
            />
          )}
        </button>
        <button
          onClick={openLikers}
          className="pr-2.5 pl-0.5 text-xs font-medium tabular-nums text-foreground hover:text-primary"
          aria-label={`${count} favourites — tap to see who`}
        >
          {count}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Heart className="w-4 h-4 fill-primary text-primary" />
              Loved "{movieTitle}"
            </DialogTitle>
            <DialogDescription>
              {count} {count === 1 ? "person has" : "people have"} added this to their favourites.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-1 mt-1">
            {loadingLikers ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (likers ?? []).map((l) => (
              <div key={l.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={l.avatar_url ?? undefined} />
                  <AvatarFallback>{(l.display_name ?? "?")[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{l.display_name ?? "Movie Lover"}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
