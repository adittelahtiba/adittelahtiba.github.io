(async function () {
    const grid = $('#grid'), S = { q: '', cat: '', min: 0, max: Infinity, sort: 'default', per: 12, page: 1 };
    let all;
    grid.innerHTML = loadingCards(8);
    $('#info').textContent = 'Memuat produk...';
    try { all = await loadProducts(); } catch (e) { console.error(e); grid.innerHTML = errorBox(); return; }
    const catSel = $('#f-cat');
    [...new Set(all.map(p => p.category))].forEach(c => catSel.insertAdjacentHTML('beforeend', `<option>${esc(c)}</option>`));
    const urlCat = new URLSearchParams(location.search).get('kategori');
    if (urlCat && [...catSel.options].some(o => o.value === urlCat)) { catSel.value = urlCat; S.cat = urlCat; }

    const sorters = { 'harga-asc': (a, b) => a.price - b.price, 'harga-desc': (a, b) => b.price - a.price, 'nama': (a, b) => a.name.localeCompare(b.name, 'id'), 'promo': (a, b) => (isPromo(b) ? promoPct(b) : 0) - (isPromo(a) ? promoPct(a) : 0) };
    function filtered() {
        const q = normalizeSearchText(S.q);
        const searched = searchProducts(all, q);
        const l = searched.filter(p => (!S.cat || p.category === S.cat) && p.price >= S.min && p.price <= S.max);
        return sorters[S.sort] ? l.sort(sorters[S.sort]) : l;
    }
    function pageList(cur, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const set = [...new Set([1, total, cur - 1, cur, cur + 1])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
        const out = []; set.forEach((n, i) => { if (i && n - set[i - 1] > 1) out.push('…'); out.push(n); });
        return out;
    }
    function render() {
        const list = filtered(), pages = Math.max(1, Math.ceil(list.length / S.per));
        S.page = Math.min(S.page, pages);
        const start = (S.page - 1) * S.per, slice = list.slice(start, start + S.per);
        grid.innerHTML = slice.length ? slice.map(productCard).join('') : `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-search fs-1"></i><p class="mt-2">Produk tidak ditemukan. Ubah kata kunci atau reset filter.</p></div>`;
        $('#info').textContent = `Menampilkan ${list.length ? start + 1 : 0}-${start + slice.length} dari ${list.length} produk`;
        const li = (label, pg, cls = '', aria = '') => `<li class="page-item ${cls}"><button class="page-link" data-pg="${pg}" ${aria}>${label}</button></li>`;
        $('#pagination').innerHTML = pages <= 1 ? '' :
            li('&laquo;', S.page - 1, S.page === 1 ? 'disabled' : '', 'aria-label="Sebelumnya"') +
            pageList(S.page, pages).map(n => n === '…' ? li('…', 0, 'disabled') : li(n, n, n === S.page ? 'active' : '')).join('') +
            li('&raquo;', S.page + 1, S.page === pages ? 'disabled' : '', 'aria-label="Berikutnya"');
    }
    const change = () => { S.page = 1; render(); };
    $('#f-q').addEventListener('input', e => { S.q = e.target.value.trim(); change(); });
    catSel.addEventListener('change', e => { S.cat = e.target.value; change(); });
    $('#f-price').addEventListener('change', e => { const [a, b] = e.target.value.split('-'); S.min = Number(a) || 0; S.max = b ? Number(b) : Infinity; change(); });
    $('#f-sort').addEventListener('change', e => { S.sort = e.target.value; change(); });
    $('#f-per').addEventListener('change', e => { S.per = Number(e.target.value); change(); });
    $('#f-reset').addEventListener('click', () => { $('#filters').reset(); Object.assign(S, { q: '', cat: '', min: 0, max: Infinity, sort: 'default', per: 12 }); change(); });
    $('#filters').addEventListener('submit', e => e.preventDefault());
    $('#pagination').addEventListener('click', e => {
        const b = e.target.closest('[data-pg]'); if (!b || Number(b.dataset.pg) < 1) return;
        S.page = Number(b.dataset.pg); render(); $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    render();
})();
