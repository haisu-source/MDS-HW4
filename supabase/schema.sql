create extension if not exists pgcrypto;

create type public.reading_style as enum (
  'gentle',
  'direct',
  'spiritual',
  'analytical'
);

create type public.spread_type as enum (
  'single_card',
  'three_card',
  'daily_draw'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  city text not null,
  city_key text not null,
  zodiac_sign text not null,
  reading_style public.reading_style not null default 'gentle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_context (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  city_key text not null unique,
  weather_code integer,
  temperature_c numeric(5, 2),
  weather_label text,
  cloud_cover integer,
  precipitation_mm numeric(6, 2),
  lunar_phase text not null,
  zodiac_context_tag text,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.context_history (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  city_key text not null,
  weather_code integer,
  temperature_c numeric(5, 2),
  weather_label text,
  cloud_cover integer,
  precipitation_mm numeric(6, 2),
  lunar_phase text not null,
  zodiac_context_tag text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tarot_cards (
  id uuid primary key default gen_random_uuid(),
  card_name text not null unique,
  arcana text not null,
  upright_meaning text not null,
  reversed_meaning text not null,
  keywords text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  spread_type public.spread_type not null,
  cards_drawn jsonb not null,
  context_history_id uuid references public.context_history (id) on delete set null,
  context_snapshot jsonb not null default '{}'::jsonb,
  reading_text text not null,
  created_at timestamptz not null default now(),
  constraint readings_cards_drawn_is_array check (jsonb_typeof(cards_drawn) = 'array'),
  constraint readings_context_snapshot_is_object check (jsonb_typeof(context_snapshot) = 'object')
);

create table if not exists public.saved_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reading_id uuid not null references public.readings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, reading_id)
);

create index if not exists profiles_city_key_idx on public.profiles (city_key);
create index if not exists live_context_city_key_idx on public.live_context (city_key);
create index if not exists context_history_city_key_fetched_at_idx on public.context_history (city_key, fetched_at desc);
create index if not exists readings_user_id_created_at_idx on public.readings (user_id, created_at desc);
create index if not exists saved_readings_user_id_idx on public.saved_readings (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_live_context_updated_at on public.live_context;
create trigger set_live_context_updated_at
before update on public.live_context
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    city,
    city_key,
    zodiac_sign,
    reading_style
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'city', 'Chicago'),
    lower(replace(coalesce(new.raw_user_meta_data ->> 'city', 'Chicago'), ' ', '-')),
    coalesce(new.raw_user_meta_data ->> 'zodiac_sign', 'aries'),
    case
      when new.raw_user_meta_data ->> 'reading_style' in ('gentle', 'direct', 'spiritual', 'analytical')
        then (new.raw_user_meta_data ->> 'reading_style')::public.reading_style
      else 'gentle'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.live_context enable row level security;
alter table public.context_history enable row level security;
alter table public.tarot_cards enable row level security;
alter table public.readings enable row level security;
alter table public.saved_readings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "live_context_read_authenticated" on public.live_context;
create policy "live_context_read_authenticated"
on public.live_context
for select
to authenticated
using (true);

drop policy if exists "context_history_read_authenticated" on public.context_history;
create policy "context_history_read_authenticated"
on public.context_history
for select
to authenticated
using (true);

drop policy if exists "tarot_cards_read_authenticated" on public.tarot_cards;
create policy "tarot_cards_read_authenticated"
on public.tarot_cards
for select
to authenticated
using (true);

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own"
on public.readings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "readings_insert_own" on public.readings;
create policy "readings_insert_own"
on public.readings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_readings_select_own" on public.saved_readings;
create policy "saved_readings_select_own"
on public.saved_readings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_readings_insert_own" on public.saved_readings;
create policy "saved_readings_insert_own"
on public.saved_readings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_readings_delete_own" on public.saved_readings;
create policy "saved_readings_delete_own"
on public.saved_readings
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_context'
  ) then
    alter publication supabase_realtime add table public.live_context;
  end if;
end;
$$;
