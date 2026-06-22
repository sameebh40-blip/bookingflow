-- Make bookings work without admin approval, and stop "Any available" failing.
--   * "Any available" (barber_id null) now auto-assigns the shop's first active barber
--   * barber/shop/service no longer need status='approved' — active is enough
--   * barbers are auto-approved on creation + backfilled (no pending limbo)

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

  -- "Any available": auto-assign the shop's first active barber
  if new.barber_id is null and v_target_shop is not null then
    select id, shop_id, deleted_at, is_active, status into v_barber
    from public.barbers
    where shop_id = v_target_shop and deleted_at is null and is_active is not false
    order by created_at asc limit 1;
    if v_barber.id is not null then new.barber_id := v_barber.id; end if;
  end if;

  -- validate the barber only if one is set (null = unassigned is allowed)
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

  -- shop must exist + be active (no admin-approval requirement)
  if new.shop_id is not null then
    select id, deleted_at, is_active, status into v_shop
    from public.barbershops where id = new.shop_id limit 1;
    if v_shop.id is null then raise exception using message = 'INVALID_SHOP'; end if;
    if v_shop.deleted_at is not null or v_shop.is_active is false then
      raise exception using message = 'SHOP_INACTIVE';
    end if;
  end if;

  -- service must exist + be active (no admin-approval requirement)
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

-- Barbers: auto-approve on creation (no admin), default approved, backfill pending
create or replace function public.barbers_auto_approve()
returns trigger language plpgsql as $$
begin
  if new.status is null or new.status = 'pending' then new.status := 'approved'; end if;
  if new.is_active is null then new.is_active := true; end if;
  return new;
end; $$;

drop trigger if exists trg_barbers_auto_approve on public.barbers;
create trigger trg_barbers_auto_approve
  before insert on public.barbers
  for each row execute function public.barbers_auto_approve();

alter table public.barbers alter column status set default 'approved';
update public.barbers set status = 'approved' where coalesce(status, '') in ('', 'pending');
update public.barbers set is_active = true where is_active is distinct from true;
