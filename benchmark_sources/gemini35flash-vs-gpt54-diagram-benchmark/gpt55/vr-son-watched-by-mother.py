import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Ellipse, Polygon, Arc, FancyArrowPatch
from matplotlib.lines import Line2D

def add_line(ax, x1, y1, x2, y2, color="#333333", lw=4, z=5):
    ax.add_line(Line2D([x1, x2], [y1, y2], color=color, linewidth=lw, solid_capstyle="round", zorder=z))

def add_controller(ax, x, y, angle=0, z=8):
    body = Ellipse((x, y), 0.38, 0.18, angle=angle, facecolor="#2f343b", edgecolor="#111111", linewidth=1.5, zorder=z)
    ax.add_patch(body)
    ax.add_patch(Circle((x + 0.06, y + 0.02), 0.025, facecolor="#77d9ff", edgecolor="none", zorder=z + 1))

def draw_room(ax):
    ax.add_patch(Rectangle((0, 0), 12, 9, facecolor="#f6eadf", edgecolor="none", zorder=0))
    ax.add_patch(Rectangle((0, 0), 12, 2.1, facecolor="#d7b58a", edgecolor="none", zorder=1))
    for x in [1.2, 2.9, 4.6, 6.3, 8.0, 9.7, 11.4]:
        add_line(ax, x, 0, x + 0.45, 2.1, color="#bd9668", lw=1.2, z=2)

    ax.add_patch(Rectangle((0.25, 2.0), 2.1, 3.8, facecolor="#8a6048", edgecolor="#4a3026", linewidth=3, zorder=2))
    ax.add_patch(Rectangle((0.48, 2.3), 1.65, 3.15, facecolor="#fff4dc", edgecolor="#4a3026", linewidth=2, zorder=3))
    ax.add_patch(Circle((1.95, 3.95), 0.07, facecolor="#3b251e", edgecolor="none", zorder=4))

    ax.add_patch(Rectangle((8.2, 1.05), 3.1, 1.1, facecolor="#8ab6d6", edgecolor="#3b5870", linewidth=2, zorder=3))
    ax.add_patch(Rectangle((8.0, 1.95), 3.55, 0.55, facecolor="#f3f7ff", edgecolor="#3b5870", linewidth=2, zorder=4))
    ax.add_patch(Rectangle((8.5, 2.32), 1.0, 0.32, facecolor="#ffcf77", edgecolor="#9b6b24", linewidth=1.5, zorder=5))
    ax.add_patch(Rectangle((8.2, 0.72), 0.25, 0.45, facecolor="#5c4438", edgecolor="none", zorder=2))
    ax.add_patch(Rectangle((10.95, 0.72), 0.25, 0.45, facecolor="#5c4438", edgecolor="none", zorder=2))

    ax.add_patch(Rectangle((6.7, 2.0), 2.2, 0.25, facecolor="#7d563d", edgecolor="#4c3428", linewidth=2, zorder=5))
    ax.add_patch(Rectangle((6.95, 0.9), 0.18, 1.15, facecolor="#5a3b2d", edgecolor="none", zorder=4))
    ax.add_patch(Rectangle((8.45, 0.9), 0.18, 1.15, facecolor="#5a3b2d", edgecolor="none", zorder=4))
    ax.add_patch(Rectangle((7.1, 2.25), 0.65, 0.42, facecolor="#5aa469", edgecolor="#25552c", linewidth=1.5, zorder=6))
    ax.add_patch(Rectangle((7.95, 2.25), 0.55, 0.35, facecolor="#ffd166", edgecolor="#9a6a18", linewidth=1.5, zorder=6))

    ax.add_patch(Rectangle((9.45, 2.7), 1.55, 3.25, facecolor="#b7875f", edgecolor="#5a3b2d", linewidth=2, zorder=3))
    for y in [3.45, 4.25, 5.05]:
        add_line(ax, 9.45, y, 11.0, y, color="#5a3b2d", lw=2, z=4)
    colors = ["#ef476f", "#06d6a0", "#118ab2", "#ffd166", "#7b61ff"]
    for i, c in enumerate(colors):
        ax.add_patch(Rectangle((9.6 + 0.25 * i, 3.55), 0.16, 0.55, facecolor=c, edgecolor="#333333", linewidth=0.7, zorder=5))
    ax.add_patch(Circle((10.55, 4.65), 0.18, facecolor="#ff9f1c", edgecolor="#7a4a00", zorder=5))
    ax.add_patch(Rectangle((9.7, 5.18), 0.55, 0.38, facecolor="#6ec6ff", edgecolor="#24536a", zorder=5))

    ax.add_patch(Rectangle((3.55, 6.25), 2.0, 1.25, facecolor="#cde7ff", edgecolor="#55768b", linewidth=2, zorder=2))
    ax.add_patch(Rectangle((3.8, 6.48), 1.5, 0.75, facecolor="#8fd3ff", edgecolor="none", zorder=3))
    add_line(ax, 4.55, 6.25, 4.55, 7.5, color="#55768b", lw=1.5, z=4)
    add_line(ax, 3.55, 6.88, 5.55, 6.88, color="#55768b", lw=1.5, z=4)

