(async function () {
    const box = $('#detail'), id = Number(new URLSearchParams(location.search).get('id'));
    let list;
    try { list = await loadProducts(); } catch (e) { console.error(e); box.innerHTML = errorBox(); return; }
    const p = list.find(x => x.id === id);
    if (!p) { box.innerHTML = `<div class="text-center py-5"><h2>Produk tidak ditemukan</h2><a class="btn btn-teal mt-3" href="products.html">Lihat Semua Produk</a></div>`; return; }
    document.title = `${p.name} | ${STORE_CONFIG.name}`;
    const labels = { material: 'Bahan', color: 'Warna', size: 'Ukuran', thickness: 'Ketebalan' };
    const specs = Object.entries(p.specifications || {}).map(([k, v]) => `<tr><th>${esc(labels[k] || k)}</th><td>${esc(v)}</td></tr>`).join('');
    const out = p.stock <= 0;
    box.innerHTML = `
    <nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="index.html">Beranda</a></li><li class="breadcrumb-item"><a href="products.html?kategori=${encodeURIComponent(p.category)}">${esc(p.category)}</a></li><li class="breadcrumb-item active">${esc(p.name)}</li></ol></nav>
    <div class="row g-4 g-lg-5">
        <div class="col-lg-6"><img class="detail-img" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER"></div>
        <div class="col-lg-6">
            <span class="badge text-bg-light border">${esc(p.category)}</span>
            <h1 class="h2 mt-2">${esc(p.name)}</h1>
            <div class="my-3"><span class="price fs-3">${rupiah(p.price)}</span>${isPromo(p) ? `<span class="price-old fs-6">${rupiah(p.originalPrice)}</span> <span class="badge bg-success">Hemat ${promoPct(p)}%</span>` : ''}<small class="text-muted"> / ${esc(p.unit)}</small></div>
            <p class="text-muted">${esc(p.description)}</p>
            <table class="table table-bordered spec-table mb-3"><tbody>${specs}<tr><th>Stok</th><td class="${out ? 'stock-out' : 'stock-ok'}">${out ? 'Habis' : p.stock + ' ' + esc(p.unit) + ' tersedia'}</td></tr></tbody></table>
            <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                <div class="qty"><button type="button" id="q-" aria-label="Kurangi">&minus;</button><input id="q" type="number" min="1" max="${p.stock}" value="1" aria-label="Jumlah"><button type="button" id="q-plus" aria-label="Tambah">+</button></div>
                <span class="text-muted">${esc(p.unit)}</span>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-outline-teal btn-lg flex-fill" id="add" ${out ? 'disabled' : ''}><i class="bi bi-cart-plus"></i> Tambah ke Keranjang</button>
                <button class="btn btn-teal btn-lg flex-fill" id="buy" ${out ? 'disabled' : ''}><i class="bi bi-bag-check"></i> Beli Sekarang</button>
            </div>
        </div>
    </div>
    <h2 class="h4 mt-5 mb-3">Produk Terkait</h2><div class="row row-cols-2 row-cols-md-4 g-3" id="related"></div>`;
    const q = $('#q'), qty = () => Math.max(1, Math.min(p.stock, parseInt(q.value) || 1));
    q.addEventListener('change', () => q.value = qty());
    $('#q-').addEventListener('click', () => { q.value = Math.max(1, qty() - 1); });
    $('#q-plus').addEventListener('click', () => { q.value = Math.min(p.stock, qty() + 1); });
    $('#add').addEventListener('click', () => { addToCart(p, qty()); toast(`${p.name} ditambahkan ke keranjang`); });
    $('#buy').addEventListener('click', () => { addToCart(p, qty()); location.href = 'cart.html'; });
    const rel = list.filter(x => x.category === p.category && x.id !== p.id);
    $('#related').innerHTML = rel.concat(list.filter(x => x.category !== p.category && x.id !== p.id)).slice(0, 4).map(productCard).join('');
})();
