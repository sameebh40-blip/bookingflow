-- Reviews table: customers leave reviews for barbershops after a booking
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  text text,
  target_type text default 'shop',
  target_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, customer_profile_id, booking_id)
);

-- RLS
alter table public.reviews enable row level security;

-- Anyone can read reviews
create policy "reviews_select" on public.reviews for select using (true);

-- Authenticated users can insert their own review
create policy "reviews_insert" on public.reviews for insert
  with check (auth.uid() = customer_profile_id);

-- Users can update their own review
create policy "reviews_update" on public.reviews for update
  using (auth.uid() = customer_profile_id);

-- Index for fast shop lookups
create index if not exists reviews_shop_id_idx on public.reviews(shop_id);
create index if not exists reviews_customer_idx on public.reviews(customer_profile_id);
