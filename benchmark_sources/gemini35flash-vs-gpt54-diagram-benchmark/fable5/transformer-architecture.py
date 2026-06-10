import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

ATTN = ("#C87828", "#F7E3CC")
FF = ("#4678A8", "#D9E6F2")
EMB = ("#6E64A8", "#E3E0F0")
LIN = ("#46825A", "#DCEDE2")
AN = ("#C8A028", "#FAF0C8")
RES = "#787882"
SIG = "#32323C"
KV = "#2850A0"


def blk(ax, xy, w, h, colors, lines, fs=10.5):
    edge, fill = colors
    ax.add_patch(FancyBboxPatch((xy[0] - w / 2, xy[1] - h / 2), w, h,
                                boxstyle="round,pad=0.04,rounding_size=0.09",
                                facecolor=fill, edgecolor=edge,
                                linewidth=1.8, zorder=4))
    if len(lines) == 1:
        ax.text(xy[0], xy[1], lines[0], ha="center", va="center",
                fontsize=fs, family="sans-serif", zorder=5)
    else:
        for i, t in enumerate(lines):
            ax.text(xy[0], xy[1] + 0.21 - 0.42 * i, t, ha="center",
                    va="center", fontsize=fs, family="sans-serif", zorder=5)


def sig(ax, p0, p1, color=SIG, label=None, lpos=None):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=13,
                                 color=color, linewidth=1.7, shrinkA=1,
                                 shrinkB=2, zorder=3))
    if label:
        ax.text(lpos[0], lpos[1], label, fontsize=9.5, family="sans-serif",
                color=color, zorder=5)


