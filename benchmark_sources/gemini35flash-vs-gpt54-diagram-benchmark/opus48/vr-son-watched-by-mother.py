import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle, FancyArrowPatch

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")

WALL = "#dcebf2"
FLOOR = "#d9c3a5"
FLOORD = "#c6ac88"
BED = "#e89bb0"
BEDD = "#d07a93"
SHELF = "#b0805a"
DESK = "#9c6b45"
SKIN = "#f1c7a1"
SON = "#4fa0c9"
MOM = "#c76b86"
VR = "#2d3440"
VRGLOW = "#55d6c2"
HAIR = "#42332a"

ax.add_patch(Rectangle((0, 0), 12, 9, color=WALL))
ax.add_patch(Rectangle((0, 0), 12, 2.4, color=FLOOR))
ax.plot([0, 12], [2.4, 2.4], color=FLOORD, lw=2)

# door (right)
ax.add_patch(Rectangle((10.0, 2.4), 2.0, 5.8, color=DESK, alpha=0.7))
ax.add_patch(Rectangle((10.3, 2.4), 1.6, 5.6, color=WALL, alpha=0.85))
ax.add_patch(Circle((10.55, 5.2), 0.1, color=DESK))

# shelf + toys (left)
ax.add_patch(Rectangle((0.6, 5.0), 2.8, 0.3, color=SHELF))
ax.add_patch(Rectangle((0.6, 6.2), 2.8, 0.3, color=SHELF))
ax.add_patch(Rectangle((1.0, 5.3), 0.5, 0.9, color=BEDD))
ax.add_patch(Rectangle((1.8, 5.3), 0.5, 0.9, color=SON))
ax.add_patch(Rectangle((2.6, 5.3), 0.5, 0.9, color=FLOORD))

# bed (left-front)
ax.add_patch(Rectangle((0.4, 2.4), 3.2, 1.9, color=BEDD))
ax.add_patch(Rectangle((0.4, 3.6), 3.2, 0.7, color=BED))
ax.add_patch(Rectangle((0.6, 3.7), 0.9, 0.45, color="white"))

# desk
ax.add_patch(Rectangle((4.4, 3.0), 2.6, 0.3, color=DESK))
ax.add_patch(Rectangle((4.5, 2.4), 0.25, 0.6, color=DESK))
ax.add_patch(Rectangle((6.65, 2.4), 0.25, 0.6, color=DESK))
ax.add_patch(Rectangle((6.0, 3.3), 0.7, 0.6, color=VR))
ax.add_patch(Rectangle((6.1, 3.4), 0.5, 0.4, color=VRGLOW))

# son body
ax.add_patch(Polygon([(5.2, 2.7), (4.85, 4.0), (5.4, 4.9), (6.2, 4.4), (6.0, 2.7)], color=SON))
ax.add_patch(Circle((5.6, 5.4), 0.5, color=SKIN))
ax.add_patch(Ellipse((5.6, 5.72), 1.12, 0.68, color=HAIR))
# VR goggles
ax.add_patch(Rectangle((5.05, 5.35), 1.1, 0.3, color=VR))
ax.add_patch(Rectangle((5.15, 5.42), 0.4, 0.16, color=VRGLOW))
ax.add_patch(Rectangle((5.65, 5.42), 0.4, 0.16, color=VRGLOW))
ax.plot([5.05, 4.8, 4.95], [5.5, 5.7, 5.85], color=VR, lw=4)
# arms + controllers
ax.add_patch(Polygon([(5.0, 4.6), (4.2, 5.5), (4.5, 5.75), (5.3, 4.85)], color=SON))
ax.add_patch(Polygon([(6.1, 4.6), (6.95, 5.5), (6.65, 5.75), (5.85, 4.85)], color=SON))
ax.add_patch(Circle((4.25, 5.55), 0.22, color=VR))
ax.add_patch(Circle((6.9, 5.55), 0.22, color=VR))
# legs in motion
ax.add_patch(Polygon([(5.35, 2.7), (5.05, 1.4), (5.45, 1.4), (5.65, 2.7)], color="#3a4250"))
ax.add_patch(Polygon([(5.9, 2.7), (6.3, 1.5), (6.7, 1.6), (6.2, 2.7)], color="#3a4250"))
ax.add_patch(Ellipse((4.9, 1.25), 0.64, 0.32, color="white"))
ax.add_patch(Ellipse((6.4, 1.35), 0.64, 0.32, color="white"))

# mother (right doorway)
ax.add_patch(Polygon([(10.7, 2.4), (10.4, 4.0), (10.9, 5.0), (11.6, 4.2), (11.3, 2.4)], color=MOM))
ax.add_patch(Circle((11.1, 5.5), 0.5, color=SKIN))
ax.add_patch(Ellipse((11.1, 5.85), 1.2, 1.0, color=HAIR))
ax.add_patch(Ellipse((10.62, 5.5), 0.36, 1.1, color=HAIR))
ax.add_patch(Circle((10.86, 5.5), 0.05, color=VR))
ax.plot([10.72, 10.86, 11.0], [5.3, 5.22, 5.32], color=VR, lw=2)

# gaze line mother -> son
ax.add_patch(FancyArrowPatch((10.6, 5.5), (6.3, 5.5), arrowstyle="-|>",
                             mutation_scale=20, color=MOM, ls=(0, (4, 3)), lw=2))
# son attention forward (play)
ax.add_patch(FancyArrowPatch((5.05, 5.5), (3.0, 5.6), arrowstyle="-|>",
                             mutation_scale=14, color=SON, ls=(0, (3, 3)), lw=1.5))

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=WALL)
