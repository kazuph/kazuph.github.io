import sys

import numpy as np
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import (
    Arc,
    Circle,
    Ellipse,
    FancyBboxPatch,
    PathPatch,
    Polygon,
    Rectangle,
)
from matplotlib.path import Path

W, H = 120.0, 90.0

WALL_TOP = "#F8EBD5"
WALL_BOT = "#E9CFA9"
FLOOR_BACK = "#C79062"
FLOOR_FRONT = "#9E6538"
BASEBOARD = "#F1E2CB"
RUG = "#BF6250"
RUG_IN = "#E0AE93"
RUG_EDGE = "#F0DCC4"
WOOD = "#A9713F"
WOOD_D = "#875531"
WOOD_L = "#C08B57"
CHAIR = "#7E9C84"
CHAIR_D = "#61806A"
CHAIR_L = "#96B29A"
CARDIGAN = "#C57E88"
CARDIGAN_D = "#A9636E"
SHAWL = "#F6E7D3"
BLANKET = "#E8A868"
BLANKET_L = "#F6D5A8"
SKIN = "#F1CAA6"
SKIN_D = "#D8A47D"
HAIR = "#EBE8E4"
HAIR_D = "#CBC5BE"
DARK = "#3A2E28"
LAMPLIGHT = "#FFE7B0"
GLASS_NIGHT = "#3D4C6B"


def blob(points, **kwargs):
    """Closed smooth shape passing near the given control points."""
    pts = list(points)
    n = len(pts)

    def mid(a, b):
        return ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)

    start = mid(pts[-1], pts[0])
    verts = [start]
    codes = [Path.MOVETO]
    for i in range(n):
        verts.append(pts[i])
        verts.append(mid(pts[i], pts[(i + 1) % n]))
        codes.append(Path.CURVE3)
        codes.append(Path.CURVE3)
    verts.append(start)
    codes.append(Path.CLOSEPOLY)
    return PathPatch(Path(verts, codes), **kwargs)


def gradient(ax, extent, color_bottom, color_top, zorder=0, alpha=1.0):
    cmap = LinearSegmentedColormap.from_list("g", [color_bottom, color_top])
    data = np.linspace(0.0, 1.0, 256).reshape(-1, 1)
    ax.imshow(
        data,
        extent=extent,
        origin="lower",
        cmap=cmap,
        aspect="auto",
        zorder=zorder,
        alpha=alpha,
        interpolation="bilinear",
    )


def glow(ax, x, y, radius, color=LAMPLIGHT, layers=16, strength=0.11, zorder=5):
    for i in range(layers, 0, -1):
        r = radius * i / layers
        a = strength * (1.0 - i / (layers + 1.0)) ** 1.6
        ax.add_patch(Circle((x, y), r, color=color, alpha=a, lw=0, zorder=zorder))


def rbox(x, y, w, h, r=1.2, **kwargs):
    return FancyBboxPatch(
        (x + r, y + r),
        w - 2 * r,
        h - 2 * r,
        boxstyle="round,pad=%.3f,rounding_size=%.3f" % (r, r),
        **kwargs
    )


def shadow(ax, x, y, w, h, alpha=0.13, zorder=3.5):
    ax.add_patch(
        Ellipse((x, y), w, h, facecolor="#5B3A22", alpha=alpha, lw=0, zorder=zorder)
    )


# --------------------------------------------------------------------------
# room shell
# --------------------------------------------------------------------------
def draw_room(ax):
    gradient(ax, (0, W, 22, H), WALL_BOT, WALL_TOP, zorder=0)

    for x in np.arange(3, W, 7.5):
        ax.plot([x, x], [22, H], color="#C9A87E", lw=1.1, alpha=0.16, zorder=0.4)

    gradient(ax, (0, W, 0, 22.4), FLOOR_FRONT, FLOOR_BACK, zorder=1)

    for x0 in np.arange(-70, W + 70, 17):
        ax.plot(
            [x0, 58], [0, 22.4], color="#7C4C26", lw=1.0, alpha=0.22, zorder=1.1
        )
    for y in (6.5, 13.0, 18.5):
        ax.plot([0, W], [y, y], color="#7C4C26", lw=0.8, alpha=0.13, zorder=1.1)

    ax.add_patch(
        Rectangle((0, 21.4), W, 2.6, facecolor=BASEBOARD, lw=0, zorder=1.6)
    )
    ax.add_patch(
        Rectangle((0, 21.4), W, 0.5, facecolor="#D2B996", lw=0, zorder=1.65)
    )

    # rug
    ax.add_patch(Ellipse((58, 12.5), 104, 23, facecolor=RUG, lw=0, zorder=2.0))
    ax.add_patch(
        Ellipse(
            (58, 12.5),
            94,
            19,
            facecolor="none",
            edgecolor=RUG_EDGE,
            lw=2.0,
            alpha=0.75,
            zorder=2.05,
        )
    )
    ax.add_patch(Ellipse((58, 12.5), 78, 14.5, facecolor=RUG_IN, lw=0, zorder=2.1))
    ax.add_patch(
        Ellipse(
            (58, 12.5),
            66,
            11,
            facecolor="none",
            edgecolor=RUG,
            lw=1.8,
            alpha=0.8,
            zorder=2.15,
        )
    )
    for k in range(-4, 5):
        cx = 58 + k * 8.0
        ax.add_patch(
            Ellipse((cx, 12.5), 3.4, 2.4, facecolor=RUG, alpha=0.55, lw=0, zorder=2.2)
        )


