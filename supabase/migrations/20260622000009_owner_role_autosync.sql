-- Self-service partners (no admin): role follows shop ownership.
-- The admin-controlled lock (prevent_profile_role_change) blocked partners from
-- becoming shop_owner, so they stayed 'customer' and landed on the client page.
-- Teach the lock ONE new rule: a profile that owns a shop may be set to
-- shop_owner/barber. Admin control over every other role change is preserved.

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if new.role is distinct from old.role then
    if jwt_role = 'service_role' then
      return new;
    end if;

    if old.role is null and new.role = 'customer' and old.id = auth.uid() then
      return new;
    end if;

    -- NEW: owning a shop makes you a shop owner — no admin approval needed
    if new.role in ('shop_owner', 'barber')
       and exists (select 1 from public.barbershops where owner_profile_id = new.id) then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'role_change_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

-- Backfill: every existing shop owner becomes shop_owner
update public.profiles
  set role = 'shop_owner'
  where id in (select distinct owner_profile_id from public.barbershops where owner_profile_id is not null)
    and coalesce(role, '') not in ('admin', 'shop_owner', 'barber');

-- On shop creation: promote the owner (now permitted by the rule above) + seed
create or replace function public.on_barbershop_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    update public.profiles
      set role = 'shop_owner'
      where id = NEW.owner_profile_id
        and coalesce(role, '') not in ('admin', 'shop_owner', 'barber');
  exception when others then null; end;
  begin perform public.seed_shop_defaults(NEW.id); exception when others then null; end;
  return NEW;
end; $$;

drop trigger if exists trg_on_barbershop_created on public.barbershops;
create trigger trg_on_barbershop_created
  after insert on public.barbershops
  for each row execute function public.on_barbershop_created();
