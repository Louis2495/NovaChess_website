create table public.site_page_daily (
  day date not null,
  session_id uuid not null,
  page text not null,
  views smallint not null default 1,
  primary key (day, session_id, page)
);
alter table public.site_page_daily enable row level security;
revoke all on public.site_page_daily from public, anon, authenticated;

create function public.record_site_page(p_session uuid, p_page text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session is null or p_page is null or p_page not in (
    'home','play','variants','analysis','puzzles','learn','research','library','stats','players','rankings','profile','signin','controls','community'
  ) then
    return;
  end if;

  insert into public.site_page_daily as traffic(day, session_id, page)
  values ((now() at time zone 'UTC')::date, p_session, p_page)
  on conflict (day, session_id, page) do update set views = traffic.views + 1
  where traffic.views < 100;
end;
$$;
revoke all on function public.record_site_page(uuid, text) from public;
grant execute on function public.record_site_page(uuid, text) to anon, authenticated;

create function public.owner_site_analytics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  last_day date := (now() at time zone 'UTC')::date;
  first_day date := last_day - (least(90, greatest(1, coalesce(p_days, 30))) - 1);
begin
  if not public.is_site_owner() then
    raise exception 'Only the site owner can view website analytics.' using errcode = '42501';
  end if;

  return (
    with traffic as (
      select * from public.site_page_daily where day between first_day and last_day
    ), daily_traffic as (
      select day, sum(views) views, count(distinct session_id) sessions from traffic group by day
    ), signups as (
      select (created_at at time zone 'UTC')::date as day, count(*) as total
      from auth.users where created_at >= (first_day::timestamp at time zone 'UTC') group by 1
    ), rated as (
      select (created_at at time zone 'UTC')::date as day, count(*) as total
      from public.rated_games where created_at >= (first_day::timestamp at time zone 'UTC') group by 1
    ), days as (
      select first_day + offset_day as day from generate_series(0, last_day - first_day) as series(offset_day)
    )
    select jsonb_build_object(
      'views', (select coalesce(sum(views), 0) from traffic),
      'sessions', (select count(distinct session_id) from traffic),
      'accounts', (select count(*) from auth.users),
      'days', (select jsonb_agg(jsonb_build_object('day', days.day, 'views', coalesce(t.views,0),
        'sessions', coalesce(t.sessions,0), 'signups', coalesce(s.total,0), 'ratedGames', coalesce(r.total,0)) order by days.day)
        from days left join daily_traffic t using (day) left join signups s using (day) left join rated r using (day)),
      'pages', (select coalesce(jsonb_agg(to_jsonb(top_pages) order by views desc, page), '[]'::jsonb)
        from (select page, sum(views) views from traffic group by page) top_pages)
    )
  );
end;
$$;
revoke all on function public.owner_site_analytics(integer) from public, anon, authenticated;
grant execute on function public.owner_site_analytics(integer) to authenticated;

select cron.schedule('matein4-site-analytics-retention', '55 3 * * *',
  $$delete from public.site_page_daily where day < (now() at time zone 'UTC')::date - 89$$);