def draw_son(ax):
    skin = "#f2b38f"
    shirt = "#ff7f50"
    pants = "#3c6ea8"

    ax.add_patch(Ellipse((5.4, 4.0), 1.0, 1.35, angle=-12, facecolor=shirt, edgecolor="#7f2f1b", linewidth=2, zorder=7))
    ax.add_patch(Circle((5.25, 5.05), 0.43, facecolor=skin, edgecolor="#6b3b2a", linewidth=1.5, zorder=8))
    ax.add_patch(Ellipse((5.18, 5.28), 0.78, 0.34, angle=-8, facecolor="#4a2d20", edgecolor="none", zorder=9))

    ax.add_patch(Rectangle((4.76, 4.98), 0.9, 0.34, angle=-8, facecolor="#1b2430", edgecolor="#111111", linewidth=2, zorder=10))
    ax.add_patch(Rectangle((4.86, 5.05), 0.28, 0.12, angle=-8, facecolor="#63d2ff", edgecolor="none", alpha=0.85, zorder=11))
    ax.add_patch(Rectangle((5.28, 5.0), 0.28, 0.12, angle=-8, facecolor="#63d2ff", edgecolor="none", alpha=0.85, zorder=11))
    add_line(ax, 4.74, 5.12, 4.42, 5.18, color="#1b2430", lw=3, z=10)
    add_line(ax, 5.65, 5.06, 5.95, 4.95, color="#1b2430", lw=3, z=10)

    add_line(ax, 4.95, 4.38, 4.05, 4.95, color=skin, lw=9, z=7)
    add_line(ax, 5.78, 4.35, 6.75, 4.75, color=skin, lw=9, z=7)
    add_controller(ax, 3.95, 5.02, angle=28)
    add_controller(ax, 6.86, 4.79, angle=-20)

    ax.add_patch(Rectangle((4.9, 2.72), 0.36, 1.15, angle=-7, facecolor=pants, edgecolor="#1e3855", linewidth=1.5, zorder=6))
    ax.add_patch(Rectangle((5.55, 2.68), 0.36, 1.2, angle=12, facecolor=pants, edgecolor="#1e3855", linewidth=1.5, zorder=6))
    ax.add_patch(Ellipse((4.93, 2.58), 0.55, 0.18, angle=-8, facecolor="#222222", edgecolor="none", zorder=7))
    ax.add_patch(Ellipse((5.92, 2.52), 0.55, 0.18, angle=10, facecolor="#222222", edgecolor="none", zorder=7))

    for cx, cy, w, h in [(4.55, 5.85, 1.0, 0.38), (6.65, 5.55, 0.82, 0.32), (5.95, 3.08, 0.65, 0.25)]:
        ax.add_patch(Arc((cx, cy), w, h, angle=0, theta1=200, theta2=340, color="#ffb703", linewidth=3, zorder=12))

def draw_mother(ax):
    skin = "#e9a886"
    hair = "#4a2d20"
    dress = "#7b61ff"

    ax.add_patch(Polygon([(1.1, 2.0), (2.25, 2.0), (1.88, 4.2), (1.42, 4.2)], closed=True,
                         facecolor=dress, edgecolor="#33206f", linewidth=2, zorder=7))
    ax.add_patch(Circle((1.65, 4.82), 0.43, facecolor=skin, edgecolor="#6b3b2a", linewidth=1.5, zorder=8))
    ax.add_patch(Ellipse((1.62, 5.02), 0.9, 0.72, facecolor=hair, edgecolor="none", zorder=7))
    ax.add_patch(Circle((1.52, 4.82), 0.035, facecolor="#2b1d16", edgecolor="none", zorder=9))
    ax.add_patch(Circle((1.77, 4.78), 0.035, facecolor="#2b1d16", edgecolor="none", zorder=9))
    ax.add_patch(Arc((1.66, 4.66), 0.28, 0.18, theta1=200, theta2=340, color="#7a2d24", linewidth=1.7, zorder=9))

    add_line(ax, 1.28, 3.75, 0.82, 3.35, color=skin, lw=7, z=7)
    add_line(ax, 2.02, 3.75, 2.45, 3.28, color=skin, lw=7, z=7)
    add_line(ax, 1.38, 2.0, 1.28, 1.2, color="#3b2f75", lw=8, z=6)
    add_line(ax, 1.9, 2.0, 2.08, 1.2, color="#3b2f75", lw=8, z=6)
    ax.add_patch(Ellipse((1.22, 1.08), 0.46, 0.16, facecolor="#222222", edgecolor="none", zorder=7))
    ax.add_patch(Ellipse((2.16, 1.08), 0.46, 0.16, facecolor="#222222", edgecolor="none", zorder=7))

    ax.add_patch(FancyArrowPatch((1.85, 4.72), (4.86, 5.08), arrowstyle="->",
                                 mutation_scale=18, linewidth=2.4, color="#3949ab",
                                 linestyle=(0, (5, 4)), zorder=13))
    ax.add_patch(FancyArrowPatch((5.1, 5.1), (1.82, 4.75), arrowstyle="->",
                                 mutation_scale=16, linewidth=2.0, color="#ef476f",
                                 linestyle=(0, (2, 5)), alpha=0.9, zorder=13))

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python script.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    draw_room(ax)
    draw_mother(ax)
    draw_son(ax)

    ax.add_patch(Ellipse((5.55, 2.05), 2.2, 0.35, facecolor="#000000", alpha=0.12, edgecolor="none", zorder=2))
    ax.add_patch(Ellipse((1.7, 1.0), 1.55, 0.22, facecolor="#000000", alpha=0.12, edgecolor="none", zorder=2))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    fig.savefig(output_path, dpi=100, bbox_inches="tight", pad_inches=0)
    plt.close(fig)

if __name__ == "__main__":
    main()
