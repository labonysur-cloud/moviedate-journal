// Offline video downloader using Cache Storage API.
// Only works for direct .mp4/.webm URLs on CORS-friendly hosts.

const CACHE_NAME = "offline-videos-v1";
const INDEX_KEY = "cozy_cinema_offline_index_v1";

export interface OfflineIndexEntry {
  movieId: string;
  url: string;
  title: string;
  poster?: string;
  size: number;
  savedAt: number;
}

type IndexMap = Record<string, OfflineIndexEntry>;

function readIndex(): IndexMap {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeIndex(idx: IndexMap) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  window.dispatchEvent(new CustomEvent("offline-videos-changed"));
}

export function listOfflineVideos(): OfflineIndexEntry[] {
  return Object.values(readIndex()).sort((a, b) => b.savedAt - a.savedAt);
}

export function isMovieOffline(movieId: string): boolean {
  return !!readIndex()[movieId];
}

export function getOfflineEntry(movieId: string): OfflineIndexEntry | null {
  return readIndex()[movieId] || null;
}

export function totalOfflineBytes(): number {
  return listOfflineVideos().reduce((n, e) => n + (e.size || 0), 0);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function canDownload(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|m4v|ogv)(\?.*)?$/i.test(url);
}

export interface DownloadOptions {
  movieId: string;
  url: string;
  title: string;
  poster?: string;
  onProgress?: (received: number, total: number) => void;
  signal?: AbortSignal;
}

export async function downloadMovie(opts: DownloadOptions): Promise<OfflineIndexEntry> {
  if (!("caches" in window)) throw new Error("Offline storage is not supported on this device.");
  if (!canDownload(opts.url)) throw new Error("This movie can't be downloaded — it's not a direct video file.");

  const res = await fetch(opts.url, { mode: "cors", signal: opts.signal });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}). The host may block downloads.`);

  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      opts.onProgress?.(received, total);
    }
  }
  const blob = new Blob(chunks as BlobPart[], {
    type: res.headers.get("content-type") || "video/mp4",
  });
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `/__offline/${opts.movieId}`;
  await cache.put(
    new Request(cacheKey),
    new Response(blob, { headers: { "content-type": blob.type } })
  );

  const entry: OfflineIndexEntry = {
    movieId: opts.movieId,
    url: opts.url,
    title: opts.title,
    poster: opts.poster,
    size: blob.size,
    savedAt: Date.now(),
  };
  const idx = readIndex();
  idx[opts.movieId] = entry;
  writeIndex(idx);
  return entry;
}

export async function getOfflineBlobUrl(movieId: string): Promise<string | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(`/__offline/${movieId}`);
  if (!res) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function deleteOfflineMovie(movieId: string): Promise<void> {
  if ("caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`/__offline/${movieId}`);
  }
  const idx = readIndex();
  delete idx[movieId];
  writeIndex(idx);
}
