#!/usr/bin/env python
# scripts/extract_images.py
#
# Extrae los diagramas/exhibits de un PDF de CertyIQ y los asocia a su pregunta.
# Reproducible: si cambias el PDF o los filtros, vuelve a correrlo.
#
# Uso:
#   python scripts/extract_images.py az-700
#
# Qué hace:
#   1) Lee source/<cert>.pdf.
#   2) Descarta imágenes de plantilla (marco/fondo/logo de CertyIQ) por ancho
#      de origen y por repetición en muchas páginas.
#   3) Asocia cada imagen restante a la última "Question: N" que la precede en
#      orden de lectura, cortando en "Explanation:" para no arrastrar los
#      screenshots de la explicación (los case study no tienen ese marcador, así
#      que conservan todos sus exhibits, que es lo correcto).
#   4) Guarda los bytes nativos en public/images/<cert>/q<N>-<i>.<ext>.
#   5) Escribe el mapa source/<cert>.images.json  ({ "9": ["q9-1.jpeg", ...] }).
#      Ese archivo es editable a mano: convert.mjs lo lee para poblar el JSON.
#
# Requiere PyMuPDF:  python -m pip install PyMuPDF

import sys, re, json, hashlib, shutil
from pathlib import Path
from collections import defaultdict

import fitz  # PyMuPDF

# La consola de Windows (cp1252) no puede imprimir emojis; forzamos UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source"
IMAGES_DIR = ROOT / "public" / "images"

# Filtros de plantilla (específicos del volcado de CertyIQ).
TEMPLATE_WIDTHS = {535, 557}   # anchos del marco/fondo de página
TEMPLATE_MIN_PAGES = 8         # un mismo contenido en >=N páginas = plantilla/logo
MIN_DIM = 40                   # lado mínimo en px (descarta separadores)
MIN_AREA = 60 * 60             # área mínima en px (descarta iconos)

Q_RE = re.compile(r"Question:\s*(\d+)\b")
EXPL_RE = re.compile(r"^\s*Explanation:")


def img_meta(doc, xref):
    b = doc.extract_image(xref)
    return b["width"], b["height"], hashlib.md5(b["image"]).hexdigest(), b["ext"], b["image"]


def build_template_hashes(doc):
    pages = defaultdict(set)
    for pno in range(doc.page_count):
        for im in doc[pno].get_images(full=True):
            try:
                b = doc.extract_image(im[0])
                pages[hashlib.md5(b["image"]).hexdigest()].add(pno)
            except Exception:
                pass
    return {h for h, p in pages.items() if len(p) >= TEMPLATE_MIN_PAGES}


def keep(w, h, hsh, templates):
    if hsh in templates:
        return False
    if w in TEMPLATE_WIDTHS:
        return False
    if min(w, h) < MIN_DIM:
        return False
    if w * h < MIN_AREA:
        return False
    return True


def extract(cert):
    pdf_path = SOURCE_DIR / f"{cert}.pdf"
    if not pdf_path.exists():
        sys.exit(f"No se encontró el PDF: {pdf_path}")

    doc = fitz.open(pdf_path)
    templates = build_template_hashes(doc)

    # Asignación por orden de lectura, con corte en "Explanation:".
    q_images = defaultdict(list)   # qnum(str) -> [(hash, bytes, ext)]
    seen = defaultdict(set)        # qnum -> {hash}  (dedup por pregunta)
    current_q = None
    in_expl = False

    for pno in range(doc.page_count):
        page = doc[pno]
        events = []  # (y, tipo, payload)   tipo: 0=header 1=img 2=explanation

        for blk in page.get_text("dict")["blocks"]:
            if blk.get("type") != 0:
                continue
            for ln in blk["lines"]:
                txt = "".join(s["text"] for s in ln["spans"])
                m = Q_RE.search(txt)
                if m:
                    events.append((ln["bbox"][1], 0, m.group(1)))
                elif EXPL_RE.search(txt):
                    events.append((ln["bbox"][1], 2, None))

        for it in page.get_image_info(xrefs=True):
            xref = it.get("xref", 0)
            if not xref:
                continue
            w, h, hsh, ext, data = img_meta(doc, xref)
            if not keep(w, h, hsh, templates):
                continue
            events.append((it["bbox"][1], 1, (hsh, data, ext)))

        events.sort(key=lambda e: (e[0], e[1]))
        for _y, typ, payload in events:
            if typ == 0:
                current_q = payload
                in_expl = False
            elif typ == 2:
                in_expl = True
            else:
                if current_q is None or in_expl:
                    continue
                hsh = payload[0]
                if hsh in seen[current_q]:
                    continue
                seen[current_q].add(hsh)
                q_images[current_q].append(payload)

    # Escribe imágenes y mapa.
    out_dir = IMAGES_DIR / cert
    if out_dir.exists():
        for f in out_dir.glob("q*.*"):
            f.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)

    mapping = {}
    total = 0
    for qnum in sorted(q_images, key=lambda s: int(s)):
        files = []
        for i, (_hsh, data, ext) in enumerate(q_images[qnum], start=1):
            name = f"q{qnum}-{i}.{ext}"
            (out_dir / name).write_bytes(data)
            files.append(name)
            total += 1
        mapping[qnum] = files

    map_path = SOURCE_DIR / f"{cert}.images.json"
    map_path.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf8")

    print(f"\n✅ {cert}: {len(mapping)} preguntas con imagen, {total} imágenes")
    print(f"   → {out_dir}")
    print(f"   → {map_path}")
    print("   Revisa/edita el .images.json y luego corre: npm run convert -- " + cert)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Falta el id. Uso: python scripts/extract_images.py az-700")
    extract(sys.argv[1])
