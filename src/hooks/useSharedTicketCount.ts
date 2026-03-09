import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSharedTicketCount() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { count: total, error } = await supabase
        .from("shared_tickets")
        .select("*", { count: "exact", head: true })
        .eq("shared_with", user.id);

      if (!error && total !== null) {
        setCount(total);
      }
    };

    fetchCount();

    // Listen for realtime changes
    const channel = supabase
      .channel("shared_tickets_count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_tickets",
          filter: `shared_with=eq.${user.id}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
