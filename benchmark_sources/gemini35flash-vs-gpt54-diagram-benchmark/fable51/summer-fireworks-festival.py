import math
import random
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Ellipse, PathPatch, Polygon, Rectangle
from matplotlib.path import Path

SKY_TOP = (0.024, 0.043, 0.165)
SKY_BOT = (0.165, 0.235, 0.525)
FW1, FW1B = "#FF5E7E", "#FFC1CF"
FW2, FW2B = "#FFD166", "#FFF3C4"
FW3, FW3B = "#6EE7F9", "#D4FBFF"
LANTERN, LANTERN_HI = "#FF8C42", "#FFD9A8"
STALL = "#1A1530"
ROOF1, ROOF2 = "#C0392B", "#F4F1EA"
CROWD = "#05040F"
GROUND = "#1C1838"
WATER = "#0D1B4B"


def sky(ax):
    grad = np.linspace(0, 1, 256).reshape(-1, 1)
    top, bot = np.array(SKY_TOP), np.array(SKY_BOT)
    img = (1 - grad) * top + grad * bot
    img = np.repeat(img[:, None, :], 2, axis=1)
    ax.imshow(img[::-1], extent=(0, 12, 0, 9), aspect="auto", zorder=0, interpolation="bicubic")


def burst_chrysanthemum(ax, cx, cy, r, col, colb, n=36, z=3):
    ax.add_patch(Circle((cx, cy), r * 1.15, facecolor=col, alpha=0.10, edgecolor="none", zorder=z))
    ax.add_patch(Circle((cx, cy), r * 0.8, facecolor=col, alpha=0.12, edgecolor="none", zorder=z))
    for i in range(n):
        a = 2 * math.pi * i / n
        ax.plot([cx, cx + r * math.cos(a)], [cy, cy + r * math.sin(a)], color=col, lw=2.0, alpha=0.9, zorder=z + 1, solid_capstyle="round")
        ax.plot([cx, cx + 0.6 * r * math.cos(a)], [cy, cy + 0.6 * r * math.sin(a)], color=colb, lw=0.9, zorder=z + 2)
        ax.add_patch(Circle((cx + r * math.cos(a), cy + r * math.sin(a)), 0.045, facecolor=colb, edgecolor="none", zorder=z + 2))
        a2 = a + math.pi / n
        ax.plot([cx + 0.7 * r * math.cos(a2), cx + 0.88 * r * math.cos(a2)], [cy + 0.7 * r * math.sin(a2), cy + 0.88 * r * math.sin(a2)],
                color=colb, lw=1.1, alpha=0.8, zorder=z + 1)
        ax.add_patch(Circle((cx + 0.88 * r * math.cos(a2), cy + 0.88 * r * math.sin(a2)), 0.03, facecolor="white", edgecolor="none", zorder=z + 2))
    ax.add_patch(Circle((cx, cy), 0.3, facecolor=colb, alpha=0.6, edgecolor="none", zorder=z + 2))
    ax.add_patch(Circle((cx, cy), 0.12, facecolor="white", edgecolor="none", zorder=z + 3))


def burst_willow(ax, cx, cy, r, col, colb, n=30, z=3):
    ax.add_patch(Circle((cx, cy), r * 1.2, facecolor=col, alpha=0.10, edgecolor="none", zorder=z))
    for i in range(n):
        a = 2 * math.pi * i / n
        p1 = (cx + 0.6 * r * math.cos(a), cy + 0.6 * r * math.sin(a))
        p2 = (cx + 0.9 * r * math.cos(a), cy + 0.9 * r * math.sin(a))
        end = (cx + r * math.cos(a), cy + r * math.sin(a) - 0.35)
        path = Path([(cx, cy), p1, p2, end], [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4])
        ax.add_patch(PathPatch(path, facecolor="none", edgecolor=col, lw=1.8, alpha=0.9, zorder=z + 1, capstyle="round"))
        ax.add_patch(Circle(end, 0.04, facecolor=colb, edgecolor="none", zorder=z + 2))
        a2 = a + math.pi / n
        ax.plot([cx, cx + 0.65 * r * math.cos(a2)], [cy, cy + 0.65 * r * math.sin(a2)], color=colb, lw=0.9, alpha=0.85, zorder=z + 1)
    ax.add_patch(Circle((cx, cy), 0.25, facecolor=colb, alpha=0.6, edgecolor="none", zorder=z + 2))
    ax.add_patch(Circle((cx, cy), 0.1, facecolor="white", edgecolor="none", zorder=z + 3))


