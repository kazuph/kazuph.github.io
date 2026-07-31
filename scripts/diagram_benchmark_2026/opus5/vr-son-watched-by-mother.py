import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager, rcParams
from matplotlib.patches import (
    Arc,
    Circle,
    Ellipse,
    FancyArrowPatch,
    FancyBboxPatch,
    Polygon,
    Rectangle,
    Wedge,
)

JP_FONTS = [
    "Hiragino Maru Gothic Pro",
    "Hiragino Sans",
    "YuGothic",
    "Yu Gothic",
    "Noto Sans CJK JP",
    "Noto Sans JP",
    "IPAexGothic",
    "IPAPGothic",
    "TakaoPGothic",
    "Source Han Sans JP",
    "Meiryo",
    "MS Gothic",
]
_available = {f.name for f in font_manager.fontManager.ttflist}
_jp = next((name for name in JP_FONTS if name in _available), None)
if _jp:
    rcParams["font.family"] = _jp
HAS_JP = _jp is not None


def label(ja, en):
    return ja if HAS_JP else en


WALL = "#ece3d5"
WALL_DARK = "#ddd1bf"
FLOOR = "#d8b686"
FLOOR_LINE = "#c39f6d"
WOOD = "#a9743f"
WOOD_DARK = "#8a5b2c"
SKIN = "#f7d3ad"
SKIN_SH = "#e5b88b"
HAIR_SON = "#4b3625"
HAIR_MOM = "#5a3a28"
SHIRT = "#4aa3d8"
SHIRT_DARK = "#3a86b6"
PANTS = "#3f4a63"
MOM_DRESS = "#c9707f"
APRON = "#f3ede2"
VR_DARK = "#2c3140"
GLOW = "#57d3f0"
LINE = "#3a3a3a"

fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(WALL)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 120)
ax.set_ylim(0, 90)
ax.set_aspect("equal")
ax.axis("off")


def poly(pts, fc, ec="none", lw=0, z=1, alpha=1.0, ls="-"):
    p = Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=lw,
                zorder=z, alpha=alpha, linestyle=ls, joinstyle="round")
    ax.add_patch(p)
    return p


def rect(x, y, w, h, fc, ec="none", lw=0, z=1, alpha=1.0):
    r = Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=lw,
                  zorder=z, alpha=alpha)
    ax.add_patch(r)
    return r


def rrect(x, y, w, h, fc, ec="none", lw=0, z=1, pad=0.6, alpha=1.0):
    p = FancyBboxPatch((x + pad, y + pad), w - 2 * pad, h - 2 * pad,
                       boxstyle="round,pad=%.2f" % pad, facecolor=fc,
                       edgecolor=ec, linewidth=lw, zorder=z, alpha=alpha)
    ax.add_patch(p)
    return p


def circ(x, y, r, fc, ec="none", lw=0, z=1, alpha=1.0):
    c = Circle((x, y), r, facecolor=fc, edgecolor=ec, linewidth=lw,
               zorder=z, alpha=alpha)
    ax.add_patch(c)
    return c


def limb(pts, lw, color, z=5):
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color=color, lw=lw,
            solid_capstyle="round", solid_joinstyle="round", zorder=z)


def star_pts(cx, cy, r, n=5, inner=0.42, rot=-90.0):
    pts = []
    for i in range(2 * n):
        ang = math.radians(rot + i * 180.0 / n)
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    return pts


def cube(cx, cy, s, top, left, right, z=3, alpha=1.0):
    w = s * 0.87
    poly([(cx, cy + s), (cx + w, cy + s * 0.5), (cx, cy), (cx - w, cy + s * 0.5)],
         top, ec="#1d6f86", lw=0.8, z=z, alpha=alpha)
    poly([(cx - w, cy + s * 0.5), (cx, cy), (cx, cy - s), (cx - w, cy - s * 0.5)],
         left, ec="#1d6f86", lw=0.8, z=z, alpha=alpha)
    poly([(cx + w, cy + s * 0.5), (cx, cy), (cx, cy - s), (cx + w, cy - s * 0.5)],
         right, ec="#1d6f86", lw=0.8, z=z, alpha=alpha)


