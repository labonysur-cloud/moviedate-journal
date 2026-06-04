import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ProfileSkeleton } from "@/components/PageSkeleton";
import { getOrCreateProfile, saveProfile } from "@/lib/profile";

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        if (!active) return;
        toast.error("Could not load your profile just now");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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
      toast.success("Photo saved to your scrapbook look");
    } catch {
      toast.error("Failed to update avatar");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nextProfile = await saveProfile(user, { display_name: displayName });
      setDisplayName(nextProfile.display_name);
      setAvatarUrl(nextProfile.avatar_url);
      toast.success("Your profile card is updated");
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

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border-2 border-border bg-card/95 p-6 sm:p-8 space-y-6 sm:space-y-8 shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.45)] bg-gingham"
        >
          <div className="pointer-events-none absolute inset-x-6 top-4 flex justify-between opacity-70">
            <span className="h-7 w-20 rotate-[-5deg] rounded-sm bg-secondary/80 shadow-sm" />
            <span className="h-7 w-20 rotate-[6deg] rounded-sm bg-secondary/80 shadow-sm" />
          </div>

          <div className="text-center">
            <p className="font-handwritten text-lg text-accent">your cozy cinema card</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center justify-center gap-2">
              <User className="w-6 sm:w-7 h-6 sm:h-7 text-primary" />
              Your Profile
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Keep your name and portrait in sync the first time, every time.</p>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative group cursor-pointer rounded-[26px] bg-background/85 p-4 border border-border shadow-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="w-24 sm:w-28 h-24 sm:h-28 border-2 border-primary/25 shadow-md">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xl sm:text-2xl">
                  {displayName?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-background animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-background" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="text-xs text-muted-foreground font-handwritten text-base">tap the portrait to pin a new photo</p>
          </div>

          {/* Display Name */}
          <div className="space-y-2 rounded-[22px] border border-border/80 bg-background/80 p-4 shadow-sm">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your cinema name..."
              className="rounded-2xl border-border/80 bg-card/80"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2 rounded-[22px] border border-border/80 bg-background/80 p-4 shadow-sm">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={user?.email || ""} disabled className="rounded-2xl border-border/80 bg-card/70 opacity-60" />
          </div>

          <Button variant="ticket" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
