-- =============================================================================
-- 003_financial_schema.sql — Modul Financial: schema, RLS, trigger, view.
-- Idempotent. Prasyarat: 001, 002.
--
-- Keputusan desain:
--  * Saldo TIDAK disimpan; dihitung dari saldo awal + transaksi + transfer (view).
--  * Transfer antar akun ada di account_transfers, bukan transactions, supaya tidak
--    terhitung sebagai pemasukan/pengeluaran keluarga.
--  * FK komposit (household_id, id) menjamin referensi antartabel selalu dalam
--    household yang sama (tidak bisa menautkan ke akun/kategori household lain).
--  * Histori dipertahankan: akun/kategori yang sudah dipakai tidak bisa dihapus
--    (NO ACTION); nonaktifkan lewat is_active.
-- =============================================================================

-- ---------- accounts ----------
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null default private.current_household_id()
                    references public.households (id) on delete cascade,
  name            text not null check (length(btrim(name)) > 0),
  account_type    text not null check (account_type in ('bank', 'cash', 'e_wallet', 'other')),
  owner_id        uuid references public.profiles (user_id) on delete set null,
  initial_balance numeric(15,2) not null default 0,
  is_active       boolean not null default true,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (household_id, id),
  unique (household_id, name)
);

-- ---------- transaction_categories ----------
create table if not exists public.transaction_categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.current_household_id()
                 references public.households (id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  type         text not null check (type in ('income', 'expense')),
  icon         text,
  color        text,
  is_active    boolean not null default true,
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, id),
  unique (household_id, type, name)
);

-- ---------- transactions (income / expense) ----------
create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null default private.current_household_id()
                        references public.households (id) on delete cascade,
  account_id          uuid not null,
  category_id         uuid,
  transaction_type    text not null check (transaction_type in ('income', 'expense')),
  amount              numeric(15,2) not null check (amount > 0),
  transaction_date    date not null default current_date,
  description         text,
  purchase_request_id uuid,  -- FK ditambahkan pada migration modul Purchasing
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, account_id)  references public.accounts (household_id, id),
  foreign key (household_id, category_id) references public.transaction_categories (household_id, id)
);

create index if not exists transactions_household_date_idx on public.transactions (household_id, transaction_date desc);
create index if not exists transactions_account_idx        on public.transactions (account_id);
create index if not exists transactions_category_idx       on public.transactions (category_id);
create index if not exists transactions_type_idx           on public.transactions (household_id, transaction_type);

-- Tipe kategori harus sama dengan tipe transaksi.
create or replace function private.validate_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_type text;
begin
  if new.category_id is not null then
    select c.type into v_type
    from public.transaction_categories c
    where c.id = new.category_id and c.household_id = new.household_id;
    if v_type is distinct from new.transaction_type then
      raise exception 'Tipe kategori (%) tidak sesuai dengan tipe transaksi (%)', v_type, new.transaction_type
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_category on public.transactions;
create trigger validate_category
  before insert or update of category_id, transaction_type on public.transactions
  for each row execute function private.validate_transaction_category();

-- ---------- account_transfers ----------
create table if not exists public.account_transfers (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null default private.current_household_id()
                    references public.households (id) on delete cascade,
  from_account_id uuid not null,
  to_account_id   uuid not null,
  amount          numeric(15,2) not null check (amount > 0),
  transfer_date   date not null default current_date,
  description     text,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (household_id, id),
  check (from_account_id <> to_account_id),
  foreign key (household_id, from_account_id) references public.accounts (household_id, id),
  foreign key (household_id, to_account_id)   references public.accounts (household_id, id)
);

create index if not exists account_transfers_household_date_idx on public.account_transfers (household_id, transfer_date desc);
create index if not exists account_transfers_from_idx on public.account_transfers (from_account_id);
create index if not exists account_transfers_to_idx   on public.account_transfers (to_account_id);

