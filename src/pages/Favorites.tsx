import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, Heart, Play, Star, ExternalLink, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { CardGridSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import MovieFavoriteButton from "@/components/MovieFavoriteButton";
import DownloadMovieButton from "@/components/DownloadMovieButton";
import type { Movie } from "@/hooks/useMovies";

function getMoviePoster(movie: Movie): string {
  return movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop";
}

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasTicketForMovie } = useTickets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("movie_favorites")
      .select("movies(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading favorites:", error);
      setMovies([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMovies((data as any[]).map((row) => row.movies as Movie).filter(Boolean));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-primary text-primary" />
            My Favorites
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            The movies you have loved and saved
          </p>
        </div>

        {loading ? (
          <CardGridSkeleton count={6} />
        ) : movies.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            description="Start exploring movies and tap the heart to save your favorites here!"
            actionLabel="Browse Movies"
            onAction={() => navigate("/movies")}
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

                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <span className="text-xs bg-accent/90 text-accent-foreground px-2 py-1 rounded-full font-medium">
                          {movie.genre}
                        </span>
                        <MovieFavoriteButton movieId={movie.id} movieTitle={movie.title} />
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
                      {hasTicket && (
                        <div className="mt-2 flex justify-end">
                          <DownloadMovieButton
                            movieId={movie.id}
                            title={movie.title}
                            url={movie.watch_url || movie.embed_url}
                            poster={movie.poster}
                            compact
                          />
                        </div>
                      )}
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
