#!/usr/bin/env python3
"""Print the banner pattern as a CSS mask: overlapping circles on a triangular lattice (the six-petal rosette of Islamic geometry).

Usage:  python3 tools/make_pattern.py     prints `mask-image` and `mask-size` for app/styles/app.css (.banner-pattern)
Tile: R wide, R * sqrt(3) tall. Circles of radius R sit on every lattice point (odd rows shifted by R/2); the tile repeats seamlessly.
"""
from math import sqrt

R = 28
H = R * sqrt(3) / 2          # distance between rows
W, T = R, 2 * H              # one tile: the lattice repeats every R across and every two rows down
STROKE = 1.1
DOT = 1.5


def svg():
    parts = []
    for j in range(-2, 5):
        for i in range(-2, 4):
            x, y = i * R + (j % 2) * R / 2, j * H
            if -R <= x <= W + R and -R <= y <= T + R:
                parts.append(f"<circle cx='{x:.3f}' cy='{y:.3f}' r='{R}' fill='none' stroke='black' stroke-width='{STROKE}'/>")
                parts.append(f"<circle cx='{x:.3f}' cy='{y:.3f}' r='{DOT}' fill='black'/>")
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{T:.3f}' viewBox='0 0 {W} {T:.3f}'>{''.join(parts)}</svg>"


def uri(s):
    return "data:image/svg+xml," + s.replace("<", "%3C").replace(">", "%3E").replace("#", "%23").replace('"', "'")


print(f'mask-image: url("{uri(svg())}");')
print(f"mask-size: {W}px {T:.3f}px;")
