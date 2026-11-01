#!/usr/bin/env python3
"""Adopt the supplied PerformAI Saint Bernard assets without altering originals.

Usage:
  python3 scripts/adopt_performai_brand.py /path/to/stbernard.png /path/to/stbernard.ico

The original source files are retained under assets/brand/. Derived native and PWA
assets are generated with contain-fit padding so no edge content is cropped.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
BRAND = ROOT / "assets" / "brand"
PUBLIC = ROOT / "public" / "assets"


def contain(source: Image.Image, size: int, padding: float, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    max_side = int(size * (1 - padding * 2))
    image = source.copy()
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: adopt_performai_brand.py <stbernard.png> <stbernard.ico>")

    mascot_input = Path(sys.argv[1]).resolve()
    icon_input = Path(sys.argv[2]).resolve()
    if not mascot_input.is_file() or not icon_input.is_file():
        raise SystemExit("Both supplied source asset paths must exist.")

    BRAND.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    canonical_mascot = BRAND / "performai-stbernard.png"
    canonical_icon = BRAND / "performai-stbernard.ico"
    shutil.copy2(mascot_input, canonical_mascot)
    shutil.copy2(icon_input, canonical_icon)

    # Retain the exact supplied mascot for the in-app Guardian view.
    shutil.copy2(canonical_mascot, ASSETS / "guardian.png")
    source = Image.open(canonical_mascot).convert("RGBA")

    contain(source, 1024, 0.08, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "icon.png", quality=95)
    contain(source, 1024, 0.18, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "splash-icon.png", quality=95)
    contain(source, 432, 0.17, (0, 0, 0, 0)).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (432, 432), (5, 8, 17, 255)).save(ASSETS / "android-icon-background.png")

    foreground = contain(source, 432, 0.17, (0, 0, 0, 0))
    monochrome = Image.new("RGBA", foreground.size, (255, 255, 255, 0))
    monochrome.putalpha(foreground.getchannel("A"))
    monochrome.save(ASSETS / "android-icon-monochrome.png")
    contain(source, 64, 0.06, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "favicon.png")

    contain(source, 192, 0.08, (5, 8, 17, 255)).convert("RGB").save(PUBLIC / "icon-192.png")
    contain(source, 512, 0.08, (5, 8, 17, 255)).convert("RGB").save(PUBLIC / "icon-512.png")
    # The root export is deliberately overwritten by the supplied canonical ICO.
    shutil.copy2(canonical_icon, ROOT / "public" / "favicon.ico")

    print(f"Canonical mascot: {canonical_mascot} ({source.width}x{source.height})")
    print(f"Canonical icon: {canonical_icon}")
    for asset in ["guardian.png", "icon.png", "splash-icon.png", "android-icon-foreground.png", "favicon.png"]:
        with Image.open(ASSETS / asset) as image:
            print(f"{asset}: {image.size} {image.mode}")


if __name__ == "__main__":
    main()
