import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FriendRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
  from_profile?: { display_name: string; avatar_url: string | null };
  to_profile?: { display_name: string; avatar_url: string | null };
}

export interface FriendLink {
  id: string;
  code: string;
  user_id: string;
  created_at: string;
}

export function useFriends() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<{ id: string; display_name: string; avatar_url: string | null; user_id: string }[]>([]);
  const [myLink, setMyLink] = useState<FriendLink | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFriends = async () => {
    if (!user) return;

    // Fetch friend requests
    const { data: reqData } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (reqData) {
      // Get profiles for all users in requests
      const userIds = [...new Set(reqData.flatMap((r) => [r.from_user, r.to_user]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      const enriched = reqData.map((r) => ({
        ...r,
        from_profile: profileMap[r.from_user],
        to_profile: profileMap[r.to_user],
      }));

      setRequests(enriched);

      // Extract accepted friends
      const acceptedFriends = enriched
        .filter((r) => r.status === "accepted")
        .map((r) => {
          const friendId = r.from_user === user.id ? r.to_user : r.from_user;
          const profile = profileMap[friendId];
          return {
            id: r.id,
            user_id: friendId,
            display_name: profile?.display_name || "Friend",
            avatar_url: profile?.avatar_url || null,
          };
        });
      setFriends(acceptedFriends);
    }

    // Fetch my share link
    const { data: linkData } = await supabase
      .from("friend_links")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (linkData && linkData.length > 0) {
      setMyLink(linkData[0]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchFriends();
  }, [user]);

  const generateShareLink = async () => {
    if (!user) return null;
    if (myLink) return myLink;

    const { data, error } = await supabase
      .from("friend_links")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }
    setMyLink(data);
    return data;
  };

  const addFriendByCode = async (code: string) => {
    if (!user) return false;

    // Look up the friend link
    const { data: links } = await supabase
      .from("friend_links")
      .select("*")
      .eq("code", code.trim())
      .limit(1);

    if (!links || links.length === 0) {
      toast({ title: "Invalid code", description: "No friend found with that code", variant: "destructive" });
      return false;
    }

    const friendUserId = links[0].user_id;
    if (friendUserId === user.id) {
      toast({ title: "That's you!", description: "You can't add yourself as a friend", variant: "destructive" });
      return false;
    }

    // Check if already friends or pending
    const existing = requests.find(
      (r) =>
        (r.from_user === user.id && r.to_user === friendUserId) ||
        (r.from_user === friendUserId && r.to_user === user.id)
    );
    if (existing) {
      toast({ title: "Already connected", description: "You already have a request with this person" });
      return false;
    }

    // Send friend request (auto-accepted via link)
    const { error } = await supabase
      .from("friend_requests")
      .insert({ from_user: user.id, to_user: friendUserId, status: "accepted" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "🎉 Friend added!", description: "You're now connected!" });
    await fetchFriends();
    return true;
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "🎉 Friend accepted!" });
    await fetchFriends();
  };

  const declineRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await fetchFriends();
  };

  return {
    requests,
    friends,
    myLink,
    loading,
    generateShareLink,
    addFriendByCode,
    acceptRequest,
    declineRequest,
    refetch: fetchFriends,
  };
}
