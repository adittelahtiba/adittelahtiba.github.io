// Helper umum. Tanpa dependensi.

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape teks sebelum disisipkan ke innerHTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** 250000 -> "Rp 250.000". Nilai kosong/tidak valid -> "—". */
export function formatRupiah(amount) {
  const n = Number(amount);
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(n)) return '—';
  return rupiahFormatter.format(n).replace(/ /g, ' ');
}

/** Tanggal Indonesia, mis. "Sabtu, 28 November 2026". */
export function formatDateID(date = new Date(), options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
    ...options,
  }).format(d);
}

/** Sapaan berdasarkan jam (zona waktu Asia/Jakarta). */
export function getGreeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(date),
  );
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function jakartaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Tanggal hari ini (Asia/Jakarta) format YYYY-MM-DD. */
export function todayISO(date = new Date()) {
  const { y, m, d } = jakartaParts(date);
  return `${y}-${m}-${d}`;
}

/** Bulan berjalan (Asia/Jakarta) format YYYY-MM. */
export function currentMonth(date = new Date()) {
  const { y, m } = jakartaParts(date);
  return `${y}-${m}`;
}

/** 'YYYY-MM' -> { start: 'YYYY-MM-01', next: awal bulan berikutnya } */
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const pad = (n) => String(n).padStart(2, '0');
  return { start: `${y}-${pad(m)}-01`, next: `${ny}-${pad(nm)}-01` };
}
