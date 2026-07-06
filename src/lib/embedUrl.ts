export function ensureHttp(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

function normalizeMovieBoxUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!/(?:^|\.)(?:themoviebox|movibox|moviebox|inmoviebox)\./i.test(parsed.hostname)) return url;
    if (parsed.pathname !== "/movies" || !parsed.search) return url;

    const rawSearch = parsed.search.slice(1);
    const decodedSearch = decodeURIComponent(rawSearch);
    const marker = decodedSearch.indexOf("?");
    if (marker <= 0) return url;

    const slug = decodedSearch.slice(0, marker).replace(/^\/+|\/+$/g, "");
    if (!slug) return url;

    const params = new URLSearchParams(decodedSearch.slice(marker + 1));
    if (params.get("type") === "2") params.set("type", "/movie/detail");
    if (!params.has("detailSe")) params.set("detailSe", "");
    if (!params.has("detailEp")) params.set("detailEp", "");
    if (!params.has("lang")) params.set("lang", "en");
    params.delete("movie");

    return `${parsed.origin}/movies/${slug}?${params.toString()}`;
  } catch {
    return url;
  }
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
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com|player\.vimeo\.com|vimeo\.com|dailymotion\.com|archive\.org|ok\.ru|odnoklassniki\.ru|streamable\.com|mixdrop\.|dood\.|streamtape\.|filemoon\.|vidsrc\.|2embed\.|multiembed\.|vidcloud\.|cinecloud\.|cloudnestra\.|upstream\.to|voe\.sx|streamwish\.)/i.test(url);
}

export function toEmbedUrl(url: string): string {
  const clean = normalizeMovieBoxUrl(ensureHttp(url));
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

  // Ok.ru (odnoklassniki) — allows embedding
  const ok = clean.match(/ok\.ru\/(?:video|videoembed)\/(\d+)/i);
  if (ok) return `https://ok.ru/videoembed/${ok[1]}`;

  // Streamable
  const st = clean.match(/streamable\.com\/(?:e\/)?([a-z0-9]+)/i);
  if (st) return `https://streamable.com/e/${st[1]}`;

  // vidsrc / 2embed style multi-embed players (already embed-friendly)
  if (/vidsrc\.|2embed\.|multiembed\.|vidcloud\./i.test(clean)) return clean;

  return clean;
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

// Platforms that consistently block iframe embedding (X-Frame-Options) — must open in new tab.
// Mirror/player hosts such as MovieBox, Cinefreak, MLWBD, CineCloud, etc. are deliberately
// NOT listed here, because opening them externally on phones triggers their install-app pages.
// The watch page instead embeds them inside a desktop-sized iframe.
export function isExternalOnly(url: string): boolean {
  return /(?:tubitv\.com|pluto\.tv|watch\.plex\.tv|amazon\.com|primevideo\.com|freevee)/i.test(url);
}

export function shouldUseDesktopPlayerProxy(url: string): boolean {
  return /(?:cinecloud\.|cloudnestra\.|yagaverse\.net|netfilm\.world|themoviebox\.|movibox\.|moviebox\.|inmoviebox\.|cinefreak\.|mlwbd\.|mlsbd\.|bubbletv\.|hdhub4u\.|vidsrc\.|2embed\.|multiembed\.|vidcloud\.)/i.test(url);
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
  if (/ok\.ru|odnoklassniki/.test(u)) return { key: "okru", label: "OK.ru" };
  if (/streamable\.com/.test(u)) return { key: "streamable", label: "Streamable" };
  if (/moviebox\.|inmoviebox\./.test(u)) return { key: "moviebox", label: "MovieBox" };
  if (/cinefreak\./.test(u)) return { key: "cinefreak", label: "Cinefreak" };
  if (/mlwbd\.|mlsbd\./.test(u)) return { key: "mlwbd", label: "MLWBD" };
  if (/bubbletv\./.test(u)) return { key: "bubbletv", label: "Bubble TV" };
  if (/hdhub4u\.|filmyzilla\.|9xmovies\.|katmoviehd\./.test(u)) return { key: "hdhub", label: "HD Mirror" };
  if (/vidsrc\.|2embed\.|multiembed\.|vidcloud\./.test(u)) return { key: "vidsrc", label: "Multi-source Player" };
  if (/fmovies\./.test(u)) return { key: "fmovies", label: "FMovies" };
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) return { key: "direct", label: "Direct video" };
  return { key: "other", label: "External" };
}
