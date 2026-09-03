from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
OUTPUT = IMAGES / "bear-plush-ogp-gemini35-38-opus5-5way.png"

CARDS = [
    ("Gemini 3.5 Flash", IMAGES / "gemini35flash-bear-plush-tikz.webp"),
    ("Gemini 3.6 Flash", IMAGES / "gemini36flash-bear-plush-tikz.webp"),
    ("Gemini 3.7 Flash", IMAGES / "gemini37flash-bear-plush-tikz.webp"),
    ("Gemini 3.8 Flash", IMAGES / "gemini38flash-bear-plush-tikz.webp"),
    ("Claude Opus 5", IMAGES / "opus5-bear-plush-tikz.webp"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ):
        font_path = Path(path)
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


def paste_fit(canvas: Image.Image, image_path: Path, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    slot = Image.new("RGB", (right - left, bottom - top), "#ffffff")
    with Image.open(image_path) as source_image:
        source = source_image.convert("RGB")
        fitted = ImageOps.contain(source, slot.size)
    x = (slot.width - fitted.width) // 2
    y = (slot.height - fitted.height) // 2
    slot.paste(fitted, (x, y))
    canvas.paste(slot, (left, top))


def main() -> None:
    missing = [path for _label, path in CARDS if not path.is_file()]
    if missing:
        raise SystemExit("missing card images:\n" + "\n".join(map(str, missing)))

    canvas = Image.new("RGB", (1200, 630), "#f7f4ed")
    draw = ImageDraw.Draw(canvas)
    label_font = load_font(18)

    draw.rounded_rectangle(
        (24, 24, 1176, 606), radius=28, fill="#fffdf8", outline="#e2d8c8", width=3
    )

    left0 = 48
    right0 = 1152
    gap = 12
    card_w = (right0 - left0 - (len(CARDS) - 1) * gap) // len(CARDS)
    top = 54
    image_bottom = 486

    for index, (label, image_path) in enumerate(CARDS):
        card_left = left0 + index * (card_w + gap)
        card_right = card_left + card_w
        paste_fit(canvas, image_path, (card_left, top, card_right, image_bottom))
        label_box = (card_left, 506, card_right, 570)
        draw.rounded_rectangle(label_box, radius=18, fill="#1c2638")
        draw.text(
            ((card_left + card_right) // 2, 538),
            label,
            fill="#ffffff",
            font=label_font,
            anchor="mm",
        )

    canvas.save(OUTPUT)
    if canvas.size != (1200, 630):
        raise SystemExit(f"unexpected output dimensions: {canvas.size}")
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
