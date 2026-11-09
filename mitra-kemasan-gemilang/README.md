# Mitra Kemasan Gemilang – Toko Online Statis

Website e-commerce statis (HTML5, CSS3, Bootstrap 5 CDN, JavaScript Vanilla). Data produk dari `assets/data/products.json`, keranjang disimpan di LocalStorage, checkout lewat WhatsApp.

## Menjalankan lokal
`fetch()` tidak berjalan di `file://`, gunakan static server, misalnya:

    python3 -m http.server 8000

lalu buka http://localhost:8000

## Konfigurasi
- Nomor WhatsApp, nama, alamat: `assets/js/config.js` (format nomor `62812...`).
- Produk: tambah/ubah di `assets/data/products.json`.
- Gambar: letakkan di `assets/images/products/` sesuai field `image`. Jika belum ada, placeholder tampil otomatis. Opsional: `assets/images/logo.png` (kalau tidak ada, ikon dipakai) dan `banner.jpg`.

## Deploy ke GitHub Pages
Push ke repository, lalu Settings > Pages > Branch `main`, folder `/ (root)`. Semua path bersifat relatif, tanpa build.
