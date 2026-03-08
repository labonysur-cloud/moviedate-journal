import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookHeart, Plus, Heart, X, Pen, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

interface JournalEntry {
  id: string;
  movie_title: string;
  date: string;
  content: string;
  mood: string;
  author: string;
}

const moods = ["🥰 Loved it", "😭 Cried", "😂 Laughed", "🤯 Mind-blown", "😴 Cozy vibes", "💭 Thoughtful"];

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ movieTitle: "", content: "", mood: "", author: "" });
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [starter, setStarter] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load journal");
        else setEntries(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const handleGetPrompts = async () => {
    if (!form.movieTitle) {
      toast.error("Enter a movie title first");
      return;
    }
    setPromptsLoading(true);
    setPrompts([]);
    setStarter("");
    try {
      const { data, error } = await supabase.functions.invoke("movie-ai", {
        body: { action: "journal_prompt", movieTitle: form.movieTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPrompts(data.prompts || []);
      setStarter(data.starter || "");
    } catch {
      toast.error("Couldn't generate prompts");
    }
    setPromptsLoading(false);
  };

  const handleAdd = async () => {
    if (!form.movieTitle || !form.content || !user) return;
    const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        movie_title: form.movieTitle,
        content: form.content,
        mood: form.mood,
        author: form.author,
        date: dateStr,
      })
      .select()
      .single();
    if (error) { toast.error("Failed to save entry"); return; }
    setEntries((prev) => [data, ...prev]);
    setForm({ movieTitle: "", content: "", mood: "", author: "" });
    setPrompts([]);
    setStarter("");
    setShowForm(false);
    toast.success("Entry saved! 📖");
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-3">
              <BookHeart className="w-7 sm:w-8 h-7 sm:h-8 text-primary" />
              Movie Journal
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Our little diary of movie nights & memories 📖</p>
          </div>
          <Button variant="warm" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? "Cancel" : "New Entry"}
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 sm:mb-10"
            >
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border space-y-4">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Pen className="w-4 h-4 text-accent" />
                  Write about your movie night
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Which movie/show did you watch?"
                    value={form.movieTitle}
                    onChange={(e) => setForm({ ...form, movieTitle: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleGetPrompts}
                    disabled={promptsLoading || !form.movieTitle}
                    className="whitespace-nowrap"
                  >
                    {promptsLoading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    <span className="hidden sm:inline">AI Prompts</span>
                  </Button>
                </div>

                {/* AI Prompts */}
                <AnimatePresence>
                  {prompts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-secondary/50 rounded-xl p-3 sm:p-4 border border-border space-y-2"
                    >
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Writing prompts
                      </p>
                      {prompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            content: prev.content ? prev.content + "\n\n" + prompt : prompt,
                          }))}
                          className="block w-full text-left text-sm text-foreground/80 hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                          💡 {prompt}
                        </button>
                      ))}
                      {starter && (
                        <button
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            content: prev.content ? prev.content : starter,
                          }))}
                          className="block w-full text-left text-sm text-primary hover:text-primary/80 p-2 rounded-lg hover:bg-secondary transition-colors font-medium"
                        >
                          ✨ Use starter: &ldquo;{starter}&rdquo;
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input
                  placeholder="Your name"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">How did you feel?</p>
                  <div className="flex flex-wrap gap-2">
                    {moods.map((mood) => (
                      <button
                        key={mood}
                        onClick={() => setForm({ ...form, mood })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          form.mood === mood
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-muted text-muted-foreground border-border hover:border-accent"
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder="Write your thoughts, memories, favorite scenes..."
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <Button variant="ticket" onClick={handleAdd}>
                  <Heart className="w-4 h-4 mr-1" />
                  Save Entry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <ListSkeleton count={3} />
        ) : entries.length === 0 && !showForm ? (
          <EmptyState
            icon={BookHeart}
            title="No entries yet..."
            description="Watch a movie with friends and write about it! ✨"
            actionLabel="Write First Entry"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl p-4 sm:p-6 border border-border hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground truncate">{entry.movie_title}</h3>
                    <p className="text-xs text-muted-foreground">{entry.date} · by {entry.author || "Anonymous"}</p>
                  </div>
                  {entry.mood && (
                    <span className="text-sm bg-secondary px-3 py-1 rounded-full shrink-0">{entry.mood}</span>
                  )}
                </div>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm sm:text-base">{entry.content}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
