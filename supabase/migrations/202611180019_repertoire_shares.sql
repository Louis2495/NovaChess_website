create table public.repertoire_shares (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  pgn text not null check (octet_length(pgn) between 1 and 100000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
create index repertoire_shares_inbox on public.repertoire_shares(recipient, created_at, id)
  where status = 'pending';
alter table public.repertoire_shares enable row level security;
revoke all on public.repertoire_shares from public, anon, authenticated;

create function public.send_repertoire_share(p_recipient uuid, p_pgn text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.active_online_account(actor) then
    raise exception 'Sign in to share with a friend.';
  end if;
  if p_recipient is null or not public.active_online_account(p_recipient) or not exists (
    select 1 from public.friendships where status = 'accepted' and (
      (sender = actor and recipient = p_recipient) or (recipient = actor and sender = p_recipient)
    )
  ) then
    raise exception 'Choose someone from your friends list.';
  end if;
  if p_pgn is null or octet_length(p_pgn) > 100000 or btrim(p_pgn) = '' then
    raise exception 'Select a smaller group of lines to share.';
  end if;
  insert into public.repertoire_shares (sender, recipient, pgn)
  values (actor, p_recipient, p_pgn);
end;
$$;

create function public.repertoire_share_inbox() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(inbox) order by inbox.created_at, inbox.id), '[]'::jsonb)
  from (
    select s.id, s.pgn, s.created_at, p.username, p.screen_name
    from public.repertoire_shares s
    join public.profiles p on p.id = s.sender
    where s.recipient = auth.uid() and s.status = 'pending'
      and public.active_online_account(s.recipient)
    order by s.created_at, s.id
    limit 20
  ) inbox;
$$;

create function public.respond_repertoire_share(p_share uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_accept is null then raise exception 'Choose Accept or Reject.'; end if;
  update public.repertoire_shares
  set status = case when p_accept then 'accepted' else 'rejected' end
  where id = p_share and recipient = auth.uid() and status = 'pending'
    and public.active_online_account(recipient);
  if not found then
    if exists (
      select 1 from public.repertoire_shares
      where id = p_share and recipient = auth.uid() and public.active_online_account(recipient)
        and status = case when p_accept then 'accepted' else 'rejected' end
    ) then return; end if;
    raise exception 'This share is no longer available.';
  end if;
end;
$$;

revoke all on function public.send_repertoire_share(uuid, text),
  public.repertoire_share_inbox(), public.respond_repertoire_share(uuid, boolean) from public, anon;
grant execute on function public.send_repertoire_share(uuid, text),
  public.repertoire_share_inbox(), public.respond_repertoire_share(uuid, boolean) to authenticated;
