#!/usr/bin/env python3
"""
optimize_assets.py - menyiapkan aset undangan agar PageSpeed mobile naik.

Jalankan SEKALI dari folder yang berisi index.html dan folder assets/ :

    pip install pillow fonttools brotli
    python optimize_assets.py            # proses semua
    python optimize_assets.py --check    # hanya cek: semua file yang dirujuk HTML/CSS sudah ada?

Aman dijalankan ulang. File asli dicadangkan dulu ke assets/_originals/ (tidak ditimpa tanpa cadangan).

Yang dikerjakan:
  1. Foto "WhatsApp Image ... .webp" -> varian -w640 (galeri/mempelai), -w960 (cover/hero), -w1400 (lightbox).
  2. Tekstur & ilustrasi (bg-*.webp, ivory-cover, cat*, paw-mini, ...) dikompres ulang / diperkecil di tempat.
  3. navy.png -> navy.webp.
  4. Font Awesome: hanya ikon yang benar-benar dipakai (~330 KB -> ~10 KB) -> assets/fa-lite/.
"""
import os, re, sys, shutil, glob, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "assets")
BACKUP = os.path.join(ASSETS, "_originals")
HTML = os.path.join(ROOT, "index.html")
CSS = os.path.join(ROOT, "style.css")

PHOTO_VARIANTS = [(640, 72), (960, 72), (1400, 78)]       # (lebar px, kualitas WebP)

# nama file -> (lebar maks px, kualitas). Hanya ditimpa jika hasilnya >=10% lebih kecil.
RECOMPRESS = {
    "bg-navy-grain.webp": (840, 55),     # tile 420 css-px @2x
    "bg-ivory.webp": (1120, 60),         # tile 560 css-px @2x
    "bg-ivory-warm.webp": (1120, 60),
    "bg-paper.webp": (1120, 60),
    "ivory-cover.webp": (1080, 70),
    "cat 3.webp": (400, 62),
    "cat 1.webp": (600, 70),
    "si-imut.webp": (600, 70),
    "cat-info.webp": (560, 70),
    "paw-mini.webp": (492, 70),          # tampil 246x82 css-px
}

FA_DIR_SRC = os.path.join(ASSETS, "fontawesome-free-6.7.2-web")
FA_OUT = os.path.join(ASSETS, "fa-lite")


def human(n):
    return f"{n/1024:.0f} KB"


def backup(path):
    os.makedirs(BACKUP, exist_ok=True)
    dst = os.path.join(BACKUP, os.path.basename(path))
    if not os.path.exists(dst):
        shutil.copy2(path, dst)
    return dst


def load_image(path):
    from PIL import Image, ImageOps
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    return im.convert("RGBA" if has_alpha else "RGB"), has_alpha


def save_webp(im, out, q, has_alpha):
    kw = dict(format="WEBP", quality=q, method=6)
    if has_alpha:
        kw["alpha_quality"] = 90
    im.save(out, **kw)


def resized(im, max_w):
    from PIL import Image
    if im.width <= max_w:
        return im
    h = round(im.height * max_w / im.width)
    return im.resize((max_w, h), Image.LANCZOS)


# ----------------------------------------------------------------------------- foto
def do_photos():
    print("\n[1] Foto -> varian responsif")
    files = [f for f in glob.glob(os.path.join(ASSETS, "WhatsApp Image *.webp")) if not re.search(r"-w\d+\.webp$", f)]
    if not files:
        print("   (tidak ada file 'WhatsApp Image *.webp' di assets/)")
    total_before = total_after = 0
    for f in sorted(files):
        # selalu olah dari cadangan asli supaya hasil konsisten bila dijalankan ulang
        orig = backup(f)
        im, alpha = load_image(orig)
        base = f[:-5]
        for w, q in PHOTO_VARIANTS:
            out = f"{base}-w{w}.webp"
            save_webp(resized(im, w), out, q, alpha)
            total_after += os.path.getsize(out)
        total_before += os.path.getsize(orig)
        print(f"   {os.path.basename(f):52s} {human(os.path.getsize(orig)):>8} -> w640 {human(os.path.getsize(base + '-w640.webp'))}, "
              f"w960 {human(os.path.getsize(base + '-w960.webp'))}, w1400 {human(os.path.getsize(base + '-w1400.webp'))}")
    if files:
        print(f"   foto asli (total) {human(total_before)}; semua varian baru {human(total_after)} "
              f"(di halaman, tiap pengunjung hanya mengunduh varian yang dipakai)")


