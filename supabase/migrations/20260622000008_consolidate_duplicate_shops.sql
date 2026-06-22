-- Consolidate to ONE shop per owner so the partner dashboard resolves a shop on
-- the current app build (which uses .single()). Keeps the most-used shop (tie ->
-- oldest) and deletes the empty duplicate test shops. Protective foreign keys
-- (profiles.shop_id RESTRICT, posts/reviews author checks) are cleared first.
-- Partner accounts still support multiple shops/branches going forward (the app
-- now uses limit(1)); this only clears today's junk test duplicates.

do $$
declare
  r record;
  keeper uuid;
begin
  for r in (
    select owner_profile_id
    from public.barbershops
    where owner_profile_id is not null
    group by owner_profile_id
    having count(*) > 1
  ) loop
    select b.id into keeper
    from public.barbershops b
    left join (select shop_id, count(*) c from public.bookings group by shop_id) bk on bk.shop_id = b.id
    where b.owner_profile_id = r.owner_profile_id
    order by coalesce(bk.c, 0) desc, b.created_at asc
    limit 1;

    -- 1) clear RESTRICT ref from profiles (point owner at keeper, null the rest)
    update public.profiles set shop_id = keeper where id = r.owner_profile_id;
    update public.profiles set shop_id = null
      where shop_id in (select id from public.barbershops where owner_profile_id = r.owner_profile_id and id <> keeper);

    -- 2) delete dependents with author/NOT NULL checks before the shop
    -- (bookings cascade-delete with the shop; barbers/services set-null. We only
    --  pre-delete the ones with author/NOT-NULL check constraints.)
    delete from public.posts    where shop_id in (select id from public.barbershops where owner_profile_id = r.owner_profile_id and id <> keeper);
    delete from public.reviews  where shop_id in (select id from public.barbershops where owner_profile_id = r.owner_profile_id and id <> keeper);
    delete from public.favorites where target_type = 'shop' and target_id in (select id from public.barbershops where owner_profile_id = r.owner_profile_id and id <> keeper);

    -- 3) delete the duplicate shops
    delete from public.barbershops where owner_profile_id = r.owner_profile_id and id <> keeper;

    -- 4) keep the survivor live + linked (status left as-is; the live model is
    --    'active'-based now and 'approved' is no longer a valid status value)
    update public.barbershops set is_active = true where id = keeper;
  end loop;
end $$;