def bubble(text, x, y, target, fc="#ffffff", ec="#4a4a4a", fs=13, tc="#2b2b2b"):
    dx, dy = target[0] - x, target[1] - y
    d = math.hypot(dx, dy) or 1.0
    ux, uy = dx / d, dy / d
    px, py = -uy, ux
    base = (x + ux * 3.0, y + uy * 3.0)
    tip = (x + ux * 9.5, y + uy * 9.5)
    poly([(base[0] + px * 2.4, base[1] + py * 2.4),
          (base[0] - px * 2.4, base[1] - py * 2.4), tip],
         fc, ec=ec, lw=1.5, z=10)
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=tc,
            zorder=11, linespacing=1.35,
            bbox=dict(boxstyle="round,pad=0.55", facecolor=fc, edgecolor=ec, linewidth=1.6))


# ---------------------------------------------------------------- room shell
rect(0, 34, 120, 56, WALL, z=0)
rect(0, 0, 120, 34, FLOOR, z=0)
for yy in (7.5, 15.5, 23.5, 31.0):
    ax.plot([0, 120], [yy, yy], color=FLOOR_LINE, lw=1.1, zorder=0.2)
for xx, y0, y1 in ((18, 0, 7.5), (46, 7.5, 15.5), (78, 0, 7.5), (104, 15.5, 23.5),
                   (30, 23.5, 31.0), (66, 23.5, 31.0)):
    ax.plot([xx, xx], [y0, y1], color=FLOOR_LINE, lw=1.1, zorder=0.2)
rect(0, 34, 120, 2.6, "#f6f1e7", ec=WALL_DARK, lw=1.0, z=0.6)
ax.plot([0, 120], [34, 34], color="#b9a98f", lw=1.4, zorder=0.7)

# --------------------------------------------------------------- window wall
rect(6, 58, 28, 26, WOOD_DARK, z=1)
rect(7.4, 59.4, 25.2, 23.2, "#bfe4f7", z=1.1)
poly([(7.4, 59.4), (32.6, 59.4), (32.6, 68), (7.4, 74)], "#a9d8f2", z=1.15)
circ(26, 77, 3.2, "#fff6c8", z=1.2)
ax.plot([20, 20], [59.4, 82.6], color=WOOD_DARK, lw=1.8, zorder=1.3)
ax.plot([7.4, 32.6], [71, 71], color=WOOD_DARK, lw=1.8, zorder=1.3)
poly([(2.5, 85), (9.5, 85), (8.2, 60), (3.5, 60)], "#e08a8a", ec="#c46f6f", lw=1.0, z=1.4)
poly([(30.5, 85), (37.5, 85), (36.5, 60), (31.8, 60)], "#e08a8a", ec="#c46f6f", lw=1.0, z=1.4)
rect(1.5, 84, 37, 2.2, WOOD, z=1.5)

# ---------------------------------------------------------------- desk + pc
rect(4, 45, 32, 2.8, WOOD, ec=WOOD_DARK, lw=1.0, z=2)
rect(5.5, 34, 2.4, 11, WOOD_DARK, z=1.9)
rect(31.5, 34, 2.4, 11, WOOD_DARK, z=1.9)
rect(4, 40.5, 32, 1.4, WOOD_DARK, z=1.9)
rect(17.5, 47.8, 4.5, 3.2, "#8b8f98", z=2.1)
rect(14.5, 50.6, 10.5, 1.2, "#8b8f98", z=2.1)
rrect(10.5, 51.5, 19, 11, "#3b4250", ec="#262b35", lw=1.2, z=2.2, pad=0.5)
rect(12, 53, 16, 8, "#7fc7e8", z=2.3)
poly([(12, 53), (28, 53), (12, 61)], "#a5daf1", z=2.35)
rect(26, 47.8, 3.4, 4.2, "#e6b34d", ec="#c9963a", lw=0.9, z=2.2)
ax.plot([27.2, 27.2], [51.5, 54.2], color="#4a4a4a", lw=1.0, zorder=2.25)
ax.plot([28.3, 28.6], [51.5, 54.0], color="#d05a5a", lw=1.0, zorder=2.25)

