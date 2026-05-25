import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Movie {
  id: string;
  title: string;
  genre: string;
  year: string;
  poster: string | null;
  description: string | null;
  added_by: string;
  rating: string | null;
  watch_url: string | null;
  embed_url: string | null;
  total_seasons: number | null;
  created_at: string;
}

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading movies", description: error.message, variant: "destructive" });
    } else {
      setMovies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const addMovie = async (movie: {
    title: string;
    genre: string;
    year: string;
    description?: string;
    poster?: string;
    watch_url?: string;
    embed_url?: string;
    total_seasons?: number;
    rating?: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("movies")
      .insert({
        ...movie,
        added_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error adding movie", description: error.message, variant: "destructive" });
      return null;
    }
    setMovies((prev) => [data, ...prev]);
    return data;
  };

  const deleteMovie = async (id: string) => {
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete movie", description: error.message, variant: "destructive" });
      return false;
    }
    setMovies((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "🗑️ Movie removed", description: "The movie has been deleted from the collection." });
    return true;
  };

  return { movies, loading, addMovie, deleteMovie, refetch: fetchMovies };
}