-- ---------- budgets & allocations ----------
-- Total anggaran dihitung dari alokasi (lihat v_budget_progress), tidak disimpan.
create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.current_household_id()
                 references public.households (id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  period_type  text not null check (period_type in ('weekly', 'monthly', 'yearly')),
  start_date   date not null,
  end_date     date not null,
  status       text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, id),
  check (end_date >= start_date)
);

create table if not exists public.budget_allocations (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null default private.current_household_id()
                     references public.households (id) on delete cascade,
  budget_id        uuid not null,
  category_id      uuid not null,
  allocated_amount numeric(15,2) not null check (allocated_amount >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (budget_id, category_id),
  foreign key (household_id, budget_id)   references public.budgets (household_id, id) on delete cascade,
  foreign key (household_id, category_id) references public.transaction_categories (household_id, id)
);

create index if not exists budgets_household_idx on public.budgets (household_id, start_date desc);
create index if not exists budget_allocations_category_idx on public.budget_allocations (category_id);

-- ---------- emergency funds (ledger) ----------
-- Saldo dana darurat dihitung dari kontribusi (v_emergency_fund_progress).
create table if not exists public.emergency_funds (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default private.current_household_id()
                  references public.households (id) on delete cascade,
  name          text not null check (length(btrim(name)) > 0),
  target_amount numeric(15,2) not null check (target_amount >= 0),
  target_date   date,
  status        text not null default 'active' check (status in ('active', 'achieved', 'paused', 'closed')),
  notes         text,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, id)
);

create table if not exists public.emergency_fund_contributions (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null default private.current_household_id()
                      references public.households (id) on delete cascade,
  emergency_fund_id uuid not null,
  contribution_type text not null check (contribution_type in ('deposit', 'withdrawal')),
  amount            numeric(15,2) not null check (amount > 0),
  contribution_date date not null default current_date,
  notes             text,
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  foreign key (household_id, emergency_fund_id) references public.emergency_funds (household_id, id)
);

create index if not exists emergency_fund_contrib_fund_idx on public.emergency_fund_contributions (emergency_fund_id, contribution_date desc);

-- ---------- financial obligations & payments ----------
-- Sisa kewajiban dihitung dari total - pembayaran (v_obligation_status).
create table if not exists public.financial_obligations (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null default private.current_household_id()
                       references public.households (id) on delete cascade,
  name               text not null check (length(btrim(name)) > 0),
  obligation_type    text not null check (obligation_type in ('debt', 'installment', 'bill', 'other')),
  total_amount       numeric(15,2) check (total_amount >= 0),
  installment_amount numeric(15,2) check (installment_amount >= 0),
  due_date           date,
  frequency          text check (frequency in ('once', 'weekly', 'monthly', 'yearly')),
  status             text not null default 'active' check (status in ('active', 'paid', 'overdue', 'cancelled')),
  notes              text,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (household_id, id)
);

create table if not exists public.obligation_payments (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default private.current_household_id()
                  references public.households (id) on delete cascade,
  obligation_id uuid not null,
  account_id    uuid,
  transaction_id uuid,
  amount        numeric(15,2) not null check (amount > 0),
  payment_date  date not null default current_date,
  notes         text,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  foreign key (household_id, obligation_id)  references public.financial_obligations (household_id, id),
  foreign key (household_id, account_id)     references public.accounts (household_id, id),
  foreign key (household_id, transaction_id) references public.transactions (household_id, id)
);

create index if not exists obligation_payments_obligation_idx on public.obligation_payments (obligation_id, payment_date desc);

-- ---------- RLS + updated_at ----------
call private.apply_household_rls('public.accounts');
call private.apply_household_rls('public.transaction_categories');
call private.apply_household_rls('public.transactions');
call private.apply_household_rls('public.account_transfers');
call private.apply_household_rls('public.budgets');
call private.apply_household_rls('public.budget_allocations');
call private.apply_household_rls('public.emergency_funds');
call private.apply_household_rls('public.emergency_fund_contributions');
call private.apply_household_rls('public.financial_obligations');
call private.apply_household_rls('public.obligation_payments');

