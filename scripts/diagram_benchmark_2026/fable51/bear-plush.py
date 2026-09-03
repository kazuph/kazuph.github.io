import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, PathPatch, Polygon
from matplotlib.path import Path

BG = "#FFF6EA"
FUR = "#D9A066"
FUR_DARK = "#B57D45"
FUR_LIGHT = "#EBC08C"
MUZZLE = "#F6E2C4"
PAD = "#F1C9A2"
NOSE = "#5A3A2A"
CHEEK = "#F2A48F"
PATCH = "#F7D08A"
STITCH = "#A56A3C"
RIBBON = "#E8735C"


def ellipse(ax, xy, w, h, fc, ec=FUR_DARK, lw=1.4, angle=0, z=1, alpha=1.0):
    ax.add_patch(
        Ellipse(xy, w, h, angle=angle, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha)
    )


def heart(ax, cx, cy, s, z):
    verts = [
        (cx, cy - 1.2 * s),
        (cx - 2.2 * s, cy + 0.6 * s), (cx - 1.4 * s, cy + 2.3 * s), (cx, cy + 1.0 * s),
        (cx + 1.4 * s, cy + 2.3 * s), (cx + 2.2 * s, cy + 0.6 * s), (cx, cy - 1.2 * s),
    ]
    codes = [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.CURVE4]
    ax.add_patch(
        PathPatch(Path(verts, codes), facecolor=PATCH, edgecolor=STITCH, linewidth=1.0,
                  linestyle=(0, (2, 2)), zorder=z)
    )


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor(BG)

    # soft backdrop + floor shadow
    ellipse(ax, (0, -1.6), 9.2, 5.2, "#F8E7D2", ec="none", z=0)
    ellipse(ax, (0, -3.55), 6.8, 0.9, "#E8D3BC", ec="none", z=0)

    # legs (short, round) with foot pads
    for s in (-1, 1):
        ellipse(ax, (s * 1.35, -2.45), 2.1, 1.9, FUR, z=2)
        ellipse(ax, (s * 1.45, -2.75), 1.24, 1.0, PAD, lw=1.0, z=3)
        for dx, dy in ((-0.28, 0.32), (0, 0.42), (0.28, 0.32)):
            ax.add_patch(Circle((s * 1.45 + dx, -2.75 + dy), 0.1, facecolor="#D9A981", edgecolor="none", zorder=4))

    # body (wide, stuffed)
    ellipse(ax, (0, -0.55), 4.7, 4.2, FUR, z=5)
    ellipse(ax, (0, -0.9), 2.7, 2.7, MUZZLE, ec="none", z=6, alpha=0.9)
    ax.plot([0, 0], [0.15, -2.05], color=STITCH, lw=1.0, linestyle=(0, (2, 3)), zorder=7)
    heart(ax, 0.85, -0.85, 0.36, 8)

    # arms (short, round, slightly forward)
    for s in (-1, 1):
        ellipse(ax, (s * 2.25, -0.35), 1.44, 2.3, FUR, angle=s * 25, z=9)
        ax.add_patch(Circle((s * 2.75, -1.25), 0.36, facecolor=PAD, edgecolor=FUR_DARK, linewidth=1.0, zorder=10))

    # ears (large, symmetric)
    for s in (-1, 1):
        ax.add_patch(Circle((s * 1.55, 2.95), 0.78, facecolor=FUR, edgecolor=FUR_DARK, linewidth=1.4, zorder=11))
        ax.add_patch(Circle((s * 1.55, 2.95), 0.42, facecolor=PAD, edgecolor="none", zorder=12))

    # head (round) + sheen
    ax.add_patch(Circle((0, 1.55), 2.05, facecolor=FUR, edgecolor=FUR_DARK, linewidth=1.4, zorder=13))
    ellipse(ax, (-0.7, 2.5), 1.6, 0.9, FUR_LIGHT, ec="none", z=14, alpha=0.55)

    # muzzle, nose, mouth
    ellipse(ax, (0, 0.85), 2.1, 1.44, MUZZLE, lw=1.0, z=15)
    nose_verts = [
        (0, 1.25), (0.42, 1.25), (0.42, 1.05), (0.22, 0.92),
        (0.1, 0.84), (-0.1, 0.84), (-0.22, 0.92),
        (-0.42, 1.05), (-0.42, 1.25), (0, 1.25),
    ]
    nose_codes = [Path.MOVETO] + [Path.CURVE4] * 9
    ax.add_patch(PathPatch(Path(nose_verts, nose_codes), facecolor=NOSE, edgecolor="none", zorder=16))
    ellipse(ax, (-0.12, 1.13), 0.2, 0.1, "white", ec="none", z=17, alpha=0.5)
    ax.plot([0, 0], [0.92, 0.66], color=NOSE, lw=2.2, solid_capstyle="round", zorder=16)
    for s in (-1, 1):
        verts = [(0, 0.66), (s * 0.15, 0.4), (s * 0.45, 0.45), (s * 0.55, 0.62)]
        ax.add_patch(PathPatch(Path(verts, [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4]),
                               facecolor="none", edgecolor=NOSE, linewidth=2.2, capstyle="round", zorder=16))

    # eyes (glossy buttons), cheeks, brows
    for s in (-1, 1):
        ax.add_patch(Circle((s * 0.72, 1.95), 0.22, facecolor=NOSE, edgecolor="none", zorder=17))
        ax.add_patch(Circle((s * 0.72 - 0.07, 2.03), 0.07, facecolor="white", edgecolor="none", zorder=18))
        ax.add_patch(Circle((s * 0.72 + 0.06, 1.88), 0.035, facecolor="white", edgecolor="none", zorder=18, alpha=0.6))
        ellipse(ax, (s * 1.3, 1.15), 0.72, 0.44, CHEEK, ec="none", z=17, alpha=0.55)
        verts = [(s * 0.5, 2.45), (s * 0.7, 2.55), (s * 0.95, 2.45)]
        ax.add_patch(PathPatch(Path(verts, [Path.MOVETO, Path.CURVE3, Path.CURVE3]),
                               facecolor="none", edgecolor=FUR_DARK, linewidth=1.4, zorder=17))

    # neck ribbon
    for s in (-1, 1):
        ax.add_patch(Polygon([(0, 0.05), (s * 0.75, 0.45), (s * 0.95, 0.08), (s * 0.75, -0.3)],
                             closed=True, facecolor=RIBBON, edgecolor="none", zorder=19))
        ellipse(ax, (s * 0.55, 0.2), 0.3, 0.14, "white", ec="none", z=20, alpha=0.35)
    ax.add_patch(Circle((0, 0.05), 0.17, facecolor=RIBBON, edgecolor="none", zorder=20))

    # head seam stitches
    import math
    for a in (110, 125, 140, 155):
        r = math.radians(a)
        x0, y0 = 1.9 * math.cos(r), 1.55 + 1.9 * math.sin(r)
        ax.plot([x0, x0 + 0.14 * math.cos(r)], [y0, y0 + 0.14 * math.sin(r)], color=STITCH, lw=0.9, zorder=14)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