# chair
rect(20, 34.5, 11, 1.8, "#e0754f", ec="#c15f3c", lw=1.0, z=2.6)
rect(28.5, 36.3, 2.2, 9.5, "#e0754f", ec="#c15f3c", lw=1.0, z=2.55)
limb([(22, 34.5), (21, 30.5)], 1.8, "#8b8f98", z=2.5)
limb([(29.5, 34.5), (30.5, 30.5)], 1.8, "#8b8f98", z=2.5)
limb([(21, 30.7), (30.5, 30.7)], 1.6, "#8b8f98", z=2.5)

# -------------------------------------------------------------- wall shelf
rect(62, 68, 28, 2.2, WOOD, ec=WOOD_DARK, lw=1.0, z=2)
poly([(64, 68), (67, 68), (64.5, 65.5)], WOOD_DARK, z=1.9)
poly([(85, 68), (88, 68), (87.5, 65.5)], WOOD_DARK, z=1.9)
for i, (bx, bw, bh, bc) in enumerate([(64, 2.2, 7.5, "#d0564f"), (66.4, 1.8, 6.6, "#4f8fd0"),
                                      (68.4, 2.4, 8.1, "#e2b23c"), (71, 1.9, 6.9, "#5fae72")]):
    rect(bx, 70.2, bw, bh, bc, ec="#00000022", lw=0.8, z=2.1)
    ax.plot([bx + 0.4, bx + bw - 0.4], [70.2 + bh - 1.2, 70.2 + bh - 1.2],
            color="#ffffff88", lw=0.9, zorder=2.15)
circ(77.5, 73.2, 3.0, "#f0f0f0", ec="#b9b9b9", lw=1.0, z=2.1)
ax.plot([74.8, 80.2], [73.2, 73.2], color="#c9553f", lw=1.1, zorder=2.15)
ax.plot([77.5, 77.5], [70.4, 76.0], color="#c9553f", lw=1.1, zorder=2.15)
poly([(84, 70.2), (88, 70.2), (87.2, 75.5), (84.8, 75.5)], "#e8b93f", ec="#c79a2c", lw=1.0, z=2.1)
rect(84.6, 75.3, 2.8, 1.2, "#e8b93f", ec="#c79a2c", lw=1.0, z=2.1)

# wall clock
circ(68, 84, 4.2, "#fdfaf3", ec="#7a6a55", lw=1.6, z=2)
ax.plot([68, 68], [84, 87], color="#5a5147", lw=1.4, zorder=2.1)
ax.plot([68, 70.4], [84, 83.2], color="#5a5147", lw=1.2, zorder=2.1)
circ(68, 84, 0.5, "#5a5147", z=2.2)

# ------------------------------------------------------------------- doorway
rect(91.5, 33, 29, 48.5, WOOD, z=1.6)
rect(93.5, 34, 25, 46, "#3f4350", z=1.7)
poly([(93.5, 34), (118.5, 34), (118.5, 41), (93.5, 45)], "#565b6a", z=1.75)
rect(116.5, 34, 2.4, 46, "#8f5f30", ec=WOOD_DARK, lw=1.0, z=1.8)
poly([(93.5, 34), (118.5, 34), (112, 17), (86, 19.5)], "#ffe9a8", alpha=0.30, z=0.9)

# ------------------------------------------------------------------- bed
rect(0, 3.5, 31, 5.5, WOOD_DARK, z=3.0)
rect(0, 12, 31, 4.5, WOOD, ec=WOOD_DARK, lw=1.0, z=3.05)
rect(0, 26, 3.6, 12, "#b8823f", ec=WOOD_DARK, lw=1.2, z=3.4)
rrect(0, 15.5, 31, 8.0, "#fbf6ec", ec="#d8cfbe", lw=1.2, z=3.1, pad=0.7)
rrect(1.5, 17.5, 10.5, 6.5, "#ffffff", ec="#d6cdbb", lw=1.2, z=3.2, pad=0.6)
rrect(11.5, 15.8, 20, 7.8, "#6fa8d8", ec="#4f89ba", lw=1.2, z=3.25, pad=0.6)
poly([(11.8, 21.6), (31, 21.6), (31, 23.4), (11.8, 23.4)], "#8fc0e6", z=3.3)
for sx in (16, 21, 26):
    poly(star_pts(sx, 18.6, 1.5, 5, 0.45), "#ffffff", z=3.35, alpha=0.85)
