-- Anonymous visitors may read public loadouts under RLS.
-- The policy calls private.is_admin() to determine whether the current
-- caller is an administrator. For anon requests auth.uid() is NULL, so this
-- SECURITY DEFINER helper returns false; execution permission is required
-- for PostgreSQL to evaluate the policy without a 401 permission error.
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon;
