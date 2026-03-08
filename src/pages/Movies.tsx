import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Film, X, Star, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMovies, addMovie, type Movie } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import posterGilmoreGirls from "@/assets/poster-gilmore-girls.jpg";
import posterStrangerThings from "@/assets/poster-stranger-things.jpg";
import posterMeanGirls from "@/assets/poster-mean-girls.jpg";

const posterMap: Record<string, string> = {
  "Gilmore Girls": posterGilmoreGirls,
  "Stranger Things": posterStrangerThings,
  "Mean Girls": posterMeanGirls,
};

function getMoviePoster(movie: Movie): string {
  return posterMap[movie.title] || movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop";
}

export default function Movies() {
  const [movies, setMovies] = useState<Movie[]>(getMovies);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", genre: "", year: "", description: "", poster: "", addedBy: "", watchUrl: "" });
  const navigate = useNavigate();

  const handleAdd = () => {
    if (!form.title) return;
    const movie = addMovie({
      ...form,
      poster: form.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
    });
    setMovies((prev) => [...prev, movie]);
    setForm({ title: "", genre: "", year: "", description: "", poster: "", addedBy: "", watchUrl: "" });
    setShowForm(false);
  };

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
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Genre"
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  />
                  <Input
                    placeholder="Year"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Poster image URL (optional)"
                  value={form.poster}
                  onChange={(e) => setForm({ ...form, poster: e.target.value })}
                />
                <Input
                  placeholder="MovieBox or watch URL (optional)"
                  value={form.watchUrl}
                  onChange={(e) => setForm({ ...form, watchUrl: e.target.value })}
                />
                <Input
                  placeholder="Added by"
                  value={form.addedBy}
                  onChange={(e) => setForm({ ...form, addedBy: e.target.value })}
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
          {movies.map((movie, i) => (
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
                  
                  {/* Rating badge */}
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
                    <span>{movie.year} · Added by {movie.addedBy}</span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    {movie.embedUrl ? (
                      <Button
                        variant="ticket"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/watch?url=${encodeURIComponent(movie.embedUrl!)}&title=${encodeURIComponent(movie.title)}${movie.totalSeasons ? `&seasons=${movie.totalSeasons}` : ""}`)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Watch Now
                      </Button>
                    ) : movie.watchUrl ? (
                      <a
                        href={movie.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="ticket" size="sm" className="w-full">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Watch on MovieBox
                        </Button>
                      </a>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/tickets?movie=${encodeURIComponent(movie.title)}`)}
                    >
                      Get Ticket
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
