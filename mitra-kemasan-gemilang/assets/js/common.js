const CART_KEY = 'mkg_cart';
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e6f4f4"/><text x="50%" y="50%" fill="#0f8b8d" font-family="Arial" font-size="20" text-anchor="middle" dy=".3em">Gambar Produk</text></svg>');
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const isPromo = p => p.originalPrice > p.price;
const promoPct = p => Math.round((1 - p.price / p.originalPrice) * 100);
function resolveProductImage(product, fallback = PLACEHOLDER) {
    if (!product || typeof product !== 'object') return fallback;
    const values = [];
    const add = item => {
        if (Array.isArray(item)) item.forEach(v => add(v));
        else if (typeof item === 'string' && item.trim()) values.push(item.trim());
        else if (item && typeof item === 'object') add(item.url || item.src || item.path);
    };
    add(product.image);
    add(product.imageUrl);
    add(product.mainImage);
    add(product.main_image);
    add(product.detailImage);
    add(product.detail_image);
    add(product.images);
    add(product.gallery);
    add(product.thumbnail);
    add(product.cover);
    return values[0] || fallback;
}
function normalizeCategory(rawCategory, fallback = 'Umum') {
    if (!rawCategory) return { id: 0, name: fallback, slug: String(fallback).toLowerCase().replace(/\s+/g, '-'), description: '' };
    if (typeof rawCategory === 'string') return { id: 0, name: rawCategory, slug: rawCategory.toLowerCase().replace(/\s+/g, '-'), description: '' };
    return {
        id: Number(rawCategory.id ?? rawCategory.category_id ?? 0),
        name: rawCategory.name || rawCategory.title || fallback,
        slug: rawCategory.slug || String(rawCategory.name || rawCategory.title || fallback).toLowerCase().replace(/\s+/g, '-'),
        description: rawCategory.description || ''
    };
}
function normalizeProduct(raw) {
    const rawCategory = raw.category || {
        id: raw.category_id ?? raw.categoryId ?? 0,
        name: raw.category_name || raw.categoryName || 'Umum',
        slug: raw.category_slug || raw.categorySlug || '',
        description: raw.category_description || raw.categoryDescription || ''
    };
    const category = normalizeCategory(rawCategory, raw.category_name || raw.categoryName || 'Umum');
    const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
    const specSource = raw.specifications || {
        material: raw.material || '',
        color: raw.color || '',
        size: raw.size || '',
        thickness: raw.thickness || ''
    };
    const firstImage = resolveProductImage({
        image: raw.image || raw.main_image || raw.mainImage || raw.image_url || raw.imageUrl,
        images: raw.images || raw.gallery || [],
        detailImage: raw.detail_image || raw.detailImage,
        cover: raw.cover,
        thumbnail: raw.thumbnail
    }, PLACEHOLDER);
    const variantCount = Number(raw.variant_count ?? raw.variantCount ?? (Array.isArray(raw.variants) ? raw.variants.length : 0) ?? 0);
    return {
        id: Number(raw.id),
        name: raw.name || 'Produk',
        slug: raw.slug || String(raw.name || 'produk').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: category.name,
        categoryId: Number(raw.category_id ?? raw.categoryId ?? category.id),
        categorySlug: category.slug,
        categoryData: category,
        description: raw.description || '',
        price: Number(raw.price ?? raw.amount ?? 0),
        originalPrice: Number(raw.original_price ?? raw.originalPrice ?? raw.price ?? raw.amount ?? 0),
        unit: raw.unit || 'pcs',
        stock: Number(raw.stock ?? 0),
        featured: Boolean(raw.is_featured ?? raw.featured ?? false),
        image: firstImage,
        images,
        material: raw.material || specSource.material || '',
        color: raw.color || specSource.color || '',
        size: raw.size || specSource.size || '',
        thickness: raw.thickness || specSource.thickness || '',
        specifications: specSource,
        variants: Array.isArray(raw.variants) ? raw.variants : [],
        variant_count: variantCount,
        _source: raw
    };
}
function getSourceData(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.products)) return payload.products;
    if (payload && payload.status === 'success' && Array.isArray(payload.data)) return payload.data;
    return [];
}
function resolveApiUrl(type = 'products', id = null, query = {}) {
    const { productsApiUrl, categoriesApiUrl, detailApiUrl, variantsApiUrl, apiBaseUrl } = STORE_CONFIG || {};
    const build = (url, extra = {}) => {
        if (!url) throw new Error(`URL API untuk ${type} belum diatur. Periksa assets/js/config.js.`);
        const params = { ...(id ? { id } : {}), ...extra };
        const u = new URL(url, window.location.href);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') u.searchParams.set(k, String(v));
        });
        return u.toString();
    };
    const normalizedQuery = { ...query };
    if (type === 'categories' && categoriesApiUrl) return build(categoriesApiUrl, normalizedQuery);
    if (type === 'variants' && variantsApiUrl) return build(variantsApiUrl, normalizedQuery);
    if (type === 'detail' && detailApiUrl) return build(detailApiUrl, normalizedQuery);
    if (type === 'products' && productsApiUrl) return build(productsApiUrl, normalizedQuery);
    if (apiBaseUrl && type === 'products') return `${apiBaseUrl.replace(/\/$/, '')}/products${id ? `/${id}` : ''}${Object.keys(normalizedQuery).length ? '?' + new URLSearchParams(normalizedQuery).toString() : ''}`;
    if (apiBaseUrl && type === 'categories') return `${apiBaseUrl.replace(/\/$/, '')}/categories${id ? `/${id}` : ''}${Object.keys(normalizedQuery).length ? '?' + new URLSearchParams(normalizedQuery).toString() : ''}`;
    if (apiBaseUrl && type === 'variants') return `${apiBaseUrl.replace(/\/$/, '')}/variants${id ? `/${id}` : ''}${Object.keys(normalizedQuery).length ? '?' + new URLSearchParams(normalizedQuery).toString() : ''}`;
    throw new Error(`Tidak ada endpoint API aktif untuk ${type}. Periksa assets/js/config.js.`);
}
async function fetchJson(url) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(STORE_CONFIG?.supabaseHeaders || {})
    };
    const res = await fetch(url, {
        cache: 'no-store',
        headers
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + ' untuk ' + url + (text ? ': ' + text.slice(0, 200) : ''));
    }
    return res.json();
}
function normalizeVariant(raw = {}) {
    return {
        id: Number(raw.id ?? 0),
        product_id: Number(raw.product_id ?? raw.productId ?? 0),
        variant_type: raw.variant_type || raw.variantType || 'variant',
        variant_name: raw.variant_name || raw.variantName || raw.name || 'Variant',
        color_hex: raw.color_hex || raw.colorHex || raw.hex || '',
        price: Number(raw.price ?? raw.amount ?? 0),
        original_price: Number(raw.original_price ?? raw.originalPrice ?? raw.price ?? 0),
        stock: Number(raw.stock ?? 0),
        image_url: raw.image_url || raw.imageUrl || raw.image || ''
    };
}
function normalizeSearchText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}
function scoreMatchText(text, query) {
    const source = normalizeSearchText(text);
    const q = normalizeSearchText(query);
    if (!source || !q) return 0;
    if (source.includes(q)) return 150 + (q.length * 22) + (source.indexOf(q) * 2);

    const qTokens = q.split(' ').filter(Boolean);
    const sourceWords = source.split(/\s+/).filter(Boolean);
    let score = 0;

    qTokens.forEach(token => {
        if (!token) return;
        const exactWord = sourceWords.find(word => word === token);
        if (exactWord) {
            score += 40 + token.length * 12;
            return;
        }

        const prefixWord = sourceWords.find(word => word.startsWith(token) || token.startsWith(word));
        if (prefixWord) {
            score += 18 + token.length * 8;
            return;
        }

        const typoWord = sourceWords.find(word => levenshteinDistance(word, token) <= 1 || word.includes(token.slice(0, 2)) || token.includes(word.slice(0, 2)));
        if (typoWord) {
            score += 8 + token.length * 5;
            return;
        }

        if (token.length >= 3 && source.includes(token.slice(0, 3))) {
            score += 6;
        }
    });

    if (source.startsWith(q.slice(0, Math.min(q.length, 8)))) score += 10;
    return score;
}
function buildProductSearchDocument(product) {
    const variantText = (product.variants || [])
        .map(v => [v.variant_name, v.variant_type, v.color_hex].filter(Boolean).join(' '))
        .join(' ');
    const specText = Object.values(product.specifications || {}).filter(Boolean).join(' ');
    return [
        product.name,
        product.category,
        product.description,
        product.material,
        product.color,
        product.size,
        product.thickness,
        specText,
        variantText,
        product.slug,
        product.categorySlug,
        product.categoryData?.name || ''
    ].join(' ');
}
function searchProducts(products, keyword) {
    const q = normalizeSearchText(keyword);
    if (!q) return [...products];

    return products
        .map(product => {
            const doc = buildProductSearchDocument(product);
            let score = 0;
            const nameScore = scoreMatchText(product.name, q) * 5;
            const categoryScore = scoreMatchText(product.category, q) * 3;
            const descriptionScore = scoreMatchText(product.description, q) * 2;
            const materialScore = scoreMatchText(product.material, q) * 2;
            const colorScore = scoreMatchText(product.color, q) * 2;
            const sizeScore = scoreMatchText(product.size, q) * 1.5;
            const specScore = scoreMatchText(doc, q) * 1.2;
            score = nameScore + categoryScore + descriptionScore + materialScore + colorScore + sizeScore + specScore;
            return { product, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.product);
}
window.searchProducts = searchProducts;
let _products = null;
async function getProducts(options = {}) {
    const { limit, offset, ...rest } = options;
    const query = { ...rest };
    if (limit !== undefined && limit !== null && limit !== '') query.limit = Number(limit);
    if (offset !== undefined && offset !== null && offset !== '') query.offset = Number(offset);
    if (_products && Object.keys(query).length === 0) return _products;
    const url = resolveApiUrl('products', null, query);
    const payload = await fetchJson(url);
    const list = getSourceData(payload);
    if (!Array.isArray(list)) throw new Error('Format data produk tidak valid');
    const normalized = list.map(normalizeProduct);
    if (Object.keys(query).length === 0) _products = normalized;
    return normalized;
}
async function getVariants(options = {}) {
    const { limit, offset, ...rest } = options;
    const query = { ...rest };
    if (limit !== undefined && limit !== null && limit !== '') query.limit = Number(limit);
    if (offset !== undefined && offset !== null && offset !== '') query.offset = Number(offset);
    const url = resolveApiUrl('variants', null, query);
    const payload = await fetchJson(url);
    const list = getSourceData(payload);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeVariant);
}
async function getProductById(id) {
    const list = await getProducts();
    return list.find(p => Number(p.id) === Number(id)) || null;
}
async function getCategories(options = {}) {
    const { limit, offset, ...rest } = options;
    const query = { ...rest };
    if (limit !== undefined && limit !== null && limit !== '') query.limit = Number(limit);
    if (offset !== undefined && offset !== null && offset !== '') query.offset = Number(offset);
    const url = resolveApiUrl('categories', null, query);
    const payload = await fetchJson(url);
    const list = getSourceData(payload);
    if (!Array.isArray(list)) return [];
    return list.map(raw => normalizeCategory(raw, raw?.name || 'Umum'));
}
async function loadProducts() { return getProducts(); }
async function loadProductById(id) { return getProductById(id); }
async function loadCategories() { return getCategories(); }
async function loadVariants() { return getVariants(); }
function errorBox(msg = 'Data produk gagal dimuat. Muat ulang halaman atau jalankan lewat static web server.') {
    return `<div class="alert alert-danger w-100"><i class="bi bi-exclamation-triangle"></i> ${esc(msg)}</div>`;
}
function loadingCards(count = 8) {
    return Array.from({ length: count }, () => `
        <div class="col">
            <div class="product-card placeholder-glow">
                <span class="placeholder rounded-4 d-block" style="height:220px; width:100%; background:#edf4f4;"></span>
                <div class="body p-3">
                    <span class="placeholder d-block mb-2" style="width:40%; height:12px; border-radius:999px; background:#e5efef;"></span>
                    <span class="placeholder d-block mb-2" style="width:75%; height:18px; border-radius:999px; background:#e5efef;"></span>
                    <span class="placeholder d-block mb-2" style="width:55%; height:14px; border-radius:999px; background:#e5efef;"></span>
                    <div class="actions mt-3 d-flex gap-2">
                        <span class="placeholder flex-fill" style="height:38px; border-radius:10px; background:#e5efef;"></span>
                        <span class="placeholder flex-fill" style="height:38px; border-radius:10px; background:#e5efef;"></span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
function loadingCategories(count = 6) {
    return Array.from({ length: count }, () => `
        <div class="col">
            <div class="placeholder-glow filter-box h-100 p-3 rounded-4">
                <span class="placeholder d-block mb-2" style="width:40px; height:40px; border-radius:12px; background:#e5efef;"></span>
                <span class="placeholder d-block mb-2" style="width:75%; height:14px; border-radius:999px; background:#e5efef;"></span>
                <span class="placeholder d-block" style="width:45%; height:12px; border-radius:999px; background:#e5efef;"></span>
            </div>
        </div>
    `).join('');
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
    const cart = getCart();
    const variantId = p && p.variantId ? Number(p.variantId) : 0;
    const variantName = p && (p.variantName || p.variant_name || p.variantLabel || p.variant_label || '');
    const item = cart.find(i => i.id === p.id && Number(i.variantId || 0) === variantId);
    const stock = Number(p.stock ?? 0);
    const total = Math.min(stock || Number.MAX_SAFE_INTEGER, (item ? item.qty : 0) + qty);
    if (item) {
        item.qty = total;
        if (variantId) item.variantId = variantId;
        if (variantName) item.variantName = variantName;
    } else {
        const entry = { id: p.id, qty: total, ...(variantId ? { variantId } : {}) };
        if (variantName) entry.variantName = variantName;
        cart.push(entry);
    }
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
    const image = resolveProductImage(p);
    const hasVariants = Number(p.variant_count ?? p.variants?.length ?? 0) > 0;
    const buttonLabel = hasVariants ? 'Pilih Varian' : 'Tambah';
    const buttonIcon = hasVariants ? 'bi-arrow-right-circle' : 'bi-cart-plus';
    return `<div class="col"><div class="product-card">
        ${isPromo(p) ? `<span class="badge-promo">Hemat ${promoPct(p)}%</span>` : ''}
        <a href="product-detail.html?id=${p.id}"><img class="img" src="${esc(image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER"></a>
        <div class="body">
            <span class="cat">${esc(p.category)}</span>
            <h3><a href="product-detail.html?id=${p.id}">${esc(p.name)}</a></h3>
            <div><span class="price">${rupiah(p.price)}</span>${isPromo(p) ? `<span class="price-old">${rupiah(p.originalPrice)}</span>` : ''}<small class="text-muted"> /${esc(p.unit)}</small></div>
            <div class="${out ? 'stock-out' : 'stock-ok'}"><i class="bi ${out ? 'bi-x-circle' : 'bi-check-circle'}"></i> ${out ? 'Stok habis' : 'Tersedia'}</div>
            <div class="actions">
                <a class="btn btn-outline-teal flex-fill" href="product-detail.html?id=${p.id}"><i class="bi bi-eye"></i> <span>Detail</span></a>
                <button class="btn btn-teal flex-fill" data-add="${p.id}" ${out ? 'disabled' : ''}><i class="bi ${buttonIcon}"></i> <span>${buttonLabel}</span></button>
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
        const hasVariants = Number(p.variant_count ?? p.variants?.length ?? 0) > 0;
        if (hasVariants) {
            location.href = `product-detail.html?id=${p.id}`;
            return;
        }
        addToCart(p, 1); toast(`${p.name} ditambahkan ke keranjang`);
    } catch { toast('Gagal menambahkan produk', false); }
});

