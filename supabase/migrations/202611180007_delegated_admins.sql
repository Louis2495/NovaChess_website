-- Keep ownership pinned while allowing the owner to appoint administrators.
create table public.site_owners(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.site_owners enable row level security;
revoke all on public.site_owners from public,anon,authenticated;
grant all on public.site_owners to service_role;
insert into public.site_owners select a.user_id from public.site_admins a join auth.users u on u.id=a.user_id
where lower(u.email)='louisanderson477@gmail.com' and u.email_confirmed_at is not null;
create function public.is_site_owner() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.site_owners a join auth.users u on u.id=a.user_id join public.profiles p on p.id=u.id
 where a.user_id=auth.uid() and lower(u.email)='louisanderson477@gmail.com' and u.email_confirmed_at is not null
 and not p.banned and (u.banned_until is null or u.banned_until<=now()))
$$;
revoke all on function public.is_site_owner() from public,anon;
grant execute on function public.is_site_owner() to authenticated;
create or replace function public.is_site_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.site_admins a join auth.users u on u.id=a.user_id join public.profiles p on p.id=u.id
 where a.user_id=auth.uid() and u.email_confirmed_at is not null and not p.banned
 and (u.banned_until is null or u.banned_until<=now())
 and (not exists(select 1 from public.site_owners o where o.user_id=a.user_id) or lower(u.email)='louisanderson477@gmail.com'))
$$;
create function public.grant_site_admin(p_email text) returns jsonb language plpgsql security definer set search_path=public as $$
declare target uuid; display_name text; address text:=lower(trim(coalesce(p_email,'')));
begin
 if not public.is_site_owner() then raise exception 'Only the site owner can grant administrator access.' using errcode='42501'; end if;
 if address='' or char_length(address)>254 then raise exception 'Enter an account email.'; end if;
 select u.id,p.screen_name into target,display_name from auth.users u join public.profiles p on p.id=u.id
 where lower(u.email)=address and u.email_confirmed_at is not null and not p.banned and (u.banned_until is null or u.banned_until<=now());
 if target is null then raise exception 'No active, confirmed account found for that email.'; end if;
 insert into public.site_admins(user_id) values(target) on conflict do nothing;
 return jsonb_build_object('email',address,'screen_name',display_name);
end $$;
revoke all on function public.grant_site_admin(text) from public,anon;
grant execute on function public.grant_site_admin(text) to authenticated;