def draw_window(ax):
    x0, x1, y0, y1 = 46.0, 70.0, 42.0, 72.0

    ax.add_patch(
        Rectangle((x0 - 1.6, y0 - 1.6), (x1 - x0) + 3.2, (y1 - y0) + 3.2,
                  facecolor="#F5E7D0", edgecolor="#C7A87E", lw=1.4, zorder=2.3)
    )
    gradient(ax, (x0, x1, y0, y1), "#5D6E8C", GLASS_NIGHT, zorder=2.35)

    # dusk sky details behind the glass
    ax.add_patch(Circle((64.5, 65.5), 2.4, facecolor="#F7EFC9", lw=0, zorder=2.4))
    ax.add_patch(Circle((63.4, 66.4), 2.2, facecolor=GLASS_NIGHT, lw=0, zorder=2.41))
    for sx, sy, ss in [(51, 67, 22), (55.5, 62.5, 12), (58, 69, 9), (67.5, 58, 12),
                       (49.5, 57, 9), (61, 55.5, 8)]:
        ax.plot([sx], [sy], marker="*", ms=np.sqrt(ss) * 1.5,
                color="#FDF3D2", alpha=0.85, zorder=2.42)
    ax.add_patch(
        Polygon([(x0, y0), (x1, y0), (x1, y0 + 6.5), (x0, y0 + 9.0)],
                closed=True, facecolor="#2C3550", lw=0, zorder=2.43)
    )
    for hx in (49.5, 55.0, 60.0, 66.0):
        ax.add_patch(
            Rectangle((hx, y0 + 2.0), 1.5, 2.2, facecolor="#F2C36B",
                      alpha=0.85, lw=0, zorder=2.44)
        )

    ax.plot([x0, x1], [(y0 + y1) / 2, (y0 + y1) / 2], color="#F5E7D0", lw=2.2, zorder=2.5)
    ax.plot([(x0 + x1) / 2, (x0 + x1) / 2], [y0, y1], color="#F5E7D0", lw=2.2, zorder=2.5)
    ax.add_patch(
        Rectangle((x0, y0), x1 - x0, y1 - y0, facecolor="none",
                  edgecolor="#F5E7D0", lw=2.6, zorder=2.5)
    )
    ax.add_patch(
        Rectangle((x0 - 3.0, y0 - 3.4), (x1 - x0) + 6.0, 2.0,
                  facecolor="#D9BF98", lw=0, zorder=2.55)
    )
    # curtain rod
    ax.add_patch(
        Rectangle((37.0, 73.2), 46.0, 1.1, facecolor=WOOD_D, lw=0, zorder=2.6)
    )
    ax.add_patch(Circle((37.0, 73.75), 1.3, facecolor=WOOD_D, lw=0, zorder=2.6))
    ax.add_patch(Circle((83.0, 73.75), 1.3, facecolor=WOOD_D, lw=0, zorder=2.6))

    curtain(ax, 38.2, 49.5, 73.4, 27.0, folds=4)
    curtain(ax, 66.5, 78.5, 73.4, 27.0, folds=4)


def curtain(ax, xl, xr, ytop, ybot, folds=4):
    ys = np.linspace(ybot, ytop, 60)
    t = (ys - ybot) / (ytop - ybot)
    hem_x = np.linspace(xl, xr, 40)
    hem_y = ybot + 1.5 * np.sin(np.linspace(0, np.pi * 2.4, 40))

    pts = [(xl, ytop), (xr, ytop)]
    pts += [(hem_x[i], hem_y[i]) for i in range(len(hem_x) - 1, -1, -1)]
    ax.add_patch(Polygon(pts, closed=True, facecolor="#CE8368", lw=0, zorder=2.7))

    w = (xr - xl) / folds
    for i in range(folds):
        cx = xl + (i + 0.5) * w
        wave = 0.9 * np.sin(t * np.pi * 1.1)
        left = cx - w * 0.36 + wave
        right = cx + w * 0.36 + wave
        poly = [(left[k], ys[k]) for k in range(len(ys))]
        poly += [(right[k], ys[k]) for k in range(len(ys) - 1, -1, -1)]
        shade = "#B96E55" if i % 2 == 0 else "#DF977A"
        ax.add_patch(
            Polygon(poly, closed=True, facecolor=shade, alpha=0.55, lw=0, zorder=2.75)
        )
    ax.add_patch(
        Polygon(pts, closed=True, facecolor="none", edgecolor="#A65F48",
                lw=1.2, alpha=0.5, zorder=2.8)
    )


