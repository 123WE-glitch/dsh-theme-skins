#!/usr/bin/env python3
"""Compose the docs overview gallery from raw per-skin screenshots.

usage: python src/make-gallery.py <rawDir> <outFile>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

SKINS = [
    ("aurora", "极光 Aurora", "冷调薰衣草 / 深靛蓝"),
    ("nightflight", "夜航 Night Flight", "蓝黑 / 霓虹蓝"),
    ("nord", "北境 Nordfjord", "极地灰蓝 / 霜色"),
    ("sakura", "樱花 Sakura", "暖粉 / 暗紫梅"),
]
MODES = [("light", "浅色 Light"), ("dark", "深色 Dark")]

W, H = 800, 500
PAD = 14
HEADER_H = 92
CAPTION_H = 34
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\segoeui.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def load_font(size):
    for candidate in FONT_CANDIDATES:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(2)
    raw_dir, out_file = sys.argv[1], sys.argv[2]
    title_font = load_font(26)
    small_font = load_font(18)

    width = len(SKINS) * W + (len(SKINS) + 1) * PAD
    height = HEADER_H + len(MODES) * (H + PAD) + PAD
    canvas = Image.new("RGB", (width, height), "#101018")
    draw = ImageDraw.Draw(canvas)

    draw.text((PAD + 4, 16), "DeepSeek Harness · Theme Skins", font=title_font, fill="#F4F2FF")
    draw.text(
        (PAD + 4, 54),
        "设置 › 通用 › 主题皮肤：默认 / 极光 / 夜航 / 北境 / 樱花（浅色与深色自动适配）",
        font=small_font,
        fill="#A7A3C4",
    )

    for column, (slug, title, _subtitle) in enumerate(SKINS):
        for row, (mode, mode_cn) in enumerate(MODES):
            source = os.path.join(raw_dir, f"{slug}-{mode}.png")
            image = Image.open(source).convert("RGB").resize((W, H), Image.LANCZOS)
            x = PAD + column * (W + PAD)
            y = HEADER_H + row * (H + PAD)
            canvas.paste(image, (x, y))
            canvas.paste(Image.new("RGB", (W, CAPTION_H), "#17171f"), (x, y + H - CAPTION_H))
            draw.text((x + 12, y + H - CAPTION_H + 6), f"{title} · {mode_cn}", font=small_font, fill="#EDEBF7")

    os.makedirs(os.path.dirname(os.path.abspath(out_file)) or ".", exist_ok=True)
    canvas.save(out_file)
    print("saved", out_file, canvas.size)


if __name__ == "__main__":
    main()