call private.apply_updated_at('public.accounts');
call private.apply_updated_at('public.transaction_categories');
call private.apply_updated_at('public.transactions');
call private.apply_updated_at('public.account_transfers');
call private.apply_updated_at('public.budgets');
call private.apply_updated_at('public.budget_allocations');
call private.apply_updated_at('public.emergency_funds');
call private.apply_updated_at('public.financial_obligations');

-- ---------- Views (security_invoker => RLS tabel dasar tetap berlaku) ----------
create or replace view public.v_account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.household_id,
  a.name,
  a.account_type,
  a.owner_id,
  a.is_active,
  a.initial_balance,
  a.initial_balance
    + coalesce((select sum(case t.transaction_type when 'income' then t.amount else -t.amount end)
                from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(x.amount) from public.account_transfers x where x.to_account_id = a.id), 0)
    - coalesce((select sum(x.amount) from public.account_transfers x where x.from_account_id = a.id), 0)
    as current_balance
from public.accounts a;

create or replace view public.v_monthly_cashflow
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.transaction_date)::date as month,
  coalesce(sum(t.amount) filter (where t.transaction_type = 'income'), 0)  as total_income,
  coalesce(sum(t.amount) filter (where t.transaction_type = 'expense'), 0) as total_expense,
  count(*) as transaction_count
from public.transactions t
group by t.household_id, date_trunc('month', t.transaction_date);

create or replace view public.v_monthly_category_totals
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.transaction_date)::date as month,
  t.transaction_type,
  t.category_id,
  sum(t.amount) as total_amount,
  count(*) as transaction_count
from public.transactions t
group by t.household_id, date_trunc('month', t.transaction_date), t.transaction_type, t.category_id;

create or replace view public.v_emergency_fund_progress
with (security_invoker = true) as
select
  f.id as emergency_fund_id,
  f.household_id,
  f.name,
  f.target_amount,
  f.target_date,
  f.status,
  coalesce(sum(case c.contribution_type when 'deposit' then c.amount else -c.amount end), 0) as current_amount
from public.emergency_funds f
left join public.emergency_fund_contributions c on c.emergency_fund_id = f.id
group by f.id;

create or replace view public.v_obligation_status
with (security_invoker = true) as
select
  o.id as obligation_id,
  o.household_id,
  o.name,
  o.obligation_type,
  o.total_amount,
  o.installment_amount,
  o.due_date,
  o.frequency,
  o.status,
  coalesce(sum(p.amount), 0) as total_paid,
  case when o.total_amount is null then null else greatest(o.total_amount - coalesce(sum(p.amount), 0), 0) end as remaining_amount
from public.financial_obligations o
left join public.obligation_payments p on p.obligation_id = o.id
group by o.id;

create or replace view public.v_budget_progress
with (security_invoker = true) as
select
  b.id as budget_id,
  b.household_id,
  b.name as budget_name,
  b.start_date,
  b.end_date,
  b.status,
  al.category_id,
  al.allocated_amount,
  coalesce((
    select sum(t.amount) from public.transactions t
    where t.household_id = b.household_id
      and t.category_id = al.category_id
      and t.transaction_type = 'expense'
      and t.transaction_date between b.start_date and b.end_date
  ), 0) as spent_amount
from public.budgets b
join public.budget_allocations al on al.budget_id = b.id;

revoke all on public.v_account_balances, public.v_monthly_cashflow, public.v_monthly_category_totals,
              public.v_emergency_fund_progress, public.v_obligation_status, public.v_budget_progress
  from anon, authenticated;
grant select on public.v_account_balances, public.v_monthly_cashflow, public.v_monthly_category_totals,
                public.v_emergency_fund_progress, public.v_obligation_status, public.v_budget_progress
  to authenticated;
