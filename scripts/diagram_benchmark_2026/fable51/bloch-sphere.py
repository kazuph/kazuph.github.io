import math
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Circle, Ellipse, FancyArrowPatch, Rectangle

BG = "#FFFFFF"
SPHERE = "#EAF1F8"
SPHERE_E = "#4A5A6A"
EQ = "#7A8A9A"
AXIS = "#233044"
STATE = "#C0392B"
THETA = "#2A6F97"
PHI = "#2E7D4F"
PROJ = "#8E44AD"


def arrow(ax, p0, p1, color, lw=1.6, ms=15, z=6, ls="-"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=ms, color=color, linewidth=lw,
                                 zorder=z, linestyle=ls, shrinkA=0, shrinkB=0))


def main() -> None:
    out_path = sys.argv[1]
    plt.rcParams["mathtext.fontset"] = "cm"
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-6, -4.5), 12, 9, facecolor=BG, zorder=0))
    ax.text(-5.7, 4.0, "Bloch sphere representation of a qubit", ha="left", va="center", fontsize=16, fontweight="bold", color=AXIS)
    ax.text(-5.7, 3.5, r"$|\psi\rangle = \cos\frac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\frac{\theta}{2}\,|1\rangle$",
            ha="left", va="center", fontsize=13, color=EQ)

    ox, oy, R = -0.6, -0.2, 3.0
    ax.add_patch(Circle((ox, oy), R, facecolor=SPHERE, edgecolor=SPHERE_E, linewidth=1.4, zorder=1))
    # equator: back dashed, front solid
    ax.add_patch(Arc((ox, oy), 2 * R, 1.8, theta1=0, theta2=180, color=EQ, linewidth=1.0, linestyle="--", zorder=2))
    ax.add_patch(Arc((ox, oy), 2 * R, 1.8, theta1=180, theta2=360, color=EQ, linewidth=1.3, zorder=2))
    # meridian
    ax.add_patch(Arc((ox, oy), 1.8, 2 * R, theta1=90, theta2=270, color=EQ, linewidth=0.8, linestyle="--", zorder=2))
    ax.add_patch(Arc((ox, oy), 1.8, 2 * R, theta1=-90, theta2=90, color=EQ, linewidth=0.8, zorder=2))

    # axes
    arrow(ax, (ox, oy), (ox, oy + R + 0.9), AXIS, lw=1.4); ax.text(ox + 0.15, oy + R + 0.85, "$z$", fontsize=13, color=AXIS)
    arrow(ax, (ox, oy), (ox + R + 0.9, oy), AXIS, lw=1.4); ax.text(ox + R + 0.95, oy + 0.1, "$y$", fontsize=13, color=AXIS)
    arrow(ax, (ox, oy), (ox - 2.4, oy - 2.1), AXIS, lw=1.4); ax.text(ox - 2.75, oy - 2.35, "$x$", fontsize=13, color=AXIS)
    for dx, dy in ((0, -R), (-R, 0), (1.4, 1.2)):
        ax.plot([ox, ox + dx], [oy, oy + dy], color=AXIS, lw=0.8, linestyle="--", zorder=3)
    ax.add_patch(Circle((ox, oy + R), 0.06, facecolor=AXIS, zorder=5)); ax.text(ox + 0.12, oy + R + 0.08, r"$|0\rangle$", fontsize=13, color=AXIS)
    ax.add_patch(Circle((ox, oy - R), 0.06, facecolor=AXIS, zorder=5)); ax.text(ox + 0.12, oy - R - 0.35, r"$|1\rangle$", fontsize=13, color=AXIS)
    ax.text(ox - 2.0, oy - 2.1, r"$|+\rangle$", fontsize=11, color=EQ)
    ax.text(ox + R - 0.55, oy + 0.15, r"$|{+}i\rangle$", fontsize=11, color=EQ)

    # state vector and projections
    px, py = ox + 1.62, oy + 1.72
    qx, qy = ox + 1.62, oy - 0.42
    for a, b in (((px, py), (qx, qy)), ((ox, oy), (qx, qy)), ((qx, qy), (ox + 2.14, oy - 0.02)), ((qx, qy), (ox - 0.55, oy - 0.42))):
        ax.plot([a[0], b[0]], [a[1], b[1]], color=PROJ, lw=1.2, linestyle=":", zorder=4)
    arrow(ax, (ox, oy), (px, py), STATE, lw=2.6, ms=20, z=7)
    ax.add_patch(Circle((px, py), 0.09, facecolor=STATE, zorder=8))
    ax.text(px + 0.12, py + 0.1, r"$|\psi\rangle$", fontsize=14, color=STATE, zorder=8)

    # angles
    ax.add_patch(Arc((ox, oy), 2.6, 2.6, theta1=47, theta2=90, color=THETA, linewidth=1.5, zorder=6))
    t = math.radians(47)
    arrow(ax, (ox + 1.3 * math.cos(t + 0.02), oy + 1.3 * math.sin(t + 0.02)), (ox + 1.3 * math.cos(t), oy + 1.3 * math.sin(t)), THETA, lw=1.5, ms=12, z=7)
    ax.text(ox + 0.42, oy + 1.55, r"$\theta$", fontsize=14, color=THETA, ha="center", va="center")
    ax.add_patch(Arc((ox, oy), 2.56, 1.2, theta1=222, theta2=342, color=PHI, linewidth=1.5, zorder=6))
    t = math.radians(342)
    arrow(ax, (ox + 1.28 * math.cos(t - 0.02), oy + 0.6 * math.sin(t - 0.02)), (ox + 1.28 * math.cos(t), oy + 0.6 * math.sin(t)), PHI, lw=1.5, ms=12, z=7)
    ax.text(ox + 0.2, oy - 1.1, r"$\varphi$", fontsize=14, color=PHI, ha="center", va="center")

    # notes
    ax.text(3.3, -2.6, r"$\theta \in [0,\pi]$: polar angle from $|0\rangle$" + "\n" +
            r"$\varphi \in [0,2\pi)$: azimuth from $x$" + "\n" +
            "pure states lie on the surface,\nmixed states inside the ball",
            ha="left", va="center", fontsize=10, color=AXIS, linespacing=1.5)
    ax.plot([3.3, 3.8], [-4.0, -4.0], color=STATE, lw=2.4); ax.text(3.9, -4.0, "state vector", va="center", fontsize=10, color=AXIS)
    ax.plot([3.3, 3.8], [-4.3, -4.3], color=PROJ, lw=1.4, linestyle=":"); ax.text(3.9, -4.3, "projection onto the $xy$ plane", va="center", fontsize=10, color=AXIS)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
