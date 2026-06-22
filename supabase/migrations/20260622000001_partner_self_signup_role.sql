-- Partner / barber self-signup: honor the role chosen at signup time.
--
-- Root cause of "partner account redirects to client page":
-- handle_new_user() hardcoded role='customer' for every new auth user. The mobile
-- app then updated the row to 'shop_owner' client-side, but the auth state-change
-- listener could read the row during the brief 'customer' window and route the
-- partner into the customer tabs. Assigning the correct role inside the trigger
-- (security definer, runs synchronously, bypasses RLS) removes that window entirely.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  -- Never allow self-assigning 'admin' (or any unknown value) at signup.
  if requested_role not in ('customer', 'barber', 'shop_owner') then
    requested_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, role, email, phone, status, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    requested_role,
    new.email,
    new.phone,
    'active',
    false
  )
  on conflict (id) do update
    set role  = case
                  when public.profiles.role = 'admin' then public.profiles.role  -- protect admins
                  else excluded.role
                end,
        email = coalesce(public.profiles.email, excluded.email),
        phone = coalesce(public.profiles.phone, excluded.phone);

  return new;
end;
$$;

-- Ensure the trigger is attached (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
