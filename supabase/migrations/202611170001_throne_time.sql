-- Reigns are recorded atomically with authoritative room updates, not browser time.
create table public.throne_reigns (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 started_at timestamptz not null default now(),
 ended_at timestamptz
);
create unique index throne_one_reign_per_room on public.throne_reigns(room_id) where ended_at is null;
alter table public.throne_reigns enable row level security;
create policy own_throne_times on public.throne_reigns for select to authenticated using(user_id=auth.uid());
grant select on public.throne_reigns to authenticated;
revoke insert,update,delete on public.throne_reigns from authenticated,anon;
create function public.track_throne_time() returns trigger language plpgsql security definer set search_path=public as $$
declare champion text;
begin
 if new.mode <> 'throne' then return new; end if;
 champion := new.state->>'lastWinner';
 if champion is distinct from (old.state->>'lastWinner') then
  update throne_reigns set ended_at=now() where room_id=new.id and ended_at is null;
  if champion is not null then
   insert into throne_reigns(room_id,user_id) values(new.id,champion::uuid);
  end if;
 end if;
 return new;
end $$;
create trigger record_throne_time after update on public.rooms for each row execute function public.track_throne_time();
-- Existing reigns can only be timed from migration onward.
insert into public.throne_reigns(room_id,user_id) select id,(state->>'lastWinner')::uuid from public.rooms where mode='throne' and state->>'lastWinner' is not null and status<>'finished';
create function public.throne_time_ms() returns bigint language sql stable set search_path=public as $$
 select coalesce(sum(greatest(0,extract(epoch from (coalesce(ended_at,now())-started_at))*1000)),0)::bigint
 from throne_reigns where user_id=auth.uid();
$$;
revoke all on function public.throne_time_ms() from public,anon;
grant execute on function public.throne_time_ms() to authenticated;