def draw_wall_decor(ax):
    # framed picture above the TV
    ax.add_patch(
        Rectangle((7.0, 61.0), 22.0, 15.0, facecolor=WOOD_D, lw=0, zorder=2.2)
    )
    ax.add_patch(
        Rectangle((8.6, 62.6), 18.8, 11.8, facecolor="#FBF3E2", lw=0, zorder=2.25)
    )
    gradient(ax, (8.6, 27.4, 62.6, 74.4), "#F7DCB4", "#BFD9E0", zorder=2.26)
    ax.add_patch(Circle((22.5, 71.0), 2.0, facecolor="#F3B85F", lw=0, zorder=2.27))
    ax.add_patch(
        Polygon([(8.6, 62.6), (15.0, 69.0), (21.0, 62.6)], closed=True,
                facecolor="#8FAE7E", lw=0, zorder=2.28)
    )
    ax.add_patch(
        Polygon([(14.0, 62.6), (21.5, 70.0), (27.4, 62.6)], closed=True,
                facecolor="#6F9163", lw=0, zorder=2.29)
    )
    ax.add_patch(
        Rectangle((8.6, 62.6), 18.8, 11.8, facecolor="none",
                  edgecolor="#E7D6B8", lw=1.2, zorder=2.3)
    )

    # wall clock
    ax.add_patch(Circle((104.0, 80.0), 5.2, facecolor=WOOD_D, lw=0, zorder=2.2))
    ax.add_patch(Circle((104.0, 80.0), 4.3, facecolor="#FBF2DF", lw=0, zorder=2.25))
    for a in range(0, 360, 30):
        r1, r2 = 3.2, 3.9
        rad = np.deg2rad(a)
        ax.plot(
            [104 + r1 * np.cos(rad), 104 + r2 * np.cos(rad)],
            [80 + r1 * np.sin(rad), 80 + r2 * np.sin(rad)],
            color="#7B6448", lw=0.9, zorder=2.3,
        )
    ax.plot([104, 104], [80, 82.7], color=DARK, lw=1.5, zorder=2.35)
    ax.plot([104, 106.4], [80, 79.2], color=DARK, lw=1.2, zorder=2.35)
    ax.add_patch(Circle((104.0, 80.0), 0.5, facecolor=DARK, lw=0, zorder=2.36))


def draw_pendant(ax):
    ax.plot([31.5, 31.5], [90, 84.5], color="#6B5A48", lw=1.4, zorder=2.2)
    ax.add_patch(
        Polygon([(25.0, 78.5), (38.0, 78.5), (35.0, 85.0), (28.0, 85.0)],
                closed=True, facecolor="#E7B778", edgecolor="#C08F52",
                lw=1.2, zorder=2.3)
    )
    ax.add_patch(
        Ellipse((31.5, 78.5), 13.0, 2.4, facecolor=LAMPLIGHT, lw=0, zorder=2.32)
    )
    glow(ax, 31.5, 77.0, 20.0, layers=14, strength=0.10, zorder=2.34)


# --------------------------------------------------------------------------
# television
# --------------------------------------------------------------------------
def draw_tv(ax):
    shadow(ax, 22, 17.0, 42, 6.0, alpha=0.16, zorder=2.9)

    # cabinet
    ax.add_patch(rbox(3.0, 17.0, 38.0, 15.0, r=1.2, facecolor=WOOD,
                      edgecolor=WOOD_D, lw=1.4, zorder=3.0))
    ax.add_patch(
        Rectangle((5.0, 20.0), 15.5, 9.0, facecolor=WOOD_L, edgecolor=WOOD_D,
                  lw=1.0, zorder=3.05)
    )
    ax.add_patch(
        Rectangle((23.5, 20.0), 15.5, 9.0, facecolor=WOOD_L, edgecolor=WOOD_D,
                  lw=1.0, zorder=3.05)
    )
    ax.add_patch(Circle((18.0, 24.5), 0.8, facecolor="#5E4326", lw=0, zorder=3.1))
    ax.add_patch(Circle((26.0, 24.5), 0.8, facecolor="#5E4326", lw=0, zorder=3.1))
    for lx in (5.5, 38.0):
        ax.add_patch(
            Polygon([(lx, 17.0), (lx + 1.6, 17.0), (lx + 1.2, 14.2), (lx + 0.4, 14.2)],
                    closed=True, facecolor=WOOD_D, lw=0, zorder=2.95)
        )

    # panel
    ax.add_patch(
        Polygon([(19.0, 32.0), (25.0, 32.0), (23.5, 34.5), (20.5, 34.5)],
                closed=True, facecolor="#3B3B44", lw=0, zorder=3.1)
    )
    ax.add_patch(rbox(5.5, 33.5, 33.0, 25.0, r=1.1, facecolor="#33333C",
                      edgecolor="#22222A", lw=1.2, zorder=3.15))

    sx0, sx1, sy0, sy1 = 7.4, 36.6, 35.4, 56.6
    gradient(ax, (sx0, sx1, sy0, sy1), "#F6C98B", "#7FB6CE", zorder=3.2)
    ax.add_patch(Circle((15.0, 48.0), 3.4, facecolor="#FCEBB6", lw=0, zorder=3.22))
    ax.add_patch(
        Polygon([(sx0, sy0), (sx0, 42.5), (14.0, 46.5), (24.0, 41.0),
                 (sx1, 45.5), (sx1, sy0)], closed=True,
                facecolor="#6E9E77", lw=0, zorder=3.24)
    )
    ax.add_patch(
        Polygon([(sx0, sy0), (sx0, 39.5), (12.0, 42.0), (22.0, 38.0),
                 (30.0, 41.5), (sx1, 38.5), (sx1, sy0)], closed=True,
                facecolor="#4F7E5C", lw=0, zorder=3.26)
    )
    for bx, by in [(27.0, 52.5), (30.0, 54.0), (24.5, 54.5)]:
        ax.add_patch(Arc((bx - 0.8, by), 1.6, 1.2, theta1=0, theta2=180,
                         color="#5B6E7A", lw=1.0, zorder=3.27))
        ax.add_patch(Arc((bx + 0.8, by), 1.6, 1.2, theta1=0, theta2=180,
                         color="#5B6E7A", lw=1.0, zorder=3.27))
    ax.add_patch(
        Polygon([(sx0, sy1), (sx0 + 11.0, sy1), (sx0 + 3.0, sy0), (sx0, sy0)],
                closed=True, facecolor="#FFFFFF", alpha=0.10, lw=0, zorder=3.3)
    )
    ax.add_patch(
        Rectangle((sx0, sy0), sx1 - sx0, sy1 - sy0, facecolor="none",
                  edgecolor="#1F1F27", lw=1.6, zorder=3.32)
    )
    ax.add_patch(Circle((37.6, 34.6), 0.45, facecolor="#7BE39A", lw=0, zorder=3.33))

    # sound ripples
    for i, r in enumerate((4.0, 6.5, 9.0)):
        ax.add_patch(
            Arc((39.5, 45.0), r * 2, r * 2, theta1=-52, theta2=52,
                color="#C79A63", lw=1.3, alpha=0.38 - i * 0.09, zorder=3.34)
        )


