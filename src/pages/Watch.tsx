import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";

function ensureHttp(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

function extractYouTubeId(url: string): { id: string; start?: number } | null {
  // Matches youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /v/ID, /live/ID
  const patterns = [
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/))([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      let start: number | undefined;
      try {
        const u = new URL(ensureHttp(url));
        const t = u.searchParams.get("t") || u.searchParams.get("start");
        if (t) {
          const parsed = /^(\d+)$/.test(t) ? parseInt(t) : 0;
          if (parsed > 0) start = parsed;
        }
      } catch {}
      return { id: m[1], start };
    }
  }
  return null;
}

function toEmbedUrl(url: string): string {
  const clean = ensureHttp(url);
  if (!clean) return "";

  // YouTube → embed with safe params
  const yt = extractYouTubeId(clean);
  if (yt) {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });
    if (yt.start) params.set("start", String(yt.start));
    return `https://www.youtube.com/embed/${yt.id}?${params.toString()}`;
  }

  // Vimeo → player
  const vimeo = clean.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Dailymotion
  const dm = clean.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-z0-9]+)/i);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;

  // Direct video file → let browser play via <video>
  return clean;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}


export default function Watch() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Movie";
  const seasons = parseInt(searchParams.get("seasons") || "0");

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const baseUrl = useMemo(() => toEmbedUrl(rawUrl), [rawUrl]);

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

      {/* Video embed */}
      <div className="w-full" style={{ height: seasons > 0 ? "calc(100vh - 168px)" : "calc(100vh - 120px)" }}>
        <iframe
          key={currentUrl}
          src={currentUrl}
          title={`${title} S${season}E${episode}`}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
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
