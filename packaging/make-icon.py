#!/usr/bin/env python3
"""Draw the installer icon (packaging/icon.ico) with PIL.

usage: python packaging/make-icon.py <out.ico>
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

SIZE = 256
BASE = (18, 16, 40, 255)          # deep indigo night
DOTS = [
    (138, 122, 255, 255),          # aurora violet
    (72, 146, 242, 255),           # night flight blue
    (148, 163, 184, 255),          # nordfjord slate
    (232, 112, 150, 255),          # sakura rose
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'icon.ico'
    scale = 4
    canvas = Image.new('RGBA', (SIZE * scale, SIZE * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Rounded-square night backdrop with a subtle vertical gradient.
    radius = 56 * scale
    draw.rounded_rectangle((0, 0, SIZE * scale - 1, SIZE * scale - 1), radius=radius, fill=(0, 0, 0, 0))
    mask = Image.new('L', (SIZE * scale, SIZE * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SIZE * scale - 1, SIZE * scale - 1), radius=radius, fill=255)

    gradient = Image.new('RGBA', (SIZE * scale, SIZE * scale), BASE)
    gdraw = ImageDraw.Draw(gradient)
    for y in range(SIZE * scale):
        t = y / float(SIZE * scale - 1)
        color = (
            int(18 + (40 - 18) * t),
            int(16 + (24 - 16) * t),
            int(40 + (56 - 40) * t),
            255,
        )
        gdraw.line((0, y, SIZE * scale - 1, y), fill=color)
    canvas = Image.new('RGBA', (SIZE * scale, SIZE * scale), (0, 0, 0, 0))
    canvas.paste(gradient, (0, 0), mask)

    # Four theme dots in a 2x2 grid, with a soft halo.
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    positions = [
        (0.34, 0.34), (0.66, 0.34),
        (0.34, 0.66), (0.66, 0.66),
    ]
    dot_radius = 26 * scale
    for (fx, fy), color in zip(positions, DOTS):
        cx, cy = fx * SIZE * scale, fy * SIZE * scale
        gdraw.ellipse(
            (cx - dot_radius * 1.7, cy - dot_radius * 1.7, cx + dot_radius * 1.7, cy + dot_radius * 1.7),
            fill=(color[0], color[1], color[2], 60),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(14 * scale))
    canvas = Image.alpha_composite(canvas, glow)

    draw = ImageDraw.Draw(canvas)
    dot_radius = 26 * scale
    for (fx, fy), color in zip(positions, DOTS):
        cx, cy = fx * SIZE * scale, fy * SIZE * scale
        draw.ellipse((cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius), fill=color)
        # glass highlight
        hr = dot_radius * 0.55
        draw.ellipse(
            (cx - hr, cy - hr - dot_radius * 0.28, cx + hr * 0.2, cy + hr - dot_radius * 0.28),
            fill=(255, 255, 255, 70),
        )

    canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(out)) or '.', exist_ok=True)
    canvas.save(out, format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    canvas.save(os.path.splitext(out)[0] + '.png')
    print('saved', out)


if __name__ == '__main__':
    main()
