import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

INK = "#2b2b2b"
GRAY_LINE = "#8a8a8a"

STYLES = {
    "embed": ("#e8e8e8", "#8f8f8f"),
    "attn": ("#fde3c8", "#d97f2b"),
    "masked": ("#f8d2cc", "#c0483a"),
    "cross": ("#d9e6f7", "#3b6fb0"),
    "ff": ("#d9ecdc", "#4a9160"),
    "norm": ("#fbf1c7", "#c8a415"),
    "out": ("#e7ddf3", "#7a5aa8"),
}


def block(ax, cx, cy, label, kind, w=32.0, h=5.4, fs=10.5):
    fc, ec = STYLES[kind]
    ax.add_patch(
        FancyBboxPatch(
            (cx - w / 2.0, cy - h / 2.0),
            w,
            h,
            boxstyle="round,pad=0,rounding_size=1.0",
            facecolor=fc,
            edgecolor=ec,
            linewidth=1.6,
            zorder=3,
        )
    )
    ax.text(
        cx,
        cy,
        label,
        ha="center",
        va="center",
        fontsize=fs,
        color=INK,
        zorder=4,
        linespacing=1.35,
    )
    return {"cx": cx, "cy": cy, "top": cy + h / 2.0, "bot": cy - h / 2.0,
            "left": cx - w / 2.0, "right": cx + w / 2.0}


def arrow(ax, p0, p1, color=INK, lw=1.6, ls="-", zorder=2):
    ax.add_patch(
        FancyArrowPatch(
            p0,
            p1,
            arrowstyle="-|>",
            mutation_scale=13,
            linewidth=lw,
            linestyle=ls,
            color=color,
            shrinkA=0,
            shrinkB=0,
            zorder=zorder,
        )
    )


def path_arrow(ax, points, color=INK, lw=1.6, ls="-", zorder=2):
    for a, b in zip(points[:-1], points[1:-1]):
        ax.add_line(
            Line2D(
                [a[0], b[0]],
                [a[1], b[1]],
                color=color,
                linewidth=lw,
                linestyle=ls,
                solid_capstyle="round",
                zorder=zorder,
            )
        )
    arrow(ax, points[-2], points[-1], color=color, lw=lw, ls=ls, zorder=zorder)


def stack_frame(ax, x0, x1, y0, y1, edge):
    ax.add_patch(
        FancyBboxPatch(
            (x0, y0),
            x1 - x0,
            y1 - y0,
            boxstyle="round,pad=0,rounding_size=1.6",
            facecolor="#fbfbfd",
            edgecolor=edge,
            linewidth=1.4,
            linestyle=(0, (5, 4)),
            zorder=1,
        )
    )


def pos_encoding(ax, cx, cy, label_x, ha):
    ax.add_patch(
        Circle((cx, cy), 1.7, facecolor="white", edgecolor=INK, linewidth=1.6, zorder=4)
    )
    ax.plot([cx - 0.95, cx + 0.95], [cy, cy], color=INK, lw=1.4, zorder=5)
    ax.plot([cx, cx], [cy - 0.95, cy + 0.95], color=INK, lw=1.4, zorder=5)
    ax.text(
        label_x,
        cy,
        "Positional\nEncoding",
        ha="center",
        va="center",
        fontsize=9.5,
        color=INK,
        linespacing=1.3,
    )
    sign = 1 if ha == "right" else -1
    arrow(
        ax,
        (label_x + sign * 6.0, cy),
        (cx + sign * 1.9, cy),
        color=GRAY_LINE,
        lw=1.4,
    )


