-- Friend requests are private to the two involved members. Recipients may only accept or decline pending requests.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (sender_id <> receiver_id),
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);
alter table public.friend_requests enable row level security;
drop policy if exists "Members can read their own friend requests" on public.friend_requests;
create policy "Members can read their own friend requests" on public.friend_requests
for select to authenticated using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);
drop policy if exists "Members can send friend requests" on public.friend_requests;
create policy "Members can send friend requests" on public.friend_requests
for insert to authenticated with check ((select auth.uid()) = sender_id and sender_id <> receiver_id and status = 'pending');
drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests" on public.friend_requests
for update to authenticated using ((select auth.uid()) = receiver_id and status = 'pending')
with check ((select auth.uid()) = receiver_id and status in ('accepted','declined'));
drop policy if exists "Members can clear declined friend requests" on public.friend_requests;
create policy "Members can clear declined friend requests" on public.friend_requests
for delete to authenticated using (status = 'declined' and ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id));
create or replace function public.guard_friend_request_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sender_id <> old.sender_id or new.receiver_id <> old.receiver_id or new.id <> old.id or new.created_at <> old.created_at then
    raise exception 'Friend request identity fields cannot be changed';
  end if;
  if old.status <> 'pending' or new.status not in ('accepted','declined') then
    raise exception 'Only pending friend requests can be accepted or declined';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists friend_requests_guard_update on public.friend_requests;
create trigger friend_requests_guard_update before update on public.friend_requests
for each row execute function public.guard_friend_request_update();
create index if not exists friend_requests_receiver_status_idx on public.friend_requests(receiver_id, status, created_at desc);
create index if not exists friend_requests_sender_status_idx on public.friend_requests(sender_id, status, created_at desc);
revoke all on table public.friend_requests from anon, authenticated, public;
grant select, insert, update, delete on table public.friend_requests to authenticated;