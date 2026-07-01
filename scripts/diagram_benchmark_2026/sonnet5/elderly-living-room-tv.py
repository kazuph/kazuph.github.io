import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle, Ellipse, Polygon, Arc
from matplotlib.lines import Line2D

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor('#EFDFC0')
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect('equal')
ax.axis('off')
fig.subplots_adjust(left=0, right=1, top=1, bottom=0)


def radial_glow(cx, cy, r, rgb, max_alpha=0.45, zorder=2, res=110, power=1.6):
    """Soft radial light patch (used for the lamp and the TV screen glow)."""
    xs = np.linspace(cx - r, cx + r, res)
    ys = np.linspace(cy - r, cy + r, res)
    X, Y = np.meshgrid(xs, ys)
    D = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / r
    A = np.clip(1 - D, 0, 1) ** power * max_alpha
    rgba = np.zeros((res, res, 4))
    rgba[..., 0] = rgb[0]
    rgba[..., 1] = rgb[1]
    rgba[..., 2] = rgb[2]
    rgba[..., 3] = A
    ax.imshow(rgba, extent=(cx - r, cx + r, cy - r, cy + r), zorder=zorder,
              interpolation='bilinear', origin='lower')


def vgrad(extent, top_rgb, bot_rgb, zorder, res=64):
    """Vertical colour gradient rectangle, returned so it can be clipped."""
    grad = np.linspace(0, 1, res).reshape(-1, 1)
    top = np.array(top_rgb)
    bot = np.array(bot_rgb)
    img = top[None, None, :] * (1 - grad[..., None]) + bot[None, None, :] * grad[..., None]
    img = np.repeat(img, 4, axis=1)
    return ax.imshow(img, extent=extent, zorder=zorder, origin='upper')


# ======================================================================
# ROOM SHELL — ceiling, wall, floor
# ======================================================================
vgrad((0, 12, 2.3, 8.85), (0.97, 0.90, 0.74), (0.90, 0.80, 0.62), zorder=0)

ax.add_patch(Rectangle((0, 8.85), 12, 0.15, facecolor='#DFCBA0', zorder=0.2))
ax.add_patch(Rectangle((0, 8.78), 12, 0.07, facecolor='#C9AE7C', zorder=0.3))

vgrad((0, 12, 0, 2.3), (0.52, 0.34, 0.20), (0.40, 0.24, 0.13), zorder=0)

for x in np.arange(0.6, 12, 1.15):
    ax.add_line(Line2D([x, x], [0, 2.3], color='#2E1B0E', linewidth=0.7, alpha=0.35, zorder=0.5))

ax.add_patch(Rectangle((0, 2.22), 12, 0.12, facecolor='#3B2A1A', zorder=0.6))
ax.add_patch(Rectangle((0, 2.30), 12, 0.05, facecolor='#F4E6C4', zorder=0.6))

# ======================================================================
# WINDOW — dusk sky + curtains
# ======================================================================
win_x0, win_y0, win_x1, win_y1 = 0.7, 4.6, 3.3, 8.15

ax.add_patch(Rectangle((win_x0 - 0.12, win_y0 - 0.12), (win_x1 - win_x0) + 0.24,
                        (win_y1 - win_y0) + 0.24, facecolor='#7A5230', edgecolor='#5C3D22',
                        linewidth=1.5, zorder=1))

pane = Rectangle((win_x0, win_y0), win_x1 - win_x0, win_y1 - win_y0,
                  facecolor='none', edgecolor='none', zorder=1.1)
ax.add_patch(pane)
sky = vgrad((win_x0, win_x1, win_y0, win_y1), (0.62, 0.52, 0.66), (0.93, 0.62, 0.40), zorder=1.1)
sky.set_clip_path(pane)

moon = Circle((win_x1 - 0.7, win_y1 - 0.7), 0.28, facecolor='#FDF6E3', edgecolor='none',
              alpha=0.9, zorder=1.2)
moon.set_clip_path(pane)
ax.add_patch(moon)

for sx, sy in [(1.1, 7.7), (1.6, 7.3), (2.4, 7.9), (2.9, 7.2), (1.3, 6.6)]:
    star = Circle((sx, sy), 0.02, facecolor='white', alpha=0.8, zorder=1.2)
    star.set_clip_path(pane)
    ax.add_patch(star)

