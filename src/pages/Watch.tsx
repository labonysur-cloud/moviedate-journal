import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import vintageTv from "@/assets/vintage-tv.png";

export default function Watch() {
  const [searchParams] = useSearchParams();
  const baseUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Movie";
  const seasons = parseInt(searchParams.get("seasons") || "0");

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const currentUrl = seasons > 0
    ? baseUrl.replace(/detailSe=\d+/, `detailSe=${season}`).replace(/detailEp=\d+/, `detailEp=${episode}`)
    : baseUrl;

  if (!baseUrl) {
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
          <h1 className="font-display text-lg font-semibold text-primary-foreground">
            {title}
            {seasons > 0 && <span className="text-sm font-body font-normal text-primary-foreground/60 ml-2">S{season} · E{episode}</span>}
          </h1>
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

      {/* Season/Episode selector for series */}
      {seasons > 0 && (
        <div className="px-4 py-3 bg-card/5 border-b border-border/10 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-foreground/50 uppercase tracking-wide">Season</span>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSeason(s); setEpisode(1); }}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    season === s
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-foreground/50 uppercase tracking-wide">Episode</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEpisode((e) => Math.max(1, e - 1))}
                className="w-8 h-8 rounded-lg bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/20 text-sm font-bold"
              >
                ‹
              </button>
              <span className="w-8 text-center text-sm font-semibold text-primary-foreground">{episode}</span>
              <button
                onClick={() => setEpisode((e) => e + 1)}
                className="w-8 h-8 rounded-lg bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/20 text-sm font-bold"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video embed with vintage TV frame */}
      <div className="flex items-center justify-center px-4 py-6" style={{ height: seasons > 0 ? "calc(100vh - 168px)" : "calc(100vh - 120px)" }}>
        <div className="relative w-full max-w-5xl mx-auto" style={{ aspectRatio: "4/3" }}>
          {/* TV frame image */}
          <img
            src={vintageTv}
            alt=""
            className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none select-none"
            draggable={false}
          />
          {/* Video iframe positioned inside the TV screen area */}
          <div
            className="absolute overflow-hidden rounded-[2%]"
            style={{
              top: "7%",
              left: "4.5%",
              width: "63%",
              height: "78%",
              borderRadius: "5% / 6%",
            }}
          >
            <iframe
              key={currentUrl}
              src={currentUrl}
              title={`${title} S${season}E${episode}`}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-2 bg-card/10 backdrop-blur-sm border-t border-border/20 text-center">
        <p className="text-xs text-primary-foreground/50 italic font-handwritten text-base">
          ✨ Enjoy the movie night together! Don't forget to write about it in your journal ✨
        </p>
      </div>
    </div>
  );
}
