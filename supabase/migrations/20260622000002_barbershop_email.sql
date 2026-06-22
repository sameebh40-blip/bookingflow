-- Business email captured in the partner "Venue essentials" screen.
-- Idempotent: no-op if the column already exists.
alter table public.barbershops
  add column if not exists email text;
