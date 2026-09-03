import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

BG = "#FFFFFF"
EMB, EMB_E = "#FCE4D6", "#C47A3A"
ATTN, ATTN_E = "#FFE9A8", "#B8860B"
FFN, FFN_E = "#CFE8F3", "#2A6F97"
NORM, NORM_E = "#E3F2E1", "#2E7D4F"
OUT, OUT_E = "#E8E0F5", "#6A3FA0"
STACK, STACK_E = "#F4F4F6", "#9AA0A6"
INK = "#233044"
RES = "#C0392B"


def blk(ax, cx, cy, text, fc, ec, w=2.6, h=0.55, z=5, size=8.5):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.1",
                                facecolor=fc, edgecolor=ec, linewidth=1.3, zorder=z))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=size, color=INK, zorder=z + 1, linespacing=1.1)


def arrow(ax, pts, color=INK, lw=1.3, z=4, head=True):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=color, lw=lw, zorder=z, solid_joinstyle="miter")
    if head:
        ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=11, color=color, linewidth=lw,
                                     zorder=z + 1, shrinkA=0, shrinkB=0))


def plus(ax, cx, cy):
    ax.add_patch(Circle((cx, cy), 0.14, facecolor="white", edgecolor=INK, linewidth=1.0, zorder=6))
    ax.text(cx, cy, "+", ha="center", va="center", fontsize=8, color=INK, zorder=7)


