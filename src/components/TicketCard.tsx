import { motion } from "framer-motion";
import { Star, Share2, Download, Send, Play, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopcornIcon, FilmReelIcon, StarBurstIcon } from "@/components/icons/CinemaIcons";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import SourceStatus from "@/components/SourceStatus";

const colorThemes: Record<string, { bg: string; accent: string; text: string; border: string }> = {
  crimson: { bg: "from-red-900 to-red-800", accent: "text-red-300", text: "text-red-50", border: "border-red-700" },
  gold: { bg: "from-amber-800 to-yellow-900", accent: "text-amber-300", text: "text-amber-50", border: "border-amber-600" },
  royal: { bg: "from-indigo-900 to-blue-900", accent: "text-blue-300", text: "text-blue-50", border: "border-indigo-700" },
  emerald: { bg: "from-emerald-900 to-teal-900", accent: "text-emerald-300", text: "text-emerald-50", border: "border-emerald-700" },
  violet: { bg: "from-purple-900 to-violet-900", accent: "text-violet-300", text: "text-violet-50", border: "border-purple-700" },
  coral: { bg: "from-orange-800 to-rose-900", accent: "text-orange-300", text: "text-orange-50", border: "border-orange-700" },
  midnight: { bg: "from-slate-900 to-gray-900", accent: "text-slate-300", text: "text-slate-50", border: "border-slate-700" },
  blush: { bg: "from-pink-800 to-rose-900", accent: "text-pink-300", text: "text-pink-50", border: "border-pink-700" },
};

export interface TicketDisplayData {
  id: string;
  movieTitle: string;
  date: string;
  time: string;
  seat: string;
  genre: string;
  poster?: string | null;
  year?: string;
  rating?: string | null;
  colorTheme?: string;
  tagline?: string;
  emoji?: string;
  mood?: string;
  funFact?: string;
  suggestedSnack?: string;
  movieId?: string;
  embedUrl?: string | null;
  totalSeasons?: number | null;
}

interface TicketCardProps {
  ticket: TicketDisplayData;
  isNew?: boolean;
  onShareWithFriend?: () => void;
  compact?: boolean;
  showActions?: boolean;
}