limb([(1.5, 3.5), (1.5, 1.2)], 2.6, WOOD_DARK, z=2.95)
limb([(29.5, 3.5), (29.5, 1.2)], 2.6, WOOD_DARK, z=2.95)

# ------------------------------------------------------------------- rug
Ell = Ellipse((62, 11.5), 60, 19, facecolor="#8fc39a", edgecolor="#6ea87b",
              linewidth=1.6, zorder=1.0)
ax.add_patch(Ell)
ax.add_patch(Ellipse((62, 11.5), 50, 13.5, facecolor="none", edgecolor="#ffffff",
                     linewidth=1.4, alpha=0.6, zorder=1.05))

# toys on the floor
rect(92, 3.5, 5, 5, "#e0653f", ec="#bf4f2f", lw=1.0, z=3)
rect(97.5, 3.0, 4.2, 4.2, "#4f8fd0", ec="#3d76b0", lw=1.0, z=3)
rect(94.6, 8.5, 4.0, 4.0, "#e8c23f", ec="#c8a12c", lw=1.0, z=3)
circ(38, 5.0, 2.6, "#f0f0f0", ec="#b9b9b9", lw=1.0, z=3)
ax.plot([35.6, 40.4], [5.0, 5.0], color="#4f8fd0", lw=1.0, zorder=3.05)

# --------------------------------------------------------- VR virtual field
poly([(56.5, 42.5), (35.8, 50.4), (44.2, 61.8), (56.5, 46.0)], GLOW, alpha=0.16, z=3.6)
poly([(56.5, 43.2), (40.5, 51.0), (46.0, 58.5), (56.5, 45.4)], GLOW, alpha=0.14, z=3.62)
cube(44.5, 55.0, 3.4, "#8ee6f7", "#3fb6d8", "#2b93b4", z=3.7)
cube(51.5, 62.5, 2.2, "#a9edfa", "#5cc6e2", "#3ba2c2", z=3.7, alpha=0.9)
poly(star_pts(38.5, 52.5, 2.4, 4, 0.32), "#7fe3f7", ec="#3fb6d8", lw=0.8, z=3.7)
poly(star_pts(54.0, 57.0, 1.8, 4, 0.32), "#7fe3f7", ec="#3fb6d8", lw=0.8, z=3.7)
poly(star_pts(47.0, 48.5, 1.5, 4, 0.32), "#9fe9f9", z=3.7, alpha=0.9)
ax.add_patch(Arc((56, 44), 26, 26, theta1=118, theta2=168, lw=1.6,
                 edgecolor=GLOW, linestyle=(0, (4, 3)), zorder=3.65, alpha=0.8))

# ------------------------------------------------------------------- son
circ(62, 6.0, 11.5, "#00000018", z=3.8)
ax.add_patch(Ellipse((62, 6.0), 23, 5.2, facecolor="#00000018", zorder=3.8))

# legs
limb([(59.0, 21.5), (56.0, 13.5), (52.8, 8.0)], 4.6, PANTS, z=4.2)
limb([(65.0, 21.5), (70.5, 15.5), (73.8, 11.0)], 4.6, PANTS, z=4.2)
ax.add_patch(Ellipse((51.6, 7.0), 5.6, 3.0, facecolor="#f0f0f0", edgecolor="#c8c8c8",
                     linewidth=1.0, zorder=4.3))
ax.add_patch(Ellipse((75.2, 10.2), 5.6, 3.0, angle=22, facecolor="#f0f0f0",
                     edgecolor="#c8c8c8", linewidth=1.0, zorder=4.3))

# torso
poly([(56.2, 20.0), (67.8, 20.0), (69.8, 35.0), (54.2, 35.0)], SHIRT,
     ec=SHIRT_DARK, lw=1.4, z=4.4)
