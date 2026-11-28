// Autentikasi, session, dan proteksi halaman.
// CATATAN: proteksi di sisi JavaScript hanya untuk UX. Keamanan data sebenarnya
// dijamin oleh Row Level Security (RLS) di database.
import { supabase } from './supabase.js';
import { isSupabaseConfigured, path } from './config.js';

const LOGIN_URL = () => path('login.html');
const DASHBOARD_URL = () => path('pages/dashboard.html');

/** Ubah error Supabase/jaringan menjadi pesan yang ramah. */
export function friendlyAuthError(error) {
  if (!error) return 'Terjadi kesalahan. Silakan coba lagi.';
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Email atau password salah.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Hubungi administrator.';
  }
  if (error.status === 429 || code.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
  }
  if (error.name === 'AuthRetryableFetchError' || msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }
  return 'Login gagal. Silakan coba lagi.';
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session ?? null;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  location.replace(LOGIN_URL());
}

/** Dipakai semua halaman di /pages. Redirect ke login jika tidak ada session. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    location.replace(LOGIN_URL());
    return null;
  }
  // Jika sesi berakhir/logout dari tab lain, kembalikan ke login.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.replace(LOGIN_URL());
  });
  return session;
}

/** Ambil profil, keanggotaan, dan household untuk user yang login. Dibatasi RLS. */
export async function loadUserContext(session) {
  const user = session.user;
  const [profileRes, memberRes] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('household_members')
      .select('role, household_id, households ( name )')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.error ? null : profileRes.data;
  const membership = memberRes.error ? null : memberRes.data;
  const displayName =
    profile?.full_name?.trim() || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Pengguna');

  return {
    user,
    profile,
    membership,
    role: membership?.role ?? null,
    householdName: membership?.households?.name ?? null,
    displayName,
    error: profileRes.error || memberRes.error || null,
  };
}

/**
 * Struktur untuk reset password (tahap berikutnya). Belum dihubungkan ke UI
 * karena halaman tujuan (reset-password.html) belum dibuat.
 */
export async function sendPasswordReset(email) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: path('login.html'),
  });
  if (error) throw error;
}

/** Logika halaman login.html */
export async function initLoginPage() {
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const submitBtn = document.getElementById('loginSubmit');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const toggleBtn = document.getElementById('togglePassword');

  const showAlert = (text, type = 'danger') => {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = text;
    alertBox.classList.remove('d-none');
  };
  const hideAlert = () => alertBox.classList.add('d-none');

  if (!isSupabaseConfigured) {
    showAlert(
      'Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY di assets/js/config.js (lihat README).',
      'warning',
    );
    submitBtn.disabled = true;
    return;
  }

  if (await getSession()) {
    location.replace(DASHBOARD_URL());
    return;
  }

  toggleBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    toggleBtn.querySelector('i').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  let submitting = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return; // cegah double submission
    hideAlert();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.querySelector('.spinner-border').classList.remove('d-none');
    submitBtn.querySelector('.btn-label').textContent = 'Memproses…';

    try {
      await signIn(emailInput.value.trim(), passwordInput.value);
      location.replace(DASHBOARD_URL());
    } catch (error) {
      showAlert(friendlyAuthError(error));
      passwordInput.value = '';
      passwordInput.focus();
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.querySelector('.spinner-border').classList.add('d-none');
      submitBtn.querySelector('.btn-label').textContent = 'Masuk';
    }
  });
}

/** Logika index.html: arahkan sesuai status login. */
export async function redirectFromIndex() {
  if (isSupabaseConfigured && (await getSession())) {
    location.replace(DASHBOARD_URL());
  } else {
    location.replace(LOGIN_URL());
  }
}
