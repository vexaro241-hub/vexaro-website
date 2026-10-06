# VEXARO release checklist
A release is production-ready only when every applicable gate is green.
## Build and source
- [ ] Required files validate.
- [ ] No legacy routes.
- [ ] No secrets committed.
- [ ] Security checks pass.
- [ ] Preview code is the intended version.
## Website
- [ ] Homepage HTTP 200.
- [ ] Navigation works.
- [ ] Mobile and desktop work.
- [ ] Critical pages HTTP 200.
- [ ] PWA manifest loads.
- [ ] Service-worker/cache update path is safe.
- [ ] SEO basics remain intact.
## Authentication and permissions
- [ ] Signed-out state works.
- [ ] Sign-in route/modal works.
- [ ] Signed-in state works.
- [ ] Admin/member permissions are correct.
- [ ] Sign-out works.
- [ ] OAuth/redirect URLs match the environment.
## Data and integrations
- [ ] Migrations are backward compatible.
- [ ] Preview uses isolated/non-production data before destructive tests.
- [ ] Twitch/YouTube integrations are tested in their own environment.
- [ ] Email tests cannot accidentally send production mail.
## Production
- [ ] Health endpoint is green.
- [ ] Critical smoke tests are green.
- [ ] Observability is enabled.
- [ ] Rollback target is known.
- [ ] Release notes recorded.
If a critical gate fails, do not promote.
