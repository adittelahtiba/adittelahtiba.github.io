-- =============================================================================
-- 003_financial.test.sql — Uji RLS, integritas, dan view modul Financial.
-- Jalankan di SQL Editor (postgres) pada database DEVELOPMENT. Di-ROLLBACK di akhir.
-- =============================================================================
begin;

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

-- Data milik H2 (dibuat admin) untuk uji isolasi.
insert into public.accounts (id, household_id, name, account_type, created_by) values
  ('c2c2c2c2-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Rek H2', 'bank', 'cccccccc-0000-0000-0000-000000000003');

-- F1: A membuat akun & kategori tanpa mengirim household_id (default) + dilihat B, tidak oleh C
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  insert into public.accounts (id, name, account_type, initial_balance)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'BCA', 'bank', 1000000),
         ('a2a2a2a2-0000-0000-0000-000000000002', 'Cash', 'cash', 0);
  insert into public.transaction_categories (id, name, type) values
    ('e1e1e1e1-0000-0000-0000-000000000001', 'Gaji', 'income'),
    ('e2e2e2e2-0000-0000-0000-000000000002', 'Belanja', 'expense');

  select count(*) into n from public.accounts where household_id = '11111111-0000-0000-0000-000000000001';
  assert n = 2, 'F1a gagal: default household_id tidak terisi';
  select count(*) into n from public.accounts where household_id = '22222222-0000-0000-0000-000000000002';
  assert n = 0, 'F1b gagal: A melihat akun H2';

  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.accounts;
  assert n = 2, 'F1c gagal: B (pasangan) harus melihat 2 akun, dapat ' || n;
  reset role;

  perform set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.accounts where household_id = '11111111-0000-0000-0000-000000000001';
  assert n = 0, 'F1d gagal: C melihat akun H1';
  reset role;
  raise notice 'PASS F1: default household_id + isolasi akun';
end $$;

-- F2: INSERT dengan household lain / created_by palsu ditolak
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  begin
    insert into public.accounts (household_id, name, account_type)
    values ('22222222-0000-0000-0000-000000000002', 'Selundupan', 'bank');
    raise exception 'F2a gagal: insert ke household lain diterima';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.accounts (name, account_type, created_by)
    values ('Spoof', 'bank', 'bbbbbbbb-0000-0000-0000-000000000002');
    raise exception 'F2b gagal: created_by palsu diterima';
  exception when insufficient_privilege then null;
  end;
  reset role;
  raise notice 'PASS F2: insert lintas household / spoof created_by ditolak';
end $$;

-- F3: Transaksi, transfer, dan view saldo
do $$
declare bal numeric; inc numeric; exp numeric;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  insert into public.transactions (account_id, category_id, transaction_type, amount, transaction_date, description) values
    ('a1a1a1a1-0000-0000-0000-000000000001', 'e1e1e1e1-0000-0000-0000-000000000001', 'income', 5000000, date '2026-11-01', 'Gaji'),
    ('a1a1a1a1-0000-0000-0000-000000000001', 'e2e2e2e2-0000-0000-0000-000000000002', 'expense', 250000, date '2026-11-02', 'Belanja');
  insert into public.account_transfers (from_account_id, to_account_id, amount, transfer_date)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'a2a2a2a2-0000-0000-0000-000000000002', 300000, date '2026-11-03');

  select current_balance into bal from public.v_account_balances where account_id = 'a1a1a1a1-0000-0000-0000-000000000001';
  assert bal = 1000000 + 5000000 - 250000 - 300000, 'F3a gagal: saldo BCA = ' || bal;
  select current_balance into bal from public.v_account_balances where account_id = 'a2a2a2a2-0000-0000-0000-000000000002';
  assert bal = 300000, 'F3b gagal: saldo Cash = ' || bal;

  select total_income, total_expense into inc, exp from public.v_monthly_cashflow where month = date '2026-11-01';
  assert inc = 5000000 and exp = 250000, 'F3c gagal: cashflow transfer ikut terhitung / salah (' || inc || ',' || exp || ')';

  reset role;
  raise notice 'PASS F3: saldo & cashflow benar, transfer tidak dihitung sebagai pemasukan/pengeluaran';
end $$;