def res_path(ax, pts, end):
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color=RES,
            linewidth=1.6, zorder=2)
    sig(ax, pts[-1], end, color=RES)


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9.6), dpi=100)
    ax.set_xlim(-3.4, 13.2)
    ax.set_ylim(-1.7, 16.0)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(4.6, 15.4, "Transformer architecture", fontsize=18,
            weight="bold", family="sans-serif", ha="center")

    EW, EH, ANH = 3.4, 0.95, 0.65
    ex, dx = 0.0, 6.6

    # ----- encoder -----
    ax.text(ex, -1.1, "Inputs", fontsize=10.5, family="sans-serif",
            ha="center", color="#46464E")
    blk(ax, (ex, 0.4), EW, EH, EMB, ["Input Embedding"])
    ax.add_patch(Circle((ex, 1.7), 0.26, facecolor="white",
                        edgecolor="black", linewidth=1.6, zorder=4))
    ax.text(ex, 1.7, "+", fontsize=12, ha="center", va="center", zorder=5)
    ax.text(ex - 0.75, 1.7, "Positional\nEncoding", fontsize=9.5,
            family="sans-serif", ha="right", va="center", color="#46464E")
    blk(ax, (ex, 3.4), EW, 1.15, ATTN, ["Multi-Head", "Attention"])
    blk(ax, (ex, 4.7), EW, ANH, AN, ["Add & Norm"])
    blk(ax, (ex, 6.1), EW, EH, FF, ["Feed Forward"])
    blk(ax, (ex, 7.4), EW, ANH, AN, ["Add & Norm"])

    ax.add_patch(FancyBboxPatch((ex - 2.6, 2.5), 4.9, 5.6,
                                boxstyle="round,pad=0.05,rounding_size=0.18",
                                facecolor="none", edgecolor="#9A9AA4",
                                linewidth=1.6, zorder=1))
    ax.text(ex - 2.5, 8.25, "Encoder ×N", fontsize=11, weight="bold",
            family="sans-serif", ha="left", color="#5A5A64")

    sig(ax, (ex, -0.85), (ex, -0.1))
    sig(ax, (ex, 0.88), (ex, 1.44))
    sig(ax, (ex, 1.96), (ex, 2.8))
    sig(ax, (ex, 3.98), (ex, 4.36))
    sig(ax, (ex, 5.03), (ex, 5.62))
    sig(ax, (ex, 6.58), (ex, 7.06))

    res_path(ax, [(ex, 2.45), (ex - 2.15, 2.45), (ex - 2.15, 4.7)],
             (ex - 1.72, 4.7))
    res_path(ax, [(ex, 5.4), (ex - 2.15, 5.4), (ex - 2.15, 7.4)],
             (ex - 1.72, 7.4))

    # ----- decoder -----
    ax.text(dx, -1.1, "Outputs (shifted right)", fontsize=10.5,
            family="sans-serif", ha="center", color="#46464E")
    blk(ax, (dx, 0.4), EW, EH, EMB, ["Output Embedding"])
    ax.add_patch(Circle((dx, 1.7), 0.26, facecolor="white",
                        edgecolor="black", linewidth=1.6, zorder=4))
    ax.text(dx, 1.7, "+", fontsize=12, ha="center", va="center", zorder=5)
    ax.text(dx + 0.75, 1.7, "Positional\nEncoding", fontsize=9.5,
            family="sans-serif", ha="left", va="center", color="#46464E")
    blk(ax, (dx, 3.4), EW, 1.15, ATTN, ["Masked Multi-Head", "Attention"])
    blk(ax, (dx, 4.7), EW, ANH, AN, ["Add & Norm"])
    blk(ax, (dx, 6.4), EW, 1.15, ATTN, ["Multi-Head Attention", "(cross)"])
    blk(ax, (dx, 7.7), EW, ANH, AN, ["Add & Norm"])
    blk(ax, (dx, 9.0), EW, EH, FF, ["Feed Forward"])
    blk(ax, (dx, 10.3), EW, ANH, AN, ["Add & Norm"])

    ax.add_patch(FancyBboxPatch((dx - 2.3, 2.5), 5.2, 8.5,
                                boxstyle="round,pad=0.05,rounding_size=0.18",
                                facecolor="none", edgecolor="#9A9AA4",
                                linewidth=1.6, zorder=1))
    ax.text(dx + 2.85, 11.15, "Decoder ×N", fontsize=11, weight="bold",
            family="sans-serif", ha="right", color="#5A5A64")

    blk(ax, (dx, 11.9), EW, EH, LIN, ["Linear"])
    blk(ax, (dx, 13.0), EW, EH, LIN, ["Softmax"])
    ax.text(dx, 14.15, "Output probabilities", fontsize=10.5,
            family="sans-serif", ha="center", color="#46464E")

    sig(ax, (dx, -0.85), (dx, -0.1))
    sig(ax, (dx, 0.88), (dx, 1.44))
    sig(ax, (dx, 1.96), (dx, 2.8))
    sig(ax, (dx, 3.98), (dx, 4.36))
    sig(ax, (dx, 5.03), (dx, 5.8), label="Q", lpos=(dx + 0.15, 5.32))
    sig(ax, (dx, 6.98), (dx, 7.36))
    sig(ax, (dx, 8.03), (dx, 8.52))
    sig(ax, (dx, 9.48), (dx, 9.96))
    sig(ax, (dx, 10.63), (dx, 11.42))
    sig(ax, (dx, 12.38), (dx, 12.52))
    sig(ax, (dx, 13.48), (dx, 13.85))

    res_path(ax, [(dx, 2.45), (dx + 2.15, 2.45), (dx + 2.15, 4.7)],
             (dx + 1.72, 4.7))
    res_path(ax, [(dx, 5.5), (dx + 2.15, 5.5), (dx + 2.15, 7.7)],
             (dx + 1.72, 7.7))
    res_path(ax, [(dx, 8.4), (dx + 2.15, 8.4), (dx + 2.15, 10.3)],
             (dx + 1.72, 10.3))

    # encoder output to cross attention (K, V)
    ax.plot([ex, ex, 3.45, 3.45], [7.73, 8.7, 8.7, 6.1], color=KV,
            linewidth=1.8, zorder=2)
    sig(ax, (3.45, 6.1), (dx - 1.72, 6.1), color=KV, label="K, V",
        lpos=(3.6, 6.35))

    # legend
    ax.plot([9.7, 10.7], [0.2, 0.2], color=RES, linewidth=1.8)
    ax.text(10.9, 0.2, "residual connection", fontsize=9.5,
            family="sans-serif", va="center", color="#46464E")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
