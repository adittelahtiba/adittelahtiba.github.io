(async function () {
    const box = $('#cart-content');
    let products;
    try { products = await loadProducts(); } catch (e) { console.error(e); box.innerHTML = errorBox(); return; }

    function lines() {
        const raw = getCart(), cart = raw.filter(i => products.some(p => p.id === i.id));
        if (cart.length !== raw.length) saveCart(cart);
        return cart.map(i => { const p = products.find(x => x.id === i.id); return { p, qty: Math.min(i.qty, p.stock) }; });
    }
    window.getCartLines = lines;
    function render() {
        const ls = lines();
        if (!ls.length) {
            box.innerHTML = `<div class="text-center py-5"><i class="bi bi-cart-x display-3 text-muted"></i><h2 class="h4 mt-3">Keranjang masih kosong</h2><p class="text-muted">Pilih produk kemasan yang kamu butuhkan, lalu tambahkan ke keranjang.</p><a class="btn btn-teal" href="products.html">Mulai Belanja</a></div>`;
            return;
        }
        const items = ls.reduce((s, l) => s + l.qty, 0);
        const sub = ls.reduce((s, l) => s + l.p.originalPrice * l.qty, 0);
        const total = ls.reduce((s, l) => s + l.p.price * l.qty, 0);
        box.innerHTML = `<div class="row g-4">
        <div class="col-lg-8">
            <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 m-0">${ls.length} jenis produk</h2><button class="btn btn-sm btn-outline-danger" data-act="clear"><i class="bi bi-trash"></i> Kosongkan Keranjang</button></div>
            ${ls.map(({ p, qty }) => `<div class="cart-item">
                <img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER">
                <div class="flex-grow-1"><a class="fw-bold" href="product-detail.html?id=${p.id}">${esc(p.name)}</a><div class="text-muted small">${rupiah(p.price)} / ${esc(p.unit)}</div></div>
                <div class="qty"><button data-act="dec" data-id="${p.id}" aria-label="Kurangi">&minus;</button><input type="number" value="${qty}" min="1" max="${p.stock}" data-id="${p.id}" aria-label="Jumlah"><button data-act="inc" data-id="${p.id}" aria-label="Tambah">+</button></div>
                <div class="text-end fw-bold" style="min-width:100px">${rupiah(p.price * qty)}</div>
                <button class="btn btn-sm btn-light text-danger" data-act="del" data-id="${p.id}" aria-label="Hapus"><i class="bi bi-trash"></i></button>
            </div>`).join('')}
            <a href="products.html" class="btn btn-outline-teal mt-2"><i class="bi bi-arrow-left"></i> Lanjutkan Belanja</a>
        </div>
        <div class="col-lg-4"><div class="summary"><h2 class="h5 mb-3">Ringkasan Pesanan</h2>
            <div class="row-s"><span>Total item</span><b>${items}</b></div>
            <div class="row-s"><span>Subtotal</span><b>${rupiah(sub)}</b></div>
            <div class="row-s"><span>Diskon</span><b class="text-success">-${rupiah(sub - total)}</b></div>
            <div class="row-s total"><span>Total Pembayaran</span><span>${rupiah(total)}</span></div>
            <button class="btn btn-teal w-100 btn-lg mt-3" data-bs-toggle="modal" data-bs-target="#checkout-modal"><i class="bi bi-whatsapp"></i> Checkout WhatsApp</button>
        </div></div></div>`;
    }
    function setQty(id, q) {
        const p = products.find(x => x.id === id), cart = getCart(), it = cart.find(i => i.id === id);
        if (!it || !p) return;
        if (q > p.stock) { toast(`Stok ${p.name} hanya ${p.stock} ${p.unit}`, false); q = p.stock; }
        if (q < 1) saveCart(cart.filter(i => i.id !== id)); else { it.qty = q; saveCart(cart); }
        render();
    }
    box.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const id = Number(b.dataset.id), cur = (getCart().find(i => i.id === id) || {}).qty || 0;
        if (b.dataset.act === 'inc') setQty(id, cur + 1);
        else if (b.dataset.act === 'dec') setQty(id, Math.max(1, cur - 1));
        else if (b.dataset.act === 'del') setQty(id, 0);
        else if (b.dataset.act === 'clear' && confirm('Kosongkan seluruh isi keranjang?')) { saveCart([]); render(); }
    });
    box.addEventListener('change', e => { if (e.target.matches('input[data-id]')) setQty(Number(e.target.dataset.id), parseInt(e.target.value) || 1); });
    render();
})();
