-- =============================================================================
-- 001_initial_schema.sql — Fondasi: households, profiles, household_members + RLS
-- Aman dijalankan ulang (idempotent). Jalankan di Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema privat untuk helper function (TIDAK diekspos Data API)
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- 2. Trigger function updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Tabel
-- -----------------------------------------------------------------------------
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null check (role in ('husband', 'wife')),
  joined_at    timestamptz not null default now(),
  constraint household_members_household_user_key unique (household_id, user_id),
  constraint household_members_household_role_key unique (household_id, role),
  -- Aplikasi ini: satu pengguna hanya di satu household (memudahkan lookup konteks).
  constraint household_members_user_key unique (user_id)
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Helper functions untuk RLS
--    SECURITY DEFINER agar query ke household_members di dalam policy tidak
--    memicu RLS lagi (mencegah infinite recursion). search_path dikosongkan dan
--    semua objek dirujuk dengan nama lengkap (cegah search_path hijacking).
--    EXECUTE hanya untuk role 'authenticated'; function berada di schema private
--    sehingga tidak bisa dipanggil lewat Data API/RPC.
-- -----------------------------------------------------------------------------
create or replace function private.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = target_household
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.shares_household_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members other on other.household_id = me.household_id
    where me.user_id = (select auth.uid())
      and other.user_id = target_user
  );
$$;

revoke all on function private.is_household_member(uuid) from public, anon;
revoke all on function private.shares_household_with(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.shares_household_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Auto-buat profil saat user baru dibuat di Supabase Auth
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Profil untuk user yang sudah ada sebelum migration ini.
insert into public.profiles (user_id, full_name)
select u.id, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Privilege tabel (Supabase memberi default grant ke anon/authenticated)
--    Prinsip: anon tidak punya akses; authenticated hanya yang diperlukan.
--    Tidak ada INSERT/UPDATE/DELETE untuk households & household_members dari frontend.
-- -----------------------------------------------------------------------------
revoke all on public.households        from anon, authenticated;
revoke all on public.profiles          from anon, authenticated;
revoke all on public.household_members from anon, authenticated;

grant select on public.households        to authenticated;
grant select on public.household_members to authenticated;
grant select on public.profiles          to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.households        enable row level security;
alter table public.profiles          enable row level security;
alter table public.household_members enable row level security;

-- households: hanya anggota yang boleh membaca household-nya.
drop policy if exists households_select_members on public.households;
create policy households_select_members on public.households
  for select to authenticated
  using ( (select private.is_household_member(id)) );

-- household_members: baca keanggotaan di household sendiri. (Tanpa policy write.)
drop policy if exists household_members_select_same_household on public.household_members;
create policy household_members_select_same_household on public.household_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_household_member(household_id))
  );

-- profiles: baca profil sendiri dan pasangan satu household; ubah hanya profil sendiri.
drop policy if exists profiles_select_self_or_household on public.profiles;
create policy profiles_select_self_or_household on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.shares_household_with(user_id))
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );
