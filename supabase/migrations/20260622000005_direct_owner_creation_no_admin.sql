-- ============================================================================
-- Remove the admin-approval requirement for shop owners.
-- The hallaq backend was set up "admin-controlled" (admin must approve shops,
-- barbers, posts). This lets a shop owner create & manage their OWN shop,
-- staff, services and posts/reels DIRECTLY — no admin permission needed.
--
-- Safe by construction: these are PERMISSIVE policies (OR-combined with any
-- existing admin/public policies), so they only GRANT access — nothing that
-- already worked stops working. Admins keep their existing all-access policies.
-- ============================================================================

-- helper-free inline predicate: "a shop owned by the current user"
--   shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())

-- ── BARBERSHOPS: owner can create & edit their own shop ──────────────────────
drop policy if exists "shops_insert_admin_only" on public.barbershops;  -- redundant; admin-all covers admins
drop policy if exists "shops_insert_authenticated" on public.barbershops;
create policy "shops_insert_authenticated" on public.barbershops
  for insert to authenticated
  with check (owner_profile_id = auth.uid());

drop policy if exists "shops_update_owner_direct" on public.barbershops;
create policy "shops_update_owner_direct" on public.barbershops
  for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

-- ── BARBERS: shop owner can add / edit / remove their staff directly ─────────
drop policy if exists "barbers_insert_owner_direct" on public.barbers;
create policy "barbers_insert_owner_direct" on public.barbers
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );

drop policy if exists "barbers_update_owner_direct" on public.barbers;
create policy "barbers_update_owner_direct" on public.barbers
  for update to authenticated
  using (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );

drop policy if exists "barbers_delete_owner_direct" on public.barbers;
create policy "barbers_delete_owner_direct" on public.barbers
  for delete to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

-- ── SERVICES: shop owner manages their own services directly ─────────────────
drop policy if exists "services_insert_owner_direct" on public.services;
create policy "services_insert_owner_direct" on public.services
  for insert to authenticated
  with check (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

drop policy if exists "services_update_owner_direct" on public.services;
create policy "services_update_owner_direct" on public.services
  for update to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()))
  with check (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

drop policy if exists "services_delete_owner_direct" on public.services;
create policy "services_delete_owner_direct" on public.services
  for delete to authenticated
  using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

-- ── POSTS / REELS: shop owner publishes their own content directly ───────────
drop policy if exists "posts_insert_owner_direct" on public.posts;
create policy "posts_insert_owner_direct" on public.posts
  for insert to authenticated
  with check (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );

drop policy if exists "posts_update_owner_direct" on public.posts;
create policy "posts_update_owner_direct" on public.posts
  for update to authenticated
  using (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  )
  with check (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );

drop policy if exists "posts_delete_owner_direct" on public.posts;
create policy "posts_delete_owner_direct" on public.posts
  for delete to authenticated
  using (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid())
  );
