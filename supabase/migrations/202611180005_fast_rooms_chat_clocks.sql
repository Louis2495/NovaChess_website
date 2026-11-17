-- Signature verification is cached; account bans remain checked on every action.
create function public.active_online_account(p_actor uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor and not p.banned and (u.banned_until is null or u.banned_until<=now()))
$$;
revoke all on function public.active_online_account(uuid) from public,anon,authenticated;
grant execute on function public.active_online_account(uuid) to service_role;
-- One trusted read checks current account status and loads the room.
create function public.room_for_action(p_room uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.active_online_account(p_actor) then raise exception 'Account unavailable.' using errcode='42501';end if;
 select to_jsonb(r) into result from public.rooms r where id=p_room;
 if result is null then raise exception 'Game not found.';end if;
 return result;
end $$;
revoke all on function public.room_for_action(uuid,uuid) from public,anon,authenticated;
grant execute on function public.room_for_action(uuid,uuid) to service_role;

create or replace view public.room_lobby with(security_invoker=true) as
 select id,name,mode,variant,status,jsonb_array_length(members) as member_count,updated_at,
 coalesce((settings->>'timeControlSeconds')::integer,0) as time_control
 from public.rooms where status <> 'finished';

create table public.room_messages(id bigint generated always as identity primary key,room_id uuid not null references public.rooms(id) on delete cascade,user_id uuid not null references public.profiles(id),body text not null check(char_length(body) between 1 and 600),created_at timestamptz not null default now());
create index room_messages_recent on public.room_messages(room_id,id desc);
create index room_messages_sender on public.room_messages(user_id,created_at desc);
alter table public.room_messages enable row level security;
create policy room_chat_read on public.room_messages for select to authenticated using(exists(select 1 from public.rooms where id=room_id and mode='throne'));
create policy room_chat_delete on public.room_messages for delete to authenticated using(user_id=auth.uid() or public.is_site_admin() or public.is_chat_moderator());
grant select,delete on public.room_messages to authenticated;
create table public.room_chat_throttle(user_id uuid primary key references public.profiles(id) on delete cascade,window_started_at timestamptz not null,message_count integer not null);
alter table public.room_chat_throttle enable row level security;
revoke all on public.room_chat_throttle from public,anon,authenticated;
grant all on public.room_chat_throttle to service_role;
create function public.post_room_message(p_room uuid,p_body text) returns public.room_messages
language plpgsql security definer set search_path=public as $$
declare result public.room_messages;clean text:=trim(p_body);sent integer;
begin
 if auth.uid() is null or not public.active_online_account(auth.uid()) then raise exception 'Sign in to chat.';end if;
 if not exists(select 1 from public.rooms where id=p_room and mode='throne') then raise exception 'Chat is unavailable.';end if;
 if clean is null or char_length(clean) not between 1 and 600 then raise exception 'Use 1–600 characters.';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 insert into public.room_chat_throttle(user_id,window_started_at,message_count)values(auth.uid(),now(),1)
 on conflict(user_id) do update set window_started_at=case when room_chat_throttle.window_started_at<now()-interval '10 seconds' then now() else room_chat_throttle.window_started_at end,
 message_count=case when room_chat_throttle.window_started_at<now()-interval '10 seconds' then 1 else room_chat_throttle.message_count+1 end returning message_count into sent;
 if sent>5 then raise exception 'Wait a moment before sending another message.';end if;
 insert into public.room_messages(room_id,user_id,body) values(p_room,auth.uid(),clean) returning * into result;
 return result;
end $$;
revoke all on function public.post_room_message(uuid,text) from public,anon;
grant execute on function public.post_room_message(uuid,text) to authenticated;
alter publication supabase_realtime add table public.room_messages;
select cron.schedule('novachess-room-chat-retention','40 3 * * *', $$delete from public.room_messages where created_at < now()-interval '30 days'$$);

-- Broadcast committed server state, never unverified peer moves. Policies allow
-- authenticated readers to receive only; there is deliberately no client send grant.
create function public.room_broadcast_ready() returns boolean language sql stable as $$select true$$;
revoke all on function public.room_broadcast_ready() from public,anon;
grant execute on function public.room_broadcast_ready() to authenticated;
create policy novachess_room_broadcast_read on realtime.messages for select to authenticated using(
 extension='broadcast' and topic=realtime.topic() and realtime.topic() ~ '^room:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 and exists(select 1 from public.profiles where id=auth.uid() and not banned)
 and exists(select 1 from public.rooms where id=case when realtime.topic() ~ '^room:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then substring(realtime.topic() from 6)::uuid else null end)
);
-- Keep complete replay history in Postgres; live boards need only the initial
-- and current FEN plus moves. Custom rules retain all positions for repetition.
create function public.room_wire(p_room public.rooms) returns jsonb language plpgsql immutable set search_path=public as $$
declare payload jsonb:=to_jsonb(p_room);pos jsonb:=p_room.state;partner jsonb;
begin
 if p_room.variant in('dropping','chaos','random') then return payload;end if;
 if jsonb_array_length(pos->'positions')>1 then pos:=jsonb_set(pos,'{positions}',jsonb_build_array(pos->'positions'->0,pos->'fen'));end if;
 partner:=pos->'partner';
 if partner is not null and jsonb_array_length(partner->'positions')>1 then partner:=jsonb_set(partner,'{positions}',jsonb_build_array(partner->'positions'->0,partner->'fen'));pos:=jsonb_set(pos,'{partner}',partner);end if;
 return jsonb_set(payload,'{state}',pos);
end $$;
revoke all on function public.room_wire(public.rooms) from public,anon,authenticated;
grant execute on function public.room_wire(public.rooms) to service_role;
create function public.broadcast_room_state() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform realtime.send(public.room_wire(new),'state','room:'||new.id::text,true);
 return new;
end $$;
create trigger broadcast_room_update after update on public.rooms for each row execute function public.broadcast_room_state();

-- A reign starts with a win. The previous counter omitted that first game.
update public.throne_reigns set games=games+1;
create or replace function public.track_throne_time() returns trigger language plpgsql security definer set search_path=public as $$
declare champion text;completed boolean;
begin
 if new.mode<>'throne' then return new;end if;
 champion:=new.state->>'lastWinner';
 completed:=old.status='playing' and (
  (new.state->'lastGame'->>'id' is not null and (new.state->'lastGame'->>'id') is distinct from (old.state->'lastGame'->>'id'))
  or (new.state->'lastGame'->>'id' is null and new.state->>'lastResult' is not null and (new.state->>'gameKey') is distinct from (old.state->>'gameKey'))
 );
 if completed and old.state->>'lastWinner' is not null then update public.throne_reigns set games=games+1 where room_id=new.id and ended_at is null;end if;
 if champion is distinct from (old.state->>'lastWinner') then
  update public.throne_reigns set ended_at=now() where room_id=new.id and ended_at is null;
  if champion is not null then insert into public.throne_reigns(room_id,user_id,games)values(new.id,champion::uuid,1);end if;
 end if;
 return new;
end $$;

create function public.server_time_ms() returns bigint language sql as $$select floor(extract(epoch from clock_timestamp())*1000)::bigint$$;
revoke all on function public.server_time_ms() from public,anon;
grant execute on function public.server_time_ms() to authenticated;

-- Minute-level cleanup finalizes expired games even with both browsers closed.
-- Live players claim expiry immediately; cleanup allows a short in-flight grace.
create function public.timeout_result(p_fen text) returns text language plpgsql immutable as $$
declare board text:=split_part(p_fen,' ',1);winner text:=case when split_part(p_fen,' ',2)='w' then 'b' else 'w' end;
 ch text;file integer:=0;rank integer:=8;material integer:=0;knights integer:=0;bishop_colors integer:=0;heavy boolean:=false;own_piece boolean:=false;i integer;
begin
 for i in 1..length(board) loop
  ch:=substr(board,i,1);
  if ch='/' then rank:=rank-1;file:=0;
  elsif ch~'^[1-8]$' then file:=file+ch::integer;
  else
   if lower(ch)<>'k' then
    material:=material+1;
    if (winner='w' and ch=upper(ch)) or (winner='b' and ch=lower(ch)) then own_piece:=true;end if;
    if lower(ch) in('p','r','q') then heavy:=true;
    elsif lower(ch)='n' then knights:=knights+1;
    elsif lower(ch)='b' then bishop_colors:=bishop_colors | (1 << ((file+rank)%2));end if;
   end if;
   file:=file+1;
  end if;
 end loop;
 if not own_piece or material=0 or (material=1 and not heavy) or (not heavy and knights=0 and bishop_colors in(1,2)) then return '1/2-1/2';end if;
 return case when winner='w' then '1-0' else '0-1' end;
end $$;
revoke all on function public.timeout_result(text) from public,anon,authenticated;
grant execute on function public.timeout_result(text) to service_role;
create index rooms_live_clock on public.rooms(updated_at)where status='playing' and state?'clock';
create function public.close_expired_games() returns integer language plpgsql security definer set search_path=public as $$
declare r public.rooms;side text;result text;white_id uuid;black_id uuid;closed integer:=0;now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 for r in select * from public.rooms where status='playing' and mode='standard' and variant='chess' and state?'clock'
  and state->'clock'->>'startedAt' is not null
  and (state->'clock'->>'startedAt')::bigint+(state->'clock'->'remaining'->>split_part(state->>'fen',' ',2))::bigint<now_ms-5000
  for update skip locked loop
  side:=split_part(r.state->>'fen',' ',2);result:=public.timeout_result(r.state->>'fen');
  update public.rooms set state=jsonb_set(jsonb_set(jsonb_set(r.state,'{result}',to_jsonb(result)),array['clock','remaining',side],'0'::jsonb),'{clock,startedAt}','null'::jsonb),status='finished',revision=revision+1,updated_at=now() where id=r.id;
  select (m->>'id')::uuid into white_id from jsonb_array_elements(r.members)m where m->>'team'='w' limit 1;
  select (m->>'id')::uuid into black_id from jsonb_array_elements(r.members)m where m->>'team'='b' limit 1;
  if white_id is not null and black_id is not null then perform public.rate_game(r.id,r.state->>'gameKey',white_id,black_id,result);end if;
  closed:=closed+1;
 end loop;
 return closed;
end $$;
revoke all on function public.close_expired_games() from public,anon,authenticated;
grant execute on function public.close_expired_games() to service_role;
select cron.schedule('novachess-clocks','* * * * *','select public.close_expired_games()');

-- Count completed Throne games for both participants, including challengers.
create table public.throne_results(room_id uuid not null references public.rooms(id) on delete cascade,game_key text not null,white uuid not null references public.profiles(id),black uuid not null references public.profiles(id),result text not null check(result in('1-0','0-1','1/2-1/2')),completed_at timestamptz not null default now(),primary key(room_id,game_key));
alter table public.throne_results enable row level security;
create policy own_throne_results on public.throne_results for select to authenticated using(auth.uid() in(white,black));
grant select on public.throne_results to authenticated;
revoke insert,update,delete on public.throne_results from authenticated,anon;
insert into public.throne_results(room_id,game_key,white,black,result,completed_at)
 select g.room_id,g.game_key,g.white,g.black,g.result,g.created_at from public.rated_games g join public.rooms r on r.id=g.room_id where r.mode='throne' on conflict do nothing;
create function public.record_throne_result() returns trigger language plpgsql security definer set search_path=public as $$
declare finished jsonb:=new.state->'lastGame';
begin
 if new.mode='throne' and finished->>'id' is not null and (finished->>'id') is distinct from (old.state->'lastGame'->>'id')
 and finished->>'white' is not null and finished->>'black' is not null then
  insert into public.throne_results(room_id,game_key,white,black,result)values(new.id,finished->>'id',(finished->>'white')::uuid,(finished->>'black')::uuid,finished->>'result')on conflict do nothing;
 end if;
 return new;
end $$;
create trigger record_throne_result after update on public.rooms for each row execute function public.record_throne_result();
create function public.record_rated_throne_result() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.rooms where id=new.room_id and mode='throne') then
  insert into public.throne_results(room_id,game_key,white,black,result,completed_at)values(new.room_id,new.game_key,new.white,new.black,new.result,new.created_at)on conflict do nothing;
 end if;
 return new;
end $$;
create trigger record_rated_throne_result after insert on public.rated_games for each row execute function public.record_rated_throne_result();
create or replace function public.throne_stats() returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('timeMs',coalesce((select sum(greatest(0,extract(epoch from(coalesce(ended_at,now())-started_at))*1000)) from public.throne_reigns where user_id=auth.uid()),0)::bigint,
 'games',greatest((select count(*) from public.throne_results where auth.uid() in(white,black)),(select coalesce(sum(games),0) from public.throne_reigns where user_id=auth.uid())))
$$;

create index throne_results_white on public.throne_results(white);
create index throne_results_black on public.throne_results(black);
create index throne_reigns_user on public.throne_reigns(user_id);

create index rooms_waiting_match on public.rooms(mode,variant,(coalesce((settings->>'timeControlSeconds')::integer,0)),updated_at) where status='waiting';

create index rooms_host_recent on public.rooms(host,created_at desc);
