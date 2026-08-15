#!/usr/bin/env python3
"""
RGVBF QR code generator.

Reads placements.csv and produces, for every placement:
  qr-codes/<slug>.svg   vector, for the designer / print shop
  qr-codes/<slug>.png   300 dpi raster with a caption, for quick use
  qr-codes/index.csv    slug -> location name -> full URL

Adding a placement:
  1. add a row to placements.csv
  2. add the matching line to PLACEMENTS in qr/js/qr-config.js
  3. re-run this script

Usage:
    pip install qrcode pillow
    python3 tools/generate_qr.py --base-url https://rgvbf.github.io/rgvbf-outreach-app/qr/
"""

import argparse
import csv
import os
import re
import sys

import qrcode
from qrcode.image.svg import SvgPathImage
from PIL import Image, ImageDraw, ImageFont

# Set this once to your live QR page and you can drop the --base-url flag.
DEFAULT_BASE_URL = "https://YOUR-USERNAME.github.io/rgvbf-outreach-app/qr/"

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "qr-codes")
DEFAULT_CSV = os.path.join(HERE, "placements.csv")

DPI = 300
TARGET_IN = 1.6          # printed QR size in inches (1.6" scans reliably from ~10")
CAPTION_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GREEN = (18, 65, 10)     # --green from the app's stylesheet


def build_url(base_url: str, slug: str) -> str:
    return f"{base_url.rstrip('/')}/?src={slug}"


def write_svg(url: str, path: str) -> None:
    qrcode.make(url, error_correction=qrcode.constants.ERROR_CORRECT_H,
                image_factory=SvgPathImage, border=4).save(path)


def write_png(url: str, label: str, path: str) -> None:
    # ERROR_CORRECT_H = 30% redundancy. Survives glossy paper, folds, ink spread.
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color=GREEN, back_color="white").convert("RGB")
    side = int(TARGET_IN * DPI)
    img = img.resize((side, side), Image.NEAREST)

    caption_h = int(0.34 * DPI) if label else 0
    canvas = Image.new("RGB", (side, side + caption_h), "white")
    canvas.paste(img, (0, 0))

    if label:
        draw = ImageDraw.Draw(canvas)
        size = 34
        font = None
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
        draw.text(((side - (box[2] - box[0])) / 2, side + 6), label, font=font, fill=GREEN)

    canvas.save(path, dpi=(DPI, DPI))


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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL,
                    help="Public address of the qr/ page, e.g. https://…/qr/")
    ap.add_argument("--csv", default=DEFAULT_CSV)
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

    seen, tracking = set(), []
    for row in rows:
        slug = row["slug"].strip()
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug):
            sys.exit(f"Bad slug {slug!r}: lowercase letters, digits and hyphens only.")
        if slug in seen:
            sys.exit(f"Duplicate slug {slug!r} in {args.csv}.")
        seen.add(slug)

        url = build_url(args.base_url, slug)
        label = (row.get("print_label") or "").strip()

        write_svg(url, os.path.join(OUT_DIR, f"{slug}.svg"))
        write_png(url, label, os.path.join(OUT_DIR, f"{slug}.png"))

        tracking.append({
            "slug": slug,
            "location_name": row.get("location_name", "").strip(),
            "url": url,
            "svg": f"qr-codes/{slug}.svg",
            "png": f"qr-codes/{slug}.png",
        })
        print(f"  {slug:<24} -> {url}")

    with open(os.path.join(OUT_DIR, "index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["slug", "location_name", "url", "svg", "png"])
        w.writeheader()
        w.writerows(tracking)

    print(f"\n{len(tracking)} QR codes written to tools/qr-codes/")
    print("Reminder: every slug above must also exist in PLACEMENTS in qr/js/qr-config.js.")


if __name__ == "__main__":
    main()
