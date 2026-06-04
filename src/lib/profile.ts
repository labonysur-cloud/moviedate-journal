import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AppProfile {
  display_name: string;
  avatar_url: string | null;
}

const readUserMeta = (user: User, keys: string[]) => {
  for (const key of keys) {
    const value = user.user_metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const getProfileDefaults = (user: User): AppProfile => {
  const emailName = user.email?.split("@")[0]?.trim();

  return {
    display_name:
      readUserMeta(user, ["full_name", "name", "display_name"]) || emailName || "Movie Lover",
    avatar_url: readUserMeta(user, ["avatar_url", "picture"]),
  };
};

export async function getOrCreateProfile(user: User): Promise<AppProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .limit(1);

  if (error) throw error;

  const existing = data?.[0];
  const defaults = getProfileDefaults(user);

  if (!existing) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: defaults.display_name,
        avatar_url: defaults.avatar_url,
      })
      .select("display_name, avatar_url")
      .limit(1);

    if (insertError) throw insertError;

    return created?.[0] || defaults;
  }

  const patch: Partial<AppProfile> = {};

  if (!existing.display_name?.trim()) {
    patch.display_name = defaults.display_name;
  }

  if (!existing.avatar_url && defaults.avatar_url) {
    patch.avatar_url = defaults.avatar_url;
  }

  if (Object.keys(patch).length === 0) {
    return {
      display_name: existing.display_name || defaults.display_name,
      avatar_url: existing.avatar_url ?? defaults.avatar_url,
    };
  }

  const merged = {
    display_name: patch.display_name ?? existing.display_name ?? defaults.display_name,
    avatar_url: patch.avatar_url ?? existing.avatar_url ?? defaults.avatar_url,
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  return merged;
}

export async function saveProfile(user: User, updates: Partial<AppProfile>): Promise<AppProfile> {
  const current = await getOrCreateProfile(user);

  const nextProfile: AppProfile = {
    display_name: updates.display_name?.trim() || current.display_name,
    avatar_url: updates.avatar_url === undefined ? current.avatar_url : updates.avatar_url,
  };

  const { error } = await supabase
    .from("profiles")
    .update(nextProfile)
    .eq("user_id", user.id);

  if (error) throw error;

  return nextProfile;
}