mid_x = (win_x0 + win_x1) / 2
mid_y = (win_y0 + win_y1) / 2
ax.add_line(Line2D([mid_x, mid_x], [win_y0, win_y1], color='#6B4A2A', linewidth=4, zorder=1.3))
ax.add_line(Line2D([win_x0, win_x1], [mid_y, mid_y], color='#6B4A2A', linewidth=4, zorder=1.3))
ax.add_patch(Rectangle((win_x0, win_y0), win_x1 - win_x0, win_y1 - win_y0,
                        facecolor='none', edgecolor='#6B4A2A', linewidth=3, zorder=1.3))

ax.add_line(Line2D([win_x0 - 0.45, win_x1 + 0.45], [win_y1 + 0.25, win_y1 + 0.25],
                    color='#4A3221', linewidth=3, zorder=2.5))

left_curtain = Polygon([(win_x0 - 0.45, win_y1 + 0.3), (win_x0 + 0.25, win_y1 + 0.3),
                         (win_x0 + 0.35, win_y0 + 1.6), (win_x0 + 0.1, win_y0 - 0.15),
                         (win_x0 - 0.55, win_y0 - 0.1)],
                        closed=True, facecolor='#7B3F3F', edgecolor='#5E2F2F', linewidth=1, zorder=2.4)
right_curtain = Polygon([(win_x1 + 0.45, win_y1 + 0.3), (win_x1 - 0.25, win_y1 + 0.3),
                          (win_x1 - 0.35, win_y0 + 1.6), (win_x1 - 0.1, win_y0 - 0.15),
                          (win_x1 + 0.55, win_y0 - 0.1)],
                         closed=True, facecolor='#7B3F3F', edgecolor='#5E2F2F', linewidth=1, zorder=2.4)
ax.add_patch(left_curtain)
ax.add_patch(right_curtain)

for patch, cx0, cx1, sign in [(left_curtain, win_x0 - 0.45, win_x0 + 0.3, 1),
                               (right_curtain, win_x1 + 0.45, win_x1 - 0.3, -1)]:
    for fx in np.linspace(cx0, cx1, 5):
        fold = Line2D([fx, fx + sign * 0.05], [win_y1 + 0.3, win_y0 - 0.1],
                       color='#5E2F2F', linewidth=1, alpha=0.5, zorder=2.45)
        fold.set_clip_path(patch)
        ax.add_line(fold)

for tbx in (win_x0 + 0.05, win_x1 - 0.05):
    ax.add_patch(Ellipse((tbx, win_y0 + 0.9), 0.35, 0.5, facecolor='#9C5A5A',
                          edgecolor='#5E2F2F', linewidth=1, zorder=2.5))

# ======================================================================
# WALL DECOR — framed picture + clock
# ======================================================================
pic_x, pic_y, pic_w, pic_h = 4.55, 6.35, 1.15, 0.95
ax.add_patch(Rectangle((pic_x - 0.08, pic_y - 0.08), pic_w + 0.16, pic_h + 0.16,
                        facecolor='#7A5230', edgecolor='#4A3221', linewidth=1, zorder=1.5))
pic = Rectangle((pic_x, pic_y), pic_w, pic_h, facecolor='#DDE8E0', edgecolor='none', zorder=1.6)
ax.add_patch(pic)
hill = Polygon([(pic_x, pic_y), (pic_x, pic_y + 0.4), (pic_x + pic_w * 0.5, pic_y + 0.65),
                (pic_x + pic_w, pic_y + 0.3), (pic_x + pic_w, pic_y)],
               closed=True, facecolor='#7FA06B', edgecolor='none', zorder=1.65)
hill.set_clip_path(pic)
ax.add_patch(hill)
sun_p = Circle((pic_x + pic_w * 0.75, pic_y + pic_h * 0.75), 0.14, facecolor='#F2C879',
               edgecolor='none', zorder=1.66)
sun_p.set_clip_path(pic)
ax.add_patch(sun_p)

clock_c = (6.3, 7.85)
ax.add_patch(Circle(clock_c, 0.42, facecolor='#F7EFDD', edgecolor='#4A3221', linewidth=2.5, zorder=1.7))
for ang in range(0, 360, 30):
    a = np.deg2rad(ang)
    x0 = clock_c[0] + 0.33 * np.sin(a)
    y0 = clock_c[1] + 0.33 * np.cos(a)
    x1 = clock_c[0] + 0.38 * np.sin(a)
    y1 = clock_c[1] + 0.38 * np.cos(a)
    ax.add_line(Line2D([x0, x1], [y0, y1], color='#4A3221', linewidth=1.2, zorder=1.75))