/* ---- Beranda ---- */
const CAT_ICONS = { 'Plastik PP': 'bi-bag', 'Plastik Klip': 'bi-lock', 'Plastik HDPE': 'bi-handbag', 'Standing Pouch': 'bi-box2-heart', 'Cup & Tutup': 'bi-cup-straw', 'Plastik Wrap': 'bi-layers', 'Plastik Pengiriman': 'bi-truck' };
async function initHome() {
    const cats = $('#categories'), feat = $('#featured');
    if (cats) cats.innerHTML = loadingCategories(6);
    if (feat) feat.innerHTML = loadingCards(4);
    try {
        const [list, categoryList] = await Promise.all([loadProducts(), loadCategories().catch(() => [])]);
        const names = categoryList.length ? categoryList.map(c => c.name) : [...new Set(list.map(p => p.category))];
        cats.innerHTML = names.map(n => `<div class="col"><a class="cat-card" href="products.html?kategori=${encodeURIComponent(n)}"><i class="bi ${CAT_ICONS[n] || 'bi-box'}"></i>${esc(n)}<small>${list.filter(p => p.category === n).length} produk</small></a></div>`).join('');
        feat.innerHTML = list.filter(p => p.featured).slice(0, 8).map(productCard).join('');
    } catch (err) { console.error(err); if (cats) cats.innerHTML = errorBox(); if (feat) feat.innerHTML = errorBox(); }
}
document.addEventListener('DOMContentLoaded', () => { renderChrome(); if (document.body.dataset.page === 'home') initHome(); });
