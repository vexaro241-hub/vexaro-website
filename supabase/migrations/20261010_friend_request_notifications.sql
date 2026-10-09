-- Notifications are created by a trusted database trigger, never directly by clients.
create or replace function public.notify_friend_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (new.receiver_id, 'friend_request', 'New friend request', 'Someone sent you a VEXARO friend request.', '/community?view=friends', new.sender_id);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (new.sender_id, 'friend_accepted', 'Friend request accepted', 'Your VEXARO friend request was accepted.', '/community?view=friends', new.receiver_id);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_friend_request_event() from public, anon, authenticated;
drop trigger if exists friend_request_notification_event on public.friend_requests;
create trigger friend_request_notification_event
after insert or update of status on public.friend_requests
for each row execute function public.notify_friend_request_event();