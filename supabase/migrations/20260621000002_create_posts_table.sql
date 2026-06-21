-- Posts table: partners post photos/reels for the discover feed
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete set null,
  caption text,
  media_url text not null,
  thumbnail_url text,
  image_url text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  likes_count integer not null default 0,
  views_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.posts enable row level security;

-- Anyone can read active posts
create policy "posts_select" on public.posts for select using (is_active = true);

-- Shop owners can insert posts for their shop
create policy "posts_insert" on public.posts for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and shop_id = posts.shop_id
    )
  );

-- Shop owners can update their own posts
create policy "posts_update" on public.posts for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and shop_id = posts.shop_id
    )
  );

-- Index for discover feed
create index if not exists posts_shop_id_idx on public.posts(shop_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_active_idx on public.posts(is_active, created_at desc);
