create function public.throne_stats(p_since timestamptz) returns jsonb
language sql stable set search_path=public as $$
 select jsonb_build_object(
   'timeMs', coalesce((
     select sum(greatest(0, extract(epoch from
       (coalesce(ended_at, now()) - greatest(started_at, p_since))) * 1000))
     from public.throne_reigns where user_id=auth.uid()
       and coalesce(ended_at, now()) > p_since
   ), 0)::bigint,
   'games', (
     select count(*) from public.throne_results
     where auth.uid() in (white, black) and completed_at >= p_since
   )
 )
$$;
revoke all on function public.throne_stats(timestamptz) from public,anon;
grant execute on function public.throne_stats(timestamptz) to authenticated;
