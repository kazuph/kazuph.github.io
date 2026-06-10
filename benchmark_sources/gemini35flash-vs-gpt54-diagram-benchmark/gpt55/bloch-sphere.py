import sys
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch

theta = math.radians(55)
phi = math.radians(42)

out_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_aspect("equal")
ax.axis("off")

R = 1.0
px, py = -0.55, -0.33

def project(x, y, z):
    return x + px * y, z + py * y

def curve(points, **kwargs):
    xs, ys = zip(*(project(*p) for p in points))
    ax.plot(xs, ys, **kwargs)

def arrow(start, end, **kwargs):
    ax.add_patch(
        FancyArrowPatch(
            project(*start),
            project(*end),
            arrowstyle="-|>",
            mutation_scale=18,
            linewidth=kwargs.pop("linewidth", 2.0),
            color=kwargs.pop("color", "black"),
            shrinkA=0,
            shrinkB=0,
            **kwargs,
        )
    )

def label(text, point, dx=0, dy=0, size=20):
    x, y = project(*point)
    ax.text(
        x + dx,
        y + dy,
        text,
        ha="center",
        va="center",
        fontsize=size,
        family="serif",
    )

ts = [2 * math.pi * i / 360 for i in range(361)]

ax.add_patch(Circle((0, 0), R, fill=False, linewidth=2.2, color="black"))

curve([(math.cos(t), math.sin(t), 0) for t in ts],
      color="black", linewidth=1.5, linestyle=(0, (6, 5)), alpha=0.65)

curve([(math.sin(t), 0, math.cos(t)) for t in ts],
      color="black", linewidth=1.2, alpha=0.25)

curve([(0, math.sin(t), math.cos(t)) for t in ts],
      color="black", linewidth=1.2, alpha=0.25)

arrow((-1.12, 0, 0), (1.16, 0, 0), linewidth=1.8)
arrow((0, -1.12, 0), (0, 1.16, 0), linewidth=1.8)
arrow((0, 0, -1.12), (0, 0, 1.16), linewidth=1.8)

label(r"$x$", (1.24, 0, 0), dy=-0.03)
label(r"$y$", (0, 1.24, 0), dx=-0.02, dy=-0.03)
label(r"$z$", (0, 0, 1.24), dy=0.03)

vx = math.sin(theta) * math.cos(phi)
vy = math.sin(theta) * math.sin(phi)
vz = math.cos(theta)

curve([(0, 0, 0), (vx, vy, 0)],
      color="black", linewidth=1.2, linestyle=(0, (4, 4)), alpha=0.55)

curve([(vx, vy, 0), (vx, vy, vz)],
      color="black", linewidth=1.2, linestyle=(0, (4, 4)), alpha=0.55)

arrow((0, 0, 0), (vx, vy, vz), linewidth=3.0, color="#1f5fbf")
label(r"$|\psi\rangle$", (vx, vy, vz), dx=0.18, dy=0.07, size=22)

arc_phi = [
    (0.28 * math.cos(a), 0.28 * math.sin(a), 0)
    for a in [phi * i / 80 for i in range(81)]
]
curve(arc_phi, color="#9b2c2c", linewidth=2.0)
label(r"$\phi$", (0.36 * math.cos(phi / 2), 0.36 * math.sin(phi / 2), 0),
      dx=0.03, dy=-0.04, size=19)

arc_theta = [
    (
        0.34 * math.sin(a) * math.cos(phi),
        0.34 * math.sin(a) * math.sin(phi),
        0.34 * math.cos(a),
    )
    for a in [theta * i / 80 for i in range(81)]
]
curve(arc_theta, color="#9b2c2c", linewidth=2.0)
label(
    r"$\theta$",
    (
        0.43 * math.sin(theta / 2) * math.cos(phi),
        0.43 * math.sin(theta / 2) * math.sin(phi),
        0.43 * math.cos(theta / 2),
    ),
    dx=0.04,
    dy=0.03,
    size=19,
)

ax.set_xlim(-1.65, 1.65)
ax.set_ylim(-1.25, 1.45)
plt.savefig(out_path, bbox_inches="tight", pad_inches=0.25)
plt.close(fig)
