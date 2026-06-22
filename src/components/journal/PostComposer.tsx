import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, Film, X, Loader2, Send, Globe, Users, UserCheck, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Audience = "public" | "friends" | "select_friends" | "private";

interface FriendOption {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const audienceMeta: Record<Audience, { label: string; icon: typeof Globe; hint: string }> = {
  public: { label: "Everyone", icon: Globe, hint: "Anyone signed in can see" },
  friends: { label: "Friends", icon: Users, hint: "Only your friends" },
  select_friends: { label: "Select friends", icon: UserCheck, hint: "Pick who can see" },
  private: { label: "Only me", icon: Lock, hint: "Private to your journal" },
};

const MAX_VIDEO_SECONDS = 60;

export default function PostComposer({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [audience, setAudience] = useState<Audience>("public");
  const [selected, setSelected] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [busy, setBusy] = useState(false);

  // load accepted friends for the picker
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("friend_requests")
        .select("from_user,to_user,status")
        .eq("status", "accepted")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
      const ids = Array.from(new Set((data ?? []).map((r) => (r.from_user === user.id ? r.to_user : r.from_user))));
      if (ids.length === 0) return setFriends([]);
      const { data: profs } = await supabase
        .from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids);
      setFriends(profs ?? []);
    })();
  }, [user]);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).slice(0, 4 - files.length);
    for (const f of incoming) {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} too large (50MB max)`); continue; }
      if (f.type.startsWith("video/")) {
        const seconds = await new Promise<number>((res) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => res(v.duration);
          v.onerror = () => res(0);
          v.src = URL.createObjectURL(f);
        });
        if (seconds > MAX_VIDEO_SECONDS + 1) {
          toast.error(`Clips must be ${MAX_VIDEO_SECONDS}s or shorter`);
          continue;
        }
      }
      setFiles((p) => [...p, f]);
      setPreviews((p) => [...p, { url: URL.createObjectURL(f), type: f.type.startsWith("video/") ? "video" : "image" }]);
    }
  };

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const reset = () => {
    setText(""); setMovieTitle(""); setFiles([]); setPreviews([]); setSelected([]); setAudience("public"); setOpen(false);
  };

  const submit = async () => {
    if (!user) return;
    if (!text.trim() && files.length === 0) { toast.error("Add something to share"); return; }
    setBusy(true);
    try {
      const uploaded: { url: string; type: "image" | "video" }[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("journal-media").upload(path, f, { contentType: f.type });
        if (error) throw error;
        const { data } = await supabase.storage.from("journal-media").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (data?.signedUrl) uploaded.push({ url: data.signedUrl, type: f.type.startsWith("video/") ? "video" : "image" });
      }
      const { error } = await supabase.from("journal_posts").insert({
        user_id: user.id,
        content: text.trim(),
        movie_title: movieTitle.trim() || null,
        media_urls: uploaded,
        audience,
        allowed_user_ids: audience === "select_friends" ? selected : [],
      });
      if (error) throw error;
      toast.success("Posted to your journal");
      reset();
      onPosted();
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const AudienceIcon = audienceMeta[audience].icon;

  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 shadow-sm">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left text-sm text-muted-foreground px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted transition"
        >
          Share a movie thought, clip or photo…
        </button>
      ) : (
        <div className="space-y-3">
          <Textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you just watch? Drop a clip, a snap, a tiny review…"
            className="resize-none"
          />
          <Input
            placeholder="Movie or show (optional)"
            value={movieTitle}
            onChange={(e) => setMovieTitle(e.target.value)}
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-border">
                  {p.type === "image"
                    ? <img src={p.url} className="w-full h-40 object-cover" />
                    : <video src={p.url} className="w-full h-40 object-cover" controls muted />}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 p-1 bg-background/80 rounded-full"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80">
              <ImageIcon className="w-3.5 h-3.5" /> Photo
              <input type="file" hidden accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
            </label>
            <label className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80">
              <Film className="w-3.5 h-3.5" /> Clip ≤{MAX_VIDEO_SECONDS}s
              <input type="file" hidden accept="video/*" onChange={(e) => addFiles(e.target.files)} />
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80"
                >
                  <AudienceIcon className="w-3.5 h-3.5" />
                  {audienceMeta[audience].label}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2">
                <div className="space-y-1">
                  {(Object.keys(audienceMeta) as Audience[]).map((a) => {
                    const Meta = audienceMeta[a];
                    const Icon = Meta.icon;
                    return (
                      <button
                        key={a}
                        onClick={() => setAudience(a)}
                        type="button"
                        className={`flex items-start gap-2 w-full text-left p-2 rounded-lg hover:bg-secondary ${audience === a ? "bg-secondary" : ""}`}
                      >
                        <Icon className="w-4 h-4 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">{Meta.label}</div>
                          <div className="text-xs text-muted-foreground">{Meta.hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {audience === "select_friends" && (
                  <div className="mt-2 max-h-56 overflow-y-auto border-t pt-2">
                    {friends.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No friends yet — add some first.</p>
                    ) : friends.map((f) => (
                      <label key={f.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer">
                        <Checkbox
                          checked={selected.includes(f.user_id)}
                          onCheckedChange={(v) => setSelected((p) => v ? [...p, f.user_id] : p.filter((x) => x !== f.user_id))}
                        />
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={f.avatar_url ?? undefined} />
                          <AvatarFallback>{f.display_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{f.display_name ?? "Friend"}</span>
                      </label>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>Cancel</Button>
              <Button variant="warm" size="sm" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
