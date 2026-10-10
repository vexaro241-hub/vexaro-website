-- Enforce loadout access at the database boundary.
-- Existing loadouts remain public/basic; owners or admins can designate a stricter entitlement.
alter table public.loadouts
  add column if not exists required_entitlement text not null default 'loadouts.basic'
  check (required_entitlement in ('loadouts.basic','loadouts.advanced','content.pro','content.elite'));

drop policy if exists "Loadouts are public" on public.loadouts;
create policy "Loadouts visible when entitlement is met" on public.loadouts
  for select to anon, authenticated
  using (public.vexaro_has_entitlement(required_entitlement));