def burst_small(ax, cx, cy, r, col, colb, n=24, z=3):
    ax.add_patch(Circle((cx, cy), r * 1.15, facecolor=col, alpha=0.12, edgecolor="none", zorder=z))
    for i in range(n):
        a = 2 * math.pi * i / n
        ax.plot([cx, cx + r * math.cos(a)], [cy, cy + r * math.sin(a)], color=col, lw=1.5, alpha=0.9, zorder=z + 1, solid_capstyle="round")
        ax.add_patch(Circle((cx + r * math.cos(a), cy + r * math.sin(a)), 0.03, facecolor=colb, edgecolor="none", zorder=z + 2))
    ax.add_patch(Circle((cx, cy), 0.07, facecolor="white", edgecolor="none", zorder=z + 3))


def stall(ax, sx, sy, sign):
    ax.add_patch(Rectangle((sx, sy), 2.2, 1.25, facecolor=STALL, edgecolor="none", zorder=8))
    ax.add_patch(Rectangle((sx + 0.15, sy + 0.3), 1.9, 0.7, facecolor=LANTERN, alpha=0.55, edgecolor="none", zorder=9))
    ax.add_patch(Rectangle((sx + 0.25, sy + 0.45), 1.7, 0.5, facecolor=LANTERN_HI, alpha=0.35, edgecolor="none", zorder=9))
    for i in range(6):
        ax.add_patch(Rectangle((sx + i * 0.4 - 0.1, sy + 1.25), 0.4, 0.4, facecolor=ROOF1 if i % 2 == 0 else ROOF2, edgecolor="none", zorder=9))
    ax.add_patch(Polygon([(sx - 0.1, sy + 1.65), (sx + 2.3, sy + 1.65), (sx + 2.1, sy + 1.95), (sx + 0.1, sy + 1.95)], closed=True, facecolor=ROOF1, edgecolor="none", zorder=9))
    ax.text(sx + 1.1, sy + 1.82, sign, ha="center", va="center", fontsize=7.5, fontweight="bold", color="white", zorder=10)
    path = Path([(sx - 0.1, sy + 1.65), (sx + 1.1, sy + 1.35), (sx + 2.3, sy + 1.65)], [Path.MOVETO, Path.CURVE3, Path.CURVE3])
    ax.add_patch(PathPatch(path, facecolor="none", edgecolor="#7A6146", lw=0.8, zorder=10))
    for lx, ly in ((0.35, 1.5), (0.8, 1.42), (1.25, 1.4), (1.7, 1.45)):
        ax.add_patch(Circle((sx + lx, sy + ly - 0.12), 0.28, facecolor=LANTERN, alpha=0.25, edgecolor="none", zorder=10))
        ax.add_patch(Ellipse((sx + lx, sy + ly - 0.12), 0.22, 0.28, facecolor=LANTERN, edgecolor="none", zorder=11))
        ax.add_patch(Ellipse((sx + lx - 0.03, sy + ly - 0.08), 0.08, 0.12, facecolor=LANTERN_HI, alpha=0.7, edgecolor="none", zorder=12))
        ax.plot([sx + lx - 0.08, sx + lx + 0.08], [sy + ly - 0.12, sy + ly - 0.12], color=STALL, lw=0.8, zorder=12)