ax.add_line(Line2D([clock_c[0], clock_c[0] + 0.10], [clock_c[1], clock_c[1] - 0.20],
                    color='#4A3221', linewidth=2.5, zorder=1.8))
ax.add_line(Line2D([clock_c[0], clock_c[0] - 0.20], [clock_c[1], clock_c[1] + 0.10],
                    color='#4A3221', linewidth=1.8, zorder=1.8))
ax.add_patch(Circle(clock_c, 0.035, facecolor='#4A3221', zorder=1.85))

# ======================================================================
# RUG
# ======================================================================
ax.add_patch(Ellipse((5.6, 1.05), 6.4, 1.7, facecolor='#7A3626', edgecolor='none', zorder=1.0))
ax.add_patch(Ellipse((5.6, 1.05), 5.9, 1.4, facecolor='#B5533C', edgecolor='none', zorder=1.05))
ax.add_patch(Ellipse((5.6, 1.05), 4.6, 1.0, facecolor='#D98B5F', edgecolor='none', zorder=1.1))
ax.add_patch(Ellipse((5.6, 1.05), 4.6, 1.0, facecolor='none', edgecolor='#7A3626',
                      linewidth=1.2, linestyle=(0, (4, 3)), zorder=1.15))

# ======================================================================
# SIDE TABLE + WARM LAMP (away from the TV)
# ======================================================================
radial_glow(1.75, 3.35, 1.9, (1.0, 0.83, 0.48), max_alpha=0.35, zorder=2.0)

ax.add_line(Line2D([1.35, 1.35], [0, 1.75], color='#5C3D22', linewidth=4, zorder=3))
ax.add_line(Line2D([2.15, 2.15], [0, 1.75], color='#5C3D22', linewidth=4, zorder=3))
ax.add_patch(Ellipse((1.75, 1.8), 1.0, 0.28, facecolor='#7A5230', edgecolor='#4A3221',
                      linewidth=1, zorder=3.1))

ax.add_patch(Ellipse((2.05, 1.9), 0.26, 0.14, facecolor='#F7EFDD', edgecolor='#B08A5A',
                      linewidth=1, zorder=3.3))
ax.add_patch(Ellipse((2.05, 1.93), 0.18, 0.06, facecolor='#8B5E34', edgecolor='none', zorder=3.35))
ax.add_patch(Circle((2.20, 1.90), 0.05, facecolor='none', edgecolor='#B08A5A', linewidth=1.2, zorder=3.3))

ax.add_patch(Polygon([(1.55, 1.9), (1.95, 1.9), (1.85, 2.05), (1.65, 2.05)],
                      closed=True, facecolor='#B08A5A', edgecolor='#7A5230', zorder=3.4))
ax.add_line(Line2D([1.75, 1.75], [2.05, 2.7], color='#B08A5A', linewidth=3, zorder=3.4))
ax.add_patch(Polygon([(1.35, 2.7), (2.15, 2.7), (1.95, 3.3), (1.55, 3.3)],
                      closed=True, facecolor='#F5E6C4', edgecolor='#C9AE7C', linewidth=1.2, zorder=3.5))
ax.add_patch(Ellipse((1.75, 3.0), 0.05, 0.6, facecolor='#FFEFC0', alpha=0.6, edgecolor='none', zorder=3.6))

# ======================================================================
# CORNER PLANT
# ======================================================================
ax.add_patch(Polygon([(0.35, 2.3), (0.95, 2.3), (0.85, 2.75), (0.45, 2.75)],
                      closed=True, facecolor='#8B5E3C', edgecolor='#5C3D22', zorder=3))
for lx, ly, ang in [(0.65, 2.75, 0), (0.5, 2.75, -25), (0.8, 2.75, 25),
                     (0.65, 2.75, 55), (0.65, 2.75, -55)]:
    ax.add_patch(Ellipse((lx, ly + 0.4), 0.22, 0.75, angle=ang, facecolor='#3F6B4A',
                          edgecolor='#2E4E36', linewidth=0.8, zorder=3.05))

# ======================================================================
# TELEVISION
# ======================================================================
radial_glow(10.0, 4.4, 3.0, (0.55, 0.75, 0.92), max_alpha=0.4, zorder=2.2)

ax.add_patch(Rectangle((8.5, 2.3), 3.0, 0.75, facecolor='#5C3D22', edgecolor='#3B2A1A',
                        linewidth=1.5, zorder=4))
