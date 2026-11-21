create index friend_game_invites_pending_room on public.friend_game_invites(room_id, created_at) where status='pending';

create or replace function public.invite_team_friends(p_room uuid, p_actor uuid, p_friends uuid[]) returns integer
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
  side text;
  recipients uuid[];
  occupied integer;
  capacity integer;
begin
  select * into r from public.rooms where id=p_room for update;
  capacity := case when r.variant='bughouse' then 2 else 6 end;
  select case when capacity=2 and member->>'board'='1'
    then case member->>'team' when 'w' then 'b' when 'b' then 'w' end
    else member->>'team' end
  into side from jsonb_array_elements(r.members) member where member->>'id'=p_actor::text;
  if side is null or (r.mode <> 'team' and r.variant <> 'bughouse') or r.status not in ('waiting','playing')
     or not public.active_online_account(p_actor) then
    raise exception 'Join an active team before inviting friends.';
  end if;

  select array(select distinct person from unnest(p_friends) person) into recipients;
  if capacity=2 and cardinality(recipients)<>1 then raise exception 'Invite one Bughouse teammate.'; end if;
  if cardinality(recipients) not between 1 and 5 then
    raise exception 'Select up to five friends.';
  end if;
  if exists (
    select 1 from unnest(recipients) person
    where person is null or person=p_actor
       or person::text=r.settings->>'invitedFriend'
       or not public.active_online_account(person)
       or not exists (
         select 1 from public.friendships
         where status='accepted' and ((sender=p_actor and recipient=person) or (recipient=p_actor and sender=person))
       )
       or exists (select 1 from jsonb_array_elements(r.members) m where m->>'id'=person::text)
       or exists (
         select 1 from public.friend_game_invites i
         where i.room_id=p_room and i.recipient=person and i.status='pending' and i.created_at>now()-interval '1 day'
       )
  ) then
    raise exception 'Choose friends who are not already playing or invited to this game.';
  end if;

  select count(*) into occupied from jsonb_array_elements(r.members) m
  where case when capacity=2 and m->>'board'='1' then m->>'team'<>side else m->>'team'=side end;
  if capacity=2 and side='b' and r.settings ? 'invitedFriend'
     and not exists (select 1 from jsonb_array_elements(r.members) m where m->>'id'=r.settings->>'invitedFriend')
     and exists (select 1 from public.friend_game_invites where room_id=p_room and team is null and status='pending' and created_at>now()-interval '1 day')
  then occupied := occupied + 1; end if;
  occupied := occupied + (
    select count(*) from public.friend_game_invites
    where room_id=p_room and team=side and status='pending' and created_at>now()-interval '1 day'
  );
  if occupied + cardinality(recipients) > capacity then
    if capacity=2 then raise exception 'Your Bughouse team already has a teammate or a pending invitation.'; end if;
    raise exception 'Your team can have up to six players, including pending teammates.';
  end if;

  insert into public.friend_game_invites(room_id,sender,recipient,team)
  select p_room,p_actor,person,side from unnest(recipients) person
  on conflict (room_id,recipient) where team is not null
  do update set sender=excluded.sender, team=excluded.team, status='pending', created_at=now();
  return cardinality(recipients);
end $$;

create function public.create_bughouse_friend_game(
  p_host uuid, p_opponent uuid, p_friends uuid[], p_name text, p_state jsonb, p_settings jsonb
) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
begin
  if p_opponent is not null and (p_host=p_opponent or not public.active_online_account(p_opponent)) then
    raise exception 'Player unavailable.';
  end if;
  insert into public.rooms(host,name,mode,variant,state,members,settings,status)
  values(p_host,p_name,'standard','bughouse',p_state,jsonb_build_array(jsonb_build_object('id',p_host,'team','w','board',0)),
    p_settings || case when p_opponent is null then '{}'::jsonb else jsonb_build_object('invitedFriend',p_opponent) end,'waiting')
  returning * into r;
  if p_opponent is not null then
    insert into public.friend_game_invites(room_id,sender,recipient) values(r.id,p_host,p_opponent);
  end if;
  if cardinality(p_friends)>0 then perform public.invite_team_friends(r.id,p_host,p_friends); end if;
  return r;
