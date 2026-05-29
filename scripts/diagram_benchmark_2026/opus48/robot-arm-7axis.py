import sys

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Polygon, Arc

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#f4f6f8")

BASE = "#4a5568"
LINK = "#f2a53a"
LINKD = "#d88a22"
JOINT = "#2c5282"
JOINTL = "#4a7bc0"
ROT = "#c0392b"
LBL = "#1f2933"
FLOOR = "#d9dee4"


def link_bar(p0, p1, width=0.42, color=LINK):
    p0 = np.array(p0, float)
    p1 = np.array(p1, float)
    d = p1 - p0
    n = np.array([-d[1], d[0]])
    n = n / np.hypot(*n) * width
    poly = [p0 + n, p1 + n, p1 - n, p0 - n]
    ax.add_patch(Polygon(poly, closed=True, facecolor=color, edgecolor=LINKD, lw=2, zorder=2))


# floor + base (slight 3D)
ax.add_patch(Polygon([(3.0, 0.9), (8.6, 0.9), (9.4, 1.6), (3.8, 1.6)], color=FLOOR, zorder=0))
ax.add_patch(Polygon([(4.6, 1.3), (7.0, 1.3), (7.6, 1.7), (5.2, 1.7)], color="#5a6677", zorder=1))
ax.add_patch(Polygon([(4.6, 1.3), (7.0, 1.3), (7.0, 2.4), (4.6, 2.4)], color=BASE, zorder=1))
ax.add_patch(Polygon([(7.0, 1.3), (7.6, 1.7), (7.6, 2.8), (7.0, 2.4)], color="#3a4452", zorder=1))

# joint chain coordinates
J = {
    "J1": (5.9, 2.5),
    "J2": (5.9, 4.2),
    "J3": (4.6, 6.1),
    "J4": (5.6, 7.4),
    "J5": (6.7, 8.0),
    "J6": (7.5, 8.05),
    "J7": (8.1, 8.05),
}
order = ["J1", "J2", "J3", "J4", "J5", "J6", "J7"]
for a, b in zip(order, order[1:]):
    link_bar(J[a], J[b])

# gripper
ax.add_patch(FancyArrowPatch((8.1, 8.05), (8.7, 8.4), arrowstyle="-", color=BASE, lw=5))
ax.add_patch(FancyArrowPatch((8.1, 8.05), (8.7, 7.7), arrowstyle="-", color=BASE, lw=5))

# joints
align = {"J1": ("below", 0, -0.5), "J2": ("left", -0.5, 0), "J3": ("left", -0.55, 0),
         "J4": ("upper", -0.45, 0.45), "J5": ("above", 0, 0.5), "J6": ("above", 0, 0.5),
         "J7": ("right", 0.5, 0.1)}
for name, (x, y) in J.items():
    ax.add_patch(Circle((x, y), 0.34, color=JOINT, zorder=4))
    ax.add_patch(Circle((x, y), 0.17, color=JOINTL, zorder=5))
    _, dx, dy = align[name]
    ax.text(x + dx, y + dy, name, fontsize=12, fontweight="bold", color=LBL,
            ha="center", va="center", zorder=6)

# rotation arcs on a few joints
for (x, y), (t1, t2) in [((5.9, 2.5), (20, 200)), ((5.9, 4.2), (-30, 150)),
                          ((4.6, 6.1), (40, 230)), ((6.7, 8.0), (10, 200))]:
    arc = Arc((x, y), 1.25, 1.25, angle=0, theta1=t1, theta2=t2, color=ROT, lw=2.5, zorder=5)
    ax.add_patch(arc)
    aa = np.deg2rad(t2)
    ax.add_patch(FancyArrowPatch((x + 0.62 * np.cos(aa - 0.12), y + 0.62 * np.sin(aa - 0.12)),
                                 (x + 0.62 * np.cos(aa), y + 0.62 * np.sin(aa)),
                                 arrowstyle="-|>", mutation_scale=12, color=ROT, zorder=5))

# title (upper-left, away from the arm) + legend (lower-left) + base label
ax.text(2.6, 8.6, "7-Axis Robot Arm", ha="center", fontsize=17, fontweight="bold", color=LBL)
ax.add_patch(Circle((0.9, 2.6), 0.16, color=JOINT))
ax.text(1.15, 2.6, "Joint (J1–J7)", va="center", fontsize=11, color=LBL)
ax.add_patch(Polygon([(0.74, 2.0), (1.06, 2.0), (1.06, 2.2), (0.74, 2.2)], color=LINK))
ax.text(1.15, 2.1, "Link", va="center", fontsize=11, color=LBL)
ax.add_patch(Arc((0.9, 1.55), 0.4, 0.4, theta1=0, theta2=180, color=ROT, lw=2.5))
ax.text(1.15, 1.55, "Rotation", va="center", fontsize=11, color=LBL)
ax.text(6.1, 1.2, "Base", ha="center", va="top", fontsize=11, color="white")

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