ax.add_patch(Rectangle((8.6, 2.42), 2.8, 0.06, facecolor='#3B2A1A', zorder=4.05))
ax.add_line(Line2D([8.8, 8.8], [2.3, 3.05], color='#3B2A1A', linewidth=1, alpha=0.5, zorder=4.1))
ax.add_line(Line2D([9.6, 9.6], [2.3, 3.05], color='#3B2A1A', linewidth=1, alpha=0.5, zorder=4.1))

ax.add_patch(Ellipse((11.05, 3.12), 0.35, 0.12, facecolor='#2E4E36', edgecolor='none', zorder=4.2))
ax.add_patch(Rectangle((10.9, 3.05), 0.3, 0.22, facecolor='#8B5E3C', edgecolor='#5C3D22', zorder=4.15))
ax.add_patch(Rectangle((9.7, 3.0), 0.6, 0.12, facecolor='#232326', zorder=4.5))

ax.add_patch(FancyBboxPatch((8.6, 3.12), 2.8, 2.6, boxstyle="round,pad=0,rounding_size=0.10",
                             facecolor='#1E1E22', edgecolor='#111114', linewidth=1.5, zorder=5))

screen = FancyBboxPatch((8.78, 3.30), 2.44, 2.24, boxstyle="round,pad=0,rounding_size=0.04",
                         facecolor='#3E6E9E', edgecolor='none', zorder=5.1)
ax.add_patch(screen)
scr_clip = Rectangle((8.78, 3.30), 2.44, 2.24, facecolor='none', edgecolor='none', zorder=5.15)
ax.add_patch(scr_clip)
scr_im = vgrad((8.78, 11.22, 3.30, 5.54), (0.30, 0.45, 0.62), (0.55, 0.75, 0.55), zorder=5.15)
scr_im.set_clip_path(scr_clip)

tv_hill = Polygon([(8.78, 3.30), (8.78, 3.85), (10.0, 4.35), (11.22, 3.75), (11.22, 3.30)],
                   closed=True, facecolor='#5C8C5A', edgecolor='none', zorder=5.2)
tv_hill.set_clip_path(scr_clip)
ax.add_patch(tv_hill)
tv_sun = Circle((10.55, 5.05), 0.28, facecolor='#F2C879', edgecolor='none', alpha=0.9, zorder=5.21)
tv_sun.set_clip_path(scr_clip)
ax.add_patch(tv_sun)

for sy in np.linspace(3.4, 5.4, 6):
    gl = Line2D([8.85, 11.15], [sy, sy], color='white', alpha=0.06, linewidth=6, zorder=5.25)
    gl.set_clip_path(scr_clip)
    ax.add_line(gl)

ax.add_patch(Circle((10.0, 3.20), 0.02, facecolor='#8A8A90', zorder=5.3))

# ======================================================================
# ARMCHAIR (facing the TV)
# ======================================================================
ax.add_patch(Ellipse((3.9, 0.95), 3.0, 0.4, facecolor='#3B2A1A', alpha=0.25, zorder=3.5))
for lx in (2.85, 3.5, 4.4, 5.05):
    ax.add_line(Line2D([lx, lx - 0.05], [0.85, 0.35], color='#4A3221', linewidth=4, zorder=3.6))

ax.add_patch(FancyBboxPatch((2.55, 1.25), 2.75, 2.55, boxstyle="round,pad=0,rounding_size=0.35",
                             facecolor='#4F6B58', edgecolor='#3A4E40', linewidth=1.5, zorder=3.7))
ax.add_patch(FancyBboxPatch((2.80, 1.55), 2.25, 2.05, boxstyle="round,pad=0,rounding_size=0.30",
                             facecolor='#5C7A66', edgecolor='none', zorder=3.75))

ax.add_patch(FancyBboxPatch((2.25, 1.25), 0.65, 1.05, boxstyle="round,pad=0,rounding_size=0.20",
                             facecolor='#456052', edgecolor='#3A4E40', linewidth=1.3, zorder=3.8))
ax.add_patch(FancyBboxPatch((5.05, 1.25), 0.65, 1.05, boxstyle="round,pad=0,rounding_size=0.20",
                             facecolor='#456052', edgecolor='#3A4E40', linewidth=1.3, zorder=3.8))
