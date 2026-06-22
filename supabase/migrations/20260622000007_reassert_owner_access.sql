-- Re-assert owner-based access + visibility. Newly applies its own migrations
-- to the shared DB (later timestamps), which can drop these policies or reset
-- shop status. This migration is idempotent and restores the intended state:
-- shop owners create/manage their own shop, staff, services and posts WITHOUT
-- admin approval, and their shops are visible to customers.

-- Staff can exist without a linked account
alter table public.barbers alter column profile_id drop not null;

-- Shops visible to customers immediately (no admin approval)
update public.barbershops set status = 'approved' where is_active = true and coalesce(status,'') not in ('approved','active');
alter table public.barbershops alter column status set default 'approved';

-- ── BARBERSHOPS ──────────────────────────────────────────────────────────
drop policy if exists "shops_insert_authenticated" on public.barbershops;
create policy "shops_insert_authenticated" on public.barbershops
  for insert to authenticated with check (owner_profile_id = auth.uid());
drop policy if exists "shops_update_owner_direct" on public.barbershops;
create policy "shops_update_owner_direct" on public.barbershops
  for update to authenticated using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());

-- ── BARBERS ──────────────────────────────────────────────────────────────
drop policy if exists "barbers_insert_owner_direct" on public.barbers;
create policy "barbers_insert_owner_direct" on public.barbers
  for insert to authenticated with check (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "barbers_update_owner_direct" on public.barbers;
create policy "barbers_update_owner_direct" on public.barbers
  for update to authenticated using (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()))
  with check (
    profile_id = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "barbers_delete_owner_direct" on public.barbers;
create policy "barbers_delete_owner_direct" on public.barbers
  for delete to authenticated using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

-- ── SERVICES ─────────────────────────────────────────────────────────────
drop policy if exists "services_insert_owner_direct" on public.services;
create policy "services_insert_owner_direct" on public.services
  for insert to authenticated with check (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "services_update_owner_direct" on public.services;
create policy "services_update_owner_direct" on public.services
  for update to authenticated using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()))
  with check (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "services_delete_owner_direct" on public.services;
create policy "services_delete_owner_direct" on public.services
  for delete to authenticated using (shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));

-- ── POSTS / REELS ────────────────────────────────────────────────────────
drop policy if exists "posts_insert_owner_direct" on public.posts;
create policy "posts_insert_owner_direct" on public.posts
  for insert to authenticated with check (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "posts_update_owner_direct" on public.posts;
create policy "posts_update_owner_direct" on public.posts
  for update to authenticated using (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()))
  with check (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
drop policy if exists "posts_delete_owner_direct" on public.posts;
create policy "posts_delete_owner_direct" on public.posts
  for delete to authenticated using (
    created_by = auth.uid()
    or shop_id in (select id from public.barbershops where owner_profile_id = auth.uid()));
