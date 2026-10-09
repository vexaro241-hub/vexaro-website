-- Public profile views are read-only API surfaces. Revoke inherited/default DML grants explicitly.
REVOKE ALL PRIVILEGES ON TABLE public.public_profiles FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.public_profile_identities FROM anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.public_profile_identities TO anon, authenticated;
