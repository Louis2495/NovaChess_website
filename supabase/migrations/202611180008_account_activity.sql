-- Track recent authenticated activity; only administrators may read it.
create table public.account_activity (
 user_id uuid primary key references auth.users(id) on delete cascade,
 seen_at timestamptz not null default now()
);
alter table public.account_activity enable row level security;
revoke all on public.account_activity from public,anon,authenticated;
grant all on public.account_activity to service_role;
create function public.account_heartbeat() returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
 insert into public.account_activity(user_id,seen_at) values(auth.uid(),now())
 on conflict(user_id) do update set seen_at=excluded.seen_at;
end $$;
revoke all on function public.account_heartbeat() from public,anon;
grant execute on function public.account_heartbeat() to authenticated;
create function public.admin_online_accounts(p_users uuid[]) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_site_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(user_id),'[]'::jsonb) from public.account_activity
 where user_id=any(p_users) and seen_at > now()-interval '150 seconds');
end $$;
revoke all on function public.admin_online_accounts(uuid[]) from public,anon;
grant execute on function public.admin_online_accounts(uuid[]) to authenticated;
