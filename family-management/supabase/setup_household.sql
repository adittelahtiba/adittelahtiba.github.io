-- =============================================================================
-- setup_household.sql — Hubungkan akun Aditya & Ryka ke satu household.
-- Jalankan di Supabase SQL Editor SETELAH:
--   1) migration 001_initial_schema.sql berhasil, dan
--   2) kedua user dibuat di Authentication > Users.
-- Ganti dua email di bawah. Aman dijalankan ulang.
-- =============================================================================
do $$
declare
  v_husband_email constant text := 'pangestuaditya.solihin@gmail.com';
  v_wife_email    constant text := 'rnurdianti1@gmail.com';
  v_husband_name  constant text := 'Aditya';
  v_wife_name     constant text := 'Ryka';
  v_household_name constant text := 'Ryka & Adit Family';

  v_husband_id uuid;
  v_wife_id    uuid;
  v_household_id uuid;
begin
  select id into v_husband_id from auth.users where lower(email) = lower(v_husband_email);
  select id into v_wife_id    from auth.users where lower(email) = lower(v_wife_email);

  if v_husband_id is null then
    raise exception 'User suami (%) tidak ditemukan di auth.users. Buat dulu di Authentication > Users.', v_husband_email;
  end if;
  if v_wife_id is null then
    raise exception 'User istri (%) tidak ditemukan di auth.users. Buat dulu di Authentication > Users.', v_wife_email;
  end if;

  -- Household: gunakan yang sudah ada jika salah satu akun sudah menjadi anggota.
  select household_id into v_household_id
  from public.household_members
  where user_id in (v_husband_id, v_wife_id)
  limit 1;

  if v_household_id is null then
    insert into public.households (name) values (v_household_name) returning id into v_household_id;
  end if;

  -- Profil (biasanya sudah dibuat trigger; ini memastikan nama tampil benar).
  insert into public.profiles (user_id, full_name) values
    (v_husband_id, v_husband_name),
    (v_wife_id, v_wife_name)
  on conflict (user_id) do update set full_name = excluded.full_name;

  -- Keanggotaan
  insert into public.household_members (household_id, user_id, role) values
    (v_household_id, v_husband_id, 'husband'),
    (v_household_id, v_wife_id, 'wife')
  on conflict do nothing;

  raise notice 'Household % siap. Suami: %, Istri: %', v_household_id, v_husband_id, v_wife_id;
end;
$$;

-- Verifikasi
select h.name as household, m.role, p.full_name, u.email
from public.household_members m
join public.households h on h.id = m.household_id
join auth.users u on u.id = m.user_id
left join public.profiles p on p.user_id = m.user_id
order by m.role;
