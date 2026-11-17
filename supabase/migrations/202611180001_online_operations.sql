-- Hosted Supabase includes pg_cron on Free; jobs run in Postgres, not per-browser timers.
create extension if not exists pg_cron with schema pg_catalog;
create index if not exists rooms_open_lobby on public.rooms(updated_at desc) where status <> 'finished';
create index if not exists rooms_due_votes on public.rooms(deadline) where mode='vote' and status='playing';
select cron.schedule('novachess-votes','* * * * *','select public.close_due_votes()');
select cron.schedule('novachess-chat-retention','30 3 * * *', $$delete from public.messages where created_at < now() - interval '30 days'$$);
-- Old ballots are unnecessary after a turn finishes; retain a short troubleshooting window.
select cron.schedule('novachess-vote-retention','45 3 * * *', $$delete from public.votes v using public.rooms r where v.room_id=r.id and v.created_at < now() - interval '7 days' and v.revision < jsonb_array_length(r.state->'moves')$$);
-- The lobby never needs move history, ballots, queue IDs or all member profiles.
create view public.room_lobby with(security_invoker=true) as
 select id,name,mode,variant,status,jsonb_array_length(members) as member_count,updated_at
 from public.rooms where status <> 'finished';
grant select on public.room_lobby to authenticated;
