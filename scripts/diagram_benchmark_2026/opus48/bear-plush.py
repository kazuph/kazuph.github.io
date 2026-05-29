import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, PathPatch
from matplotlib.path import Path

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#fff6ec")
ax.set_facecolor("#fff6ec")

FUR = "#cb9367"
FURDK = "#b67c51"
FURLT = "#e3bd98"
MUZZLE = "#f1dec8"
BELLY = "#f4e6d5"
PAW = "#f0dac1"
NOSE = "#4a332a"
PATCH = "#f2a65a"
RIBBON = "#e27d9a"
SHADOW = "#eedcc8"

# ground shadow
ax.add_patch(Ellipse((6, 1.0), 6.0, 0.7, color=SHADOW, zorder=0))

# ears
for sx in (-1, 1):
    ax.add_patch(Circle((6 + sx * 1.55, 7.95), 0.95, color=FURDK, zorder=1))
    ax.add_patch(Circle((6 + sx * 1.55, 7.95), 0.5, color=FURLT, zorder=2))

# body
ax.add_patch(Ellipse((6, 3.7), 5.1, 4.9, color=FUR, zorder=2))
ax.add_patch(Ellipse((6, 3.35), 3.1, 3.4, color=BELLY, zorder=3))

# arms + paws
for sx in (-1, 1):
    ax.add_patch(Ellipse((6 + sx * 2.45, 4.4), 1.7, 2.3, color=FUR, zorder=2))
    ax.add_patch(Ellipse((6 + sx * 2.5, 3.65), 1.0, 1.1, color=PAW, zorder=3))

# legs + pads
for sx in (-1, 1):
    ax.add_patch(Ellipse((6 + sx * 1.25, 1.55), 2.1, 1.9, color=FUR, zorder=2))
    ax.add_patch(Ellipse((6 + sx * 1.25, 1.4), 1.24, 1.0, color=PAW, zorder=3))
    ax.add_patch(Ellipse((6 + sx * 1.25, 1.4), 0.64, 0.48, color=PATCH, zorder=4))

# chest patch (heart)
ax.add_patch(Circle((6, 4.15), 0.62, color=PATCH, zorder=4))
ax.text(6, 4.12, "♥", ha="center", va="center", fontsize=22, color=NOSE, zorder=5)

# head
ax.add_patch(Circle((6, 7.0), 2.05, color=FUR, zorder=5))
ax.add_patch(Ellipse((6, 6.2), 2.4, 1.9, color=MUZZLE, zorder=6))

# cheeks
for sx in (-1, 1):
    ax.add_patch(Ellipse((6 + sx * 1.15, 6.55), 0.6, 0.4, color=RIBBON, alpha=0.45, zorder=6))

# eyes
for sx in (-1, 1):
    ax.add_patch(Circle((6 + sx * 0.78, 7.25), 0.24, color=NOSE, zorder=7))
    ax.add_patch(Circle((6 + sx * 0.72, 7.36), 0.08, color="white", zorder=8))

# nose
ax.add_patch(Ellipse((6, 6.55), 0.52, 0.4, color=NOSE, zorder=7))
# mouth
mouth = Path(
    [(6, 6.35), (6, 6.05), (5.65, 5.85), (5.3, 6.2),
     (6, 6.05), (6.35, 5.85), (6.7, 6.2)],
    [Path.MOVETO, Path.LINETO, Path.CURVE3, Path.CURVE3,
     Path.MOVETO, Path.CURVE3, Path.CURVE3],
)
ax.add_patch(PathPatch(mouth, fill=False, edgecolor=NOSE, lw=3, zorder=7))

# neck ribbon
ax.add_patch(plt.Polygon([(4.95, 5.35), (5.85, 5.6), (5.85, 4.9)], color=RIBBON, zorder=6))
ax.add_patch(plt.Polygon([(7.05, 5.35), (6.15, 5.6), (6.15, 4.9)], color=RIBBON, zorder=6))
ax.add_patch(Circle((6, 5.25), 0.28, color=RIBBON, zorder=7))

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
