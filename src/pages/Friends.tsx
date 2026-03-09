import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Link2, Copy, Check, UserPlus, Heart, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { HeartSparkleIcon, StarBurstIcon } from "@/components/icons/CinemaIcons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendsSkeleton } from "@/components/PageSkeleton";

export default function Friends() {
  const { friends, requests, myLink, loading, generateShareLink, addFriendByCode, acceptRequest, declineRequest } = useFriends();
  const { user } = useAuth();
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);

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
    const code = friendCode.includes("code=")
      ? new URL(friendCode).searchParams.get("code") || friendCode
      : friendCode.trim();
    await addFriendByCode(code);
    setFriendCode("");
    setAdding(false);
  };

  // Auto-add from URL params
  const urlCode = new URLSearchParams(window.location.search).get("code");
  if (urlCode && !friendCode && !loading) {
    setFriendCode(urlCode);
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="w-7 sm:w-8 h-7 sm:h-8 text-primary" />
            Friends
          </h1>
          <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">Your movie night crew 💕</p>
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
        <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">Your movie night crew 💕</p>

        {/* Share Link Section */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border mb-4 sm:mb-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Invite Friends
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a link and share it with your friends to connect!
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
            <p className="text-xs text-muted-foreground mt-2">
              Your code: <code className="bg-muted px-2 py-0.5 rounded font-mono">{myLink.code}</code>
            </p>
          )}
        </div>

        {/* Add by Code */}
        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border mb-4 sm:mb-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Add by Code or Link
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="Paste friend code or link..."
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              className="flex-1"
            />
            <Button variant="ticket" size="sm" onClick={handleAddFriend} disabled={adding || !friendCode.trim()}>
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
              className="bg-card rounded-2xl p-4 sm:p-6 border border-accent/30 mb-4 sm:mb-6"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                Pending Requests ({pendingRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 shrink-0">
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
        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            My Friends ({friends.length})
          </h3>
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
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {friend.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{friend.display_name}</p>
                    <p className="text-xs text-muted-foreground">Movie buddy 🍿</p>
                  </div>
                  <StarBurstIcon className="w-4 h-4 text-accent ml-auto shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
