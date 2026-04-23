create table public.schedule_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  location text not null default '',
  type text not null default 'event' check (type in ('match', 'practice', 'event')),
  detail text not null default '',
  belongings text not null default '',
  line_notify_type text not null default 'none' check (line_notify_type in ('immediate', 'scheduled', 'none')),
  line_send_at timestamptz,
  line_sent boolean not null default false,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

alter table public.schedule_events enable row level security;

create policy "Public can view schedule events"
  on public.schedule_events for select
  using (true);

create policy "Authenticated users can insert schedule events"
  on public.schedule_events for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update schedule events"
  on public.schedule_events for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete schedule events"
  on public.schedule_events for delete
  using (auth.role() = 'authenticated');
