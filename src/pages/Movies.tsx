import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Film, X, Star, ExternalLink, Play, Ticket, Users, Sparkles, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMovies, type Movie } from "@/hooks/useMovies";
import { useTickets } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { ClapperboardIcon } from "@/components/icons/CinemaIcons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  const { movies, loading, addMovie } = useMovies();
  const { hasTicketForMovie } = useTickets();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "", totalSeasons: "" });
  const [autofilling, setAutofilling] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showRecs, setShowRecs] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [addingRec, setAddingRec] = useState<string | null>(null);
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
        embedUrl: data.embed_url || (isLink ? input : prev.embedUrl),
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
      const { data, error } = await supabase.functions.invoke("movie-ai", {
        body: { action: "recommend", mood, movies: movies.slice(0, 20) },
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
    await addMovie({
      title: rec.title,
      genre: rec.genre,
      year: rec.year,
      description: rec.description,
      rating: rec.rating,
    });
    toast({ title: `${rec.emoji} Added!`, description: `"${rec.title}" added to your collection` });
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
    });
    setForm({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "", totalSeasons: "" });
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
            <Button variant="warm" size="sm" onClick={() => { setShowForm(!showForm); setShowRecs(false); }}>
              {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showForm ? "Cancel" : "Add Movie"}
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

        {/* Add Movie Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 sm:mb-10"
            >
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 max-w-lg">
                <h3 className="font-display text-lg font-semibold text-foreground">Add a new movie</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Movie or show title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAutoFill}
                    disabled={autofilling || !form.title}
                    className="whitespace-nowrap"
                  >
                    {autofilling ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-1" />
                    )}
                    <span className="hidden sm:inline">Auto-fill</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Input placeholder="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
                  <Input placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Input placeholder="Rating (e.g. 8.5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                  <Input placeholder="Poster image URL" value={form.poster} onChange={(e) => setForm({ ...form, poster: e.target.value })} />
                </div>
                <Input placeholder="Watch URL (optional)" value={form.watchUrl} onChange={(e) => setForm({ ...form, watchUrl: e.target.value })} />
                <Input placeholder="Embed URL for in-app playback (optional)" value={form.embedUrl} onChange={(e) => setForm({ ...form, embedUrl: e.target.value })} />
                <Textarea placeholder="Short description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Button variant="ticket" onClick={handleAdd}>
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
                                    .select()
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
