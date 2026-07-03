import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Users, Copy, Check, MessageCircle, Smile, Image as ImageIcon, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toEmbedUrl, isDirectVideo } from "@/lib/embedUrl";

interface RoomMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

interface RoomMember {
  user_id: string;
  profile?: { display_name: string; avatar_url: string | null };
}

const EMOJI_LIST = [
  "😂", "❤️", "🔥", "👏", "😍", "🥺", "😭", "🤣", "💀", "✨",
  "🎬", "🍿", "👀", "😱", "🥰", "😏", "💕", "🙌", "😤", "🫣",
  "😮", "🤯", "💔", "🎉", "👻", "😴", "🤩", "😈", "💖", "🫶",
];

export default function WatchRoom() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const inviteCode = searchParams.get("invite");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<string[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null }>>({});

  // Join via invite code
  useEffect(() => {
    if (!inviteCode || !user) return;
    (async () => {
      // Secure invite code lookup & join — server validates code and inserts membership
      const { data: foundRoomId, error } = await supabase
        .rpc("join_room_with_code", { _code: inviteCode });
      if (!error && foundRoomId) {
        navigate(`/watch-together?room=${foundRoomId}`, { replace: true });
      } else {
        toast.error("Room not found or expired");
        navigate("/movies");
      }
    })();
  }, [inviteCode, user, navigate]);

  // Load room
  useEffect(() => {
    if (!roomId || !user) return;
    (async () => {
      const { data: r } = await supabase
        .from("watch_rooms")
        .select("id, movie_id, movie_title, embed_url, host_id, is_active, created_at")
        .eq("id", roomId)
        .single();
      if (!r) { toast.error("Room not found"); navigate("/movies"); return; }
      setRoom(r);

      // Ensure host membership row exists (non-hosts joined via RPC already)
      if (r.host_id === user.id) {
        await supabase.from("room_members").upsert({ room_id: roomId, user_id: user.id }, { onConflict: "room_id,user_id" });
      }


      // Load members
      const { data: mems } = await supabase.from("room_members").select("user_id").eq("room_id", roomId);
      if (mems) {
        const userIds = mems.map((m: any) => m.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        const profMap: Record<string, any> = {};
        profs?.forEach((p: any) => { profMap[p.user_id] = p; });
        setProfiles(profMap);
        setMembers(mems.map((m: any) => ({ ...m, profile: profMap[m.user_id] })));
      }

      // Load messages
      const { data: msgs } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (msgs) setMessages(msgs);

      setLoading(false);
    })();
  }, [roomId, user, navigate]);

  // Realtime subscriptions
  useEffect(() => {
    if (!roomId || !user) return;

    const msgChannel = supabase
      .channel(`room-msgs-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as RoomMessage]);
        }
      )
      .subscribe();

    const memChannel = supabase
      .channel(`room-members-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        async () => {
          const { data: mems } = await supabase.from("room_members").select("user_id").eq("room_id", roomId);
          if (mems) {
            const newIds = mems.map((m: any) => m.user_id).filter((id: string) => !profiles[id]);
            if (newIds.length) {
              const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", newIds);
              profs?.forEach((p: any) => { profiles[p.user_id] = p; });
              setProfiles({ ...profiles });
            }
            setMembers(mems.map((m: any) => ({ ...m, profile: profiles[m.user_id] })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(memChannel);
    };
  }, [roomId, user, profiles]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content?: string) => {
    const msg = content || newMsg.trim();
    if (!msg || !roomId || !user) return;
    await supabase.from("room_messages").insert({ room_id: roomId, user_id: user.id, content: msg });
    setNewMsg("");
    setShowEmoji(false);
    setShowGif(false);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) { setGifs([]); return; }
    setGifLoading(true);
    try {
      const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=12&media_filter=tinygif`);
      const data = await res.json();
      setGifs(data.results?.map((r: any) => r.media_formats?.tinygif?.url).filter(Boolean) || []);
    } catch {
      setGifs([]);
    }
    setGifLoading(false);
  };

  const sendGif = (url: string) => {
    sendMessage(`[gif]${url}[/gif]`);
  };

  const copyInvite = async () => {
    if (!room || room.host_id !== user?.id) {
      toast.error("Only the host can share the invite link");
      return;
    }
    const { data: code, error } = await supabase.rpc("get_room_invite_code", { _room_id: room.id });
    if (error || !code) {
      toast.error("Couldn't fetch invite code");
      return;
    }
    const url = `${window.location.origin}/watch-together?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };


  if (loading || !room) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading room...</div>;
  }

  const embedUrl = room.embed_url;
  const currentUrl = embedUrl ? toEmbedUrl(embedUrl) : "";

  return (
    <div className="min-h-screen bg-foreground/95 flex flex-col">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 bg-card/10 backdrop-blur-sm border-b border-border/20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <Link to="/movies">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-lg font-semibold text-primary-foreground truncate">
            {room.movie_title}
          </h1>
          <span className="text-xs bg-accent/80 text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" /> {members.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyInvite} className="text-primary-foreground hover:bg-primary-foreground/10">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? "Copied!" : "Invite"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Video */}
        <div className={`flex-1 transition-all ${chatOpen ? "mr-0" : ""} bg-black`}>
          {currentUrl ? (
            isDirectVideo(currentUrl) ? (
              <video
                key={currentUrl}
                src={currentUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full bg-black"
              />
            ) : (
              <iframe
                key={currentUrl}
                src={currentUrl}
                title={room.movie_title}
                className="w-full h-full border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"
              />

            )
          ) : (
            <div className="flex items-center justify-center h-full text-primary-foreground/50">
              <p>No embed URL available for this movie</p>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border/20 bg-card/10 backdrop-blur-sm flex flex-col overflow-hidden shrink-0"
            >
              {/* Header with close */}
              <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-wider">Chat</span>
                <button onClick={() => setChatOpen(false)} aria-label="Close chat panel" className="text-primary-foreground/40 hover:text-primary-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Members bar */}
              <div className="px-3 py-2 border-b border-border/20 flex items-center gap-1 overflow-x-auto">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-1 shrink-0">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {(m.profile?.display_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-primary-foreground/60 max-w-[60px] truncate">
                      {m.profile?.display_name || "Anon"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  const prof = profiles[msg.user_id];
                  const gifMatch = msg.content.match(/^\[gif\](.*?)\[\/gif\]$/);
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <Avatar className="w-6 h-6 shrink-0 mt-1">
                        <AvatarImage src={prof?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                          {(prof?.display_name || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[200px] ${isMe ? "text-right" : ""}`}>
                        <p className="text-[10px] text-primary-foreground/40 mb-0.5">
                          {prof?.display_name || "Anon"}
                        </p>
                        {gifMatch ? (
                          <img src={gifMatch[1]} alt="GIF" className="rounded-xl max-w-[180px]" />
                        ) : msg.content.length <= 2 && /\p{Emoji}/u.test(msg.content) ? (
                          <span className="text-3xl">{msg.content}</span>
                        ) : (
                          <p className={`text-xs px-3 py-1.5 rounded-2xl break-words ${
                            isMe
                              ? "bg-accent text-accent-foreground rounded-tr-sm"
                              : "bg-primary-foreground/10 text-primary-foreground rounded-tl-sm"
                          }`}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Emoji picker */}
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/20 overflow-hidden"
                  >
                    <div className="grid grid-cols-6 gap-1 p-2">
                      {EMOJI_LIST.map((e) => (
                        <button
                          key={e}
                          onClick={() => sendMessage(e)}
                          className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-primary-foreground/10"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GIF picker */}
              <AnimatePresence>
                {showGif && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 200, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/20 overflow-hidden flex flex-col"
                  >
                    <div className="px-2 pt-2 flex gap-1">
                      <Input
                        value={gifSearch}
                        onChange={(e) => setGifSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchGifs(gifSearch)}
                        placeholder="Search GIFs..."
                        className="bg-primary-foreground/10 border-border/30 text-primary-foreground text-[10px] h-7 placeholder:text-primary-foreground/30"
                      />
                      <Button size="icon" variant="ghost" aria-label="Search GIFs" className="h-7 w-7 shrink-0 text-primary-foreground/60" onClick={() => searchGifs(gifSearch)}>
                        <Search className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-1">
                      {gifLoading ? (
                        <p className="col-span-3 text-[10px] text-primary-foreground/40 text-center py-4">Searching...</p>
                      ) : gifs.length === 0 ? (
                        <p className="col-span-3 text-[10px] text-primary-foreground/40 text-center py-4">
                          {gifSearch ? "No results" : "Search for GIFs 🎞️"}
                        </p>
                      ) : gifs.map((url, i) => (
                        <button key={i} onClick={() => sendGif(url)} className="rounded-lg overflow-hidden hover:ring-2 ring-accent transition-all">
                          <img src={url} alt="GIF" className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="px-3 py-2 border-t border-border/20 flex gap-1 items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                  className={`shrink-0 h-8 w-8 ${showEmoji ? "text-accent" : "text-primary-foreground/50"}`}
                >
                  <Smile className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                  className={`shrink-0 h-8 w-8 ${showGif ? "text-accent" : "text-primary-foreground/50"}`}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Say something..."
                  className="bg-primary-foreground/10 border-border/30 text-primary-foreground text-xs placeholder:text-primary-foreground/30"
                />
                <Button size="icon" variant="ghost" onClick={() => sendMessage()} className="text-accent shrink-0 h-8 w-8">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
