-- VEXARO COMMUNITY DATABASE
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text not null default 'VEXARO Member' check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.loadouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  weapon text not null check (char_length(weapon) between 1 and 80),
  category text not null default 'Warzone' check (char_length(category) <= 40),
  attachments jsonb not null default '[]'::jsonb,
  perks jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  image_url text,
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.settings_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  setting_type text not null check (setting_type in ('controller','graphics','audio','other')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id, created_at asc);
create index if not exists loadouts_created_at_idx on public.loadouts(created_at desc);
create index if not exists settings_created_at_idx on public.settings_posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.loadouts enable row level security;
alter table public.settings_posts enable row level security;
alter table public.reports enable row level security;

-- Public/community reads
create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "Posts are public" on public.posts for select to anon, authenticated using (true);
create policy "Likes are public" on public.post_likes for select to anon, authenticated using (true);
create policy "Comments are public" on public.comments for select to anon, authenticated using (true);
create policy "Follows are public" on public.follows for select to anon, authenticated using (true);
create policy "Loadouts are public" on public.loadouts for select to anon, authenticated using (true);
create policy "Settings are public" on public.settings_posts for select to anon, authenticated using (true);

-- Profiles: members can create/update only their own profile.
create policy "Users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Posts
create policy "Users create own posts" on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own posts" on public.posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own posts" on public.posts for delete to authenticated using ((select auth.uid()) = user_id);

-- Likes
create policy "Users like as themselves" on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove own likes" on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);

-- Comments
create policy "Users create own comments" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own comments" on public.comments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own comments" on public.comments for delete to authenticated using ((select auth.uid()) = user_id);

-- Follows
create policy "Users follow as themselves" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

-- Loadouts
create policy "Users create own loadouts" on public.loadouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own loadouts" on public.loadouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own loadouts" on public.loadouts for delete to authenticated using ((select auth.uid()) = user_id);

-- Settings posts
create policy "Users create own settings" on public.settings_posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own settings" on public.settings_posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own settings" on public.settings_posts for delete to authenticated using ((select auth.uid()) = user_id);

-- Reports are private to the reporter for now; admins can be added later server-side.
create policy "Users submit reports" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "Users view own reports" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);

-- Automatically create a basic profile after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(regexp_replace(coalesce(new.raw_user_meta_data->>'username','member'), '[^a-zA-Z0-9_]', '', 'g'), 20) || '_' || substr(replace(new.id::text,'-',''),1,5),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'VEXARO Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


-- VEXARO PRO membership foundation.
-- New accounts receive one month of full PRO trial access.
create schema if not exists private;

create table if not exists public.membership_plans (
  code text primary key,
  name text not null,
  price_pence integer not null check (price_pence >= 0),
  interval_unit text not null check (interval_unit in ('week','month','year')),
  interval_count integer not null default 1 check (interval_count > 0),
  access_level text not null check (access_level in ('weekly','full')),
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  stripe_product_id text,
  stripe_price_id text
);

insert into public.membership_plans (code,name,price_pence,interval_unit,interval_count,access_level,description,sort_order,stripe_product_id,stripe_price_id)
values
 ('pro_week','PRO WEEK',149,'week',1,'weekly','A low-cost taste of PRO with selected premium access.',1,'prod_VNXWKFtBa8HyRr','price_1UMmRTGS3i6hTYhRuj92QODN'),
 ('pro_month','PRO MONTH',399,'month',1,'full','Full VEXARO PRO access.',2,'prod_VNXWPVIQZmNvYY','price_1UMmRVGS3i6hTYhR4ESslcBy'),
 ('pro_year','PRO YEAR',2999,'year',1,'full','Full VEXARO PRO access at the best annual value.',3,'prod_VNXWSLWfAdorfQ','price_1UMmRXGS3i6hTYhRmDPI3qGJ')
