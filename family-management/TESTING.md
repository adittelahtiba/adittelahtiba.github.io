# Checklist Testing — Tahap 1

## A. Konfigurasi
- [ ] Sebelum `config.js` diisi: `login.html` menampilkan peringatan konfigurasi dan tombol Masuk nonaktif.
- [ ] Setelah diisi: peringatan hilang, tombol aktif.

## B. Login — Aditya
- [ ] Email/password kosong atau email tidak valid → pesan validasi, tidak ada request.
- [ ] Password salah → "Email atau password salah." dan field password dikosongkan.
- [ ] Kredensial benar → tombol menampilkan spinner "Memproses…", klik berulang tidak mengirim ganda, lalu masuk ke Dashboard.
- [ ] Dashboard: sapaan sesuai jam, nama **Aditya**, badge **Suami**, keluarga "Ryka & Adit Family".

## C. Login — Ryka
- [ ] Ulangi B dengan akun Ryka: nama **Ryka**, badge **Istri**, household yang sama.

## D. Logout
- [ ] Tombol logout di sidebar (desktop) dan di menu offcanvas (mobile) → kembali ke `login.html`.
- [ ] Setelah logout, tombol Back browser lalu refresh tetap berakhir di login.
- [ ] Logout di satu tab → tab lain yang terbuka diarahkan ke login.

## E. Session & redirect
- [ ] Setelah login, tutup tab lalu buka `index.html` → langsung ke Dashboard.
- [ ] Refresh Dashboard → tetap login (session persisten).
- [ ] Belum login: buka `pages/financial.html` langsung → diarahkan ke `login.html`.
- [ ] Sudah login: buka `login.html` → diarahkan ke Dashboard.
- [ ] Semua 13 halaman di `pages/` dapat dibuka dan menandai menu aktif yang benar.

## F. Responsive & navigasi
- [ ] Desktop (≥992px): sidebar tetap terlihat.
- [ ] Mobile: sidebar hilang, ada tombol menu (offcanvas) dan bottom navigation; konten tidak tertutup bottom nav.
- [ ] Tidak ada tombol dekoratif (semua tombol/tautan berfungsi).
- [ ] Kartu ringkasan menampilkan "—" (placeholder), bukan angka palsu.

## G. GitHub Pages (subpath)
- [ ] Di `https://<user>.github.io/<repo>/` CSS, logo, dan semua tautan menu berfungsi (tidak 404).
- [ ] Redirect login/logout tetap berada di bawah `/<repo>/`.

## H. Keamanan RLS
- [ ] `supabase/tests/001_core_rls.test.sql` → `PASS T1`–`PASS T8`.
- [ ] Akun terdaftar tetapi **belum** ada di `household_members` → Dashboard menampilkan peringatan "belum terhubung ke household".
- [ ] Di DevTools Console (sudah login), `INSERT`/`DELETE` ke `household_members` dan `INSERT`/`UPDATE` ke `households` via supabase-js ditolak (error permission denied).
- [ ] Tanpa login, request REST `GET <SUPABASE_URL>/rest/v1/households` dengan publishable key ditolak/tidak mengembalikan data.
- [ ] Akun nonanggota (user ketiga, household lain) tidak melihat household maupun profil Aditya/Ryka.
- [ ] `grep -ri "service_role\|secret" assets/ *.html` tidak menemukan key rahasia.

## I. Modul Financial (tahap 2)
- [ ] Migration 002 & 003 berhasil; `003_financial.test.sql` → `PASS F1`–`F6`.
- [ ] Tab Akun: tambah akun (mis. BCA saldo awal 1.000.000) → muncul dengan saldo benar; edit & nonaktifkan berfungsi.
- [ ] Tab Kategori: "Buat Kategori Standar" → 9 pengeluaran + 4 pemasukan; tambah/ubah/nonaktifkan kategori.
- [ ] Tambah pengeluaran Rp250.000 → saldo akun berkurang 250.000; muncul di daftar dan di Ringkasan.
- [ ] Login sebagai pasangan (HP lain) → transaksi tadi langsung terlihat; transaksi yang ditambah pasangan terlihat di akun pertama.
- [ ] Ubah dan hapus transaksi → saldo menyesuaikan. Kategori bertipe berbeda tidak muncul pada jenis yang salah.
- [ ] Transfer BCA→Cash 300.000: saldo kedua akun benar, Pemasukan/Pengeluaran bulan itu tidak berubah. Transfer ke akun yang sama ditolak.
- [ ] Filter bulan/jenis/akun dan pagination (isi >20 transaksi) berfungsi.
- [ ] Dashboard: kartu Saldo dan Pengeluaran Bulan Ini menampilkan data nyata ("—" + catatan jika belum ada akun).
- [ ] Akun nonanggota tidak melihat data apa pun (lihat bagian H).
