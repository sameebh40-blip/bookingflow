-- Ensure bookings table has columns used by the RPCs below.
-- These are added defensively; if the columns already exist, nothing changes.
alter table public.bookings
  add column if not exists updated_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

-- Drop existing functions first to allow changing return type if needed
drop function if exists public.confirm_booking(uuid);
drop function if exists public.start_booking(uuid);
drop function if exists public.complete_booking(uuid);
drop function if exists public.cancel_booking(uuid, text);
drop function if exists public.mark_booking_no_show(uuid);

-- confirm_booking: pending → confirmed
create or replace function public.confirm_booking(booking_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'confirmed', updated_at = now()
  where id = booking_id
    and status = 'pending';
  if not found then
    raise exception 'Booking not found or not in pending state';
  end if;
end;
$$;

-- start_booking: confirmed → in_progress
create or replace function public.start_booking(booking_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'in_progress', updated_at = now()
  where id = booking_id
    and status = 'confirmed';
  if not found then
    raise exception 'Booking not found or not in confirmed state';
  end if;
end;
$$;

-- complete_booking: in_progress/confirmed → completed
create or replace function public.complete_booking(booking_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'completed', updated_at = now()
  where id = booking_id
    and status in ('in_progress', 'confirmed');
  if not found then
    raise exception 'Booking not found or cannot be completed from current state';
  end if;
end;
$$;

-- cancel_booking: any non-terminal → cancelled
create or replace function public.cancel_booking(booking_id uuid, reason text default null)
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'cancelled',
      cancel_reason = reason,
      cancelled_at = now(),
      updated_at = now()
  where id = booking_id
    and status not in ('completed', 'cancelled');
  if not found then
    raise exception 'Booking not found or already in terminal state';
  end if;
end;
$$;

-- mark_booking_no_show: pending/confirmed/in_progress → no_show
create or replace function public.mark_booking_no_show(booking_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'no_show', updated_at = now()
  where id = booking_id
    and status in ('confirmed', 'in_progress', 'pending');
  if not found then
    raise exception 'Booking not found or cannot be marked no_show';
  end if;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.start_booking(uuid) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.mark_booking_no_show(uuid) to authenticated;
