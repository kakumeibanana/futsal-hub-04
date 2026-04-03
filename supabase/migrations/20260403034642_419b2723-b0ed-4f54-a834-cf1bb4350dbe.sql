
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.event_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date DATE NOT NULL
);

CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  date DATE NOT NULL,
  availability TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read event_dates" ON public.event_dates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert event_dates" ON public.event_dates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read responses" ON public.responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert responses" ON public.responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update responses" ON public.responses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
