-- Separate public display names from generated unique account handles.
alter table public.profiles add column screen_name text not null default ''
 check(screen_name='' or (char_length(screen_name) between 2 and 32 and screen_name=trim(screen_name) and screen_name !~* '^player_'));
grant update(screen_name) on public.profiles to authenticated;
update public.profiles p set screen_name=case
 when trim(p.username) !~* '^player_' and char_length(trim(p.username)) between 2 and 32 then trim(p.username)
 when char_length(trim(coalesce(u.raw_user_meta_data->>'screen_name',''))) between 2 and 32
  and trim(u.raw_user_meta_data->>'screen_name') !~* '^player_' then trim(u.raw_user_meta_data->>'screen_name')
 else '' end from auth.users u where u.id=p.id;
create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$
declare chosen text:=trim(coalesce(new.raw_user_meta_data->>'screen_name',''));
begin
 if char_length(chosen) not between 2 and 32 or chosen ~* '^player_' then chosen:=''; end if;
 insert into public.profiles(id,username,screen_name) values(new.id,'player_'||substr(replace(new.id::text,'-',''),1,16),chosen);
 return new;
end $$;
create or replace view public.rankings with(security_invoker=true) as
 select id,username,country,avatar,rating,wins,losses,draws,
 rank()over(order by rating desc)as global_rank,
 rank()over(partition by country order by rating desc)as country_rank,
 round(100.0*(1-percent_rank()over(order by rating desc))::numeric,1)as global_percentile,
 round(100.0*(1-percent_rank()over(partition by country order by rating desc))::numeric,1)as country_percentile,
 screen_name from public.profiles where wins+losses+draws>=5 and not banned;
create or replace function public.admin_accounts(p_query text default '',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;needle text:=left(trim(coalesce(p_query,'')),100);
begin
 if not public.is_site_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 select jsonb_build_object(
 'total',(select count(*) from auth.users u left join public.profiles p on p.id=u.id where coalesce(u.email,'') ilike '%'||needle||'%' or coalesce(p.username,'') ilike '%'||needle||'%' or coalesce(p.screen_name,'') ilike '%'||needle||'%'),
 'users',coalesce((select jsonb_agg(row_to_json(account)) from (
  select u.id,p.username,p.screen_name,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
   coalesce(u.raw_app_meta_data->>'provider','email') as provider
  from auth.users u left join public.profiles p on p.id=u.id
  where coalesce(u.email,'') ilike '%'||needle||'%' or coalesce(p.username,'') ilike '%'||needle||'%' or coalesce(p.screen_name,'') ilike '%'||needle||'%'
  order by u.created_at desc nulls last,u.id limit 50 offset greatest(0,least(coalesce(p_page,0),1000000))*50
 ) account),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_accounts(text,integer) from public,anon;
grant execute on function public.admin_accounts(text,integer) to authenticated;

-- Explicit per-account inspection, separate from the directory/list response.
create function public.admin_password_hash(p_user uuid) returns text
language plpgsql stable security definer set search_path=public as $$
declare password_hash text;
begin
 if not public.is_site_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 select encrypted_password into password_hash from auth.users where id=p_user;
 return nullif(password_hash,'');
end $$;
revoke all on function public.admin_password_hash(uuid) from public,anon;
grant execute on function public.admin_password_hash(uuid) to authenticated;