-- F4: Integritas data
do $$
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  begin  -- akun milik household lain
    insert into public.transactions (account_id, transaction_type, amount)
    values ('c2c2c2c2-0000-0000-0000-000000000002', 'expense', 1000);
    raise exception 'F4a gagal: akun household lain diterima';
  exception when foreign_key_violation then null;
  end;
  begin  -- tipe kategori tidak cocok
    insert into public.transactions (account_id, category_id, transaction_type, amount)
    values ('a1a1a1a1-0000-0000-0000-000000000001', 'e1e1e1e1-0000-0000-0000-000000000001', 'expense', 1000);
    raise exception 'F4b gagal: tipe kategori tidak cocok diterima';
  exception when check_violation then null;
  end;
  begin  -- nominal <= 0
    insert into public.transactions (account_id, transaction_type, amount)
    values ('a1a1a1a1-0000-0000-0000-000000000001', 'expense', 0);
    raise exception 'F4c gagal: amount 0 diterima';
  exception when check_violation then null;
  end;
  begin  -- transfer ke akun yang sama
    insert into public.account_transfers (from_account_id, to_account_id, amount)
    values ('a1a1a1a1-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000001', 1000);
    raise exception 'F4d gagal: transfer ke akun sama diterima';
  exception when check_violation then null;
  end;
  begin  -- hapus akun yang punya histori
    delete from public.accounts where id = 'a1a1a1a1-0000-0000-0000-000000000001';
    raise exception 'F4e gagal: akun berhistori terhapus';
  exception when foreign_key_violation then null;
  end;
  begin  -- hapus kategori yang punya histori
    delete from public.transaction_categories where id = 'e2e2e2e2-0000-0000-0000-000000000002';
    raise exception 'F4f gagal: kategori berhistori terhapus';
  exception when foreign_key_violation then null;
  end;

  reset role;
  raise notice 'PASS F4: constraint & integritas referensial';
end $$;

-- F5: Orang luar & anon tidak bisa menyentuh transaksi/view H1
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.transactions;           assert n = 0, 'F5a gagal: C melihat transaksi H1';
  select count(*) into n from public.v_account_balances where household_id = '11111111-0000-0000-0000-000000000001';
  assert n = 0, 'F5b gagal: C melihat saldo H1 via view';
  select count(*) into n from public.v_monthly_cashflow;     assert n = 0, 'F5c gagal: C melihat cashflow H1';
  begin
    delete from public.transactions;   -- tidak error, tetapi 0 baris terhapus
    get diagnostics n = row_count;
    assert n = 0, 'F5d gagal: C menghapus transaksi H1';
  end;
  reset role;

  set local role anon;
  begin
    perform 1 from public.transactions;
    raise exception 'F5e gagal: anon membaca transactions';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.v_account_balances;
    raise exception 'F5f gagal: anon membaca view';
  exception when insufficient_privilege then null;
  end;
  reset role;
  raise notice 'PASS F5: nonanggota & anon terisolasi';
end $$;

-- F6: Ledger dana darurat & status kewajiban (view)
do $$
declare cur numeric; rem numeric;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;

  insert into public.emergency_funds (id, name, target_amount) values ('f1f1f1f1-0000-0000-0000-000000000001', 'Dana Darurat', 10000000);
  insert into public.emergency_fund_contributions (emergency_fund_id, contribution_type, amount) values
    ('f1f1f1f1-0000-0000-0000-000000000001', 'deposit', 2000000),
    ('f1f1f1f1-0000-0000-0000-000000000001', 'withdrawal', 500000);
  select current_amount into cur from public.v_emergency_fund_progress;
  assert cur = 1500000, 'F6a gagal: saldo dana darurat = ' || cur;

  insert into public.financial_obligations (id, name, obligation_type, total_amount)
  values ('b1b1b1b1-0000-0000-0000-000000000001', 'Cicilan', 'installment', 3000000);
  insert into public.obligation_payments (obligation_id, amount) values ('b1b1b1b1-0000-0000-0000-000000000001', 1000000);
  select remaining_amount into rem from public.v_obligation_status;
  assert rem = 2000000, 'F6b gagal: sisa kewajiban = ' || rem;

  reset role;
  raise notice 'PASS F6: dana darurat & kewajiban dihitung dari ledger';
end $$;

rollback;
