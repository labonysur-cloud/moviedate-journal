import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useToast } from "@/hooks/use-toast";
import { HeartSparkleIcon } from "@/components/icons/CinemaIcons";

interface ShareTicketDialogProps {
  ticketId: string;
  movieTitle: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareTicketDialog({ ticketId, movieTitle, open, onClose }: ShareTicketDialogProps) {
  const { friends, loading } = useFriends();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const handleSend = async (friendUserId: string, friendName: string) => {
    if (!user) return;
    setSending(friendUserId);

    const { error } = await supabase
      .from("shared_tickets")
      .insert({
        ticket_id: ticketId,
        shared_by: user.id,
        shared_with: friendUserId,
      });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already shared", description: `You already sent this ticket to ${friendName}` });
      } else {
        toast({ title: "Error sharing", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "🎫 Ticket sent!", description: `Shared "${movieTitle}" ticket with ${friendName}` });
      setSent((prev) => [...prev, friendUserId]);
    }
    setSending(null);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-accent" />
              Send Ticket
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Share your <span className="font-semibold text-foreground">"{movieTitle}"</span> ticket with a friend
          </p>

          {loading ? (
            <div className="text-center py-6">
              <HeartSparkleIcon className="w-8 h-8 mx-auto animate-pulse" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6">
              <HeartSparkleIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">No friends yet!</p>
              <p className="text-xs text-muted-foreground mt-1">Add friends first to share tickets 💕</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.map((friend) => {
                const isSent = sent.includes(friend.user_id);
                const isSending = sending === friend.user_id;

                return (
                  <div
                    key={friend.user_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground text-sm">{friend.display_name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isSent ? "outline" : "warm"}
                      className="text-xs rounded-full"
                      onClick={() => handleSend(friend.user_id, friend.display_name)}
                      disabled={isSending || isSent}
                    >
                      {isSent ? (
                        <>
                          <Check className="w-3 h-3 mr-0.5" /> Sent
                        </>
                      ) : isSending ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-0.5" /> Send
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
