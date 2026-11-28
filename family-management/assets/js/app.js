// Entry point umum untuk semua halaman. Halaman memilih perilaku lewat <body data-page="...">.
import { MODULES, FAMILY_LABEL, ROLE_LABELS, APP_NAME, path } from './config.js';
import {
  requireSession,
  loadUserContext,
  signOut,
  initLoginPage,
  redirectFromIndex,
} from './auth.js';
import { escapeHtml, getGreeting, formatDateID, formatRupiah } from './utils.js';
import { showToast, loadingState, emptyState, pageHeader } from './ui.js';
import { getDashboardFinancial } from './data/financial.js';
import { renderFinancial } from './modules/financial.js';

export { showToast, loadingState, emptyState, pageHeader };

/* ---------- Shell (sidebar, topbar, offcanvas, bottom nav) ---------- */

const navList = (active) =>
  MODULES.map(
    (m) => `<a class="nav-link-item ${m.key === active ? 'active' : ''}" href="${path(m.href)}"${
      m.key === active ? ' aria-current="page"' : ''
    }><i class="bi ${m.icon}"></i><span>${escapeHtml(m.label)}</span></a>`,
  ).join('');

const brand = () =>
  `<a class="brand" href="${path('pages/dashboard.html')}"><img src="${path('assets/images/logo.svg')}" alt="" width="40" height="40"><span><strong>Ryka &amp; Adit</strong><small>Family Management</small></span></a>`;

const userBox = (ctx) => `<div class="user-box">
  <div class="user-avatar">${escapeHtml(ctx.displayName.charAt(0).toUpperCase())}</div>
  <div class="user-meta"><div class="user-name">${escapeHtml(ctx.displayName)}</div>
  <div class="user-role">${escapeHtml(ROLE_LABELS[ctx.role] ?? 'Belum terhubung')}</div></div>
  <button class="btn btn-sm btn-outline-light" type="button" data-action="logout" title="Keluar" aria-label="Keluar"><i class="bi bi-box-arrow-right"></i></button>
</div>`;

function renderShell(active, ctx) {
  const current = MODULES.find((m) => m.key === active);
  const bottom = ['dashboard', 'financial', 'schedule', 'household']
    .map((key) => MODULES.find((m) => m.key === key))
    .map(
      (m) => `<a class="bottom-link ${m.key === active ? 'active' : ''}" href="${path(m.href)}"><i class="bi ${m.icon}"></i><span>${escapeHtml(
        m.label.split(' ')[0],
      )}</span></a>`,
    )
    .join('');

  document.getElementById('app').innerHTML = `
  <div class="app-shell">
    <aside class="sidebar d-none d-lg-flex">
      ${brand()}
      <nav class="sidebar-nav" aria-label="Navigasi utama">${navList(active)}</nav>
      ${userBox(ctx)}
    </aside>
    <div class="main-wrap">
      <header class="topbar">
        <button class="btn btn-icon d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#navOffcanvas" aria-controls="navOffcanvas" aria-label="Buka menu"><i class="bi bi-list"></i></button>
        <div class="topbar-title">${escapeHtml(current?.label ?? 'Family Management')}</div>
        <div class="topbar-date d-none d-md-block">${escapeHtml(formatDateID())}</div>
      </header>
      <main id="pageContent" class="page-content"></main>
    </div>
    <nav class="bottom-nav d-lg-none" aria-label="Navigasi cepat">${bottom}
      <button class="bottom-link" type="button" data-bs-toggle="offcanvas" data-bs-target="#navOffcanvas" aria-label="Menu lengkap"><i class="bi bi-grid-3x3-gap"></i><span>Menu</span></button>
    </nav>
    <div class="offcanvas offcanvas-start sidebar-offcanvas" tabindex="-1" id="navOffcanvas" aria-labelledby="navOffcanvasLabel">
      <div class="offcanvas-header"><span id="navOffcanvasLabel" class="visually-hidden">Menu</span>${brand()}
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Tutup"></button></div>
      <div class="offcanvas-body d-flex flex-column p-0"><nav class="sidebar-nav" aria-label="Navigasi utama">${navList(active)}</nav>${userBox(ctx)}</div>
    </div>
  </div>
  <div class="toast-container position-fixed top-0 end-0 p-3" id="toastContainer"></div>`;

  document.title = `${current?.label ?? 'Halaman'} · ${APP_NAME}`;
  document.querySelectorAll('[data-action="logout"]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await signOut();
    }),
  );
  return document.getElementById('pageContent');
}

/* ---------- Halaman ---------- */

const SUMMARY_CARDS = [
  { key: 'balance', icon: 'bi-wallet2', label: 'Saldo', note: 'Memuat…' },
  { key: 'transactions', icon: 'bi-receipt', label: 'Pengeluaran Bulan Ini', note: 'Memuat…' },
  { key: 'events', icon: 'bi-calendar-event', label: 'Agenda Mendatang', note: 'Menunggu modul Time & Schedule' },
  { key: 'tasks', icon: 'bi-list-check', label: 'Tugas Rumah', note: 'Menunggu modul Household' },
];

