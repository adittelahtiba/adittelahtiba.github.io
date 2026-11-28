-- =============================================================================
-- 001_core_rls.test.sql — Uji RLS & integritas tabel fondasi.
-- Jalankan di SQL Editor (sebagai postgres) pada database DEVELOPMENT.
-- Seluruh fixture dibuat di dalam transaksi dan di-ROLLBACK di akhir.
-- Jika ada assert gagal, eksekusi berhenti dengan error yang menjelaskan kasusnya.
-- =============================================================================
begin;

-- Fixture: A (suami) & B (istri) di H1; C (orang luar) di H2.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'test-a@example.invalid'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'test-b@example.invalid'),
  ('cccccccc-0000-0000-0000-000000000003', 'test-c@example.invalid');

insert into public.households (id, name) values
  ('11111111-0000-0000-0000-000000000001', 'TEST H1'),
  ('22222222-0000-0000-0000-000000000002', 'TEST H2');

insert into public.household_members (household_id, user_id, role) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'husband'),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'wife'),
  ('22222222-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', 'husband');

-- T1: Trigger membuat profil otomatis untuk 3 user fixture
do $$
begin
  assert (select count(*) from public.profiles where user_id in (
    'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003')) = 3,
    'T1 gagal: profil otomatis tidak terbuat';
  raise notice 'PASS T1: profil dibuat otomatis';
end $$;

-- T2: Constraint — dua suami dalam satu household ditolak
do $$
begin
  begin
    insert into public.household_members (household_id, user_id, role)
    values ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'husband');
    raise exception 'T2 gagal: role duplikat diterima';
  exception when unique_violation then
    raise notice 'PASS T2: unique (household_id, role) bekerja';
  end;
end $$;

-- T3: Anggota A hanya melihat H1, keanggotaan H1, dan profil pasangan
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  select count(*) into n from public.households;
  assert n = 1, 'T3a gagal: A harus melihat tepat 1 household, dapat ' || n;
  select count(*) into n from public.households where id = '22222222-0000-0000-0000-000000000002';
  assert n = 0, 'T3b gagal: A dapat melihat household orang lain';
  select count(*) into n from public.household_members;
  assert n = 2, 'T3c gagal: A harus melihat 2 anggota, dapat ' || n;
  select count(*) into n from public.profiles where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  assert n = 1, 'T3d gagal: A tidak dapat melihat profil pasangan';
  select count(*) into n from public.profiles where user_id = 'cccccccc-0000-0000-0000-000000000003';
  assert n = 0, 'T3e gagal: A dapat melihat profil orang luar';

  reset role;
  raise notice 'PASS T3: akses anggota A benar';
end $$;

-- T4: Orang luar C tidak melihat data H1
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
  set local role authenticated;

  select count(*) into n from public.households where id = '11111111-0000-0000-0000-000000000001';
  assert n = 0, 'T4a gagal: C melihat household H1';
  select count(*) into n from public.household_members where household_id = '11111111-0000-0000-0000-000000000001';
  assert n = 0, 'T4b gagal: C melihat anggota H1';
  select count(*) into n from public.profiles where user_id <> 'cccccccc-0000-0000-0000-000000000003';
  assert n = 0, 'T4c gagal: C melihat profil orang lain';

  reset role;
  raise notice 'PASS T4: nonanggota C terisolasi';
end $$;

-- T5: Frontend (authenticated) tidak boleh menulis households/household_members
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  begin
    insert into public.household_members (household_id, user_id, role)
    values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'wife');
    raise exception 'T5a gagal: INSERT membership diterima';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.household_members;
    raise exception 'T5b gagal: DELETE membership diterima';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.households (name) values ('hack');
    raise exception 'T5c gagal: INSERT household diterima';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.households set name = 'hack';
    raise exception 'T5d gagal: UPDATE household diterima';
  exception when insufficient_privilege then null;
  end;

  reset role;
  raise notice 'PASS T5: tulis ke households/household_members ditolak';
end $$;

-- T6: A hanya bisa mengubah profil sendiri
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  update public.profiles set full_name = 'Nama Baru A' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'T6a gagal: A tidak bisa mengubah profil sendiri';

  update public.profiles set full_name = 'Diubah A' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'T6b gagal: A dapat mengubah profil B';

  reset role;
  raise notice 'PASS T6: update profil hanya milik sendiri';
end $$;

-- T7: anon tidak punya akses sama sekali
do $$
begin
  set local role anon;
  begin
    perform 1 from public.households;
    raise exception 'T7a gagal: anon dapat membaca households';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.profiles;
    raise exception 'T7b gagal: anon dapat membaca profiles';
  exception when insufficient_privilege then null;
  end;
  reset role;
  raise notice 'PASS T7: anon ditolak';
end $$;

-- T8: helper function tidak dapat dipanggil anon
do $$
begin
  set local role anon;
  begin
    perform private.is_household_member('11111111-0000-0000-0000-000000000001');
    raise exception 'T8 gagal: anon dapat memanggil helper';
  exception when insufficient_privilege then null;
  end;
  reset role;
  raise notice 'PASS T8: helper function tertutup untuk anon';
end $$;

rollback;
