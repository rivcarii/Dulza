import os
import sys
import zipfile

root = os.path.abspath(sys.argv[1])
out = os.path.join(root, "entregables")
os.makedirs(out, exist_ok=True)


def zopen(name):
    return zipfile.ZipFile(os.path.join(out, name), "w", zipfile.ZIP_DEFLATED, compresslevel=9)


def walk(z, src, arc, skip=lambda rel: False):
    for d, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if x != "__pycache__"]
        for f in files:
            full = os.path.join(d, f)
            rel = os.path.relpath(full, src).replace(os.sep, "/")
            if skip(rel):
                continue
            z.write(full, arc + "/" + rel)


def one(z, rel, arc):
    z.write(os.path.join(root, rel), arc)


# 1) App
with zopen("Dulza-app.zip") as z:
    base = "Dulza-app"
    for f in ("index.html", "manifest.webmanifest", "sw.js", "LEEME.md", "GUIA-IMAGENES-GPT.md", "PIEZAS-ALTA-RESOLUCION.md"):
        one(z, f, f"{base}/{f}")
    walk(z, os.path.join(root, "css"), f"{base}/css")
    walk(z, os.path.join(root, "js"), f"{base}/js")
    def app_skip(r):
        # la app solo necesita lo que usa; el resto de la marca va en Dulza-marca.zip
        if not r.startswith("brand/"):
            return False
        if r.startswith("brand/gpt/v3/"):
            return r.endswith(".webp")
        if r.startswith("brand/gpt/v2/"):
            return not (r.startswith("brand/gpt/v2/sticker-") and r.endswith("-b.png"))
        return True

    walk(z, os.path.join(root, "assets"), f"{base}/assets", skip=app_skip)
    walk(z, os.path.join(root, ".dev"), f"{base}/.dev", skip=lambda r: r.startswith("deck"))

# 2) Marca
leeme_marca = """DULZA · ARCHIVOS DE MARCA

oficial-gpt/        Personaje, logos, expresiones, postres, stickers, patrones y mockups generados
                    con GPT (el diseno oficial). Lo que usa la app esta en v3/ (personaje, busto,
                    logos/, expresiones/, postres/, elementos/); en v2/ estan los stickers, poses
                    y mockups. Las laminas originales (.webp) estan en v2/ y v3/.
iconos-app/         Iconos de la app (192, 512, maskable, Apple y favicon).
vectorial-anterior/ Primera version dibujada en codigo (solo SVG). Solo de respaldo.

Las piezas sueltas de las laminas son pequenas (poses y expresiones de ~150 px).
Para pedirlas a mayor tamano, ver PIEZAS-ALTA-RESOLUCION.md.
Tipografias: Titan One (nombres, titulos y cifras) y Nunito (texto), de Google Fonts.
"""
with zopen("Dulza-marca.zip") as z:
    base = "Dulza-marca"
    z.writestr(f"{base}/LEEME.txt", leeme_marca)
    one(z, "PIEZAS-ALTA-RESOLUCION.md", f"{base}/PIEZAS-ALTA-RESOLUCION.md")
    walk(z, os.path.join(root, "assets", "brand", "gpt"), f"{base}/oficial-gpt")
    for f in sorted(os.listdir(os.path.join(root, "assets"))):
        p = os.path.join(root, "assets", f)
        if os.path.isfile(p) and f.lower().endswith(".png"):
            z.write(p, f"{base}/iconos-app/{f}")
    brand = os.path.join(root, "assets", "brand")
    for f in sorted(os.listdir(brand)):
        p = os.path.join(brand, f)
        if os.path.isfile(p) and f.lower().endswith(".svg"):  # solo los SVG: los PNG pesaban 6 MB y se regeneran
            z.write(p, f"{base}/vectorial-anterior/{f}")

# 3) Guia + referencias oficiales
refs = [
    ("assets/brand/gpt/tablero-identidad-gpt-v1.webp", "01-tablero-identidad.webp"),
    ("assets/brand/gpt/v2/hoja-de-recursos.webp", "02-hoja-de-recursos.webp"),
    ("assets/brand/gpt/v2/stickers-categorias-a.webp", "03-stickers-a.webp"),
    ("assets/brand/gpt/v2/stickers-categorias-b.webp", "04-stickers-b.webp"),
    ("assets/brand/gpt/v3/personaje-y-expresiones.webp", "05-personaje-y-expresiones.webp"),
    ("assets/brand/gpt/v3/postres-y-elementos.webp", "06-postres-y-elementos.webp"),
    ("assets/brand/gpt/v3/logos.webp", "07-logos.webp"),
    ("assets/brand/gpt/v3/personaje.png", "08-personaje-completo.png"),
    ("assets/brand/gpt/v3/busto.png", "09-personaje-busto.png"),
    ("assets/brand/gpt/v3/logos/logo-personaje.png", "10-logo.png"),
]
with zopen("Dulza-guia-GPT.zip") as z:
    base = "Dulza-guia-GPT"
    one(z, "PIEZAS-ALTA-RESOLUCION.md", f"{base}/PIEZAS-ALTA-RESOLUCION.md")
    one(z, "GUIA-IMAGENES-GPT.md", f"{base}/GUIA-IMAGENES-GPT.md")
    for src, name in refs:
        one(z, src, f"{base}/referencias-oficiales/{name}")

for n in sorted(os.listdir(out)):
    p = os.path.join(out, n)
    with zipfile.ZipFile(p) as zz:
        print(f"{n}: {len(zz.namelist())} archivos, {os.path.getsize(p) / 1e6:.1f} MB, test={zz.testzip()}")
