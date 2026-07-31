import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Ellipse, Polygon

W, H = 120.0, 90.0

FUR = "#DEA96E"
FUR_DARK = "#C68A4E"
FUR_LIGHT = "#EFC392"
CREAM = "#F8E6C8"
CREAM_DARK = "#E7CBA3"
PINK = "#F0AFA1"
PINK_DEEP = "#E8968B"
BROWN = "#6E4231"
BROWN_SOFT = "#8C5A41"
GOLD = "#F2B441"
GOLD_DARK = "#C98C24"
BG_TOP = "#FFF6E7"
BG_BOTTOM = "#F8DCC0"


def hex_rgb(code):
    code = code.lstrip("#")
    return [int(code[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]


def mix(c1, c2, t):
    a, b = hex_rgb(c1), hex_rgb(c2)
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def background(ax):
    rows = 160
    grad = [[mix(BG_BOTTOM, BG_TOP, r / (rows - 1.0))] * 2 for r in range(rows)]
    ax.imshow(
        grad,
        extent=[0, W, 0, H],
        origin="lower",
        aspect="auto",
        interpolation="bilinear",
        zorder=0,
    )
    for i in range(9):
        ax.add_patch(
            Ellipse(
                (60, 46),
                78 + i * 6,
                74 + i * 6,
                facecolor="#FFFFFF",
                edgecolor="none",
                alpha=0.035,
                zorder=0.2,
            )
        )


def fuzz(ax, xy, w, h, angle, color, z, layers=8, spread=2.8, alpha=0.05):
    """Soft plush halo so every shape gets a fluffy silhouette."""
    for i in range(layers, 0, -1):
        pad = spread * i / layers
        ax.add_patch(
            Ellipse(
                xy,
                w + 2 * pad,
                h + 2 * pad,
                angle=angle,
                facecolor=color,
                edgecolor="none",
                alpha=alpha,
                zorder=z - 0.35,
            )
        )


def plush(ax, xy, w, h, z, angle=0.0, fc=FUR, ec=None, lw=0.0, alpha=1.0,
          soft=True, spread=2.8, ls="solid"):
    if soft:
        fuzz(ax, xy, w, h, angle, fc, z, spread=spread)
    e = Ellipse(
        xy,
        w,
        h,
        angle=angle,
        facecolor=fc,
        edgecolor=ec if ec else "none",
        linewidth=lw,
        alpha=alpha,
        linestyle=ls,
        zorder=z,
    )
    ax.add_patch(e)
    return e


def star(cx, cy, r_out, r_in, points=5, rot=90.0):
    pts = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180.0 / points)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_shadow(ax):
    for i in range(10):
        ax.add_patch(
            Ellipse(
                (60, 8),
                62 + i * 3.4,
                10 + i * 1.5,
                facecolor="#C89A6E",
                edgecolor="none",
                alpha=0.035,
                zorder=1,
            )
        )


def draw_ear(ax, cx, cy, inward):
    plush(ax, (cx, cy), 19.5, 19.5, 2.0, fc=FUR, spread=3.2)
    plush(ax, (cx + inward * 1.2, cy - 1.1), 11.6, 11.6, 2.2, fc=PINK, soft=False)
    plush(ax, (cx + inward * 1.2, cy - 1.1), 7.2, 7.2, 2.3, fc="#F6C8BC", soft=False)


def draw_leg(ax, cx, cy, ang, out):
    a = math.radians(ang)
    ux, uy = math.cos(a) * out, math.sin(a) * out
    vx, vy = -math.sin(a) * out, math.cos(a) * out

    plush(ax, (cx, cy), 30, 22, 3.0, angle=ang, fc=FUR, spread=2.4)

    px, py = cx + ux * 6.5, cy + uy * 6.5
    plush(ax, (px, py), 9.5, 14.5, 3.2, angle=ang, fc=CREAM, soft=False)
    plush(ax, (px, py), 9.5, 14.5, 3.25, angle=ang, fc="none", soft=False,
          ec=CREAM_DARK, lw=1.1, ls=(0, (2.5, 2.2)))

    bx, by = cx + ux * 11.4, cy + uy * 11.4
    for k in (-4.0, 0.0, 4.0):
        plush(ax, (bx + vx * k, by + vy * k), 3.9, 3.9, 3.3, fc=CREAM, soft=False)
        plush(ax, (bx + vx * k, by + vy * k), 3.9, 3.9, 3.35, fc="none", soft=False,
              ec=CREAM_DARK, lw=0.8)


def draw_arm(ax, cx, cy, ang, out):
    a = math.radians(ang)
    ux, uy = math.cos(a) * out, math.sin(a) * out

    plush(ax, (cx, cy), 27, 15, 4.0, angle=ang, fc=FUR, spread=2.4)

    px, py = cx + ux * 7.8, cy + uy * 7.8
    plush(ax, (px, py), 8.6, 10.6, 4.2, angle=ang, fc=CREAM, soft=False)
    plush(ax, (px, py), 8.6, 10.6, 4.25, angle=ang, fc="none", soft=False,
          ec=CREAM_DARK, lw=1.0, ls=(0, (2.4, 2.0)))


def draw_body(ax):
    plush(ax, (60, 30), 54, 46, 5.0, fc=FUR, spread=3.4)
    plush(ax, (46, 40), 20, 24, 5.1, angle=18, fc=FUR_LIGHT, alpha=0.35, soft=False)
    plush(ax, (74, 20), 26, 22, 5.1, angle=-14, fc=FUR_DARK, alpha=0.22, soft=False)

    plush(ax, (60, 20), 34, 22, 6.0, fc=CREAM, soft=False)
    plush(ax, (60, 20), 34, 22, 6.05, fc="none", soft=False,
          ec=CREAM_DARK, lw=1.3, ls=(0, (3.0, 2.6)))


def draw_badge(ax):
    plush(ax, (60, 38), 15.4, 15.4, 7.0, fc="#FFF4DE", spread=1.6, alpha=0.98)
    plush(ax, (60, 38), 15.4, 15.4, 7.1, fc="none", soft=False,
          ec=BROWN_SOFT, lw=1.5, ls=(0, (2.6, 2.4)))
    plush(ax, (60, 38), 11.6, 11.6, 7.15, fc="#FBE2B4", soft=False)
    ax.add_patch(
        Polygon(
            star(60, 38, 5.4, 2.3),
            closed=True,
            facecolor=GOLD,
            edgecolor=GOLD_DARK,
            linewidth=1.4,
            joinstyle="round",
            zorder=7.3,
        )
    )


def draw_head(ax):
    plush(ax, (60, 66), 44, 40, 8.0, fc=FUR, spread=3.4)
    plush(ax, (50, 76), 17, 12, 8.1, angle=22, fc=FUR_LIGHT, alpha=0.4, soft=False)
    plush(ax, (72, 55), 20, 12, 8.1, angle=-16, fc=FUR_DARK, alpha=0.16, soft=False)

    for dx, sc in ((-3.6, 0.9), (0.0, 1.0), (3.6, 0.85)):
        plush(ax, (60 + dx, 85.2 + sc), 7.5 * sc, 6.5 * sc, 7.9, fc=FUR_LIGHT,
              spread=1.4)


def draw_face(ax):
    plush(ax, (60, 57), 25, 16.5, 9.0, fc=CREAM, spread=1.8)
    plush(ax, (60, 54.5), 19, 9, 9.05, fc="#FFF2DA", alpha=0.7, soft=False)

    plush(ax, (44.5, 62), 10.5, 6.6, 9.1, fc=PINK, alpha=0.5, spread=1.6, angle=-8)
    plush(ax, (75.5, 62), 10.5, 6.6, 9.1, fc=PINK, alpha=0.5, spread=1.6, angle=8)

    for ex in (50.5, 69.5):
        plush(ax, (ex, 68), 6.4, 6.9, 10.0, fc=BROWN, soft=False)
        plush(ax, (ex - 1.0, 69.4), 2.2, 2.2, 10.1, fc="#FFFFFF", soft=False)
        plush(ax, (ex + 1.1, 66.6), 1.1, 1.1, 10.1, fc="#FFFFFF", alpha=0.75,
              soft=False)
        ax.add_patch(
            Arc((ex, 72.6), 7.4, 4.0, theta1=25, theta2=155,
                edgecolor=BROWN_SOFT, linewidth=1.6, alpha=0.55, zorder=10.0)
        )

    plush(ax, (60, 60.6), 7.6, 5.4, 10.2, fc=BROWN, soft=False)
    plush(ax, (58.6, 61.6), 2.4, 1.5, 10.3, fc="#B98A72", alpha=0.8, angle=18,
          soft=False)

    ax.plot([60, 60], [58.0, 56.4], color=BROWN, linewidth=2.0,
            solid_capstyle="round", zorder=10.2)
    ax.add_patch(
        Arc((57.2, 56.4), 5.8, 4.6, theta1=200, theta2=340,
            edgecolor=BROWN, linewidth=2.0, zorder=10.2)
    )
    ax.add_patch(
        Arc((62.8, 56.4), 5.8, 4.6, theta1=200, theta2=340,
            edgecolor=BROWN, linewidth=2.0, zorder=10.2)
    )


def main():
    out = sys.argv[1]

    fig = plt.figure(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor(BG_TOP)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    ax.set_aspect("equal")
    ax.axis("off")

    background(ax)
    draw_shadow(ax)

    draw_ear(ax, 45, 80, 1)
    draw_ear(ax, 75, 80, -1)

    draw_leg(ax, 44, 13, 18, -1)
    draw_leg(ax, 76, 13, -18, 1)

    draw_arm(ax, 31, 35, 42, -1)
    draw_arm(ax, 89, 35, -42, 1)

    draw_body(ax)
    draw_badge(ax)
    draw_head(ax)
    draw_face(ax)

    fig.savefig(out, dpi=100, facecolor=fig.get_facecolor())
    plt.close(fig)


if __name__ == "__main__":
    main()