function renderDashboard(root, ctx) {
  const roleLabel = ROLE_LABELS[ctx.role] ?? '—';
  const warning = ctx.membership
    ? ''
    : `<div class="alert alert-warning" role="alert"><i class="bi bi-exclamation-triangle me-2"></i>Akun ini belum terhubung ke household${
        ctx.error ? ' atau data tidak dapat dimuat' : ''
      }. Minta administrator menjalankan <code>supabase/setup_household.sql</code>.</div>`;

  root.innerHTML = `
    ${warning}
    <section class="hero-card">
      <div>
        <div class="hero-greeting">${escapeHtml(getGreeting())},</div>
        <h1 class="hero-name">${escapeHtml(ctx.displayName)}</h1>
        <div class="hero-meta">
          <span class="badge badge-role">${escapeHtml(roleLabel)}</span>
          <span><i class="bi bi-house-heart me-1"></i>${escapeHtml(ctx.householdName ?? FAMILY_LABEL)}</span>
        </div>
      </div>
      <div class="hero-date d-none d-md-block">${escapeHtml(formatDateID())}</div>
    </section>

    <section class="row g-3 mb-4" aria-label="Ringkasan">
      ${SUMMARY_CARDS.map(
        (c) => `<div class="col-6 col-xl-3"><div class="card stat-card h-100"><div class="card-body">
          <div class="stat-icon"><i class="bi ${c.icon}"></i></div>
          <div class="stat-label">${escapeHtml(c.label)}</div>
          <div class="stat-value" data-value="${c.key}">—</div>
          <div class="stat-note" data-note="${c.key}">${escapeHtml(c.note)}</div></div></div></div>`,
      ).join('')}
    </section>

    <section class="mb-4" aria-label="Akses cepat">
      <h2 class="section-title">Akses Cepat</h2>
      <div class="row g-3">
        ${MODULES.filter((m) => m.key !== 'dashboard')
          .map(
            (m) => `<div class="col-6 col-md-4 col-xl-3"><a class="card quick-card h-100" href="${path(m.href)}"><div class="card-body">
              <i class="bi ${m.icon} quick-icon"></i><div class="quick-title">${escapeHtml(m.label)}</div>
              <div class="quick-desc">${escapeHtml(m.desc)}</div></div></a></div>`,
          )
          .join('')}
      </div>
    </section>

    <section aria-label="Aktivitas">
      <h2 class="section-title">Aktivitas Terbaru</h2>
      <div class="card"><div class="card-body">${emptyState({
        icon: 'bi-clock-history',
        title: 'Belum ada aktivitas',
        text: 'Riwayat aktivitas keluarga akan tampil di sini setelah modul-modul diimplementasikan.',
      })}</div></div>
    </section>`;
}

async function fillDashboardFinancial(root) {
  const set = (key, value, note) => {
    const v = root.querySelector(`[data-value="${key}"]`);
    const n = root.querySelector(`[data-note="${key}"]`);
    if (v) v.textContent = value;
    if (n) n.textContent = note;
  };
  try {
    const f = await getDashboardFinancial();
    set('balance', f.hasAccounts ? formatRupiah(f.totalBalance) : '—', f.hasAccounts ? 'Total semua akun aktif' : 'Belum ada akun');
    set('transactions', formatRupiah(f.expense), `${f.count} transaksi bulan ini`);
  } catch (error) {
    console.error(error);
    set('balance', '—', 'Tidak dapat dimuat');
    set('transactions', '—', 'Tidak dapat dimuat');
  }
}

function renderModulePlaceholder(root, key) {
  const mod = MODULES.find((m) => m.key === key);
  root.innerHTML = `${pageHeader(mod.label, mod.desc)}
    <div class="card"><div class="card-body">${emptyState({
      icon: mod.icon,
      title: `Modul ${mod.label} belum diimplementasikan`,
      text: 'Modul ini akan dibangun pada tahap pengembangan berikutnya.',
      actionHtml: `<a class="btn btn-navy" href="${path('pages/dashboard.html')}"><i class="bi bi-arrow-left me-1"></i>Kembali ke Dashboard</a>`,
    })}</div></div>`;
}

async function bootProtectedPage(page) {
  const app = document.getElementById('app');
  app.innerHTML = loadingState('Memeriksa sesi…');

  const session = await requireSession();
  if (!session) return;

  const ctx = await loadUserContext(session);
  const root = renderShell(page, ctx);

  if (page === 'dashboard') {
    renderDashboard(root, ctx);
    if (ctx.membership) fillDashboardFinancial(root);
  } else if (!ctx.membership) {
    root.innerHTML = emptyState({
      icon: 'bi-person-exclamation',
      title: 'Akun belum terhubung ke household',
      text: 'Minta administrator menjalankan supabase/setup_household.sql.',
    });
  } else if (page === 'financial') await renderFinancial(root, ctx);
  else if (MODULES.some((m) => m.key === page)) renderModulePlaceholder(root, page);
  else root.innerHTML = emptyState({ icon: 'bi-question-circle', title: 'Halaman tidak ditemukan' });
}

/* ---------- Dispatcher ---------- */

async function main() {
  const page = document.body.dataset.page;
  try {
    if (page === 'login') await initLoginPage();
    else if (page === 'index') await redirectFromIndex();
    else await bootProtectedPage(page);
  } catch (error) {
    console.error(error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = emptyState({
        icon: 'bi-exclamation-octagon',
        title: 'Terjadi kesalahan',
        text: 'Halaman tidak dapat dimuat. Muat ulang atau coba lagi nanti.',
        actionHtml: `<a class="btn btn-navy" href="${path('login.html')}">Ke halaman login</a>`,
      });
    }
  }
}

main();
