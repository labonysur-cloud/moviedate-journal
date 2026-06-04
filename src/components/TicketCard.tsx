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

function escapeHtml(s: string | undefined | null) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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

  const fetchPosterDataUrl = async (url: string): Promise<string | null> => {
    const tryFetch = async (u: string) => {
      const res = await fetch(u, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    };
    try {
      return await tryFetch(url);
    } catch {
      try {
        // CORS-friendly image proxy fallback
        const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ""))}`;
        return await tryFetch(proxied);
      } catch {
        return null;
      }
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    let host: HTMLDivElement | null = null;
    try {
      // 1. Pre-fetch poster so it embeds into the PDF
      const posterData = ticket.poster ? await fetchPosterDataUrl(ticket.poster) : null;

      // 2. Build an off-screen, print-worthy keepsake (A5 portrait @ 96dpi ≈ 559 x 794 px)
      host = document.createElement("div");
      host.style.cssText =
        "position:fixed;left:-10000px;top:0;width:559px;height:794px;z-index:-1;pointer-events:none;";
      host.innerHTML = `
        <div style="
          width:559px;height:794px;box-sizing:border-box;padding:28px;
          background:
            radial-gradient(circle at 12px 12px, rgba(212,165,116,0.18) 1.5px, transparent 2px) 0 0/22px 22px,
            linear-gradient(135deg,#fbf3e4 0%,#f6e7cf 100%);
          font-family:'Nunito', system-ui, sans-serif; color:#5a1d28; position:relative; overflow:hidden;
        ">
          <!-- washi tape corners -->
          <div style="position:absolute;top:14px;left:30px;width:96px;height:18px;transform:rotate(-6deg);
            background:repeating-linear-gradient(45deg,#d4a574 0 7px,#c0556d 7px 14px);opacity:.85;box-shadow:0 2px 6px rgba(0,0,0,.12)"></div>
          <div style="position:absolute;bottom:18px;right:34px;width:78px;height:16px;transform:rotate(8deg);
            background:repeating-linear-gradient(-45deg,#c0556d 0 6px,#fbf3e4 6px 12px);opacity:.85;box-shadow:0 2px 6px rgba(0,0,0,.12)"></div>

          <!-- outer scallop frame -->
          <div style="position:absolute;inset:18px;border:2px dashed #5a1d28;border-radius:18px;opacity:.45"></div>
          <div style="position:absolute;inset:24px;border:1px solid #d4a574;border-radius:14px;opacity:.7"></div>

          <!-- header -->
          <div style="position:relative;text-align:center;margin-top:8px">
            <div style="font-family:'Caveat',cursive;font-size:18px;color:#8b3a48;letter-spacing:.5px">a little keepsake from</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:30px;letter-spacing:.32em;color:#5a1d28;margin-top:2px">COZY CINEMA</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px;color:#c89f4a">
              <span style="height:1px;width:60px;background:#c89f4a"></span>
              <span style="font-size:11px;letter-spacing:.4em">★ ★ ★</span>
              <span style="height:1px;width:60px;background:#c89f4a"></span>
            </div>
          </div>

          <!-- polaroid poster -->
          <div style="display:flex;justify-content:center;margin-top:18px">
            <div style="background:#fffaf0;padding:10px 10px 38px;box-shadow:0 12px 24px -10px rgba(90,29,40,.45);transform:rotate(-2.5deg);position:relative">
              ${posterData
                ? `<img src="${posterData}" alt="" style="width:200px;height:280px;object-fit:cover;display:block" crossorigin="anonymous"/>`
                : `<div style="width:200px;height:280px;display:flex;align-items:center;justify-content:center;background:#f1e2c8;color:#8b3a48;font-family:'Caveat',cursive;font-size:22px">${(ticket.movieTitle || "movie").slice(0,28)}</div>`}
              <div style="position:absolute;left:0;right:0;bottom:8px;text-align:center;font-family:'Caveat',cursive;font-size:18px;color:#5a1d28">${ticket.year || "now showing"}</div>
              <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:54px;height:14px;background:rgba(212,165,116,.7)"></div>
            </div>
          </div>

          <!-- title -->
          <div style="text-align:center;margin-top:18px;padding:0 18px">
            <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:26px;line-height:1.1;letter-spacing:.04em;text-transform:uppercase;color:#5a1d28">${escapeHtml(ticket.movieTitle)}</h1>
            ${ticket.tagline ? `<p style="margin:6px 0 0;font-family:'Caveat',cursive;font-size:19px;color:#8b3a48">"${escapeHtml(ticket.tagline)}"</p>` : ""}
            <div style="margin-top:8px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;font-size:11px">
              <span style="padding:3px 10px;border-radius:999px;background:#5a1d28;color:#fbf3e4;letter-spacing:.18em;text-transform:uppercase;font-weight:700">${escapeHtml(ticket.genre || "feature")}</span>
              ${ticket.rating ? `<span style="padding:3px 10px;border-radius:999px;background:#c89f4a;color:#5a1d28;font-weight:800">★ ${escapeHtml(ticket.rating)}</span>` : ""}
            </div>
          </div>

          <!-- perforated divider -->
          <div style="position:relative;margin:18px 8px 14px;height:14px">
            <div style="position:absolute;left:-22px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:#fbf3e4;border:1px dashed #5a1d28"></div>
            <div style="position:absolute;right:-22px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:#fbf3e4;border:1px dashed #5a1d28"></div>
            <div style="position:absolute;left:14px;right:14px;top:50%;border-top:2px dashed #5a1d28;opacity:.5"></div>
          </div>

          <!-- stub details -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 18px;text-align:center">
            ${[
              { l: "Date", v: ticket.date },
              { l: "Time", v: ticket.time },
              { l: "Screen", v: String(screen) },
              { l: "Seat", v: ticket.seat },
            ].map(c => `
              <div>
                <div style="font-size:9px;letter-spacing:.22em;font-weight:800;color:#8b3a48;text-transform:uppercase">${c.l}</div>
                <div style="font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:16px;color:#5a1d28;margin-top:2px">${escapeHtml(c.v)}</div>
              </div>`).join("")}
          </div>

          ${ticket.mood || ticket.suggestedSnack ? `
          <div style="text-align:center;margin-top:14px;font-family:'Caveat',cursive;font-size:17px;color:#8b3a48">
            ${ticket.mood ? `mood — ${escapeHtml(ticket.mood)}` : ""}
            ${ticket.suggestedSnack ? ` · pair with ${escapeHtml(ticket.suggestedSnack.replace(/[\p{Emoji}\u200d]/gu,"").trim())}` : ""}
          </div>` : ""}

          ${ticket.funFact ? `
          <div style="margin:12px 22px 0;padding:10px 14px;border:1px dashed #c89f4a;border-radius:10px;background:rgba(255,250,240,.6);text-align:center;font-family:'Caveat',cursive;font-size:16px;color:#5a1d28;line-height:1.25">
            ${escapeHtml(ticket.funFact)}
          </div>` : ""}

          <!-- footer -->
          <div style="position:absolute;left:0;right:0;bottom:30px;text-align:center">
            <div style="font-family:'Caveat',cursive;font-size:18px;color:#8b3a48">a little ticket to a cozy night in</div>
            <div style="margin-top:4px;font-size:9px;letter-spacing:.4em;color:#5a1d28;opacity:.55">COZY CINEMA · KEEPSAKE EDITION</div>
          </div>
        </div>`;
      document.body.appendChild(host);

      // give fonts/images a moment to settle
      await new Promise(r => setTimeout(r, 120));
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;

      const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
        backgroundColor: "#fbf3e4",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      // A5 portrait keepsake
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(251, 243, 228);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
      pdf.save(`cozy-cinema-${ticket.movieTitle.replace(/\s+/g, "-").toLowerCase()}-ticket.pdf`);
    } catch (e) {
      console.error("PDF download failed:", e);
      toast({ title: "Couldn't save PDF", description: "Please try again.", variant: "destructive" });
    } finally {
      if (host && host.parentNode) host.parentNode.removeChild(host);
      setDownloadingPdf(false);
    }
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
          <Button variant="warm" size="sm" className="text-xs rounded-full" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
            {downloadingPdf ? "Stitching..." : "Save as PDF"}
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
          <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="w-3 h-3 mr-0.5 animate-spin" /> : <Download className="w-3 h-3 mr-0.5" />} PDF
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
