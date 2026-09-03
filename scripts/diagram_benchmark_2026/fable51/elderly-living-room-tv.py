import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, PathPatch, Polygon, Rectangle
from matplotlib.path import Path

WALL = "#F6E9D2"
WALL_SHADE = "#EAD9BC"
FLOOR = "#C9955E"
FLOOR_DARK = "#A9773F"
RUG = "#C86B5A"
RUG_LINE = "#E9A68E"
SOFA = "#6E8F6B"
SOFA_DARK = "#4F6E4C"
CUSHION = "#E9C46A"
SKIN = "#F5D6B8"
HAIR = "#E6E2DA"
DRESS = "#8E6BA8"
DRESS_DARK = "#6C4E86"
TV = "#2F3640"
SCREEN = "#7EC8E3"
WOOD = "#8B5A2B"
CURTAIN = "#D98C6B"
CURTAIN_DARK = "#B9704F"
LAMP = "#FFE9A8"
LAMP_GLOW = "#FFF3C4"
NIGHT = "#3C4E7A"


def rect(ax, x, y, w, h, fc, ec="none", lw=1.0, z=1, alpha=1.0):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha))


def rrect(ax, x, y, w, h, fc, ec="none", lw=1.0, z=1, r=0.12, alpha=1.0):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                                facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha))


def poly(ax, pts, fc, ec="none", lw=1.0, z=1, alpha=1.0):
    ax.add_patch(Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha))