def draw_tv_light(ax):
    ax.add_patch(
        Polygon([(37.0, 55.0), (37.0, 36.5), (74.0, 20.0), (92.0, 66.0)],
                closed=True, facecolor="#FFE9AE", alpha=0.13, lw=0, zorder=3.6)
    )
    ax.add_patch(
        Polygon([(37.0, 52.0), (37.0, 40.0), (80.0, 30.0), (86.0, 62.0)],
                closed=True, facecolor="#FFF0C6", alpha=0.10, lw=0, zorder=3.62)
    )
    glow(ax, 22.0, 46.0, 26.0, color="#FFE2A0", layers=12, strength=0.08, zorder=3.58)


# --------------------------------------------------------------------------
# armchair + grandmother
# --------------------------------------------------------------------------
def draw_chair_back(ax):
    shadow(ax, 89, 15.5, 46, 8.0, alpha=0.17, zorder=3.4)

    # wing back (chair faces left)
    ax.add_patch(
        blob([(88.0, 24.0), (86.5, 44.0), (88.5, 58.0), (95.0, 62.5),
              (104.0, 62.0), (109.5, 55.0), (110.0, 36.0), (108.0, 24.0)],
             facecolor=CHAIR, edgecolor=CHAIR_D, lw=1.5, zorder=4.0)
    )
    ax.add_patch(
        blob([(90.5, 30.0), (89.5, 46.0), (92.0, 57.5), (99.0, 59.5),
              (105.5, 56.0), (107.0, 42.0), (105.5, 30.0)],
             facecolor=CHAIR_L, alpha=0.55, lw=0, zorder=4.05)
    )
    for by in (38.0, 46.0, 54.0):
        for bx in (95.0, 101.5):
            ax.add_patch(Circle((bx, by), 0.55, facecolor=CHAIR_D, lw=0, zorder=4.1))

    # seat + skirt
    ax.add_patch(rbox(69.0, 27.5, 27.0, 12.0, r=3.0, facecolor=CHAIR_L,
                      edgecolor=CHAIR_D, lw=1.4, zorder=4.15))
    ax.add_patch(
        Polygon([(71.0, 28.5), (107.0, 28.5), (105.0, 15.5), (73.0, 15.5)],
                closed=True, facecolor=CHAIR_D, lw=0, zorder=3.95)
    )
    ax.add_patch(
        Polygon([(73.0, 15.5), (105.0, 15.5), (104.0, 13.5), (74.0, 13.5)],
                closed=True, facecolor="#4E6957", lw=0, zorder=3.96)
    )


def draw_chair_arm(ax):
    ax.add_patch(rbox(74.0, 25.0, 28.0, 11.0, r=3.5, facecolor=CHAIR,
                      edgecolor=CHAIR_D, lw=1.4, zorder=8.6))
    ax.add_patch(
        blob([(76.5, 33.5), (84.0, 35.0), (93.0, 34.6), (99.5, 32.5),
              (92.0, 31.6), (82.0, 31.9)],
             facecolor=CHAIR_L, alpha=0.6, lw=0, zorder=8.62)
    )
    ax.add_patch(Circle((76.6, 30.5), 3.0, facecolor=CHAIR_L,
                        edgecolor=CHAIR_D, lw=1.2, zorder=8.64))


