import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Watch() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Movie";

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No movie URL provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foreground/95">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 bg-card/10 backdrop-blur-sm border-b border-border/20"
      >
        <div className="flex items-center gap-3">
          <Link to="/movies">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="font-display text-lg font-semibold text-primary-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/tickets?movie=${encodeURIComponent(title)}`}>
            <Button variant="ticket" size="sm">
              <Ticket className="w-3 h-3 mr-1" />
              Get Ticket
            </Button>
          </Link>
          <Link to="/journal">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <BookHeart className="w-3 h-3 mr-1" />
              Journal
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Video embed */}
      <div className="w-full" style={{ height: "calc(100vh - 120px)" }}>
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-2 bg-card/10 backdrop-blur-sm border-t border-border/20 text-center">
        <p className="text-xs text-primary-foreground/50 italic">
          ✨ Enjoy the movie night together! Don't forget to write about it in your journal ✨
        </p>
      </div>
    </div>
  );
}
