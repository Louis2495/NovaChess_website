create table public.opponent_activity (
  player_one uuid not null references public.profiles(id) on delete cascade,
  player_two uuid not null references public.profiles(id) on delete cascade,
  played_at timestamptz not null,
  primary key (player_one, player_two),
  check (player_one < player_two)
);
alter table public.opponent_activity enable row level security;
revoke all on public.opponent_activity from public, anon, authenticated;

create function public.opponent_pairs(p_members jsonb, p_variant text)
returns table (player_one uuid, player_two uuid)
language sql immutable set search_path = public as $$
  select distinct a.id, b.id
  from jsonb_to_recordset(p_members) as a(id uuid, team text, board int)
  join jsonb_to_recordset(p_members) as b(id uuid, team text, board int)
    on a.id < b.id
  where a.team in ('w', 'b') and b.team in ('w', 'b')
    -- Bughouse teammates play opposite colors on different boards.
    and (a.team = 'w') <> (
      (b.team = 'w') <> (p_variant = 'bughouse' and coalesce(a.board, 0) <> coalesce(b.board, 0))
    );
$$;
revoke all on function public.opponent_pairs(jsonb, text) from public, anon, authenticated;

-- Backfill from completed results and games still represented in room state.
-- Older room states only retain the last room update time.
insert into public.opponent_activity (player_one, player_two, played_at)
select player_one, player_two, max(played_at)
from (
  select least(white, black) as player_one, greatest(white, black) as player_two,
    created_at as played_at
  from public.rated_games where white <> black
  union all
  select least(white, black), greatest(white, black), completed_at
  from public.throne_results where white <> black
  union all
  select pair.player_one, pair.player_two, r.updated_at
  from public.rooms r
  cross join lateral public.opponent_pairs(r.members, r.variant) pair
  where jsonb_array_length(r.state->'moves') > 0
     or jsonb_array_length(r.state->'partner'->'moves') > 0
     or r.status = 'finished'
) history
group by player_one, player_two;

create function public.record_opponent_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.opponent_activity (player_one, player_two, played_at)
  select pair.player_one, pair.player_two, new.updated_at
  -- A finished Throne game can rotate the seats in the same update.
  from public.opponent_pairs(old.members, old.variant) pair
  order by pair.player_one, pair.player_two
  on conflict (player_one, player_two) do update
    set played_at = greatest(opponent_activity.played_at, excluded.played_at);
  return new;
end $$;
revoke all on function public.record_opponent_activity() from public, anon, authenticated;

create trigger record_opponent_activity after update of state on public.rooms
for each row when (
  coalesce(jsonb_array_length(new.state->'moves'), 0) > coalesce(jsonb_array_length(old.state->'moves'), 0)
  or coalesce(jsonb_array_length(new.state->'partner'->'moves'), 0) > coalesce(jsonb_array_length(old.state->'partner'->'moves'), 0)
  or (old.status = 'playing' and new.status = 'finished')
  or (new.state->'lastGame'->>'id') is distinct from (old.state->'lastGame'->>'id')
    and new.state->'lastGame'->>'id' is not null
) execute function public.record_opponent_activity();

create index friend_game_invites_pair_created on public.friend_game_invites
  (least(sender, recipient), greatest(sender, recipient), created_at desc);

create or replace function public.player_directory(p_query text default '', p_section text default 'everyone', p_page integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  name_query text := '%' || left(trim(coalesce(p_query, '')), 100) || '%';
begin
  if actor is null or not public.active_online_account(actor) then
    raise exception 'Sign in to find players.';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(player) - 'last_interaction' order by
      player.online desc, player.last_interaction desc nulls last, player.rating desc, player.id), '[]'::jsonb)
    from (
      select p.id, p.username, p.screen_name, p.country, p.rating,
        coalesce(a.seen_at > now() - interval '150 seconds', false) as online,
        case when f.status = 'accepted' then 'friends' when f.recipient = actor then 'incoming'
          when f.sender = actor then 'outgoing' else 'none' end as relationship,
        case when p_section = 'friends' then greatest(f.created_at, activity.played_at, (
          select i.created_at
          from public.friend_game_invites i
          where least(i.sender, i.recipient) = least(actor, p.id)
            and greatest(i.sender, i.recipient) = greatest(actor, p.id)
          order by i.created_at desc limit 1
        )) end as last_interaction
      from public.profiles p
      left join public.friendships f on least(f.sender, f.recipient) = least(actor, p.id)
        and greatest(f.sender, f.recipient) = greatest(actor, p.id)
      left join public.account_activity a on a.user_id = p.id
      left join public.opponent_activity activity on p_section = 'friends'
        and activity.player_one = least(actor, p.id) and activity.player_two = greatest(actor, p.id)
      where p.id <> actor and public.active_online_account(p.id)
        and (coalesce(p.screen_name, '') ilike name_query or p.username ilike name_query)
        and (p_section = 'everyone' or (p_section = 'friends' and f.status = 'accepted')
          or (p_section = 'requests' and f.status = 'pending' and f.recipient = actor))
      order by online desc, last_interaction desc nulls last, p.rating desc, p.id
      limit 50 offset greatest(0, least(coalesce(p_page, 0), 1000000)) * 50
    ) player
  );
end $$;
