create table public.puzzle_messages (
 id bigint generated always as identity primary key,
 puzzle_key text not null check(char_length(puzzle_key) between 1 and 100),
 user_id uuid not null references public.profiles(id),
 body text not null check(char_length(body) between 1 and 600),
 created_at timestamptz not null default now()
);
create index puzzle_messages_recent on public.puzzle_messages(puzzle_key,id desc);
alter table public.puzzle_messages enable row level security;
create policy puzzle_chat_read on public.puzzle_messages for select to authenticated using(true);
create policy puzzle_chat_delete on public.puzzle_messages for delete to authenticated using(user_id=auth.uid() or public.is_site_admin() or public.is_chat_moderator());
grant select,delete on public.puzzle_messages to authenticated;
create function public.post_puzzle_message(p_puzzle text,p_body text) returns public.puzzle_messages
language plpgsql security definer set search_path=public as $$
declare result public.puzzle_messages;clean text:=trim(p_body);sent integer;
begin
 if auth.uid() is null or not public.active_online_account(auth.uid()) then raise exception 'Sign in to chat.';end if;
 if p_puzzle is null or p_puzzle !~ '^\d{4}-\d{2}-\d{2}/[A-Za-z0-9_-]{1,60}$' then raise exception 'Invalid puzzle.';end if;
 if clean is null or char_length(clean) not between 1 and 600 then raise exception 'Use 1–600 characters.';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 insert into public.room_chat_throttle(user_id,window_started_at,message_count)values(auth.uid(),now(),1)
 on conflict(user_id) do update set window_started_at=case when room_chat_throttle.window_started_at<now()-interval '10 seconds' then now() else room_chat_throttle.window_started_at end,
 message_count=case when room_chat_throttle.window_started_at<now()-interval '10 seconds' then 1 else room_chat_throttle.message_count+1 end returning message_count into sent;
 if sent>5 then raise exception 'Wait a moment before sending another message.';end if;
 insert into public.puzzle_messages(puzzle_key,user_id,body) values(p_puzzle,auth.uid(),clean) returning * into result;
 return result;
end $$;
revoke all on function public.post_puzzle_message(text,text) from public,anon;
grant execute on function public.post_puzzle_message(text,text) to authenticated;
alter publication supabase_realtime add table public.puzzle_messages;
select cron.schedule('novachess-puzzle-chat-retention','45 3 * * *', $$delete from public.puzzle_messages where created_at < now()-interval '30 days'$$);
