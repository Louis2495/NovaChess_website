alter table public.site_analytics_filter alter column enabled set default true;

update public.site_analytics_filter set enabled = true where singleton;
