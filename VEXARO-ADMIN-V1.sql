-- VEXARO Community Admin V1
-- Run this AFTER the existing VEXARO community schema.

alter table public.profiles add column if not exists role text not null default 'member' check (role in ('member','admin'));
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.reports add column if not exists status text not null default 'open' check (status in ('open','reviewed','actioned'));
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists reports_status_idx on public.reports(status, created_at desc);

create or replace function public.is_vexaro_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_vexaro_admin() from public;
grant execute on function public.is_vexaro_admin() to authenticated;

-- Admins can review all reports.
drop policy if exists "Admins view all reports" on public.reports;
create policy "Admins view all reports" on public.reports
for select to authenticated
using (public.is_vexaro_admin());

-- Admins can update report status.
drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports" on public.reports
for update to authenticated
using (public.is_vexaro_admin())
with check (public.is_vexaro_admin());

-- Admins can remove posts/comments. Normal members keep their existing ownership rules.
drop policy if exists "Admins delete posts" on public.posts;
create policy "Admins delete posts" on public.posts
for delete to authenticated
using (public.is_vexaro_admin());

drop policy if exists "Admins delete comments" on public.comments;
create policy "Admins delete comments" on public.comments
for delete to authenticated
using (public.is_vexaro_admin());

-- Admins can update member moderation state.
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles
for update to authenticated
using (public.is_vexaro_admin())
with check (public.is_vexaro_admin());

-- Helper for the owner to promote the first admin by email.
-- Replace the email value before running. This function is deliberately not executable by normal members.
create or replace function public.promote_vexaro_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    update public.profiles p
    set role = 'admin'
    from auth.users u
    where p.id = u.id and lower(u.email) = lower(target_email);
  else
    if not public.is_vexaro_admin() then
      raise exception 'Only an existing VEXARO admin can promote another admin';
    end if;
    update public.profiles p
    set role = 'admin'
    from auth.users u
    where p.id = u.id and lower(u.email) = lower(target_email);
  end if;
end;
$$;

revoke all on function public.promote_vexaro_admin(text) from public;
-- The first admin promotion is performed once from the SQL Editor, then this function can be restricted further.
