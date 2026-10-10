-- Expose only the public profile fields already granted on profiles, and respect caller RLS.
drop view public.public_profiles;
create view public.public_profiles with (security_invoker = true) as
select id, username, display_name, bio, avatar_url, created_at, 'member'::text as role
from public.profiles;
grant select on public.public_profiles to anon, authenticated;
