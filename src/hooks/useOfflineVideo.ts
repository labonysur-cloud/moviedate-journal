import { useCallback, useEffect, useState } from "react";
import {
  canDownload,
  deleteOfflineMovie,
  downloadMovie,
  getOfflineEntry,
  isMovieOffline,
  listOfflineVideos,
  type OfflineIndexEntry,
} from "@/lib/offlineVideo";

export function useOfflineVideo(movieId?: string) {
  const [entry, setEntry] = useState<OfflineIndexEntry | null>(() =>
    movieId ? getOfflineEntry(movieId) : null
  );
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntry(movieId ? getOfflineEntry(movieId) : null);
    refresh();
    window.addEventListener("offline-videos-changed", refresh);
    return () => window.removeEventListener("offline-videos-changed", refresh);
  }, [movieId]);

  const download = useCallback(
    async (opts: { url: string; title: string; poster?: string }) => {
      if (!movieId) return;
      setDownloading(true);
      setError(null);
      setProgress({ received: 0, total: 0 });
      try {
        await downloadMovie({
          movieId,
          url: opts.url,
          title: opts.title,
          poster: opts.poster,
          onProgress: (received, total) => setProgress({ received, total }),
        });
      } catch (e: any) {
        setError(e.message || "Download failed");
      } finally {
        setDownloading(false);
        setProgress(null);
      }
    },
    [movieId]
  );

  const remove = useCallback(async () => {
    if (!movieId) return;
    await deleteOfflineMovie(movieId);
  }, [movieId]);

  return { entry, isOffline: !!entry, downloading, progress, error, download, remove };
}

export function useOfflineLibrary() {
  const [items, setItems] = useState<OfflineIndexEntry[]>(() => listOfflineVideos());
  useEffect(() => {
    const refresh = () => setItems(listOfflineVideos());
    window.addEventListener("offline-videos-changed", refresh);
    return () => window.removeEventListener("offline-videos-changed", refresh);
  }, []);
  return items;
}

export { canDownload, isMovieOffline };
