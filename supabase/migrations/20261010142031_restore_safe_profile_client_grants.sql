-- Restore least-privilege authenticated access needed by VEXARO's profile editor and admin/member checks.
-- Keep public access on the read-only public_profiles views; do not expose moderation columns.
GRANT SELECT (id, username, display_name, bio, avatar_url, banner_url, created_at, role, games_played, country, platform, last_seen_at, social_links)
ON TABLE public.profiles TO authenticated;

GRANT UPDATE (display_name, bio, avatar_url, banner_url, social_links, games_played, country, platform)
ON TABLE public.profiles TO authenticated;
