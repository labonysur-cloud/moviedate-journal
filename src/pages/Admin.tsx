import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import {
  ShieldCheck,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  Film,
  Search,
  UserPlus,
  X,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMovies } from "@/hooks/useMovies";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilmReelIcon } from "@/components/icons/CinemaIcons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  created_at: string | null;
}

const formatDate = (iso?: string | null, withTime = false) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { movies, deleteMovie, loading: moviesLoading } = useMovies();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [movieSearch, setMovieSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc("admin_list_profiles").then(({ data, error }) => {
      if (error) {
        toast({
          title: "Couldn't load members",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setProfiles((data as ProfileRow[]) || []);
      }
      setProfilesLoading(false);
    });
  }, [isAdmin, toast]);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.user_id, p])),
    [profiles]
  );

  const movieCountByUser = useMemo(
    () =>
      movies.reduce<Record<string, number>>((acc, m) => {
        acc[m.added_by] = (acc[m.added_by] || 0) + 1;
        return acc;
      }, {}),
    [movies]
  );

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
        prev.map((row) =>
          row.user_id === p.user_id ? { ...row, is_blocked: !row.is_blocked } : row
        )
      );
      toast({
        title: !p.is_blocked ? "User blocked" : "User unblocked",
        description: p.display_name,
      });
    }
    setUpdating(null);
  };

  const sendFriendRequest = async (target: ProfileRow) => {
    if (!user) return;
    if (target.user_id === user.id) {
      toast({ title: "That's you!", description: "You can't friend yourself." });
      return;
    }
    setConnecting(true);
    const { data: existing } = await supabase
      .from("friend_requests")
      .select("id, status")
      .or(
        `and(from_user.eq.${user.id},to_user.eq.${target.user_id}),and(from_user.eq.${target.user_id},to_user.eq.${user.id})`
      )
      .limit(1);

    if (existing && existing.length > 0) {
      toast({
        title: "Already connected",
        description: `Request already ${existing[0].status}.`,
      });
      setConnecting(false);
      return;
    }

    const { error } = await supabase
      .from("friend_requests")
      .insert({ from_user: user.id, to_user: target.user_id, status: "pending" });

    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Request sent",
        description: `${target.display_name} will see your invite.`,
      });
    }
    setConnecting(false);
  };

  const filteredProfiles = profiles.filter((p) =>
    p.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredMovies = movies.filter((m) => {
    const q = movieSearch.toLowerCase();
    if (!q) return true;
    const uploader = profileMap.get(m.added_by);
    return (
      m.title.toLowerCase().includes(q) ||
      (m.genre || "").toLowerCase().includes(q) ||
      (m.year || "").toLowerCase().includes(q) ||
      (uploader?.display_name || "").toLowerCase().includes(q)
    );
  });

  const openUser = openUserId ? profileMap.get(openUserId) : null;
  const openUserMovies = openUserId
    ? movies.filter((m) => m.added_by === openUserId)
    : [];

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
            <h2 className="font-display text-xl font-semibold">
              Members <span className="text-muted-foreground text-sm font-normal">({profiles.length})</span>
            </h2>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {profilesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredProfiles.map((p) => (
                <li
                  key={p.user_id}
                  className="flex items-center gap-3 py-3 group"
                >
                  <button
                    onClick={() => setOpenUserId(p.user_id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
                  >
                    <div className="w-11 h-11 rounded-full bg-secondary border-2 border-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-primary">
                          {p.display_name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition">
                        {p.display_name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-handwritten">
                          {movieCountByUser[p.user_id] || 0} movie
                          {(movieCountByUser[p.user_id] || 0) === 1 ? "" : "s"} added
                        </span>
                        {p.created_at && (
                          <span className="font-handwritten">
                            · joined {formatDate(p.created_at)}
                          </span>
                        )}
                        {p.is_blocked && (
                          <span className="text-destructive font-handwritten">
                            · blocked
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
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
              {filteredProfiles.length === 0 && (
                <li className="py-8 text-center text-muted-foreground text-sm">
                  No members found.
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Movies */}
        <section className="bg-card rounded-2xl border-2 border-primary/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Marquee Movies{" "}
              <span className="text-muted-foreground text-sm font-normal">
                ({filteredMovies.length}/{movies.length})
              </span>
            </h2>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search title, genre, year, uploader…"
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {moviesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading movies…
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {filteredMovies.map((m) => {
                const uploader = profileMap.get(m.added_by);
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
                      <button
                        onClick={() => uploader && setOpenUserId(uploader.user_id)}
                        className="flex items-center gap-1.5 mt-1 hover:opacity-80 transition"
                      >
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
                          · <span className="font-handwritten">{formatDate(m.created_at, true)}</span>
                        </span>
                      </button>
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
              {filteredMovies.length === 0 && (
                <li className="col-span-full py-8 text-center text-muted-foreground text-sm">
                  No movies match that search.
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* Member detail sheet */}
      <Sheet open={!!openUserId} onOpenChange={(o) => !o && setOpenUserId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {openUser && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                    {openUser.avatar_url ? (
                      <img
                        src={openUser.avatar_url}
                        alt={openUser.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-primary text-2xl">
                        {openUser.display_name?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="font-display text-xl truncate">
                      {openUser.display_name}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-1 text-xs">
                      <Calendar className="w-3 h-3" />
                      Joined {formatDate(openUser.created_at)}
                      {openUser.is_blocked && (
                        <span className="ml-2 text-destructive font-handwritten">
                          · blocked
                        </span>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="warm"
                  onClick={() => sendFriendRequest(openUser)}
                  disabled={connecting || openUser.user_id === user?.id}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  {openUser.user_id === user?.id ? "That's you" : "Send friend request"}
                </Button>
                <Button
                  size="sm"
                  variant={openUser.is_blocked ? "outline" : "destructive"}
                  onClick={() => toggleBlock(openUser)}
                  disabled={updating === openUser.user_id}
                >
                  {openUser.is_blocked ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Unblock
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-1.5" /> Block
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" />
                  Movies added ({openUserMovies.length})
                </h3>
                {openUserMovies.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-handwritten py-4">
                    This member hasn't added any movies yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openUserMovies.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-border bg-secondary/30"
                      >
                        <img
                          src={m.poster || "/placeholder.svg"}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded border border-primary/10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.genre} · {m.year}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-handwritten">
                            added {formatDate(m.created_at, true)}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete movie"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove "{m.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the movie for everyone.
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
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
