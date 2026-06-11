from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "fable5-vfx"
OUTPUT = IMAGES / "ogp-vfx-5panel.png"

TOP = [("水", "water.png"), ("波", "waves-storm.png"), ("森", "forest-night.png")]
BOTTOM = [("ガラス", "glass.png"), ("爆発", "explosion-peak.png")]


def load_font(size: int):
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def paste_fit(canvas, image_path, box):
    left, top, right, bottom = box
    slot = Image.new("RGB", (right - left, bottom - top), "#0d1016")
    source = Image.open(image_path).convert("RGB")
    fitted = ImageOps.fit(source, slot.size)
    slot.paste(fitted, (0, 0))
    canvas.paste(slot, (left, top))


def label(draw, cx, cy, text, font):
    w = 96
    draw.rounded_rectangle((cx - w // 2, cy - 22, cx + w // 2, cy + 22), radius=18, fill="#000000bb", outline="#2a3346", width=2)
    draw.text((cx, cy), text, fill="#ffffff", font=font, anchor="mm")


def main():
    canvas = Image.new("RGB", (1200, 630), "#0a0d12")
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(34)
    label_font = load_font(24)

    draw.rounded_rectangle((20, 20, 1180, 610), radius=26, fill="#10141c", outline="#2a3346", width=3)
    draw.text((600, 58), "Claude Fable 5 / VFX Extreme Lab", fill="#62d6e8", font=title_font, anchor="mm")

    gap = 14
    top_y0, top_y1 = 92, 348
    w3 = (1200 - 48 - 2 * gap) // 3
    for i, (name, file) in enumerate(TOP):
        x0 = 24 + i * (w3 + gap)
        paste_fit(canvas, IMAGES / file, (x0, top_y0, x0 + w3, top_y1))
        label(draw, x0 + w3 // 2, top_y1 - 32, name, label_font)

    bot_y0, bot_y1 = 348 + gap, 586
    w2 = (1200 - 48 - gap) // 2
    for i, (name, file) in enumerate(BOTTOM):
        x0 = 24 + i * (w2 + gap)
        paste_fit(canvas, IMAGES / file, (x0, bot_y0, x0 + w2, bot_y1))
        label(draw, x0 + w2 // 2, bot_y1 - 32, name, label_font)

    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
