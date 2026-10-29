-- Sign-up now asks for a mobile number. Copy it (and the name) from the Auth
-- user metadata into the profile. Only a plausible number is stored.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9+]', '', 'g'), '');
begin
  if v_phone is not null and v_phone !~ '^\+?[0-9]{10,13}$' then
    v_phone := null;
  end if;
  insert into public.profiles (id, email, display_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    v_phone
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
