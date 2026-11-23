create table public.global_chat_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true
);
insert into public.global_chat_settings default values;
alter table public.global_chat_settings enable row level security;
revoke all on public.global_chat_settings from public, anon, authenticated;

create function public.global_chat_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select enabled from public.global_chat_settings where singleton;
$$;

create function public.set_global_chat_enabled(p_enabled boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_site_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  update public.global_chat_settings set enabled = p_enabled where singleton;
  return p_enabled;
end;
$$;

create function public.guard_global_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.global_chat_enabled() then
    raise exception 'Global chat is turned off.';
  end if;
  return new;
end;
$$;

create trigger guard_global_chat_message before insert on public.messages
for each row execute function public.guard_global_chat_message();
alter policy message_read on public.messages using (public.global_chat_enabled());

revoke all on function public.global_chat_enabled(), public.set_global_chat_enabled(boolean),
  public.guard_global_chat_message() from public, anon, authenticated;
grant execute on function public.global_chat_enabled() to anon, authenticated;
grant execute on function public.set_global_chat_enabled(boolean) to authenticated;
