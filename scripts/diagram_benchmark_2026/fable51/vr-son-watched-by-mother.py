import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.transforms as mtransforms
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, PathPatch, Polygon, Rectangle
from matplotlib.path import Path

WALL = "#DCEBF7"
WALL_LINE = "#C5DAEC"
FLOOR = "#D8B98F"
FLOOR_DARK = "#B8955F"
WOOD = "#9C6B3E"
WOOD_DARK = "#7A5030"
BED = "#7FB3E6"
BED_DARK = "#4F86BF"
BLANKET = "#F2C14E"
SKIN = "#F6D3B4"
BOY_HAIR = "#4A3325"
BOY_SHIRT = "#E9553E"
BOY_PANTS = "#3B5B8C"
VR = "#2E2E36"
VR_LIGHT = "#6EE7F9"
MOM_HAIR = "#6B4A2E"
MOM_DRESS = "#6DA875"
MOM_DRESS_DARK = "#4E8256"
DOOR = "#B98457"
HALL = "#F4E6C9"
GAZE = "#E0742A"
BOOKS = ["#E76F51", "#2A9D8F", "#E9C46A", "#8E6BA8"]


def rect(ax, x, y, w, h, fc, ec="none", lw=1.0, z=1, alpha=1.0, rot=None):
    p = Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha)
    if rot is not None:
        cx, cy, deg = rot
        p.set_transform(mtransforms.Affine2D().rotate_deg_around(cx, cy, deg) + ax.transData)
    ax.add_patch(p)


def rrect(ax, x, y, w, h, fc, ec="none", lw=1.0, z=1, r=0.1, rot=None):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                       facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z)
    if rot is not None:
        cx, cy, deg = rot
        p.set_transform(mtransforms.Affine2D().rotate_deg_around(cx, cy, deg) + ax.transData)
    ax.add_patch(p)


def poly(ax, pts, fc, ec="none", lw=1.0, z=1, alpha=1.0):
    ax.add_patch(Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha))


def bez(ax, verts, codes, fc="none", ec="none", lw=1.0, z=1, alpha=1.0, ls="-"):
    ax.add_patch(PathPatch(Path(verts, codes), facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z,
                           alpha=alpha, linestyle=ls, capstyle="round"))


