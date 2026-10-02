-- 作戦ごとの参考動画。
-- 作戦そのもの（動き）は src/data/tactics の JSON にあり、その作戦IDは「フォルダ/ファイル名」（例: コーナー/右コーナー(オーサワ1番)）。
-- 動画だけを、このテーブルに持つ。サイトの戦術ページで、主将・幹部が追加・削除する。
--
-- ・type: youtube / drive / link（リンクで開く）/ upload（PCからアップロードしたファイル）
-- ・upload のときは storage_path に、ストレージ(videos バケット)上の場所を持つ（削除のとき、ファイルも消すため）
-- ・読み取りは、ログインした人だけ（動画ページの videos テーブルより厳しくしている）
-- ・追加・削除は、ログインした人。主将・幹部だけにするのは、サイトの画面側の制限（ほかのページと同じ）
create table if not exists public.tactic_videos (
  id uuid primary key default gen_random_uuid(),
  tactic_id text not null check (char_length(tactic_id) between 1 and 200),
  title text not null default '' check (char_length(title) <= 60),
  type text not null check (type in ('youtube', 'drive', 'link', 'upload')),
  url text not null check (char_length(url) <= 600 and url ~* '^https?://'),
  storage_path text check (storage_path is null or char_length(storage_path) <= 300),
  created_by text not null default '' check (char_length(created_by) <= 60),
  created_at timestamptz not null default now()
);

create index if not exists tactic_videos_tactic_id_idx on public.tactic_videos (tactic_id, created_at);

alter table public.tactic_videos enable row level security;

create policy "tactic_videos read (authenticated)" on public.tactic_videos
  for select using (auth.role() = 'authenticated');

create policy "tactic_videos insert (authenticated)" on public.tactic_videos
  for insert with check (auth.role() = 'authenticated');

create policy "tactic_videos delete (authenticated)" on public.tactic_videos
  for delete using (auth.role() = 'authenticated');
