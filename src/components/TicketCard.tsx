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
import { jsPDF } from "jspdf";
import SourceStatus from "@/components/SourceStatus";

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

// Tiny stable hash → tilt so each ticket sits a little differently in the scrapbook
function tilt(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const deg = ((h % 5) - 2) * 0.6; // -1.2deg .. 1.2deg
  return deg;
}

export default function TicketCard({ ticket, isNew = false, onShareWithFriend, compact = false, showActions = true }: TicketCardProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(ticket.embedUrl ?? null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const canWatch = !!currentEmbedUrl;
  const rotate = tilt(ticket.id);
  const screen = (parseInt(ticket.seat.replace(/\D/g, "") || "1") % 5) + 1;

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
      toast({ title: "Room created", description: "Share the invite link with friends" });
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
          title: `${ticket.movieTitle} — Cozy Cinema Ticket`,
          text: `I'm watching ${ticket.movieTitle}! ${ticket.tagline || ""}\nSeat ${ticket.seat} · ${ticket.date}`,
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

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#faf3e7",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgW = canvas.width;
      const imgH = canvas.height;
      // A6-ish keepsake portrait (105 x 148 mm), fit ticket with margin
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / imgW, maxH / imgH);
      const w = imgW * ratio;
      const h = imgH * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      // soft cream background
      pdf.setFillColor(250, 243, 231);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");
      pdf.save(`cozy-cinema-${ticket.movieTitle.replace(/\s+/g, "-").toLowerCase()}-ticket.pdf`);
    } catch (e) {
      console.error("PDF download failed:", e);
      toast({ title: "Couldn't save PDF", description: "Please try again.", variant: "destructive" });
    }
    setDownloadingPdf(false);
  };

  return (
    <div className={cn("relative", compact && "scale-95 origin-top-left")}>
      {/* Capturable ticket area */}
      <div ref={ticketRef} className="relative pt-4 pb-2 px-2">
        {/* Gingham scrapbook backing */}
        <div
          className="absolute inset-0 rounded-[28px] bg-gingham opacity-90 shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.35)]"
          aria-hidden
        />
        {/* Washi tape – top left */}
        <div
          aria-hidden
          className="absolute -top-2 left-6 w-20 h-5 rotate-[-8deg] z-20 opacity-90 shadow-md"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, hsl(var(--gold)/0.85) 0 6px, hsl(var(--rose)/0.85) 6px 12px)",
          }}
        />
        {/* Washi tape – bottom right */}
        <div
          aria-hidden
          className="absolute -bottom-1 right-8 w-16 h-4 rotate-[6deg] z-20 opacity-90 shadow-md"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, hsl(var(--rose)/0.9) 0 5px, hsl(var(--card)) 5px 10px)",
          }}
        />

        {/* Ticket body */}
        <motion.div
          style={{ rotate: `${rotate}deg` }}
          whileHover={canWatch ? { rotate: 0, y: -4 } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
          onClick={handleWatchClick}
          className={cn(
            "relative z-10 rounded-2xl overflow-hidden shadow-2xl border-[3px] border-[hsl(var(--primary))]",
            canWatch && "cursor-pointer",
            isNew && "ring-2 ring-accent ring-offset-2 ring-offset-background"
          )}
        >
          {/* MAIN — deep maroon body */}
          <div className="relative bg-[hsl(350_60%_32%)] text-[hsl(10_50%_97%)] p-5">
            {/* Scallop inner frame */}
            <div className="absolute inset-2 rounded-xl border border-[hsl(var(--gold)/0.5)] pointer-events-none" />

            {/* Header — stars + brand */}
            <div className="relative flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current text-[hsl(var(--gold))]" />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-[hsl(var(--gold))]">
                Cozy Cinema
              </span>
              <div className="flex items-center gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current text-[hsl(var(--gold))]" />
                ))}
              </div>
            </div>

            {/* Movie row */}
            <div className="relative flex gap-4 items-start">
              {/* Polaroid poster */}
              {ticket.poster ? (
                <div
                  className="relative shrink-0 bg-[hsl(10_50%_97%)] p-1.5 pb-6 shadow-lg"
                  style={{ transform: "rotate(-3deg)" }}
                >
                  <img
                    src={ticket.poster}
                    alt={ticket.movieTitle}
                    className="w-20 h-28 object-cover"
                  />
                  <span className="absolute bottom-1 left-0 right-0 text-center font-handwritten text-[11px] leading-none text-[hsl(var(--primary))]">
                    {ticket.year || "now showing"}
                  </span>
                  {/* tape on polaroid */}
                  <div
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 opacity-80"
                    style={{ backgroundColor: "hsl(var(--gold)/0.6)" }}
                  />
                </div>
              ) : (
                <div className="w-20 h-28 bg-[hsl(var(--card))] flex items-center justify-center shrink-0 rotate-[-3deg]">
                  <FilmReelIcon className="w-10 h-10" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-2xl font-bold leading-tight uppercase tracking-wide text-[hsl(10_50%_97%)] drop-shadow-[0_1px_0_hsl(350_60%_18%)]">
                  {ticket.movieTitle}
                </h3>
                {ticket.tagline && (
                  <p className="font-handwritten text-base mt-1 text-[hsl(var(--gold))] leading-snug">
                    "{ticket.tagline}"
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--gold)/0.18)] text-[hsl(var(--gold))] font-semibold">
                    {ticket.genre}
                  </span>
                  {ticket.rating && (
                    <span className="text-xs flex items-center gap-0.5 text-[hsl(var(--gold))]">
                      <Star className="w-3 h-3 fill-current" /> {ticket.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {ticket.mood && (
              <div className="relative mt-3 text-[11px] opacity-80 font-handwritten text-[hsl(10_50%_97%)]">
                mood — {ticket.mood}
                {ticket.suggestedSnack && <> · pair with {ticket.suggestedSnack.replace(/[\p{Emoji}\u200d]/gu, "").trim()}</>}
              </div>
            )}
          </div>

          {/* Perforated divider */}
          <div className="relative h-6 bg-[hsl(10_50%_97%)]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[hsl(350_60%_32%)]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[hsl(350_60%_32%)]" />
            <div className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-[hsl(var(--primary)/0.4)]" />
          </div>

          {/* STUB — cream */}
          <div className="bg-[hsl(10_50%_97%)] text-[hsl(var(--primary))] px-6 pt-3 pb-5">
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { l: "Date", v: ticket.date },
                { l: "Time", v: ticket.time },
                { l: "Screen", v: String(screen) },
                { l: "Seat", v: ticket.seat },
              ].map((c) => (
                <div key={c.l}>
                  <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--primary)/0.7)] mb-0.5">
                    {c.l}
                  </p>
                  <p className="text-sm font-display font-bold">{c.v}</p>
                </div>
              ))}
            </div>

            {ticket.funFact && (
              <div className="mt-3 text-[11px] text-center font-handwritten text-[hsl(var(--primary)/0.75)] leading-snug">
                {ticket.funFact}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-3">
              <PopcornIcon className="w-4 h-4 opacity-70" />
              <span className="text-[11px] font-handwritten text-[hsl(var(--primary)/0.7)]">
                a little ticket to a cozy night in
              </span>
              <FilmReelIcon className="w-4 h-4 opacity-70" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Free-source status badge */}
      {showActions && !compact && (
        <div className="flex justify-center mt-3">
          <SourceStatus
            url={currentEmbedUrl}
            movieId={ticket.movieId}
            movieTitle={ticket.movieTitle}
            year={ticket.year}
            onLinkUpdated={(u) => setCurrentEmbedUrl(u)}
          />
        </div>
      )}

      {/* Action buttons */}
      {showActions && !compact && (
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {canWatch && (
            <Button variant="warm" size="sm" className="text-xs rounded-full" onClick={(e) => { e.stopPropagation(); handleWatchClick(); }}>
              <Play className="w-3 h-3 mr-1" /> Watch Now
            </Button>
          )}
          {canWatch && ticket.movieId && (
            <Button variant="outline" size="sm" className="text-xs rounded-full" onClick={handleWatchTogether} disabled={creatingRoom}>
              {creatingRoom ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Users className="w-3 h-3 mr-1" />}
              Watch Together
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs rounded-full" onClick={handleDownload} disabled={downloading}>
            <Download className="w-3 h-3 mr-1" />
            {downloading ? "Saving..." : "Save as PNG"}
          </Button>
          <Button variant="outline" size="sm" className="text-xs rounded-full" onClick={handleWebShare}>
            <Share2 className="w-3 h-3 mr-1" /> Share
          </Button>
          {onShareWithFriend && (
            <Button variant="warm" size="sm" className="text-xs rounded-full" onClick={onShareWithFriend}>
              <Send className="w-3 h-3 mr-1" /> Send to Friend
            </Button>
          )}
        </div>
      )}

      {showActions && compact && (
        <div className="mt-2">
          <SourceStatus
            url={currentEmbedUrl}
            movieId={ticket.movieId}
            movieTitle={ticket.movieTitle}
            year={ticket.year}
            onLinkUpdated={(u) => setCurrentEmbedUrl(u)}
          />
        </div>
      )}

      {showActions && compact && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {canWatch && (
            <Button variant="warm" size="sm" className="text-[10px] h-7 px-2 rounded-full" onClick={(e) => { e.stopPropagation(); handleWatchClick(); }}>
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
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -12 }}
          className="absolute -top-3 -right-2 bg-[hsl(var(--gold))] text-[hsl(var(--primary))] font-handwritten text-base px-3 py-1 rounded-full shadow-lg z-30 border-2 border-[hsl(var(--primary))]"
        >
          just booked!
        </motion.div>
      )}
    </div>
  );
}
