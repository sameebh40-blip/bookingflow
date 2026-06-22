-- No admin approval: partner shops are visible to customers immediately.
-- The customer home filters status='approved', but new shops were 'pending',
-- so partner-created shops never appeared. Auto-approve them.

-- 1) Approve all existing active shops
update public.barbershops
  set status = 'approved'
  where is_active = true and coalesce(status, '') <> 'approved';

-- 2) New shops default to approved
alter table public.barbershops alter column status set default 'approved';

-- 3) On creation: approve + seed defaults (replaces the seed-only trigger fn)
create or replace function public.on_barbershop_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    update public.barbershops
      set status = 'approved', is_active = true
      where id = NEW.id and coalesce(status,'') <> 'approved';
  exception when others then null; end;
  begin perform public.seed_shop_defaults(NEW.id); exception when others then null; end;
  return NEW;
end; $$;
