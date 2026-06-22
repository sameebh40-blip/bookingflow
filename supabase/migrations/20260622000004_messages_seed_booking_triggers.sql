-- ============================================================================
-- End-to-end data connectivity (works regardless of which client build runs).
--   1. Create the missing `messages` table (chat + auto-replies had no table).
--   2. Make barbers.profile_id nullable so shops can add staff without an account.
--   3. seed_shop_defaults(): give a shop default services, barbers, hours, cover.
--   4. Auto-seed every existing shop + every newly created shop.
--   5. On every booking: create an owner notification + an auto-reply message.
-- ============================================================================

-- 1) Staff can exist without a linked user account ---------------------------
alter table public.barbers alter column profile_id drop not null;

-- 2) messages table (schema matches what the app already queries) ------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.barbershops (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  text text not null default '',
  is_from_venue boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_venue_client_idx on public.messages (venue_id, client_id, created_at);
create index if not exists messages_client_idx on public.messages (client_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_read_participants" on public.messages;
create policy "messages_read_participants" on public.messages for select to authenticated
using (
  client_id = auth.uid()
  or venue_id in (select id from public.barbershops where owner_profile_id = auth.uid())
);

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages for insert to authenticated
with check (
  client_id = auth.uid()
  or venue_id in (select id from public.barbershops where owner_profile_id = auth.uid())
);

drop policy if exists "messages_update_participants" on public.messages;
create policy "messages_update_participants" on public.messages for update to authenticated
using (
  client_id = auth.uid()
  or venue_id in (select id from public.barbershops where owner_profile_id = auth.uid())
);

-- realtime (guarded — publication may already include it)
do $$ begin alter publication supabase_realtime add table public.messages; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when others then null; end $$;

-- 3) Reusable shop seeding ---------------------------------------------------
create or replace function public.seed_shop_defaults(p_shop uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.services where shop_id = p_shop) then
    insert into public.services (shop_id, name, name_en, price_bhd, duration_minutes, category, is_active) values
      (p_shop,'Haircut','Haircut',5.000,30,'Hair',true),
      (p_shop,'Beard Trim','Beard Trim',3.000,20,'Beard',true),
      (p_shop,'Haircut + Beard','Haircut + Beard',8.000,45,'Hair',true),
      (p_shop,'Kids Haircut','Kids Haircut',4.000,25,'Hair',true),
      (p_shop,'Hair Color','Hair Color',15.000,60,'Color',true),
      (p_shop,'Clean Shave','Clean Shave',4.000,20,'Beard',true);
  end if;

  if not exists (select 1 from public.barbers where shop_id = p_shop) then
    insert into public.barbers (shop_id, display_name, specialty, status, is_verified, available_now) values
      (p_shop,'Ahmed','Fades & beard styling','approved',true,true),
      (p_shop,'Mohammed','Classic cuts & kids','approved',true,true);
  end if;

  update public.barbershops set
    description = coalesce(nullif(description,''), 'Premium grooming and styling. Walk in or book online.'),
    category    = coalesce(nullif(category,''), 'Barbershop'),
    cover_url   = coalesce(nullif(cover_url,''), 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200'),
    opening_hours = case when opening_hours is null or opening_hours = '{}'::jsonb
      then '{"0":{"open":"10:00","close":"20:00","enabled":false},"1":{"open":"09:00","close":"21:00","enabled":true},"2":{"open":"09:00","close":"21:00","enabled":true},"3":{"open":"09:00","close":"21:00","enabled":true},"4":{"open":"09:00","close":"21:00","enabled":true},"5":{"open":"09:00","close":"21:00","enabled":true},"6":{"open":"10:00","close":"22:00","enabled":true}}'::jsonb
      else opening_hours end
  where id = p_shop;
end;
$$;

-- 4a) Auto-seed any newly created shop (e.g. right after partner signup) ------
create or replace function public.on_barbershop_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform public.seed_shop_defaults(NEW.id); exception when others then null; end;
  return NEW;
end; $$;

drop trigger if exists trg_on_barbershop_created on public.barbershops;
create trigger trg_on_barbershop_created
  after insert on public.barbershops
  for each row execute function public.on_barbershop_created();

-- 4b) Backfill every existing active shop ------------------------------------
do $$
declare r record;
begin
  for r in select id from public.barbershops where is_active = true loop
    begin perform public.seed_shop_defaults(r.id); exception when others then null; end;
  end loop;
end $$;

-- 5) Booking → owner notification + customer auto-reply ----------------------
create or replace function public.on_booking_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_name  text;
begin
  select owner_profile_id into v_owner from public.barbershops where id = NEW.shop_id;
  v_name := coalesce(NEW.customer_name, 'A customer');

  -- Notify the shop owner (never block the booking on failure)
  begin
    if v_owner is not null then
      insert into public.notifications (profile_id, type, title, body, data)
      values (v_owner, 'booking', 'New booking',
              v_name || ' requested an appointment',
              jsonb_build_object('booking_id', NEW.id, 'shop_id', NEW.shop_id));
    end if;
  exception when others then null;
  end;

  -- Auto-reply message to the customer
  begin
    if NEW.customer_profile_id is not null then
      insert into public.messages (venue_id, client_id, sender_id, text, is_from_venue)
      values (NEW.shop_id, NEW.customer_profile_id, null,
              'Thanks for your booking! We''ve received your request and will confirm shortly.',
              true);
    end if;
  exception when others then null;
  end;

  return NEW;
end;
$$;

drop trigger if exists trg_on_booking_created on public.bookings;
create trigger trg_on_booking_created
  after insert on public.bookings
  for each row execute function public.on_booking_created();
