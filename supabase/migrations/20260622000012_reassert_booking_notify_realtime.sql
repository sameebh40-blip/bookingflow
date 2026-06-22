-- Guarantee a new booking reaches the partner (notification + auto-message) and
-- that realtime is enabled so the partner calendar/dashboard updates live.
-- Re-asserted because Newly's migrations may have dropped these.

create or replace function public.on_booking_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_name  text;
begin
  select owner_profile_id into v_owner from public.barbershops where id = NEW.shop_id;
  v_name := coalesce(NEW.customer_name, 'A customer');

  begin
    if v_owner is not null then
      insert into public.notifications (profile_id, type, title, body, data)
      values (v_owner, 'booking', 'New booking',
              v_name || ' requested an appointment',
              jsonb_build_object('booking_id', NEW.id, 'shop_id', NEW.shop_id));
    end if;
  exception when others then null;
  end;

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

-- realtime so the partner dashboard/calendar updates the moment a booking lands
do $$ begin alter publication supabase_realtime add table public.bookings; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages; exception when others then null; end $$;