# ----------------------------------------------------------------------------- tekstur
def do_recompress():
    print("\n[2] Tekstur & ilustrasi")
    for name, (max_w, q) in RECOMPRESS.items():
        path = os.path.join(ASSETS, name)
        if not os.path.exists(path):
            print(f"   - {name}: tidak ditemukan, dilewati")
            continue
        orig = backup(path)
        im, alpha = load_image(orig)
        tmp = path + ".tmp"
        save_webp(resized(im, max_w), tmp, q, alpha)
        before, after = os.path.getsize(orig), os.path.getsize(tmp)
        if after < before * 0.9:
            os.replace(tmp, path)
            print(f"   {name:22s} {human(before):>8} -> {human(after)}")
        else:
            shutil.copy2(orig, path)   # kembalikan yang asli jika tak ada untungnya
            os.remove(tmp)
            print(f"   {name:22s} {human(before):>8} (sudah efisien, tidak diubah)")

    png = os.path.join(ASSETS, "navy.png")
    if os.path.exists(png):
        im, alpha = load_image(png)
        out = os.path.join(ASSETS, "navy.webp")
        save_webp(resized(im, 1080), out, 70, alpha)
        print(f"   navy.png               {human(os.path.getsize(png)):>8} -> navy.webp {human(os.path.getsize(out))}")
    else:
        print("   - navy.png tidak ditemukan; navy.webp tidak dibuat (index.html memakainya!)")


# ----------------------------------------------------------------------------- Font Awesome
def parse_fa_css(css_text):
    """nama ikon -> kode heksa. Mendukung  .fa-x:before{content:"\\f015"}  dan  .fa-x{--fa:"\\f015"}."""
    mapping = {}
    pat = re.compile(r'((?:\.fa-[a-z0-9-]+(?:::?before)?\s*,?\s*)+)\{[^}]*?(?:content|--fa)\s*:\s*"\\([0-9a-fA-F]{2,5})"', re.S)
    for m in pat.finditer(css_text):
        for name in re.findall(r"\.fa-([a-z0-9-]+)", m.group(1)):
            mapping.setdefault(name, m.group(2).lower())
    return mapping


def icons_used(html_text):
    """-> {'solid': {...}, 'regular': {...}, 'brands': {...}} dari atribut class=\"fa-... fa-...\" (termasuk di string JS)."""
    used = {"solid": set(), "regular": set(), "brands": set()}
    for cls in re.findall(r'class=\\?"([^"\\]*\bfa-(?:solid|regular|brands)\b[^"\\]*)\\?"', html_text):
        toks = cls.split()
        style = next(t[3:] for t in toks if t in ("fa-solid", "fa-regular", "fa-brands"))
        for t in toks:
            if t.startswith("fa-") and t not in ("fa-solid", "fa-regular", "fa-brands", "fa-fw", "fa-spin"):
                used[style].add(t[3:])
    return used


