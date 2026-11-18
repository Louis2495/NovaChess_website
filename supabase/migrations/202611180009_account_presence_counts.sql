create function public.admin_presence_counts() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_site_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'online',count(*) filter(where a.seen_at > now()-interval '150 seconds'),
  'offline',count(*) filter(where a.seen_at is null or a.seen_at <= now()-interval '150 seconds')
 ) from auth.users u left join public.account_activity a on a.user_id=u.id);
end $$;
revoke all on function public.admin_presence_counts() from public,anon;
grant execute on function public.admin_presence_counts() to authenticated;