def draw_grandma(ax):
    # ---- legs (behind the blanket) ----
    ax.plot([76.5, 74.0], [31.0, 21.5], color="#DCCDB6", lw=6.5,
            solid_capstyle="round", zorder=7.6)
    ax.add_patch(Ellipse((71.6, 19.6), 6.4, 3.3, angle=-6,
                         facecolor="#C97F92", edgecolor="#A9636E", lw=1.0, zorder=7.62))
    ax.plot([73.5, 70.5], [31.0, 20.2], color="#EADCC6", lw=6.5,
            solid_capstyle="round", zorder=7.7)
    ax.add_patch(Ellipse((67.8, 18.3), 7.0, 3.6, angle=-8,
                         facecolor="#DB93A4", edgecolor="#A9636E", lw=1.0, zorder=7.72))
    ax.add_patch(Ellipse((66.0, 18.6), 2.4, 1.6, angle=-8,
                         facecolor="#F3D3DA", lw=0, zorder=7.73))

    # ---- lap blanket ----
    ax.add_patch(
        blob([(92.5, 39.5), (86.0, 42.5), (78.0, 41.0), (71.0, 37.0),
              (66.8, 31.5), (68.5, 27.5), (75.0, 27.5), (83.0, 29.0),
              (90.0, 31.0), (93.5, 35.0)],
             facecolor=BLANKET, edgecolor="#C4813F", lw=1.3, zorder=8.0)
    )
    for i in range(5):
        x0 = 69.0 + i * 5.0
        ax.plot([x0, x0 + 3.5], [28.0 + i * 0.9, 40.0 - i * 0.6],
                color=BLANKET_L, lw=1.6, alpha=0.75, zorder=8.05)
    ax.plot([68.2, 92.0], [31.5, 36.0], color=BLANKET_L, lw=1.8,
            alpha=0.8, zorder=8.06)
    for i in range(7):
        fx = 67.0 + i * 1.1
        ax.plot([fx, fx - 0.5], [28.4 - i * 0.15, 26.4 - i * 0.1],
                color="#F0C58A", lw=1.2, zorder=8.07)

    # ---- torso ----
    ax.add_patch(
        blob([(89.5, 38.0), (91.0, 45.0), (89.5, 51.0), (86.0, 53.6),
              (81.5, 53.4), (77.6, 50.0), (76.6, 44.0), (79.0, 38.5),
              (84.0, 36.6)],
             facecolor=CARDIGAN, edgecolor=CARDIGAN_D, lw=1.4, zorder=9.0)
    )
    for k in range(6):
        yy = 39.5 + k * 2.4
        ax.plot([77.6 + k * 0.15, 90.0 - k * 0.1], [yy - 1.2, yy + 0.6],
                color=CARDIGAN_D, lw=0.8, alpha=0.35, zorder=9.02)

    # shawl over the shoulders
    ax.add_patch(
        blob([(90.6, 47.5), (88.0, 53.0), (83.5, 54.4), (78.4, 51.2),
              (77.2, 46.5), (81.0, 48.6), (86.5, 48.0)],
             facecolor=SHAWL, edgecolor="#DCC7A9", lw=1.2, zorder=9.1)
    )
    for k in range(5):
        ax.plot([78.0 + k * 2.9, 78.6 + k * 2.9], [48.6 + k * 0.5, 45.6 + k * 0.6],
                color="#E3CEB0", lw=1.0, zorder=9.12)

    # ---- arms + mug ----
    ax.plot([82.0, 77.6, 75.6], [50.0, 45.6, 43.4], color=CARDIGAN_D, lw=6.4,
            solid_capstyle="round", solid_joinstyle="round", zorder=9.15)
    ax.plot([86.6, 81.0, 77.8], [49.6, 44.4, 42.6], color=CARDIGAN, lw=6.8,
            solid_capstyle="round", solid_joinstyle="round", zorder=9.3)
    ax.add_patch(Circle((75.2, 43.2), 1.7, facecolor=SKIN_D, lw=0, zorder=9.32))
    ax.add_patch(Circle((77.9, 42.4), 1.8, facecolor=SKIN, lw=0, zorder=9.4))

    ax.add_patch(rbox(74.4, 41.4, 4.2, 4.0, r=0.7, facecolor="#FBF1DE",
                      edgecolor="#D8C4A5", lw=1.1, zorder=9.35))
    ax.add_patch(Arc((78.7, 43.2), 2.4, 2.4, theta1=-80, theta2=80,
                     color="#D8C4A5", lw=1.4, zorder=9.36))
    ax.add_patch(Ellipse((76.5, 45.3), 4.0, 1.2, facecolor="#B0783F",
                         lw=0, zorder=9.37))
    for dx in (-1.0, 0.2, 1.4):
        ys = np.linspace(46.0, 51.5, 22)
        xs = 76.5 + dx + 0.7 * np.sin((ys - 46.0) * 1.1)
        ax.plot(xs, ys, color="#FFFFFF", lw=1.4, alpha=0.42, zorder=9.38)

    # ---- head (turned toward the TV on the left) ----
    ax.add_patch(
        Polygon([(82.4, 51.0), (85.6, 51.0), (85.2, 55.6), (82.6, 55.6)],
                closed=True, facecolor=SKIN_D, lw=0, zorder=9.5)
    )
    ax.add_patch(
        blob([(84.0, 53.4), (87.6, 55.4), (88.6, 59.6), (86.6, 63.6),
              (82.4, 64.8), (78.4, 63.2), (76.8, 59.2), (78.6, 55.2),
              (81.0, 53.2)],
             facecolor=SKIN, edgecolor=SKIN_D, lw=1.1, zorder=9.55)
    )
    ax.add_patch(
        Polygon([(77.2, 59.4), (75.2, 58.0), (77.4, 57.0)], closed=True,
                facecolor=SKIN, edgecolor=SKIN_D, lw=1.0, zorder=9.56)
    )
    ax.add_patch(Ellipse((86.6, 58.6), 2.2, 3.0, angle=8, facecolor=SKIN,
                         edgecolor=SKIN_D, lw=1.0, zorder=9.54))

    # silver hair + bun
    ax.add_patch(
        blob([(76.9, 60.0), (78.2, 64.2), (82.4, 66.2), (86.8, 65.0),
              (89.4, 61.6), (89.6, 57.6), (87.4, 60.0), (83.0, 61.2),
              (79.2, 60.6)],
             facecolor=HAIR, edgecolor=HAIR_D, lw=1.1, zorder=9.7)
    )
    ax.add_patch(Circle((89.8, 60.4), 3.3, facecolor=HAIR,
                        edgecolor=HAIR_D, lw=1.1, zorder=9.68))
    for a in np.linspace(-40, 200, 7):
        rad = np.deg2rad(a)
        ax.plot([89.8, 89.8 + 2.7 * np.cos(rad)], [60.4, 60.4 + 2.7 * np.sin(rad)],
                color=HAIR_D, lw=0.8, alpha=0.7, zorder=9.69)
    ax.plot([78.0, 80.5, 84.0], [61.6, 64.4, 64.6], color=HAIR_D, lw=1.0,
            alpha=0.8, zorder=9.72)

    # glasses looking left
    ax.add_patch(Circle((79.9, 59.3), 2.25, facecolor="#EAF3F6", alpha=0.55,
                        edgecolor="#6E5A46", lw=1.3, zorder=9.75))
    ax.add_patch(Circle((84.9, 59.9), 2.15, facecolor="#EAF3F6", alpha=0.4,
                        edgecolor="#6E5A46", lw=1.3, zorder=9.74))
    ax.plot([82.1, 82.8], [59.5, 59.7], color="#6E5A46", lw=1.2, zorder=9.76)
    ax.plot([86.9, 88.4], [60.3, 59.4], color="#6E5A46", lw=1.2, zorder=9.76)

    # eyes / brows / mouth
    ax.add_patch(Ellipse((79.1, 59.4), 1.25, 1.45, facecolor=DARK, lw=0, zorder=9.8))
    ax.add_patch(Ellipse((78.85, 59.75), 0.45, 0.5, facecolor="#FFFFFF",
                         lw=0, zorder=9.81))
    ax.add_patch(Ellipse((84.2, 59.9), 1.1, 1.3, facecolor=DARK, lw=0, zorder=9.8))
    ax.add_patch(Ellipse((83.95, 60.25), 0.4, 0.45, facecolor="#FFFFFF",
                         lw=0, zorder=9.81))
    ax.add_patch(Arc((79.3, 61.6), 3.0, 1.8, theta1=15, theta2=170,
                     color="#8A7159", lw=1.2, zorder=9.82))
    ax.add_patch(Arc((84.4, 62.1), 2.8, 1.7, theta1=15, theta2=165,
                     color="#8A7159", lw=1.2, zorder=9.82))
    ax.add_patch(Arc((80.6, 56.9), 3.2, 2.4, theta1=200, theta2=340,
                     color="#A85F58", lw=1.4, zorder=9.83))
    ax.add_patch(Ellipse((78.6, 56.9), 2.2, 1.3, facecolor="#EFA894",
                         alpha=0.55, lw=0, zorder=9.78))
    ax.add_patch(Ellipse((84.0, 57.2), 2.0, 1.2, facecolor="#EFA894",
                         alpha=0.4, lw=0, zorder=9.78))

    # warm screen light on her face and chest
    ax.add_patch(
        blob([(76.8, 60.0), (78.6, 63.4), (80.4, 62.0), (79.4, 57.0),
              (77.0, 55.4)],
             facecolor="#FFE9B4", alpha=0.30, lw=0, zorder=9.85)
    )
    ax.add_patch(
        blob([(77.0, 50.4), (79.6, 52.6), (81.0, 47.0), (78.4, 42.6),
              (76.6, 45.0)],
             facecolor="#FFE9B4", alpha=0.18, lw=0, zorder=9.86)
    )

    # collar detail
    ax.add_patch(
        Polygon([(82.2, 53.2), (85.4, 53.0), (84.2, 50.4), (81.6, 50.8)],
                closed=True, facecolor=SHAWL, edgecolor="#DCC7A9",
                lw=1.0, zorder=9.2)
    )
    ax.add_patch(Circle((83.2, 51.4), 0.7, facecolor="#E8C87A",
                        edgecolor="#B9973F", lw=0.8, zorder=9.22))