def t(ax, x, y, s, ha="center", va="center", size=8, color=INK, z=8):
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, color=color, zorder=z, linespacing=1.1)


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.6, 12.2)
    ax.set_ylim(-1.2, 8.9)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-0.6, -1.2), 12.8, 10.1, facecolor=BG, zorder=0))
    ax.text(-0.3, 8.3, "Transformer: encoder-decoder architecture", ha="left", va="center", fontsize=16, fontweight="bold", color=INK)

    for (x0, y0, x1, y1, label) in ((0.9, 1.3, 4.9, 6.55, "Encoder × N"), (6.7, 1.3, 10.7, 7.65, "Decoder × N")):
        ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle="round,pad=0,rounding_size=0.2",
                                    facecolor=STACK, edgecolor=STACK_E, linewidth=1.2, zorder=1))
        t(ax, x0 + 0.1, y1 - 0.2, label, ha="left", size=10, color=STACK_E)
        ax.texts[-1].set_fontweight("bold")

    # encoder column
    ex = 2.9
    blk(ax, ex, 0.0, "Input Embedding", EMB, EMB_E)
    plus(ax, ex, 0.8); t(ax, 2.6, 0.8, "Positional\nEncoding", ha="right"); ax.plot([2.75, 2.3], [0.8, 0.8], color=INK, lw=1.0, zorder=4)
    blk(ax, ex, 2.3, "Multi-Head\nAttention", ATTN, ATTN_E, h=0.7)
    blk(ax, ex, 3.35, "Add & Norm", NORM, NORM_E)
    blk(ax, ex, 4.55, "Feed\nForward", FFN, FFN_E, h=0.7)
    blk(ax, ex, 5.6, "Add & Norm", NORM, NORM_E)
    t(ax, ex, -0.5, "Inputs (source tokens)", va="top")
    arrow(ax, [(ex, -0.45), (ex, -0.28)])
    arrow(ax, [(ex, 0.28), (ex, 0.66)])
    arrow(ax, [(ex, 0.94), (ex, 1.95)])
    ax.plot([ex, 2.3, 2.3], [1.55, 1.55, 1.95], color=INK, lw=1.0, zorder=4)
    ax.plot([ex, 3.5, 3.5], [1.55, 1.55, 1.95], color=INK, lw=1.0, zorder=4)
    t(ax, 2.2, 1.75, "Q", ha="right", size=7); t(ax, 2.8, 1.75, "K", ha="right", size=7); t(ax, 3.6, 1.75, "V", ha="left", size=7)
    arrow(ax, [(ex, 2.65), (ex, 3.08)])
    arrow(ax, [(ex, 3.63), (ex, 4.2)])
    arrow(ax, [(ex, 4.9), (ex, 5.33)])
    arrow(ax, [(ex, 1.3), (4.45, 1.3), (4.45, 3.35), (4.2, 3.35)], color=RES)
    arrow(ax, [(ex, 3.95), (4.45, 3.95), (4.45, 5.6), (4.2, 5.6)], color=RES)
    arrow(ax, [(ex, 5.88), (ex, 6.0), (5.8, 6.0), (5.8, 4.0), (7.6, 4.0), (7.6, 4.35)])
    arrow(ax, [(5.8, 4.0), (8.05, 4.0), (8.05, 4.35)])
    t(ax, 5.8, 6.1, "encoder\noutput", va="bottom")
    t(ax, 7.5, 4.15, "K", ha="right", size=7); t(ax, 8.15, 4.15, "V", ha="left", size=7)

    # decoder column
    dx = 8.7
    blk(ax, dx, 0.0, "Output Embedding", EMB, EMB_E)
    plus(ax, dx, 0.8); t(ax, 9.0, 0.8, "Positional\nEncoding", ha="left"); ax.plot([8.85, 9.3], [0.8, 0.8], color=INK, lw=1.0, zorder=4)
    blk(ax, dx, 2.3, "Masked Multi-Head\nAttention", ATTN, ATTN_E, h=0.7)
    blk(ax, dx, 3.35, "Add & Norm", NORM, NORM_E)
    blk(ax, dx, 4.7, "Multi-Head Attention\n(Cross-Attention)", ATTN, ATTN_E, h=0.7)
    blk(ax, dx, 5.65, "Add & Norm", NORM, NORM_E)
    blk(ax, dx, 6.35, "Feed Forward", FFN, FFN_E)
    blk(ax, dx, 7.05, "Add & Norm", NORM, NORM_E)
    t(ax, dx, -0.5, "Outputs (shifted right)", va="top")
    arrow(ax, [(dx, -0.45), (dx, -0.28)])
    arrow(ax, [(dx, 0.28), (dx, 0.66)])
    arrow(ax, [(dx, 0.94), (dx, 1.95)])
    ax.plot([dx, 8.1, 8.1], [1.55, 1.55, 1.95], color=INK, lw=1.0, zorder=4)
    ax.plot([dx, 9.3, 9.3], [1.55, 1.55, 1.95], color=INK, lw=1.0, zorder=4)
    arrow(ax, [(dx, 2.65), (dx, 3.08)])
    arrow(ax, [(dx, 3.63), (dx, 4.35)]); t(ax, 8.8, 4.15, "Q", ha="left", size=7)
    arrow(ax, [(dx, 5.05), (dx, 5.38)])
    arrow(ax, [(dx, 5.93), (dx, 6.08)])
    arrow(ax, [(dx, 6.63), (dx, 6.78)])
    arrow(ax, [(dx, 1.3), (10.3, 1.3), (10.3, 3.35), (10.0, 3.35)], color=RES)
    arrow(ax, [(dx, 3.8), (10.3, 3.8), (10.3, 5.65), (10.0, 5.65)], color=RES)
    arrow(ax, [(dx, 5.95), (10.3, 5.95), (10.3, 7.05), (10.0, 7.05)], color=RES)
    t(ax, 10.0, 2.3, "mask: no\nfuture tokens", ha="left", size=7, color=ATTN_E)

    # output head
    blk(ax, dx, 7.95, "Linear", OUT, OUT_E, w=2.0, h=0.5)
    blk(ax, 11.4, 7.95, "Softmax", OUT, OUT_E, w=2.0, h=0.5)
    arrow(ax, [(dx, 7.33), (dx, 7.7)])
    arrow(ax, [(9.7, 7.95), (10.4, 7.95)])
    arrow(ax, [(11.4, 8.2), (11.4, 8.5)])
    t(ax, 11.4, 8.55, "Output probabilities", va="bottom")

    # legend
    arrow(ax, [(-0.3, -0.85), (0.4, -0.85)], color=RES); t(ax, 0.5, -0.85, "residual (skip) connection into Add & Norm", ha="left")
    for x, fc, ec, label in ((4.9, ATTN, ATTN_E, "attention"), (6.5, FFN, FFN_E, "feed-forward"), (8.4, NORM, NORM_E, "Add & Norm (LayerNorm)")):
        ax.add_patch(Rectangle((x, -0.95), 0.4, 0.2, facecolor=fc, edgecolor=ec, linewidth=1.0, zorder=5))
        t(ax, x + 0.45, -0.85, label, ha="left")

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
