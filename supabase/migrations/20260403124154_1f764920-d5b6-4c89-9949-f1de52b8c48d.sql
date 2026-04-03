
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete comments" ON public.comments FOR DELETE TO authenticated USING (true);
