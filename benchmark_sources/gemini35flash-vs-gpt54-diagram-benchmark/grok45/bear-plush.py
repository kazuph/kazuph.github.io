import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, Polygon, FancyBboxPatch, Arc

output_path = sys.argv[1]

BG = "#FBEFDD"
GLOW = "#FDF6EA"
SHADOW = "#D8B98C"
FUR = "#D9A067"
FUR_DARK = "#C68B52"
FUR_LIGHT = "#F4DDB4"
OUTLINE = "#8A5A32"
EYE = "#4A2E1E"
NOSE = "#5C3A21"
BADGE = "#E8785A"
BADGE_EDGE = "#C85A3E"
STAR = "#FDF6EA"
BLUSH = "#F0AA96"

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(BG)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.subplots_adjust(left=0, right=1, top=1, bottom=0)

ax.add_patch(Circle((6.0, 4.3), 3.9, facecolor=GLOW, edgecolor="none", zorder=0))
ax.add_patch(Ellipse((6.0, 0.7), 5.2, 0.85, facecolor=SHADOW, edgecolor="none", alpha=0.45, zorder=0.5))


def oval(c, w, h, fc, z, lw=2.2, ec=OUTLINE):
    ax.add_patch(Ellipse(c, w, h, facecolor=fc, edgecolor=ec, lw=lw, zorder=z))


# legs
oval((4.3, 1.45), 1.9, 1.75, FUR_DARK, 1)
oval((7.7, 1.45), 1.9, 1.75, FUR_DARK, 1)
oval((4.3, 1.05), 1.05, 0.75, FUR_LIGHT, 2, lw=1.6)
oval((7.7, 1.05), 1.05, 0.75, FUR_LIGHT, 2, lw=1.6)
for x0 in (4.3, 7.7):
    for dx, dy in ((-0.22, -0.05), (0.0, -0.18), (0.22, -0.05)):
        ax.add_patch(Circle((x0 + dx, 1.0 + dy), 0.12, facecolor=FUR, edgecolor="none", zorder=3))

# arms
oval((3.0, 3.3), 1.55, 2.1, FUR_DARK, 1)
oval((9.0, 3.3), 1.55, 2.1, FUR_DARK, 1)
oval((3.0, 2.5), 0.85, 0.7, FUR_LIGHT, 2, lw=1.6)
oval((9.0, 2.5), 0.85, 0.7, FUR_LIGHT, 2, lw=1.6)
for x0 in (3.0, 9.0):
    for dx, dy in ((-0.18, -0.04), (0.0, -0.15), (0.18, -0.04)):
        ax.add_patch(Circle((x0 + dx, 2.45 + dy), 0.1, facecolor=FUR, edgecolor="none", zorder=3))

# body
oval((6.0, 2.9), 3.9, 3.5, FUR, 4)
ax.add_patch(Circle((6.0, 3.0), 0.95, facecolor=BADGE, edgecolor=BADGE_EDGE, lw=2.0, zorder=5))
star = []
for i in range(10):
    r = 0.42 if i % 2 == 0 else 0.18
    a = np.deg2rad(90 + i * 36)
    star.append((6.0 + r * np.cos(a), 3.0 + r * np.sin(a)))
ax.add_patch(Polygon(star, closed=True, facecolor=STAR, edgecolor="none", zorder=6))

# head + ears
oval((6.0, 5.6), 3.35, 3.35, FUR, 7)
ax.add_patch(Circle((4.55, 7.0), 0.62, facecolor=FUR_DARK, edgecolor=OUTLINE, lw=2.2, zorder=6))
ax.add_patch(Circle((7.45, 7.0), 0.62, facecolor=FUR_DARK, edgecolor=OUTLINE, lw=2.2, zorder=6))
ax.add_patch(Circle((4.55, 7.0), 0.34, facecolor=FUR_LIGHT, edgecolor="none", zorder=7))
ax.add_patch(Circle((7.45, 7.0), 0.34, facecolor=FUR_LIGHT, edgecolor="none", zorder=7))

# face
oval((6.0, 5.0), 1.55, 1.15, FUR_LIGHT, 8, lw=1.6)
ax.add_patch(Circle((5.45, 5.75), 0.16, facecolor=EYE, edgecolor="none", zorder=9))
ax.add_patch(Circle((6.55, 5.75), 0.16, facecolor=EYE, edgecolor="none", zorder=9))
ax.add_patch(Circle((5.40, 5.80), 0.05, facecolor="white", edgecolor="none", zorder=10))
ax.add_patch(Circle((6.50, 5.80), 0.05, facecolor="white", edgecolor="none", zorder=10))
oval((6.0, 5.15), 0.44, 0.32, NOSE, 9, lw=0, ec="none")
ax.plot([6.0, 6.0], [5.0, 4.78], color=NOSE, lw=2.2, zorder=9)
ax.plot([6.0, 5.48], [4.78, 4.88], color=NOSE, lw=2.2, zorder=9,
        solid_capstyle="round")
ax.plot([6.0, 6.52], [4.78, 4.88], color=NOSE, lw=2.2, zorder=9,
        solid_capstyle="round")
# smile curves
theta = np.linspace(np.deg2rad(200), np.deg2rad(250), 40)
ax.plot(6.0 + 0.55 * np.cos(theta), 5.05 + 0.42 * np.sin(theta), color=NOSE, lw=2.0, zorder=9)
theta = np.linspace(np.deg2rad(290), np.deg2rad(340), 40)
ax.plot(6.0 + 0.55 * np.cos(theta), 5.05 + 0.42 * np.sin(theta), color=NOSE, lw=2.0, zorder=9)

ax.add_patch(Circle((5.05, 5.35), 0.18, facecolor=BLUSH, edgecolor="none", alpha=0.55, zorder=8))
ax.add_patch(Circle((6.95, 5.35), 0.18, facecolor=BLUSH, edgecolor="none", alpha=0.55, zorder=8))

# stitching accent on belly
ax.add_patch(Arc((6.0, 3.9), 1.8, 0.7, angle=0, theta1=200, theta2=340,
                  edgecolor=OUTLINE, lw=1.4, linestyle=(0, (2, 2)), zorder=5))

fig.savefig(output_path, dpi=100, facecolor=fig.get_facecolor())
plt.close(fig)
