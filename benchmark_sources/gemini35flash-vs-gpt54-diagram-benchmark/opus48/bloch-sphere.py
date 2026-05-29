import sys

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyArrowPatch, Arc

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#fbfcfe")

AXIS = "#475569"
EQ = "#94a3b8"
VEC = "#2563eb"
TH = "#dc2626"
PH = "#059669"
LBL = "#1e293b"

O = np.array([6.0, 4.3])
R = 3.2

# sphere with radial shading
for i in range(60, 0, -1):
    r = R * i / 60
    shade = 0.78 + 0.22 * (i / 60)
    ax.add_patch(Circle(O, r, color=(0.86 * shade, 0.91 * shade, 0.97 * shade), zorder=1))
ax.add_patch(Circle(O, R, fill=False, edgecolor=AXIS, lw=1.5, alpha=0.4, zorder=2))

# equator
ax.add_patch(Ellipse(O, 2 * R, 2 * R * 0.36, fill=False, edgecolor=EQ, lw=1.5, zorder=3))
th = np.linspace(np.pi, 2 * np.pi, 50)
ax.plot(O[0] + R * np.cos(th), O[1] + R * 0.36 * np.sin(th), color=EQ, lw=1.2, ls="--", zorder=3)


def arr(p0, p1, color, lw=2.5):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=18,
                 color=color, lw=lw, zorder=5))


# axes
arr(O, O + np.array([0, R + 0.9]), AXIS)
ax.text(O[0] + 0.15, O[1] + R + 1.0, "z", fontsize=18, color=LBL)
arr(O, O + np.array([R + 0.9, -0.15]), AXIS)
ax.text(O[0] + R + 1.0, O[1] - 0.2, "y", fontsize=18, color=LBL)
arr(O, O + np.array([-0.62 * R, -0.66 * R]), AXIS)
ax.text(O[0] - 0.62 * R - 0.3, O[1] - 0.66 * R - 0.4, "x", fontsize=18, color=LBL)
ax.plot([O[0], O[0]], [O[1], O[1] - R], color=AXIS, lw=1.5, alpha=0.6, zorder=4)

# poles
ax.text(O[0] + 0.2, O[1] + R + 0.1, r"$|0\rangle$", fontsize=15, color=LBL, zorder=6)
ax.text(O[0] + 0.2, O[1] - R - 0.45, r"$|1\rangle$", fontsize=15, color=LBL, zorder=6)

# state vector
P = O + np.array([1.55, 2.05])
arr(O, P, VEC, lw=3)
ax.add_patch(Circle(P, 0.08, color=VEC, zorder=6))
ax.text(P[0] + 0.15, P[1] + 0.15, r"$|\psi\rangle$", fontsize=16, color=VEC, zorder=6)
# projection
Pp = O + np.array([1.55, 0.46])
ax.plot([P[0], Pp[0]], [P[1], Pp[1]], color=VEC, ls="--", lw=1.2, alpha=0.6, zorder=5)
ax.plot([O[0], Pp[0]], [O[1], Pp[1]], color=PH, ls="--", lw=1.2, alpha=0.7, zorder=5)

# theta arc
ax.add_patch(Arc(O, 3.0, 3.0, angle=0, theta1=53, theta2=90, color=TH, lw=2.5, zorder=6))
ax.text(O[0] + 0.5, O[1] + 1.75, r"$\theta$", fontsize=16, color=TH, zorder=6)
# phi arc
ax.add_patch(Arc(O, 2.2, 2.2 * 0.36, angle=0, theta1=-6, theta2=18, color=PH, lw=2.5, zorder=6))
ax.text(O[0] + 1.45, O[1] + 0.2, r"$\phi$", fontsize=16, color=PH, zorder=6)

ax.text(6, 8.6, "Bloch Sphere", ha="center", fontsize=18, fontweight="bold", color=LBL)

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
