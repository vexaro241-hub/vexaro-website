-- Expose only coarse recent activity through the existing public member profile view.
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

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
  platform,
  last_seen_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;