end $$;

create function public.join_bughouse_room(p_room uuid, p_actor uuid, p_invite uuid) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
  invitation public.friend_game_invites;
  seat record;
  invite_side text;
  reserved text[];
begin
  select * into r from public.rooms where id=p_room for update;
  if r.id is null or r.variant <> 'bughouse' or not public.active_online_account(p_actor) then
    raise exception 'Bughouse game unavailable.';
  end if;
  if exists(select 1 from jsonb_array_elements(r.members) m where m->>'id'=p_actor::text) then return r; end if;
  if r.status <> 'waiting' then raise exception 'This Bughouse game is full or has ended.'; end if;

  select * into invitation from public.friend_game_invites
  where room_id=p_room and recipient=p_actor and status='pending' and created_at>now()-interval '1 day'
    and (p_invite is null or id=p_invite)
  order by created_at desc limit 1 for update;
  if p_invite is not null and invitation.id is null then raise exception 'This invitation is no longer available.'; end if;
  invite_side := coalesce(invitation.team,case when invitation.id is not null then 'b' end);
  select array(
    select coalesce(i.team,'b') from public.friend_game_invites i
    where i.room_id=p_room and i.status='pending' and i.created_at>now()-interval '1 day'
  ) into reserved;

  -- A team has White on one board and Black on the other board.
  select s.board,s.color into seat
  from (values (0,'w','w'),(0,'b','b'),(1,'w','b'),(1,'b','w')) s(board,color,side)
  where not exists (
    select 1 from jsonb_array_elements(r.members) m
    where coalesce((m->>'board')::integer,0)=s.board and m->>'team'=s.color
  ) and (
    (invite_side is not null and s.side=invite_side and (invitation.team is not null or s.board=0))
    or (invite_side is null and (
      select count(*) from unnest(reserved) pending where pending=s.side
    ) < (
      select 2-count(*) from jsonb_array_elements(r.members) m
      where (coalesce((m->>'board')::integer,0)=0 and m->>'team'=s.side)
         or (coalesce((m->>'board')::integer,0)=1 and m->>'team'<>s.side)
    ) and not (s.board=0 and s.color='b' and exists (
      select 1 from public.friend_game_invites i
      where i.room_id=p_room and i.team is null and i.status='pending' and i.created_at>now()-interval '1 day'
    )))
  )
  order by s.board,s.color desc limit 1;
  if not found then raise exception 'All remaining Bughouse seats are reserved.'; end if;
  r.members := r.members || jsonb_build_array(jsonb_build_object('id',p_actor,'team',seat.color,'board',seat.board));
  if invitation.id is not null then update public.friend_game_invites set status='accepted' where id=invitation.id; end if;
  update public.rooms set members=r.members,status=case when jsonb_array_length(r.members)=4 then 'playing' else 'waiting' end,
    revision=revision+1,updated_at=now()
  where id=p_room returning * into r;
  return r;
end $$;

revoke all on function public.create_bughouse_friend_game(uuid,uuid,uuid[],text,jsonb,jsonb),
  public.join_bughouse_room(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_bughouse_friend_game(uuid,uuid,uuid[],text,jsonb,jsonb),
  public.join_bughouse_room(uuid,uuid,uuid) to service_role;

create function public.bughouse_reserved_seats(p_room uuid) returns integer
language sql stable security definer set search_path=public as $$
  select count(*)::integer from public.friend_game_invites
  where room_id=p_room and status='pending' and created_at>now()-interval '1 day';
$$;
revoke all on function public.bughouse_reserved_seats(uuid) from public,anon;
grant execute on function public.bughouse_reserved_seats(uuid) to authenticated;

create or replace view public.room_lobby with(security_invoker=true) as
 select id,name,mode,variant,status,
 jsonb_array_length(members) + case when variant='bughouse' then public.bughouse_reserved_seats(id) else 0 end as member_count,
 updated_at,coalesce((settings->>'timeControlSeconds')::integer,0) as time_control,
 coalesce((settings->>'incrementSeconds')::integer,0) as increment_seconds
 from public.rooms where status not in ('finished','cancelled') and (variant='bughouse' or not(settings ? 'invitedFriend'));
