# VEXARO disaster recovery

## Recovery targets
- Primary objective: restore the public website quickly without changing user data.
- Secondary objective: restore integrations and member features safely.

## Required safeguards
- Keep a known-good production commit.
- Keep Supabase schema/migration history in Git.
- Maintain documented environment variables and secret names, never secret values.
- Export/backup important production data according to the provider's supported backup options.
- Test restoration periodically; a backup that has never been restored is not a proven recovery plan.

## Restore order
1. Confirm incident scope.
2. Roll back the website Worker if code is the cause.
3. Restore/repair database only if data is affected.
4. Restore authentication/integration configuration.
5. Run health and critical-path checks.
6. Re-enable affected features gradually.
7. Record the incident.

## Database migration rule
Prefer additive, backward-compatible changes first. Deploy code that can work with both old and new schema, then remove old columns/constraints only after the new code is confirmed live.
