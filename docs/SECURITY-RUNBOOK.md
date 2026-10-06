# VEXARO security runbook
## Rules
- Never commit production secrets, service-role keys, OAuth client secrets, or private keys.
- Use least-privilege credentials.
- Keep production and Preview secrets separate.
- Treat admin/auth changes as high-risk.
- Rotate credentials after suspected exposure.
- Keep dependency and GitHub Action updates monitored.
- Validate security-header/CSP changes in Preview first.
## Incident response
1. Stop promotion.
2. Identify affected Worker/commit.
3. Disable affected integration or feature if a kill switch exists.
4. Revoke/rotate exposed credentials.
5. Roll back to the last known-good production version.
6. Check logs and affected data.
7. Record the incident and corrective action.
8. Re-run release gates before restoration.
## High-risk areas
- Supabase auth/RLS
- Admin permissions
- Twitch OAuth
- YouTube OAuth
- Resend
- Payments/membership
- User uploads
- Marketplace/payment features
