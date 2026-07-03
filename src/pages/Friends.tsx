import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Link2, Copy, Check, UserPlus, Heart, Mail, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { HeartSparkleIcon, StarBurstIcon } from "@/components/icons/CinemaIcons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendsSkeleton } from "@/components/PageSkeleton";

export default function Friends() {
  const { friends, requests, myLink, loading, generateShareLink, addFriendByCode, acceptRequest, declineRequest, removeFriend } = useFriends();
  const { user } = useAuth();
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [autofilledFromUrl, setAutofilledFromUrl] = useState(false);

  const pendingRequests = requests.filter(
    (r) => r.status === "pending" && r.to_user === user?.id
  );

  const handleGenerateLink = async () => {
    const link = await generateShareLink();
    if (link) {
      const url = `${window.location.origin}/friends?code=${link.code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;
    setAdding(true);
    let code = friendCode.trim();
    try {
      if (code.includes("code=")) {
        code = new URL(code).searchParams.get("code") || code;
      }
    } catch {
      // Not a valid URL, use as-is
    }
    await addFriendByCode(code);
    setFriendCode("");
    setAdding(false);
  };

  useEffect(() => {
    const urlCode = new URLSearchParams(window.location.search).get("code");
    if (!urlCode || autofilledFromUrl || loading) return;
    setFriendCode(urlCode);
    setAutofilledFromUrl(true);
  }, [autofilledFromUrl, loading]);

  if (loading) {
    return (
      <div className="min-h-screen py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="w-7 sm:w-8 h-7 sm:h-8 text-primary" />
            Friends
          </h1>
          <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">Your movie night crew</p>
          <FriendsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Users className="w-7 sm:w-8 h-7 sm:h-8 text-primary" />
          Friends
        </h1>
        <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">Your movie night crew</p>

        {/* Share Link Section */}
        <div className="relative overflow-hidden rounded-[26px] border-2 border-border bg-card p-4 sm:p-6 mb-4 sm:mb-6 bg-gingham shadow-[0_16px_36px_-28px_hsl(var(--primary)/0.5)]">
          <div className="pointer-events-none absolute right-4 top-3 h-8 w-20 rotate-[5deg] rounded-sm bg-secondary/85 shadow-sm" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Invite Friends
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Copy one pretty invite link and share it when you want a new movie buddy.
          </p>
          <Button variant="warm" size="sm" onClick={handleGenerateLink} className="w-full sm:w-auto">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" /> Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" /> {myLink ? "Copy My Link" : "Generate & Copy Link"}
              </>
            )}
          </Button>
          {myLink && (
            <p className="text-xs text-muted-foreground mt-2 font-handwritten text-base">
              Your code: <code className="bg-muted px-2 py-0.5 rounded font-mono">{myLink.code}</code>
            </p>
          )}
        </div>

        {/* Add by Code */}
        <div className="relative overflow-hidden rounded-[26px] border-2 border-border bg-card p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_16px_36px_-28px_hsl(var(--accent)/0.45)]">
          <div className="pointer-events-none absolute left-5 top-3 h-8 w-16 -rotate-[6deg] rounded-sm bg-secondary/80 shadow-sm" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Add by Code or Link
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Paste a code or full invite link and we will tuck them right into your friends list.</p>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              placeholder="Paste friend code or link..."
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              className="flex-1 rounded-2xl border-border/80 bg-background/80"
            />
            <Button variant="ticket" size="sm" className="sm:min-w-[110px]" onClick={handleAddFriend} disabled={adding || !friendCode.trim()}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>

        {/* Pending Requests */}
        <AnimatePresence>
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-[26px] border-2 border-accent/35 bg-card p-4 sm:p-6 mb-4 sm:mb-6 shadow-[0_16px_36px_-28px_hsl(var(--accent)/0.45)]"
            >
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                Pending Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-[20px] bg-secondary/55 gap-2 border border-border/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 shrink-0">
                        {req.from_profile?.avatar_url && (
                          <AvatarImage src={req.from_profile.avatar_url} alt={req.from_profile.display_name} />
                        )}
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {req.from_profile?.display_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground text-sm truncate">
                        {req.from_profile?.display_name || "Someone"}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="warm" onClick={() => acceptRequest(req.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => declineRequest(req.id)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends List */}
        <div className="relative overflow-hidden rounded-[26px] border-2 border-border bg-card p-4 sm:p-6 bg-polka">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            My Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <HeartSparkleIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">No friends yet — share your link to connect!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-[20px] border border-border/60 bg-background/75 hover:bg-secondary/50 transition-colors"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    {friend.avatar_url && (
                      <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {friend.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{friend.display_name}</p>
                    <p className="text-xs text-muted-foreground font-handwritten text-base">movie buddy</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 shrink-0"
                    onClick={() => removeFriend(friend.id, friend.display_name)}
                    title="Remove friend"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
