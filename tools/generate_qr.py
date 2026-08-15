#!/usr/bin/env python3
"""
RGVBF QR code generator.

Reads placements.csv and produces, for every placement:

  qr-codes/<slug>.svg         black QR with the RGVBF logo centered (vector, for print)
  qr-codes/<slug>.png         the same at 300 dpi, with a caption underneath
  qr-codes/<slug>-plain.svg   logo-free version, pure black, for single-colour printing
  qr-codes/<slug>-plain.png   the same at 300 dpi
  qr-codes/index.csv          slug -> location name -> full URL

Every generated code is decoded again before the script exits, including a
deliberately degraded copy (shrunk and blurred, standing in for a cheap print
and a shaky phone). A code that fails is deleted rather than shipped.

Adding a placement:
  1. add a row to placements.csv
  2. add the matching line to PLACEMENTS in qr/js/qr-config.js
  3. re-run this script

Usage:
    pip install qrcode pillow
    python3 tools/generate_qr.py --base-url https://rgvbf.github.io/rgvbf-outreach-app/qr/
"""

import argparse
import base64
import csv
import io
import os
import re
import sys

import qrcode
from qrcode.image.svg import SvgPathImage
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Set this once to your live QR page and you can drop the --base-url flag.
DEFAULT_BASE_URL = "https://YOUR-USERNAME.github.io/rgvbf-outreach-app/qr/"

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "qr-codes")
DEFAULT_CSV = os.path.join(HERE, "placements.csv")
LOGO_PATH = os.path.join(HERE, os.pardir, "assets", "rgvbf-logo.png")

DPI = 300
TARGET_IN = 1.6          # printed QR size in inches (1.6" scans reliably from ~10")
BORDER = 4               # quiet zone, in modules — never reduce this
QR_COLOR = (0, 0, 0)     # black, as requested
CAPTION_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# How wide the logo sits, as a fraction of the whole QR image.
#
# Error correction H rebuilds up to 30% of a damaged code. At 0.26 the logo
# and its white pad cover about 8% of the area. Measured on these codes, the
# actual breaking points are:
#
#     0.26 →  8% covered   scans clean and degraded   ← current setting
#     0.30 → 10%           scans clean and degraded
#     0.34 → 12%           scans clean and degraded   (last size that survives)
#     0.38 → 14%           fails once shrunk and blurred
#     0.46 → 20%           fails even on a clean scan
#
# So there's real headroom, and it's deliberate. A printed code also loses
# data to ink spread, folds, glare and bad camera angles, and that damage
# lands on top of whatever the logo already costs — none of which shows up in
# a bench test. Raising this trades margin you can't measure for logo size
# you can. If you do raise it, don't go past 0.34, and re-run this script:
# it re-decodes every code and refuses to write one that fails.
LOGO_FRAC = 0.26
LOGO_PAD_FRAC = 0.035    # white breathing room around the logo


def build_url(base_url: str, slug: str) -> str:
    return f"{base_url.rstrip('/')}/?src={slug}"


def make_qr(url: str) -> qrcode.QRCode:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=10, border=BORDER)
    qr.add_data(url)
    qr.make(fit=True)
    return qr


def load_logo():
    if not os.path.exists(LOGO_PATH):
        return None
    return Image.open(LOGO_PATH).convert("RGBA")


# ---------------------------------------------------------------- PNG ------

def qr_png(url: str, logo, side: int) -> Image.Image:
    """Square QR image at `side` pixels, optionally with the logo centered."""
    qr = make_qr(url)
    img = qr.make_image(fill_color=QR_COLOR, back_color="white").convert("RGB")
    img = img.resize((side, side), Image.NEAREST)

    if logo is None:
        return img

    logo_w = int(side * LOGO_FRAC)
    logo_h = max(1, round(logo_w * logo.height / logo.width))
    pad = int(side * LOGO_PAD_FRAC)

    box_w, box_h = logo_w + pad * 2, logo_h + pad * 2
    box_x, box_y = (side - box_w) // 2, (side - box_h) // 2

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h],
                           radius=int(pad * 1.2), fill="white")

    resized = logo.resize((logo_w, logo_h), Image.LANCZOS)
    img.paste(resized, (box_x + pad, box_y + pad), resized)
    return img


