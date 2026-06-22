-- Bookings require a branch (multi-branch model). The app doesn't send one, so
-- inserts violate bookings_branch_required_check. Fix end-to-end:
--   * every shop gets a "Main Branch" (backfill + on creation)
--   * the booking guard auto-assigns the shop's Main Branch when none is given

-- Backfill: ensure every shop has a Main Branch
insert into public.shop_branches (shop_id, name, area, address, lat, lng, opening_hours)
select s.id, 'Main Branch', s.area, s.address, s.lat, s.lng, coalesce(s.opening_hours, '{}'::jsonb)
from public.barbershops s
where not exists (select 1 from public.shop_branches b where b.shop_id = s.id)
on conflict (shop_id, name) do nothing;

-- Booking guard: same as before + auto-assign branch_id
create or replace function public.bookings_prepare_insert()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_barber record;
  v_shop record;
  v_service record;
  v_duration int;
  v_price numeric(10,3);
  v_deposit_required numeric(10,3) := 0;
  v_deposit_type text;
  v_deposit_value numeric(10,3);
  v_target_shop uuid;
begin
  if new.start_at is null then raise exception using message = 'INVALID_START_AT'; end if;
  if new.service_id is null then raise exception using message = 'SERVICE_NOT_FOUND'; end if;

  v_target_shop := new.shop_id;
  if v_target_shop is null then
    select shop_id into v_target_shop from public.services where id = new.service_id limit 1;
  end if;

  if new.barber_id is null and v_target_shop is not null then
    select id, shop_id, deleted_at, is_active, status into v_barber
    from public.barbers
    where shop_id = v_target_shop and deleted_at is null and is_active is not false
    order by created_at asc limit 1;
    if v_barber.id is not null then new.barber_id := v_barber.id; end if;
  end if;

  if new.barber_id is not null then
    select id, shop_id, deleted_at, is_active, status into v_barber
    from public.barbers where id = new.barber_id limit 1;
    if v_barber.id is null then raise exception using message = 'INVALID_BARBER'; end if;
    if v_barber.deleted_at is not null or v_barber.is_active is false then
      raise exception using message = 'BARBER_INACTIVE';
    end if;
    if new.shop_id is null then new.shop_id := v_barber.shop_id; end if;
    if new.shop_id is not null and v_barber.shop_id is not null and new.shop_id <> v_barber.shop_id then
      raise exception using message = 'BARBER_NOT_IN_SHOP';
    end if;
  end if;

  if new.shop_id is null then new.shop_id := v_target_shop; end if;

  if new.shop_id is not null then
    select id, deleted_at, is_active, status into v_shop
    from public.barbershops where id = new.shop_id limit 1;
    if v_shop.id is null then raise exception using message = 'INVALID_SHOP'; end if;
    if v_shop.deleted_at is not null or v_shop.is_active is false then
      raise exception using message = 'SHOP_INACTIVE';
    end if;
  end if;

  -- auto-assign branch (Main Branch); create it if the shop has none
  if new.branch_id is null and new.shop_id is not null then
    select id into new.branch_id from public.shop_branches
      where shop_id = new.shop_id order by (name = 'Main Branch') desc, created_at asc limit 1;
    if new.branch_id is null then
      insert into public.shop_branches (shop_id, name) values (new.shop_id, 'Main Branch')
        on conflict (shop_id, name) do nothing;
      select id into new.branch_id from public.shop_branches
        where shop_id = new.shop_id and name = 'Main Branch' limit 1;
    end if;
  end if;

  select id, shop_id, barber_id, deleted_at, is_active, status,
         price_bhd, price, duration_minutes, duration_min, deposit_type, deposit_value
  into v_service from public.services where id = new.service_id limit 1;
  if v_service.id is null then raise exception using message = 'SERVICE_NOT_FOUND'; end if;
  if v_service.deleted_at is not null or v_service.is_active is false then
    raise exception using message = 'SERVICE_INACTIVE';
  end if;
  if v_service.barber_id is not null and new.barber_id is not null and v_service.barber_id <> new.barber_id then
    raise exception using message = 'SERVICE_NOT_FOR_BARBER';
  end if;
  if v_service.shop_id is not null then
    if new.shop_id is null then new.shop_id := v_service.shop_id; end if;
    if new.shop_id <> v_service.shop_id then raise exception using message = 'SERVICE_NOT_FOR_SHOP'; end if;
  end if;

  v_duration := coalesce(v_service.duration_minutes, v_service.duration_min, 30);
  if v_duration <= 0 then raise exception using message = 'INVALID_DURATION'; end if;
  if coalesce(new.duration_minutes, 0) <= 0 then new.duration_minutes := v_duration; end if;
  new.end_at := new.start_at + make_interval(mins => new.duration_minutes);

  v_price := coalesce(v_service.price_bhd, v_service.price, 0)::numeric(10,3);
  new.currency := coalesce(nullif(trim(coalesce(new.currency, '')), ''), 'BHD');
  if new.price_bhd is null or new.price_bhd < 0 then new.price_bhd := v_price; end if;
  if new.total_price is null or new.total_price < 0 then new.total_price := coalesce(new.price_bhd, v_price); end if;

  v_deposit_type := nullif(trim(coalesce(v_service.deposit_type, '')), '');
  v_deposit_value := coalesce(v_service.deposit_value, 0)::numeric(10,3);
  if v_deposit_type is not null and v_deposit_value > 0 then
    if v_deposit_type = 'fixed' then v_deposit_required := v_deposit_value;
    elsif v_deposit_type = 'percent' then v_deposit_required := round((v_price * v_deposit_value / 100.0)::numeric, 3); end if;
  end if;
  if v_deposit_required < 0 then v_deposit_required := 0; end if;
  if v_deposit_required > v_price then v_deposit_required := v_price; end if;
  if new.deposit_required_amount is null or new.deposit_required_amount < 0 then
    new.deposit_required_amount := v_deposit_required;
  end if;

  new.status := coalesce(nullif(trim(coalesce(new.status, '')), ''), 'pending');
  if new.status not in ('pending','confirmed','cancelled','completed') then
    raise exception using message = 'INVALID_STATUS';
  end if;

  return new;
end;
$$;

-- New shops: create role + Main Branch + seed defaults
create or replace function public.on_barbershop_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    update public.profiles set role = 'shop_owner'
      where id = NEW.owner_profile_id and coalesce(role,'') not in ('admin','shop_owner','barber');
  exception when others then null; end;
  begin
    insert into public.shop_branches (shop_id, name, area, address, lat, lng, opening_hours)
    values (NEW.id, 'Main Branch', NEW.area, NEW.address, NEW.lat, NEW.lng, coalesce(NEW.opening_hours, '{}'::jsonb))
    on conflict (shop_id, name) do nothing;
  exception when others then null; end;
  begin perform public.seed_shop_defaults(NEW.id); exception when others then null; end;
  return NEW;
end; $$;

drop trigger if exists trg_on_barbershop_created on public.barbershops;
create trigger trg_on_barbershop_created
  after insert on public.barbershops
  for each row execute function public.on_barbershop_created();
