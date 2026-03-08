import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookHeart, Plus, Heart, X, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getJournalEntries, addJournalEntry, type JournalEntry } from "@/lib/store";

const moods = ["🥰 Loved it", "😭 Cried", "😂 Laughed", "🤯 Mind-blown", "😴 Cozy vibes", "💭 Thoughtful"];

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(getJournalEntries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ movieTitle: "", content: "", mood: "", author: "" });

  const handleAdd = () => {
    if (!form.movieTitle || !form.content) return;
    const entry = addJournalEntry({
      ...form,
      date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    });
    setEntries((prev) => [entry, ...prev]);
    setForm({ movieTitle: "", content: "", mood: "", author: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
              <BookHeart className="w-8 h-8 text-primary" />
              Movie Journal
            </h1>
            <p className="text-muted-foreground mt-1">Our little diary of movie nights & memories 📖</p>
          </div>
          <Button variant="warm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? "Cancel" : "New Entry"}
          </Button>
        </div>

        {/* New Entry Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-10"
            >
              <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Pen className="w-4 h-4 text-accent" />
                  Write about your movie night
                </h3>
                <Input
                  placeholder="Which movie/show did you watch?"
                  value={form.movieTitle}
                  onChange={(e) => setForm({ ...form, movieTitle: e.target.value })}
                />
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

        {/* Entries */}
        {entries.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <BookHeart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-lg">No entries yet...</p>
            <p className="text-muted-foreground text-sm mt-1">Watch a movie with friends and write about it! ✨</p>
          </motion.div>
        )}

        <div className="space-y-6">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-6 border border-border hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{entry.movieTitle}</h3>
                  <p className="text-xs text-muted-foreground">{entry.date} · by {entry.author || "Anonymous"}</p>
                </div>
                {entry.mood && (
                  <span className="text-sm bg-secondary px-3 py-1 rounded-full">
                    {entry.mood}
                  </span>
                )}
              </div>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{entry.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
