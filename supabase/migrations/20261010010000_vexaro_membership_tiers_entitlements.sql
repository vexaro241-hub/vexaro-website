-- VEXARO membership tier and entitlement foundation.
-- Safe additive migration. Checkout remains disabled until billing and access tests pass.
create table if not exists public.membership_tiers (
  code text primary key check (code in ('free','pro','elite')),
  name text not null,
  tier_level integer not null unique check (tier_level >= 0),
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.membership_entitlements (
  tier_code text not null references public.membership_tiers(code) on delete cascade,
  entitlement_code text not null check (entitlement_code ~ '^[a-z0-9._-]{2,80}$'),
  enabled boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now(),
  primary key (tier_code, entitlement_code)
);
create table if not exists public.membership_plan_tiers (
  plan_code text primary key references public.membership_plans(code) on update cascade on delete cascade,
  tier_code text not null references public.membership_tiers(code),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.membership_tiers enable row level security;
alter table public.membership_entitlements enable row level security;
alter table public.membership_plan_tiers enable row level security;
grant select on public.membership_tiers, public.membership_entitlements, public.membership_plan_tiers to anon, authenticated;
grant insert, update, delete on public.membership_tiers, public.membership_entitlements, public.membership_plan_tiers to authenticated;
create policy "Membership tiers are readable" on public.membership_tiers for select to anon, authenticated using (active = true or (select private.is_admin()));
create policy "Admins manage membership tiers" on public.membership_tiers for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Membership entitlements are readable" on public.membership_entitlements for select to anon, authenticated using (exists (select 1 from public.membership_tiers t where t.code = tier_code and (t.active = true or (select private.is_admin()))));
create policy "Admins manage membership entitlements" on public.membership_entitlements for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Membership plan tier mappings are readable" on public.membership_plan_tiers for select to anon, authenticated using (active = true or (select private.is_admin()));
create policy "Admins manage membership plan tier mappings" on public.membership_plan_tiers for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
insert into public.membership_tiers (code,name,tier_level,description,active) values
 ('free','Community',0,'Core community access for every member.',true),
 ('pro','VEXARO PRO',1,'Premium builds, Academy content and PRO member features.',true),
 ('elite','VEXARO ELITE',2,'PRO benefits plus Elite-only content, styling and selected advanced perks.',true)
on conflict (code) do update set name=excluded.name,tier_level=excluded.tier_level,description=excluded.description,active=excluded.active,updated_at=now();
insert into public.membership_entitlements (tier_code,entitlement_code,enabled,description) values
 ('free','community.core',true,'Core community participation'),
 ('free','clips.submit',true,'Submit eligible community gameplay clips'),
 ('free','squad.find',true,'Find players and squads'),
 ('free','loadouts.basic',true,'Create and browse basic loadouts'),
 ('free','content.public',true,'View public guides and community content'),
 ('pro','community.core',true,'Core community participation'),
 ('pro','clips.submit',true,'Submit eligible community gameplay clips'),
 ('pro','squad.find',true,'Find players and squads'),
 ('pro','loadouts.basic',true,'Create and browse basic loadouts'),
 ('pro','content.public',true,'View public guides and community content'),
 ('pro','loadouts.advanced',true,'Access advanced loadout resources'),
 ('pro','content.pro',true,'Access PRO-only content'),
 ('pro','academy.pro',true,'Access VEXARO Academy PRO content'),
 ('pro','profile.customize.pro',true,'PRO profile customisation'),
 ('pro','saved.limit.plus',true,'Expanded saved-content allowance'),
 ('elite','community.core',true,'Core community participation'),
 ('elite','clips.submit',true,'Submit eligible community gameplay clips'),
 ('elite','squad.find',true,'Find players and squads'),
 ('elite','loadouts.basic',true,'Create and browse basic loadouts'),
 ('elite','content.public',true,'View public guides and community content'),
 ('elite','loadouts.advanced',true,'Access advanced loadout resources'),
 ('elite','content.pro',true,'Access PRO-only content'),
 ('elite','academy.pro',true,'Access VEXARO Academy PRO content'),
 ('elite','profile.customize.pro',true,'PRO profile customisation'),
 ('elite','saved.limit.plus',true,'Expanded saved-content allowance'),
 ('elite','content.elite',true,'Access Elite-only content'),
 ('elite','academy.elite',true,'Access Elite Academy content'),
 ('elite','profile.elite_style',true,'Elite profile styling and recognition'),
 ('elite','features.advanced',true,'Access selected advanced Elite features'),
 ('elite','saved.limit.elite',true,'Elite saved-content allowance')
on conflict (tier_code,entitlement_code) do update set enabled=excluded.enabled,description=excluded.description,updated_at=now();
insert into public.membership_plan_tiers (plan_code,tier_code,active)
select code,'pro',active from public.membership_plans
on conflict (plan_code) do update set tier_code=excluded.tier_code,active=excluded.active,updated_at=now();
create or replace function public.vexaro_has_entitlement(p_entitlement_code text)
returns boolean language sql stable security invoker set search_path = '' as $$
  with active_tier as (
    select coalesce((
      select mpt.tier_code from public.memberships m
      join public.membership_plan_tiers mpt on mpt.plan_code=m.plan_code and mpt.active=true
      where m.user_id=(select auth.uid()) and m.status in ('active','trialing')
        and m.starts_at<=now() and m.ends_at>now()
      order by m.ends_at desc limit 1
    ),'free') as tier_code
  )
  select exists(select 1 from public.membership_entitlements e join active_tier t on t.tier_code=e.tier_code
    where e.entitlement_code=p_entitlement_code and e.enabled=true);
$$;
revoke all on function public.vexaro_has_entitlement(text) from public;
grant execute on function public.vexaro_has_entitlement(text) to anon, authenticated;