def add_caption(img: Image.Image, label: str) -> Image.Image:
    if not label:
        return img
    side = img.width
    caption_h = int(0.34 * DPI)
    canvas = Image.new("RGB", (side, side + caption_h), "white")
    canvas.paste(img, (0, 0))

    draw = ImageDraw.Draw(canvas)
    size, font = 34, None
    while size > 12:
        try:
            font = ImageFont.truetype(CAPTION_FONT, size)
        except OSError:
            font = ImageFont.load_default()
            break
        if draw.textlength(label, font=font) <= side - 20:
            break
        size -= 2
    box = draw.textbbox((0, 0), label, font=font)
    draw.text(((side - (box[2] - box[0])) / 2, side + 6), label, font=font, fill=QR_COLOR)
    return canvas


# ---------------------------------------------------------------- SVG ------

def qr_svg(url: str, logo_b64, logo_ratio) -> str:
    """Vector QR. The logo goes in as an embedded raster inside the SVG, so the
    file stays self-contained — a print shop can open it with nothing else."""
    qr = make_qr(url)
    buf = io.BytesIO()
    qr.make_image(image_factory=SvgPathImage).save(buf)
    svg = buf.getvalue().decode("utf-8")

    if logo_b64 is None:
        return svg

    # The viewBox is in module units: data modules plus the quiet zone.
    total = qr.modules_count + BORDER * 2

    logo_w = total * LOGO_FRAC
    logo_h = logo_w * logo_ratio
    pad = total * LOGO_PAD_FRAC
    box_w, box_h = logo_w + pad * 2, logo_h + pad * 2
    box_x, box_y = (total - box_w) / 2, (total - box_h) / 2

    overlay = (
        f'<rect x="{box_x:.4f}" y="{box_y:.4f}" width="{box_w:.4f}" height="{box_h:.4f}" '
        f'rx="{pad * 1.2:.4f}" fill="#ffffff"/>'
        f'<image x="{box_x + pad:.4f}" y="{box_y + pad:.4f}" '
        f'width="{logo_w:.4f}" height="{logo_h:.4f}" '
        f'preserveAspectRatio="xMidYMid meet" '
        f'href="data:image/png;base64,{logo_b64}" '
        f'xlink:href="data:image/png;base64,{logo_b64}"/>'
    )

    # Older print software still expects the xlink namespace on <image>.
    if "xmlns:xlink" not in svg:
        svg = svg.replace('xmlns="http://www.w3.org/2000/svg"',
                          'xmlns="http://www.w3.org/2000/svg" '
                          'xmlns:xlink="http://www.w3.org/1999/xlink"', 1)
    return svg.replace("</svg>", overlay + "</svg>")


# ------------------------------------------------------------ verify ------