poly([(54.2, 35.0), (69.8, 35.0), (69.4, 32.0), (54.6, 32.0)], SHIRT_DARK, z=4.45)
poly(star_pts(62, 27.0, 3.6, 5, 0.45), "#fff2b0", ec="#e8c94f", lw=1.0, z=4.5)

# arms + hands
limb([(56.4, 33.5), (50.2, 40.0), (53.2, 48.6)], 4.0, SKIN, z=4.6)
limb([(67.8, 33.5), (76.0, 36.0), (81.2, 41.8)], 4.0, SKIN, z=4.6)
poly([(54.2, 35.0), (58.6, 35.0), (57.4, 30.4), (53.4, 31.4)], SHIRT_DARK, z=4.65)
poly([(65.6, 35.0), (69.8, 35.0), (70.6, 31.2), (66.4, 30.6)], SHIRT_DARK, z=4.65)
circ(53.4, 49.0, 1.9, SKIN, ec=SKIN_SH, lw=0.9, z=4.7)
circ(81.6, 42.2, 1.9, SKIN, ec=SKIN_SH, lw=0.9, z=4.7)

# controllers
for (hx, hy, ang) in ((53.4, 51.6, 8), (82.4, 44.6, -14)):
    rrect(hx - 1.7, hy - 2.0, 3.4, 4.6, "#3a4050", ec="#20242e", lw=1.0, z=4.6, pad=0.35)
    ax.add_patch(Arc((hx, hy + 3.2), 6.2, 4.6, theta1=200, theta2=-20,
                     lw=2.0, edgecolor="#5a6274", zorder=4.6))
    circ(hx, hy + 0.4, 0.55, GLOW, z=4.75)

# head
circ(62, 43.5, 6.4, SKIN, ec=SKIN_SH, lw=1.2, z=4.8)
ax.add_patch(Wedge((62, 43.5), 6.9, 18, 200, width=2.6, facecolor=HAIR_SON, zorder=4.9))
poly([(56.4, 47.6), (60.2, 51.6), (65.0, 49.2), (68.2, 46.4), (62.0, 50.9)],
     HAIR_SON, z=4.92)
rect(55.2, 42.6, 13.6, 2.0, "#4d5566", z=4.93)
rrect(55.0, 40.6, 14.2, 6.2, VR_DARK, ec="#171a22", lw=1.4, z=4.95, pad=0.55)
rrect(56.4, 41.8, 11.4, 3.6, "#39405a", z=4.96, pad=0.35)
poly([(57.2, 42.4), (60.4, 42.4), (58.0, 44.8), (56.9, 44.8)], GLOW, alpha=0.75, z=4.97)
circ(67.0, 45.6, 0.6, "#7ff0a8", z=4.98)
ax.add_patch(Arc((62.3, 38.6), 5.2, 3.6, theta1=200, theta2=340, lw=1.6,
                 edgecolor="#8c4a3f", zorder=4.9))
poly([(60.2, 37.6), (64.4, 37.6), (62.3, 36.0)], "#e0796f", z=4.9)
circ(56.6, 39.4, 1.5, "#f4a9a0", z=4.85, alpha=0.75)
circ(67.4, 39.4, 1.5, "#f4a9a0", z=4.85, alpha=0.75)

# motion lines
for cx, cy, w, t1, t2 in ((53.4, 49.0, 13, 55, 120), (53.4, 49.0, 17, 62, 112),
                          (81.6, 42.2, 13, -40, 25), (81.6, 42.2, 17, -32, 18),
                          (74.5, 10.5, 12, -20, 40)):
    ax.add_patch(Arc((cx, cy), w, w, theta1=t1, theta2=t2, lw=2.0,
                     edgecolor="#9aa2ae", zorder=4.1))

