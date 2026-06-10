import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch

def arrow(ax, start, end, color="#d62728", lw=3, ms=18, style="-|>"):
    ax.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle=style,
            mutation_scale=ms,
            linewidth=lw,
            color=color,
            shrinkA=0,
            shrinkB=0,
        )
    )

def label(ax, x, y, text, size=16):
    ax.text(x, y, text, ha="center", va="center", fontsize=size, family="sans-serif")

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python michelson.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    splitter = (6, 4.5)
    laser = (1.5, 4.5)
    mirror_a = (10.2, 4.5)
    mirror_b = (6, 8.0)
    screen = (6, 1.0)

    ax.add_patch(Rectangle((0.7, 4.15), 1.1, 0.7, facecolor="#333333", edgecolor="black"))
    label(ax, 1.25, 3.65, "Laser")

    ax.plot([5.45, 6.55], [3.95, 5.05], color="#2f80ed", lw=8, solid_capstyle="round", alpha=0.75)
    ax.plot([5.45, 6.55], [3.95, 5.05], color="white", lw=2, solid_capstyle="round", alpha=0.9)
    label(ax, 6.0, 3.45, "Beam Splitter")

    ax.plot([10.2, 10.2], [3.6, 5.4], color="#444444", lw=8, solid_capstyle="round")
    ax.plot([10.45, 10.45], [3.6, 5.4], color="#bbbbbb", lw=3, solid_capstyle="round")
    label(ax, 10.2, 3.05, "Mirror A")

    ax.plot([5.1, 6.9], [8.0, 8.0], color="#444444", lw=8, solid_capstyle="round")
    ax.plot([5.1, 6.9], [8.25, 8.25], color="#bbbbbb", lw=3, solid_capstyle="round")
    label(ax, 6.0, 8.65, "Mirror B")

    ax.plot([4.7, 7.3], [1.0, 1.0], color="#222222", lw=5, solid_capstyle="round")
    label(ax, 6.0, 0.45, "Screen")

    arrow(ax, (1.8, 4.5), (5.7, 4.5))
    arrow(ax, splitter, (9.85, 4.5))
    arrow(ax, (9.85, 4.35), (6.25, 4.35), color="#ff7f0e")
    arrow(ax, splitter, (6.0, 7.65))
    arrow(ax, (5.85, 7.65), (5.85, 4.75), color="#ff7f0e")
    arrow(ax, (6.0, 4.15), (6.0, 1.25), color="#9467bd")

    ax.text(7.9, 4.9, "Arm A", ha="center", va="bottom", fontsize=13, color="#555555")
    ax.text(6.35, 6.35, "Arm B", ha="left", va="center", fontsize=13, color="#555555")

    plt.savefig(output_path, bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)

if __name__ == "__main__":
    main()
