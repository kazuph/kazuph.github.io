import sys
import math

import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Circle, Ellipse, FancyArrowPatch, Polygon, Rectangle

BASE = "#5A646E"
LINK = "#EB8C3C"
LINK_DARK = "#C86C24"
JOINT = "#46505A"
JOINT_HI = "#96A0AA"
FLOOR = "#E1E4E8"
AX_COLOR = "#C8641E"


def link(ax, p0, p1, width=0.5):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    nx, ny = -uy * width / 2, ux * width / 2
    pts = [(p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny),
           (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny)]
    ax.add_patch(Polygon(pts, facecolor=LINK, edgecolor=LINK_DARK,
                         linewidth=2, joinstyle="round"))


def joint(ax, p, r, name, label_offset):
    ax.add_patch(Circle(p, r, facecolor=JOINT, edgecolor="none", zorder=5))
    ax.add_patch(Circle((p[0] - r * 0.35, p[1] + r * 0.35), r * 0.28,
                        facecolor=JOINT_HI, edgecolor="none", zorder=6))
    ax.text(p[0] + label_offset[0], p[1] + label_offset[1], name,
            fontsize=13, weight="bold", family="sans-serif", zorder=8,
            ha="center", va="center")


def rot_arrow(ax, p, r, theta1, theta2):
    ax.add_patch(Arc(p, 2 * r, 1.4 * r, theta1=theta1, theta2=theta2,
                     color=AX_COLOR, linewidth=2.2, zorder=7))
    ang = math.radians(theta2)
    tip = (p[0] + r * math.cos(ang), p[1] + 0.7 * r * math.sin(ang))
    da = math.radians(theta2 - 8)
    tail = (p[0] + r * math.cos(da), p[1] + 0.7 * r * math.sin(da))
    ax.add_patch(FancyArrowPatch(tail, tip, arrowstyle="-|>",
                                 mutation_scale=14, color=AX_COLOR, zorder=7))


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-1.8, 12.2)
    ax.set_ylim(-1.6, 8.2)
    ax.set_aspect("equal")
    ax.axis("off")

    # floor with light perspective lines
    ax.add_patch(Polygon([(-1.5, -0.9), (11.5, -0.9), (10.5, 0.6),
                          (-0.5, 0.6)], facecolor=FLOOR, edgecolor="none"))
    for x0, x1 in [(0.2, 1.0), (2.6, 3.2), (5.0, 5.4), (7.4, 7.6), (9.8, 9.8)]:
        ax.plot([x0, x1], [-0.9, 0.6], color="white", linewidth=2)
    ax.plot([-1.1, 11.1], [-0.5, -0.5], color="white", linewidth=2)
    ax.plot([-0.8, 10.85], [0.0, 0.0], color="white", linewidth=2)

    # joint positions
    j2 = (1.2, 2.6)
    j3 = (3.09, 4.08)
    j4 = (5.32, 4.99)
    j5 = (7.39, 5.17)
    j6 = (8.75, 4.32)
    j7 = (9.52, 3.40)
    ee = (10.29, 2.48)

    # base cylinder with slight 3D feel
    ax.add_patch(Ellipse((1.2, 0.1), 2.0, 0.56, facecolor="#3C444C",
                         edgecolor="none"))
    ax.add_patch(Rectangle((0.2, 0.1), 2.0, 0.8, facecolor=BASE,
                           edgecolor="none"))
    ax.add_patch(Ellipse((1.2, 0.9), 2.0, 0.56, facecolor=JOINT_HI,
                         edgecolor="none"))
    ax.text(1.2, -1.25, "Base", fontsize=13, weight="bold",
            family="sans-serif", ha="center")

    # J1 vertical yaw axis
    ax.plot([1.2, 1.2], [0.4, 2.2], color="#787878", linewidth=1.4,
            linestyle=(0, (7, 4, 2, 4)))
    ax.add_patch(Arc((1.2, 1.55), 1.5, 0.5, theta1=200, theta2=520,
                     color=AX_COLOR, linewidth=2.2))
    ax.add_patch(FancyArrowPatch((1.85, 1.68), (1.9, 1.56),
                                 arrowstyle="-|>", mutation_scale=14,
                                 color=AX_COLOR))
    ax.text(0.1, 1.9, "J1", fontsize=13, weight="bold", family="sans-serif",
            ha="center")

    # links
    link(ax, (1.2, 1.0), j2, 0.6)
    link(ax, j2, j3, 0.56)
    link(ax, j3, j4, 0.52)
    link(ax, j4, j5, 0.48)
    link(ax, j5, j6, 0.44)
    link(ax, j6, j7, 0.40)

    # joints with rotation arrows
    joint(ax, j2, 0.42, "J2", (-0.85, 0.7))
    rot_arrow(ax, j2, 0.75, 60, 320)
    joint(ax, j3, 0.38, "J3", (-0.85, 0.55))
    rot_arrow(ax, j3, 0.68, 120, 380)
    joint(ax, j4, 0.36, "J4", (-0.55, 0.9))
    rot_arrow(ax, j4, 0.65, 90, 330)
    joint(ax, j5, 0.32, "J5", (-0.35, 1.0))
    rot_arrow(ax, j5, 0.6, 120, 360)
    joint(ax, j6, 0.30, "J6", (1.0, 0.55))
    rot_arrow(ax, j6, 0.55, 40, 280)
    joint(ax, j7, 0.27, "J7", (1.05, 0.4))
    rot_arrow(ax, j7, 0.5, 20, 260)

    # end effector: palm + two fingers along the J6->J7 direction
    ux, uy = 0.642, -0.766
    nx, ny = 0.766, 0.642
    palm0 = (j7[0] + 0.27 * ux, j7[1] + 0.27 * uy)
    palm1 = (palm0[0] + 0.45 * ux, palm0[1] + 0.45 * uy)
    link(ax, palm0, palm1, 0.5)
    for s in (1, -1):
        f0 = (palm1[0] + s * 0.22 * nx, palm1[1] + s * 0.22 * ny)
        f1 = (f0[0] + 0.55 * ux, f0[1] + 0.55 * uy)
        f2 = (f1[0] - s * 0.12 * nx, f1[1] - s * 0.12 * ny)
        ax.plot([f0[0], f1[0], f2[0]], [f0[1], f1[1], f2[1]],
                color=JOINT, linewidth=6, solid_capstyle="round")
    ax.text(ee[0] + 0.7, ee[1] - 0.4, "End effector", fontsize=13,
            weight="bold", family="sans-serif", ha="center")

    ax.text(5.0, 7.6, "7-axis robot arm (J1–J7)", fontsize=17,
            weight="bold", family="sans-serif", ha="center")
    ax.text(5.0, 7.05, "orange arrows show each joint's rotation direction",
            fontsize=12, family="sans-serif", color=AX_COLOR, ha="center")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
