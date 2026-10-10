drop policy if exists "Admins manage membership tiers" on public.membership_tiers;
create policy "Admins insert membership tiers" on public.membership_tiers for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update membership tiers" on public.membership_tiers for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete membership tiers" on public.membership_tiers for delete to authenticated using ((select private.is_admin()));

drop policy if exists "Admins manage membership entitlements" on public.membership_entitlements;
create policy "Admins insert membership entitlements" on public.membership_entitlements for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update membership entitlements" on public.membership_entitlements for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete membership entitlements" on public.membership_entitlements for delete to authenticated using ((select private.is_admin()));

drop policy if exists "Admins manage membership plan tier mappings" on public.membership_plan_tiers;
create policy "Admins insert membership plan tier mappings" on public.membership_plan_tiers for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update membership plan tier mappings" on public.membership_plan_tiers for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete membership plan tier mappings" on public.membership_plan_tiers for delete to authenticated using ((select private.is_admin()));
