create table if not exists public.membership_entitlement_grants (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 tier_code text not null references public.membership_tiers(code),
 granted_by uuid not null references public.profiles(id),
 reason text not null default '',
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 check (ends_at > starts_at)
);
create index if not exists membership_entitlement_grants_user_tier_idx on public.membership_entitlement_grants(user_id,tier_code,ends_at);
alter table public.membership_entitlement_grants enable row level security;
grant select,insert,update,delete on public.membership_entitlement_grants to authenticated;
create policy "Members read own entitlement grants" on public.membership_entitlement_grants for select to authenticated using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy "Admins insert entitlement grants" on public.membership_entitlement_grants for insert to authenticated with check ((select private.is_admin()) and granted_by=(select auth.uid()));
create policy "Admins update entitlement grants" on public.membership_entitlement_grants for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete entitlement grants" on public.membership_entitlement_grants for delete to authenticated using ((select private.is_admin()));

create or replace function public.vexaro_has_entitlement(p_entitlement_code text)
returns boolean language sql stable security invoker set search_path = '' as $$
 with available_tiers as (
  select t.tier_level,t.code from public.memberships m
  join public.membership_plan_tiers mpt on mpt.plan_code=m.plan_code and mpt.active=true
  join public.membership_tiers t on t.code=mpt.tier_code and t.active=true
  where m.user_id=(select auth.uid()) and m.status in ('active','trialing') and m.starts_at<=now() and m.ends_at>now()
  union all
  select t.tier_level,t.code from public.membership_entitlement_grants g
  join public.membership_tiers t on t.code=g.tier_code and t.active=true
  where g.user_id=(select auth.uid()) and g.starts_at<=now() and g.ends_at>now() and g.revoked_at is null
 ), current_tier as (select coalesce(max(tier_level),0) tier_level from available_tiers)
 select exists(select 1 from public.membership_entitlements e join public.membership_tiers t on t.code=e.tier_code cross join current_tier c where e.entitlement_code=p_entitlement_code and e.enabled=true and t.tier_level<=c.tier_level);
$$;