def circ(ax, xy, r, fc, ec="none", lw=1.0, z=1, alpha=1.0):
    ax.add_patch(Circle(xy, r, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha))


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    rect(ax, 0, 0, 12, 9, WALL, z=0)
    for y in (3.4, 4.6, 5.8, 7.0, 8.2):
        ax.plot([0, 12], [y, y], color=WALL_LINE, lw=0.8, zorder=0)
    rect(ax, 0, 0, 12, 2.8, FLOOR, z=1)
    for y in (0.45, 0.95, 1.45, 1.95, 2.45):
        ax.plot([0, 12], [y, y], color=FLOOR_DARK, lw=0.6, zorder=1)
    ax.plot([0, 12], [2.8, 2.8], color=FLOOR_DARK, lw=1.5, zorder=1)

    # window
    rect(ax, 0.6, 5.4, 2.4, 2.6, "white", z=2)
    rect(ax, 0.75, 5.55, 2.1, 2.3, "#DBF9FD", z=2)
    ax.add_patch(Ellipse((0.9, 7.3), 0.7, 0.36, facecolor="white", alpha=0.8, zorder=3))
    ax.add_patch(Ellipse((2.2, 6.6), 0.8, 0.4, facecolor="white", alpha=0.8, zorder=3))
    ax.plot([1.8, 1.8], [5.55, 7.85], color="white", lw=4, zorder=3)
    ax.plot([0.75, 2.85], [6.7, 6.7], color="white", lw=4, zorder=3)
    rect(ax, 0.55, 5.4, 2.5, 2.6, "none", ec=WOOD, lw=3, z=4)

    # bed
    rect(ax, 0.4, 2.2, 0.3, 2.7, WOOD, ec=WOOD_DARK, z=3)
    rect(ax, 4.3, 2.2, 0.3, 1.7, WOOD, ec=WOOD_DARK, z=3)
    rect(ax, 0.6, 2.5, 3.85, 0.9, BED, ec=BED_DARK, z=4)
    bez(ax, [(1.9, 2.5), (4.45, 2.5), (4.45, 3.4), (2.3, 3.4), (2.1, 3.2), (2.0, 2.9), (1.9, 2.5)],
        [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO, Path.CURVE4, Path.CURVE4, Path.CURVE4],
        fc=BLANKET, ec="#9C7C2E", lw=0.8, z=5)
    bez(ax, [(2.6, 2.6), (2.9, 2.9), (2.9, 3.1), (2.7, 3.3)], [Path.MOVETO] + [Path.CURVE4] * 3, ec="#9C7C2E", lw=0.6, z=6)
    rrect(ax, 0.85, 3.35, 1.1, 0.5, "white", ec="#BBBBBB", lw=0.8, z=6, r=0.08)
    rect(ax, 0.6, 2.3, 3.85, 0.25, WOOD, ec=WOOD_DARK, z=6)
    circ(ax, (3.6, 3.5), 0.22, "#F6BBB1", z=7)
    circ(ax, (3.45, 3.7), 0.09, "#F6BBB1", z=7)
    circ(ax, (3.75, 3.7), 0.09, "#F6BBB1", z=7)
    circ(ax, (3.53, 3.53), 0.03, "#444444", z=8)
    circ(ax, (3.67, 3.53), 0.03, "#444444", z=8)

    # bookshelf
    rect(ax, 9.1, 2.8, 2.4, 4.55, WOOD, ec=WOOD_DARK, z=3)
    for y in (3.0, 4.4, 5.8):
        rect(ax, 9.25, y, 2.1, 0.12, WOOD_DARK, z=4)
    rect(ax, 9.1, 7.2, 2.4, 0.15, WOOD_DARK, z=4)
    rect(ax, 9.6, 7.35, 0.35, 0.3, "#B0563A", z=4)
    for (cx, cy, r) in ((9.78, 7.65, 0.2), (9.6, 7.85, 0.14), (9.95, 7.9, 0.15)):
        circ(ax, (cx, cy), r, MOM_DRESS, z=4)
    for i, (x, h) in enumerate([(9.35, 1.2), (9.7, 1.0), (10.0, 1.15), (10.3, 0.95), (10.6, 1.1), (10.9, 1.05)]):
        rect(ax, x, 5.92, 0.24, h - 0.05, BOOKS[(i + 2) % 4], ec="#00000055", lw=0.6, z=4)
    rect(ax, 9.55, 4.52, 0.5, 0.58, "#6E6E78", z=4)
    circ(ax, (9.65, 4.85), 0.06, VR_LIGHT, z=5)
    circ(ax, (9.95, 4.85), 0.06, VR_LIGHT, z=5)
    rect(ax, 10.7, 4.52, 0.3, 0.1, BOOKS[2], z=4)
    bez(ax, [(10.85, 4.62), (10.75, 4.9), (10.75, 5.15), (10.95, 5.15), (10.95, 4.9), (10.85, 4.62)],
        [Path.MOVETO, Path.LINETO, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.LINETO], fc=BOOKS[2], z=4)
    rect(ax, 9.4, 3.12, 1.0, 0.73, "white", ec="#00000055", z=4)
    rect(ax, 9.5, 3.22, 0.8, 0.53, VR_LIGHT, z=5)
    rect(ax, 10.6, 3.12, 0.6, 0.48, BOOKS[0], ec="#00000055", z=4)

    # desk with monitor
    rect(ax, 11.2, 2.8, 0.2, 1.6, WOOD, ec=WOOD_DARK, z=3)
    rect(ax, 7.4, 4.35, 4.5, 0.25, "#AE7F52", ec=WOOD_DARK, z=5)
    rect(ax, 7.5, 2.8, 0.2, 1.55, WOOD, ec=WOOD_DARK, z=3)
    rrect(ax, 7.9, 4.6, 1.0, 0.9, VR, z=6, r=0.05)
    rect(ax, 8.0, 4.7, 0.8, 0.7, "#A8F1FB", z=7)
    rect(ax, 8.3, 4.55, 0.2, 0.1, VR, z=6)

    # door and hallway
    rect(ax, 5.9, 2.8, 1.3, 4.6, HALL, z=2)
    poly(ax, [(7.0, 2.8), (7.35, 2.6), (7.35, 7.65), (7.0, 7.4)], DOOR, ec=WOOD_DARK, lw=1.0, z=3)
    rect(ax, 5.85, 2.8, 1.35, 4.6, "none", ec=WOOD_DARK, lw=1.5, z=4)
    circ(ax, (7.25, 5.1), 0.07, BOOKS[2], z=5)

    # mother in the doorway
    rect(ax, 6.1, 2.85, 0.85, 1.85, MOM_DRESS, ec=MOM_DRESS_DARK, z=5)
    poly(ax, [(6.2, 4.6), (6.85, 4.6), (6.95, 5.8), (6.1, 5.8)], MOM_DRESS, ec=MOM_DRESS_DARK, z=5)
    rect(ax, 6.25, 2.6, 0.2, 0.3, SKIN, z=5)
    rect(ax, 6.6, 2.6, 0.2, 0.3, SKIN, z=5)
    rect(ax, 6.2, 2.5, 0.3, 0.15, MOM_HAIR, z=5)
    rect(ax, 6.55, 2.5, 0.3, 0.15, MOM_HAIR, z=5)
    rrect(ax, 6.0, 4.9, 0.35, 0.85, MOM_DRESS, ec=MOM_DRESS_DARK, z=6, r=0.08)
    rrect(ax, 6.3, 4.85, 0.7, 0.3, MOM_DRESS, ec=MOM_DRESS_DARK, z=6, r=0.08)
    circ(ax, (6.05, 4.85), 0.13, SKIN, z=7)
    circ(ax, (6.15, 5.05), 0.11, SKIN, z=7)
    rect(ax, 6.3, 2.9, 0.5, 1.8, "white", z=6, alpha=0.8)
    rect(ax, 6.4, 5.75, 0.25, 0.2, SKIN, z=5)
    circ(ax, (6.52, 6.35), 0.45, SKIN, ec="#C9A688", lw=0.8, z=7)
    bez(ax, [(6.52, 6.55), (6.0, 6.6), (6.05, 7.15), (6.55, 7.15), (7.05, 7.15), (7.05, 6.6), (6.52, 6.55)],
        [Path.MOVETO] + [Path.CURVE4] * 6, fc=MOM_HAIR, z=8)
    bez(ax, [(6.85, 6.9), (7.05, 6.6), (7.0, 6.1), (6.85, 5.85), (6.95, 6.3), (6.95, 6.6), (6.85, 6.9)],
        [Path.MOVETO] + [Path.CURVE4] * 6, fc=MOM_HAIR, z=8)
    circ(ax, (6.9, 6.6), 0.2, MOM_HAIR, z=8)
    circ(ax, (6.32, 6.38), 0.045, "#444444", z=9)
    ax.plot([6.2, 6.4], [6.55, 6.55], color="#444444", lw=0.8, zorder=9)
    bez(ax, [(6.25, 6.12), (6.32, 6.06), (6.38, 6.06), (6.45, 6.12)], [Path.MOVETO] + [Path.CURVE4] * 3, ec="#8B3325", lw=1.0, z=9)
    ax.add_patch(Ellipse((6.3, 6.25), 0.16, 0.1, facecolor=BOY_SHIRT, alpha=0.3, zorder=9))
    circ(ax, (6.75, 7.45), 0.06, "white", ec="#AAAAAA", z=9)
    circ(ax, (6.95, 7.65), 0.1, "white", ec="#AAAAAA", z=9)
    ax.add_patch(Ellipse((7.4, 8.1), 1.0, 0.7, facecolor="white", edgecolor="#AAAAAA", zorder=9))
    ax.text(7.4, 8.08, "!?", ha="center", va="center", fontsize=13, fontweight="bold", color="#444444", zorder=10)

    # boy playing VR
    import math
    for a in (150, 175, 200):
        r = math.radians(a)
        ax.plot([3.9 + 2.2 * math.cos(r), 3.9 + 2.55 * math.cos(r)], [5.0 + 2.2 * math.sin(r), 5.0 + 2.55 * math.sin(r)],
                color="#F0B27A", lw=1.4, zorder=4)
    for a in (-25, 0, 25):
        r = math.radians(a)
        ax.plot([3.9 + 2.4 * math.cos(r), 3.9 + 2.75 * math.cos(r)], [4.8 + 2.4 * math.sin(r), 4.8 + 2.75 * math.sin(r)],
                color="#F0B27A", lw=1.4, zorder=4)
    ax.add_patch(Ellipse((3.95, 2.85), 3.8, 0.64, facecolor="#C5F5FB", alpha=0.35, zorder=4))
    rrect(ax, 3.35, 2.75, 0.45, 0.8, BOY_PANTS, ec="#243A5A", z=6, r=0.05, rot=(3.55, 3.5, 18))
    rrect(ax, 4.15, 2.75, 0.45, 0.8, BOY_PANTS, ec="#243A5A", z=6, r=0.05, rot=(4.35, 3.5, -12))
    rrect(ax, 3.05, 2.6, 0.6, 0.25, "white", ec="#AAAAAA", z=7, r=0.05)
    rrect(ax, 4.3, 2.6, 0.6, 0.25, "white", ec="#AAAAAA", z=7, r=0.05)
    rrect(ax, 3.4, 3.4, 1.1, 1.65, BOY_SHIRT, ec="#8B3325", z=8, r=0.12, rot=(3.95, 4.3, -6))
    poly(ax, [(3.75, 4.2), (4.15, 4.2), (4.05, 4.55), (3.85, 4.55)], "white", z=9, alpha=0.85)
    rrect(ax, 3.2, 4.65, 0.5, 1.1, BOY_SHIRT, ec="#8B3325", z=8, r=0.1, rot=(3.45, 4.85, 40))
    rrect(ax, 4.25, 4.75, 0.5, 1.1, BOY_SHIRT, ec="#8B3325", z=8, r=0.1, rot=(4.5, 4.9, -55))
    circ(ax, (2.85, 5.6), 0.17, SKIN, z=9)
    circ(ax, (5.1, 5.45), 0.17, SKIN, z=9)
    circ(ax, (2.7, 5.85), 0.2, "none", ec=VR, lw=3, z=10)
    rect(ax, 2.78, 5.55, 0.14, 0.3, VR, z=10)
    circ(ax, (5.3, 5.75), 0.2, "none", ec=VR, lw=3, z=10)
    rect(ax, 5.1, 5.45, 0.14, 0.3, VR, z=10)
    circ(ax, (2.7, 5.85), 0.06, VR_LIGHT, z=11)
    circ(ax, (5.3, 5.75), 0.06, VR_LIGHT, z=11)
    rect(ax, 3.85, 4.95, 0.3, 0.3, SKIN, z=8)
    circ(ax, (4.0, 5.75), 0.62, SKIN, ec="#C9A688", lw=0.8, z=9)
    bez(ax, [(4.0, 5.95), (3.3, 5.95), (3.35, 6.55), (3.7, 6.5), (3.8, 6.65), (4.2, 6.65), (4.35, 6.5),
             (4.7, 6.55), (4.7, 5.95), (4.0, 5.95)], [Path.MOVETO] + [Path.CURVE4] * 9, fc=BOY_HAIR, z=10)
    rrect(ax, 3.3, 5.55, 1.4, 0.5, VR, ec="black", lw=0.8, z=11, r=0.08)
    rrect(ax, 3.42, 5.65, 1.16, 0.3, VR_LIGHT, z=12, r=0.05)
    rect(ax, 3.5, 5.85, 0.6, 0.07, "white", z=13, alpha=0.5)
    bez(ax, [(3.3, 5.8), (3.15, 6.2), (3.6, 6.6), (4.0, 6.55), (4.4, 6.6), (4.85, 6.2), (4.7, 5.8)],
        [Path.MOVETO] + [Path.CURVE4] * 6, ec=VR, lw=4, z=11)
    bez(ax, [(3.75, 5.3), (3.9, 5.1), (4.1, 5.1), (4.25, 5.3)], [Path.MOVETO] + [Path.CURVE4] * 3, ec="#8B3325", lw=1.2, z=10)
    ax.add_patch(Ellipse((3.55, 5.4), 0.24, 0.14, facecolor=BOY_SHIRT, alpha=0.35, zorder=10))
    ax.add_patch(Ellipse((4.45, 5.4), 0.24, 0.14, facecolor=BOY_SHIRT, alpha=0.35, zorder=10))

    # gaze: mother -> boy; boy's view cone into VR
    ax.annotate("", xy=(4.85, 6.15), xytext=(6.15, 6.35),
                arrowprops=dict(arrowstyle="-|>", color=GAZE, lw=1.6, linestyle="--",
                                connectionstyle="arc3,rad=0.3"), zorder=14)
    poly(ax, [(4.0, 5.8), (2.3, 7.6), (5.7, 7.6)], VR_LIGHT, z=5, alpha=0.18)
    circ(ax, (3.15, 7.05), 0.12, "white", ec="#3AA6B8", z=6)
    circ(ax, (4.0, 7.35), 0.16, "white", ec="#3AA6B8", z=6)
    circ(ax, (4.85, 7.0), 0.12, "white", ec="#3AA6B8", z=6)
    poly(ax, [(4.0, 7.35), (3.9, 7.2), (4.1, 7.2)], BOOKS[2], ec="#3AA6B8", lw=0.8, z=7)

    fig.savefig(out_path, dpi=100, facecolor=WALL)


if __name__ == "__main__":
    main()
