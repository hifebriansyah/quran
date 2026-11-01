#!/usr/bin/env python3
"""Make everything in public/assets/ from logo.png (the logo on a transparent background, in the project folder).

Usage:  python3 tools/build_assets.py [path/to/logo.png]
Needs:  Pillow

Writes: logo.png (trimmed, 512 px tall, transparent; the header uses logo.svg, see tools/trace_logo.py), favicon.ico, favicon-32.png, apple-touch-icon.png (180),
        icon-192.png, icon-512.png (white logo on the brand colour, with room around it for round/maskable icons: Android builds the
        splash screen of the installed app from this icon and the manifest's background colour, so it is all teal with a white logo),
        splash/<w>x<h>.png (the same for iPhones, which need their own splash images) and app/lib/splash.json (their sizes, for the page head),
        og.jpg (1200 x 630: the default link-preview picture, a white logo on the brand colour), site.webmanifest
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "logo.png"
OUT = ROOT / "public" / "assets"

PAPER = (244, 242, 235)   # --bg, light theme
INK = (64, 64, 64)        # --ink
ACCENT = (15, 122, 110)   # --accent-text
MUTED = (106, 106, 102)
BRAND = "#30c2b1"
BRAND_RGB = (48, 194, 177)
FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def trimmed(img: Image.Image) -> Image.Image:
    """Cut away the transparent margin."""
    return img.crop(img.getchannel("A").getbbox())


def fitted(logo: Image.Image, box_w: int, box_h: int) -> Image.Image:
    scale = min(box_w / logo.width, box_h / logo.height)
    return logo.resize((max(1, round(logo.width * scale)), max(1, round(logo.height * scale))), Image.LANCZOS)


def white(logo: Image.Image) -> Image.Image:
    """The logo in white, keeping its shape (and its soft edges)."""
    out = Image.new("RGBA", logo.size, (255, 255, 255, 0))
    out.putalpha(logo.getchannel("A"))
    return out


def on_brand(logo: Image.Image, width: int, height: int, share: float) -> Image.Image:
    """The white logo centred on the brand colour; its height is `share` of the shorter side."""
    tile = Image.new("RGB", (width, height), BRAND_RGB)
    mark = fitted(white(logo), round(min(width, height) * share), round(min(width, height) * share))
    tile.paste(mark, ((width - mark.width) // 2, (height - mark.height) // 2), mark)
    return tile


# iPhone screens: (width, height) in CSS px and the pixel ratio. iOS shows a splash image only when one matches the device exactly.
IPHONES = [
    (440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (390, 844, 3), (428, 926, 3),
    (375, 812, 3), (414, 896, 3), (414, 896, 2), (414, 736, 3), (375, 667, 2), (360, 780, 3),
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for f in FONTS:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    logo = trimmed(Image.open(SRC).convert("RGBA"))

    # the header logo
    head = logo.resize((round(logo.width * 512 / logo.height), 512), Image.LANCZOS)
    head.save(OUT / "logo.png", optimize=True)

    # tab icon: transparent, as big as the square allows
    for px in (16, 32, 48):
        small = fitted(logo, px - 2, px - 2)
        tile = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        tile.paste(small, ((px - small.width) // 2, (px - small.height) // 2), small)
        tile.save(OUT / f"favicon-{px}.png") if px == 32 else None
        if px == 48:
            tile.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # app icons: opaque (iOS needs it), the logo at 62% so round and maskable icons do not cut it
    on_brand(logo, 180, 180, 0.56).save(OUT / "apple-touch-icon.png", optimize=True)
    on_brand(logo, 192, 192, 0.56).save(OUT / "icon-192.png", optimize=True)
    on_brand(logo, 512, 512, 0.56).save(OUT / "icon-512.png", optimize=True)

    # splash screens for iPhones: all brand colour, a white logo in the middle (portrait; iOS turns them for landscape)
    splash_dir = OUT / "splash"
    splash_dir.mkdir(exist_ok=True)
    for old in splash_dir.glob("*.png"):
        old.unlink()
    index = []
    for w, h, dpr in IPHONES:
        name = f"{w * dpr}x{h * dpr}.png"
        on_brand(logo, w * dpr, h * dpr, 0.22 * w / min(w, h)).save(splash_dir / name, optimize=True)
        index.append({"width": w, "height": h, "ratio": dpr, "file": f"splash/{name}"})
    (ROOT / "app" / "lib" / "splash.json").write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")

    # the default link-preview picture: all brand colour with a large white logo in the middle, like the splash screen
    on_brand(logo, 1200, 630, 0.62).save(OUT / "og.jpg", quality=92, optimize=True)

    (OUT / "site.webmanifest").write_text(
        json.dumps(
            {
                "name": "quran.situs.id",
                "short_name": "Quran",
                "description": "Al-Qur'an online: Arab, Latin dan terjemah.",
                "start_url": "../id/",
                "scope": "../",
                "display": "standalone",
                "background_color": BRAND,  # the splash screen of the installed app: all teal
                "theme_color": BRAND,
                "icons": [
                    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
                    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
                ],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    for f in sorted(OUT.iterdir()):
        if f.is_file():
            print(f"{f.relative_to(ROOT)}  {f.stat().st_size / 1000:.0f} KB")
    print(f"{splash_dir.relative_to(ROOT)}/  {len(index)} files, {sum(f.stat().st_size for f in splash_dir.iterdir()) / 1000:.0f} KB; app/lib/splash.json")


if __name__ == "__main__":
    main()
