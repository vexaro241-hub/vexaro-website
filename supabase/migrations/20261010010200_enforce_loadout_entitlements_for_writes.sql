drop policy if exists "Loadouts visible when entitlement is met" on public.loadouts;
create policy "Loadouts visible when entitlement is met" on public.loadouts for select to anon, authenticated using (user_id=(select auth.uid()) or (select private.is_admin()) or public.vexaro_has_entitlement(required_entitlement));
drop policy if exists "Users or admins create loadouts" on public.loadouts;
create policy "Users or admins create entitled loadouts" on public.loadouts for insert to authenticated with check ((select private.is_admin()) or ((select auth.uid())=user_id and public.vexaro_has_entitlement(required_entitlement)));
drop policy if exists "Users or admins update loadouts" on public.loadouts;
create policy "Users or admins update entitled loadouts" on public.loadouts for update to authenticated using ((select auth.uid())=user_id or (select private.is_admin())) with check ((select private.is_admin()) or ((select auth.uid())=user_id and public.vexaro_has_entitlement(required_entitlement)));
