create or replace function public.admin_grant_lifetime_elite(p_username text,p_reason text default null)
returns jsonb language plpgsql set search_path to 'public','private' as $function$
declare
 v_user_id uuid; v_username text; v_role text; v_grant_id uuid;
 v_until timestamptz := '9999-12-31 23:59:59+00'::timestamptz;
 v_reason text := left(coalesce(nullif(trim(p_reason),''),'Lifetime Elite granted by an administrator'),500);
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_username is null or char_length(trim(p_username))<3 or char_length(trim(p_username))>24 then raise exception 'Enter the member username (3–24 characters).' using errcode='22023'; end if;
 select p.id,p.username,p.role into v_user_id,v_username,v_role from public.profiles p where lower(p.username)=lower(trim(p_username)) limit 1;
 if v_user_id is null then
  select p.id,coalesce(nullif(i.username,''),p.username),p.role into v_user_id,v_username,v_role
  from public.profile_identities i join public.profiles p on p.id=i.user_id
  where lower(i.username)=lower(trim(p_username)) and i.identity_type='creator' limit 1;
 end if;
 if v_user_id is null then raise exception 'No VEXARO member found with that username.' using errcode='P0002'; end if;
 if lower(coalesce(v_role,'member'))='admin' then raise exception 'Lifetime Elite grants can only be assigned to member accounts.' using errcode='22023'; end if;
 select g.id into v_grant_id from public.membership_entitlement_grants g
 where g.user_id=v_user_id and g.tier_code='elite' and g.revoked_at is null and g.ends_at>now()
 order by g.created_at desc limit 1;
 if v_grant_id is not null then return jsonb_build_object('ok',true,'already_active',true,'username',v_username,'grant_id',v_grant_id,'ends_at',v_until); end if;
 insert into public.membership_entitlement_grants(user_id,tier_code,granted_by,reason,starts_at,ends_at)
 values(v_user_id,'elite',auth.uid(),v_reason,now(),v_until) returning id into v_grant_id;
 insert into public.admin_audit_log(admin_id,action,target_type,target_id,details)
 values(auth.uid(),'lifetime_elite_granted','membership_entitlement_grant',v_grant_id::text,jsonb_build_object('username',v_username,'user_id',v_user_id,'reason',v_reason,'grant_type','lifetime','tier_code','elite'));
 return jsonb_build_object('ok',true,'already_active',false,'username',v_username,'grant_id',v_grant_id,'ends_at',v_until);
end;
$function$;
revoke all on function public.admin_grant_lifetime_elite(text,text) from public;
grant execute on function public.admin_grant_lifetime_elite(text,text) to authenticated;
