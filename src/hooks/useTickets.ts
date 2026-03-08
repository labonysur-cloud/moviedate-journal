import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TicketData {
  id: string;
  movie_id: string;
  movie_title: string;
  date: string;
  time: string;
  seat: string;
  genre: string | null;
  user_id: string;
  created_at: string;
}

export function useTickets() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTickets = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading tickets", description: error.message, variant: "destructive" });
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const bookTicket = async (ticket: {
    movie_id: string;
    movie_title: string;
    date: string;
    time: string;
    seat: string;
    genre?: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        ...ticket,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error booking ticket", description: error.message, variant: "destructive" });
      return null;
    }
    setTickets((prev) => [data, ...prev]);
    toast({ title: "🎫 Ticket booked!", description: `Your ticket for ${ticket.movie_title} is ready!` });
    return data;
  };

  const hasTicketForMovie = (movieId: string) => {
    return tickets.some((t) => t.movie_id === movieId);
  };

  return { tickets, loading, bookTicket, hasTicketForMovie, refetch: fetchTickets };
}