def curve(ax, pts, color, lw=1.0, z=1, fill="none", ls="-", alpha=1.0):
    codes = [Path.MOVETO] + [Path.CURVE4] * (len(pts) - 1)
    ax.add_patch(PathPatch(Path(pts, codes), facecolor=fill, edgecolor=color, linewidth=lw,
                           zorder=z, linestyle=ls, alpha=alpha, capstyle="round"))


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    # room shell
    rect(ax, 0, 0, 12, 9, WALL, z=0)
    rect(ax, 0, 0, 12, 2.6, FLOOR, z=1)
    for y in (0.4, 0.9, 1.4, 1.9, 2.4):
        ax.plot([0, 12], [y, y], color=FLOOR_DARK, lw=0.6, zorder=1)
    ax.plot([0, 12], [2.6, 2.6], color=FLOOR_DARK, lw=1.6, zorder=1, alpha=0.6)

    # window + curtains
    rect(ax, 8.4, 4.8, 2.8, 3.3, "#D5DAE6", z=2)
    rect(ax, 8.55, 4.95, 2.5, 3.0, NIGHT, z=2)
    ax.add_patch(Circle((10.35, 7.45), 0.28, facecolor=LAMP, edgecolor="none", zorder=3))
    for p in ((9.0, 7.4), (9.6, 7.7), (10.7, 6.9), (9.3, 6.6)):
        ax.add_patch(Circle(p, 0.035, facecolor="white", edgecolor="none", zorder=3))
    ax.plot([9.8, 9.8], [4.95, 7.95], color="#D5DAE6", lw=4, zorder=3)
    ax.plot([8.55, 11.05], [6.45, 6.45], color="#D5DAE6", lw=4, zorder=3)
    ax.plot([8.2, 11.4], [8.25, 8.25], color=WOOD, lw=4, zorder=4)
    for x in (8.2, 8.55, 8.9, 10.75, 11.1):
        verts = [(x, 4.6), (x + 0.05, 5.8), (x - 0.05, 7.2), (x - 0.05, 8.25),
                 (x + 0.35, 8.25), (x + 0.3, 7.2), (x + 0.35, 5.8), (x + 0.4, 4.6), (x, 4.6)]
        codes = [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.LINETO,
                 Path.CURVE4, Path.CURVE4, Path.CURVE4, Path.CLOSEPOLY]
        ax.add_patch(PathPatch(Path(verts, codes), facecolor=CURTAIN, edgecolor=CURTAIN_DARK, linewidth=0.8, zorder=4))

    # framed picture
    rect(ax, 4.7, 6.4, 1.9, 1.3, WOOD, z=2)
    rect(ax, 4.85, 6.55, 1.6, 0.5, "#B7CFB4", z=3)
    rect(ax, 4.85, 7.05, 1.6, 0.5, "#B4DEEC", z=3)
    ax.add_patch(Circle((6.05, 7.3), 0.14, facecolor=CUSHION, edgecolor="none", zorder=4))

    # floor lamp with warm glow
    ax.add_patch(Circle((1.4, 6.6), 1.6, facecolor=LAMP_GLOW, edgecolor="none", zorder=2, alpha=0.6))
    rect(ax, 1.32, 2.6, 0.16, 3.4, WOOD, z=3)
    rect(ax, 0.9, 2.55, 1.0, 0.2, WOOD, z=3)
    poly(ax, [(0.7, 5.9), (2.1, 5.9), (1.85, 7.2), (0.95, 7.2)], LAMP, ec=CURTAIN_DARK, lw=1.0, z=4)
    ax.plot([0.85, 1.95], [6.35, 6.35], color=CURTAIN_DARK, lw=0.8, zorder=5, alpha=0.6)
    for p in ((0.5, 7.8), (2.4, 7.6), (2.6, 6.6), (0.4, 6.4)):
        ax.add_patch(Circle(p, 0.05, facecolor=LAMP, edgecolor="none", zorder=5, alpha=0.8))

    # TV cabinet + TV
    rect(ax, 2.4, 2.6, 3.2, 1.1, WOOD, ec=FLOOR_DARK, lw=1.0, z=3)
    ax.plot([4.0, 4.0], [2.6, 3.7], color=FLOOR_DARK, lw=0.8, zorder=4)
    ax.plot([2.55, 5.45], [3.15, 3.15], color=FLOOR_DARK, lw=0.8, zorder=4)
    for x in (3.2, 4.8):
        ax.add_patch(Circle((x, 3.4), 0.06, facecolor=FLOOR_DARK, edgecolor="none", zorder=5))
    rect(ax, 2.8, 3.85, 2.4, 0.2, TV, z=4)
    rect(ax, 3.9, 3.7, 0.2, 0.25, TV, z=4)
    rrect(ax, 2.3, 4.0, 3.4, 2.3, TV, ec="#1A1E24", lw=1.2, z=5, r=0.08)
    rect(ax, 2.5, 4.2, 3.0, 1.9, SCREEN, z=6)
    rect(ax, 2.5, 4.2, 3.0, 0.8, "#A8DBEA", z=7)
    curve(ax, [(2.5, 4.2), (3.5, 5.2), (4.5, 4.6), (5.5, 5.0), (5.5, 4.2), (5.5, 4.2), (2.5, 4.2)],
          "none", z=8, fill="#8FB88C")
    ax.add_patch(Circle((4.9, 5.7), 0.22, facecolor=CUSHION, edgecolor="none", zorder=8))
    curve(ax, [(3.3, 5.6), (3.4, 5.75), (3.5, 5.75), (3.6, 5.6)], TV, lw=1.0, z=8)
    curve(ax, [(3.6, 5.6), (3.7, 5.75), (3.8, 5.75), (3.9, 5.6)], TV, lw=1.0, z=8)
    poly(ax, [(5.7, 4.0), (8.6, 3.2), (8.6, 6.9), (5.7, 6.3)], SCREEN, z=2, alpha=0.13)

    # rug
    poly(ax, [(5.4, 0.55), (11.6, 0.55), (11.0, 2.25), (6.0, 2.25)], RUG, z=2)
    poly(ax, [(5.75, 0.8), (11.25, 0.8), (10.75, 2.0), (6.25, 2.0)], RUG_LINE, z=3, alpha=0.6)
    poly(ax, [(6.05, 1.0), (10.95, 1.0), (10.55, 1.8), (6.45, 1.8)], RUG, z=4)

    # side table with tea
    rect(ax, 6.15, 1.4, 0.15, 1.4, WOOD, z=5)
    ax.add_patch(Ellipse((5.75, 2.75), 1.24, 0.36, facecolor=WOOD, edgecolor=FLOOR_DARK, linewidth=0.8, zorder=6))
    rect(ax, 5.55, 2.85, 0.4, 0.3, "white", ec="#999999", lw=0.8, z=7)
    curve(ax, [(5.68, 3.2), (5.6, 3.35), (5.65, 3.45), (5.72, 3.55)], "#BBBBBB", lw=0.8, z=7)
    curve(ax, [(5.85, 3.2), (5.78, 3.35), (5.83, 3.45), (5.9, 3.6)], "#BBBBBB", lw=0.8, z=7)

    # sofa facing the TV (left)
    rect(ax, 7.0, 1.55, 3.6, 0.3, SOFA_DARK, z=5)
    rrect(ax, 7.0, 1.75, 3.7, 1.3, SOFA, ec=SOFA_DARK, lw=1.0, z=6, r=0.15)
    rrect(ax, 7.0, 2.9, 3.7, 1.5, SOFA, ec=SOFA_DARK, lw=1.0, z=6, r=0.18)
    rrect(ax, 6.7, 2.5, 0.65, 1.1, "#5E7B5B", ec=SOFA_DARK, lw=1.0, z=8, r=0.18)
    rrect(ax, 10.35, 2.5, 0.65, 1.1, "#5E7B5B", ec=SOFA_DARK, lw=1.0, z=8, r=0.18)
    ax.add_patch(FancyBboxPatch((9.4, 3.0), 0.95, 0.95, boxstyle="round,pad=0,rounding_size=0.1",
                                facecolor=CUSHION, edgecolor="#9C7F36", linewidth=0.8, zorder=7,
                                transform=matplotlib.transforms.Affine2D().rotate_deg_around(9.9, 3.5, -8) + ax.transData))

    # grandmother (turned toward TV)
    for x in (7.6, 8.15):
        rect(ax, x, 1.75, 0.45, 1.2, DRESS_DARK, z=7)
        rect(ax, x, 1.85, 0.45, 0.2, SKIN, z=8)
    rect(ax, 7.45, 1.55, 0.65, 0.3, "#C9B8A0", z=8)
    rect(ax, 8.05, 1.55, 0.6, 0.3, "#C9B8A0", z=8)
    poly(ax, [(7.45, 2.75), (8.75, 2.75), (8.85, 3.45), (7.5, 3.45)], "#F3DEA4", ec="#9C7F36", lw=0.8, z=9)
    rrect(ax, 7.55, 3.2, 1.4, 1.55, DRESS, ec=DRESS_DARK, lw=1.0, z=10, r=0.2)
    ax.plot([8.25, 8.25], [3.4, 4.6], color=DRESS_DARK, lw=0.8, zorder=11)
    for y in (3.7, 4.05, 4.4):
        ax.add_patch(Circle((8.25, y), 0.05, facecolor=DRESS_DARK, edgecolor="none", zorder=11))
    rrect(ax, 7.35, 3.5, 0.45, 0.85, DRESS, ec=DRESS_DARK, lw=0.8, z=11, r=0.14)
    rrect(ax, 8.7, 3.5, 0.45, 0.85, DRESS, ec=DRESS_DARK, lw=0.8, z=11, r=0.14)
    ax.add_patch(Circle((7.5, 3.35), 0.18, facecolor=SKIN, edgecolor="none", zorder=12))
    ax.add_patch(Circle((8.95, 3.35), 0.18, facecolor=SKIN, edgecolor="none", zorder=12))
    rect(ax, 8.1, 4.65, 0.35, 0.3, SKIN, z=10)
    ax.add_patch(Circle((8.28, 5.45), 0.62, facecolor=SKIN, edgecolor="#C9A688", linewidth=1.0, zorder=12))
    curve(ax, [(8.3, 5.62), (8.15, 6.25), (8.75, 6.3), (8.9, 5.75), (8.95, 5.55), (8.85, 5.4), (8.75, 5.35),
               (8.7, 5.75), (8.05, 5.85), (7.9, 5.45), (7.85, 5.55), (8.0, 5.75), (8.3, 5.62)],
          "#BDB8AE", lw=0.8, z=13, fill=HAIR)
    ax.add_patch(Circle((8.85, 5.85), 0.26, facecolor=HAIR, edgecolor="#BDB8AE", linewidth=0.8, zorder=13))
    for x in (7.82, 8.16):
        ax.add_patch(Circle((x, 5.45), 0.14, facecolor="none", edgecolor="#444444", linewidth=0.9, zorder=14))
        ax.add_patch(Circle((x - 0.02, 5.45), 0.045, facecolor="#444444", edgecolor="none", zorder=14))
    ax.plot([7.96, 8.02], [5.45, 5.45], color="#444444", lw=0.9, zorder=14)
    ax.plot([8.3, 8.6], [5.45, 5.5], color="#444444", lw=0.9, zorder=14)
    curve(ax, [(7.85, 5.15), (7.92, 5.06), (8.02, 5.06), (8.1, 5.12)], FLOOR_DARK, lw=1.0, z=14)
    ax.add_patch(Ellipse((8.05, 5.25), 0.24, 0.14, facecolor=RUG, edgecolor="none", zorder=14, alpha=0.35))
    ax.annotate("", xy=(5.75, 5.2), xytext=(7.65, 5.4),
                arrowprops=dict(arrowstyle="-|>", color="#3E7F94", lw=1.2, linestyle="--"), zorder=15)

    # knitting + yarn
    ax.add_patch(Circle((8.55, 3.05), 0.2, facecolor=RUG, edgecolor="none", zorder=13))
    ax.plot([7.5, 7.9], [3.4, 2.95], color="#777777", lw=0.8, zorder=13)
    ax.plot([8.95, 8.6], [3.4, 3.0], color="#777777", lw=0.8, zorder=13)
    curve(ax, [(7.6, 3.35), (7.9, 3.2), (8.2, 3.1), (8.55, 3.05)], RUG, lw=1.0, z=13)

    # cat on the rug
    ax.add_patch(Ellipse((9.9, 1.35), 1.1, 0.6, facecolor="#DDC1A4", edgecolor=FLOOR_DARK, linewidth=0.8, zorder=9))
    ax.add_patch(Circle((10.35, 1.55), 0.22, facecolor="#DDC1A4", edgecolor=FLOOR_DARK, linewidth=0.8, zorder=10))
    poly(ax, [(10.25, 1.75), (10.3, 1.95), (10.4, 1.75)], "#DDC1A4", z=10)
    poly(ax, [(10.4, 1.75), (10.5, 1.93), (10.55, 1.72)], "#DDC1A4", z=10)
    curve(ax, [(9.4, 1.3), (9.2, 1.45), (9.25, 1.65), (9.5, 1.6)], FLOOR_DARK, lw=1.0, z=10)
    curve(ax, [(10.3, 1.55), (10.32, 1.5), (10.34, 1.5), (10.36, 1.55)], "#444444", lw=0.8, z=11)
    curve(ax, [(10.4, 1.55), (10.42, 1.5), (10.44, 1.5), (10.46, 1.55)], "#444444", lw=0.8, z=11)

    fig.savefig(out_path, dpi=100, facecolor=WALL)


if __name__ == "__main__":
    main()
