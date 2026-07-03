export function ensureHttp(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function extractYouTubeId(url: string): { id: string; start?: number } | null {
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

export function isTrustedPlayer(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com|player\.vimeo\.com|vimeo\.com|dailymotion\.com|archive\.org|ok\.ru|odnoklassniki\.ru|streamable\.com|mixdrop\.|dood\.|streamtape\.|filemoon\.|vidsrc\.|2embed\.|multiembed\.|vidcloud\.|upstream\.to|voe\.sx|streamwish\.)/i.test(url);
}

export function toEmbedUrl(url: string): string {
  const clean = ensureHttp(url);
  if (!clean) return "";

  const yt = extractYouTubeId(clean);
  if (yt) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
      fs: "1",
      enablejsapi: "1",
      color: "white",
    });
    if (origin) params.set("origin", origin);
    if (yt.start) params.set("start", String(yt.start));
    return `https://www.youtube-nocookie.com/embed/${yt.id}?${params.toString()}`;
  }


  const vimeo = clean.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  const dm = clean.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-z0-9]+)/i);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;

  // Internet Archive — ad-free public domain films
  const ia = clean.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);
  if (ia) return `https://archive.org/embed/${ia[1]}`;

  return clean;
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

// Platforms that block iframe embedding (X-Frame-Options) — must open in new tab.
export function isExternalOnly(url: string): boolean {
  return /(?:tubitv\.com|pluto\.tv|watch\.plex\.tv|amazon\.com|primevideo\.com|freevee)/i.test(url);
}

// Identify which free source the link comes from (for status badges).
export function getSourcePlatform(url: string): { key: string; label: string } | null {
  if (!url) return null;
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|youtube-nocookie\.com/.test(u)) {
    if (/youtube\.com\/movies/.test(u)) return { key: "youtube_movies", label: "YouTube Movies" };
    return { key: "youtube", label: "YouTube" };
  }
  if (/tubitv\.com/.test(u)) return { key: "tubi", label: "Tubi" };
  if (/pluto\.tv/.test(u)) return { key: "pluto", label: "Pluto TV" };
  if (/watch\.plex\.tv/.test(u)) return { key: "plex", label: "Plex" };
  if (/freevee|amazon\.com|primevideo\.com/.test(u)) return { key: "freevee", label: "Freevee" };
  if (/archive\.org/.test(u)) return { key: "archive", label: "Internet Archive" };
  if (/vimeo\.com/.test(u)) return { key: "vimeo", label: "Vimeo" };
  if (/dailymotion\.com/.test(u)) return { key: "dailymotion", label: "Dailymotion" };
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) return { key: "direct", label: "Direct video" };
  return { key: "other", label: "External" };
}
