// Komponen UI reusable: toast, state, modal form, konfirmasi, pesan error database.
import { escapeHtml } from './utils.js';

export function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
  }
  const icons = { success: 'bi-check-circle', danger: 'bi-exclamation-octagon', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' };
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi ${icons[type] || icons.info} me-2"></i>${escapeHtml(message)}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
  container.appendChild(el);
  const toast = window.bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 });
  el.addEventListener('hidden.bs.toast', () => el.remove());
  toast.show();
}

export const loadingState = (text = 'Memuat…') =>
  `<div class="state-box" role="status"><div class="spinner-border text-gold" aria-hidden="true"></div><p class="mt-3 mb-0 text-muted">${escapeHtml(text)}</p></div>`;

export const emptyState = ({ icon = 'bi-inbox', title, text = '', actionHtml = '' }) =>
  `<div class="state-box"><i class="bi ${icon} state-icon"></i><h2 class="h5 mt-3">${escapeHtml(title)}</h2>
   <p class="text-muted mb-3">${escapeHtml(text)}</p>${actionHtml}</div>`;

export const pageHeader = (title, subtitle = '') =>
  `<div class="page-header"><h1 class="page-title">${escapeHtml(title)}</h1>${
    subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''
  }</div>`;

/** Pesan ramah untuk error PostgREST/Postgres. Error asli tetap dicatat ke console. */
export function dbErrorMessage(error) {
  if (error) console.error(error);
  const code = error?.code;
  const msg = String(error?.message || '');
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Anda tidak memiliki izin untuk tindakan ini.';
  if (code === '42P01' || code === 'PGRST205') return 'Tabel belum tersedia. Pastikan semua migration sudah dijalankan.';
  if (code === '23505') return 'Data dengan nama/nilai yang sama sudah ada.';
  if (code === '23503') return 'Data ini masih dipakai oleh data lain (atau referensinya tidak valid).';
  if (code === '23514') return /Tipe kategori/.test(msg) ? msg : 'Nilai yang dimasukkan tidak memenuhi aturan data.';
  if (code === '23502') return 'Ada kolom wajib yang belum diisi.';
  if (/failed to fetch|network/i.test(msg)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  return 'Terjadi kesalahan saat memproses data. Silakan coba lagi.';
}

/**
 * Modal berisi form dengan validasi Bootstrap, loading state, dan anti double-submit.
 * onSubmit(form) boleh melempar error; pesan tampil di dalam modal dan modal tetap terbuka.
 */
export function formModal({ title, bodyHtml, submitLabel = 'Simpan', size = '', onSubmit }) {
  const el = document.createElement('div');
  el.className = 'modal fade';
  el.tabIndex = -1;
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}">
    <form class="modal-content" novalidate>
      <div class="modal-header"><h2 class="modal-title h5">${escapeHtml(title)}</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>
      <div class="modal-body"><div class="alert alert-danger d-none" data-role="error" role="alert"></div>${bodyHtml}</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
        <button type="submit" class="btn btn-navy"><span class="spinner-border spinner-border-sm d-none me-2" aria-hidden="true"></span><span class="btn-label">${escapeHtml(submitLabel)}</span></button>
      </div></form></div>`;
  document.body.appendChild(el);

  const modal = window.bootstrap.Modal.getOrCreateInstance(el);
  const form = el.querySelector('form');
  const errorBox = el.querySelector('[data-role="error"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = submitBtn.querySelector('.spinner-border');
  let busy = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    errorBox.classList.add('d-none');
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    busy = true;
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      await onSubmit(form);
      modal.hide();
    } catch (error) {
      errorBox.textContent = error?.userMessage || dbErrorMessage(error);
      errorBox.classList.remove('d-none');
    } finally {
      busy = false;
      submitBtn.disabled = false;
      spinner.classList.add('d-none');
    }
  });

  el.addEventListener('hidden.bs.modal', () => {
    modal.dispose();
    el.remove();
  });
  modal.show();
  el.addEventListener('shown.bs.modal', () => form.querySelector('input:not([type=hidden]),select,textarea')?.focus(), { once: true });
  return { el, form, modal };
}

/** Dialog konfirmasi. Resolve true jika dikonfirmasi. */
export function confirmDialog({ title, text, confirmLabel = 'Hapus', confirmClass = 'btn-danger' }) {
  return new Promise((resolve) => {
    let decided = false;
    const el = document.createElement('div');
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content">
      <div class="modal-body text-center p-4"><i class="bi bi-exclamation-triangle text-warning fs-1"></i>
        <h2 class="h5 mt-2">${escapeHtml(title)}</h2><p class="text-muted mb-4">${escapeHtml(text)}</p>
        <div class="d-flex gap-2 justify-content-center">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
          <button type="button" class="btn ${confirmClass}" data-role="confirm">${escapeHtml(confirmLabel)}</button></div></div></div></div>`;
    document.body.appendChild(el);
    const modal = window.bootstrap.Modal.getOrCreateInstance(el);
    el.querySelector('[data-role="confirm"]').addEventListener('click', () => {
      decided = true;
      modal.hide();
    });
    el.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      el.remove();
      resolve(decided);
    });
    modal.show();
  });
}
