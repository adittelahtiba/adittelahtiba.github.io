(async function () {
    const box = $('#detail'), id = Number(new URLSearchParams(location.search).get('id'));
    let list;
    try { list = await loadProducts(); } catch (e) { console.error(e); box.innerHTML = errorBox(); return; }
    const p = await loadProductById(id) || list.find(x => x.id === id);
    if (!p) { box.innerHTML = `<div class="text-center py-5"><h2>Produk tidak ditemukan</h2><a class="btn btn-teal mt-3" href="products.html">Lihat Semua Produk</a></div>`; return; }
    const variants = (await loadVariants()).filter(v => Number(v.product_id) === Number(p.id));
    document.title = `${p.name} | ${STORE_CONFIG.name}`;
    const labels = { material: 'Bahan', color: 'Warna', size: 'Ukuran', thickness: 'Ketebalan' };
    const specs = Object.entries(p.specifications || {}).map(([k, v]) => `<tr><th>${esc(labels[k] || k)}</th><td>${esc(v)}</td></tr>`).join('');
    const defaultVariant = variants.length ? [...variants].sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0))[0] : null;
    const currentPrice = Number(p.price);
    const currentOriginalPrice = Number(p.originalPrice ?? p.price);
    const currentImage = resolveProductImage(p);
    const currentStock = Number(p.stock);
    const stockText = currentStock > 0 ? `${currentStock} ${esc(p.unit)} tersedia` : 'Habis';
    const out = currentStock <= 0;
    const detectVariantColor = (name = '') => {
        const text = String(name).toLowerCase();
        const palette = {
            hitam: '#111827', putih: '#f5f1e8', 'putih susu': '#f5f1e8', bening: '#dfeef7', transparan: '#dfeef7', abu: '#a5a9ac', merah: '#c0392b', cokelat: '#8b5e3c', gold: '#c79a3a', hijau: '#2e7d32', biru: '#2563eb', krem: '#f3efe5', kuning: '#f7c948'
        };
        const match = Object.entries(palette).find(([key]) => text.includes(key));
        return match ? match[1] : '#d9d9d9';
    };
    const variantTypeLabel = (variantType = 'variant') => {
        const type = String(variantType || 'variant').toLowerCase();
        if (type.includes('color')) return 'Pilih Warna';
        if (type.includes('size')) return 'Pilih Ukuran';
        if (type.includes('finish')) return 'Pilih Variant';
        if (type.includes('material')) return 'Pilih Variant';
        return 'Pilih Variant';
    };
    const renderVariantSelector = () => {
        if (!variants.length) return '';
        const currentType = variants[0]?.variant_type || 'variant';
        return `
            <div class="mt-3 mb-3">
                <label id="variant-label" class="form-label fw-semibold">${variantTypeLabel(currentType)}</label>
                <div class="variant-swatch-list">
                    ${variants.map(v => `<button type="button" class="variant-swatch${Number(defaultVariant?.id ?? 0) === Number(v.id) ? ' active' : ''}" data-variant-id="${v.id}" style="--swatch:${esc(v.color_hex || detectVariantColor(v.variant_name || ''))}">
                        <span class="variant-swatch-dot" style="background:${esc(v.color_hex || detectVariantColor(v.variant_name || ''))}"></span>
                        <span>${esc(v.variant_name || v.variant_type || 'Variant')}</span>
                    </button>`).join('')}
                </div>
                <select id="variant-select" class="form-select d-none">
                    <option value="" ${defaultVariant ? '' : 'selected disabled'}>${esc(variantTypeLabel(currentType))}</option>
                    ${variants.map(v => `<option value="${v.id}" ${Number(defaultVariant?.id ?? 0) === Number(v.id) ? 'selected' : ''}>${esc(v.variant_name || v.variant_type || 'Varian')}</option>`).join('')}
                </select>
            </div>
        `;
    };
    box.innerHTML = `
    <nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="index.html">Beranda</a></li><li class="breadcrumb-item"><a href="products.html?kategori=${encodeURIComponent(p.category)}">${esc(p.category)}</a></li><li class="breadcrumb-item active">${esc(p.name)}</li></ol></nav>
    <div class="row g-4 g-lg-5">
        <div class="col-lg-6"><img id="detail-main-image" class="detail-img" src="${esc(currentImage)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER"></div>
        <div class="col-lg-6">
            <span class="badge text-bg-light border">${esc(p.category)}</span>
            <h1 class="h2 mt-2">${esc(p.name)}</h1>
            <div class="my-3"><span id="detail-price" class="price fs-3">${rupiah(currentPrice)}</span>${currentOriginalPrice > currentPrice ? `<span id="detail-original-price" class="price-old fs-6">${rupiah(currentOriginalPrice)}</span> <span class="badge bg-success">Hemat ${Math.round((1 - currentPrice / currentOriginalPrice) * 100)}%</span>` : ''}<small class="text-muted"> / ${esc(p.unit)}</small></div>
            <p class="text-muted">${esc(p.description)}</p>
            ${renderVariantSelector()}
            <table class="table table-bordered spec-table mb-3"><tbody>${specs}<tr><th>Stok</th><td id="detail-stock" class="${out ? 'stock-out' : 'stock-ok'}">${stockText}</td></tr></tbody></table>
            <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                <div class="qty"><button type="button" id="q-" aria-label="Kurangi">&minus;</button><input id="q" type="number" min="1" max="${currentStock || 1}" value="1" aria-label="Jumlah"><button type="button" id="q-plus" aria-label="Tambah">+</button></div>
                <span class="text-muted">${esc(p.unit)}</span>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-outline-teal btn-lg flex-fill" id="add" ${out || (variants.length > 0) ? 'disabled' : ''}><i class="bi bi-cart-plus"></i> Tambah ke Keranjang</button>
                <button class="btn btn-teal btn-lg flex-fill" id="buy" ${out || (variants.length > 0) ? 'disabled' : ''}><i class="bi bi-bag-check"></i> Beli Sekarang</button>
            </div>
        </div>
    </div>
    <h2 class="h4 mt-5 mb-3">Produk Terkait</h2><div class="row row-cols-2 row-cols-md-4 g-3" id="related"></div>`;
    const q = $('#q'), qty = () => Math.max(1, Math.min(Number(q.max) || 1, parseInt(q.value) || 1));
    const variantSelect = $('#variant-select');
    if (variantSelect && defaultVariant) {
        variantSelect.value = String(defaultVariant.id);
    }
    const syncVariant = () => {
        const selected = variantSelect && variantSelect.value ? variants.find(v => Number(v.id) === Number(variantSelect.value)) || null : defaultVariant;
        const addBtn = $('#add'); const buyBtn = $('#buy');
        const priceEl = $('#detail-price');
        const originalPriceEl = $('#detail-original-price');
        const stockEl = $('#detail-stock');
        const mainImageEl = $('#detail-main-image');
        const variantLabelEl = $('#variant-label');
        if (!selected) {
            if (priceEl) priceEl.textContent = rupiah(Number(p.price));
            if (originalPriceEl) originalPriceEl.textContent = rupiah(Number(p.originalPrice ?? p.price));
            if (mainImageEl) mainImageEl.src = resolveProductImage(p);
            if (stockEl) { stockEl.textContent = currentStock > 0 ? `${currentStock} ${p.unit} tersedia` : 'Habis'; stockEl.className = out ? 'stock-out' : 'stock-ok'; }
            if (variantLabelEl) variantLabelEl.textContent = variantTypeLabel(variants[0]?.variant_type || 'variant');
            document.querySelectorAll('.variant-swatch').forEach(btn => btn.classList.remove('active'));
            q.max = Number(p.stock) || 1;
            q.value = 1;
            if (addBtn) addBtn.disabled = variants.length > 0 || out;
            if (buyBtn) buyBtn.disabled = variants.length > 0 || out;
            return;
        }
        const nextPrice = Number(selected.price ?? p.price);
        const nextOriginalPrice = Number(selected.original_price ?? p.originalPrice ?? p.price);
        const nextImage = selected.image_url || resolveProductImage(p);
        const nextStock = Number(selected.stock ?? p.stock);
        const nextOut = nextStock <= 0;
        if (mainImageEl) mainImageEl.src = nextImage;
        if (priceEl) priceEl.textContent = rupiah(nextPrice);
        if (originalPriceEl) originalPriceEl.textContent = rupiah(nextOriginalPrice);
        if (stockEl) { stockEl.textContent = nextStock > 0 ? `${nextStock} ${p.unit} tersedia` : 'Habis'; stockEl.className = nextOut ? 'stock-out' : 'stock-ok'; }
        if (variantLabelEl) variantLabelEl.textContent = variantTypeLabel(selected.variant_type || 'variant');
        document.querySelectorAll('.variant-swatch').forEach(btn => {
            const isActive = Number(btn.dataset.variantId) === Number(selected.id);
            btn.classList.toggle('active', isActive);
        });
        q.max = nextStock || 1;
        q.value = Math.min(Number(q.value) || 1, nextStock || 1);
        if (addBtn) addBtn.disabled = nextOut;
        if (buyBtn) buyBtn.disabled = nextOut;
    };
    q.addEventListener('change', () => q.value = qty());
    $('#q-').addEventListener('click', () => { q.value = Math.max(1, qty() - 1); });
    $('#q-plus').addEventListener('click', () => { q.value = Math.min(Number(q.max) || 1, qty() + 1); });
    $('#add').addEventListener('click', () => {
        if (variants.length && (!variantSelect || !variantSelect.value)) {
            toast('Pilih warna/variant dulu sebelum menambah ke keranjang', false);
            return;
        }
        const selected = variants.find(v => Number(v.id) === Number(variantSelect ? variantSelect.value : 0)) || null;
        const productForCart = selected ? { ...p, variantId: Number(selected.id), variantName: selected.variant_name || selected.variant_type || 'Variant', price: Number(selected.price ?? p.price), originalPrice: Number(selected.original_price ?? p.originalPrice ?? p.price), stock: Number(selected.stock ?? p.stock), image: selected.image_url || resolveProductImage(p) } : p;
        addToCart(productForCart, qty()); toast(`${p.name}${selected ? ` (${selected.variant_name || selected.variant_type})` : ''} ditambahkan ke keranjang`);
    });
    $('#buy').addEventListener('click', () => {
        if (variants.length && (!variantSelect || !variantSelect.value)) {
            toast('Pilih warna/variant dulu sebelum checkout', false);
            return;
        }
        const selected = variants.find(v => Number(v.id) === Number(variantSelect ? variantSelect.value : 0)) || null;
        const productForCart = selected ? { ...p, variantId: Number(selected.id), variantName: selected.variant_name || selected.variant_type || 'Variant', price: Number(selected.price ?? p.price), originalPrice: Number(selected.original_price ?? p.originalPrice ?? p.price), stock: Number(selected.stock ?? p.stock), image: selected.image_url || resolveProductImage(p) } : p;
        addToCart(productForCart, qty()); location.href = 'cart.html';
    });
    document.querySelectorAll('.variant-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!variantSelect) return;
            variantSelect.value = btn.dataset.variantId;
            syncVariant();
        });
    });
    if (variantSelect) {
        variantSelect.addEventListener('change', syncVariant);
        syncVariant();
    }
    const rel = list.filter(x => x.category === p.category && x.id !== p.id);
    $('#related').innerHTML = rel.concat(list.filter(x => x.category !== p.category && x.id !== p.id)).slice(0, 4).map(productCard).join('');
})();
