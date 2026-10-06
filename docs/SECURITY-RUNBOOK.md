# VEXARO security runbook

## Rules
- Never commit production secrets, service-role keys, OAuth client secrets, or private keys.
- Use least-privilege credentials.
- Keep production and Preview secrets separate.
- Treat admin/auth changes as high-risk changes.
- Rotate credentials after suspected exposure.
- Keep dependency and GitHub Action updates monitored.
- Keep security headers/CSP changes behind Preview validation.

## Incident response
1. Stop promotion.
2. Identify the affected Worker/commit.
3. Disable the affected integration or feature if a kill switch exists.
4. Revoke/rotate exposed credentials.
5. Roll back to the last known-good production version.
6. Check logs and affected data.
7. Record the incident and corrective action.
8. Re-run the full release gates before restoring normal deployment.

## High-risk areas
- Supabase auth/RLS
- Admin permissions
- Twitch OAuth
- YouTube OAuth
- Resend email sending
- Payments/membership
- User uploads
- Marketplace/payment-related features