on conflict (code) do update set
 name=excluded.name, stripe_product_id=excluded.stripe_product_id, stripe_price_id=excluded.stripe_price_id, price_pence=excluded.price_pence, interval_unit=excluded.interval_unit,
 interval_count=excluded.interval_count, access_level=excluded.access_level,
 description=excluded.description, sort_order=excluded.sort_order;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null references public.membership_plans(code),
  status text not null default 'active' check (status in ('trialing','active','past_due','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_trial boolean not null default false,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_user_status_idx on public.memberships(user_id,status,ends_at desc);
create index if not exists memberships_plan_code_idx on public.memberships(plan_code);
create index if not exists memberships_provider_subscription_idx on public.memberships(provider_subscription_id);

alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;

create policy "Membership plans are public" on public.membership_plans
for select to anon, authenticated using (active = true);

create policy "Users view own memberships" on public.memberships
for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.handle_new_membership()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  insert into public.memberships (user_id,plan_code,status,starts_at,ends_at,is_trial,provider)
  values (new.id,'pro_month','trialing',now(),now()+interval '1 month',true,'vexaro_trial')
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_membership() from public;

drop trigger if exists on_profile_created_membership on public.profiles;
create trigger on_profile_created_membership after insert on public.profiles
for each row execute function private.handle_new_membership();

create or replace function private.touch_membership_updated_at()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function private.touch_membership_updated_at() from public;

drop trigger if exists memberships_touch_updated_at on public.memberships;
create trigger memberships_touch_updated_at before update on public.memberships
for each row execute function private.touch_membership_updated_at();


-- VEXARO 1.0 admin/analytics foundation.
create table if not exists public.site_analytics (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text not null,
  referrer text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_analytics_created_at_idx on public.site_analytics(created_at desc);
create index if not exists site_analytics_path_created_idx on public.site_analytics(path,created_at desc);
create index if not exists site_analytics_visitor_created_idx on public.site_analytics(visitor_id,created_at desc);
create index if not exists site_analytics_user_id_idx on public.site_analytics(user_id);
alter table public.site_analytics enable row level security;
do $$ begin create policy "Analytics events can be recorded" on public.site_analytics for insert to anon,authenticated with check (char_length(visitor_id) between 8 and 80 and char_length(path) between 1 and 200); exception when duplicate_object then null; end $$;
do $$ begin create policy "Admins can read analytics" on public.site_analytics for select to authenticated using (private.is_admin()); exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow','like','comment','mention','system','membership','admin')),
  title text not null check (char_length(title) between 1 and 120), body text not null default '' check (char_length(body)<=500), link text,
  actor_id uuid references public.profiles(id) on delete set null, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
alter table public.notifications enable row level security;
do $$ begin create policy "Users read own notifications" on public.notifications for select to authenticated using ((select auth.uid())=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "Users mark own notifications read" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id); exception when duplicate_object then null; end $$;

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(), category text not null check (char_length(category) between 1 and 60), vendor text not null default '' check (char_length(vendor)<=120), description text not null default '' check (char_length(description)<=300), amount_pence integer not null check (amount_pence>=0), currency text not null default 'gbp' check (currency='gbp'), incurred_at date not null default current_date, recurring boolean not null default false, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists business_expenses_incurred_idx on public.business_expenses(incurred_at desc);
create index if not exists business_expenses_created_by_idx on public.business_expenses(created_by);
alter table public.business_expenses enable row level security;
do $$ begin create policy "Admins manage business expenses" on public.business_expenses for all to authenticated using (private.is_admin()) with check (private.is_admin()); exception when duplicate_object then null; end $$;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key, admin_id uuid references public.profiles(id) on delete set null, action text not null check (char_length(action) between 1 and 120), target_type text, target_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_admin_created_idx on public.admin_audit_log(admin_id,created_at desc);
alter table public.admin_audit_log enable row level security;
do $$ begin create policy "Admins read audit log" on public.admin_audit_log for select to authenticated using (private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Admins write audit log" on public.admin_audit_log for insert to authenticated with check (private.is_admin() and admin_id=(select auth.uid())); exception when duplicate_object then null; end $$;

alter table public.membership_plans add column if not exists stripe_product_id text;
alter table public.membership_plans add column if not exists stripe_price_id text;

-- Notification and audit trigger helpers used by the VEXARO 1.0 build.
create or replace function private.create_notification(p_user_id uuid,p_type text,p_title text,p_body text,p_link text,p_actor_id uuid) returns void language plpgsql security definer set search_path=public,private as $$ begin if p_user_id is null or p_actor_id=p_user_id then return; end if; insert into public.notifications(user_id,type,title,body,link,actor_id) values(p_user_id,p_type,p_title,p_body,p_link,p_actor_id); end $$;
revoke all on function private.create_notification(uuid,text,text,text,text,uuid) from public;
create or replace function private.notify_follow() returns trigger language plpgsql security definer set search_path=public,private as $$ begin perform private.create_notification(new.following_id,'follow','New follower','Someone followed you.','community.html',new.follower_id); return new; end $$;
revoke all on function private.notify_follow() from public;
drop trigger if exists follows_notify on public.follows; create trigger follows_notify after insert on public.follows for each row execute function private.notify_follow();
create or replace function private.notify_like() returns trigger language plpgsql security definer set search_path=public,private as $$ declare target_user uuid; begin select user_id into target_user from public.posts where id=new.post_id; perform private.create_notification(target_user,'like','New like','Someone liked your post.','community.html',new.user_id); return new; end $$;
revoke all on function private.notify_like() from public;
drop trigger if exists post_likes_notify on public.post_likes; create trigger post_likes_notify after insert on public.post_likes for each row execute function private.notify_like();
create or replace function private.notify_comment() returns trigger language plpgsql security definer set search_path=public,private as $$ declare target_user uuid; begin select user_id into target_user from public.posts where id=new.post_id; perform private.create_notification(target_user,'comment','New comment','Someone commented on your post.','community.html',new.user_id); return new; end $$;
revoke all on function private.notify_comment() from public;
drop trigger if exists comments_notify on public.comments; create trigger comments_notify after insert on public.comments for each row execute function private.notify_comment();


-- VEXARO 1.0 live-schema parity: media + marketplace.
-- Keep the repository schema aligned with the live project.
alter table public.profiles add column if not exists role text not null default 'member';

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists post_media_post_id_idx on public.post_media(post_id,created_at asc);
create index if not exists post_media_user_id_idx on public.post_media(user_id,created_at desc);
alter table public.post_media enable row level security;
do $$ begin create policy "Public media view" on public.post_media for select to anon,authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "Members add own media" on public.post_media for insert to authenticated with check ((select auth.uid())=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "Members delete own media" on public.post_media for delete to authenticated using ((select auth.uid())=user_id or private.is_admin()); exception when duplicate_object then null; end $$;

create table if not exists public.marketplace_sellers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  seller_name text not null default 'VEXARO Seller' check (char_length(seller_name) between 1 and 40),
  bio text not null default '' check (char_length(bio)<=500),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(user_id) on update cascade on delete restrict,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description)<=2000),
  game text not null check (char_length(game) between 1 and 50),
  platform text not null default 'Other' check (char_length(platform) between 1 and 30),
  category text not null default 'Gaming service' check (char_length(category) between 1 and 50),
  price_pence integer not null check (price_pence between 0 and 1000000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paused','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.marketplace_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 2000),
  game text not null check (char_length(game) between 1 and 50),
  platform text not null default 'Other' check (char_length(platform) between 1 and 30),
  budget_pence integer check (budget_pence is null or budget_pence between 0 and 1000000),
  status text not null default 'open' check (status in ('open','closed','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketplace_requests(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  price_pence integer not null check (price_pence between 0 and 1000000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now()
);

alter table public.marketplace_sellers enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_requests enable row level security;
alter table public.marketplace_offers enable row level security;

do $$ begin create policy "Marketplace approved sellers public" on public.marketplace_sellers for select to anon,authenticated using (status='approved' or (select auth.uid())=user_id or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Members request seller approval" on public.marketplace_sellers for insert to authenticated with check ((select auth.uid())=user_id and status='pending'); exception when duplicate_object then null; end $$;
do $$ begin create policy "Sellers or admins update seller profile" on public.marketplace_sellers for update to authenticated using ((select auth.uid())=user_id or private.is_admin()) with check (private.is_admin() or ((select auth.uid())=user_id and status='pending' and approved_by is null and approved_at is null)); exception when duplicate_object then null; end $$;

do $$ begin create policy "Approved marketplace listings public" on public.marketplace_listings for select to anon,authenticated using (status='approved' or (select auth.uid())=seller_id or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Approved sellers create listings" on public.marketplace_listings for insert to authenticated with check ((select auth.uid())=seller_id and exists(select 1 from public.marketplace_sellers s where s.user_id=(select auth.uid()) and s.status='approved') and status='pending'); exception when duplicate_object then null; end $$;
do $$ begin create policy "Sellers or admins update listings" on public.marketplace_listings for update to authenticated using ((select auth.uid())=seller_id or private.is_admin()) with check ((select auth.uid())=seller_id or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Sellers or admins delete listings" on public.marketplace_listings for delete to authenticated using ((select auth.uid())=seller_id or private.is_admin()); exception when duplicate_object then null; end $$;

do $$ begin create policy "Public open requests" on public.marketplace_requests for select to anon,authenticated using (status='open' or (select auth.uid())=requester_id or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Members create requests" on public.marketplace_requests for insert to authenticated with check ((select auth.uid())=requester_id and status='open'); exception when duplicate_object then null; end $$;
do $$ begin create policy "Requesters or admins update requests" on public.marketplace_requests for update to authenticated using ((select auth.uid())=requester_id or private.is_admin()) with check ((select auth.uid())=requester_id or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Requesters or admins delete requests" on public.marketplace_requests for delete to authenticated using ((select auth.uid())=requester_id or private.is_admin()); exception when duplicate_object then null; end $$;

do $$ begin create policy "Offer participants view offers" on public.marketplace_offers for select to authenticated using ((select auth.uid())=seller_id or exists(select 1 from public.marketplace_requests r where r.id=marketplace_offers.request_id and r.requester_id=(select auth.uid())) or private.is_admin()); exception when duplicate_object then null; end $$;
do $$ begin create policy "Approved sellers make offers" on public.marketplace_offers for insert to authenticated with check ((select auth.uid())=seller_id and exists(select 1 from public.marketplace_sellers s where s.user_id=(select auth.uid()) and s.status='approved') and status='pending'); exception when duplicate_object then null; end $$;
do $$ begin create policy "Offer owners or admins update offers" on public.marketplace_offers for update to authenticated using ((select auth.uid())=seller_id or private.is_admin()) with check ((select auth.uid())=seller_id or private.is_admin()); exception when duplicate_object then null; end $$;

alter table public.marketplace_listings drop constraint if exists marketplace_listings_seller_id_fkey;
alter table public.marketplace_listings add constraint marketplace_listings_seller_id_fkey foreign key (seller_id) references public.marketplace_sellers(user_id) on update cascade on delete restrict;


-- Public RLS hardening: never invoke the admin-only helper from anon policies.
-- The authenticated policy keeps member-owned/admin visibility without exposing the
-- private.is_admin() function to the anonymous Data API role.
drop policy if exists "Marketplace approved sellers public" on public.marketplace_sellers;
drop policy if exists "Marketplace sellers member access" on public.marketplace_sellers;
create policy "Marketplace approved sellers public" on public.marketplace_sellers for select to anon using (status='approved');
create policy "Marketplace sellers member access" on public.marketplace_sellers for select to authenticated using ((status='approved') or ((select auth.uid())=user_id) or private.is_admin());

drop policy if exists "Approved marketplace listings public" on public.marketplace_listings;
drop policy if exists "Marketplace listings member access" on public.marketplace_listings;
create policy "Approved marketplace listings public" on public.marketplace_listings for select to anon using (status='approved');
create policy "Marketplace listings member access" on public.marketplace_listings for select to authenticated using ((status='approved') or ((select auth.uid())=seller_id) or private.is_admin());

drop policy if exists "Public open requests" on public.marketplace_requests;
drop policy if exists "Marketplace requests member access" on public.marketplace_requests;
create policy "Public open requests" on public.marketplace_requests for select to anon using (status='open');
create policy "Marketplace requests member access" on public.marketplace_requests for select to authenticated using ((status='open') or ((select auth.uid())=requester_id) or private.is_admin());

drop policy if exists "Membership plans are public" on public.membership_plans;
drop policy if exists "Membership plans member access" on public.membership_plans;
create policy "Membership plans are public" on public.membership_plans for select to anon using (active=true);
create policy "Membership plans member access" on public.membership_plans for select to authenticated using (active=true or private.is_admin());
