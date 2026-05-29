import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle, FancyArrowPatch

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")

WALL = "#f6e9d4"
FLOOR = "#c79a6b"
FLOORD = "#b5875a"
SOFA = "#c56b5a"
SOFAD = "#a9543f"
TV = "#2c3033"
TVSC = "#6fc3d6"
WOOD = "#9c6b3f"
SKIN = "#f0c9a6"
HAIR = "#e8e8ea"
CLOTH = "#7e8fb0"
WARM = "#f4b85e"
CURT = "#d98e73"

ax.add_patch(Rectangle((0, 0), 12, 9, color=WALL))
ax.add_patch(Rectangle((0, 0), 12, 2.6, color=FLOOR))
ax.plot([0, 12], [2.6, 2.6], color=FLOORD, lw=2)

# window + curtains
ax.add_patch(Rectangle((0.8, 4.2), 2.6, 3.4, color="#eadbc0"))
ax.add_patch(Rectangle((1.0, 4.4), 2.2, 3.0, color=TVSC, alpha=0.4))
ax.plot([2.1, 2.1], [4.4, 7.4], color="#eadbc0", lw=3)
ax.add_patch(Polygon([(0.7, 4.0), (1.4, 4.0), (1.2, 7.8), (0.6, 7.8)], color=CURT))
ax.add_patch(Polygon([(3.5, 4.0), (2.8, 4.0), (3.0, 7.8), (3.6, 7.8)], color=CURT))

# ceiling lamp
ax.plot([8.6, 8.6], [9.0, 7.7], color=WOOD, lw=3)
ax.add_patch(Polygon([(7.9, 7.0), (9.3, 7.0), (9.0, 7.7), (8.2, 7.7)], color=WARM))
ax.add_patch(Ellipse((8.6, 6.95), 3.2, 1.0, color=WARM, alpha=0.3))

# TV cabinet + tv
ax.add_patch(Rectangle((8.4, 2.6), 3.2, 1.1, color=WOOD))
ax.add_patch(Rectangle((8.7, 3.7), 2.8, 2.7, color=TV))
ax.add_patch(Rectangle((8.95, 3.95), 2.3, 2.2, color=TVSC))
ax.add_patch(Rectangle((9.2, 4.2), 0.8, 1.7, color=TVSC, alpha=0.6))

# coffee table
ax.add_patch(Rectangle((4.6, 2.0), 2.6, 0.7, color=WOOD))
ax.add_patch(Rectangle((4.7, 1.3), 0.25, 0.7, color=FLOORD))
ax.add_patch(Rectangle((6.85, 1.3), 0.25, 0.7, color=FLOORD))
ax.add_patch(Ellipse((5.5, 2.78), 0.6, 0.22, color=WARM))

# sofa
ax.add_patch(Rectangle((1.6, 2.6), 3.6, 2.6, color=SOFAD))
ax.add_patch(Rectangle((1.6, 2.6), 3.6, 1.7, color=SOFA))
ax.add_patch(Rectangle((1.4, 2.6), 0.5, 2.1, color=SOFAD))
ax.add_patch(Rectangle((4.9, 2.6), 0.5, 2.1, color=SOFAD))

# grandma
ax.add_patch(Polygon([(2.9, 2.9), (2.5, 4.2), (3.05, 4.9), (3.9, 4.6), (3.9, 2.9)], color=CLOTH))
ax.add_patch(Circle((3.6, 5.3), 0.52, color=SKIN))
ax.add_patch(Ellipse((3.6, 5.6), 1.2, 0.84, color=HAIR))
ax.add_patch(Ellipse((3.18, 5.3), 0.32, 0.6, color=HAIR))
ax.add_patch(Ellipse((4.02, 5.3), 0.32, 0.6, color=HAIR))
ax.add_patch(Circle((3.78, 5.32), 0.05, color=TV))
ax.plot([3.7, 3.86, 4.02], [5.1, 5.0, 5.16], color=TV, lw=2)
ax.add_patch(Ellipse((3.95, 4.0), 1.0, 0.44, color=CLOTH))
ax.add_patch(Ellipse((3.3, 2.6), 0.6, 0.36, color=SKIN))
ax.add_patch(Ellipse((4.0, 2.6), 0.6, 0.36, color=SKIN))

# gaze toward TV
ax.add_patch(FancyArrowPatch((4.15, 5.3), (9.0, 5.0), arrowstyle="-|>",
                             mutation_scale=18, color=SOFAD, ls=(0, (4, 3)), lw=1.5))

# rug
ax.add_patch(Ellipse((3.6, 1.2), 5.6, 1.0, color=CURT, alpha=0.5))

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=WALL)
