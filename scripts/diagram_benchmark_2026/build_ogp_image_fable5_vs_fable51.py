from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
OUTPUT = IMAGES / "bear-plush-ogp-fable5-vs-fable51.png"
CARDS = (
    ("Claude Fable 5", IMAGES / "fable5-bear-plush-tikz.webp"),
    ("Claude Fable 5.1", IMAGES / "fable51-bear-plush-tikz.webp"),
    ("Claude Opus 5", IMAGES / "opus5-bear-plush-tikz.webp"),
)


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
        fitted = ImageOps.contain(source_image.convert("RGB"), slot.size)
    slot.paste(fitted, ((slot.width - fitted.width) // 2, (slot.height - fitted.height) // 2))
    canvas.paste(slot, (left, top))


def main() -> None:
    missing = [path for _label, path in CARDS if not path.is_file()]
    if missing:
        raise SystemExit("missing card images:\n" + "\n".join(map(str, missing)))

    canvas = Image.new("RGB", (1200, 630), "#f7f4ed")
    draw = ImageDraw.Draw(canvas)
    label_font = load_font(24)
    draw.rounded_rectangle((24, 24, 1176, 606), radius=28, fill="#fffdf8", outline="#e2d8c8", width=3)

    for index, (label, image_path) in enumerate(CARDS):
        left = 48 + index * 372
        right = left + 348
        paste_fit(canvas, image_path, (left, 54, right, 486))
        draw.rounded_rectangle((left, 506, right, 570), radius=18, fill="#1c2638")
        draw.text(((left + right) // 2, 538), label, fill="#ffffff", font=label_font, anchor="mm")

    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
