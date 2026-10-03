-- VEXARO COMMUNITY DATABASE
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text not null default 'VEXARO Member' check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.loadouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  weapon text not null check (char_length(weapon) between 1 and 80),
  category text not null default 'Warzone' check (char_length(category) <= 40),
  attachments jsonb not null default '[]'::jsonb,
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.settings_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  setting_type text not null check (setting_type in ('controller','graphics','audio','other')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id, created_at asc);
create index if not exists loadouts_created_at_idx on public.loadouts(created_at desc);
create index if not exists settings_created_at_idx on public.settings_posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.loadouts enable row level security;
alter table public.settings_posts enable row level security;
alter table public.reports enable row level security;

-- Public/community reads
create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "Posts are public" on public.posts for select to anon, authenticated using (true);
create policy "Likes are public" on public.post_likes for select to anon, authenticated using (true);
create policy "Comments are public" on public.comments for select to anon, authenticated using (true);
create policy "Follows are public" on public.follows for select to anon, authenticated using (true);
create policy "Loadouts are public" on public.loadouts for select to anon, authenticated using (true);
create policy "Settings are public" on public.settings_posts for select to anon, authenticated using (true);

-- Profiles: members can create/update only their own profile.
create policy "Users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Posts
create policy "Users create own posts" on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own posts" on public.posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own posts" on public.posts for delete to authenticated using ((select auth.uid()) = user_id);

-- Likes
create policy "Users like as themselves" on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove own likes" on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);

-- Comments
create policy "Users create own comments" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own comments" on public.comments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own comments" on public.comments for delete to authenticated using ((select auth.uid()) = user_id);

-- Follows
create policy "Users follow as themselves" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

-- Loadouts
create policy "Users create own loadouts" on public.loadouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own loadouts" on public.loadouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own loadouts" on public.loadouts for delete to authenticated using ((select auth.uid()) = user_id);

-- Settings posts
create policy "Users create own settings" on public.settings_posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own settings" on public.settings_posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own settings" on public.settings_posts for delete to authenticated using ((select auth.uid()) = user_id);

-- Reports are private to the reporter for now; admins can be added later server-side.
create policy "Users submit reports" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "Users view own reports" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);

-- Automatically create a basic profile after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(regexp_replace(coalesce(new.raw_user_meta_data->>'username','member'), '[^a-zA-Z0-9_]', '', 'g'), 20) || '_' || substr(replace(new.id::text,'-',''),1,5),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'VEXARO Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
