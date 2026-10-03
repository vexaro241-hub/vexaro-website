VEXARO COMMUNITY BUILD

This package keeps the VEXARO PWA/hero site and adds a real community foundation.

Included:
- index.html — main VEXARO site
- community.html — accounts, profiles, community feed, likes/comments, loadouts and settings
- supabase-config.js — paste your Supabase Project URL + Publishable Key here
- supabase-schema.sql — database tables, RLS policies and signup profile trigger
- manifest.webmanifest / sw.js / icons — existing PWA files
- hero.webp — VEXARO hero artwork

SETUP
1. Create a Supabase project.
2. Open Supabase SQL Editor and run supabase-schema.sql.
3. Copy the Project URL and Publishable Key into supabase-config.js.
4. Upload/commit the files to the GitHub repo connected to Vercel.
5. Vercel will deploy the new version.

SECURITY
Use only the Supabase Publishable Key in the browser. Never put a secret/service-role key in this file. Database access is protected with Row Level Security.
