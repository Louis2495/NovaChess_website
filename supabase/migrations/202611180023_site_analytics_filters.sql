alter table public.site_page_daily add column account_id uuid references auth.users(id) on delete set null;
create index site_page_daily_account_idx on public.site_page_daily(account_id, session_id)
  where account_id is not null;

create table public.site_analytics_filter (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.site_analytics_filter default values;
create table public.site_analytics_exclusions (
  account_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.site_analytics_filter enable row level security;
alter table public.site_analytics_exclusions enable row level security;
revoke all on public.site_analytics_filter, public.site_analytics_exclusions from public, anon, authenticated;

create function public.set_owner_analytics_filter(
  p_enabled boolean default null, p_email text default null, p_remove boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if not public.is_site_owner() then
    raise exception 'Only the site owner can change analytics filters.' using errcode = '42501';
  end if;
  if p_enabled is not null then
    update public.site_analytics_filter set enabled = p_enabled where singleton;
  end if;
  if p_email is not null then
    select id into target from auth.users where lower(email) = lower(trim(p_email));
    if target is null then
      raise exception 'No account matches that email.';
    end if;
    if target = auth.uid() then
      raise exception 'Your owner account is already included in the filter.';
    end if;
    if p_remove then
      delete from public.site_analytics_exclusions where account_id = target;
    else
      insert into public.site_analytics_exclusions values (target) on conflict do nothing;
    end if;
  end if;
end;
$$;
revoke all on function public.set_owner_analytics_filter(boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.set_owner_analytics_filter(boolean, text, boolean) to authenticated;

create or replace function public.record_site_page(p_session uuid, p_page text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session is null or p_page is null or p_page not in (
    'home','play','variants','analysis','puzzles','learn','research','library','stats','players','rankings','profile','signin','controls','community'
  ) then
    return;
  end if;

  insert into public.site_page_daily as traffic(day, session_id, page, account_id)
  values ((now() at time zone 'UTC')::date, p_session, p_page, auth.uid())
  on conflict (day, session_id, page) do update set
    views = least(traffic.views + 1, 100),
    account_id = coalesce(traffic.account_id, excluded.account_id)
  where traffic.views < 100 or (traffic.account_id is null and excluded.account_id is not null);
end;
$$;

create or replace function public.owner_site_analytics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  last_day date := (now() at time zone 'UTC')::date;
  first_day date := last_day - (least(90, greatest(1, coalesce(p_days, 30))) - 1);
begin
  if not public.is_site_owner() then
    raise exception 'Only the site owner can view website analytics.' using errcode = '42501';
  end if;

  return (
    with excluded_accounts as (
      select auth.uid() as id where (select enabled from public.site_analytics_filter)
      union
      select account_id from public.site_analytics_exclusions
      where (select enabled from public.site_analytics_filter)
    ), excluded_sessions as (
      select distinct session_id from public.site_page_daily
      where account_id in (select id from excluded_accounts)
    ), traffic as (
      select * from public.site_page_daily
      where day between first_day and last_day
        and not exists (select 1 from excluded_sessions s where s.session_id = site_page_daily.session_id)
    ), daily_traffic as (
      select day, sum(views) views, count(distinct session_id) sessions from traffic group by day
    ), signups as (
      select (created_at at time zone 'UTC')::date as day, count(*) as total
      from auth.users where created_at >= (first_day::timestamp at time zone 'UTC')
        and id not in (select id from excluded_accounts) group by 1
    ), rated as (
      select (created_at at time zone 'UTC')::date as day, count(*) as total
      from public.rated_games where created_at >= (first_day::timestamp at time zone 'UTC')
        and white not in (select id from excluded_accounts)
        and black not in (select id from excluded_accounts) group by 1
    ), days as (
      select first_day + offset_day as day from generate_series(0, last_day - first_day) as series(offset_day)
    )
    select jsonb_build_object(
      'views', (select coalesce(sum(views), 0) from traffic),
      'sessions', (select count(distinct session_id) from traffic),
      'accounts', (select count(*) from auth.users where id not in (select id from excluded_accounts)),
      'filters', jsonb_build_object(
        'enabled', (select enabled from public.site_analytics_filter),
        'emails', (select coalesce(jsonb_agg(u.email order by u.email), '[]'::jsonb)
          from public.site_analytics_exclusions e join auth.users u on u.id = e.account_id)
      ),
      'days', (select jsonb_agg(jsonb_build_object('day', days.day, 'views', coalesce(t.views,0),
        'sessions', coalesce(t.sessions,0), 'signups', coalesce(s.total,0), 'ratedGames', coalesce(r.total,0)) order by days.day)
        from days left join daily_traffic t using (day) left join signups s using (day) left join rated r using (day)),
      'pages', (select coalesce(jsonb_agg(to_jsonb(top_pages) order by views desc, page), '[]'::jsonb)
        from (select page, sum(views) views from traffic group by page) top_pages)
    )
  );
end;
$$;