def draw_gaze(ax):
    for y0, y1, a in ((59.2, 50.5, 0.55), (58.4, 44.0, 0.4)):
        xs = np.linspace(74.5, 40.5, 200)
        ys = np.linspace(y0, y1, 200)
        ax.plot(xs, ys, color="#E9B457", lw=1.5, alpha=a, ls=(0, (6, 5)),
                zorder=12.0)
    ax.add_patch(
        Polygon([(40.0, 47.2), (44.6, 49.4), (44.2, 45.2)], closed=True,
                facecolor="#E9B457", alpha=0.55, lw=0, zorder=12.05)
    )


# --------------------------------------------------------------------------
# props
# --------------------------------------------------------------------------
def draw_floor_lamp(ax):
    shadow(ax, 112, 15.0, 16, 4.5, alpha=0.15, zorder=3.5)
    ax.add_patch(Ellipse((112.0, 15.5), 12.0, 3.6, facecolor=WOOD_D,
                         lw=0, zorder=3.7))
    ax.add_patch(Rectangle((111.2, 15.5), 1.6, 47.0, facecolor="#8A6B45",
                           lw=0, zorder=3.72))
    glow(ax, 112.0, 68.0, 22.0, layers=16, strength=0.12, zorder=3.74)
    ax.add_patch(
        Polygon([(105.5, 62.0), (118.5, 62.0), (116.2, 75.0), (107.8, 75.0)],
                closed=True, facecolor="#F0CE92", edgecolor="#C79E5F",
                lw=1.3, zorder=3.78)
    )
    for lx in (108.6, 111.0, 113.4, 115.8):
        ax.plot([lx, lx + 0.9], [62.2, 74.8], color="#DBB273", lw=1.0,
                alpha=0.7, zorder=3.79)
    ax.add_patch(Ellipse((112.0, 62.0), 13.0, 2.6, facecolor=LAMPLIGHT,
                         lw=0, zorder=3.8))


