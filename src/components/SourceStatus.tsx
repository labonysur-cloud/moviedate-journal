import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSourcePlatform, toEmbedUrl } from "@/lib/embedUrl";
import { cn } from "@/lib/utils";

type Status = "checking" | "available" | "unavailable" | "unknown";

interface Props {
  url?: string | null;
  movieId?: string;
  movieTitle: string;
  year?: string;
  /** Called after a successful re-find with the new embed_url so parent can refresh UI. */
  onLinkUpdated?: (newEmbedUrl: string) => void;
  className?: string;
}

export default function SourceStatus({ url, movieId, movieTitle, year, onLinkUpdated, className }: Props) {
  const [status, setStatus] = useState<Status>(url ? "checking" : "unknown");
  const [refinding, setRefinding] = useState(false);
  const { toast } = useToast();
  const platform = url ? getSourcePlatform(url) : null;

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setStatus("unknown");
      return;
    }
    setStatus("checking");
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("movie-ai", {
          body: { action: "verify_link", url },
        });
        if (cancelled) return;
        if (error) {
          setStatus("unknown");
          return;
        }
        setStatus(data?.available ? "available" : "unavailable");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const handleRefind = async () => {
    setRefinding(true);
    try {
      const { data, error } = await supabase.functions.invoke("movie-ai", {
        body: { action: "find_free_link", title: movieTitle, year },
      });
      if (error) throw error;
      const newUrl = data?.embed_url ? toEmbedUrl(data.embed_url) : "";
      if (!newUrl) {
        toast({ title: "No free source found", description: "Try again later or add a link manually.", variant: "destructive" });
      } else {
        if (movieId) {
          await supabase.from("movies").update({ embed_url: newUrl, watch_url: data.embed_url }).eq("id", movieId);
        }
        onLinkUpdated?.(newUrl);
        setStatus("available");
        toast({ title: "Found a new free source", description: getSourcePlatform(newUrl)?.label || "Updated link" });
      }
    } catch (e: any) {
      toast({ title: "Couldn't refresh link", description: e.message, variant: "destructive" });
    }
    setRefinding(false);
  };

  if (!url) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="text-[10px] gap-1">
          <AlertTriangle className="w-3 h-3" /> No free source
        </Badge>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleRefind} disabled={refinding}>
          {refinding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span className="ml-1">Find one</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {status === "checking" && (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Checking {platform?.label}
        </Badge>
      )}
      {status === "available" && (
        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Free on {platform?.label}
        </Badge>
      )}
      {status === "unavailable" && (
        <>
          <Badge variant="destructive" className="text-[10px] gap-1">
            <AlertTriangle className="w-3 h-3" /> {platform?.label} unavailable
          </Badge>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleRefind} disabled={refinding}>
            {refinding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span className="ml-1">Find new link</span>
          </Button>
        </>
      )}
      {status === "unknown" && (
        <Badge variant="outline" className="text-[10px] gap-1">
          Source: {platform?.label}
        </Badge>
      )}
    </div>
  );
}
