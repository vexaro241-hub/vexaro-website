create or replace function public.admin_grant_lifetime_pro(
  p_username text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_user_id uuid;
  v_username text;
  v_membership_id uuid;
  v_until timestamptz := '9999-12-31 23:59:59+00'::timestamptz;
  v_reason text := left(coalesce(nullif(trim(p_reason), ''), 'Lifetime PRO granted by an administrator'), 500);
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  if p_username is null or char_length(trim(p_username)) < 3 or char_length(trim(p_username)) > 24 then
    raise exception 'Enter the member username (3–24 characters).' using errcode = '22023';
  end if;

  select p.id, p.username into v_user_id, v_username
    from public.profiles p where lower(p.username) = lower(trim(p_username)) limit 1;
  if v_user_id is null then
    raise exception 'No VEXARO member found with that username.' using errcode = 'P0002';
  end if;

  select m.id into v_membership_id
    from public.memberships m
   where m.user_id = v_user_id and m.provider = 'admin_lifetime_grant'
     and m.billing_status = 'active' and m.current_period_end > now()
   order by m.created_at desc limit 1;

  if v_membership_id is not null then
    return jsonb_build_object('ok', true, 'already_active', true, 'username', v_username,
      'membership_id', v_membership_id, 'ends_at', v_until);
  end if;

  select m.id into v_membership_id from public.memberships m
   where m.user_id = v_user_id and m.provider = 'admin_lifetime_grant'
   order by m.created_at desc limit 1 for update;

  if v_membership_id is null then
    insert into public.memberships (
      user_id, plan_code, status, starts_at, ends_at, is_trial, provider,
      billing_status, current_period_end, cancel_at_period_end
    ) values (
      v_user_id, 'pro_year', 'active', now(), v_until, false, 'admin_lifetime_grant',
      'active', v_until, false
    ) returning id into v_membership_id;
  else
    update public.memberships set plan_code='pro_year', status='active', starts_at=now(),
      ends_at=v_until, is_trial=false, provider_customer_id=null, provider_subscription_id=null,
      stripe_customer_id=null, stripe_subscription_id=null, stripe_price_id=null,
      billing_status='active', current_period_end=v_until, cancel_at_period_end=false,
      last_payment_at=null, last_payment_failed_at=null, updated_at=now()
    where id=v_membership_id;
  end if;

  insert into public.membership_events (user_id, membership_id, event_type, status, metadata)
  values (v_user_id, v_membership_id, 'admin_lifetime_grant', 'active',
    jsonb_build_object('grant_type','lifetime','reason',v_reason,'admin_id',auth.uid(),'source','admin_app'));

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'lifetime_premium_granted', 'membership', v_membership_id::text,
    jsonb_build_object('username',v_username,'user_id',v_user_id,'reason',v_reason,'grant_type','lifetime'));

  return jsonb_build_object('ok', true, 'already_active', false, 'username', v_username,
    'membership_id', v_membership_id, 'ends_at', v_until);
end;
$function$;

revoke all on function public.admin_grant_lifetime_pro(text, text) from public, anon, authenticated;
grant execute on function public.admin_grant_lifetime_pro(text, text) to authenticated;
