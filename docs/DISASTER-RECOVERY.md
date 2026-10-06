# VEXARO disaster recovery
## Recovery targets
- Restore the public site quickly without changing user data.
- Restore integrations/member features safely.
## Required safeguards
- Keep a known-good production commit.
- Keep Supabase schema/migration history in Git.
- Document environment variable names, never values.
- Export/backup important production data using supported provider options.
- Test restoration periodically.
## Restore order
1. Confirm scope.
2. Roll back the website Worker if code is the cause.
3. Restore/repair database only if data is affected.
4. Restore authentication/integration configuration.
5. Run health and critical-path checks.
6. Re-enable affected features gradually.
7. Record the incident.
## Database migration rule
Prefer additive, backward-compatible changes first. Deploy code that works with old and new schema, then remove old fields only after the new code is confirmed live.
