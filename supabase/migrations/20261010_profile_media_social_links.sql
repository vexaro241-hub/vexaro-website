-- VEXARO master release: profile media and social profile fields
-- Apply in the Supabase SQL editor before deploying the matching frontend.
alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

-- A public-read bucket is required for public profile images. Writes are restricted
-- to the authenticated user folder: profile-media/<auth.uid()>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "VEXARO profile media public read" on storage.objects;
create policy "VEXARO profile media public read"
on storage.objects for select
to public
using (bucket_id = 'profile-media');

drop policy if exists "VEXARO users upload own profile media" on storage.objects;
create policy "VEXARO users upload own profile media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "VEXARO users update own profile media" on storage.objects;
create policy "VEXARO users update own profile media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "VEXARO users delete own profile media" on storage.objects;
create policy "VEXARO users delete own profile media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
