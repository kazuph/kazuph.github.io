from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
OUTPUT = IMAGES / "bear-plush-ogp-grok45-vs-opus5.png"

CARDS = [
    ("Cursor Grok 4.5", IMAGES / "grok45-bear-plush-tikz.webp"),
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
    source = Image.open(image_path).convert("RGB")
    fitted = ImageOps.contain(source, slot.size)
    x = (slot.width - fitted.width) // 2
    y = (slot.height - fitted.height) // 2
    slot.paste(fitted, (x, y))
    canvas.paste(slot, (left, top))


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    canvas = Image.new("RGB", (1200, 630), "#f7f4ed")
    draw = ImageDraw.Draw(canvas)

    label_font = load_font(34)

    draw.rounded_rectangle((24, 24, 1176, 606), radius=28, fill="#fffdf8", outline="#e2d8c8", width=3)

    left_card = (54, 54, 574, 576)
    right_card = (626, 54, 1146, 576)
    left_box = (54, 54, 574, 486)
    right_box = (626, 54, 1146, 486)
    paste_fit(canvas, CARDS[0][1], left_box)
    paste_fit(canvas, CARDS[1][1], right_box)

    for text, card in ((CARDS[0][0], left_card), (CARDS[1][0], right_card)):
        left, top, right, bottom = card
        center_x = (left + right) // 2
        text_box = (center_x - 200, 506, center_x + 200, 570)
        draw.rounded_rectangle(text_box, radius=24, fill="#00000099")
        draw.text((center_x, 538), text, fill="#ffffff", font=label_font, anchor="mm")

    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
