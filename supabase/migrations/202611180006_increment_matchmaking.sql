-- Keep games with a two-second increment in their own matchmaking pool.
create or replace view public.room_lobby with(security_invoker=true) as
 select id,name,mode,variant,status,jsonb_array_length(members) as member_count,updated_at,
 coalesce((settings->>'timeControlSeconds')::integer,0) as time_control,
 coalesce((settings->>'incrementSeconds')::integer,0) as increment_seconds
 from public.rooms where status <> 'finished';
create index rooms_waiting_increment_matchmaking on public.rooms(mode,variant,((settings->>'timeControlSeconds')),((settings->>'incrementSeconds')),updated_at) where status='waiting';