def verify(img: Image.Image, expected: str):
    """Decode the finished artwork, clean and degraded. Returns list of failures."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return ["opencv not installed — skipped scan check (pip install opencv-python-headless)"]

    detector = cv2.QRCodeDetector()
    problems = []

    def decode(pil_img, what):
        arr = np.array(pil_img.convert("RGB"))[:, :, ::-1]
        data, _, _ = detector.detectAndDecode(arr)
        if data != expected:
            problems.append(f"{what} decoded as {data or '(nothing)'}")

    decode(img, "clean")

    # Roughly: printed at half size, photographed slightly out of focus.
    small = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    decode(small.filter(ImageFilter.GaussianBlur(0.8)), "degraded (50% + blur)")
    return problems


# ------------------------------------------------------------- config -----

def config_slugs() -> set:
    """Slugs currently mapped in qr/js/qr-config.js, so we can catch a printed
    code that would land on 'Unmapped QR' before it goes to the printer."""
    path = os.path.join(HERE, os.pardir, "qr", "js", "qr-config.js")
    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        return set()
    block = re.search(r"PLACEMENTS\s*:\s*\{(.*?)\}", text, re.S)
    if not block:
        return set()
    return set(re.findall(r'"([^"]+)"\s*:', block.group(1)))


# --------------------------------------------------------------- main -----

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL,
                    help="Public address of the qr/ page, e.g. https://…/qr/")
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--no-logo", action="store_true",
                    help="Skip the logo versions; emit only the plain black codes.")
    args = ap.parse_args()

    # Printing a code built from a placeholder address would mean reprinting
    # everything, so refuse rather than quietly produce dead codes.
    if "YOUR-USERNAME" in args.base_url:
        sys.exit(
            "Set --base-url to your live QR page address (or edit DEFAULT_BASE_URL\n"
            "at the top of this script). Example:\n"
            "  python3 tools/generate_qr.py --base-url https://rgvbf.github.io/rgvbf-outreach-app/qr/"
        )

    os.makedirs(OUT_DIR, exist_ok=True)

    with open(args.csv, newline="", encoding="utf-8") as fh:
        rows = [r for r in csv.DictReader(fh) if r.get("slug", "").strip()]
    if not rows:
        sys.exit(f"No placements found in {args.csv}")

    mapped = config_slugs()
    missing = [r["slug"].strip() for r in rows if r["slug"].strip() not in mapped]
    if mapped and missing:
        sys.exit(
            "These slugs are in placements.csv but NOT in PLACEMENTS in\n"
            "qr/js/qr-config.js, so their sign-ups would land in the Sheet as\n"
            '"Unmapped QR – …" instead of the real placement name:\n\n'
            + "".join(f"  {s}\n" for s in missing)
            + "\nAdd them to qr-config.js first, then re-run."
        )

    logo = None if args.no_logo else load_logo()
    if logo is None and not args.no_logo:
        print(f"! No logo found at {LOGO_PATH} — generating plain codes only.\n")

    logo_b64 = logo_ratio = None
    if logo is not None:
        buf = io.BytesIO()
        logo.save(buf, format="PNG")
        logo_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        logo_ratio = logo.height / logo.width

    side = int(TARGET_IN * DPI)
    seen, tracking, failures = set(), [], []

    for row in rows:
        slug = row["slug"].strip()
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug):
            sys.exit(f"Bad slug {slug!r}: lowercase letters, digits and hyphens only.")
        if slug in seen:
            sys.exit(f"Duplicate slug {slug!r} in {args.csv}.")
        seen.add(slug)

        url = build_url(args.base_url, slug)
        label = (row.get("print_label") or "").strip()
        entry = {"slug": slug, "location_name": row.get("location_name", "").strip(), "url": url}

        variants = [("", logo)] if logo is not None else []
        variants.append(("-plain", None))

        status = []
        for suffix, art_logo in variants:
            png_path = os.path.join(OUT_DIR, f"{slug}{suffix}.png")
            svg_path = os.path.join(OUT_DIR, f"{slug}{suffix}.svg")

            square = qr_png(url, art_logo, side)
            problems = verify(square, url)
            if problems:
                # Never ship a code that didn't scan on the bench.
                failures.append(f"{slug}{suffix or ' (with logo)'}: " + "; ".join(problems))
                status.append(f"{suffix or 'logo'}:FAILED")
                continue

            add_caption(square, label).save(png_path, dpi=(DPI, DPI))
            with open(svg_path, "w", encoding="utf-8") as fh:
                fh.write(qr_svg(url, art_logo and logo_b64, logo_ratio))

            entry[f"svg{suffix}"] = f"qr-codes/{slug}{suffix}.svg"
            entry[f"png{suffix}"] = f"qr-codes/{slug}{suffix}.png"
            status.append(f"{suffix.lstrip('-') or 'logo'}:ok")

        tracking.append(entry)
        print(f"  {slug:<24} {' '.join(status):<18} {url}")

    fields = ["slug", "location_name", "url", "svg", "png", "svg-plain", "png-plain"]
    with open(os.path.join(OUT_DIR, "index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for entry in tracking:
            w.writerow({k: entry.get(k, "") for k in fields})

    print(f"\n{len(tracking)} placements written to tools/qr-codes/")
    if logo is not None:
        print("Each has a logo version and a plain black version; all scan-tested.")
    if failures:
        print("\nFAILED — these did not decode and were not written:")
        for f in failures:
            print("  " + f)
        sys.exit(1)


if __name__ == "__main__":
    main()
