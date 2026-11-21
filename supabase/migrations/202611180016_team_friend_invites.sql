alter table public.friend_game_invites add column team text check (team in ('w', 'b'));
create unique index team_invite_recipient on public.friend_game_invites(room_id, recipient) where team is not null;

create function public.invite_team_friends(p_room uuid, p_actor uuid, p_friends uuid[]) returns integer
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
  side text;
  recipients uuid[];
  occupied integer;
begin
  select * into r from public.rooms where id=p_room for update;
  select member->>'team' into side from jsonb_array_elements(r.members) member where member->>'id'=p_actor::text;
  if side is null or r.mode <> 'team' or r.status not in ('waiting','playing')
     or not public.active_online_account(p_actor) then
    raise exception 'Join an active team before inviting friends.';
  end if;

  select array(select distinct person from unnest(p_friends) person) into recipients;
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

  select count(*) into occupied from jsonb_array_elements(r.members) m where m->>'team'=side;
  occupied := occupied + (
    select count(*) from public.friend_game_invites
    where room_id=p_room and team=side and status='pending' and created_at>now()-interval '1 day'
  );
  if occupied + cardinality(recipients) > 6 then
    raise exception 'Your team can have up to six players, including pending teammates.';
  end if;

  insert into public.friend_game_invites(room_id,sender,recipient,team)
  select p_room,p_actor,person,side from unnest(recipients) person
  on conflict (room_id,recipient) where team is not null
  do update set sender=excluded.sender, team=excluded.team, status='pending', created_at=now();
  return cardinality(recipients);
end $$;

create function public.create_team_friend_game(
  p_host uuid, p_opponent uuid, p_friends uuid[], p_variant text, p_name text, p_state jsonb, p_settings jsonb
) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
begin
  if p_opponent is not null then
    r := public.create_friend_game(p_host,p_opponent,'team',p_variant,p_name,p_state,p_settings);
  else
    insert into public.rooms(host,name,mode,variant,state,members,settings,status)
    values(p_host,p_name,'team',p_variant,p_state,jsonb_build_array(jsonb_build_object('id',p_host,'team','w')),
      p_settings,case when p_settings->>'bot'='true' then 'playing' else 'waiting' end)
    returning * into r;
  end if;
  if cardinality(p_friends)>0 then
    perform public.invite_team_friends(r.id,p_host,p_friends);
  end if;
  return r;
end $$;

create function public.join_team_room(p_room uuid, p_actor uuid, p_team text, p_invite uuid) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare
  r public.rooms;
  invitation public.friend_game_invites;
  side text;
  white_slots integer;
  black_slots integer;
begin
  select * into r from public.rooms where id=p_room for update;
  if r.id is null or r.mode <> 'team' or not public.active_online_account(p_actor) then
    raise exception 'Team game unavailable.';
  end if;
  if exists(select 1 from jsonb_array_elements(r.members) m where m->>'id'=p_actor::text) then
    return r;
  end if;
  if r.status not in ('waiting','playing') then raise exception 'Team game has ended.'; end if;
  select * into invitation from public.friend_game_invites
  where room_id=p_room and recipient=p_actor and status='pending' and created_at>now()-interval '1 day'
    and (p_invite is null or id=p_invite)
  order by created_at desc limit 1 for update;
  if p_invite is not null and invitation.id is null then raise exception 'This invitation is no longer available.'; end if;
  if invitation.team is not null then
    side := invitation.team;
  elsif r.settings->>'invitedFriend'=p_actor::text then
    side := 'b';
  elsif r.settings ? 'invitedFriend' then
    raise exception 'This game is reserved for invited players.';
  end if;

  select count(*) filter (where m->>'team'='w'),count(*) filter (where m->>'team'='b')
  into white_slots,black_slots from jsonb_array_elements(r.members) m;
  if side is null then
    white_slots := white_slots + (select count(*) from public.friend_game_invites where room_id=p_room and team='w' and status='pending' and created_at>now()-interval '1 day');
    black_slots := black_slots + (select count(*) from public.friend_game_invites where room_id=p_room and team='b' and status='pending' and created_at>now()-interval '1 day');
    side := case
      when r.settings->>'bot'='true' then 'w'
      when p_team in ('w','b') then p_team
      when white_slots <= black_slots and white_slots < 6 then 'w'
      else 'b' end;
  end if;
  if (side='w' and white_slots>=6) or (side='b' and black_slots>=6) then
    raise exception 'This team is full.';
  end if;
  r.members := r.members || jsonb_build_array(jsonb_build_object('id',p_actor,'team',side));
  if side='b' or black_slots>0 or r.settings->>'bot'='true' then r.status := 'playing'; end if;
  if invitation.id is not null then update public.friend_game_invites set status='accepted' where id=invitation.id; end if;

  update public.rooms set members=r.members,status=r.status,revision=revision+1,updated_at=now()
  where id=p_room returning * into r;
  return r;
end $$;

revoke all on function public.invite_team_friends(uuid,uuid,uuid[]),
  public.create_team_friend_game(uuid,uuid,uuid[],text,text,jsonb,jsonb),
  public.join_team_room(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.invite_team_friends(uuid,uuid,uuid[]),
  public.create_team_friend_game(uuid,uuid,uuid[],text,text,jsonb,jsonb),
  public.join_team_room(uuid,uuid,text,uuid) to service_role;

create or replace function public.friend_game_invitations() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.'; end if;
 return(select coalesce(jsonb_agg(row_to_json(invite)),'[]'::jsonb) from(
  select i.id,i.room_id,i.created_at,i.team,p.username,p.screen_name,r.mode,r.variant,r.name,
    coalesce((r.settings->>'timeControlSeconds')::integer,0) as time_control
  from public.friend_game_invites i join public.rooms r on r.id=i.room_id join public.profiles p on p.id=i.sender
  where i.recipient=auth.uid() and i.status='pending' and i.created_at>now()-interval '1 day'
    and (r.status='waiting' or (i.team is not null and r.status='playing'))
  order by i.created_at desc limit 10) invite);
end $$;
