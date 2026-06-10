import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch


def draw_box(ax, x, y, w, h, text, fc="#ffffff", ec="#222222", lw=1.6, fontsize=10):
    box = Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=lw)
    ax.add_patch(box)
    ax.text(
        x + w / 2,
        y + h / 2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        family="serif",
        linespacing=1.15,
    )
    return box


def arrow(ax, start, end, color="#222222", lw=1.4, mutation_scale=12, style="-|>", rad=0.0):
    patch = FancyArrowPatch(
        start,
        end,
        arrowstyle=style,
        mutation_scale=mutation_scale,
        linewidth=lw,
        color=color,
        connectionstyle=f"arc3,rad={rad}",
        shrinkA=2,
        shrinkB=2,
    )
    ax.add_patch(patch)
    return patch


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python transformer_diagram.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")

    encoder_x = 1.0
    decoder_x = 7.0
    w = 3.0
    h = 0.55

    colors = {
        "embedding": "#eef5ff",
        "position": "#f8f1ff",
        "attention": "#fff2cc",
        "ffn": "#eaf7ea",
        "norm": "#f4f4f4",
        "output": "#ffecec",
        "stack": "#ffffff",
    }

    ax.text(encoder_x + w / 2, 8.55, "Encoder Stack", ha="center", va="center", fontsize=15, family="serif", weight="bold")
    ax.text(decoder_x + w / 2, 8.55, "Decoder Stack", ha="center", va="center", fontsize=15, family="serif", weight="bold")

    draw_box(ax, encoder_x - 0.25, 2.2, w + 0.5, 5.55, "", fc="#fbfbfb", ec="#777777", lw=1.2)
    draw_box(ax, decoder_x - 0.25, 1.25, w + 0.5, 6.5, "", fc="#fbfbfb", ec="#777777", lw=1.2)

    ax.text(encoder_x + w - 0.1, 7.45, "N×", ha="right", va="center", fontsize=13, family="serif")
    ax.text(decoder_x + w - 0.1, 7.45, "N×", ha="right", va="center", fontsize=13, family="serif")

    enc_input = draw_box(ax, encoder_x, 0.45, w, h, "Input\nEmbedding", colors["embedding"])
    enc_pos = draw_box(ax, encoder_x, 1.15, w, h, "Positional\nEncoding", colors["position"])
    enc_mha = draw_box(ax, encoder_x, 3.0, w, h, "Multi-Head\nAttention", colors["attention"])
    enc_norm1 = draw_box(ax, encoder_x, 3.85, w, h, "Add & Norm", colors["norm"])
    enc_ffn = draw_box(ax, encoder_x, 5.0, w, h, "Feed Forward", colors["ffn"])
    enc_norm2 = draw_box(ax, encoder_x, 5.85, w, h, "Add & Norm", colors["norm"])
    enc_out = draw_box(ax, encoder_x, 7.0, w, h, "Encoder\nOutput", "#ffffff", ec="#444444", lw=1.2)

    dec_input = draw_box(ax, decoder_x, 0.45, w, h, "Output\nEmbedding", colors["embedding"])
    dec_pos = draw_box(ax, decoder_x, 1.15, w, h, "Positional\nEncoding", colors["position"])
    dec_masked = draw_box(ax, decoder_x, 2.05, w, h, "Masked\nMulti-Head Attention", "#ffe8b6")
    dec_norm1 = draw_box(ax, decoder_x, 2.9, w, h, "Add & Norm", colors["norm"])
    dec_cross = draw_box(ax, decoder_x, 4.0, w, h, "Cross-Attention\nMulti-Head Attention", "#fff2cc")
    dec_norm2 = draw_box(ax, decoder_x, 4.85, w, h, "Add & Norm", colors["norm"])
    dec_ffn = draw_box(ax, decoder_x, 5.95, w, h, "Feed Forward", colors["ffn"])
    dec_norm3 = draw_box(ax, decoder_x, 6.8, w, h, "Add & Norm", colors["norm"])
    linear = draw_box(ax, decoder_x, 7.65, w, h, "Linear", colors["output"])
    softmax = draw_box(ax, decoder_x, 8.25, w, h, "Softmax", colors["output"])

    def vertical_flow(x, boxes):
        for a, b in zip(boxes[:-1], boxes[1:]):
            ax1, ay1 = a.get_xy()
            bx1, by1 = b.get_xy()
            arrow(ax, (x, ay1 + a.get_height()), (x, by1))

    vertical_flow(encoder_x + w / 2, [enc_input, enc_pos, enc_mha, enc_norm1, enc_ffn, enc_norm2, enc_out])
    vertical_flow(decoder_x + w / 2, [dec_input, dec_pos, dec_masked, dec_norm1, dec_cross, dec_norm2, dec_ffn, dec_norm3, linear, softmax])

    def residual(ax, x, y_from, y_to, side="left"):
        offset = -0.55 if side == "left" else 0.55
        sx = x + w / 2
        rx = x + w / 2 + offset
        arrow(ax, (sx, y_from), (rx, y_from), lw=1.15, mutation_scale=9)
        arrow(ax, (rx, y_from), (rx, y_to), lw=1.15, mutation_scale=9, style="-")
        arrow(ax, (rx, y_to), (sx, y_to), lw=1.15, mutation_scale=9)

    residual(ax, encoder_x, 2.62, 4.13, side="left")
    residual(ax, encoder_x, 4.42, 6.13, side="left")
    residual(ax, decoder_x, 1.72, 3.18, side="right")
    residual(ax, decoder_x, 3.47, 5.13, side="right")
    residual(ax, decoder_x, 5.43, 7.08, side="right")

    arrow(
        ax,
        (encoder_x + w, 7.28),
        (decoder_x, 4.28),
        color="#555555",
        lw=1.5,
        mutation_scale=13,
        rad=-0.08,
    )
    ax.text(
        6.0,
        5.95,
        "Encoder output\n(keys / values)",
        ha="center",
        va="center",
        fontsize=9,
        family="serif",
        color="#444444",
    )

    ax.text(encoder_x + w / 2, 0.12, "Source Tokens", ha="center", va="center", fontsize=10, family="serif")
    ax.text(decoder_x + w / 2, 0.12, "Target Tokens", ha="center", va="center", fontsize=10, family="serif")
    ax.text(decoder_x + w / 2, 8.88, "Output Probabilities", ha="center", va="center", fontsize=10, family="serif")

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    fig.savefig(output_path, dpi=100, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


if __name__ == "__main__":
    main()
