# Ryka & Adit — Family Management

Aplikasi web untuk Aditya (suami) dan Ryka (istri): satu household, dua akun, data keluarga bersama.
Stack: HTML/CSS/JavaScript ES Modules (vanilla) · Bootstrap 5.3 · Bootstrap Icons · Supabase (Auth, PostgreSQL, RLS) · GitHub Pages.

**Status: Tahap 2 — modul Financial.** Auth, dashboard, schema inti + RLS (tahap 1) dan modul Financial: akun, kategori, transaksi, transfer antar akun, ringkasan bulanan; kartu Saldo dan Pengeluaran di dashboard memakai data nyata. Modul lain masih placeholder dan dibangun bertahap.

## Arsitektur singkat

- `index.html` memeriksa session → `pages/dashboard.html` (login) atau `login.html` (belum login).
- Semua halaman memakai satu entry `assets/js/app.js`; perilaku dipilih lewat `<body data-page="...">`. Tidak ada inline JavaScript.
- `config.js` (URL + publishable key + base path) → `supabase.js` (client) → `auth.js` (login/logout/session/proteksi) → `app.js` (shell UI, dashboard) · `utils.js` (Rupiah, tanggal Indonesia, escape HTML).
- **Base path GitHub Pages**: semua URL dihitung dari `import.meta.url` di `config.js` (`path('pages/dashboard.html')`), jadi jalan di `localhost`, root domain, maupun `https://user.github.io/nama-repo/`. Tidak ada path root-relatif (`/assets/...`).
- **Keamanan sebenarnya ada di database (RLS)**. Proteksi halaman di JavaScript hanya UX.
  - Anggota household boleh **membaca** household, keanggotaan, dan profil pasangan.
  - `households` dan `household_members` **tidak bisa ditulis** dari frontend; dibuat via SQL Editor.
  - Profil hanya bisa diubah pemiliknya (kolom `full_name`, `avatar_url`).
  - Helper RLS (`private.is_household_member`, `private.shares_household_with`) bersifat `SECURITY DEFINER` dengan `search_path = ''` supaya policy pada `household_members` tidak rekursif; berada di schema `private` (tidak terekspos Data API), `EXECUTE` hanya untuk `authenticated`.

## Struktur

```
family-management/
├── index.html · login.html · .nojekyll
├── assets/{css/style.css, css/login.css, images/logo.svg}
├── assets/js/{config,supabase,auth,app,utils}.js
├── pages/ dashboard + 12 halaman modul
└── supabase/
    ├── migrations/001_initial_schema.sql
    ├── setup_household.sql
    └── tests/001_core_rls.test.sql
```

## 1. Setup Supabase

1. Buat project di <https://supabase.com> (disarankan satu project **development** dulu).
2. **SQL Editor** → jalankan berurutan: `001_initial_schema.sql`, `002_core_helpers.sql`, `003_financial_schema.sql` (semua aman dijalankan ulang). Jika tahap 1 sudah pernah dijalankan, cukup jalankan 002 lalu 003.
3. **Authentication → Providers → Email**: aktifkan. Matikan **Allow new users to sign up** (tidak ada pendaftaran publik).
4. **Authentication → Users → Add user**: buat dua akun (email + password, centang *Auto Confirm User*).
5. Buka `supabase/setup_household.sql`, ganti dua email placeholder dengan email akun tadi, lalu jalankan di SQL Editor. Query terakhir menampilkan verifikasi (household, role, nama, email).
6. (Opsional) Jalankan `supabase/tests/001_core_rls.test.sql` (harus `PASS T1`…`T8`) dan `supabase/tests/003_financial.test.sql` (`PASS F1`…`F6`) di database development. Semua fixture di-rollback.

## 2. Konfigurasi project URL & publishable key

Di Supabase: **Project Settings → API** (atau *API Keys*). Salin **Project URL** dan **anon / publishable key**, tempel ke `assets/js/config.js`:

```js
export const SUPABASE_URL = 'https://abcdxyz.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_...';  // atau anon key lama
```

Key publishable memang boleh ada di frontend **karena RLS aktif**. **Jangan pernah** menaruh `service_role` / secret key di repository.

## 3. Menjalankan lokal

ES Modules tidak jalan lewat `file://`; gunakan server statis:

```bash
cd family-management
python3 -m http.server 8080
# atau: npx serve .
```

Buka <http://localhost:8080/>.

## 4. Deploy ke GitHub Pages

1. Buat repository (mis. `family-management`) dan push seluruh isi folder ini (file `.nojekyll` ikut).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pilih branch `main`, folder `/ (root)`.
3. Tunggu selesai, lalu buka `https://<username>.github.io/family-management/`.
4. Di Supabase **Authentication → URL Configuration**, set **Site URL** ke alamat GitHub Pages tersebut dan tambahkan ke **Redirect URLs** (diperlukan untuk reset password di tahap berikutnya).

> Repo publik boleh berisi publishable key. Data tetap terlindungi RLS, tetapi pastikan RLS selalu aktif di setiap tabel baru.

## Reset password (tahap berikutnya)

`auth.js` sudah memiliki `sendPasswordReset(email)`. Belum ada UI karena halaman penerima tautan reset belum dibuat; sementara itu password bisa diganti dari Supabase Dashboard.

## Testing

Lihat [`TESTING.md`](TESTING.md).

## Modul Financial

- Tab **Ringkasan** (saldo per akun, pemasukan/pengeluaran/selisih per bulan, pengeluaran per kategori), **Transaksi** (filter bulan/jenis/akun, pagination, tambah/ubah/hapus, transfer antar akun), **Akun**, **Kategori** (ada tombol opsional "Buat Kategori Standar"; tidak ada data dummy).
- Saldo **tidak disimpan**: dihitung view `v_account_balances` dari saldo awal + transaksi + transfer. Transfer tidak dihitung sebagai pemasukan/pengeluaran.
- Akun/kategori yang sudah punya histori tidak bisa dihapus (nonaktifkan saja). FK komposit `(household_id, id)` mencegah tautan lintas household.
- Tabel `budgets`, `budget_allocations`, `emergency_funds(+_contributions)`, `financial_obligations`, `obligation_payments` serta view-nya sudah ada di database; UI-nya menyusul.
- Pola untuk modul berikutnya: tabel baru dengan `household_id uuid not null default private.current_household_id()`, lalu `call private.apply_household_rls('public.nama_tabel');` dan `call private.apply_updated_at(...)`.

## Tahap berikutnya

Purchasing (menambah FK `transactions.purchase_request_id`), lalu Household, Time & Schedule, dan seterusnya.
