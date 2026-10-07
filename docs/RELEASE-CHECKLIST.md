# VEXARO release checklist

A release is only production-ready when every applicable gate is green. After every production change, rerun the affected checks and finish with a full regression pass.

## Build and source
- [ ] Required files validate.
- [ ] No legacy routes.
- [ ] No secrets committed.
- [ ] Security checks pass.
- [ ] Main/Preview code is the intended version.
- [ ] No stale/duplicate production scripts or screens remain.
- [ ] External dependencies load from approved sources.

## Website
- [ ] Homepage loads with HTTP 200.
- [ ] Navigation works.
- [ ] Every critical button/control has a working action.
- [ ] Internal links resolve correctly.
- [ ] External links point to the intended destination.
- [ ] Mobile layout works.
- [ ] Desktop layout works.
- [ ] Critical pages return HTTP 200.
- [ ] Forms validate correctly and handle failures safely.
- [ ] PWA manifest loads.
- [ ] Service-worker/cache behavior is compatible with the release.
- [ ] SEO basics remain intact.
- [ ] Accessibility basics pass: labels, focus, keyboard use, readable contrast and mobile usability.
- [ ] No browser console/application errors on critical flows.

## Authentication and permissions
- [ ] Signed-out state works.
- [ ] Sign-in route/modal works.
- [ ] New-account flow works.
- [ ] Confirmation/redirect flow works.
- [ ] Signed-in state works after refresh.
- [ ] Session behaviour is intentional and secure.
- [ ] Admin/member permissions are correct.
- [ ] Members cannot access admin-only actions/data.
- [ ] Sign-out works and protected content is no longer accessible.
- [ ] OAuth/redirect URLs are correct for the environment.
- [ ] Invalid/expired authentication is handled safely.

## Core platform
- [ ] Profiles load and update correctly.
- [ ] Community pages load and route correctly.
- [ ] Posts create, display and fail safely.
- [ ] Comments create/display correctly and respect moderation/rate limits.
- [ ] Likes/reactions and follows work.
- [ ] Search returns usable results.
- [ ] Notifications behave correctly.
- [ ] Saved content works where enabled.
- [ ] Loadouts/settings content can be created, viewed and updated.
- [ ] Media upload/storage permissions are correct.
- [ ] Clips/video processing handles success and failure states.
- [ ] Marketplace browsing/listing/moderation permissions are correct.

## Data and integrations
- [ ] Database migrations are backward compatible.
- [ ] RLS is enabled and tested on every public table.
- [ ] Admin-only RPCs/endpoints are not publicly callable.
- [ ] Preview uses isolated/non-production data before destructive tests.
- [ ] Twitch/YouTube integrations are tested in their own environment.
- [ ] Social connection status is truthful; no fake/placeholder connection is presented as live.
- [ ] Emails/notifications are tested without sending accidental production messages.
- [ ] External social links are verified before being exposed publicly.

## Security and resilience
- [ ] Security headers/policies are present.
- [ ] Secrets are not exposed in source, client bundles or logs.
- [ ] Abuse/rate-limit controls work.
- [ ] Invalid input is rejected safely.
- [ ] Backup completes successfully.
- [ ] Restore test completes successfully.
- [ ] Disaster-recovery procedure is documented/tested.
- [ ] Rollback target is known.
- [ ] Automatic/manual rollback capability is tested.
- [ ] Audit/security events are recorded where required.
- [ ] Error handling does not expose sensitive implementation details.

## Production
- [ ] Production health endpoints are green.
- [ ] Critical smoke tests are green.
- [ ] Browser regression tests are green on desktop and mobile.
- [ ] Observability is enabled.
- [ ] Alerts/monitoring are operational.
- [ ] All three production Workers are on the intended versions.
- [ ] Deployment traffic is 100% on the intended versions.
- [ ] Rollback target is known and available.
- [ ] Release notes/changelog recorded.
- [ ] Final post-deployment regression test is green.

## Release rule

If a critical gate fails, do not promote. Fix it, redeploy, rerun the affected checks, then repeat the full regression pass before declaring the release ready.
