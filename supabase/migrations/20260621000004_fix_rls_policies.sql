-- Fix 1: Allow shop owners to INSERT their own barbershop from mobile onboarding
-- Previously only admins could insert (shops_insert_admin_only blocked all mobile sign-ups)
drop policy if exists "shops_insert_authenticated" on public.barbershops;
create policy "shops_insert_authenticated"
  on public.barbershops
  for insert
  with check (owner_profile_id = auth.uid());

-- Fix 2: Allow booking inserts from mobile_app source
-- Previously marketplace policy required source IN ('marketplace','web','customer')
-- bookings_insert_customer already allows it when customer_profile_id = auth.uid()
-- but add explicit mobile_app allowance to be safe
drop policy if exists "bookings_insert_mobile" on public.bookings;
create policy "bookings_insert_mobile"
  on public.bookings
  for insert
  with check (
    customer_profile_id = auth.uid()
    AND source IN ('mobile_app', 'marketplace', 'web', 'customer', 'walk_in')
  );

-- Fix 3: Allow shop owners to update their own shop (set is_active, opening_hours, etc.)
drop policy if exists "shops_update_owner_mobile" on public.barbershops;
create policy "shops_update_owner_mobile"
  on public.barbershops
  for update
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

-- Fix 4: Allow partners to INSERT barbers into their own shop
drop policy if exists "barbers_insert_mobile" on public.barbers;
create policy "barbers_insert_mobile"
  on public.barbers
  for insert
  with check (
    shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    )
    OR profile_id = auth.uid()
  );

-- Fix 5: Allow shop owners to INSERT services for their shop
drop policy if exists "services_insert_owner_mobile" on public.services;
create policy "services_insert_owner_mobile"
  on public.services
  for insert
  with check (
    (shop_id IS NOT NULL AND shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    ))
    OR
    (barber_id IS NOT NULL AND barber_id IN (
      SELECT id FROM public.barbers WHERE profile_id = auth.uid()
    ))
  );

-- Fix 6: Allow shop owners to INSERT posts for their shop
drop policy if exists "posts_insert_owner" on public.posts;
create policy "posts_insert_owner"
  on public.posts
  for insert
  with check (
    shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    )
  );

-- Fix 7: Allow authenticated users to INSERT their own profile
drop policy if exists "profiles_insert_authenticated" on public.profiles;
create policy "profiles_insert_authenticated"
  on public.profiles
  for insert
  with check (id = auth.uid());

-- Fix 8: Allow any authenticated user to INSERT a review for a shop
drop policy if exists "reviews_insert_authenticated" on public.reviews;
create policy "reviews_insert_authenticated"
  on public.reviews
  for insert
  with check (customer_profile_id = auth.uid());
