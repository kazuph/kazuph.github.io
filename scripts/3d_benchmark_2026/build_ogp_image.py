from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
IMAGES = ROOT.parent.parent / "images" / "posts" / "3d-model-benchmark"

CARDS = [
    ("Claude Fable 5", IMAGES / "fable5" / "trackball-split-keyboard.png"),
    ("Gemini 3.5 Flash", IMAGES / "gemini35flash" / "trackball-split-keyboard.png"),
    ("GPT-5.5", IMAGES / "gpt55" / "trackball-split-keyboard.png"),
]
OUTPUT = IMAGES / "ogp-keyboard-3way.png"


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
    slot = Image.new("RGB", (right - left, bottom - top), "#0d1016")
    source = Image.open(image_path).convert("RGB")
    fitted = ImageOps.contain(source, slot.size)
    x = (slot.width - fitted.width) // 2
    y = (slot.height - fitted.height) // 2
    slot.paste(fitted, (x, y))
    canvas.paste(slot, (left, top))


def main() -> None:
    canvas = Image.new("RGB", (1200, 630), "#0a0d12")
    draw = ImageDraw.Draw(canvas)
    label_font = load_font(26)
    title_font = load_font(34)

    draw.rounded_rectangle((24, 24, 1176, 606), radius=28, fill="#10141c", outline="#2a3346", width=3)
    draw.text((600, 64), "Interactive 3D Model Benchmark", fill="#62d6e8", font=title_font, anchor="mm")

    left0 = 54
    right0 = 1146
    gap = 18
    card_w = (right0 - left0 - 2 * gap) // 3
    top = 104
    img_bottom = 500

    for i, (text, image_path) in enumerate(CARDS):
        cx_left = left0 + i * (card_w + gap)
        cx_right = cx_left + card_w
        paste_fit(canvas, image_path, (cx_left, top, cx_right, img_bottom))
        center_x = (cx_left + cx_right) // 2
        text_box = (center_x - card_w // 2 + 6, 520, center_x + card_w // 2 - 6, 584)
        draw.rounded_rectangle(text_box, radius=22, fill="#000000aa", outline="#2a3346", width=2)
        draw.text((center_x, 552), text, fill="#ffffff", font=label_font, anchor="mm")

    canvas.save(OUTPUT)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