def main():
    out_path = sys.argv[1]

    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 102)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    enc_x, dec_x = 32.0, 84.0
    enc_res_x, dec_res_x = 13.6, 102.6

    ax.text(
        60,
        98.4,
        "The Transformer  —  Encoder-Decoder Architecture",
        ha="center",
        va="center",
        fontsize=15.5,
        color=INK,
        fontweight="bold",
    )

    stack_frame(ax, 11, 53, 22, 62, "#c0a06a")
    stack_frame(ax, 63, 105, 22, 76, "#7f8fb0")
    ax.text(7.6, 42, "N ×", ha="center", va="center", fontsize=12.5, color=INK)
    ax.text(108.6, 49, "× N", ha="center", va="center", fontsize=12.5, color=INK)
    ax.text(32, 64.6, "Encoder", ha="center", va="center", fontsize=12, color="#8a6d2f")
    ax.text(84, 78.6, "Decoder", ha="center", va="center", fontsize=12, color="#4a5c85")

    # ---- inputs ----
    ax.text(enc_x, 3.0, "Inputs", ha="center", va="center", fontsize=11, color=INK)
    ax.text(
        dec_x, 3.0, "Outputs\n(shifted right)", ha="center", va="center",
        fontsize=10.5, color=INK, linespacing=1.3,
    )

    e_emb = block(ax, enc_x, 10.5, "Input Embedding", "embed")
    d_emb = block(ax, dec_x, 10.5, "Output Embedding", "embed")
    arrow(ax, (enc_x, 4.6), (enc_x, e_emb["bot"]))
    arrow(ax, (dec_x, 5.6), (dec_x, d_emb["bot"]))

    pos_encoding(ax, enc_x, 17.0, 4.5, "right")
    pos_encoding(ax, dec_x, 17.0, 113.5, "left")
    arrow(ax, (enc_x, e_emb["top"]), (enc_x, 15.1))
    arrow(ax, (dec_x, d_emb["top"]), (dec_x, 15.1))

    # ---- encoder stack ----
    e_attn = block(ax, enc_x, 29.0, "Multi-Head Attention\n(Self-Attention)", "attn", fs=9.8)
    e_n1 = block(ax, enc_x, 37.0, "Add & Norm", "norm")
    e_ff = block(ax, enc_x, 47.0, "Feed Forward", "ff")
    e_n2 = block(ax, enc_x, 55.0, "Add & Norm", "norm")

    arrow(ax, (enc_x, 18.7), (enc_x, e_attn["bot"]))
    arrow(ax, (enc_x, e_attn["top"]), (enc_x, e_n1["bot"]))
    arrow(ax, (enc_x, e_n1["top"]), (enc_x, e_ff["bot"]))
    arrow(ax, (enc_x, e_ff["top"]), (enc_x, e_n2["bot"]))

    # encoder residual connections
    path_arrow(
        ax,
        [(enc_x, 24.6), (enc_res_x, 24.6), (enc_res_x, e_n1["cy"]), (e_n1["left"], e_n1["cy"])],
        color="#c0392b",
        lw=1.5,
    )
    path_arrow(
        ax,
        [(enc_x, 41.6), (enc_res_x, 41.6), (enc_res_x, e_n2["cy"]), (e_n2["left"], e_n2["cy"])],
        color="#c0392b",
        lw=1.5,
    )

    # ---- decoder stack ----
    d_attn = block(ax, dec_x, 28.0, "Masked\nMulti-Head Attention", "masked", fs=9.8)
    d_n1 = block(ax, dec_x, 35.5, "Add & Norm", "norm")
    d_cross = block(ax, dec_x, 45.0, "Multi-Head Attention\n(Cross-Attention)", "cross", fs=9.8)
    d_n2 = block(ax, dec_x, 52.5, "Add & Norm", "norm")
    d_ff = block(ax, dec_x, 62.0, "Feed Forward", "ff")
    d_n3 = block(ax, dec_x, 69.5, "Add & Norm", "norm")

    arrow(ax, (dec_x, 18.7), (dec_x, d_attn["bot"]))
    arrow(ax, (dec_x, d_attn["top"]), (dec_x, d_n1["bot"]))
    arrow(ax, (dec_x, d_n1["top"]), (dec_x, d_cross["bot"]))
    arrow(ax, (dec_x, d_cross["top"]), (dec_x, d_n2["bot"]))
    arrow(ax, (dec_x, d_n2["top"]), (dec_x, d_ff["bot"]))
    arrow(ax, (dec_x, d_ff["top"]), (dec_x, d_n3["bot"]))
    ax.text(dec_x + 1.4, 41.0, "Q", ha="left", va="center", fontsize=9, color="#3b6fb0")

    # decoder residual connections
    for y_tap, target in ((24.6, d_n1), (40.0, d_n2), (57.4, d_n3)):
        path_arrow(
            ax,
            [(dec_x, y_tap), (dec_res_x, y_tap), (dec_res_x, target["cy"]),
             (target["right"], target["cy"])],
            color="#c0392b",
            lw=1.5,
        )

    # ---- encoder output -> cross attention (K, V) ----
    path_arrow(
        ax,
        [(enc_x, e_n2["top"]), (enc_x, 70.0), (58.0, 70.0), (58.0, d_cross["cy"]),
         (d_cross["left"], d_cross["cy"])],
        color="#3b6fb0",
        lw=1.9,
    )
    ax.text(
        58.0,
        47.6,
        "K, V",
        ha="center",
        va="bottom",
        fontsize=9.5,
        color="#3b6fb0",
        rotation=90,
    )

    # ---- output head ----
    lin = block(ax, dec_x, 83.5, "Linear", "out")
    soft = block(ax, dec_x, 90.5, "Softmax", "out")
    arrow(ax, (dec_x, d_n3["top"]), (dec_x, lin["bot"]))
    arrow(ax, (dec_x, lin["top"]), (dec_x, soft["bot"]))
    arrow(ax, (dec_x, soft["top"]), (dec_x, 95.4))
    ax.text(
        dec_x, 96.6, "Output Probabilities", ha="center", va="bottom",
        fontsize=11, color=INK,
    )

    ax.text(
        6.0,
        88.0,
        "red  : residual connection\nblue : encoder-decoder cross-attention",
        ha="left",
        va="center",
        fontsize=9,
        color="#5a5a5a",
        linespacing=1.6,
    )

    fig.savefig(out_path, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