def main() -> None:
    out_path = sys.argv[1]
    random.seed(7)
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")
    sky(ax)

    for _ in range(70):
        x, y = random.uniform(0, 12), random.uniform(4.5, 9)
        ax.add_patch(Circle((x, y), random.uniform(0.012, 0.035), facecolor="white", alpha=random.uniform(0.5, 0.95), edgecolor="none", zorder=1))
    ax.add_patch(Circle((10.9, 8.0), 0.32, facecolor=FW2B, alpha=0.9, edgecolor="none", zorder=1))
    ax.add_patch(Circle((11.05, 8.1), 0.28, facecolor=SKY_TOP, edgecolor="none", zorder=1))

    burst_chrysanthemum(ax, 4.2, 6.2, 2.0, FW1, FW1B)
    burst_willow(ax, 8.6, 5.6, 1.6, FW2, FW2B)
    burst_small(ax, 9.9, 7.7, 0.85, FW3, FW3B)
    for (x0, x1, y1, col) in ((4.6, 4.2, 5.9, FW2B), (8.2, 8.6, 5.3, FW2B), (10.4, 9.9, 7.4, FW3B)):
        path = Path([(x0, 1.9), ((x0 + x1) / 2, (1.9 + y1) / 2 + 0.3), (x1, y1)], [Path.MOVETO, Path.CURVE3, Path.CURVE3])
        ax.add_patch(PathPatch(path, facecolor="none", edgecolor=col, lw=0.9, alpha=0.45, linestyle=(0, (2, 3)), zorder=2))

    # river with reflections
    ax.add_patch(Rectangle((0, 0), 12, 1.1, facecolor=WATER, edgecolor="none", zorder=6))
    for x, col, w in ((3.4, FW1, 1.6), (4.2, FW1, 1.0), (5.0, FW1, 1.4), (8.0, FW2, 1.2), (8.8, FW2, 1.7), (9.6, FW3, 0.9), (10.4, FW3, 1.2)):
        for y in (0.15, 0.35, 0.55, 0.75, 0.95):
            ax.plot([x - w / 2, x + w / 2], [y, y], color=col, alpha=0.35, lw=1.8, zorder=7)
    ax.add_patch(Rectangle((0, 1.05), 12, 0.95, facecolor=GROUND, edgecolor="none", zorder=7))

    for sx, sign in ((0.6, "YAKISOBA"), (3.3, "KAKIGORI"), (6.0, "TAKOYAKI")):
        stall(ax, sx, 1.9, sign)

    ax.add_patch(Rectangle((0, 1.1), 8.6, 0.85, facecolor=LANTERN, alpha=0.28, edgecolor="none", zorder=8))
    ax.add_patch(Rectangle((8.6, 1.1), 3.4, 0.85, facecolor=LANTERN, alpha=0.12, edgecolor="none", zorder=8))
    # crowd silhouettes
    people = [(0.4, 0.55, 0.16), (0.8, 0.7, 0.18), (1.25, 0.5, 0.15), (1.9, 0.72, 0.19), (2.35, 0.6, 0.16), (2.8, 0.45, 0.14),
              (3.25, 0.68, 0.18), (3.7, 0.55, 0.16), (4.3, 0.75, 0.2), (4.75, 0.5, 0.15), (5.2, 0.66, 0.18), (5.75, 0.58, 0.16),
              (6.2, 0.72, 0.19), (6.7, 0.48, 0.15), (7.15, 0.64, 0.17), (7.7, 0.7, 0.18), (8.2, 0.52, 0.16), (8.7, 0.66, 0.18),
              (9.15, 0.58, 0.16), (9.6, 0.74, 0.19), (10.1, 0.5, 0.15), (10.55, 0.62, 0.17), (11.0, 0.7, 0.18), (11.5, 0.55, 0.16)]
    for px, ph, pw in people:
        path = Path([(px - pw, 1.1), (px - pw, 1.1 + ph * 0.9), (px + pw, 1.1 + ph * 0.9), (px + pw, 1.1), (px - pw, 1.1)],
                    [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.CLOSEPOLY])
        ax.add_patch(PathPatch(path, facecolor=CROWD, edgecolor="none", zorder=13))
        ax.add_patch(Circle((px, 1.1 + ph * 0.9 + 0.09), 0.1, facecolor=CROWD, edgecolor="none", zorder=13))
    ax.plot([4.3, 4.15], [1.85, 2.2], color=CROWD, lw=3, zorder=13, solid_capstyle="round")
    ax.add_patch(Rectangle((9.52, 1.62), 0.16, 0.26, facecolor=CROWD, edgecolor="none", zorder=13))
    ax.add_patch(Circle((9.6, 1.95), 0.08, facecolor=CROWD, edgecolor="none", zorder=13))
    ax.plot([9.6, 9.42], [1.8, 2.05], color=CROWD, lw=2.5, zorder=13, solid_capstyle="round")
    ax.plot([9.6, 9.78], [1.8, 2.05], color=CROWD, lw=2.5, zorder=13, solid_capstyle="round")
    for x in (0.6, 1.4, 2.2, 5.9, 6.6, 7.3, 11.2):
        ax.add_patch(Ellipse((x, 1.0), 0.36, 0.06, facecolor=LANTERN_HI, alpha=0.5, edgecolor="none", zorder=8))

    fig.savefig(out_path, dpi=100)


if __name__ == "__main__":
    main()
