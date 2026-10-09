-- VEXARO Find Your Squad: apply this migration in Supabase SQL Editor.
-- Safe to run more than once.
create table if not exists public.squad_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check (char_length(game) between 1 and 80),
  game_mode text not null check (char_length(game_mode) between 1 and 50),
  platform text not null check (platform in ('Xbox','PlayStation','PC','Crossplay','Mobile')),
  play_when text not null check (play_when in ('Playing now','Later')),
  players_needed integer not null default 2 check (players_needed between 1 and 5),
  mic_preference text not null default 'Preferred' check (mic_preference in ('Preferred','Required','Not required')),
  description text not null check (char_length(description) between 1 and 500),
  status text not null default 'open' check (status in ('open','full','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists squad_posts_open_created_idx on public.squad_posts(status,created_at desc);
create index if not exists squad_posts_game_mode_idx on public.squad_posts(game,game_mode,status);
alter table public.squad_posts enable row level security;
drop policy if exists "Squad posts are publicly readable" on public.squad_posts;
create policy "Squad posts are publicly readable" on public.squad_posts
for select to anon, authenticated using (status = 'open');
drop policy if exists "Members create their own squad posts" on public.squad_posts;
create policy "Members create their own squad posts" on public.squad_posts
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members update their own squad posts" on public.squad_posts;
create policy "Members update their own squad posts" on public.squad_posts
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete their own squad posts" on public.squad_posts;
create policy "Members delete their own squad posts" on public.squad_posts
for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.squad_posts to anon, authenticated;
grant insert, update, delete on public.squad_posts to authenticated;
