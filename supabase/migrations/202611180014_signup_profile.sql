-- Carry email sign-up choices into the public profile, including accounts that
-- must confirm their email before they get a session.
create or replace function public.new_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  chosen text := trim(coalesce(new.raw_user_meta_data->>'screen_name', ''));
  country_code text := upper(trim(coalesce(new.raw_user_meta_data->>'country', '')));
  photo text := coalesce(new.raw_user_meta_data->>'avatar', '');
begin
  if char_length(chosen) not between 2 and 32 or chosen ~* '^player_' then
    chosen := '';
  end if;
  if country_code !~ '^[A-Z]{2}$' then
    country_code := '';
  end if;
  if char_length(photo) >= 150000 or photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$' then
    photo := '';
  end if;

  insert into public.profiles(id, username, screen_name, country, avatar)
  values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 16), chosen, country_code, photo);
  return new;
end $$;
