
-- 1. Allow shared ticket recipients to read the ticket row
CREATE POLICY "Recipients can view shared tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_tickets st
    WHERE st.ticket_id = tickets.id
    AND st.shared_with = auth.uid()
  )
);

-- 2. Function to get booked seats for a movie (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_booked_seats(p_movie_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(unnested_seat), '{}')
  FROM (
    SELECT unnest(string_to_array(seat, ',')) AS unnested_seat
    FROM public.tickets
    WHERE movie_id = p_movie_id
  ) sub;
$$;