export default function TicketCard({ ticket, isNew = false, onShareWithFriend, compact = false, showActions = true }: TicketCardProps) {
  const theme = colorThemes[ticket.colorTheme || "gold"] || colorThemes.gold;
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(ticket.embedUrl ?? null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const canWatch = !!currentEmbedUrl;

  const handleWatchClick = () => {
    if (!canWatch) return;
    navigate(
      `/watch?url=${encodeURIComponent(currentEmbedUrl!)}&title=${encodeURIComponent(ticket.movieTitle)}${ticket.totalSeasons ? `&seasons=${ticket.totalSeasons}` : ""}`
    );
  };




  const handleWatchTogether = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canWatch || !user || !ticket.movieId) return;
    setCreatingRoom(true);
    try {
      const { data, error } = await supabase
        .from("watch_rooms")
        .insert({
          host_id: user.id,
          movie_id: ticket.movieId,
          movie_title: ticket.movieTitle,
          embed_url: ticket.embedUrl,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: "🎬 Room created!", description: "Share the invite link with friends" });
      navigate(`/watch-together?room=${data.id}`);
    } catch (err: any) {
      toast({ title: "Couldn't create room", description: err.message, variant: "destructive" });
    }
    setCreatingRoom(false);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🎬 ${ticket.movieTitle} — Cozy Cinema Ticket`,
          text: `I'm watching ${ticket.movieTitle}! ${ticket.tagline || ""}\n🎫 Seat: ${ticket.seat} | ${ticket.date}`,
          url: window.location.origin,
        });
      } catch {}
    }
  };

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `cozy-cinema-${ticket.movieTitle.replace(/\s+/g, "-").toLowerCase()}-ticket.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download failed:", e);
    }
    setDownloading(false);
  };

  return (
    <div className={cn("relative", compact && "scale-90 origin-top-left")}>
      {/* Capturable ticket area */}
      <div ref={ticketRef}>
        <div
          onClick={handleWatchClick}
          className={cn(
            "relative rounded-2xl overflow-hidden shadow-2xl",
            canWatch && "cursor-pointer hover:shadow-3xl hover:scale-[1.01] transition-transform",
            isNew && "ring-2 ring-accent ring-offset-2 ring-offset-background"
          )}
        >
          {/* Main ticket body */}
          <div className={cn("bg-gradient-to-br p-6 relative", theme.bg)}>
            {/* Top decorative strip */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StarBurstIcon className={cn("w-5 h-5", theme.accent)} />
                <span className={cn("text-[10px] uppercase tracking-[0.25em] font-bold", theme.accent)}>
                  Cozy Cinema
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className={cn("w-3 h-3 fill-current", theme.accent)} />
                ))}
              </div>
            </div>

            {/* Movie info section */}
            <div className="flex gap-4">
              {ticket.poster && (
                <div className="w-20 h-28 rounded-lg overflow-hidden border-2 border-white/20 flex-shrink-0 shadow-lg">
                  <img
                    src={ticket.poster}
                    alt={ticket.movieTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className={cn("font-display text-2xl font-bold leading-tight", theme.text)}>
                  {ticket.emoji} {ticket.movieTitle}
                </h3>
                {ticket.tagline && (
                  <p className={cn("text-sm italic mt-1 opacity-80", theme.accent)}>
                    "{ticket.tagline}"
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full bg-white/10 font-medium", theme.text)}>
                    {ticket.genre}
                  </span>
                  {ticket.year && (
                    <span className={cn("text-xs opacity-60", theme.text)}>{ticket.year}</span>
                  )}
                  {ticket.rating && (
                    <span className={cn("text-xs flex items-center gap-0.5", theme.accent)}>
                      <Star className="w-3 h-3 fill-current" /> {ticket.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {ticket.mood && (
              <div className={cn("mt-3 text-xs opacity-70 italic", theme.text)}>
                Mood: {ticket.mood} {ticket.suggestedSnack && `· Pair with: ${ticket.suggestedSnack}`}
              </div>
            )}
          </div>

          {/* Perforated divider */}
          <div className="relative h-6" style={{ backgroundColor: "hsl(30 30% 96%)" }}>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full" style={{ backgroundColor: "hsl(30 30% 96%)" }} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full" style={{ backgroundColor: "hsl(30 30% 96%)" }} />
            <div className="absolute inset-x-6 top-1/2 border-t-2 border-dashed" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
          </div>

          {/* Stub section */}
          <div className={cn("bg-gradient-to-br px-6 pb-5 pt-2", theme.bg)}>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className={cn("text-[9px] uppercase tracking-wider font-bold mb-0.5", theme.accent)}>Date</p>
                <p className={cn("text-sm font-bold", theme.text)}>{ticket.date}</p>
              </div>
              <div>
                <p className={cn("text-[9px] uppercase tracking-wider font-bold mb-0.5", theme.accent)}>Time</p>
                <p className={cn("text-sm font-bold", theme.text)}>{ticket.time}</p>
              </div>
              <div>
                <p className={cn("text-[9px] uppercase tracking-wider font-bold mb-0.5", theme.accent)}>Screen</p>
                <p className={cn("text-sm font-bold", theme.text)}>
                  {parseInt(ticket.seat.replace(/\D/g, "")) % 5 + 1}
                </p>
              </div>
              <div>
                <p className={cn("text-[9px] uppercase tracking-wider font-bold mb-0.5", theme.accent)}>Seat</p>
                <p className={cn("text-sm font-bold", theme.text)}>{ticket.seat}</p>
              </div>
            </div>

            {ticket.funFact && (
              <div className={cn("mt-3 text-[10px] text-center opacity-60 italic", theme.text)}>
                💡 {ticket.funFact}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-3">
              <PopcornIcon className={cn("w-4 h-4 opacity-40", theme.accent)} />
              <span className={cn("text-[10px] italic opacity-50", theme.text)}>
                ✨ Enjoy the show ✨
              </span>
              <FilmReelIcon className={cn("w-4 h-4 opacity-40", theme.accent)} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons — outside the capturable area */}
      {showActions && !compact && (
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {canWatch && (
            <Button
              variant="warm"
              size="sm"
              className="text-xs rounded-full"
              onClick={(e) => { e.stopPropagation(); handleWatchClick(); }}
            >
              <Play className="w-3 h-3 mr-1" />
              Watch Now
            </Button>
           )}
          {canWatch && ticket.movieId && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={handleWatchTogether}
              disabled={creatingRoom}
            >
              {creatingRoom ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Users className="w-3 h-3 mr-1" />}
              Watch Together
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs rounded-full"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-3 h-3 mr-1" />
            {downloading ? "Saving..." : "Save as PNG"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs rounded-full"
            onClick={handleWebShare}
          >
            <Share2 className="w-3 h-3 mr-1" />
            Share
          </Button>
          {onShareWithFriend && (
            <Button
              variant="warm"
              size="sm"
              className="text-xs rounded-full"
              onClick={onShareWithFriend}
            >
              <Send className="w-3 h-3 mr-1" />
              Send to Friend
            </Button>
          )}
        </div>
      )}

      {/* Compact actions */}
      {showActions && compact && (
        <div className="flex gap-1.5 mt-2 origin-top-left scale-[1.11] flex-wrap">
          {canWatch && (
            <Button variant="warm" size="sm" className="text-[10px] h-7 px-2" onClick={(e) => { e.stopPropagation(); handleWatchClick(); }}>
              <Play className="w-3 h-3 mr-0.5" /> Watch
            </Button>
          )}
          {canWatch && ticket.movieId && (
            <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={handleWatchTogether} disabled={creatingRoom}>
              {creatingRoom ? <Loader2 className="w-3 h-3 mr-0.5 animate-spin" /> : <Users className="w-3 h-3 mr-0.5" />} Together
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={handleDownload} disabled={downloading}>
            <Download className="w-3 h-3 mr-0.5" /> PNG
          </Button>
          <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={handleWebShare}>
            <Share2 className="w-3 h-3 mr-0.5" /> Share
          </Button>
          {onShareWithFriend && (
            <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={onShareWithFriend}>
              <Send className="w-3 h-3 mr-0.5" /> Friend
            </Button>
          )}
        </div>
      )}

      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10"
        >
          ✨ New!
        </motion.div>
      )}
    </div>
  );
}
