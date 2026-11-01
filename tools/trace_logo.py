#!/usr/bin/env python3
"""Trace logo.png (the logo on a transparent background) into a vector: public/assets/logo.svg and app/lib/logo.json.

Usage:  python3 tools/trace_logo.py [path/to/logo.png]
Needs:  Pillow, numpy and potracer (pip install potracer)

Why: the picture on a verse page is drawn in a canvas, and a 512 px image shrunk to 52 px looks jagged there. A path is drawn sharp at
any size (and any screen density). The same path is the SVG used in the header and in the pictures the Chrome script draws.
Run it again when logo.png changes, then python3 tools/build_assets.py for the PNG icons.
"""
import json
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "logo.png"
COLOR = "#33a5a2"   # the logo's own teal
WORK_HEIGHT = 1000  # the shape is traced at this height: plenty for a logo shown at 52 px, and a short path


def fmt(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".")


def main():
    alpha = Image.open(SRC).convert("RGBA").getchannel("A")
    alpha = alpha.crop(alpha.getbbox())                       # no margin: the viewBox is the logo itself
    scale = WORK_HEIGHT / alpha.height
    alpha = alpha.resize((round(alpha.width * scale), WORK_HEIGHT), Image.LANCZOS)
    # potracer outlines the dark (False) pixels, so the logo is the False part: True = background
    bitmap = potrace.Bitmap(np.array(alpha) <= 127)
    curves = bitmap.trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.4)

    d = []
    for curve in curves:
        d.append(f"M{fmt(curve.start_point.x)} {fmt(curve.start_point.y)}")
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{fmt(seg.c.x)} {fmt(seg.c.y)}L{fmt(seg.end_point.x)} {fmt(seg.end_point.y)}")
            else:
                d.append(
                    f"C{fmt(seg.c1.x)} {fmt(seg.c1.y)} {fmt(seg.c2.x)} {fmt(seg.c2.y)} {fmt(seg.end_point.x)} {fmt(seg.end_point.y)}"
                )
        d.append("Z")
    path = "".join(d)
    w, h = alpha.width, alpha.height

    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><path fill="{COLOR}" fill-rule="evenodd" d="{path}"/></svg>\n'
    (ROOT / "public" / "assets").mkdir(parents=True, exist_ok=True)
    (ROOT / "public" / "assets" / "logo.svg").write_text(svg, encoding="utf-8")
    (ROOT / "app" / "lib" / "logo.json").write_text(
        json.dumps({"path": path, "width": w, "height": h, "color": COLOR}, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(f"public/assets/logo.svg  {len(svg) / 1000:.1f} KB, {len(curves)} outlines, viewBox {w} x {h}; app/lib/logo.json")


if __name__ == "__main__":
    main()
