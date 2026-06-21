-- Make posts insert more forgiving for mobile app uploads
-- The constraint requires media_path when status='approved'
-- We now provide media_path in the insert, but also make status default to 'pending' for new mobile uploads
-- so shops don't need admin approval for their own content

-- Option: Allow shop owners to post directly as 'approved' by relaxing the constraint
-- The constraint is: status <> 'approved' OR (media_path IS NOT NULL AND btrim(media_path) <> '')
-- We now always provide media_path so the constraint should pass, but let's also add a fallback

-- Allow posts with status='pending' to not require media_path (for drafts)
-- The existing constraint already handles this (only blocks 'approved' without media_path)
-- So just ensuring we always insert with proper fields is enough

-- Also ensure the 'reels' bucket exists in storage (or use shop-covers which we know exists)
-- Nothing to migrate for that - handled in app code

-- Grant partners ability to insert their own posts (shop owner)
drop policy if exists "posts_insert_shop_owner" on public.posts;
create policy "posts_insert_shop_owner"
  on public.posts
  for insert
  with check (
    owner_type = 'shop'
    AND shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    )
  );

-- Grant partners ability to SELECT their own posts
drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own"
  on public.posts
  for select
  using (
    shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    )
    OR status = 'approved'
    OR is_active = true
  );

-- Grant partners ability to DELETE their own posts
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
  on public.posts
  for delete
  using (
    shop_id IN (
      SELECT id FROM public.barbershops WHERE owner_profile_id = auth.uid()
    )
  );
