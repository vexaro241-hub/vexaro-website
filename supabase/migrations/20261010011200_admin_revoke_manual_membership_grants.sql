create or replace function public.admin_revoke_manual_membership(p_username text,p_tier_code text,p_reason text default null)
returns jsonb language plpgsql set search_path to 'public','private' as $function$
declare
 v_user_id uuid; v_username text; v_role text; v_membership_id uuid; v_count integer:=0;
 v_reason text:=left(coalesce(nullif(trim(p_reason),''),'Manual membership access revoked by an administrator'),500);
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_tier_code not in ('pro','elite') then raise exception 'Choose PRO or Elite.' using errcode='22023'; end if;
 if p_username is null or char_length(trim(p_username))<3 or char_length(trim(p_username))>24 then raise exception 'Enter the member username (3–24 characters).' using errcode='22023'; end if;
 select p.id,p.username,p.role into v_user_id,v_username,v_role from public.profiles p where lower(p.username)=lower(trim(p_username)) limit 1;
 if v_user_id is null then
  select p.id,coalesce(nullif(i.username,''),p.username),p.role into v_user_id,v_username,v_role from public.profile_identities i join public.profiles p on p.id=i.user_id where lower(i.username)=lower(trim(p_username)) and i.identity_type='creator' limit 1;
 end if;
 if v_user_id is null then raise exception 'No VEXARO member found with that username.' using errcode='P0002'; end if;
 if lower(coalesce(v_role,'member'))='admin' then raise exception 'Manual membership access can only be revoked from member accounts.' using errcode='22023'; end if;
 if p_tier_code='pro' then
  select m.id into v_membership_id from public.memberships m join public.membership_plan_tiers mpt on mpt.plan_code=m.plan_code and mpt.tier_code='pro'
  where m.user_id=v_user_id and m.provider='admin_lifetime_grant' and m.status='active' and m.billing_status='active' and m.current_period_end>now()
  order by m.created_at desc limit 1 for update;
  if v_membership_id is null then return jsonb_build_object('ok',true,'already_inactive',true,'username',v_username,'tier_code','pro'); end if;
  update public.memberships set status='canceled',ends_at=now(),billing_status='canceled',current_period_end=now(),cancel_at_period_end=true,updated_at=now() where id=v_membership_id;
  insert into public.membership_events(user_id,membership_id,event_type,status,metadata) values(v_user_id,v_membership_id,'admin_lifetime_grant_revoked','canceled',jsonb_build_object('reason',v_reason,'admin_id',auth.uid(),'source','admin_app'));
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,details) values(auth.uid(),'lifetime_pro_revoked','membership',v_membership_id::text,jsonb_build_object('username',v_username,'user_id',v_user_id,'reason',v_reason,'tier_code','pro'));
  return jsonb_build_object('ok',true,'already_inactive',false,'username',v_username,'tier_code','pro','membership_id',v_membership_id);
 end if;
 update public.membership_entitlement_grants set revoked_at=now() where user_id=v_user_id and tier_code='elite' and revoked_at is null and ends_at>now();
 get diagnostics v_count=row_count;
 if v_count=0 then return jsonb_build_object('ok',true,'already_inactive',true,'username',v_username,'tier_code','elite'); end if;
 insert into public.admin_audit_log(admin_id,action,target_type,target_id,details) values(auth.uid(),'lifetime_elite_revoked','membership_entitlement_grant',v_user_id::text,jsonb_build_object('username',v_username,'user_id',v_user_id,'reason',v_reason,'tier_code','elite','grants_revoked',v_count));
 return jsonb_build_object('ok',true,'already_inactive',false,'username',v_username,'tier_code','elite','grants_revoked',v_count);
end;
$function$;
revoke all on function public.admin_revoke_manual_membership(text,text,text) from public;
grant execute on function public.admin_revoke_manual_membership(text,text,text) to authenticated;
