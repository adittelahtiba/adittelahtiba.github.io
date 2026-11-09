const CART_KEY = 'mkg_cart';
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e6f4f4"/><text x="50%" y="50%" fill="#0f8b8d" font-family="Arial" font-size="20" text-anchor="middle" dy=".3em">Gambar Produk</text></svg>');
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const isPromo = p => p.originalPrice > p.price;
const promoPct = p => Math.round((1 - p.price / p.originalPrice) * 100);

let _products = null;
async function loadProducts() {
    if (_products) return _products;
    const res = await fetch('assets/data/products.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Format JSON tidak valid');
    return (_products = data);
}
function errorBox(msg = 'Data produk gagal dimuat. Muat ulang halaman atau jalankan lewat static web server.') {
    return `<div class="alert alert-danger w-100"><i class="bi bi-exclamation-triangle"></i> ${esc(msg)}</div>`;
}

/* ---- Keranjang (LocalStorage) ---- */
function getCart() {
    try {
        const c = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(c) ? c.filter(i => i && Number.isInteger(i.id) && Number.isInteger(i.qty) && i.qty > 0) : [];
    } catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateBadge(); }
function cartCount() { return getCart().reduce((s, i) => s + i.qty, 0); }
function updateBadge() { const b = $('#cart-badge'); if (b) { const n = cartCount(); b.textContent = n; b.style.display = n ? 'grid' : 'none'; } }
function addToCart(p, qty = 1) {
    const cart = getCart(), item = cart.find(i => i.id === p.id);
    const total = Math.min(p.stock, (item ? item.qty : 0) + qty);
    if (item) item.qty = total; else cart.push({ id: p.id, qty: total });
    saveCart(cart);
    return total;
}
function toast(msg, ok = true) {
    let box = $('#toast-box');
    if (!box) { box = document.createElement('div'); box.id = 'toast-box'; box.className = 'toast-container position-fixed top-0 end-0 p-3'; box.style.zIndex = 2000; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${ok ? 'success' : 'danger'} border-0`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 2200 }); t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

/* ---- Komponen bersama ---- */
function productCard(p) {
    const out = p.stock <= 0;
    return `<div class="col"><div class="product-card">
        ${isPromo(p) ? `<span class="badge-promo">Hemat ${promoPct(p)}%</span>` : ''}
        <a href="product-detail.html?id=${p.id}"><img class="img" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER"></a>
        <div class="body">
            <span class="cat">${esc(p.category)}</span>
            <h3><a href="product-detail.html?id=${p.id}">${esc(p.name)}</a></h3>
            <div><span class="price">${rupiah(p.price)}</span>${isPromo(p) ? `<span class="price-old">${rupiah(p.originalPrice)}</span>` : ''}<small class="text-muted"> /${esc(p.unit)}</small></div>
            <div class="${out ? 'stock-out' : 'stock-ok'}"><i class="bi ${out ? 'bi-x-circle' : 'bi-check-circle'}"></i> ${out ? 'Stok habis' : 'Tersedia'}</div>
            <div class="actions">
                <a class="btn btn-outline-teal flex-fill" href="product-detail.html?id=${p.id}"><i class="bi bi-eye"></i> <span>Detail</span></a>
                <button class="btn btn-teal flex-fill" data-add="${p.id}" ${out ? 'disabled' : ''}><i class="bi bi-cart-plus"></i> <span>Tambah</span></button>
            </div>
        </div></div></div>`;
}
function waLink(text = 'Halo Mitra Kemasan Gemilang, saya ingin bertanya tentang produk kemasan plastik.') {
    return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
function renderChrome() {
    const page = document.body.dataset.page;
    const link = (k, href, label) => `<li class="nav-item"><a class="nav-link ${page === k ? 'active' : ''}" href="${href}">${label}</a></li>`;
    $('#site-header').innerHTML = `
    <div class="topbar"><div class="container d-flex justify-content-between flex-wrap gap-1"><span><i class="bi bi-geo-alt"></i> ${esc(STORE_CONFIG.address)}</span><span class="d-none d-sm-inline"><i class="bi bi-clock"></i> ${esc(STORE_CONFIG.hours)}</span></div></div>
    <nav class="navbar navbar-expand-lg sticky-top"><div class="container">
        <a class="navbar-brand" href="index.html"><img class="brand-logo" src="assets/images/logo.png" alt="Logo" onerror="this.outerHTML='<span class=&quot;brand-logo&quot;><i class=&quot;bi bi-box-seam&quot;></i></span>'"><span>${esc(STORE_CONFIG.name)}</span></a>
        <div class="d-flex align-items-center gap-3 order-lg-2">
            <a class="cart-link" href="cart.html" aria-label="Keranjang"><i class="bi bi-cart3"></i><span id="cart-badge" class="cart-badge">0</span></a>
            <button class="navbar-toggler border-0" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Menu"><i class="bi bi-list fs-2"></i></button>
        </div>
        <div class="collapse navbar-collapse order-lg-1 justify-content-lg-center" id="nav"><ul class="navbar-nav gap-lg-3">
            ${link('home', 'index.html', 'Beranda')}${link('products', 'products.html', 'Produk')}${link('about', 'about.html', 'Tentang Kami')}${link('contact', 'contact.html', 'Kontak')}
        </ul></div></div></nav>`;
    $('#site-footer').innerHTML = `
    <footer class="footer"><div class="container"><div class="row g-4">
        <div class="col-lg-5"><h5>${esc(STORE_CONFIG.name)}</h5><p>Toko kemasan plastik lengkap untuk UMKM, restoran, dan online shop. Kualitas terjaga, harga bersahabat.</p></div>
        <div class="col-6 col-lg-3"><h5>Menu</h5><ul class="list-unstyled"><li><a href="index.html">Beranda</a></li><li><a href="products.html">Produk</a></li><li><a href="about.html">Tentang Kami</a></li><li><a href="contact.html">Kontak</a></li></ul></div>
        <div class="col-6 col-lg-4"><h5>Hubungi Kami</h5><ul class="list-unstyled"><li><i class="bi bi-geo-alt"></i> ${esc(STORE_CONFIG.address)}</li><li><i class="bi bi-whatsapp"></i> <a href="${waLink()}" target="_blank" rel="noopener">${esc(STORE_CONFIG.whatsappNumber)}</a></li></ul></div>
    </div><div class="copy text-center">&copy; ${new Date().getFullYear()} ${esc(STORE_CONFIG.name)}. Seluruh hak cipta dilindungi.</div></div></footer>
    <a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" aria-label="Chat WhatsApp"><i class="bi bi-whatsapp"></i></a>`;
    updateBadge();
    document.querySelectorAll('[data-wa]').forEach(a => { a.href = waLink(); a.target = '_blank'; a.rel = 'noopener'; });
}

/* ---- Tombol "Tambah ke keranjang" di semua halaman ---- */
document.addEventListener('click', async e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    try {
        const p = (await loadProducts()).find(x => x.id === Number(b.dataset.add));
        if (!p) return;
        addToCart(p, 1); toast(`${p.name} ditambahkan ke keranjang`);
    } catch { toast('Gagal menambahkan produk', false); }
});

/* ---- Beranda ---- */
const CAT_ICONS = { 'Plastik PP': 'bi-bag', 'Plastik Klip': 'bi-lock', 'Plastik HDPE': 'bi-handbag', 'Standing Pouch': 'bi-box2-heart', 'Cup & Tutup': 'bi-cup-straw', 'Plastik Wrap': 'bi-layers', 'Plastik Pengiriman': 'bi-truck' };
async function initHome() {
    const cats = $('#categories'), feat = $('#featured');
    try {
        const list = await loadProducts();
        const names = [...new Set(list.map(p => p.category))];
        cats.innerHTML = names.map(n => `<div class="col"><a class="cat-card" href="products.html?kategori=${encodeURIComponent(n)}"><i class="bi ${CAT_ICONS[n] || 'bi-box'}"></i>${esc(n)}<small>${list.filter(p => p.category === n).length} produk</small></a></div>`).join('');
        feat.innerHTML = list.filter(p => p.featured).slice(0, 8).map(productCard).join('');
    } catch (err) { console.error(err); cats.innerHTML = feat.innerHTML = errorBox(); }
}
document.addEventListener('DOMContentLoaded', () => { renderChrome(); if (document.body.dataset.page === 'home') initHome(); });
