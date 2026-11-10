(async function () {
    const box = $('#cart-content');
    const clearModalEl = document.getElementById('clear-cart-modal');
    const confirmClearBtn = document.getElementById('confirm-clear-cart');
    let products;
    try { products = await loadProducts(); } catch (e) { console.error(e); box.innerHTML = errorBox(); return; }

    if (confirmClearBtn && clearModalEl) {
        confirmClearBtn.addEventListener('click', () => {
            saveCart([]);
            render();
            bootstrap.Modal.getInstance(clearModalEl)?.hide();
        });
    }

    function lines() {
        const raw = getCart(), cart = raw.filter(i => products.some(p => p.id === i.id));
        if (cart.length !== raw.length) saveCart(cart);
        return cart.map(i => {
            const p = products.find(x => x.id === i.id);
            const variantId = Number(i.variantId || 0);
            const variant = Array.isArray(p?.variants) ? p.variants.find(v => Number(v.id) === variantId) : null;
            const variantName = i.variantName || i.variant_name || (variant ? variant.variant_name || variant.variant_type || 'Variant' : '');
            const effective = variant ? {
                ...p,
                price: Number(variant.price ?? p.price),
                originalPrice: Number(variant.original_price ?? p.originalPrice ?? p.price),
                stock: Number(variant.stock ?? p.stock),
                image: variant.image_url || resolveProductImage(p),
                variantName: variantName || (variant.variant_name || variant.variant_type || 'Variant'),
                variantId
            } : (p ? { ...p, variantName: variantName || p.variantName || '', variantId } : p);
            return { p: effective, qty: Math.min(i.qty, (effective.stock || i.qty)), variantId, variantName: effective.variantName || variantName || '' };
        });
    }
    window.getCartLines = lines;
    function render() {
        const ls = lines();
        if (!ls.length) {
            box.innerHTML = `<div class="text-center py-5"><i class="bi bi-cart-x display-3 text-muted"></i><h2 class="h4 mt-3">Keranjang masih kosong</h2><p class="text-muted">Pilih produk kemasan yang kamu butuhkan, lalu tambahkan ke keranjang.</p><a class="btn btn-teal" href="products.html">Mulai Belanja</a></div>`;
            return;
        }
        const items = ls.reduce((s, l) => s + l.qty, 0);
        const sub = ls.reduce((s, l) => s + (l.p.originalPrice || l.p.price) * l.qty, 0);
        const total = ls.reduce((s, l) => s + l.p.price * l.qty, 0);
        box.innerHTML = `<div class="row g-4">
        <div class="col-lg-8">
            <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 m-0">${ls.length} jenis produk</h2><button class="btn btn-sm btn-outline-danger" data-act="clear"><i class="bi bi-trash"></i> Kosongkan Keranjang</button></div>
            ${ls.map(({ p, qty, variantId, variantName }) => `<div class="cart-item">
                <img src="${esc(resolveProductImage(p))}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER">
                <div class="flex-grow-1"><a class="fw-bold" href="product-detail.html?id=${p.id}">${esc(p.name)}</a>${(p.variantName || variantName) ? `<div class="text-muted small">Variant: ${esc(p.variantName || variantName)}</div>` : ''}<div class="text-muted small">${rupiah(p.price)} / ${esc(p.unit)}</div></div>
                <div class="qty"><button data-act="dec" data-id="${p.id}" data-variant-id="${variantId || 0}" aria-label="Kurangi">&minus;</button><input type="number" value="${qty}" min="1" max="${p.stock}" data-id="${p.id}" data-variant-id="${variantId || 0}" aria-label="Jumlah"><button data-act="inc" data-id="${p.id}" data-variant-id="${variantId || 0}" aria-label="Tambah">+</button></div>
                <div class="text-end fw-bold" style="min-width:100px">${rupiah(p.price * qty)}</div>
                <button class="btn btn-sm btn-light text-danger" data-act="del" data-id="${p.id}" data-variant-id="${variantId || 0}" aria-label="Hapus"><i class="bi bi-trash"></i></button>
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
    function setQty(id, variantId, q) {
        const p = products.find(x => x.id === id), cart = getCart();
        const normalizedVariantId = Number(variantId || 0);
        const it = cart.find(i => i.id === id && Number(i.variantId || 0) === normalizedVariantId);
        if (!it || !p) return;
        const variant = Array.isArray(p.variants) ? p.variants.find(v => Number(v.id) === normalizedVariantId) : null;
        const stock = Number(variant ? (variant.stock ?? p.stock) : p.stock);
        if (q > stock) { toast(`Stok ${p.name} hanya ${stock} ${p.unit}`, false); q = stock; }
        if (q < 1) saveCart(cart.filter(i => !(i.id === id && Number(i.variantId || 0) === normalizedVariantId))); else { it.qty = q; saveCart(cart); }
        render();
    }
    box.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const id = Number(b.dataset.id), variantId = Number(b.dataset.variantId || 0);
        const item = (getCart().find(i => i.id === id && Number(i.variantId || 0) === variantId) || {});
        const cur = item.qty || 0;
        if (b.dataset.act === 'inc') setQty(id, variantId, cur + 1);
        else if (b.dataset.act === 'dec') setQty(id, variantId, Math.max(1, cur - 1));
        else if (b.dataset.act === 'del') setQty(id, variantId, 0);
        else if (b.dataset.act === 'clear') {
            if (clearModalEl) bootstrap.Modal.getOrCreateInstance(clearModalEl).show();
        }
    });
    box.addEventListener('change', e => { if (e.target.matches('input[data-id]')) setQty(Number(e.target.dataset.id), Number(e.target.dataset.variantId || 0), parseInt(e.target.value) || 1); });
    render();
})();
