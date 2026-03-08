import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket as TicketIcon, Sparkles, Film, ChevronRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovies } from "@/hooks/useMovies";
import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import SeatPicker from "@/components/SeatPicker";
import TicketCard, { type TicketDisplayData } from "@/components/TicketCard";
import ShareTicketDialog from "@/components/ShareTicketDialog";
import { supabase } from "@/integrations/supabase/client";
import { ClapperboardIcon, PopcornIcon } from "@/components/icons/CinemaIcons";
import { useSearchParams } from "react-router-dom";

type BookingStep = "movie" | "seat" | "generating" | "done";

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const preselectedMovieTitle = searchParams.get("movie") || "";
  const { movies, loading: moviesLoading } = useMovies();
  const { tickets, loading: ticketsLoading, bookTicket, hasTicketForMovie } = useTickets();
  const { user } = useAuth();

  const [step, setStep] = useState<BookingStep>("movie");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("");
  const [aiData, setAiData] = useState<any>(null);
  const [newTicket, setNewTicket] = useState<TicketDisplayData | null>(null);

  // Share dialog state
  const [shareTicketId, setShareTicketId] = useState<string | null>(null);
  const [shareMovieTitle, setShareMovieTitle] = useState("");

  // Shared tickets received
  const [sharedTickets, setSharedTickets] = useState<TicketDisplayData[]>([]);

  useEffect(() => {
    if (preselectedMovieTitle && movies.length > 0) {
      const found = movies.find((m) => m.title === preselectedMovieTitle);
      if (found) setSelectedMovieId(found.id);
    }
  }, [preselectedMovieTitle, movies]);

  // Fetch shared tickets
  useEffect(() => {
    if (!user) return;
    const fetchShared = async () => {
      const { data } = await supabase
        .from("shared_tickets")
        .select("*, tickets(*)")
        .eq("shared_with", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const mapped: TicketDisplayData[] = data
          .filter((s: any) => s.tickets)
          .map((s: any) => {
            const t = s.tickets;
            const movie = movies.find((m: any) => m.id === t.movie_id);
            return {
              id: t.id,
              movieTitle: t.movie_title,
              date: t.date,
              time: t.time,
              seat: t.seat,
              genre: t.genre || "Movie",
              poster: movie?.poster,
              year: movie?.year,
              rating: movie?.rating,
              colorTheme: "coral",
              emoji: "🎁",
              tagline: "Shared with you by a friend!",
            };
          });
        setSharedTickets(mapped);
      }
    };
    if (movies.length > 0) fetchShared();
  }, [user, movies]);

  const selectedMovie = movies.find((m) => m.id === selectedMovieId);

  const handleSelectSeat = () => {
    if (!selectedMovieId) return;
    setStep("seat");
  };

  const handleBook = async () => {
    if (!selectedMovie || !selectedSeat) return;
    setStep("generating");

    let aiResult: any = null;
    try {
      const { data } = await supabase.functions.invoke("generate-ticket", {
        body: {
          title: selectedMovie.title,
          genre: selectedMovie.genre,
          year: selectedMovie.year,
          description: selectedMovie.description,
          type: "ticket",
        },
      });
      aiResult = data;
      setAiData(data);
    } catch {
      aiResult = {
        tagline: "Enjoy the show!",
        color_theme: "gold",
        emoji: "🎬",
        mood: "cozy",
        fun_fact: "Movie magic awaits!",
        suggested_snack: "Popcorn 🍿",
      };
      setAiData(aiResult);
    }

    const now = new Date();
    const ticketResult = await bookTicket({
      movie_id: selectedMovie.id,
      movie_title: selectedMovie.title,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      seat: selectedSeat,
      genre: selectedMovie.genre,
    });

    if (ticketResult) {
      setNewTicket({
        id: ticketResult.id,
        movieTitle: ticketResult.movie_title,
        date: ticketResult.date,
        time: ticketResult.time,
        seat: ticketResult.seat,
        genre: ticketResult.genre || "Movie",
        poster: selectedMovie.poster,
        year: selectedMovie.year,
        rating: selectedMovie.rating,
        colorTheme: aiResult?.color_theme || "gold",
        tagline: aiResult?.tagline,
        emoji: aiResult?.emoji || "🎬",
        mood: aiResult?.mood,
        funFact: aiResult?.fun_fact,
        suggestedSnack: aiResult?.suggested_snack,
      });
      setStep("done");
    } else {
      setStep("movie");
    }
  };

  const resetBooking = () => {
    setStep("movie");
    setSelectedMovieId("");
    setSelectedSeat("");
    setAiData(null);
    setNewTicket(null);
  };

  const openShareDialog = (ticketId: string, movieTitle: string) => {
    setShareTicketId(ticketId);
    setShareMovieTitle(movieTitle);
  };

  const ticketDisplayData: TicketDisplayData[] = tickets.map((t) => {
    const movie = movies.find((m) => m.id === t.movie_id);
    return {
      id: t.id,
      movieTitle: t.movie_title,
      date: t.date,
      time: t.time,
      seat: t.seat,
      genre: t.genre || "Movie",
      poster: movie?.poster,
      year: movie?.year,
      rating: movie?.rating,
      colorTheme: "gold",
      emoji: "🎬",
    };
  });

  if (moviesLoading || ticketsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClapperboardIcon className="w-12 h-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Movie Tickets</h1>
        <p className="text-muted-foreground mb-10">Grab your ticket before the show starts! 🎫</p>

        {/* Booking Flow */}
        <AnimatePresence mode="wait">
          {step === "movie" && (
            <motion.div
              key="movie"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card rounded-2xl p-6 border border-border mb-10"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Step 1: Choose Your Movie
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {movies.map((movie) => {
                  const alreadyHasTicket = hasTicketForMovie(movie.id);
                  return (
                    <button
                      key={movie.id}
                      onClick={() => !alreadyHasTicket && setSelectedMovieId(movie.id)}
                      disabled={alreadyHasTicket}
                      className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                        selectedMovieId === movie.id
                          ? "border-accent bg-accent/10 shadow-md"
                          : alreadyHasTicket
                          ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                          : "border-border hover:border-accent/50 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {movie.poster ? (
                          <img src={movie.poster} alt={movie.title} className="w-10 h-14 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-secondary flex items-center justify-center">
                            <Film className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-display font-semibold text-foreground text-sm">{movie.title}</p>
                          <p className="text-xs text-muted-foreground">{movie.genre} · {movie.year}</p>
                        </div>
                      </div>
                      {alreadyHasTicket && (
                        <span className="absolute top-1 right-1 text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                          ✓ Got ticket
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedMovieId && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <Button variant="warm" onClick={handleSelectSeat} className="w-full sm:w-auto">
                    Pick Your Seat <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "seat" && (
            <motion.div
              key="seat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card rounded-2xl p-6 border border-border mb-10"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <PopcornIcon className="w-5 h-5" />
                Step 2: Pick Your Seat
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Watching: <span className="font-semibold text-foreground">{selectedMovie?.title}</span>
              </p>
              <SeatPicker selectedSeat={selectedSeat} onSelect={setSelectedSeat} />
              {selectedSeat && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex gap-3">
                  <Button variant="outline" onClick={() => setStep("movie")}>Back</Button>
                  <Button variant="warm" onClick={handleBook} className="flex-1 sm:flex-none">
                    <TicketIcon className="w-4 h-4 mr-1" />
                    Generate My Ticket ✨
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl p-12 border border-border mb-10 text-center"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <ClapperboardIcon className="w-16 h-16 mx-auto" />
              </motion.div>
              <p className="font-display text-xl font-semibold text-foreground mt-4">Creating your magical ticket...</p>
              <p className="text-sm text-muted-foreground mt-2">Our AI is crafting something special ✨</p>
            </motion.div>
          )}

          {step === "done" && newTicket && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="mb-10 max-w-md mx-auto"
            >
              <TicketCard
                ticket={newTicket}
                isNew
                onShareWithFriend={() => openShareDialog(newTicket.id, newTicket.movieTitle)}
              />
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={resetBooking} className="rounded-full">
                  Book Another Ticket
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shared tickets received */}
        {sharedTickets.length > 0 && step !== "done" && (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              Tickets From Friends
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              {sharedTickets.map((ticket, i) => (
                <motion.div
                  key={`shared-${ticket.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TicketCard ticket={ticket} compact />
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* All Tickets Collection */}
        {ticketDisplayData.length > 0 && step !== "done" && (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <TicketIcon className="w-6 h-6 text-accent" />
              Your Ticket Collection
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {ticketDisplayData
                .filter((t) => t.id !== newTicket?.id)
                .map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TicketCard
                      ticket={ticket}
                      compact
                      onShareWithFriend={() => openShareDialog(ticket.id, ticket.movieTitle)}
                    />
                  </motion.div>
                ))}
            </div>
          </>
        )}

        {ticketDisplayData.length === 0 && step === "movie" && (
          <div className="text-center py-12">
            <TicketIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-lg">No tickets yet...</p>
            <p className="text-sm text-muted-foreground mt-1">Pick a movie above to get your first ticket! 🎬</p>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <ShareTicketDialog
        ticketId={shareTicketId || ""}
        movieTitle={shareMovieTitle}
        open={!!shareTicketId}
        onClose={() => setShareTicketId(null)}
      />
    </div>
  );
}
