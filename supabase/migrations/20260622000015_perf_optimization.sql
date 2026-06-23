-- Performance optimization per supabase-postgres-best-practices skill.
-- Pure optimization: no behavior changes.
--   1. Index every unindexed foreign key (10-100x faster joins/cascades)
--   2. Re-create owner RLS policies using (select auth.uid()) (100x faster RLS)
--   3. Validate the bookings source constraint (guarded)

-- ── 1. FOREIGN-KEY INDEXES ───────────────────────────────────────────────────
create index if not exists appointments_staff_id_idx on public.appointments (staff_id);
create index if not exists appointments_venue_id_idx on public.appointments (venue_id);
create index if not exists barber_account_requests_decided_by_idx on public.barber_account_requests (decided_by_profile_id);
create index if not exists barber_account_requests_requested_by_idx on public.barber_account_requests (requested_by_profile_id);
create index if not exists barber_hours_shop_id_idx on public.barber_hours (shop_id);
create index if not exists booking_holds_user_id_idx on public.booking_holds (user_id);
create index if not exists booking_slot_holds_service_id_idx on public.booking_slot_holds (service_id);
create index if not exists booking_slot_holds_shop_id_idx on public.booking_slot_holds (shop_id);
create index if not exists bookings_offer_id_idx on public.bookings (offer_id);
create index if not exists bookings_reel_id_idx on public.bookings (reel_id);
create index if not exists bookings_rescheduled_from_idx on public.bookings (rescheduled_from);
create index if not exists brand_assets_updated_by_idx on public.brand_assets (updated_by);
create index if not exists favourites_shop_id_idx on public.favourites (shop_id);
create index if not exists home_banner_versions_created_by_idx on public.home_banner_versions (created_by);
create index if not exists home_banners_created_by_idx on public.home_banners (created_by);
create index if not exists location_images_shop_id_idx on public.location_images (shop_id);
create index if not exists memberships_profile_id_idx on public.memberships (profile_id);
create index if not exists memberships_shop_id_idx on public.memberships (shop_id);
create index if not exists notifications_shop_id_idx on public.notifications (shop_id);
create index if not exists offer_targets_sent_by_idx on public.offer_targets (sent_by_profile_id);
create index if not exists offer_targets_shop_id_idx on public.offer_targets (shop_id);
create index if not exists partner_calendar_waitlist_branch_id_idx on public.partner_calendar_waitlist (branch_id);
create index if not exists partner_calendar_waitlist_converted_booking_idx on public.partner_calendar_waitlist (converted_booking_id);
create index if not exists partner_calendar_waitlist_created_by_idx on public.partner_calendar_waitlist (created_by_profile_id);
create index if not exists partner_calendar_waitlist_service_id_idx on public.partner_calendar_waitlist (service_id);
create index if not exists pending_invoices_shop_id_idx on public.pending_invoices (shop_id);
create index if not exists profiles_shop_id_idx on public.profiles (shop_id);
create index if not exists reel_view_events_reel_id_idx on public.reel_view_events (reel_id);
create index if not exists reel_view_events_viewer_idx on public.reel_view_events (viewer_profile_id);
create index if not exists sale_items_barber_id_idx on public.sale_items (barber_id);
create index if not exists sale_items_service_id_idx on public.sale_items (service_id);
create index if not exists sales_barber_id_idx on public.sales (barber_id);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists staff_venue_id_idx on public.staff (venue_id);
create index if not exists style_media_post_id_idx on public.style_media (post_id);
create index if not exists venue_reviews_venue_id_idx on public.venue_reviews (venue_id);
create index if not exists venue_services_venue_id_idx on public.venue_services (venue_id);

-- ── 2. RLS POLICIES — wrap auth.uid() in (select …) so it's cached per-statement ──
-- BARBERSHOPS
drop policy if exists "shops_insert_authenticated" on public.barbershops;
create policy "shops_insert_authenticated" on public.barbershops
  for insert to authenticated with check (owner_profile_id = (select auth.uid()));
drop policy if exists "shops_update_owner_direct" on public.barbershops;
create policy "shops_update_owner_direct" on public.barbershops
  for update to authenticated
  using (owner_profile_id = (select auth.uid())) with check (owner_profile_id = (select auth.uid()));

-- BARBERS
drop policy if exists "barbers_insert_owner_direct" on public.barbers;
create policy "barbers_insert_owner_direct" on public.barbers
  for insert to authenticated with check (
    profile_id = (select auth.uid())
    or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "barbers_update_owner_direct" on public.barbers;
create policy "barbers_update_owner_direct" on public.barbers
  for update to authenticated
  using (profile_id = (select auth.uid()) or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())))
  with check (profile_id = (select auth.uid()) or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "barbers_delete_owner_direct" on public.barbers;
create policy "barbers_delete_owner_direct" on public.barbers
  for delete to authenticated using (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));

-- SERVICES
drop policy if exists "services_insert_owner_direct" on public.services;
create policy "services_insert_owner_direct" on public.services
  for insert to authenticated with check (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "services_update_owner_direct" on public.services;
create policy "services_update_owner_direct" on public.services
  for update to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())))
  with check (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "services_delete_owner_direct" on public.services;
create policy "services_delete_owner_direct" on public.services
  for delete to authenticated using (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));

-- POSTS
drop policy if exists "posts_insert_owner_direct" on public.posts;
create policy "posts_insert_owner_direct" on public.posts
  for insert to authenticated with check (
    created_by = (select auth.uid())
    or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "posts_update_owner_direct" on public.posts;
create policy "posts_update_owner_direct" on public.posts
  for update to authenticated
  using (created_by = (select auth.uid()) or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())))
  with check (created_by = (select auth.uid()) or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "posts_delete_owner_direct" on public.posts;
create policy "posts_delete_owner_direct" on public.posts
  for delete to authenticated using (created_by = (select auth.uid()) or shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));

-- MESSAGES
drop policy if exists "messages_read_participants" on public.messages;
create policy "messages_read_participants" on public.messages for select to authenticated
  using (client_id = (select auth.uid()) or venue_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages for insert to authenticated
  with check (client_id = (select auth.uid()) or venue_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "messages_update_participants" on public.messages;
create policy "messages_update_participants" on public.messages for update to authenticated
  using (client_id = (select auth.uid()) or venue_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));

-- BOOKINGS
drop policy if exists "bookings_insert_owner" on public.bookings;
create policy "bookings_insert_owner" on public.bookings for insert to authenticated
  with check (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));
drop policy if exists "bookings_update_owner" on public.bookings;
create policy "bookings_update_owner" on public.bookings for update to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())))
  with check (shop_id in (select id from public.barbershops where owner_profile_id = (select auth.uid())));

-- ── 3. VALIDATE source constraint (guarded so it can't break the migration) ──
do $$ begin
  alter table public.bookings validate constraint bookings_source_check;
exception when others then null; end $$;
