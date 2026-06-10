import sys

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

LASER = "#5A646E"
MIRROR = "#78AADC"
MIRROR_DARK = "#3C6E9E"
SCREEN = "#5A5A64"
BEAM_OUT = "#C82828"
BEAM_BACK = "#E08214"


def beam(ax, p0, p1, color, lw=2.8):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=20,
                                 color=color, linewidth=lw, shrinkA=0,
                                 shrinkB=0))


def hatch_mirror(ax, x0, y0, x1, y1, n, dx, dy):
    for i in range(n):
        t = i / (n - 1)
        px = x0 + (x1 - x0) * t
        py = y0 + (y1 - y0) * t
        ax.plot([px, px + dx], [py, py + dy], color=MIRROR_DARK, linewidth=1.4)


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-2.6, 11.4)
    ax.set_ylim(-5.4, 6.4)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(4.4, 5.8, "Michelson interferometer", fontsize=19, weight="bold",
            family="sans-serif", ha="center")

    # laser
    ax.add_patch(FancyBboxPatch((-1.6, -0.45), 2.2, 0.9,
                                boxstyle="round,pad=0.04,rounding_size=0.1",
                                facecolor=LASER, edgecolor="none"))
    ax.add_patch(Rectangle((0.6, -0.18), 0.3, 0.36, facecolor="#3A4048",
                           edgecolor="none"))
    ax.text(-0.5, -0.95, "Laser", fontsize=13, weight="bold",
            family="sans-serif", ha="center")

    # beam splitter at 45 degrees
    ax.add_patch(Polygon([(4.45, -0.62), (4.55, -0.72), (5.65, 0.55),
                          (5.55, 0.65)], facecolor=MIRROR,
                         edgecolor=MIRROR_DARK, linewidth=1.5, alpha=0.75))
    ax.text(5.7, -0.6, "Beam Splitter", fontsize=13, weight="bold",
            family="sans-serif", ha="left")

    # mirror A (top, horizontal)
    ax.add_patch(Rectangle((4.3, 4.0), 1.4, 0.22, facecolor=MIRROR,
                           edgecolor=MIRROR_DARK, linewidth=1.5))
    hatch_mirror(ax, 4.4, 4.22, 5.55, 4.22, 5, 0.18, 0.2)
    ax.text(5.0, 4.75, "Mirror A", fontsize=13, weight="bold",
            family="sans-serif", ha="center")

    # mirror B (right, vertical)
    ax.add_patch(Rectangle((9.0, -0.7), 0.22, 1.4, facecolor=MIRROR,
                           edgecolor=MIRROR_DARK, linewidth=1.5))
    hatch_mirror(ax, 9.22, -0.6, 9.22, 0.55, 5, 0.2, 0.18)
    ax.text(9.2, 1.1, "Mirror B", fontsize=13, weight="bold",
            family="sans-serif", ha="center")

    # screen
    ax.add_patch(Rectangle((4.25, -3.7), 1.5, 0.25, facecolor=SCREEN,
                           edgecolor="none"))
    ax.plot([5.0, 5.0], [-3.7, -4.1], color=SCREEN, linewidth=2.5)
    ax.add_patch(Rectangle((4.6, -4.2), 0.8, 0.15, facecolor=SCREEN,
                           edgecolor="none"))
    ax.text(5.0, -4.65, "Screen (detector)", fontsize=13, weight="bold",
            family="sans-serif", ha="center")

    # fringes beside the screen
    for y, w in [(-3.0, 0.55), (-2.8, 0.4), (-2.6, 0.25)]:
        ax.plot([6.6 - w, 6.6 + w], [y, y], color=BEAM_OUT, linewidth=2.2)
    ax.text(6.6, -2.3, "fringes", fontsize=11, color=BEAM_OUT,
            family="sans-serif", ha="center")

    # beams: incident
    beam(ax, (0.9, 0), (4.85, 0), BEAM_OUT)
    ax.text(2.8, 0.25, "incident beam", fontsize=11, color=BEAM_OUT,
            family="sans-serif", ha="center")
    # arm 1 up and back
    beam(ax, (5.0, 0.15), (5.0, 3.95), BEAM_OUT)
    beam(ax, (5.18, 3.95), (5.18, 0.2), BEAM_BACK)
    ax.text(4.7, 2.2, "arm 1", fontsize=11, color=BEAM_OUT,
            family="sans-serif", ha="center", rotation=90)
    # arm 2 right and back
    beam(ax, (5.15, 0), (8.95, 0), BEAM_OUT)
    beam(ax, (8.95, -0.18), (5.2, -0.18), BEAM_BACK)
    ax.text(7.2, 0.25, "arm 2", fontsize=11, color=BEAM_OUT,
            family="sans-serif", ha="center")
    # recombined to screen
    beam(ax, (5.0, -0.25), (5.0, -3.4), BEAM_BACK)
    ax.text(5.35, -1.8, "recombined\nbeams", fontsize=11, color=BEAM_BACK,
            family="sans-serif", ha="left")

    # reflected notes
    ax.text(6.05, 3.3, "reflected", fontsize=10.5, color=BEAM_BACK,
            family="sans-serif", ha="center")
    ax.text(7.6, -0.62, "reflected", fontsize=10.5, color=BEAM_BACK,
            family="sans-serif", ha="center")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
