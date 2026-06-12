import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, Save, Loader2, Trash2, Film, Star, Ticket, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMovies } from "@/hooks/useMovies";
import { useTickets } from "@/hooks/useTickets";
import { toast } from "sonner";
import { ProfileSkeleton } from "@/components/PageSkeleton";
import { getOrCreateProfile, saveProfile } from "@/lib/profile";

export default function Profile() {
  const { user } = useAuth();
  const { movies, deleteMovie, loading: moviesLoading } = useMovies();
  const { tickets } = useTickets();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [journalCount, setJournalCount] = useState(0);

  const myMovies = useMemo(
    () => movies.filter((m) => m.added_by === user?.id),
    [movies, user?.id]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    getOrCreateProfile(user)
      .then((data) => {
        if (!active) return;
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
      })
      .catch(() => {
        if (active) toast.error("Could not load your profile just now");
      })
      .finally(() => active && setLoading(false));

    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => active && setJournalCount(count || 0));

    return () => {
      active = false;
    };
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    try {
      const nextProfile = await saveProfile(user, { avatar_url: publicUrl });
      setDisplayName(nextProfile.display_name);
      setAvatarUrl(nextProfile.avatar_url);
      toast.success("New portrait pinned to your scrapbook");
    } catch {
      toast.error("Failed to update avatar");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const next = await saveProfile(user, { display_name: displayName });
      setDisplayName(next.display_name);
      setAvatarUrl(next.avatar_url);
      toast.success("Your cinema card is updated");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 sm:py-12 px-4">
        <ProfileSkeleton />
      </div>
    );
  }

  const initial = (displayName?.[0] || user?.email?.[0] || "?").toUpperCase();
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 bg-polka">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* Hero / Polaroid */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative grid md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center rounded-[28px] border-2 border-border bg-card/95 p-6 sm:p-8 bg-gingham shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.45)]"
        >
          {/* Washi tape */}
          <span className="pointer-events-none absolute -top-3 left-10 h-6 w-24 rotate-[-6deg] rounded-sm bg-accent/70 shadow-sm" />
          <span className="pointer-events-none absolute -top-3 right-10 h-6 w-24 rotate-[5deg] rounded-sm bg-primary/40 shadow-sm" />

          {/* Polaroid avatar */}
          <div className="mx-auto md:mx-0">
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="relative group cursor-pointer bg-background/90 p-3 pb-10 rounded-md border border-border shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.4)] rotate-[-2deg] hover:rotate-0 transition-transform"
            >
              <Avatar className="w-36 h-36 sm:w-44 sm:h-44 rounded-sm">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground text-4xl rounded-sm">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-3 bottom-10 rounded-sm bg-foreground/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-background">
                {uploading ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-7 h-7" />
                    <span className="text-xs font-medium">Change photo</span>
                  </>
                )}
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center font-handwritten text-base text-primary truncate px-3">
                {displayName || "you ♡"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Meta + stats */}
          <div className="text-center md:text-left">
            <p className="font-handwritten text-lg text-accent">your cozy cinema card</p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-2 justify-center md:justify-start">
              <User className="w-7 h-7 text-primary" />
              {displayName || "Movie Lover"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
            <p className="text-xs text-muted-foreground font-handwritten text-base mt-1">
              member since {joined}
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5 max-w-md mx-auto md:mx-0">
              <StatChip icon={<Film className="w-4 h-4" />} value={myMovies.length} label="Added" />
              <StatChip icon={<Ticket className="w-4 h-4" />} value={tickets.length} label="Tickets" />
              <StatChip icon={<BookHeart className="w-4 h-4" />} value={journalCount} label="Journal" />
            </div>
          </div>
        </motion.div>

        {/* Edit details */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid sm:grid-cols-2 gap-4 rounded-[24px] border-2 border-primary/10 bg-card/95 p-5 sm:p-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground font-handwritten text-base">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your cinema name..."
              className="rounded-2xl border-border/80 bg-background/80"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground font-handwritten text-base">
              Email
            </label>
            <Input
              value={user?.email || ""}
              disabled
              className="rounded-2xl border-border/80 bg-background/60 opacity-70"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button variant="ticket" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save changes
            </Button>
          </div>
        </motion.div>

        {/* My Movies */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[24px] border-2 border-primary/10 bg-card/95 p-5 sm:p-7"
        >
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="font-handwritten text-lg text-accent">your shelf</p>
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Movies you added
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">{myMovies.length} total</span>
          </div>

          {moviesLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
              <Loader2 className="w-4 h-4 animate-spin" /> Dusting the shelf…
            </div>
          ) : myMovies.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl bg-background/40">
              <Film className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="font-handwritten text-lg mt-2 text-muted-foreground">
                no movies pinned yet
              </p>
              <p className="text-xs text-muted-foreground">Add one from the Movies page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {myMovies.map((m, i) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative bg-background/80 p-2 pb-8 rounded-md border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                    style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.2}deg)` }}
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-muted">
                      <img
                        src={m.poster || "/placeholder.svg"}
                        alt={m.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {m.rating && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        <span className="text-[10px] font-bold">{m.rating}</span>
                      </div>
                    )}
                    <p className="absolute bottom-1.5 left-0 right-0 text-center font-handwritten text-sm text-primary truncate px-2">
                      {m.title}
                    </p>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          aria-label={`Remove ${m.title}`}
                          className="absolute top-3 left-3 p-1.5 rounded-full bg-card/85 backdrop-blur border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove "{m.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This deletes the movie from the shared collection.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMovie(m.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-background/80 border border-border py-3 px-2 shadow-sm">
      <div className="flex items-center gap-1 text-primary">
        {icon}
        <span className="font-display text-xl font-bold text-foreground">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground font-handwritten text-sm">{label}</span>
    </div>
  );
}
