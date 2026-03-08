import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Ticket, BookHeart, Popcorn, Heart, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMovies, type Movie } from "@/lib/store";
import heroCinema from "@/assets/hero-cinema.jpg";
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
    desc: "Grab a free digital ticket before each movie night — just like the real thing!",
    to: "/tickets",
  },
  {
    icon: BookHeart,
    title: "Movie Journal",
    desc: "Write down your thoughts, feelings, and favorite moments after watching.",
    to: "/journal",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroCinema}
            alt="Cozy vintage cinema"
            className="w-full h-full object-cover"
          />
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
              <Link to="/journal">
                <Heart className="w-4 h-4 mr-1" />
                Our Journal
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
            Three simple steps to the coziest movie night ever ✨
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Link
                  to={f.to}
                  className="block group bg-card rounded-2xl p-8 border border-border hover:border-accent transition-all hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <f.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm">
        <p>Made with <Heart className="w-3 h-3 inline text-primary" /> for movie nights with friends</p>
      </footer>
    </div>
  );
}
