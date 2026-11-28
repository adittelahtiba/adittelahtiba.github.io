// Data access modul Financial. Tidak mengirim household_id / created_by:
// keduanya diisi default database dan divalidasi RLS.
import { supabase } from '../supabase.js';
import { monthRange, currentMonth } from '../utils.js';

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

/* ----- Akun ----- */
export const listAccounts = async () => unwrap(await supabase.from('accounts').select('*').order('name'));
export const listBalances = async () => unwrap(await supabase.from('v_account_balances').select('*').order('name'));
export const createAccount = async (payload) => unwrap(await supabase.from('accounts').insert(payload).select().single());
export const updateAccount = async (id, patch) => unwrap(await supabase.from('accounts').update(patch).eq('id', id).select().single());

/* ----- Kategori ----- */
export const listCategories = async () =>
  unwrap(await supabase.from('transaction_categories').select('*').order('type').order('name'));
export const createCategories = async (rows) => unwrap(await supabase.from('transaction_categories').insert(rows).select());
export const updateCategory = async (id, patch) =>
  unwrap(await supabase.from('transaction_categories').update(patch).eq('id', id).select().single());

/* ----- Anggota (untuk pemilik akun) ----- */
export const listMembers = async () => unwrap(await supabase.from('profiles').select('user_id, full_name').order('full_name'));

/* ----- Transaksi ----- */
export async function listTransactions({ month, type = '', accountId = '', page = 1, pageSize = 20 }) {
  const { start, next } = monthRange(month);
  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .gte('transaction_date', start)
    .lt('transaction_date', next)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (type) query = query.eq('transaction_type', type);
  if (accountId) query = query.eq('account_id', accountId);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data, count: count ?? 0 };
}
export const createTransaction = async (payload) => unwrap(await supabase.from('transactions').insert(payload).select().single());
export const updateTransaction = async (id, patch) => unwrap(await supabase.from('transactions').update(patch).eq('id', id).select().single());
export const deleteTransaction = async (id) => unwrap(await supabase.from('transactions').delete().eq('id', id));

/* ----- Transfer ----- */
export async function listTransfers(month) {
  const { start, next } = monthRange(month);
  return unwrap(
    await supabase.from('account_transfers').select('*').gte('transfer_date', start).lt('transfer_date', next)
      .order('transfer_date', { ascending: false }).order('created_at', { ascending: false }),
  );
}
export const createTransfer = async (payload) => unwrap(await supabase.from('account_transfers').insert(payload).select().single());
export const deleteTransfer = async (id) => unwrap(await supabase.from('account_transfers').delete().eq('id', id));

/* ----- Ringkasan ----- */
export async function getMonthlyCashflow(month) {
  const { start } = monthRange(month);
  const row = unwrap(await supabase.from('v_monthly_cashflow').select('*').eq('month', start).maybeSingle());
  return { income: Number(row?.total_income ?? 0), expense: Number(row?.total_expense ?? 0), count: Number(row?.transaction_count ?? 0) };
}

export async function getExpenseByCategory(month) {
  const { start } = monthRange(month);
  return unwrap(
    await supabase.from('v_monthly_category_totals').select('category_id, total_amount, transaction_count')
      .eq('month', start).eq('transaction_type', 'expense').order('total_amount', { ascending: false }),
  );
}

/** Data ringkas untuk kartu Dashboard. */
export async function getDashboardFinancial() {
  const [balances, cash] = await Promise.all([listBalances(), getMonthlyCashflow(currentMonth())]);
  const active = balances.filter((b) => b.is_active);
  return {
    hasAccounts: active.length > 0,
    totalBalance: active.reduce((sum, b) => sum + Number(b.current_balance), 0),
    ...cash,
  };
}
