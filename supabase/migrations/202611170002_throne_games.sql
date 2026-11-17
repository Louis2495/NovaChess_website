alter table public.throne_reigns add column games integer not null default 0;
create or replace function public.track_throne_time() returns trigger language plpgsql security definer set search_path=public as $$
declare champion text;
begin
 if new.mode <> 'throne' then return new; end if;
 champion := new.state->>'lastWinner';
 if old.state->>'lastWinner' is not null and old.status='playing'
    and new.state->>'lastResult' is not null
    and (new.state->>'gameKey') is distinct from (old.state->>'gameKey') then
  update throne_reigns set games=games+1 where room_id=new.id and ended_at is null;
 end if;
 if champion is distinct from (old.state->>'lastWinner') then
  update throne_reigns set ended_at=now() where room_id=new.id and ended_at is null;
  if champion is not null then
   insert into throne_reigns(room_id,user_id) values(new.id,champion::uuid);
  end if;
 end if;
 return new;
end $$;
create function public.throne_stats() returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('timeMs',coalesce(sum(greatest(0,extract(epoch from (coalesce(ended_at,now())-started_at))*1000)),0)::bigint,'games',coalesce(sum(games),0)) from throne_reigns where user_id=auth.uid();
$$;
revoke all on function public.throne_stats() from public,anon;
grant execute on function public.throne_stats() to authenticated;
