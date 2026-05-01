create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  title text,
  opponent text not null,
  match_date date not null,
  score_us int not null default 0,
  score_them int not null default 0,
  youtube_url text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table match_results enable row level security;
create policy "match_results_all" on match_results for all using (true) with check (true);

create table if not exists match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match_results(id) on delete cascade,
  member_name text not null,
  type text not null check (type in ('goal', 'assist')),
  display_order int not null default 0
);
alter table match_scorers enable row level security;
create policy "match_scorers_all" on match_scorers for all using (true) with check (true);

create table if not exists match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match_results(id) on delete cascade,
  member_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table match_comments enable row level security;
create policy "match_comments_all" on match_comments for all using (true) with check (true);

create table if not exists match_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references match_comments(id) on delete cascade,
  member_name text not null,
  unique(comment_id, member_name)
);
alter table match_likes enable row level security;
create policy "match_likes_all" on match_likes for all using (true) with check (true);
