import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket as TicketIcon, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMovies, getTickets, addTicket, type Ticket } from "@/lib/store";
import { useSearchParams } from "react-router-dom";

const seats = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const preselectedMovie = searchParams.get("movie") || "";
  const movies = getMovies();
  const [tickets, setTickets] = useState<Ticket[]>(getTickets);
  const [selectedMovie, setSelectedMovie] = useState(preselectedMovie);
  const [holder, setHolder] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("");
  const [newTicket, setNewTicket] = useState<Ticket | null>(null);

  const handleBook = () => {
    if (!selectedMovie || !holder) return;
    const movie = movies.find((m) => m.title === selectedMovie);
    const now = new Date();
    const ticket = addTicket({
      movieId: movie?.id || "",
      movieTitle: selectedMovie,
      date: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      seat: selectedSeat || seats[Math.floor(Math.random() * seats.length)],
      holder,
      genre: movie?.genre || "Movie",
    });
    setTickets((prev) => [...prev, ticket]);
    setNewTicket(ticket);
    setSelectedMovie("");
    setHolder("");
    setSelectedSeat("");
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Movie Tickets</h1>
        <p className="text-muted-foreground mb-10">Grab your ticket before the show starts! 🎫</p>

        {/* Booking Form */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-10 max-w-lg">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Book a Ticket
          </h3>
          <div className="space-y-4">
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={selectedMovie}
              onChange={(e) => setSelectedMovie(e.target.value)}
            >
              <option value="">Choose a movie...</option>
              {movies.map((m) => (
                <option key={m.id} value={m.title}>{m.title}</option>
              ))}
            </select>
            <Input
              placeholder="Your name"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
            />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pick your seat:</p>
              <div className="grid grid-cols-3 gap-2 max-w-[200px]">
                {seats.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeat(s)}
                    className={`text-xs py-2 rounded-lg border font-medium transition-all ${
                      selectedSeat === s
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-muted text-muted-foreground border-border hover:border-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="ticket" onClick={handleBook} className="w-full">
              <TicketIcon className="w-4 h-4 mr-1" />
              Get My Ticket
            </Button>
          </div>
        </div>

        {/* Newly generated ticket */}
        <AnimatePresence>
          {newTicket && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mb-10"
            >
              <TicketCard ticket={newTicket} isNew />
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Tickets */}
        {tickets.length > 0 && (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Your Ticket Collection</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {tickets.filter((t) => t.id !== newTicket?.id).map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TicketCard ticket={ticket} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, isNew = false }: { ticket: Ticket; isNew?: boolean }) {
  return (
    <div className={`bg-ticket rounded-2xl p-6 relative overflow-hidden ${isNew ? "shimmer" : ""}`}>
      {isNew && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full font-semibold">
          <Star className="w-3 h-3" /> New!
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Cozy Cinema Presents</p>
          <h3 className="font-display text-2xl font-bold text-foreground">{ticket.movieTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1">{ticket.genre}</p>
        </div>
        <TicketIcon className="w-8 h-8 text-accent opacity-50" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Date</p>
          <p className="font-semibold text-foreground">{ticket.date}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Seat</p>
          <p className="font-semibold text-foreground">{ticket.seat}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Holder</p>
          <p className="font-semibold text-foreground">{ticket.holder}</p>
        </div>
      </div>

      {/* Decorative tear line */}
      <div className="mt-6 border-t-2 border-dashed border-accent/30" />
      <p className="text-center text-xs text-muted-foreground mt-3 italic">
        ✨ Enjoy the show ✨
      </p>
    </div>
  );
}
