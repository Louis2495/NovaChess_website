create or replace function public.create_friend_game(p_host uuid,p_friend uuid,p_mode text,p_variant text,p_name text,p_state jsonb,p_settings jsonb) returns public.rooms
language plpgsql security definer set search_path=public as $$
declare result public.rooms;
begin
 if p_host = p_friend or not public.active_online_account(p_host) or not public.active_online_account(p_friend) then
  raise exception 'Player unavailable.';
 end if;
 if p_variant='bughouse' then raise exception 'Play a Friend supports two-player games.';end if;
 insert into public.rooms(host,name,mode,variant,state,members,settings,status)
 values(p_host,p_name,case when p_mode='team' then 'team' else 'standard' end,p_variant,p_state,jsonb_build_array(jsonb_build_object('id',p_host,'team','w')),p_settings||jsonb_build_object('invitedFriend',p_friend),'waiting') returning * into result;
 insert into public.friend_game_invites(room_id,sender,recipient)values(result.id,p_host,p_friend);
 return result;
end $$;
