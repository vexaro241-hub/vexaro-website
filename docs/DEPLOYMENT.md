# VEXARO deployment safety

## Environments

- **main** — development source; never treated as production.
- **preview** — safe integration/testing branch.
- **production** — protected release branch used by the live website.
- Members/Admin will use the same preview/release model.

## Release flow

1. Work on a feature branch.
2. Push to GitHub.
3. Preview validation runs automatically.
4. Browser/functional checks are completed against Preview.
5. Merge the approved change into `production`.
6. Production smoke test runs after promotion.
7. Roll back to the last known-good production commit if a critical regression appears.

## Safety rules

- Do not put production secrets in Git.
- Preview resources should be separate from production whenever the resource supports isolation.
- Database migrations must be tested before production.
- Authentication and admin permission changes require explicit regression checks.
- A deployment is not considered complete until production health and critical routes are verified.

## Current limitation

The VEXARO Workers currently proxy site files from GitHub and the existing Supabase project. Preview code is separated, but a dedicated Supabase staging project has not been provisioned yet. Until that is created, Preview must not be used for destructive data tests.
