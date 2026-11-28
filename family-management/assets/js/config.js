// Konfigurasi aplikasi. Hanya isi URL project dan PUBLISHABLE (anon) key.
// JANGAN PERNAH menaruh service_role / secret key di file ini.

export const SUPABASE_URL = 'https://akzaqdvwfkupzccxasga.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nD3_yCBmud3w4sW2Io1tJA__5u-3-oM';

export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR-');

// Base path dihitung dari lokasi file ini (assets/js/config.js -> root proyek),
// sehingga bekerja di localhost, root domain, maupun subpath GitHub Pages
// (https://user.github.io/nama-repo/).
export const BASE_URL = new URL('../../', import.meta.url);
export const path = (relative) => new URL(relative, BASE_URL).href;

export const FAMILY_LABEL = 'Ryka & Adit Family';
export const APP_NAME = 'Ryka & Adit — Family Management';
export const ROLE_LABELS = { husband: 'Suami', wife: 'Istri' };

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', href: 'pages/dashboard.html', desc: 'Ringkasan keluarga' },
  { key: 'financial', label: 'Financial', icon: 'bi-wallet2', href: 'pages/financial.html', desc: 'Pemasukan, pengeluaran, anggaran, dana darurat' },
  { key: 'purchasing', label: 'Purchasing', icon: 'bi-bag-check', href: 'pages/purchasing.html', desc: 'Permintaan dan prioritas pembelian' },
  { key: 'household', label: 'Household', icon: 'bi-house-heart', href: 'pages/household.html', desc: 'Tugas rumah, inventaris, perawatan' },
  { key: 'schedule', label: 'Time & Schedule', icon: 'bi-calendar-event', href: 'pages/schedule.html', desc: 'Agenda, milestone, target keluarga' },
  { key: 'spiritual', label: 'Spiritual', icon: 'bi-moon-stars', href: 'pages/spiritual.html', desc: 'Target dan aktivitas ibadah' },
  { key: 'health', label: 'Health', icon: 'bi-heart-pulse', href: 'pages/health.html', desc: 'Aktivitas dan jadwal kesehatan' },
  { key: 'family-social', label: 'Family & Social', icon: 'bi-people', href: 'pages/family-social.html', desc: 'Keluarga besar dan kegiatan sosial' },
  { key: 'career', label: 'Career', icon: 'bi-briefcase', href: 'pages/career.html', desc: 'Karier dan pengembangan diri' },
  { key: 'parenting', label: 'Parenting', icon: 'bi-balloon-heart', href: 'pages/parenting.html', desc: 'Persiapan dan perencanaan parenting' },
  { key: 'risk', label: 'Risk', icon: 'bi-shield-exclamation', href: 'pages/risk.html', desc: 'Daftar risiko dan mitigasi' },
  { key: 'assets-future', label: 'Asset & Future', icon: 'bi-bank', href: 'pages/assets-future.html', desc: 'Aset, rumah, investasi, tujuan masa depan' },
  { key: 'family-meeting', label: 'Family Meeting', icon: 'bi-chat-square-text', href: 'pages/family-meeting.html', desc: 'Diskusi, keputusan, evaluasi' },
];
