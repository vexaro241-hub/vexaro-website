create or replace function public.vexaro_has_entitlement(p_entitlement_code text)
returns boolean language sql stable security definer set search_path = '' as $$
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
 select exists(select 1 from public.membership_entitlements e join public.membership_tiers t on t.code=e.tier_code cross join current_tier c
  where e.entitlement_code=p_entitlement_code and e.enabled=true and t.tier_level<=c.tier_level);
$$;
revoke all on function public.vexaro_has_entitlement(text) from public;
grant execute on function public.vexaro_has_entitlement(text) to anon, authenticated;
