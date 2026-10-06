# VEXARO architecture and future-ready workflow
## Layers
1. Public website
2. Members/community
3. Admin
4. Auth/API integrations
5. Supabase data
6. Cloudflare edge/runtime
7. GitHub source and release automation
## Environment model
- main: development source
- feature branches: isolated work
- Preview: production-like branch testing
- production: live release
Cloudflare Worker Previews are the preferred long-term branch testing model. Each Preview should have its own configuration and observability, with stateful resources isolated where possible.
## Future features prepared for
- memberships/subscriptions
- email
- Twitch/YouTube OAuth
- creator profiles
- loadouts/settings
- marketplace
- analytics
- moderation/admin tools
- background jobs
- notifications
Future features should use feature flags or safe defaults when they can affect live users.
## PWA rule
Every service-worker/cache change must have a versioned cache strategy and a safe update path so users do not remain trapped on stale assets.
