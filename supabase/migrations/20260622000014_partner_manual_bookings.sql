-- Let shop owners create manual bookings for their own shop (walk-ins, phone
-- bookings, etc.). Previously only customer/source-restricted insert policies
-- existed, so a partner-created booking was silently rejected by RLS.

drop policy if exists "bookings_insert_owner" on public.bookings;
create policy "bookings_insert_owner" on public.bookings
  for insert to authenticated
  with check (
    shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );

-- Owners can also update their shop's bookings (status, reschedule, etc.)
drop policy if exists "bookings_update_owner" on public.bookings;
create policy "bookings_update_owner" on public.bookings
  for update to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()))
  with check (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

-- Widen the source allowlist so partner/app sources are accepted (NOT VALID so
-- existing rows aren't re-checked).
alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check check (
  source is null or source in (
    'web','mobile','admin','api','mobile_app','marketplace','customer',
    'walk_in','partner','partner_app','offline','online'
  )
) not valid;