# ------------------------------------------------------------------ mother
ax.add_patch(Ellipse((104, 34.0), 17, 3.4, facecolor="#00000022", zorder=3.9))
limb([(101.2, 44.5), (100.6, 39.0), (101.0, 35.0)], 3.6, "#e8cbb0", z=3.95)
limb([(106.6, 44.5), (107.4, 39.0), (107.0, 35.0)], 3.6, "#e8cbb0", z=3.95)
ax.add_patch(Ellipse((100.2, 34.4), 4.8, 2.4, facecolor="#7a5a48", zorder=4.0))
ax.add_patch(Ellipse((107.6, 34.4), 4.8, 2.4, facecolor="#7a5a48", zorder=4.0))
poly([(96.4, 43.5), (111.2, 43.5), (109.0, 53.0), (98.6, 53.0)], MOM_DRESS,
     ec="#a85868", lw=1.3, z=4.05)
poly([(98.4, 52.0), (109.2, 52.0), (108.6, 62.5), (99.0, 62.5)], MOM_DRESS,
     ec="#a85868", lw=1.3, z=4.1)
poly([(99.6, 44.2), (108.2, 44.2), (107.4, 56.0), (100.4, 56.0)], APRON,
     ec="#d8d0c2", lw=1.1, z=4.15)
limb([(101.6, 56.2), (101.0, 61.5)], 1.4, "#d8d0c2", z=4.16)
limb([(106.2, 56.2), (106.8, 61.5)], 1.4, "#d8d0c2", z=4.16)
limb([(99.6, 60.8), (95.8, 55.5), (94.6, 50.6)], 3.4, "#e8cbb0", z=4.2)
limb([(108.4, 60.8), (111.6, 55.0), (109.4, 50.4)], 3.4, "#e8cbb0", z=4.2)
circ(94.4, 49.8, 1.6, "#f0d2b6", ec="#d8b394", lw=0.9, z=4.25)
circ(109.2, 49.6, 1.6, "#f0d2b6", ec="#d8b394", lw=0.9, z=4.25)
poly([(97.4, 68.0), (110.6, 68.0), (110.0, 55.0), (106.6, 60.5), (100.8, 60.5), (98.0, 55.0)],
     HAIR_MOM, z=4.26)
circ(103.6, 67.5, 5.1, "#f7d9bd", ec="#e0bb99", lw=1.1, z=4.3)
ax.add_patch(Wedge((103.6, 67.5), 5.6, 12, 195, width=2.4, facecolor=HAIR_MOM, zorder=4.35))
poly([(98.2, 70.4), (99.6, 63.0), (102.0, 71.6)], HAIR_MOM, z=4.36)
circ(100.3, 67.8, 0.62, LINE, z=4.4)
circ(103.3, 67.6, 0.62, LINE, z=4.4)
ax.plot([99.3, 101.3], [69.8, 70.3], color=LINE, lw=1.1, zorder=4.4)
ax.plot([102.5, 104.4], [70.0, 70.1], color=LINE, lw=1.1, zorder=4.4)
ax.add_patch(Arc((101.6, 64.8), 3.4, 2.4, theta1=195, theta2=345, lw=1.3,
                 edgecolor="#a8635a", zorder=4.4))
circ(106.0, 65.4, 1.5, "#f2ab9f", alpha=0.7, z=4.38)
poly([(109.8, 74.4), (111.2, 71.6), (108.6, 71.4)], "#8ed7f2", ec="#54b3d8", lw=0.9, z=4.4)

# ------------------------------------------------------- gaze relationships
ax.add_patch(FancyArrowPatch((98.6, 66.4), (71.2, 47.2),
                             arrowstyle="-|>", mutation_scale=20, lw=2.0,
                             linestyle=(0, (6, 4)), color="#d1615c",
                             connectionstyle="arc3,rad=-0.10", zorder=8))
ax.add_patch(FancyArrowPatch((55.4, 44.4), (46.6, 52.2),
                             arrowstyle="-|>", mutation_scale=18, lw=1.8,
                             linestyle=(0, (5, 4)), color="#2f9ec4",
                             connectionstyle="arc3,rad=0.08", zorder=8))

bubble(label("うおー！\nすごい！", "WHOA!\nAWESOME!"), 48, 82.5, (58.5, 50.5))
bubble(label("……また\nやってる", "...at it\nagain"), 101, 85.5, (103.6, 73.5), fc="#fff4f2", ec="#c58a86")

fig.savefig(sys.argv[1], dpi=100, facecolor=fig.get_facecolor())