def draw_low_table(ax):
    shadow(ax, 47, 11.5, 32, 5.5, alpha=0.15, zorder=10.4)
    ax.add_patch(rbox(32.0, 24.0, 30.0, 3.4, r=1.0, facecolor=WOOD_L,
                      edgecolor=WOOD_D, lw=1.3, zorder=10.6))
    ax.add_patch(Rectangle((35.0, 12.5), 2.2, 11.6, facecolor=WOOD,
                           edgecolor=WOOD_D, lw=1.0, zorder=10.55))
    ax.add_patch(Rectangle((57.0, 12.5), 2.2, 11.6, facecolor=WOOD,
                           edgecolor=WOOD_D, lw=1.0, zorder=10.55))
    ax.add_patch(Rectangle((35.0, 16.5), 24.2, 1.8, facecolor=WOOD,
                           edgecolor=WOOD_D, lw=1.0, zorder=10.56))
    ax.add_patch(Rectangle((38.0, 18.3), 9.0, 1.2, facecolor="#D9736A",
                           lw=0, zorder=10.57))
    ax.add_patch(Rectangle((39.0, 19.5), 8.0, 1.1, facecolor="#7FA6C4",
                           lw=0, zorder=10.57))

    # teapot
    ax.add_patch(Ellipse((41.0, 30.0), 8.4, 6.6, facecolor="#EFE2CC",
                         edgecolor="#C9B698", lw=1.2, zorder=10.7))
    ax.add_patch(Ellipse((41.0, 33.4), 3.6, 1.6, facecolor="#EFE2CC",
                         edgecolor="#C9B698", lw=1.1, zorder=10.72))
    ax.add_patch(Circle((41.0, 34.4), 0.8, facecolor="#C98B5E", lw=0, zorder=10.73))
    ax.add_patch(
        Polygon([(45.0, 31.4), (48.6, 33.6), (48.2, 32.2), (45.2, 30.0)],
                closed=True, facecolor="#EFE2CC", edgecolor="#C9B698",
                lw=1.0, zorder=10.71)
    )
    ax.add_patch(Arc((36.6, 30.2), 4.2, 4.6, theta1=100, theta2=260,
                     color="#C9B698", lw=2.2, zorder=10.71))
    ax.add_patch(Ellipse((41.0, 28.6), 5.6, 1.8, facecolor="#D9A0A8",
                         alpha=0.8, lw=0, zorder=10.74))

    # cup + saucer
    ax.add_patch(Ellipse((53.0, 27.4), 7.0, 2.0, facecolor="#E7D9C1",
                         edgecolor="#C9B698", lw=1.0, zorder=10.7))
    ax.add_patch(rbox(50.6, 27.4, 4.8, 3.6, r=0.7, facecolor="#FBF3E4",
                      edgecolor="#C9B698", lw=1.1, zorder=10.72))
    ax.add_patch(Arc((55.6, 29.2), 2.4, 2.4, theta1=-80, theta2=80,
                     color="#C9B698", lw=1.3, zorder=10.73))
    ax.add_patch(Ellipse((53.0, 30.7), 4.4, 1.2, facecolor="#B0783F",
                         lw=0, zorder=10.74))
    for dx in (-0.9, 0.6):
        ys = np.linspace(31.2, 35.6, 20)
        xs = 53.0 + dx + 0.6 * np.sin((ys - 31.2) * 1.3)
        ax.plot(xs, ys, color="#FFFFFF", lw=1.3, alpha=0.4, zorder=10.75)

    # small vase
    ax.add_patch(
        blob([(61.0, 27.6), (62.6, 30.0), (61.6, 32.4), (59.4, 32.4),
              (58.4, 30.0), (60.0, 27.6)],
             facecolor="#9FB8C6", edgecolor="#7A94A3", lw=1.0, zorder=10.7)
    )
    for ax0, ay0, col in ((58.4, 36.4, "#E58A9B"), (61.0, 37.6, "#F0C05A"),
                          (62.8, 35.4, "#E58A9B")):
        ax.plot([60.4, ax0], [32.0, ay0 - 0.8], color="#6F8F5F", lw=1.2,
                zorder=10.71)
        ax.add_patch(Circle((ax0, ay0), 1.25, facecolor=col, lw=0, zorder=10.76))
        ax.add_patch(Circle((ax0, ay0), 0.45, facecolor="#FBF0C9", lw=0,
                            zorder=10.77))


