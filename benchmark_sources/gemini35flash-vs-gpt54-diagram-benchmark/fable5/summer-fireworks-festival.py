import sys
import math

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle

SKY1 = "#101638"
SKY2 = "#1A224C"
SKY3 = "#263060"
GROUND = "#181422"
FW1 = "#FF9650"
FW2 = "#78DCB4"
FW3 = "#F082C8"
LANTERN = "#FFB446"
STALL1 = "#B44646"
STALL2 = "#466EAA"
SIL = "#0C0A14"


def burst(ax, cx, cy, r_in, r_out, n, color, lw, dot_r, sub=False):
    for i in range(n):
        a = 2 * math.pi * i / n + (math.pi / n if sub else 0)
        x0, y0 = cx + r_in * math.cos(a), cy + r_in * math.sin(a)
        x1, y1 = cx + r_out * math.cos(a), cy + r_out * math.sin(a)
        ax.plot([x0, x1], [y0, y1], color=color, linewidth=lw,
                solid_capstyle="round", alpha=0.95)
        if dot_r:
            ax.add_patch(Circle((x1, y1), dot_r, facecolor=color,
                                edgecolor="none"))
    ax.add_patch(Circle((cx, cy), 0.11, facecolor="white", edgecolor="none"))


def lantern(ax, x, y, r=0.13):
    ax.add_patch(Circle((x, y), r * 2.4, facecolor=LANTERN, alpha=0.22,
                        edgecolor="none"))
    ax.add_patch(Ellipse((x, y), 2 * r, 2.6 * r, facecolor=LANTERN,
                         edgecolor="none"))


def stall(ax, x0, color):
    ax.add_patch(Polygon([(x0, 1.58), (x0 + 2.3, 1.58), (x0 + 2.15, 1.03),
                          (x0 + 0.15, 1.03)], facecolor=color,
                         edgecolor="none"))
    for i in range(4):
        sx = x0 + 0.28 + i * 0.5
        ax.add_patch(Polygon([(sx, 1.53), (sx + 0.24, 1.53),
                              (sx + 0.2, 1.25), (sx + 0.04, 1.25)],
                             facecolor="white", alpha=0.85, edgecolor="none"))
    dark = "#3C2020" if color == STALL1 else "#20304A"
    ax.add_patch(Rectangle((x0 + 0.15, 0.2), 0.15, 0.83, facecolor=dark,
                           edgecolor="none"))
    ax.add_patch(Rectangle((x0 + 2.0, 0.2), 0.15, 0.83, facecolor=dark,
                           edgecolor="none"))
    ax.add_patch(Rectangle((x0 + 0.2, 0.2), 1.9, 0.55, facecolor=LANTERN,
                           alpha=0.28, edgecolor="none"))
    lantern(ax, x0 + 0.65, 0.85)
    lantern(ax, x0 + 1.65, 0.85)


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    # night sky bands
    ax.add_patch(Rectangle((0, 5.4), 12, 3.6, facecolor=SKY1, edgecolor="none"))
    ax.add_patch(Rectangle((0, 3.2), 12, 2.2, facecolor=SKY2, edgecolor="none"))
    ax.add_patch(Rectangle((0, 1.8), 12, 1.4, facecolor=SKY3, edgecolor="none"))

    # stars
    stars = [(0.7, 8.5), (1.8, 7.6), (3.1, 8.2), (4.4, 8.7), (6.2, 8.4),
             (7.5, 7.9), (9.1, 8.6), (10.6, 8.1), (11.4, 7.3), (2.4, 6.7),
             (10.0, 6.9), (0.9, 6.1), (11.5, 5.9)]
    for sx, sy in stars:
        ax.add_patch(Circle((sx, sy), 0.035, facecolor="white",
                            edgecolor="none"))

    # fireworks
    burst(ax, 3.6, 6.6, 0.25, 1.7, 24, FW1, 2.4, 0.055)
    burst(ax, 3.6, 6.6, 0.2, 1.1, 12, "#FFC498", 1.5, 0, sub=True)
    burst(ax, 8.6, 7.3, 0.2, 1.25, 18, FW2, 2.0, 0.05)
    burst(ax, 6.1, 5.0, 0.15, 0.85, 12, FW3, 1.7, 0.04)
    # rising trail
    tr_x = [6.35, 6.28, 6.18, 6.1]
    tr_y = [1.8, 2.8, 3.9, 4.85]
    ax.plot(tr_x, tr_y, color="#F8B4DC", linewidth=1.5,
            linestyle=(0, (2, 3)))

    # ground
    ax.add_patch(Rectangle((0, 0), 12, 1.8, facecolor=GROUND, edgecolor="none"))

    # stalls
    stall(ax, 0.7, STALL1)
    stall(ax, 9.0, STALL2)

    # lantern string between stalls
    sx = [3.0, 4.5, 6.0, 7.5, 9.0]
    sy = [1.5, 1.22, 1.13, 1.22, 1.55]
    ax.plot(sx, sy, color="#50506A", linewidth=2)
    for lx, ly in [(3.8, 1.33), (4.8, 1.2), (5.9, 1.13), (7.0, 1.15),
                   (8.1, 1.28)]:
        ax.plot([lx, lx], [ly, ly - 0.12], color="#50506A", linewidth=1.5)
        lantern(ax, lx, ly - 0.28, 0.115)

    # crowd silhouettes
    crowd = [(3.3, 0.9), (3.9, 1.0), (4.6, 0.85), (5.3, 1.05), (6.0, 0.9),
             (6.8, 1.0), (7.5, 0.85), (8.2, 0.95)]
    for cx, s in crowd:
        ax.add_patch(Ellipse((cx, 0.18), 0.42 * s, 0.68 * s, facecolor=SIL,
                             edgecolor="none"))
        ax.add_patch(Circle((cx, 0.18 + 0.42 * s), 0.13 * s, facecolor=SIL,
                            edgecolor="none"))
    # child pointing up
    ax.add_patch(Ellipse((5.65, 0.16), 0.3, 0.48, facecolor=SIL,
                         edgecolor="none"))
    ax.add_patch(Circle((5.65, 0.52), 0.1, facecolor=SIL, edgecolor="none"))
    ax.plot([5.72, 5.95], [0.42, 0.62], color=SIL, linewidth=3.5,
            solid_capstyle="round")

    # light reflections on the ground
    ax.add_patch(Rectangle((0.8, 0), 2.2, 0.5, facecolor=LANTERN, alpha=0.07,
                           edgecolor="none"))
    ax.add_patch(Rectangle((9.1, 0), 2.2, 0.5, facecolor=LANTERN, alpha=0.07,
                           edgecolor="none"))
    ax.add_patch(Rectangle((2.4, 0), 2.5, 0.9, facecolor=FW1, alpha=0.05,
                           edgecolor="none"))

    fig.savefig(out_path, bbox_inches="tight", facecolor=SKY1)


if __name__ == "__main__":
    main()
