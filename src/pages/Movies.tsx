import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Film, X, Star, ExternalLink, Play, Ticket, Users, Sparkles, Wand2, Loader2, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useMovies, type Movie } from "@/hooks/useMovies";
import { useTickets } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { ClapperboardIcon } from "@/components/icons/CinemaIcons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CardGridSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";


function getMoviePoster(movie: Movie): string {
  return movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop";
}

const moodOptions = [
  { label: "😂 Something funny", value: "comedy, lighthearted, fun" },
  { label: "😭 Make me cry", value: "emotional, drama, tearjerker" },
  { label: "🍿 Action-packed", value: "action, thriller, exciting" },
  { label: "🥰 Romantic", value: "romance, love story, heartwarming" },
  { label: "🤯 Mind-bending", value: "sci-fi, thriller, mind-bending" },
  { label: "😴 Cozy vibes", value: "cozy, feel-good, comfort movie" },
];

interface Recommendation {
  title: string;
  genre: string;
  year: string;
  description: string;
  rating: string;
  emoji: string;
}

export default function Movies() {
  const { movies, loading, addMovie, deleteMovie, updateMovie } = useMovies();
  const { hasTicketForMovie } = useTickets();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "", totalSeasons: "" });
  const [autofilling, setAutofilling] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showRecs, setShowRecs] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [addingRec, setAddingRec] = useState<string | null>(null);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [editForm, setEditForm] = useState({ title: "", genre: "", year: "", description: "", poster: "", embedUrl: "", rating: "", totalSeasons: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (m: Movie) => {
    setEditing(m);
    setEditForm({
      title: m.title || "",
      genre: m.genre || "",
      year: m.year || "",
      description: m.description || "",
      poster: m.poster || "",
      embedUrl: m.embed_url || "",
      rating: m.rating || "",
      totalSeasons: m.total_seasons ? String(m.total_seasons) : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const ok = await updateMovie(editing.id, {
      title: editForm.title,
      genre: editForm.genre || "Movie",
      year: editForm.year,
      description: editForm.description || null,
      poster: editForm.poster || null,
      embed_url: editForm.embedUrl || null,
      rating: editForm.rating || null,
      total_seasons: editForm.totalSeasons ? parseInt(editForm.totalSeasons) : null,
    });
    setSavingEdit(false);
    if (ok) setEditing(null);
  };
  const navigate = useNavigate();
  const { toast } = useToast();

  const isUrl = (str: string) => /^https?:\/\//i.test(str.trim()) || /^www\./i.test(str.trim());

  const handleSmartAutoFill = async () => {
    const input = linkInput.trim();
    if (!input) return;
    setAutofilling(true);
    try {
      const isLink = isUrl(input);
      const { data, error } = await supabase.functions.invoke("movie-ai", {
        body: isLink
          ? { action: "autofill_from_url", url: input, title: form.title }
          : { action: "autofill", title: input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        genre: data.genre || prev.genre,
        year: data.year || prev.year,
        description: data.description || prev.description,
        rating: data.rating || prev.rating,
        poster: data.poster || prev.poster,
        embedUrl: data.embed_url || (isLink ? input : "") || prev.embedUrl,
        totalSeasons: data.total_seasons ? String(data.total_seasons) : prev.totalSeasons,
      }));
      setShowForm(true);
      toast({ title: "✨ Found it!", description: `Filled in details for "${data.title || input}"` });
    } catch (err: any) {
      toast({ title: "Couldn't identify", description: err.message || "Try entering details manually", variant: "destructive" });
      if (!isUrl(input)) {
        setForm((prev) => ({ ...prev, title: input }));
      }
      setShowForm(true);
    }
    setAutofilling(false);
  };

  const handleGetRecs = async (mood: string) => {
    setRecsLoading(true);
    setRecs([]);
    try {
      // Pull personalization signals in parallel
      const [ticketsRes, journalRes] = await Promise.all([
        user
          ? supabase.from("tickets").select("movie_title, genre").eq("user_id", user.id).limit(30)
          : Promise.resolve({ data: [] as any[] }),
        user
          ? supabase.from("journal_entries").select("movie_title, mood, content").eq("user_id", user.id).limit(20)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const collection = movies.slice(0, 30).map((m) => ({ title: m.title, genre: m.genre, year: m.year }));
      const exclude = movies.map((m) => m.title);

      const { data, error } = await supabase.functions.invoke("movie-ai", {
        body: {
          action: "recommend",
          mood,
          movies: collection,
          booked: ticketsRes.data || [],
          journaled: journalRes.data || [],
          exclude,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecs(data.recommendations || []);
    } catch (err: any) {
      toast({ title: "Couldn't get recommendations", description: err.message, variant: "destructive" });
    }
    setRecsLoading(false);
  };

  const handleAddRec = async (rec: Recommendation) => {
    setAddingRec(rec.title);
    // Pre-fill form with recommendation data immediately
    setForm({
      title: rec.title,
      genre: rec.genre,
      year: rec.year,
      description: rec.description,
      poster: "",
      watchUrl: "",
      embedUrl: "",
      rating: rec.rating,
      totalSeasons: "",
    });
    setShowRecs(false);
    setShowForm(true);
    // In parallel: ask AI for metadata + server-side search for a REAL free link
    try {
      const [autofillRes, linkRes] = await Promise.all([
        supabase.functions.invoke("movie-ai", {
          body: { action: "autofill", title: rec.title },
        }),
        supabase.functions.invoke("movie-ai", {
          body: { action: "find_free_link", title: rec.title, year: rec.year },
        }),
      ]);
      const meta = !autofillRes.error && !autofillRes.data?.error ? autofillRes.data : null;
      const link = !linkRes.error && linkRes.data?.embed_url ? linkRes.data : null;

      // Priority: Hindi-dubbed. If not available, ask user before attaching original (with subs).
      let chosenEmbed = "";
      let toastDesc = "No free link found automatically — paste one or add manually";
      if (link?.dubbed) {
        chosenEmbed = link.embed_url;
        toastDesc = "🇮🇳 Hindi-dubbed free link attached — review and Add";
      } else if (link?.embed_url) {
        const ok = window.confirm(
          `No Hindi-dubbed version of "${rec.title}" was found.\n\nWould you like to add the original version with English / Bengali subtitles instead?`
        );
        if (ok) {
          chosenEmbed = link.embed_url;
          toastDesc =
            link.source === "archive.org"
              ? "Original version (ad-free Archive.org, subtitles available) attached"
              : "Original version with subtitles attached — review and Add";
        } else {
          toastDesc = "Skipped link — you can paste one manually";
        }
      } else if (meta?.embed_url) {
        chosenEmbed = meta.embed_url;
        toastDesc = "Trailer/free link attached — review and Add";
      }

      setForm((prev) => ({
        ...prev,
        poster: meta?.poster || prev.poster,
        embedUrl: chosenEmbed || prev.embedUrl,
        description: prev.description || meta?.description || "",
        totalSeasons: meta?.total_seasons ? String(meta.total_seasons) : prev.totalSeasons,
      }));

      toast({ title: `${rec.emoji} Ready to add!`, description: toastDesc });
    } catch {
      // non-fatal — user can still edit & add
    }
    setAddingRec(null);
  };

  const handleAdd = async () => {
    if (!form.title) return;
    await addMovie({
      title: form.title,
      genre: form.genre || "Movie",
      year: form.year || new Date().getFullYear().toString(),
      description: form.description || undefined,
      poster: form.poster || undefined,
      watch_url: form.watchUrl || undefined,
      embed_url: form.embedUrl || undefined,
      rating: form.rating || undefined,
      total_seasons: form.totalSeasons ? parseInt(form.totalSeasons) : undefined,
    });
    setForm({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "", totalSeasons: "" });
    setLinkInput("");
    setShowForm(false);
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Our Movies</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">The collection we're building together 🍿</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowRecs(!showRecs); setShowForm(false); }}>
              <Sparkles className="w-4 h-4 mr-1" />
              {showRecs ? "Hide" : "AI Suggest"}
            </Button>
          </div>
        </div>

        {/* AI Recommendations */}
        <AnimatePresence>
          {showRecs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 sm:mb-10"
            >
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  What are you in the mood for?
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => handleGetRecs(mood.value)}
                      disabled={recsLoading}
                      className="text-sm px-3 sm:px-4 py-2 rounded-full border border-border bg-secondary hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50"
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>

                {recsLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Finding movies for you...</span>
                  </div>
                )}

                {recs.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recs.map((rec) => (
                      <div key={rec.title} className="bg-secondary/50 rounded-xl p-4 border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-display font-semibold text-foreground">
                            {rec.emoji} {rec.title}
                          </h4>
                          <span className="text-xs text-muted-foreground">{rec.year}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{rec.genre} · ⭐ {rec.rating}</p>
                        <p className="text-sm text-foreground/80 mb-3">{rec.description}</p>
                        <Button
                          variant="warm"
                          size="sm"
                          className="w-full"
                          disabled={addingRec === rec.title}
                          onClick={() => handleAddRec(rec)}
                        >
                          {addingRec === rec.title ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3 mr-1" />
                          )}
                          Add to Collection
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!showForm && !showRecs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 sm:mb-10"
            >
              <div className="bg-card rounded-2xl p-4 sm:p-6 border-2 border-primary/10 max-w-lg mx-auto text-center">
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">Add a movie ♡</h3>
                <p className="text-sm text-muted-foreground mb-4">Paste a link or type a title — AI will figure out the rest!</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste a movie link or type a title..."
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSmartAutoFill()}
                    className="flex-1"
                  />
                  <Button
                    variant="warm"
                    onClick={handleSmartAutoFill}
                    disabled={autofilling || !linkInput.trim()}
                  >
                    {autofilling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs text-muted-foreground hover:text-primary mt-3 underline underline-offset-2"
                >
                  Or add manually
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editable Movie Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 sm:mb-10"
            >
              <div className="bg-card rounded-2xl p-4 sm:p-6 border-2 border-primary/10 space-y-4 max-w-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">Movie details</h3>
                  <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setForm({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "", totalSeasons: "" }); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {form.poster && (
                  <div className="flex justify-center">
                    <img src={form.poster} alt={form.title} className="h-32 rounded-xl object-cover border-2 border-primary/10 shadow-md" />
                  </div>
                )}
                <Input placeholder="Movie or show title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
                  <Input placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Rating (e.g. 8.5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                  <Input placeholder="Poster image URL" value={form.poster} onChange={(e) => setForm({ ...form, poster: e.target.value })} />
                </div>
                <Input placeholder="Watch / Embed URL (optional)" value={form.embedUrl} onChange={(e) => setForm({ ...form, embedUrl: e.target.value })} />
                <Textarea placeholder="Short description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Button variant="ticket" onClick={handleAdd} disabled={!form.title}>
                  <Film className="w-4 h-4 mr-1" />
                  Add to Collection
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movie Grid */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : movies.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No movies yet..."
            description="Add your first movie to get started! 🎬"
            actionLabel="Add Movie"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {movies.map((movie, i) => {
              const hasTicket = hasTicketForMovie(movie.id);
              return (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="group"
                >
                  <div className="bg-card rounded-2xl border border-border overflow-hidden hover:border-accent hover:shadow-lg transition-all">
                    <div className="aspect-[2/3] relative overflow-hidden">
                      <img
                        src={getMoviePoster(movie)}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      
                      {movie.rating && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-card/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 text-accent fill-accent" />
                          <span className="text-xs font-bold text-foreground">{movie.rating}</span>
                        </div>
                      )}

                      {(user?.id === movie.added_by || isAdmin) && (
                        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            aria-label="Edit movie"
                            onClick={() => openEdit(movie)}
                            className="p-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                aria-label="Delete movie"
                                className="p-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{movie.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the movie from the shared collection. This action can't be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMovie(movie.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                      {false && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              aria-label="Delete movie"
                              className="absolute top-3 left-3 p-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{movie.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the movie from the shared collection. This action can't be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteMovie(movie.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <span className="text-xs bg-accent/90 text-accent-foreground px-2 py-1 rounded-full font-medium">
                          {movie.genre}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{movie.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{movie.description}</p>
                      <div className="flex items-center justify-between mt-2 sm:mt-3 text-xs text-muted-foreground">
                        <span>{movie.year}</span>
                      </div>
                      
                      <div className="flex gap-2 mt-3 sm:mt-4">
                        {hasTicket ? (
                          <>
                            {movie.embed_url ? (
                              <Button
                                variant="ticket"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                  navigate(
                                    `/watch?url=${encodeURIComponent(movie.embed_url!)}&title=${encodeURIComponent(movie.title)}${movie.total_seasons ? `&seasons=${movie.total_seasons}` : ""}`
                                  )
                                }
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Watch
                              </Button>
                            ) : movie.watch_url ? (
                              <a href={movie.watch_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button variant="ticket" size="sm" className="w-full">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Watch
                                </Button>
                              </a>
                            ) : (
                              <Button variant="outline" size="sm" className="flex-1" disabled>
                                <Star className="w-3 h-3 mr-1" /> Ticket Ready
                              </Button>
                            )}
                            {movie.embed_url && (
                              <Button
                                variant="warm"
                                size="sm"
                                onClick={async () => {
                                  if (!user) return;
                                  const { data } = await supabase
                                    .from("watch_rooms")
                                    .insert({
                                      movie_id: movie.id,
                                      movie_title: movie.title,
                                      embed_url: movie.embed_url,
                                      host_id: user.id,
                                    })
                                    .select("id")
                                    .single();
                                  if (data) navigate(`/watch-together?room=${data.id}`);
                                }}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Together</span>
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="warm"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/tickets?movie=${encodeURIComponent(movie.title)}`)}
                          >
                            <Ticket className="w-3 h-3 mr-1" />
                            Get Ticket First
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
