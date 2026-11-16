-- Apply after 202611160001_online.sql. Assign moderators only from the SQL editor.
create table public.chat_moderators(user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.chat_moderators enable row level security;
create policy moderator_self on public.chat_moderators for select to authenticated using(user_id=auth.uid());
grant select on public.chat_moderators to authenticated;
create function public.is_chat_moderator() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from chat_moderators where user_id=auth.uid()) $$;
revoke all on function public.is_chat_moderator() from public,anon;
grant execute on function public.is_chat_moderator() to authenticated;
create policy moderator_report_read on public.reports for select to authenticated using(public.is_chat_moderator());
grant select on public.reports to authenticated;
create table public.chat_moderation_log(id bigint generated always as identity primary key,moderator uuid not null references profiles(id),target_user uuid not null references profiles(id),message_id bigint not null,action text not null check(action in('delete','ban')),created_at timestamptz not null default now());
alter table public.chat_moderation_log enable row level security;
create policy moderation_log_read on public.chat_moderation_log for select to authenticated using(public.is_chat_moderator());
grant select on public.chat_moderation_log to authenticated;
create function public.moderate_chat(p_message_id bigint,p_ban boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_chat_moderator() or exists(select 1 from profiles where id=auth.uid() and banned) then raise exception 'Moderator access required.'; end if;
 select user_id into target from messages where id=p_message_id for update;
 if target is null then raise exception 'Message no longer exists.';end if;
 if p_ban then update profiles set banned=true where id=target;end if;
 insert into chat_moderation_log(moderator,target_user,message_id,action) values(auth.uid(),target,p_message_id,case when p_ban then 'ban' else 'delete' end);
 delete from messages where id=p_message_id;
end $$;
revoke all on function public.moderate_chat(bigint,boolean) from public,anon;
grant execute on function public.moderate_chat(bigint,boolean) to authenticated;
create or replace function public.post_message(p_body text) returns void language plpgsql security definer set search_path=public as $$
declare n int;clean text:=trim(p_body);
begin
 if auth.uid() is null or exists(select 1 from profiles where id=auth.uid() and banned)then raise exception 'Sign in to chat.';end if;
 if char_length(clean) not between 1 and 600 then raise exception 'Messages must contain 1–600 characters.';end if;
 perform 1 from profiles where id=auth.uid() for update;
 select count(*) into n from messages where user_id=auth.uid() and created_at>now()-interval '10 seconds';
 if n>=4 then raise exception 'Please wait before sending another message.';end if;
 if exists(select 1 from messages where user_id=auth.uid() and body=clean and created_at>now()-interval '1 minute') then raise exception 'Please avoid repeating the same message.';end if;
 if (select count(*) from regexp_matches(clean,'https?://','gi'))>2 then raise exception 'Please limit links in chat.';end if;
 insert into messages(user_id,body) values(auth.uid(),clean);
end $$;
