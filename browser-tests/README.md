# VEXARO Live Browser Tests

Cloudflare Browser Run is the VEXARO live-browser testing layer.

It uses real remote Chromium to test production at mobile and desktop sizes, check public routes, detect browser console/page errors, and exercise the main-site SIGN IN navigation without submitting credentials.

The suite is deliberately read-only and excludes Members flows unless a future change explicitly requires them.

Deploy with Wrangler, then set a Worker secret named TEST_TOKEN. The endpoint is authenticated so it cannot be abused as a public browser proxy.

This keeps the core stack small:
- GitHub = source, workflows and release control
- Cloudflare = hosting, browser testing and observability
- Supabase = auth/database
