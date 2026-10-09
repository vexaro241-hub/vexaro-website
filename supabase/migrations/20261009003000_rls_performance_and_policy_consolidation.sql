-- VEXARO RLS performance and policy consolidation (applied to Supabase 2026-10-09).
-- Run after the base VEXARO schema and the preceding hardening migrations.

DROP POLICY IF EXISTS "Sellers or admins update listings" ON public.marketplace_listings;
CREATE POLICY "Sellers or admins update listings" ON public.marketplace_listings FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = seller_id OR (SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()) OR ((SELECT auth.uid()) = seller_id AND status = 'pending' AND approved_by IS NULL AND approved_at IS NULL));
DROP POLICY IF EXISTS "Approved sellers create listings" ON public.marketplace_listings;
CREATE POLICY "Approved sellers create listings" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = seller_id AND EXISTS (SELECT 1 FROM public.marketplace_sellers s WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'approved') AND status = 'pending' AND approved_by IS NULL AND approved_at IS NULL);
DROP POLICY IF EXISTS "Members request seller approval" ON public.marketplace_sellers;
CREATE POLICY "Members request seller approval" ON public.marketplace_sellers FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'pending' AND approved_by IS NULL AND approved_at IS NULL);
DROP POLICY IF EXISTS "Offer owners or admins update offers" ON public.marketplace_offers;
CREATE POLICY "Offer owners or admins update offers" ON public.marketplace_offers FOR UPDATE TO authenticated USING ((SELECT private.is_admin()) OR ((SELECT auth.uid()) = seller_id AND status = 'pending')) WITH CHECK ((SELECT private.is_admin()) OR ((SELECT auth.uid()) = seller_id AND status = 'pending'));
DROP POLICY IF EXISTS "Users update own posts" ON public.posts;
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id AND (identity_id IS NULL OR can_post_as_identity(identity_id)));

DROP POLICY IF EXISTS "Admins manage appeals" ON public.account_appeals;
DROP POLICY IF EXISTS "Users create own appeals" ON public.account_appeals;
DROP POLICY IF EXISTS "Users read own appeals" ON public.account_appeals;
CREATE POLICY "Owners or admins create appeals" ON public.account_appeals FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Owners or admins read appeals" ON public.account_appeals FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Admins update appeals" ON public.account_appeals FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins delete appeals" ON public.account_appeals FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Users manage own devices" ON public.account_devices;
DROP POLICY IF EXISTS "Admins read devices" ON public.account_devices;
CREATE POLICY "Owners or admins read devices" ON public.account_devices FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Owners create devices" ON public.account_devices FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners update devices" ON public.account_devices FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners delete devices" ON public.account_devices FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins read security events" ON public.account_security_events;
DROP POLICY IF EXISTS "Users read own security events" ON public.account_security_events;
CREATE POLICY "Owners or admins read security events" ON public.account_security_events FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Admins read activity history" ON public.member_activity_history;
DROP POLICY IF EXISTS "Users read own activity history" ON public.member_activity_history;
CREATE POLICY "Owners or admins read activity history" ON public.member_activity_history FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Admins read membership events" ON public.membership_events;
DROP POLICY IF EXISTS "Users read own membership events" ON public.membership_events;
CREATE POLICY "Owners or admins read membership events" ON public.membership_events FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins manage moderation actions" ON public.moderation_actions;
DROP POLICY IF EXISTS "Users read own moderation actions" ON public.moderation_actions;
CREATE POLICY "Owners or admins read moderation actions" ON public.moderation_actions FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR (SELECT auth.uid()) = user_id);
CREATE POLICY "Admins create moderation actions" ON public.moderation_actions FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins update moderation actions" ON public.moderation_actions FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins delete moderation actions" ON public.moderation_actions FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admins manage runtime flags" ON public.platform_runtime_flags;
DROP POLICY IF EXISTS "Public read runtime flags" ON public.platform_runtime_flags;
CREATE POLICY "Public read runtime flags" ON public.platform_runtime_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins create runtime flags" ON public.platform_runtime_flags FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins update runtime flags" ON public.platform_runtime_flags FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins delete runtime flags" ON public.platform_runtime_flags FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admins manage video queue" ON public.video_processing_queue;
DROP POLICY IF EXISTS "Users view own video queue" ON public.video_processing_queue;
CREATE POLICY "Owners or admins view video queue" ON public.video_processing_queue FOR SELECT TO authenticated USING ((SELECT private.is_admin()) OR EXISTS (SELECT 1 FROM public.post_media pm WHERE pm.id = video_processing_queue.post_media_id AND pm.user_id = (SELECT auth.uid())));
CREATE POLICY "Admins create video queue jobs" ON public.video_processing_queue FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins update video queue jobs" ON public.video_processing_queue FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins delete video queue jobs" ON public.video_processing_queue FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

CREATE INDEX IF NOT EXISTS account_appeals_admin_id_idx ON public.account_appeals (admin_id);
CREATE INDEX IF NOT EXISTS account_appeals_moderation_action_id_idx ON public.account_appeals (moderation_action_id);
CREATE INDEX IF NOT EXISTS account_security_events_user_id_idx ON public.account_security_events (user_id);
CREATE INDEX IF NOT EXISTS admin_tasks_assigned_to_idx ON public.admin_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS admin_tasks_created_by_idx ON public.admin_tasks (created_by);
CREATE INDEX IF NOT EXISTS data_retention_policies_updated_by_idx ON public.data_retention_policies (updated_by);
CREATE INDEX IF NOT EXISTS maintenance_schedule_created_by_idx ON public.maintenance_schedule (created_by);
CREATE INDEX IF NOT EXISTS membership_events_membership_id_idx ON public.membership_events (membership_id);
CREATE INDEX IF NOT EXISTS mentions_actor_user_id_idx ON public.mentions (actor_user_id);
CREATE INDEX IF NOT EXISTS mentions_comment_id_idx ON public.mentions (comment_id);
CREATE INDEX IF NOT EXISTS mentions_post_id_idx ON public.mentions (post_id);
CREATE INDEX IF NOT EXISTS moderation_actions_admin_id_idx ON public.moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS platform_runtime_flags_updated_by_idx ON public.platform_runtime_flags (updated_by);
CREATE INDEX IF NOT EXISTS privacy_requests_user_id_idx ON public.privacy_requests (user_id);
CREATE INDEX IF NOT EXISTS saved_posts_post_id_idx ON public.saved_posts (post_id);
CREATE INDEX IF NOT EXISTS system_activity_actor_id_idx ON public.system_activity (actor_id);