ax.add_patch(Ellipse((2.575, 2.32), 0.5, 0.16, facecolor='#5C7A66', edgecolor='none', zorder=3.85))
ax.add_patch(Ellipse((5.375, 2.32), 0.5, 0.16, facecolor='#5C7A66', edgecolor='none', zorder=3.85))

ax.add_patch(FancyBboxPatch((2.70, 0.85), 2.55, 0.85, boxstyle="round,pad=0,rounding_size=0.22",
                             facecolor='#6C8C77', edgecolor='#3A4E40', linewidth=1.3, zorder=3.9))
for tx in np.linspace(3.1, 4.9, 4):
    ax.add_line(Line2D([tx, tx], [0.95, 1.55], color='#3A4E40', linewidth=1, alpha=0.4, zorder=3.95))

# ======================================================================
# GRANDMOTHER — sitting alone, gaze turned toward the TV
# ======================================================================
head_c = (4.15, 3.55)
head_r = 0.48

ax.add_patch(Polygon([(3.55, 1.05), (3.75, 1.05), (3.85, 0.55), (3.55, 0.55)],
                      closed=True, facecolor='#EAD3B0', edgecolor='#C9A876', linewidth=1, zorder=6.0))
ax.add_patch(Polygon([(4.15, 1.05), (4.35, 1.05), (4.35, 0.55), (4.15, 0.55)],
                      closed=True, facecolor='#EAD3B0', edgecolor='#C9A876', linewidth=1, zorder=6.0))
ax.add_patch(Ellipse((3.68, 0.50), 0.34, 0.16, facecolor='#C9707A', edgecolor='#8C4A54', zorder=6.05))
ax.add_patch(Ellipse((4.28, 0.50), 0.34, 0.16, facecolor='#C9707A', edgecolor='#8C4A54', zorder=6.05))

torso = FancyBboxPatch((3.35, 1.55), 1.35, 1.35, boxstyle="round,pad=0,rounding_size=0.35",
                        facecolor='#C98C8C', edgecolor='#9E6666', linewidth=1.3, zorder=6.1)
ax.add_patch(torso)
ax.add_line(Line2D([4.03, 4.03], [1.6, 2.85], color='#9E6666', linewidth=1.2, alpha=0.7, zorder=6.15))
for by in (2.0, 2.3, 2.6):
    ax.add_patch(Circle((4.03, by), 0.03, facecolor='#7A4A4A', zorder=6.2))

ax.add_patch(FancyBboxPatch((2.75, 1.75), 0.42, 1.05, boxstyle="round,pad=0,rounding_size=0.18",
                             facecolor='#C07E7E', edgecolor='#9E6666', linewidth=1.1, zorder=6.05))
ax.add_patch(Circle((2.85, 1.80), 0.16, facecolor='#EAD3B0', edgecolor='#C9A876', linewidth=1, zorder=6.2))

ax.add_patch(FancyBboxPatch((4.85, 1.75), 0.42, 1.05, boxstyle="round,pad=0,rounding_size=0.18",
                             facecolor='#C07E7E', edgecolor='#9E6666', linewidth=1.1, zorder=6.05))
hand_r = (5.28, 1.80)
ax.add_patch(Circle(hand_r, 0.16, facecolor='#EAD3B0', edgecolor='#C9A876', linewidth=1, zorder=6.2))
ax.add_patch(FancyBboxPatch((hand_r[0] - 0.02, hand_r[1] - 0.06), 0.42, 0.14,
                             boxstyle="round,pad=0,rounding_size=0.03",
                             facecolor='#2B2B2E', edgecolor='#111114', linewidth=0.8, zorder=6.25))
ax.add_patch(Circle((hand_r[0] + 0.36, hand_r[1] + 0.005), 0.015, facecolor='#8FB8E0', zorder=6.3))

blanket_pts = [(3.25, 1.7), (4.85, 1.7), (4.6, 0.95), (3.5, 0.95)]
blanket = Polygon(blanket_pts, closed=True, facecolor='#D9A441', edgecolor='#8B5E34',
                   linewidth=1.3, zorder=6.35)
ax.add_patch(blanket)
for bx in np.arange(3.3, 4.85, 0.22):
    ln = Line2D([bx, bx - 0.1], [1.75, 0.9], color='#F2E4C4', linewidth=1.1, alpha=0.65, zorder=6.4)
    ln.set_clip_path(blanket)
    ax.add_line(ln)
for by in np.arange(1.0, 1.7, 0.18):
    ln = Line2D([3.2, 4.9], [by, by], color='#8B5E34', linewidth=0.9, alpha=0.5, zorder=6.4)
    ln.set_clip_path(blanket)
    ax.add_line(ln)

