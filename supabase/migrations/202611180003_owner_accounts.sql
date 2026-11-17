-- Pin the owner's existing verified identity. No client can create administrator grants.
create table public.site_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from public,anon,authenticated;
grant all on public.site_admins to service_role;
insert into public.site_admins(user_id)
select id from auth.users where lower(email)='louisanderson477@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

create function public.is_site_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.site_admins a join auth.users u on u.id=a.user_id
 join public.profiles p on p.id=u.id where a.user_id=auth.uid()
 and lower(u.email)='louisanderson477@gmail.com' and u.email_confirmed_at is not null and not p.banned)
$$;
revoke all on function public.is_site_admin() from public,anon;
grant execute on function public.is_site_admin() to authenticated;

create function public.admin_accounts(p_query text default '',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;needle text:=left(trim(coalesce(p_query,'')),100);
begin
 if not public.is_site_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 select jsonb_build_object(
 'total',(select count(*) from auth.users u left join public.profiles p on p.id=u.id where coalesce(u.email,'') ilike '%'||needle||'%' or coalesce(p.username,'') ilike '%'||needle||'%'),
 'users',coalesce((select jsonb_agg(row_to_json(account)) from (
  select u.id,p.username,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
   coalesce(u.raw_app_meta_data->>'provider','email') as provider
  from auth.users u left join public.profiles p on p.id=u.id
  where coalesce(u.email,'') ilike '%'||needle||'%' or coalesce(p.username,'') ilike '%'||needle||'%'
  order by u.created_at desc nulls last,u.id limit 50 offset greatest(0,least(coalesce(p_page,0),1000000))*50
 ) account),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_accounts(text,integer) from public,anon;
grant execute on function public.admin_accounts(text,integer) to authenticated;
