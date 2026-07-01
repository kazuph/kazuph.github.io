from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
OUTPUT = IMAGES / "bear-plush-ogp-sonnet5-3way.png"

# leftmost = Claude Sonnet 5 (the newly added column), middle = Opus 4.8, right = Gemini 3.5 Flash
CARDS = [
    ("Claude Sonnet 5", IMAGES / "sonnet5-bear-plush-tikz.webp"),
    ("Claude Opus 4.8", IMAGES / "opus48-bear-plush-tikz.webp"),
    ("Gemini 3.5 Flash", IMAGES / "gemini35flash-bear-plush-tikz.webp"),
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
    label_font = load_font(26)

    draw.rounded_rectangle((24, 24, 1176, 606), radius=28, fill="#fffdf8", outline="#e2d8c8", width=3)

    left0 = 54
    right0 = 1146
    gap = 18
    card_w = (right0 - left0 - 2 * gap) // 3
    top = 54
    img_bottom = 486

    for i, (text, image_path) in enumerate(CARDS):
        cx_left = left0 + i * (card_w + gap)
        cx_right = cx_left + card_w
        paste_fit(canvas, image_path, (cx_left, top, cx_right, img_bottom))
        center_x = (cx_left + cx_right) // 2
        text_box = (center_x - card_w // 2 + 6, 506, center_x + card_w // 2 - 6, 570)
        draw.rounded_rectangle(text_box, radius=22, fill="#00000099")
        draw.text((center_x, 538), text, fill="#ffffff", font=label_font, anchor="mm")

    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
