// UI modul Financial: Ringkasan, Transaksi (+ transfer), Akun, Kategori.
import * as api from '../data/financial.js';
import { escapeHtml, formatRupiah, formatDateID, currentMonth, todayISO } from '../utils.js';
import { emptyState, loadingState, pageHeader, showToast, formModal, confirmDialog, dbErrorMessage } from '../ui.js';

const ACCOUNT_TYPES = { bank: 'Bank', cash: 'Tunai', e_wallet: 'E-Wallet', other: 'Lainnya' };
const TYPE_LABEL = { income: 'Pemasukan', expense: 'Pengeluaran' };

// Kategori standar (opsional, dibuat hanya jika pengguna menekan tombolnya).
const STANDARD_CATEGORIES = [
  ...['Makanan & Belanja', 'Transportasi', 'Tagihan & Utilitas', 'Rumah Tangga', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Sedekah & Donasi', 'Lainnya']
    .map((name) => ({ name, type: 'expense' })),
  ...['Gaji', 'Bonus', 'Usaha', 'Lainnya'].map((name) => ({ name, type: 'income' })),
];

const TABS = [
  { key: 'summary', label: 'Ringkasan', icon: 'bi-pie-chart' },
  { key: 'transactions', label: 'Transaksi', icon: 'bi-receipt' },
  { key: 'accounts', label: 'Akun', icon: 'bi-bank' },
  { key: 'categories', label: 'Kategori', icon: 'bi-tags' },
];

const opt = (value, label, selected = false) =>
  `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;

const errorState = (error) =>
  emptyState({
    icon: 'bi-exclamation-octagon',
    title: 'Data tidak dapat dimuat',
    text: dbErrorMessage(error),
    actionHtml: '<button class="btn btn-navy" type="button" data-action="retry"><i class="bi bi-arrow-clockwise me-1"></i>Coba lagi</button>',
  });

export async function renderFinancial(root, ctx) {
  const state = {
    tab: 'summary',
    month: currentMonth(),
    filter: { type: '', accountId: '' },
    page: 1,
    pageSize: 20,
    accounts: [],
    balances: [],
    categories: [],
    members: [],
  };

  root.innerHTML = `${pageHeader('Financial', 'Pemasukan, pengeluaran, akun, dan kondisi keuangan keluarga.')}
    <ul class="nav nav-pills fin-tabs mb-3" id="finTabs">
      ${TABS.map((t) => `<li class="nav-item"><button class="nav-link" type="button" data-tab="${t.key}"><i class="bi ${t.icon} me-1"></i>${t.label}</button></li>`).join('')}
    </ul>
    <div id="finBody"></div>`;
  const body = root.querySelector('#finBody');
  const tabs = root.querySelector('#finTabs');

  /* ---------- util ---------- */
  const activeAccounts = () => state.accounts.filter((a) => a.is_active);
  const accountName = (id) => state.accounts.find((a) => a.id === id)?.name ?? '—';
  const categoryName = (id) => (id ? state.categories.find((c) => c.id === id)?.name ?? '—' : 'Tanpa kategori');
  const memberName = (id) => state.members.find((m) => m.user_id === id)?.full_name ?? '—';
  const fmtDate = (d) => formatDateID(d, { weekday: undefined, month: 'short' });

  async function loadRefs() {
    const [accounts, balances, categories, members] = await Promise.all([
      api.listAccounts(), api.listBalances(), api.listCategories(), api.listMembers(),
    ]);
    Object.assign(state, { accounts, balances, categories, members });
  }

  const monthInput = (id) =>
    `<input type="month" class="form-control" id="${id}" value="${escapeHtml(state.month)}" aria-label="Bulan" required>`;

  async function reloadAll() {
    try {
      await loadRefs();
    } catch (error) {
      showToast(dbErrorMessage(error), 'danger');
    }
    await show();
  }

  /* ---------- tab router ---------- */
  async function show() {
    tabs.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
    body.innerHTML = loadingState();
    const renderers = { summary: renderSummary, transactions: renderTransactions, accounts: renderAccounts, categories: renderCategories };
    try {
      await renderers[state.tab]();
    } catch (error) {
      body.innerHTML = errorState(error);
    }
  }
  body.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="retry"]')) reloadAll();
  });
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn || btn.dataset.tab === state.tab) return;
    state.tab = btn.dataset.tab;
    state.page = 1;
    show();
  });

  /* ---------- Ringkasan ---------- */
  async function renderSummary() {
    const [cash, byCategory] = await Promise.all([api.getMonthlyCashflow(state.month), api.getExpenseByCategory(state.month)]);
    const active = state.balances.filter((b) => b.is_active);
    const total = active.reduce((s, b) => s + Number(b.current_balance), 0);
    const net = cash.income - cash.expense;
    const expenseTotal = byCategory.reduce((s, r) => s + Number(r.total_amount), 0);

    const stat = (icon, label, value, cls = '') =>
      `<div class="col-6 col-xl-3"><div class="card stat-card h-100"><div class="card-body">
        <div class="stat-icon"><i class="bi ${icon}"></i></div><div class="stat-label">${label}</div>
        <div class="stat-value ${cls}">${escapeHtml(value)}</div></div></div></div>`;

    body.innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <label class="fw-bold me-1" for="sumMonth">Periode</label><div style="max-width:200px">${monthInput('sumMonth')}</div>
      </div>
      <div class="row g-3 mb-4">
        ${stat('bi-wallet2', 'Total Saldo (akun aktif)', active.length ? formatRupiah(total) : '—')}
        ${stat('bi-arrow-down-circle', 'Pemasukan', formatRupiah(cash.income), 'text-success')}
        ${stat('bi-arrow-up-circle', 'Pengeluaran', formatRupiah(cash.expense), 'text-danger')}
        ${stat('bi-calculator', 'Selisih', formatRupiah(net), net < 0 ? 'text-danger' : '')}
      </div>
      <div class="row g-3">
        <div class="col-lg-6"><div class="card h-100"><div class="card-body">
          <h2 class="section-title">Saldo per Akun</h2>
          ${active.length
            ? `<ul class="list-group list-group-flush">${active.map((b) => `<li class="list-group-item d-flex justify-content-between px-0">
                <span>${escapeHtml(b.name)} <small class="text-muted">${escapeHtml(ACCOUNT_TYPES[b.account_type] ?? '')}</small></span>
                <strong>${escapeHtml(formatRupiah(b.current_balance))}</strong></li>`).join('')}</ul>`
            : emptyState({ icon: 'bi-bank', title: 'Belum ada akun', text: 'Tambahkan akun (bank, tunai, e-wallet) di tab Akun.' })}
        </div></div></div>
        <div class="col-lg-6"><div class="card h-100"><div class="card-body">
          <h2 class="section-title">Pengeluaran per Kategori</h2>
          ${byCategory.length
            ? byCategory.map((r) => {
                const pct = expenseTotal ? (Number(r.total_amount) / expenseTotal) * 100 : 0;
                return `<div class="mb-3"><div class="d-flex justify-content-between small"><span>${escapeHtml(categoryName(r.category_id))}</span>
                  <span>${escapeHtml(formatRupiah(r.total_amount))} · ${pct.toFixed(0)}%</span></div>
                  <div class="progress" style="height:8px"><div class="progress-bar bg-gold" style="width:${pct.toFixed(1)}%"></div></div></div>`;
              }).join('')
            : emptyState({ icon: 'bi-pie-chart', title: 'Belum ada pengeluaran', text: 'Tidak ada pengeluaran pada periode ini.' })}
        </div></div></div>
      </div>`;

    body.querySelector('#sumMonth').addEventListener('change', (e) => {
      if (!e.target.value) return;
      state.month = e.target.value;
      show();
    });
  }

  /* ---------- Transaksi ---------- */
  async function renderTransactions() {
    body.innerHTML = `
      <div class="card mb-3"><div class="card-body"><div class="row g-2 align-items-end">
        <div class="col-6 col-md-3"><label class="form-label small mb-1" for="txMonth">Bulan</label>${monthInput('txMonth')}</div>
        <div class="col-6 col-md-3"><label class="form-label small mb-1" for="txType">Jenis</label>
          <select class="form-select" id="txType">${opt('', 'Semua', !state.filter.type)}${opt('income', 'Pemasukan', state.filter.type === 'income')}${opt('expense', 'Pengeluaran', state.filter.type === 'expense')}</select></div>
        <div class="col-12 col-md-3"><label class="form-label small mb-1" for="txAccount">Akun</label>
          <select class="form-select" id="txAccount">${opt('', 'Semua akun', !state.filter.accountId)}${state.accounts.map((a) => opt(a.id, a.name, state.filter.accountId === a.id)).join('')}</select></div>
        <div class="col-12 col-md-3 d-flex gap-2 justify-content-md-end">
          <button class="btn btn-navy" type="button" data-action="add-tx"><i class="bi bi-plus-lg me-1"></i>Transaksi</button>
          <button class="btn btn-outline-secondary" type="button" data-action="add-transfer"><i class="bi bi-arrow-left-right me-1"></i>Transfer</button>
        </div></div></div></div>
      <div id="txList"></div>`;

    body.querySelector('#txMonth').addEventListener('change', (e) => { if (e.target.value) { state.month = e.target.value; state.page = 1; loadTransactions(); } });
    body.querySelector('#txType').addEventListener('change', (e) => { state.filter.type = e.target.value; state.page = 1; loadTransactions(); });
    body.querySelector('#txAccount').addEventListener('change', (e) => { state.filter.accountId = e.target.value; state.page = 1; loadTransactions(); });
    body.querySelector('[data-action="add-tx"]').addEventListener('click', () => openTransactionForm());
    body.querySelector('[data-action="add-transfer"]').addEventListener('click', () => openTransferForm());
    await loadTransactions();
  }

  async function loadTransactions() {
    const list = body.querySelector('#txList');
    if (!list) return;
    list.innerHTML = loadingState();
    try {
      const [{ rows, count }, transfers] = await Promise.all([
        api.listTransactions({ month: state.month, ...state.filter, page: state.page, pageSize: state.pageSize }),
        api.listTransfers(state.month),
      ]);
      const pages = Math.max(1, Math.ceil(count / state.pageSize));

      const txTable = rows.length
        ? `<div class="table-responsive"><table class="table align-middle mb-0">
            <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Akun</th><th class="text-end">Nominal</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>${rows.map((t) => `<tr>
              <td class="text-nowrap">${escapeHtml(fmtDate(t.transaction_date))}</td>
              <td>${escapeHtml(t.description || '—')}</td>
              <td>${escapeHtml(categoryName(t.category_id))}</td>
              <td>${escapeHtml(accountName(t.account_id))}</td>
              <td class="text-end text-nowrap fw-bold ${t.transaction_type === 'income' ? 'text-success' : 'text-danger'}">${t.transaction_type === 'income' ? '+' : '−'} ${escapeHtml(formatRupiah(t.amount))}</td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit-tx" data-id="${escapeHtml(t.id)}" aria-label="Ubah"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" type="button" data-action="delete-tx" data-id="${escapeHtml(t.id)}" aria-label="Hapus"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table></div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <small class="text-muted">${count} transaksi · halaman ${state.page}/${pages}</small>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" type="button" data-action="prev" ${state.page <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
              <button class="btn btn-sm btn-outline-secondary" type="button" data-action="next" ${state.page >= pages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div></div>`
        : emptyState({
            icon: 'bi-receipt',
            title: 'Belum ada transaksi',
            text: activeAccounts().length ? 'Tidak ada transaksi untuk filter ini.' : 'Tambahkan minimal satu akun di tab Akun sebelum mencatat transaksi.',
          });

      const transferTable = transfers.length
        ? `<h2 class="section-title mt-4">Transfer Antar Akun</h2><div class="card"><div class="table-responsive"><table class="table align-middle mb-0">
            <thead><tr><th>Tanggal</th><th>Dari</th><th>Ke</th><th>Keterangan</th><th class="text-end">Nominal</th><th class="text-end">Aksi</th></tr></thead>
            <tbody>${transfers.map((x) => `<tr><td class="text-nowrap">${escapeHtml(fmtDate(x.transfer_date))}</td>
              <td>${escapeHtml(accountName(x.from_account_id))}</td><td>${escapeHtml(accountName(x.to_account_id))}</td>
              <td>${escapeHtml(x.description || '—')}</td><td class="text-end text-nowrap fw-bold">${escapeHtml(formatRupiah(x.amount))}</td>
              <td class="text-end"><button class="btn btn-sm btn-outline-danger" type="button" data-action="delete-transfer" data-id="${escapeHtml(x.id)}" aria-label="Hapus transfer"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table></div></div>`
        : '';

      list.innerHTML = `<div class="card"><div class="card-body">${txTable}</div></div>${transferTable}`;

      list.onclick = async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === 'prev') { state.page -= 1; loadTransactions(); }
        else if (action === 'next') { state.page += 1; loadTransactions(); }
        else if (action === 'edit-tx') openTransactionForm(rows.find((r) => r.id === id));
        else if (action === 'delete-tx') {
          if (await confirmDialog({ title: 'Hapus transaksi?', text: 'Saldo akun akan menyesuaikan. Tindakan ini tidak dapat dibatalkan.' })) {
            try { await api.deleteTransaction(id); showToast('Transaksi dihapus.'); await reloadAll(); } catch (err) { showToast(dbErrorMessage(err), 'danger'); }
          }
        } else if (action === 'delete-transfer') {
          if (await confirmDialog({ title: 'Hapus transfer?', text: 'Saldo kedua akun akan menyesuaikan.' })) {
            try { await api.deleteTransfer(id); showToast('Transfer dihapus.'); await reloadAll(); } catch (err) { showToast(dbErrorMessage(err), 'danger'); }
          }
        }
      };
    } catch (error) {
      list.innerHTML = errorState(error);
    }
  }

  const categoryOptions = (type, selectedId) =>
    opt('', 'Tanpa kategori', !selectedId) +
    state.categories.filter((c) => c.type === type && (c.is_active || c.id === selectedId)).map((c) => opt(c.id, c.name, c.id === selectedId)).join('');

  function openTransactionForm(tx = null) {
    if (!activeAccounts().length && !tx) {
      showToast('Tambahkan akun terlebih dahulu di tab Akun.', 'warning');
      return;
    }
    const type = tx?.transaction_type ?? 'expense';
    const accountOptions = state.accounts.filter((a) => a.is_active || a.id === tx?.account_id).map((a) => opt(a.id, a.name, a.id === tx?.account_id)).join('');
    const { form } = formModal({
      title: tx ? 'Ubah Transaksi' : 'Tambah Transaksi',
      bodyHtml: `
        <div class="mb-3"><label class="form-label" for="fType">Jenis</label>
          <select class="form-select" id="fType" name="transaction_type" required>${opt('expense', 'Pengeluaran', type === 'expense')}${opt('income', 'Pemasukan', type === 'income')}</select></div>
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="fAmount">Nominal (Rp)</label>
            <input class="form-control" id="fAmount" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${escapeHtml(tx?.amount ?? '')}" required>
            <div class="invalid-feedback">Nominal harus lebih dari 0.</div></div>
          <div class="col-sm-6"><label class="form-label" for="fDate">Tanggal</label>
            <input class="form-control" id="fDate" name="transaction_date" type="date" value="${escapeHtml(tx?.transaction_date ?? todayISO())}" required></div></div>
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="fAccount">Akun</label>
            <select class="form-select" id="fAccount" name="account_id" required>${accountOptions}</select></div>
          <div class="col-sm-6"><label class="form-label" for="fCategory">Kategori</label>
            <select class="form-select" id="fCategory" name="category_id">${categoryOptions(type, tx?.category_id)}</select></div></div>
        <div class="mb-1"><label class="form-label" for="fDesc">Keterangan</label>
          <input class="form-control" id="fDesc" name="description" maxlength="200" value="${escapeHtml(tx?.description ?? '')}"></div>`,
      onSubmit: async (f) => {
        const d = new FormData(f);
        const payload = {
          transaction_type: d.get('transaction_type'),
          amount: Number(d.get('amount')),
          transaction_date: d.get('transaction_date'),
          account_id: d.get('account_id'),
          category_id: d.get('category_id') || null,
          description: d.get('description').trim() || null,
        };
        if (tx) await api.updateTransaction(tx.id, payload);
        else await api.createTransaction(payload);
        showToast(tx ? 'Transaksi diperbarui.' : 'Transaksi dicatat.');
        await reloadAll();
      },
    });
    form.querySelector('#fType').addEventListener('change', (e) => {
      form.querySelector('#fCategory').innerHTML = categoryOptions(e.target.value, null);
    });
  }

  function openTransferForm() {
    const accounts = activeAccounts();
    if (accounts.length < 2) {
      showToast('Transfer membutuhkan minimal dua akun aktif.', 'warning');
      return;
    }
    const options = (skip) => accounts.map((a) => opt(a.id, a.name)).join('');
    formModal({
      title: 'Transfer Antar Akun',
      bodyHtml: `
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="tFrom">Dari akun</label><select class="form-select" id="tFrom" name="from_account_id" required>${options()}</select></div>
          <div class="col-sm-6"><label class="form-label" for="tTo">Ke akun</label>
            <select class="form-select" id="tTo" name="to_account_id" required>${accounts.map((a, i) => opt(a.id, a.name, i === 1)).join('')}</select></div></div>
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="tAmount">Nominal (Rp)</label>
            <input class="form-control" id="tAmount" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required>
            <div class="invalid-feedback">Nominal harus lebih dari 0.</div></div>
          <div class="col-sm-6"><label class="form-label" for="tDate">Tanggal</label>
            <input class="form-control" id="tDate" name="transfer_date" type="date" value="${todayISO()}" required></div></div>
        <div class="mb-1"><label class="form-label" for="tDesc">Keterangan</label><input class="form-control" id="tDesc" name="description" maxlength="200"></div>
        <p class="small text-muted mt-3 mb-0">Transfer tidak dihitung sebagai pemasukan atau pengeluaran keluarga.</p>`,
      submitLabel: 'Transfer',
      onSubmit: async (f) => {
        const d = new FormData(f);
        if (d.get('from_account_id') === d.get('to_account_id')) {
          throw Object.assign(new Error('same'), { userMessage: 'Akun asal dan tujuan tidak boleh sama.' });
        }
        await api.createTransfer({
          from_account_id: d.get('from_account_id'),
          to_account_id: d.get('to_account_id'),
          amount: Number(d.get('amount')),
          transfer_date: d.get('transfer_date'),
          description: d.get('description').trim() || null,
        });
        showToast('Transfer dicatat.');
        await reloadAll();
      },
    });
  }

  /* ---------- Akun ---------- */
  async function renderAccounts() {
    const balanceOf = (id) => state.balances.find((b) => b.account_id === id)?.current_balance;
    body.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="section-title mb-0">Daftar Akun</h2>
        <button class="btn btn-navy" type="button" data-action="add-account"><i class="bi bi-plus-lg me-1"></i>Tambah Akun</button></div>
      <div class="card"><div class="card-body">${state.accounts.length
        ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Nama</th><th>Jenis</th><th>Pemilik</th>
            <th class="text-end">Saldo Saat Ini</th><th>Status</th><th class="text-end">Aksi</th></tr></thead><tbody>
            ${state.accounts.map((a) => `<tr><td class="fw-bold">${escapeHtml(a.name)}</td><td>${escapeHtml(ACCOUNT_TYPES[a.account_type])}</td>
              <td>${escapeHtml(a.owner_id ? memberName(a.owner_id) : 'Bersama')}</td>
              <td class="text-end">${escapeHtml(formatRupiah(balanceOf(a.id)))}</td>
              <td>${a.is_active ? '<span class="badge text-bg-success">Aktif</span>' : '<span class="badge text-bg-secondary">Nonaktif</span>'}</td>
              <td class="text-end"><button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit-account" data-id="${escapeHtml(a.id)}" aria-label="Ubah"><i class="bi bi-pencil"></i></button></td></tr>`).join('')}
            </tbody></table></div>`
        : emptyState({ icon: 'bi-bank', title: 'Belum ada akun', text: 'Tambahkan rekening bank, dompet tunai, atau e-wallet untuk mulai mencatat transaksi.' })}</div></div>`;

    body.querySelector('[data-action="add-account"]').addEventListener('click', () => openAccountForm());
    body.querySelectorAll('[data-action="edit-account"]').forEach((btn) =>
      btn.addEventListener('click', () => openAccountForm(state.accounts.find((a) => a.id === btn.dataset.id))));
  }

  function openAccountForm(account = null) {
    formModal({
      title: account ? 'Ubah Akun' : 'Tambah Akun',
      bodyHtml: `
        <div class="mb-3"><label class="form-label" for="aName">Nama akun</label>
          <input class="form-control" id="aName" name="name" maxlength="80" placeholder="mis. BCA, Cash, GoPay" value="${escapeHtml(account?.name ?? '')}" required>
          <div class="invalid-feedback">Nama akun wajib diisi.</div></div>
        <div class="row g-3 mb-3">
          <div class="col-sm-6"><label class="form-label" for="aType">Jenis</label>
            <select class="form-select" id="aType" name="account_type" required>${Object.entries(ACCOUNT_TYPES).map(([v, l]) => opt(v, l, account?.account_type === v)).join('')}</select></div>
          <div class="col-sm-6"><label class="form-label" for="aOwner">Pemilik</label>
            <select class="form-select" id="aOwner" name="owner_id">${opt('', 'Bersama', !account?.owner_id)}${state.members.map((m) => opt(m.user_id, m.full_name ?? 'Tanpa nama', account?.owner_id === m.user_id)).join('')}</select></div></div>
        <div class="mb-3"><label class="form-label" for="aBalance">Saldo awal (Rp)</label>
          <input class="form-control" id="aBalance" name="initial_balance" type="number" step="0.01" inputmode="decimal" value="${escapeHtml(account?.initial_balance ?? 0)}" required>
          ${account ? '<div class="form-text">Mengubah saldo awal ikut mengubah saldo saat ini.</div>' : ''}</div>
        ${account ? `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="aActive" name="is_active" ${account.is_active ? 'checked' : ''}>
          <label class="form-check-label" for="aActive">Akun aktif</label></div>` : ''}`,
      onSubmit: async (f) => {
        const d = new FormData(f);
        const payload = {
          name: d.get('name').trim(),
          account_type: d.get('account_type'),
          owner_id: d.get('owner_id') || null,
          initial_balance: Number(d.get('initial_balance') || 0),
        };
        if (account) {
          payload.is_active = f.querySelector('#aActive').checked;
          await api.updateAccount(account.id, payload);
        } else {
          await api.createAccount(payload);
        }
        showToast(account ? 'Akun diperbarui.' : 'Akun ditambahkan.');
        await reloadAll();
      },
    });
  }

  /* ---------- Kategori ---------- */
  async function renderCategories() {
    const column = (type) => {
      const items = state.categories.filter((c) => c.type === type);
      return `<div class="col-md-6"><div class="card h-100"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2"><h2 class="section-title mb-0">${TYPE_LABEL[type]}</h2>
          <button class="btn btn-sm btn-outline-secondary" type="button" data-action="add-category" data-type="${type}"><i class="bi bi-plus-lg me-1"></i>Tambah</button></div>
        ${items.length
          ? `<ul class="list-group list-group-flush">${items.map((c) => `<li class="list-group-item d-flex justify-content-between align-items-center px-0">
              <span class="${c.is_active ? '' : 'text-muted text-decoration-line-through'}">${escapeHtml(c.name)}</span>
              <button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit-category" data-id="${escapeHtml(c.id)}" aria-label="Ubah"><i class="bi bi-pencil"></i></button></li>`).join('')}</ul>`
          : '<p class="text-muted mb-0">Belum ada kategori.</p>'}
      </div></div></div>`;
    };

    body.innerHTML = `${state.categories.length ? '' : `<div class="card mb-3"><div class="card-body">${emptyState({
        icon: 'bi-tags', title: 'Belum ada kategori',
        text: 'Buat kategori standar sebagai titik awal (bisa diubah kapan saja), atau tambahkan sendiri.',
        actionHtml: '<button class="btn btn-gold" type="button" data-action="seed-categories"><i class="bi bi-magic me-1"></i>Buat Kategori Standar</button>',
      })}</div></div>`}
      <div class="row g-3">${column('expense')}${column('income')}</div>`;

    body.querySelector('[data-action="seed-categories"]')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await api.createCategories(STANDARD_CATEGORIES);
        showToast('Kategori standar dibuat.');
        await reloadAll();
      } catch (error) {
        showToast(dbErrorMessage(error), 'danger');
        e.currentTarget.disabled = false;
      }
    });
    body.querySelectorAll('[data-action="add-category"]').forEach((b) => b.addEventListener('click', () => openCategoryForm(null, b.dataset.type)));
    body.querySelectorAll('[data-action="edit-category"]').forEach((b) =>
      b.addEventListener('click', () => openCategoryForm(state.categories.find((c) => c.id === b.dataset.id))));
  }

  function openCategoryForm(category = null, type = 'expense') {
    formModal({
      title: category ? 'Ubah Kategori' : `Tambah Kategori ${TYPE_LABEL[type]}`,
      bodyHtml: `
        <div class="mb-3"><label class="form-label" for="cName">Nama kategori</label>
          <input class="form-control" id="cName" name="name" maxlength="60" value="${escapeHtml(category?.name ?? '')}" required>
          <div class="invalid-feedback">Nama kategori wajib diisi.</div></div>
        ${category ? `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="cActive" name="is_active" ${category.is_active ? 'checked' : ''}>
          <label class="form-check-label" for="cActive">Kategori aktif</label></div>
          <p class="small text-muted mt-2 mb-0">Kategori yang sudah dipakai tidak dihapus agar histori tetap utuh; nonaktifkan saja.</p>` : ''}`,
      onSubmit: async (f) => {
        const name = new FormData(f).get('name').trim();
        if (category) await api.updateCategory(category.id, { name, is_active: f.querySelector('#cActive').checked });
        else await api.createCategories([{ name, type }]);
        showToast(category ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
        await reloadAll();
      },
    });
  }

  /* ---------- start ---------- */
  body.innerHTML = loadingState();
  try {
    await loadRefs();
  } catch (error) {
    body.innerHTML = errorState(error);
    return;
  }
  await show();
}
