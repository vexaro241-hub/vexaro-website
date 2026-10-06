# VEXARO operations standard

## Release safety
- Develop on feature branches/main and preview before production.
- Production promotion must pass validation, security checks, smoke tests and the release checklist.
- Keep the last known-good production commit available for immediate rollback.
- Never place production secrets in source control or Preview.

## Database safety
- Treat production schema as migration-controlled.
- Prefer additive, backward-compatible migrations.
- Use isolated Supabase development/preview data where practical.
- Before destructive schema/data work, capture a verified backup/export and document rollback.
- Run a restore drill periodically.

## Runtime safety
- Use structured logs and request/debug IDs on failures.
- Fail closed for privileged operations.
- Put expensive/retriable background work behind durable jobs rather than blocking page requests.
- Add rate limits to authentication, admin, posting and other abuse-prone endpoints as they are introduced.
- Keep feature flags/kill switches available for new high-risk features.

## PWA safety
- Version service-worker caches.
- Never cache authenticated/private responses as public assets.
- Make updates recoverable if a new asset set is incompatible.
- Keep a network fallback for temporary connectivity loss.

## Privacy
- Collect only data needed for the feature.
- Document retention/deletion behavior before collecting new user data.
- Never log passwords, access tokens or session cookies.
- Keep analytics consent-aware if non-essential tracking is introduced.

## Incident response
1. Identify impact.
2. Freeze risky releases.
3. Roll back code if appropriate.
4. Protect/restore data only when necessary.
5. Verify health and critical user journeys.
6. Communicate the issue and resolution.
7. Record the incident and prevention action.
