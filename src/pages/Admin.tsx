import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { ShieldCheck, Ban, CheckCircle2, Trash2, Loader2, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMovies } from "@/hooks/useMovies";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilmReelIcon } from "@/components/icons/CinemaIcons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_blocked: boolean;
}

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { movies, deleteMovie, loading: moviesLoading } = useMovies();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_blocked")
      .order("display_name")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Couldn't load users", description: error.message, variant: "destructive" });
        } else {
          setProfiles(data || []);
        }
        setProfilesLoading(false);
      });
  }, [isAdmin, toast]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FilmReelIcon className="w-16 h-16" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const toggleBlock = async (p: ProfileRow) => {
    setUpdating(p.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !p.is_blocked })
      .eq("user_id", p.user_id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    } else {
      setProfiles((prev) =>
        prev.map((row) => (row.user_id === p.user_id ? { ...row, is_blocked: !row.is_blocked } : row))
      );
      toast({
        title: !p.is_blocked ? "User blocked" : "User unblocked",
        description: p.display_name,
      });
    }
    setUpdating(null);
  };

  const filtered = profiles.filter((p) =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-2xl bg-primary/10 border-2 border-primary/20">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Admin Parlour
            </h1>
            <p className="text-sm text-muted-foreground font-handwritten text-base">
              Tend the cozy cinema — manage members &amp; the marquee.
            </p>
          </div>
        </motion.div>

        {/* Users */}
        <section className="bg-card rounded-2xl border-2 border-primary/10 p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold">Members</h2>
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-64"
            />
          </div>

          {profilesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((p) => (
                <li key={p.user_id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary/10 overflow-hidden flex items-center justify-center">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-primary">{p.display_name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.display_name}</p>
                    {p.is_blocked && (
                      <span className="text-xs text-destructive font-handwritten">currently blocked</span>
                    )}
                  </div>
                  <Button
                    variant={p.is_blocked ? "warm" : "outline"}
                    size="sm"
                    disabled={updating === p.user_id}
                    onClick={() => toggleBlock(p)}
                  >
                    {updating === p.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : p.is_blocked ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Unblock
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5 mr-1" /> Block
                      </>
                    )}
                  </Button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="py-8 text-center text-muted-foreground text-sm">No members found.</li>
              )}
            </ul>
          )}
        </section>

        {/* Movies */}
        <section className="bg-card rounded-2xl border-2 border-primary/10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Marquee Movies
            </h2>
            <span className="text-xs text-muted-foreground font-handwritten">
              {movies.length} on the marquee
            </span>
          </div>
          {moviesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading movies…
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {movies.map((m) => {
                const uploader = profileMap.get(m.added_by);
                const when = m.created_at
                  ? new Date(m.created_at).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—";
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/40"
                  >
                    <img
                      src={m.poster || "/placeholder.svg"}
                      alt={m.title}
                      className="w-12 h-16 object-cover rounded-md border border-primary/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.genre} · {m.year}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-4 h-4 rounded-full bg-secondary border border-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                          {uploader?.avatar_url ? (
                            <img
                              src={uploader.avatar_url}
                              alt={uploader.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] font-display text-primary">
                              {uploader?.display_name?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate">
                          by{" "}
                          <span className="font-medium text-foreground/80">
                            {uploader?.display_name || "Unknown"}
                          </span>{" "}
                          · <span className="font-handwritten">{when}</span>
                        </span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Delete movie">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove "{m.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the movie from the collection for everyone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMovie(m.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
