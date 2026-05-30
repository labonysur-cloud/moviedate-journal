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

export function toEmbedUrl(url: string): string {
  const clean = ensureHttp(url);
  if (!clean) return "";

  const yt = extractYouTubeId(clean);
  if (yt) {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3", // hide video annotations
      fs: "1",
      disablekb: "0",
      color: "white",
    });
    if (yt.start) params.set("start", String(yt.start));
    // youtube-nocookie reduces tracking & some ad targeting
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
