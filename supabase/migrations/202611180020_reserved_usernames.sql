create table public.reserved_usernames (
  name_key text primary key,
  name text not null,
  reserved_by uuid not null references public.profiles(id) on delete cascade
);
alter table public.reserved_usernames enable row level security;
revoke all on public.reserved_usernames from public, anon, authenticated;

create function public.admin_reserved_usernames(p_name text default null, p_release boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  chosen text := btrim(p_name);
  normalized text := lower(chosen);
begin
  if actor is null or not public.is_site_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_name is not null then
    if char_length(chosen) not between 2 and 32 or chosen ~* '^player_' then
      raise exception 'Enter a username with 2–32 characters.';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(normalized, 1020));
    if p_release then
      delete from public.reserved_usernames where name_key = normalized;
    else
      if exists (select 1 from public.reserved_usernames where name_key = normalized and reserved_by <> actor) then
        raise exception 'Another administrator already reserved that username.';
      end if;
      if exists (select 1 from public.profiles where id <> actor
        and (lower(btrim(screen_name)) = normalized or lower(btrim(username)) = normalized)) then
        raise exception 'Another account is already using that username.';
      end if;
      insert into public.reserved_usernames(name_key, name, reserved_by)
      values(normalized, chosen, actor) on conflict (name_key) do nothing;
    end if;
  end if;
  return (select coalesce(jsonb_agg(name order by name_key), '[]'::jsonb) from public.reserved_usernames);
end;
$$;

create function public.username_is_reserved(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reserved_usernames
    where name_key = lower(btrim(p_name)) and reserved_by is distinct from auth.uid()
  );
$$;

create function public.enforce_reserved_username() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  candidate text;
begin
  for candidate in
    select distinct lower(btrim(name)) from unnest(array[new.screen_name, new.username]) names(name)
    where btrim(name) <> '' and name !~* '^player_' order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended(candidate, 1020));
    if exists (select 1 from public.reserved_usernames where name_key = candidate and reserved_by <> new.id) then
      raise exception 'That username is reserved. Choose a different name.' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
create trigger enforce_reserved_username before insert or update of screen_name, username on public.profiles
for each row execute function public.enforce_reserved_username();

revoke all on function public.admin_reserved_usernames(text, boolean),
  public.username_is_reserved(text), public.enforce_reserved_username() from public, anon, authenticated;
grant execute on function public.admin_reserved_usernames(text, boolean) to authenticated;
grant execute on function public.username_is_reserved(text) to anon, authenticated;