ax.add_patch(Rectangle((4.0, 2.95), 0.22, 0.18, facecolor='#EAD3B0', edgecolor='none', zorder=6.4))

ax.add_patch(Circle((head_c[0] - 0.08, head_c[1] + 0.06), head_r + 0.06, facecolor='#E4E0DC',
                     edgecolor='none', zorder=6.45))
ax.add_patch(Circle((head_c[0] - 0.42, head_c[1] + 0.30), 0.20, facecolor='#DCD6D0',
                     edgecolor='#C9C2BB', linewidth=1, zorder=6.9))

ax.add_patch(Circle(head_c, head_r, facecolor='#EAD3B0', edgecolor='#C9A876', linewidth=1, zorder=6.5))
ax.add_patch(Ellipse((head_c[0] - 0.42, head_c[1] - 0.02), 0.12, 0.20, facecolor='#EAD3B0',
                      edgecolor='#C9A876', linewidth=1, zorder=6.48))

ax.add_patch(Polygon([(head_c[0] - 0.45, head_c[1] + 0.28), (head_c[0] + 0.30, head_c[1] + 0.35),
                       (head_c[0] + 0.20, head_c[1] + 0.10), (head_c[0] - 0.35, head_c[1] + 0.08)],
                      closed=True, facecolor='#E4E0DC', edgecolor='none', zorder=6.55))

eye_c = (head_c[0] + 0.20, head_c[1] + 0.06)
ax.add_patch(Circle(eye_c, 0.045, facecolor='#3A2A1E', zorder=6.7))
ax.add_patch(Arc(eye_c, 0.28, 0.22, angle=0, theta1=15, theta2=165, color='#3A2A1E',
                  linewidth=1.3, zorder=6.7))
ax.add_patch(Arc((eye_c[0], eye_c[1] + 0.12), 0.22, 0.10, angle=0, theta1=20, theta2=160,
                  color='#B7AFA6', linewidth=1.5, zorder=6.7))
ax.add_patch(Circle(eye_c, 0.14, facecolor='none', edgecolor='#4A3221', linewidth=1.4, zorder=6.75))
ax.add_line(Line2D([eye_c[0] + 0.14, head_c[0] + 0.44], [eye_c[1], eye_c[1] - 0.02],
                    color='#4A3221', linewidth=1.2, zorder=6.75))
ax.add_line(Line2D([eye_c[0] - 0.14, head_c[0] - 0.42], [eye_c[1], eye_c[1] + 0.02],
                    color='#4A3221', linewidth=1.2, zorder=6.75))

ax.add_patch(Polygon([(head_c[0] + 0.40, head_c[1] - 0.02), (head_c[0] + 0.46, head_c[1] - 0.14),
                       (head_c[0] + 0.34, head_c[1] - 0.14)], closed=True,
                      facecolor='#DDBB93', edgecolor='#C9A876', linewidth=0.8, zorder=6.68))
ax.add_patch(Arc((head_c[0] + 0.20, head_c[1] - 0.24), 0.22, 0.14, angle=0, theta1=200, theta2=340,
                  color='#9E6666', linewidth=1.6, zorder=6.7))
ax.add_patch(Ellipse((head_c[0] + 0.28, head_c[1] - 0.14), 0.14, 0.09, facecolor='#E8A9A0',
                      alpha=0.5, edgecolor='none', zorder=6.68))
ax.add_patch(Ellipse((head_c[0] + 0.38, head_c[1] - 0.02), 0.22, 0.30, facecolor='#8FB8E0',
                      alpha=0.18, edgecolor='none', zorder=6.85))

# faint gaze cue toward the TV screen (kept subtle, ducks behind the TV bezel)
tv_target = (10.0, 4.35)
gaze = Line2D([eye_c[0] + 0.16, tv_target[0]], [eye_c[1], tv_target[1]],
              color='#FFD37A', linewidth=1.1, alpha=0.30, linestyle=(0, (2, 4)), zorder=4.9)
ax.add_line(gaze)

# ======================================================================
# AMBIENT WARM OVERLAY
# ======================================================================
ax.add_patch(Rectangle((0, 0), 12, 9, facecolor='#FF9A4A', alpha=0.035, zorder=9))

fig.savefig(output_path, facecolor=fig.get_facecolor(), dpi=100)
plt.close(fig)
