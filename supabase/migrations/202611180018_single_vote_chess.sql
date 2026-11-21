-- Keep the established shared game and preserve the records of any duplicate rooms.
do $$
begin
  lock table public.rooms in share row exclusive mode;
  with ranked as (
    select id, row_number() over (
      order by (status='playing') desc, jsonb_array_length(members) desc, created_at, id
    ) as priority
    from public.rooms
    where mode='vote' and status in ('waiting','playing')
  )
  update public.rooms r
  set status='cancelled', deadline=null, revision=r.revision+1, updated_at=now()
  from ranked
  where ranked.id=r.id and ranked.priority>1;

  create unique index rooms_one_active_vote_chess
  on public.rooms (mode) where mode='vote' and status in ('waiting','playing');
end $$;

create function public.enter_vote_chess(p_actor uuid, p_room uuid, p_initial jsonb) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
  side text;
  white_count integer;
  black_count integer;
begin
  if not public.active_online_account(p_actor) then raise exception 'Account unavailable.'; end if;

  -- Serialize first entry even when there is no room row to lock yet.
  perform pg_advisory_xact_lock(20261118, 18);
  select * into r from public.rooms
  where mode='vote' and status in ('waiting','playing') and (p_room is null or id=p_room)
  for update;
  if not found then
    if p_initial is null then raise exception 'This Vote Chess game has ended.'; end if;
    insert into public.rooms(host,name,mode,variant,state,members,settings,status,deadline)
    values (p_actor,'Vote Chess','vote','chess',p_initial,
      jsonb_build_array(jsonb_build_object('id',p_actor,'team','w')),
      '{"bot":false}'::jsonb,'waiting',now()+interval '1 day')
    returning * into r;
    return r;
  end if;
  if exists (select 1 from jsonb_array_elements(r.members) m where m->>'id'=p_actor::text) then
    return r;
  end if;

  select count(*) filter (where m->>'team'='w'), count(*) filter (where m->>'team'='b')
  into white_count, black_count from jsonb_array_elements(r.members) m;
  side := case when white_count<=black_count then 'w' else 'b' end;
  update public.rooms set
    members=r.members || jsonb_build_array(jsonb_build_object('id',p_actor,'team',side)),
    status=case when white_count>0 or black_count>0 then 'playing' else 'waiting' end,
    deadline=case when r.status='waiting' then now()+interval '1 day' else r.deadline end,
    revision=r.revision+1,
    updated_at=now()
  where id=r.id returning * into r;
  return r;
end $$;

revoke all on function public.enter_vote_chess(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enter_vote_chess(uuid,uuid,jsonb) to service_role;
