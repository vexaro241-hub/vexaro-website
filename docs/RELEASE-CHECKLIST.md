# VEXARO release checklist

A release is only production-ready when every applicable gate is green.

## Build and source
- [ ] Required files validate.
- [ ] No legacy routes.
- [ ] No secrets committed.
- [ ] Security checks pass.
- [ ] Main/Preview code is the intended version.

## Website
- [ ] Homepage loads with HTTP 200.
- [ ] Navigation works.
- [ ] Mobile layout works.
- [ ] Desktop layout works.
- [ ] Critical pages return HTTP 200.
- [ ] PWA manifest loads.
- [ ] Service-worker/cache behavior is compatible with the release.
- [ ] SEO basics remain intact.

## Authentication and permissions
- [ ] Signed-out state works.
- [ ] Sign-in route/modal works.
- [ ] Signed-in state works.
- [ ] Admin/member permissions are correct.
- [ ] Sign-out works.
- [ ] OAuth/redirect URLs are correct for the environment.

## Data and integrations
- [ ] Database migrations are backward compatible.
- [ ] Preview uses isolated/non-production data before destructive tests.
- [ ] Twitch/YouTube integrations are tested in their own environment.
- [ ] Emails/notifications are tested without sending accidental production messages.

## Production
- [ ] Production health endpoint is green.
- [ ] Critical smoke tests are green.
- [ ] Observability is enabled.
- [ ] Rollback target is known.
- [ ] Release notes/changelog recorded.

If a critical gate fails, do not promote.
