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
import { TicketGridSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

type BookingStep = "movie" | "seat" | "generating" | "done";

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const preselectedMovieTitle = searchParams.get("movie") || "";
  const { movies, loading: moviesLoading } = useMovies();
  const { tickets, loading: ticketsLoading, bookTicket, hasTicketForMovie } = useTickets();
  const { user } = useAuth();

  const [step, setStep] = useState<BookingStep>("movie");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [aiData, setAiData] = useState<any>(null);
  const [newTicket, setNewTicket] = useState<TicketDisplayData | null>(null);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);

  const [shareTicketId, setShareTicketId] = useState<string | null>(null);
  const [shareMovieTitle, setShareMovieTitle] = useState("");

  const [sharedTickets, setSharedTickets] = useState<TicketDisplayData[]>([]);

  useEffect(() => {
    if (preselectedMovieTitle && movies.length > 0) {
      const found = movies.find((m) => m.title === preselectedMovieTitle);
      if (found) setSelectedMovieId(found.id);
    }
  }, [preselectedMovieTitle, movies]);

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
              tagline: "a little gift from a friend",
              movieId: t.movie_id,
              embedUrl: movie?.embed_url,
              totalSeasons: movie?.total_seasons,
            };
          });
        setSharedTickets(mapped);
      }
    };
    if (movies.length > 0) fetchShared();
  }, [user, movies]);

  // Fetch booked seats when movie is selected
  useEffect(() => {
    if (!selectedMovieId) {
      setBookedSeats([]);
      return;
    }
    const fetchBookedSeats = async () => {
      const { data, error } = await supabase.rpc("get_booked_seats", {
        p_movie_id: selectedMovieId,
      });
      if (!error && data) {
        setBookedSeats(data as string[]);
      }
    };
    fetchBookedSeats();
  }, [selectedMovieId]);

  const selectedMovie = movies.find((m) => m.id === selectedMovieId);

  const handleSelectSeat = () => {
    if (!selectedMovieId) return;
    setStep("seat");
  };

  const handleBook = async () => {
    if (!selectedMovie || selectedSeats.length === 0) return;
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
        tagline: "enjoy the show",
        color_theme: "gold",
        mood: "cozy",
        fun_fact: "movie magic awaits",
        suggested_snack: "buttery popcorn",
      };
      setAiData(aiResult);
    }

    const now = new Date();
    const seatStr = selectedSeats.join(",");
    const ticketResult = await bookTicket({
      movie_id: selectedMovie.id,
      movie_title: selectedMovie.title,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      seat: seatStr,
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
        mood: aiResult?.mood,
        funFact: aiResult?.fun_fact,
        suggestedSnack: aiResult?.suggested_snack,
        movieId: selectedMovie.id,
        embedUrl: selectedMovie.embed_url,
        totalSeasons: selectedMovie.total_seasons,
      });
      setStep("done");
    } else {
      setStep("movie");
    }
  };

  const resetBooking = () => {
    setStep("movie");
    setSelectedMovieId("");
    setSelectedSeats([]);
    setAiData(null);
    setNewTicket(null);
    setBookedSeats([]);
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
      movieId: t.movie_id,
      embedUrl: movie?.embed_url,
      totalSeasons: movie?.total_seasons,
    };
  });

  const isLoading = moviesLoading || ticketsLoading;

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 relative">
      <div className="absolute inset-0 bg-polka opacity-40 pointer-events-none" aria-hidden />
      <div className="container mx-auto max-w-4xl relative">
        {/* Scrapbook header */}
        <div className="relative mb-8 sm:mb-10 text-center">
          <span className="inline-block font-handwritten text-xl text-primary/70 rotate-[-3deg]">a little collection of</span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold italic text-primary tracking-tight mt-1">
            Movie Tickets
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-12 bg-primary/40" />
            <PopcornIcon className="w-5 h-5" />
            <span className="font-handwritten text-base text-foreground/70">stubs from cozy nights in</span>
            <ClapperboardIcon className="w-5 h-5" />
            <div className="h-px w-12 bg-primary/40" />
          </div>
        </div>

        {/* Booking Flow */}
        <AnimatePresence mode="wait">
          {step === "movie" && !isLoading && (
            <motion.div
              key="movie"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card rounded-2xl p-4 sm:p-6 border-2 border-dashed border-primary/40 mb-8 sm:mb-10 shadow-sm relative"
            >
              <span className="absolute -top-3 left-6 bg-gold text-gold-foreground font-handwritten text-sm px-3 py-0.5 rounded-full rotate-[-3deg] shadow">step one</span>
              <h3 className="font-display text-xl font-semibold italic text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Choose your movie
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {movies.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => setSelectedMovieId(movie.id)}
                    className={`relative text-left p-2 sm:p-3 rounded-xl border-2 transition-all ${
                      selectedMovieId === movie.id
                        ? "border-accent bg-accent/10 shadow-md"
                        : "border-border hover:border-accent/50 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="w-8 sm:w-10 h-12 sm:h-14 rounded object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-8 sm:w-10 h-12 sm:h-14 rounded bg-secondary flex items-center justify-center shrink-0">
                          <Film className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-foreground text-xs sm:text-sm truncate">{movie.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{movie.genre} · {movie.year}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedMovieId && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <Button variant="warm" onClick={handleSelectSeat} className="w-full sm:w-auto">
                    Pick your seat <ChevronRight className="w-4 h-4 ml-1" />
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
              className="bg-card rounded-2xl p-4 sm:p-6 border-2 border-dashed border-primary/40 mb-8 sm:mb-10 shadow-sm relative"
            >
              <span className="absolute -top-3 left-6 bg-gold text-gold-foreground font-handwritten text-sm px-3 py-0.5 rounded-full rotate-[-3deg] shadow">step two</span>
              <h3 className="font-display text-xl font-semibold italic text-foreground mb-1 flex items-center gap-2">
                <PopcornIcon className="w-5 h-5" />
                Pick your seats
              </h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-6 font-handwritten text-base">
                watching <span className="font-semibold text-foreground">{selectedMovie?.title}</span>
                <span className="ml-2 text-xs text-accent">(you can grab a few!)</span>
              </p>
              <SeatPicker selectedSeats={selectedSeats} onSelect={setSelectedSeats} bookedSeats={bookedSeats} />
              {selectedSeats.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 sm:mt-6 flex gap-3">
                  <Button variant="outline" onClick={() => setStep("movie")}>Back</Button>
                  <Button variant="warm" onClick={handleBook} className="flex-1 sm:flex-none">
                    <TicketIcon className="w-4 h-4 mr-1" />
                    Book {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}
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
              className="bg-card rounded-2xl p-8 sm:p-12 border border-border mb-8 sm:mb-10 text-center"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <ClapperboardIcon className="w-12 sm:w-16 h-12 sm:h-16 mx-auto" />
              </motion.div>
              <p className="font-display text-xl italic font-semibold text-foreground mt-4">stitching your ticket together…</p>
              <p className="font-handwritten text-base text-muted-foreground mt-2">a little something special, just for you</p>
            </motion.div>
          )}

          {step === "done" && newTicket && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="mb-8 sm:mb-10 max-w-md mx-auto"
            >
              <TicketCard
                ticket={newTicket}
                isNew
                onShareWithFriend={() => openShareDialog(newTicket.id, newTicket.movieTitle)}
              />
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={resetBooking} className="rounded-full">
                  Book another ticket
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {isLoading && (
          <div className="mb-10">
            <TicketGridSkeleton count={4} />
          </div>
        )}

        {/* Shared tickets received */}
        {!isLoading && sharedTickets.length > 0 && step !== "done" && (
          <>
            <h2 className="font-display text-2xl sm:text-3xl italic font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <Gift className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              little gifts from friends
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
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
        {!isLoading && ticketDisplayData.length > 0 && step !== "done" && (
          <>
            <h2 className="font-display text-2xl sm:text-3xl italic font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <TicketIcon className="w-5 sm:w-6 h-5 sm:h-6 text-accent" />
              your ticket scrapbook
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
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

        {!isLoading && ticketDisplayData.length === 0 && step === "movie" && (
          <EmptyState
            icon={TicketIcon}
            title="no stubs in the scrapbook yet"
            description="pick a movie above to start your little collection"
          />
        )}
      </div>

      <ShareTicketDialog
        ticketId={shareTicketId || ""}
        movieTitle={shareMovieTitle}
        open={!!shareTicketId}
        onClose={() => setShareTicketId(null)}
      />
    </div>
  );
}