def do_fontawesome(flavor="woff2"):
    print("\n[3] Font Awesome ringan")
    css_path = os.path.join(FA_DIR_SRC, "css", "all.min.css")
    if not os.path.exists(css_path):
        print(f"   ! {css_path} tidak ditemukan; dilewati. (index.html merujuk assets/fa-lite/fa-lite.css)")
        return
    try:
        from fontTools import subset
    except ImportError:
        sys.exit("   ! butuh fonttools & brotli:  pip install fonttools brotli")
    codes = parse_fa_css(open(css_path, encoding="utf-8").read())
    used = icons_used(open(HTML, encoding="utf-8").read())

    fonts = {"solid": ("fa-solid-900.woff2", "Font Awesome 6 Free", 900),
             "regular": ("fa-regular-400.woff2", "Font Awesome 6 Free", 400),
             "brands": ("fa-brands-400.woff2", "Font Awesome 6 Brands", 400)}
    os.makedirs(FA_OUT, exist_ok=True)
    css = ['/* Font Awesome 6 Free (subset) - dibuat otomatis oleh optimize_assets.py */']
    for style, (fname, family, weight) in fonts.items():
        css.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};font-display:swap;src:url({fname}) format("woff2")}}')
    css.append('.fa-solid,.fa-regular,.fa-brands{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;display:inline-block;font-style:normal;font-variant:normal;line-height:1;text-rendering:auto}')
    css.append('.fa-solid{font-family:"Font Awesome 6 Free";font-weight:900}')
    css.append('.fa-regular{font-family:"Font Awesome 6 Free";font-weight:400}')
    css.append('.fa-brands{font-family:"Font Awesome 6 Brands";font-weight:400}')

    for style, (fname, family, weight) in fonts.items():
        names = sorted(used[style])
        if not names:
            continue
        missing = [n for n in names if n not in codes]
        if missing:
            sys.exit(f"   ! ikon tidak ada di all.min.css: {missing}")
        src_font = os.path.join(FA_DIR_SRC, "webfonts", fname)
        opts = subset.Options()
        opts.flavor = flavor
        opts.layout_features = []
        opts.name_IDs = []
        opts.notdef_outline = True
        opts.glyph_names = False
        font = subset.load_font(src_font, opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[int(codes[n], 16) for n in names])
        sub.subset(font)
        out = os.path.join(FA_OUT, fname)
        subset.save_font(font, out, opts)
        print(f"   {fname:24s} {human(os.path.getsize(src_font)):>8} -> {human(os.path.getsize(out)):>6}  ({len(names)} ikon: {', '.join(names)})")
        for n in names:
            css.append(f'.fa-{n}::before{{content:"\\{codes[n]}"}}')
    open(os.path.join(FA_OUT, "fa-lite.css"), "w", encoding="utf-8").write("\n".join(css) + "\n")
    print("   -> assets/fa-lite/fa-lite.css")


# ----------------------------------------------------------------------------- cek rujukan
def do_check():
    print("\n[cek] Semua aset yang dirujuk index.html / style.css")
    text = open(HTML, encoding="utf-8").read() + "\n" + open(CSS, encoding="utf-8").read()
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)      # abaikan kode yang sudah di-comment
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    refs = set(re.findall(r"""assets/[^'"<>\n]+?\.(?:webp|png|svg|mp3|mp4|vtt|js|css|woff2)""", text))
    # rujukan opsional / teks contoh (bukan file yang wajib ada): pesan alert JS, varian cover navy, gambar share absolut
    refs -= {"assets/music.mp3", "assets/bg-navy-warm.webp", "assets/cover-share.webp"}
    # foto tambahan galeri dirakit lewat JS (nama + varian)
    for stem in re.findall(r"'(2026-10-07 at [0-9.]+)'", text):
        for w in (640, 960, 1400):
            refs.add(f"assets/WhatsApp Image {stem}-w{w}.webp")
    missing = []
    for r in sorted(refs):
        p = os.path.join(ROOT, urllib.parse.unquote(r))
        if not os.path.exists(p):
            missing.append(r)
    for r in missing:
        print("   HILANG:", r)
    print(f"   {len(refs) - len(missing)}/{len(refs)} aset ditemukan" + ("  -> semua aman." if not missing else ""))
    return not missing


def main():
    if not os.path.isfile(HTML):
        sys.exit("Letakkan script ini di folder yang sama dengan index.html (dan folder assets/).")
    if "--check" in sys.argv:
        sys.exit(0 if do_check() else 1)
    try:
        import PIL  # noqa
    except ImportError:
        sys.exit("butuh Pillow:  pip install pillow")
    flavor = "woff2"
    if "--flavor" in sys.argv:          # hanya untuk pengujian tanpa brotli
        flavor = sys.argv[sys.argv.index("--flavor") + 1]
    do_photos()
    do_recompress()
    do_fontawesome(flavor)
    ok = do_check()
    print("\nSelesai. Unggah ulang: index.html, style.css, dan seluruh folder assets/ (kecuali assets/_originals/ dan assets/fontawesome-free-6.7.2-web/)." if ok
          else "\nAda aset yang hilang (lihat di atas) - perbaiki sebelum diunggah.")


if __name__ == "__main__":
    main()
