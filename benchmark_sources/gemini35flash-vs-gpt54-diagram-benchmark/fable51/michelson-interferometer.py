import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

BG = "#FCFCFA"
BEAM = "#D7263D"
BEAM_RET = "#F28C28"
MIRROR = "#4A5A6A"
MIRROR_FACE = "#BFD7EA"
GLASS = "#CFE6F3"
LASER = "#2F3640"
SCREEN = "#F6F1E7"
INK = "#233044"
SUB = "#5C6470"


def ray(ax, p0, p1, color=BEAM, z=6):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=16, color=color, linewidth=2.4, zorder=z, shrinkA=0, shrinkB=0))


def txt(ax, x, y, s, size=11, color=INK, ha="center", va="center", weight="normal", z=9):
    ax.text(x, y, s, fontsize=size, color=color, ha=ha, va=va, fontweight=weight, zorder=z)


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-1.2, 10.8)
    ax.set_ylim(-1.6, 7.4)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-1.2, -1.6), 12, 9, facecolor=BG, zorder=0))
    txt(ax, -0.9, 7.0, "Michelson interferometer", size=16, weight="bold", ha="left")
    txt(ax, -0.9, 6.6, "A beam splitter divides the laser into two arms; the reflected beams recombine and interfere on the screen.", size=9, color=SUB, ha="left")

    bx, by = 4.5, 3.0
    max_, may = 4.5, 6.0
    mbx, mby = 8.5, 3.0
    scx, scy = 4.5, 0.0

    # laser
    ax.add_patch(FancyBboxPatch((-0.6, 2.65), 2.0, 0.7, boxstyle="round,pad=0,rounding_size=0.06", facecolor=LASER, edgecolor="none", zorder=5))
    ax.add_patch(Rectangle((1.4, 2.85), 0.25, 0.3, facecolor="#828A94", zorder=5))
    txt(ax, 0.4, 3.0, "Laser", color="white", weight="bold", z=6)
    txt(ax, 0.4, 2.35, "coherent source", size=8.5, color=SUB)

    # beam splitter
    ax.add_patch(Polygon([(bx - 0.55, by - 0.55), (bx + 0.55, by + 0.55), (bx + 0.65, by + 0.45), (bx - 0.45, by - 0.65)],
                         closed=True, facecolor=GLASS, edgecolor=MIRROR, linewidth=1.2, zorder=5))
    ax.plot([bx - 0.55, bx + 0.55], [by - 0.55, by + 0.55], color=MIRROR, lw=2.4, zorder=6)
    txt(ax, bx + 0.75, by - 0.55, "Beam Splitter", ha="left")
    txt(ax, bx + 0.75, by - 0.85, "50/50, at 45°", size=8.5, color=SUB, ha="left")

    # mirror A (top)
    ax.add_patch(Rectangle((max_ - 0.8, may), 1.6, 0.12, facecolor=MIRROR_FACE, zorder=5))
    ax.add_patch(Rectangle((max_ - 0.8, may + 0.12), 1.6, 0.18, facecolor=MIRROR, zorder=5))
    for i in range(8):
        x = max_ - 0.7 + i * 0.2
        ax.plot([x, x + 0.12], [may + 0.3, may + 0.45], color=MIRROR, lw=0.8, zorder=5)
    txt(ax, max_ + 1.0, may + 0.15, "Mirror A", ha="left")
    txt(ax, max_ + 1.0, may - 0.15, "fixed", size=8.5, color=SUB, ha="left")

    # mirror B (right, movable)
    ax.add_patch(Rectangle((mbx, mby - 0.8), 0.12, 1.6, facecolor=MIRROR_FACE, zorder=5))
    ax.add_patch(Rectangle((mbx + 0.12, mby - 0.8), 0.18, 1.6, facecolor=MIRROR, zorder=5))
    for i in range(8):
        y = mby - 0.7 + i * 0.2
        ax.plot([mbx + 0.3, mbx + 0.45], [y, y + 0.12], color=MIRROR, lw=0.8, zorder=5)
    txt(ax, mbx + 0.15, mby - 1.05, "Mirror B", va="top")
    txt(ax, mbx + 0.15, mby - 1.35, "movable (ΔL)", size=8.5, color=SUB, va="top")
    ax.add_patch(FancyArrowPatch((mbx - 0.1, mby + 1.15), (mbx + 0.6, mby + 1.15), arrowstyle="<|-|>", mutation_scale=12, color=INK, linewidth=1.2, zorder=6))
    txt(ax, mbx + 0.25, mby + 1.3, "ΔL", size=8.5, color=SUB, va="bottom")

    # screen with fringes
    ax.add_patch(Rectangle((scx - 1.1, scy - 0.15), 2.2, 0.3, facecolor=SCREEN, edgecolor=MIRROR, linewidth=1.2, zorder=5))
    for r in (0.12, 0.3, 0.48, 0.66, 0.84):
        ax.add_patch(Arc((scx, scy), 2 * r, 0.24, theta1=180, theta2=360, color="#E78A97", linewidth=1.5, zorder=6))
    txt(ax, scx, scy - 0.3, "Screen", va="top")
    txt(ax, scx, scy - 0.6, "interference fringes", size=8.5, color=SUB, va="top")

    # outgoing rays
    ray(ax, (1.65, 3.0), (bx - 0.45, by)); txt(ax, 3.0, 3.2, "incident", size=8.5, color=SUB)
    ray(ax, (bx + 0.15, by), (mbx - 0.1, mby)); txt(ax, 6.7, 3.2, "transmitted (arm B)", size=8.5, color=SUB)
    ray(ax, (bx, by + 0.15), (max_, may - 0.1)); txt(ax, bx - 0.25, 4.7, "reflected (arm A)", size=8.5, color=SUB, ha="right")
    # returning rays (offset)
    ray(ax, (mbx - 0.1, mby - 0.18), (bx + 0.15, by - 0.18), BEAM_RET)
    ray(ax, (max_ - 0.18, may - 0.1), (bx - 0.18, by + 0.15), BEAM_RET)
    ray(ax, (bx - 0.05, by - 0.2), (scx - 0.05, scy + 0.25), BEAM_RET); txt(ax, bx + 0.15, 1.5, "recombined", size=8.5, color=SUB, ha="left")
    ray(ax, (bx - 0.2, by - 0.05), (scx + 0.1, scy + 0.25), BEAM_RET)

    # arm dimensions
    ax.plot([2.5, 2.5], [3.35, 5.85], color="#8A93A0", lw=0.8, zorder=4)
    ax.plot([2.4, 2.6], [3.35, 3.35], color="#8A93A0", lw=0.8); ax.plot([2.4, 2.6], [5.85, 5.85], color="#8A93A0", lw=0.8)
    txt(ax, 2.35, 4.6, "$L_A$", size=10, color=SUB, ha="right")
    ax.plot([4.85, 8.2], [2.2, 2.2], color="#8A93A0", lw=0.8, zorder=4)
    ax.plot([4.85, 4.85], [2.1, 2.3], color="#8A93A0", lw=0.8); ax.plot([8.2, 8.2], [2.1, 2.3], color="#8A93A0", lw=0.8)
    txt(ax, 6.5, 2.0, "$L_B$", size=10, color=SUB, va="top")

    # notes and legend
    ax.text(6.6, 6.4, "Path difference $\\Delta = 2(L_B - L_A)$\nBright fringe: $\\Delta = m\\lambda$\nMoving mirror B by $\\lambda/2$ shifts one fringe",
            fontsize=9, color=SUB, ha="left", va="center", linespacing=1.5)
    ray(ax, (-0.9, -1.0), (-0.2, -1.0)); txt(ax, -0.1, -1.0, "outgoing beam", size=8.5, color=SUB, ha="left")
    ray(ax, (1.9, -1.0), (2.6, -1.0), BEAM_RET); txt(ax, 2.7, -1.0, "returning / recombined beam", size=8.5, color=SUB, ha="left")

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
