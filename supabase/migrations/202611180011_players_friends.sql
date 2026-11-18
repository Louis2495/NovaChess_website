create table public.friendships (
 sender uuid not null references public.profiles(id) on delete cascade,
 recipient uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted')),
 created_at timestamptz not null default now(),
 primary key(sender,recipient),check(sender<>recipient)
);
create unique index friendships_pair on public.friendships(least(sender,recipient),greatest(sender,recipient));
alter table public.friendships enable row level security;
revoke all on public.friendships from public,anon,authenticated;
grant all on public.friendships to service_role;
create function public.friend_action(p_player uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();link public.friendships;
begin
 if actor is null or not public.active_online_account(actor) then raise exception 'Sign in to manage friends.';end if;
 if actor=p_player or not public.active_online_account(p_player) then raise exception 'Player unavailable.';end if;
 perform pg_advisory_xact_lock(hashtext(least(actor,p_player)::text||greatest(actor,p_player)::text));
 select * into link from public.friendships where (sender=actor and recipient=p_player) or (sender=p_player and recipient=actor);
 if p_action='send' then
  if link.sender is not null then raise exception 'A friendship or request already exists.';end if;
  insert into public.friendships(sender,recipient)values(actor,p_player);
 elsif p_action='accept' then
  if link.recipient is distinct from actor or link.status<>'pending' then raise exception 'No incoming request.';end if;
  update public.friendships set status='accepted' where sender=p_player and recipient=actor;
 elsif p_action='remove' then
  delete from public.friendships where (sender=actor and recipient=p_player) or (sender=p_player and recipient=actor);
 else raise exception 'Unknown friend action.';end if;
end $$;
revoke all on function public.friend_action(uuid,text) from public,anon;
grant execute on function public.friend_action(uuid,text) to authenticated;
create function public.player_directory(p_query text default '',p_section text default 'everyone',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.active_online_account(auth.uid()) then raise exception 'Sign in to find players.';end if;
 return (select coalesce(jsonb_agg(row_to_json(player)),'[]'::jsonb) from (
 select p.id,p.username,p.screen_name,p.country,p.rating,
 coalesce(a.seen_at>now()-interval '150 seconds',false) as online,
 case when f.status='accepted' then 'friends' when f.recipient=auth.uid() then 'incoming' when f.sender=auth.uid() then 'outgoing' else 'none' end as relationship
 from public.profiles p
 left join public.friendships f on (f.sender=auth.uid() and f.recipient=p.id) or (f.recipient=auth.uid() and f.sender=p.id)
 left join public.account_activity a on a.user_id=p.id
 where p.id<>auth.uid() and public.active_online_account(p.id)
 and (coalesce(p.screen_name,'') ilike '%'||left(trim(coalesce(p_query,'')),100)||'%' or p.username ilike '%'||left(trim(coalesce(p_query,'')),100)||'%')
 and (p_section='everyone' or (p_section='friends' and f.status='accepted') or (p_section='requests' and f.status='pending' and f.recipient=auth.uid()))
 order by coalesce(a.seen_at>now()-interval '150 seconds',false) desc,p.rating desc,p.id
 limit 50 offset greatest(0,least(coalesce(p_page,0),1000000))*50
 )player);
end $$;
revoke all on function public.player_directory(text,text,integer) from public,anon;
grant execute on function public.player_directory(text,text,integer) to authenticated;
create table public.friend_game_invites (
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.rooms(id) on delete cascade,
 sender uuid not null references public.profiles(id),recipient uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in('pending','accepted','declined')),created_at timestamptz not null default now()
);
alter table public.friend_game_invites enable row level security;
revoke all on public.friend_game_invites from public,anon,authenticated;
grant all on public.friend_game_invites to service_role;
create function public.create_friend_game(p_host uuid,p_friend uuid,p_mode text,p_variant text,p_name text,p_state jsonb,p_settings jsonb) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare result public.rooms;
begin
 if not public.active_online_account(p_host) or not public.active_online_account(p_friend) or not exists(select 1 from public.friendships where status='accepted' and ((sender=p_host and recipient=p_friend)or(sender=p_friend and recipient=p_host))) then raise exception 'Choose someone from your friends list.';end if;
 if p_variant='bughouse' then raise exception 'Play a Friend supports two-player games.';end if;
 insert into public.rooms(host,name,mode,variant,state,members,settings,status)
 values(p_host,p_name,case when p_mode='team' then 'team' else 'standard' end,p_variant,p_state,jsonb_build_array(jsonb_build_object('id',p_host,'team','w')),p_settings||jsonb_build_object('invitedFriend',p_friend),'waiting') returning * into result;
 insert into public.friend_game_invites(room_id,sender,recipient)values(result.id,p_host,p_friend);
 return result;
end $$;
revoke all on function public.create_friend_game(uuid,uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_friend_game(uuid,uuid,text,text,text,jsonb,jsonb) to service_role;
create function public.friend_game_invitations() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.';end if;
 return(select coalesce(jsonb_agg(row_to_json(invite)),'[]'::jsonb) from(
 select i.id,i.room_id,i.created_at,p.username,p.screen_name,r.variant,r.name,coalesce((r.settings->>'timeControlSeconds')::integer,0) as time_control
 from public.friend_game_invites i join public.rooms r on r.id=i.room_id join public.profiles p on p.id=i.sender
 where i.recipient=auth.uid() and i.status='pending' and i.created_at>now()-interval '1 day' and r.status='waiting'
 order by i.created_at desc limit 10)invite);
end $$;
revoke all on function public.friend_game_invitations() from public,anon;
grant execute on function public.friend_game_invitations() to authenticated;
create function public.respond_friend_game(p_invite uuid,p_accept boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.';end if;
 update public.friend_game_invites set status=case when p_accept then 'accepted' else 'declined' end where id=p_invite and recipient=auth.uid() and status='pending';
end $$;
revoke all on function public.respond_friend_game(uuid,boolean) from public,anon;
grant execute on function public.respond_friend_game(uuid,boolean) to authenticated;
create or replace view public.room_lobby with(security_invoker=true) as
 select id,name,mode,variant,status,jsonb_array_length(members) as member_count,updated_at,
 coalesce((settings->>'timeControlSeconds')::integer,0) as time_control,
 coalesce((settings->>'incrementSeconds')::integer,0) as increment_seconds
 from public.rooms where status<>'finished' and not(settings ? 'invitedFriend');
