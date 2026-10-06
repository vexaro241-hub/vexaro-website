# VEXARO feature flags and kill switches

New high-risk features should be deployable without immediately exposing them to everyone.

## Flag rules
- Default new features to OFF unless the feature is already proven safe.
- Keep a clear owner and purpose for every flag.
- Prefer server-side authorization checks for anything involving money, admin access or private data.
- Never treat a client-side flag as a security boundary.
- Every flag needs a rollback/disable path.
- Remove temporary flags after the feature is stable.

## Planned flag families
- memberships
- marketplace
- creator_integrations
- notifications
- advanced_analytics
- new_profile_features

## Kill-switch priority
1. Payments/entitlements
2. External OAuth integrations
3. User-generated content
4. Notifications/background jobs
5. Analytics
6. Cosmetic experiments

If a feature is causing errors, abuse or unexpected cost, disable the feature before attempting a deeper fix in production.
