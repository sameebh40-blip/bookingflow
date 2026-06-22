-- Richer appointment lifecycle for the partner calendar (Fresha-style):
-- booked → confirmed → arrived → in_progress → completed, plus no_show / cancelled.
-- Additive change; existing values ('pending','confirmed','cancelled','completed') stay valid.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending','confirmed','arrived','in_progress','completed','cancelled','no_show'));