def draw_cat(ax):
    ax.add_patch(Ellipse((22.0, 9.4), 15.0, 8.0, angle=-4,
                         facecolor="#D98B4A", edgecolor="#B26D34",
                         lw=1.2, zorder=11.0))
    ax.add_patch(Ellipse((22.5, 8.0), 12.0, 4.4, angle=-4,
                         facecolor="#EAB07B", lw=0, zorder=11.02))
    tail_x = np.linspace(28.5, 15.5, 40)
    tail_y = 6.0 + 1.9 * np.sin(np.linspace(0, np.pi, 40))
    ax.plot(tail_x, tail_y, color="#D98B4A", lw=4.2, solid_capstyle="round",
            zorder=11.05)
    ax.add_patch(Circle((15.6, 10.4), 3.7, facecolor="#E09755",
                        edgecolor="#B26D34", lw=1.2, zorder=11.1))
    ax.add_patch(Polygon([(13.2, 12.6), (13.8, 15.4), (15.8, 13.4)],
                         closed=True, facecolor="#E09755",
                         edgecolor="#B26D34", lw=1.0, zorder=11.11))
    ax.add_patch(Polygon([(16.6, 13.6), (18.4, 15.2), (18.6, 12.6)],
                         closed=True, facecolor="#E09755",
                         edgecolor="#B26D34", lw=1.0, zorder=11.11))
    ax.add_patch(Arc((14.2, 10.6), 2.0, 1.4, theta1=185, theta2=355,
                     color=DARK, lw=1.1, zorder=11.15))
    ax.add_patch(Arc((17.0, 10.8), 2.0, 1.4, theta1=185, theta2=355,
                     color=DARK, lw=1.1, zorder=11.15))
    ax.add_patch(Ellipse((15.5, 9.2), 1.0, 0.7, facecolor="#C4707E",
                         lw=0, zorder=11.16))
    for sx in (-1, 1):
        for dy in (-0.5, 0.4):
            ax.plot([15.5 + sx * 1.0, 15.5 + sx * 4.6],
                    [9.2 + dy, 9.2 + dy * 1.9], color="#8B6244", lw=0.8,
                    zorder=11.17)


def draw_basket(ax):
    ax.add_patch(
        Polygon([(96.0, 4.5), (112.0, 4.5), (110.0, 12.5), (98.0, 12.5)],
                closed=True, facecolor="#C79A63", edgecolor="#9C7440",
                lw=1.3, zorder=11.3)
    )
    for yy in (6.5, 8.5, 10.5):
        ax.plot([96.7 + (yy - 4.5) * 0.25, 111.3 - (yy - 4.5) * 0.25], [yy, yy],
                color="#9C7440", lw=1.0, alpha=0.8, zorder=11.32)
    ax.add_patch(Ellipse((104.0, 12.5), 14.4, 2.6, facecolor="#D8AD76",
                         edgecolor="#9C7440", lw=1.2, zorder=11.34))
    for cx, col in ((100.5, "#D9736A"), (105.5, "#7FA6C4"), (108.5, "#8FAE7E")):
        ax.add_patch(Circle((cx, 14.2), 2.5, facecolor=col,
                            edgecolor="#00000022", lw=0.8, zorder=11.36))
        ax.add_patch(Arc((cx, 14.2), 4.0, 2.4, theta1=0, theta2=180,
                         color="#FFFFFF", alpha=0.35, lw=1.0, zorder=11.37))
    ax.plot([100.5, 98.0, 96.0], [16.6, 18.6, 17.4], color="#D9736A", lw=1.4,
            zorder=11.38)
    ax.plot([99.0, 101.5], [18.2, 20.4], color="#B0763F", lw=1.4, zorder=11.38)
    ax.plot([100.2, 102.7], [17.4, 19.6], color="#B0763F", lw=1.4, zorder=11.38)


def draw_ambience(ax):
    ax.add_patch(
        Polygon([(37.0, 54.0), (37.0, 38.0), (78.0, 26.0), (88.0, 62.0)],
                closed=True, facecolor="#FFEBBB", alpha=0.06, lw=0, zorder=12.5)
    )
    for i in range(1, 9):
        ax.add_patch(
            Rectangle((0, 0), W, H, facecolor="none", edgecolor="#6B3E1E",
                      lw=i * 5.5, alpha=0.012, zorder=13.0)
        )


def main():
    out = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()

    draw_room(ax)
    draw_wall_decor(ax)
    draw_window(ax)
    draw_pendant(ax)
    draw_tv(ax)
    draw_tv_light(ax)
    draw_floor_lamp(ax)
    draw_chair_back(ax)
    draw_grandma(ax)
    draw_chair_arm(ax)
    draw_low_table(ax)
    draw_cat(ax)
    draw_basket(ax)
    draw_gaze(ax)
    draw_ambience(ax)

    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    ax.set_aspect("equal")
    fig.savefig(out, dpi=100, facecolor="#F8EBD5")
    plt.close(fig)


if __name__ == "__main__":
    main()
