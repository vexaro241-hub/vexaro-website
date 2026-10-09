-- Add player discovery preferences to member profiles.
alter table public.profiles
  add column if not exists games_played text[] not null default '{}'::text[],
  add column if not exists country text not null default '',
  add column if not exists platform text not null default '';

create or replace view public.public_profiles as
select
  id,
  username,
  display_name,
  bio,
  avatar_url,
  created_at,
  'member'::text as role,
  games_played,
  country,
  platform
from public.profiles;
