import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Ticket, BookHeart, Popcorn, Heart, Play, Star, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovies, type Movie } from "@/hooks/useMovies";
import { useTickets } from "@/hooks/useTickets";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import heroCinema from "@/assets/hero-cinema.jpg";

function getMoviePoster(movie: Movie): string {
  return movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop";
}

const features = [
  {
    icon: Film,
    title: "Movie Collection",
    desc: "Save your favorite movies and build a shared watchlist with friends.",
    to: "/movies",
  },
  {
    icon: Ticket,
    title: "Get Your Ticket",
    desc: "AI-generated vintage tickets — grab one before each movie night!",
    to: "/tickets",
  },
  {
    icon: BookHeart,
    title: "Movie Journal",
    desc: "Write down your thoughts, feelings, and favorite moments after watching.",
    to: "/journal",
  },
  {
    icon: Users,
    title: "Friends",
    desc: "Connect with your movie crew and share tickets together.",
    to: "/friends",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { movies } = useMovies();
  const { hasTicketForMovie } = useTickets();
  const watchableMovies = movies.filter((m) => m.embed_url && hasTicketForMovie(m.id));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroCinema} alt="Cozy vintage cinema" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center px-4 max-w-3xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-border"
          >
            <Popcorn className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Your cozy movie corner</span>
          </motion.div>

          <h1 className="text-5xl sm:text-7xl font-display font-bold mb-6 text-foreground leading-tight">
            Watch Together,{" "}
            <span className="text-gradient-gold">Feel Together</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            A cozy space for friends to share movie nights, collect tickets,
            and journal beautiful memories — no matter the distance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="warm" size="lg" asChild>
              <Link to="/movies">
                <Film className="w-4 h-4 mr-1" />
                Browse Movies
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full" asChild>
              <Link to="/friends">
                <Users className="w-4 h-4 mr-1" />
                Find Friends
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-display font-bold text-center mb-4 text-foreground"
          >
            How It Works
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto">
            Four simple steps to the coziest movie night ever ✨
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={f.to}
                  className="block group bg-card rounded-2xl p-6 border border-border hover:border-accent transition-all hover:shadow-lg h-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <f.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-1.5 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Watch Now - only movies with tickets */}
      {watchableMovies.length > 0 && (
        <section className="py-20 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-display font-bold text-center mb-4 text-foreground"
            >
              Watch Now 🎬
            </motion.h2>
            <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto">
              Movies you have tickets for — jump right in!
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchableMovies.map((movie, i) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/watch?url=${encodeURIComponent(movie.embed_url!)}&title=${encodeURIComponent(movie.title)}${movie.total_seasons ? `&seasons=${movie.total_seasons}` : ""}`
                    )
                  }
                >
                  <div className="relative rounded-2xl overflow-hidden border border-border hover:border-accent hover:shadow-lg transition-all">
                    <div className="aspect-[2/3] relative">
                      <img
                        src={getMoviePoster(movie)}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
                          <Play className="w-7 h-7 text-accent-foreground fill-accent-foreground ml-1" />
                        </div>
                      </div>
                      {movie.rating && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-card/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 text-accent fill-accent" />
                          <span className="text-xs font-bold text-foreground">{movie.rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-display text-lg font-semibold text-foreground">{movie.title}</h3>
                      <p className="text-xs text-muted-foreground">{movie.genre} · {movie.year}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm">
        <p>Made with <Heart className="w-3 h-3 inline text-primary" /> for movie nights with friends</p>
      </footer>
    </div>
  );
}
