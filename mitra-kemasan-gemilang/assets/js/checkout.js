(function () {
    const form = $('#checkout-form'); if (!form) return;
    const validPhone = v => /^(\+62|62|0)8\d{7,12}$/.test(v.replace(/[\s-]/g, ''));
    function buildMessage(d, ls) {
        let total = 0, items = 0;
        const rows = ls.map(({ p, qty }, i) => {
            const sub = p.price * qty; total += sub; items += qty;
            const variantText = p.variantName ? `\n   Varian: ${p.variantName}` : '';
            return `${i + 1}. ${p.name}${variantText}\n   Harga: ${rupiah(p.price)}\n   Jumlah: ${qty} ${p.unit}\n   Subtotal: ${rupiah(sub)}`;
        }).join('\n\n');
        return `Halo ${STORE_CONFIG.name}, saya ingin melakukan pemesanan.\n\n*DATA PEMESAN*\nNama: ${d.nama}\nNo. WhatsApp: ${d.telp}\nAlamat: ${d.alamat}\n\n*DETAIL PESANAN*\n\n${rows}\n\nTotal Item: ${items}\nTotal Pembayaran: ${rupiah(total)}\n\nCatatan: ${d.catatan || '-'}\n\nTerima kasih.`;
    }
    form.addEventListener('submit', e => {
        e.preventDefault();
        const f = form.elements, d = { nama: f.nama.value.trim(), telp: f.telp.value.trim(), alamat: f.alamat.value.trim(), catatan: f.catatan.value.trim() };
        f.telp.setCustomValidity(d.telp && !validPhone(d.telp) ? 'Nomor tidak valid' : '');
        form.classList.add('was-validated');
        if (!form.checkValidity()) return;
        const ls = window.getCartLines ? window.getCartLines() : [];
        if (!ls.length) { toast('Keranjang masih kosong', false); return; }
        window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(buildMessage(d, ls))}`, '_blank', 'noopener');
        // Keranjang sengaja tidak dikosongkan otomatis.
    });
})();
