import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Film, X, Star, ExternalLink, Play, Ticket, Users } from "lucide-react";
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

function getMoviePoster(movie: Movie): string {
  return movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop";
}

export default function Movies() {
  const { movies, loading, addMovie } = useMovies();
  const { hasTicketForMovie } = useTickets();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "" });
  const [classifying, setClassifying] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAutoClassify = async () => {
    if (!form.title) return;
    setClassifying(true);
    try {
      const { data } = await supabase.functions.invoke("generate-ticket", {
        body: {
          title: form.title,
          genre: form.genre,
          year: form.year,
          description: form.description,
          type: "classify",
        },
      });
      if (data?.category) {
        setForm((prev) => ({ ...prev, genre: data.category }));
        toast({ title: `${data.emoji || "🎬"} Classified!`, description: `Category: ${data.category}` });
      }
    } catch {
      toast({ title: "Couldn't classify", description: "Enter genre manually", variant: "destructive" });
    }
    setClassifying(false);
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
    setForm({ title: "", genre: "", year: "", description: "", poster: "", watchUrl: "", embedUrl: "", rating: "" });
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClapperboardIcon className="w-12 h-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Our Movies</h1>
            <p className="text-muted-foreground mt-1">The collection we're building together 🍿</p>
          </div>
          <Button variant="warm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? "Cancel" : "Add Movie"}
          </Button>
        </div>

        {/* Add Movie Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-10"
            >
              <div className="bg-card rounded-2xl p-6 border border-border space-y-4 max-w-lg">
                <h3 className="font-display text-lg font-semibold text-foreground">Add a new movie</h3>
                <Input
                  placeholder="Movie title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Genre"
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoClassify}
                    disabled={classifying || !form.title}
                    className="text-xs whitespace-nowrap"
                  >
                    {classifying ? "🤖 ..." : "🤖 Auto-classify"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Year"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                  <Input
                    placeholder="Rating (e.g. 8.5)"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Poster image URL (optional)"
                  value={form.poster}
                  onChange={(e) => setForm({ ...form, poster: e.target.value })}
                />
                <Input
                  placeholder="Watch URL (optional)"
                  value={form.watchUrl}
                  onChange={(e) => setForm({ ...form, watchUrl: e.target.value })}
                />
                <Input
                  placeholder="Embed URL for in-app playback (optional)"
                  value={form.embedUrl}
                  onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
                />
                <Textarea
                  placeholder="Short description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Button variant="ticket" onClick={handleAdd}>
                  <Film className="w-4 h-4 mr-1" />
                  Add to Collection
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movie Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold text-foreground">{movie.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{movie.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>{movie.year}</span>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
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
                              Together
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

        {movies.length === 0 && (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-lg">No movies yet...</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first movie to get started! 🎬</p>
          </div>
        )}
      </div>
    </div>
  );
}
