import { Download, HardDrive, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineVideo, canDownload } from "@/hooks/useOfflineVideo";
import { formatBytes } from "@/lib/offlineVideo";
import { useToast } from "@/hooks/use-toast";

interface Props {
  movieId: string;
  title: string;
  url: string | null | undefined;
  poster?: string | null;
  compact?: boolean;
}

export default function DownloadMovieButton({ movieId, title, url, poster, compact }: Props) {
  const { toast } = useToast();
  const { entry, isOffline, downloading, progress, download, remove } = useOfflineVideo(movieId);

  if (!canDownload(url)) {
    if (compact) return null;
    return (
      <Button variant="ghost" size="sm" disabled title="This host doesn't allow offline downloads">
        <HardDrive className="w-4 h-4 mr-1.5" />
        Not downloadable
      </Button>
    );
  }

  if (isOffline && entry) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={async (e) => {
          e.stopPropagation();
          await remove();
          toast({ title: "Removed offline copy", description: `${title} was deleted.` });
        }}
        className="gap-1.5"
      >
        <Trash2 className="w-4 h-4" />
        Saved · {formatBytes(entry.size)}
      </Button>
    );
  }

  if (downloading) {
    const pct = progress && progress.total ? Math.round((progress.received / progress.total) * 100) : null;
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Loader2 className="w-4 h-4 animate-spin" />
        {pct !== null ? `Saving ${pct}%` : `Saving ${formatBytes(progress?.received || 0)}`}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await download({ url: url!, title, poster: poster || undefined });
          toast({ title: "Ready to watch offline", description: `${title} is saved to this device.` });
        } catch (err: any) {
          toast({ title: "Couldn't download", description: err?.message, variant: "destructive" });
        }
      }}
      className="gap-1.5"
    >
      <Download className="w-4 h-4" />
      Save offline
    </Button>
  );
}
