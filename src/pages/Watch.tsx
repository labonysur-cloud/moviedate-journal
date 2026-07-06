import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, BookHeart, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toEmbedUrl, isDirectVideo, isExternalOnly, isTrustedPlayer, shouldUseDesktopPlayerProxy } from "@/lib/embedUrl";
import DesktopPlayerFrame from "@/components/DesktopPlayerFrame";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PLAYER_SANDBOX,
  PLAYER_ALLOW,
  getAdShieldEnabled,
  setAdShieldEnabled,
  installPopupGuard,
} from "@/lib/adShield";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { listOfflineVideos, getOfflineBlobUrl } from "@/lib/offlineVideo";
import { WifiOff, HardDrive } from "lucide-react";



export default function Watch() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Movie";
  const seasons = parseInt(searchParams.get("seasons") || "0");

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [shield, setShield] = useState<boolean>(() => getAdShieldEnabled());
  const [desktopMode, setDesktopMode] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    const saved = localStorage.getItem("cozy-cinema:desktop-mode");
    return saved === null ? true : saved === "1";
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [proxiedHtml, setProxiedHtml] = useState<string | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);

  useEffect(() => {
    if (!shield) return;
    const cleanup = installPopupGuard();
    return cleanup;
  }, [shield]);

  const toggleDesktop = () => {
    const next = !desktopMode;
    setDesktopMode(next);
    try { localStorage.setItem("cozy-cinema:desktop-mode", next ? "1" : "0"); } catch {}
    toast({
      title: next ? "Desktop mode on" : "Mobile mode",
      description: next
        ? "Desktop-sized player enabled for sources that push phones to install an app."
        : "Back to normal mobile layout.",
    });
  };


  const toggleShield = () => {
    const next = !shield;
    setShield(next);
    setAdShieldEnabled(next);
    toast({
      title: next ? "🛡️ Ad Shield is on" : "Shield paused",
      description: next
        ? "Popups, redirects & new-tab ads from the player are blocked."
        : "If a player wasn't loading right, this turns the guard off.",
    });
  };

  const baseUrl = useMemo(() => toEmbedUrl(rawUrl), [rawUrl]);

  const currentUrl = seasons > 0
    ? baseUrl.replace(/detailSe=\d+/, `detailSe=${season}`).replace(/detailEp=\d+/, `detailEp=${episode}`)
    : baseUrl;

  const shouldProxyForMobile = useMemo(() => {
    return Boolean(isMobile && desktopMode && currentUrl && !isDirectVideo(currentUrl) && !isExternalOnly(currentUrl) && shouldUseDesktopPlayerProxy(currentUrl));
  }, [currentUrl, desktopMode, isMobile]);

  useEffect(() => {
    let cancelled = false;
    setProxiedHtml(null);

    if (!shouldProxyForMobile) {
      setProxyLoading(false);
      return;
    }

    setProxyLoading(true);
    supabase.functions.invoke("player-proxy", { body: { url: currentUrl } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || data?.error || !data?.html) throw new Error(data?.error || error?.message || "Desktop player could not load");
        setProxiedHtml(data.html);
      })
      .catch((error) => {
        if (!cancelled) toast({ title: "Mobile desktop player failed", description: error.message, variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setProxyLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUrl, shouldProxyForMobile, toast]);

  // Offline playback: if this movie was saved to device, serve from cache.
  const [offlineSrc, setOfflineSrc] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      const match = listOfflineVideos().find((e) => e.url === rawUrl || e.url === currentUrl);
      if (!match) { setOfflineSrc(null); return; }
      const blobUrl = await getOfflineBlobUrl(match.movieId);
      if (blobUrl) { setOfflineSrc(blobUrl); revoked = blobUrl; }
    })();
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [rawUrl, currentUrl]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDesktop}
            className={`gap-1 ${desktopMode ? "text-accent hover:text-accent" : "text-primary-foreground/60"} hover:bg-primary-foreground/10`}
            title={desktopMode ? "Desktop mode ON — site pretends to be desktop" : "Request desktop site"}
          >
            <span className="text-xs">{desktopMode ? "Desktop" : "Mobile"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShield}
            className={`gap-1 ${shield ? "text-accent hover:text-accent" : "text-primary-foreground/60"} hover:bg-primary-foreground/10`}
            title={shield ? "Ad Shield is ON — popups & redirects blocked" : "Ad Shield is OFF"}
          >
            {shield ? <Shield className="w-3.5 h-3.5 fill-current" /> : <ShieldOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-xs">{shield ? "Shield" : "Shield off"}</span>
          </Button>

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
      <div className="w-full bg-black" style={{ height: seasons > 0 ? "calc(100vh - 168px)" : "calc(100vh - 120px)" }}>
        {isExternalOnly(currentUrl) ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <p className="text-primary-foreground/80 font-body max-w-md">
              This title is hosted on a free streaming platform that doesn't allow in-app playback.
              Click below to watch it free on the source platform.
            </p>
            <a href={currentUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ticket" size="lg">Watch free on source platform</Button>
            </a>
            <p className="text-xs text-primary-foreground/40 break-all max-w-md">{currentUrl}</p>
          </div>
        ) : offlineSrc ? (
          <div className="relative w-full h-full">
            <video
              key={offlineSrc}
              src={offlineSrc}
              controls
              autoPlay
              playsInline
              className="w-full h-full bg-black"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-primary-foreground/90">
              <HardDrive className="w-3.5 h-3.5" /> Playing from your device
            </div>
          </div>
        ) : isDirectVideo(currentUrl) ? (
          <video
            key={currentUrl}
            src={currentUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full bg-black"
          />
        ) : proxyLoading ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-primary-foreground/70">
            Loading desktop player...
          </div>
        ) : proxiedHtml ? (
          <DesktopPlayerFrame
            srcDoc={proxiedHtml}
            title={`${title} S${season}E${episode}`}
            desktopMode={desktopMode}
            allow={PLAYER_ALLOW}
          />
        ) : (
          <DesktopPlayerFrame
            src={currentUrl}
            title={`${title} S${season}E${episode}`}
            desktopMode={desktopMode}
            allow={PLAYER_ALLOW}
            sandbox={shield && !isTrustedPlayer(currentUrl) ? PLAYER_SANDBOX : undefined}
          />
        )}
      </div>


      {/* Bottom bar */}
      <div className="px-4 py-2 bg-card/10 backdrop-blur-sm border-t border-border/20 text-center">
        <p className="text-xs text-primary-foreground/50 italic font-handwritten text-base flex items-center justify-center gap-2">
          {shield ? (
            <>
              <Shield className="w-3 h-3 text-accent" />
              Ad Shield on — popups, redirects & new-tab ads blocked. If the player misbehaves, toggle shield off.
            </>
          ) : (
            <>✨ Enjoy the movie night together! Don't forget to write about it in your journal ✨</>
          )}
        </p>
      </div>
    </div>
  );
}
