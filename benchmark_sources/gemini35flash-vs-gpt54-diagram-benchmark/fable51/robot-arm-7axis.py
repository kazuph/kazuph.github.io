import math
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.transforms as mtransforms
from matplotlib.patches import Arc, Circle, Ellipse, FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

BG = "#F7F8FA"
GRID = "#E3E6EB"
LINK = "#E9EDF2"
LINK_EDGE = "#5B6773"
LINK_SHADE = "#BFC8D2"
JOINT = "#F4A261"
JOINT_EDGE = "#B8632A"
PITCH = "#2A6F97"
ROLL = "#C0392B"
YAW = "#2E8B57"
LABEL = "#233044"
BASE = "#6B7A88"
BASE_DARK = "#4F5C68"


def rot(ax, cx, cy, deg):
    return mtransforms.Affine2D().rotate_deg_around(cx, cy, deg) + ax.transData


def link(ax, x0, y0, length, width, deg, z=5):
    """Rounded link starting at (x0, y0) pointing at angle deg, with a shaded underside and highlight."""
    tr = rot(ax, x0, y0, deg)
    ax.add_patch(FancyBboxPatch((x0, y0 - width / 2 - 0.05), length, width + 0.05, boxstyle="round,pad=0,rounding_size=0.15",
                                facecolor=LINK_SHADE, edgecolor="none", transform=tr, zorder=z))
    ax.add_patch(FancyBboxPatch((x0, y0 - width / 2), length, width, boxstyle="round,pad=0,rounding_size=0.15",
                                facecolor=LINK, edgecolor=LINK_EDGE, linewidth=1.4, transform=tr, zorder=z + 1))
    ax.add_patch(FancyBboxPatch((x0 + 0.2, y0 + width * 0.18), length - 0.4, width * 0.16, boxstyle="round,pad=0,rounding_size=0.05",
                                facecolor="white", edgecolor="none", alpha=0.55, transform=tr, zorder=z + 2))


def pitch_joint(ax, x, y, r, a0, a1, label, lx, ly, z=9):
    ax.add_patch(Circle((x, y), r, facecolor=JOINT, edgecolor=JOINT_EDGE, linewidth=1.4, zorder=z))
    ax.add_patch(Circle((x, y), r * 0.33, facecolor="white", edgecolor="none", zorder=z + 1))
    rr = r + 0.25
    ax.add_patch(Arc((x, y), 2 * rr, 2 * rr, theta1=min(a0, a1), theta2=max(a0, a1), color=PITCH, linewidth=1.8, zorder=z + 1))
    tip = math.radians(a1)
    direction = 1 if a1 > a0 else -1
    tang = tip + direction * math.pi / 2
    px, py = x + rr * math.cos(tip), y + rr * math.sin(tip)
    ax.add_patch(FancyArrowPatch((px - 0.01 * math.cos(tang), py - 0.01 * math.sin(tang)),
                                 (px + 0.12 * math.cos(tang), py + 0.12 * math.sin(tang)),
                                 arrowstyle="-|>", mutation_scale=14, color=PITCH, linewidth=1.8, zorder=z + 2))
    ax.text(lx, ly, label, ha="center", va="center", fontsize=12, fontweight="bold", color=PITCH, zorder=z + 3)


def roll_joint(ax, x, y, deg, ry, label, lx, ly, z=9):
    tr = rot(ax, x, y, deg)
    ax.add_patch(Ellipse((x, y), 0.26, 2 * ry, facecolor=JOINT, edgecolor=JOINT_EDGE, linewidth=1.2, transform=tr, zorder=z))
    R = ry + 0.12
    ax.add_patch(Arc((x, y), 0.34, 2 * R, theta1=-90, theta2=150, color=ROLL, linewidth=1.8, transform=tr, zorder=z + 1))
    # arrow head at the end of the arc (angle 150 deg on the ellipse), in link-local coordinates
    t = math.radians(150)
    px, py = x + 0.17 * math.cos(t), y + R * math.sin(t)
    tx, ty = -0.17 * math.sin(t), R * math.cos(t)
    n = math.hypot(tx, ty)
    tx, ty = tx / n, ty / n
    ax.add_patch(FancyArrowPatch((px, py), (px + 0.12 * tx, py + 0.12 * ty), arrowstyle="-|>", mutation_scale=14,
                                 color=ROLL, linewidth=1.8, transform=tr, zorder=z + 2))
    ax.text(lx, ly, label, ha="center", va="center", fontsize=12, fontweight="bold", color=ROLL, zorder=z + 3)


def note(ax, x, y, text, ha="left", color=LABEL, size=10):
    ax.text(x, y, text, ha=ha, va="center", fontsize=size, color=color, zorder=20)


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.4, 11.6)
    ax.set_ylim(-0.6, 8.4)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-0.4, -0.6), 12, 9, facecolor=BG, zorder=0))
    ax.text(-0.1, 8.0, "7-axis articulated robot arm: joints J1–J7", ha="left", va="center", fontsize=16, fontweight="bold", color=LABEL)

    # floor grid (perspective feel)
    for i in range(-6, 15):
        ax.plot([i * 0.9 - 1, i * 0.9 + 1.4], [-0.6, 2.2], color=GRID, lw=0.8, zorder=1)
    for j in range(0, 7):
        ax.plot([-0.4, 11.6], [j * 0.45 - 0.5, j * 0.45 + 0.1], color=GRID, lw=0.8, zorder=1)
    ax.add_patch(Ellipse((4.2, 0.55), 5.2, 0.9, facecolor="black", alpha=0.08, zorder=2))

    # base cylinder
    ax.add_patch(Ellipse((3.5, 0.75), 2.4, 0.7, facecolor=BASE_DARK, edgecolor=LINK_EDGE, linewidth=1.2, zorder=3))
    ax.add_patch(Rectangle((2.3, 0.75), 2.4, 0.35, facecolor=BASE_DARK, edgecolor="none", zorder=3))
    ax.plot([2.3, 2.3], [0.75, 1.1], color=LINK_EDGE, lw=1.2, zorder=4)
    ax.plot([4.7, 4.7], [0.75, 1.1], color=LINK_EDGE, lw=1.2, zorder=4)
    ax.add_patch(Ellipse((3.5, 1.1), 2.4, 0.7, facecolor=BASE, edgecolor=LINK_EDGE, linewidth=1.2, zorder=4))
    # column
    ax.add_patch(Rectangle((3.0, 1.1), 1.0, 1.4, facecolor=LINK_SHADE, edgecolor="none", zorder=5))
    ax.add_patch(Rectangle((3.15, 1.1), 0.7, 1.4, facecolor=LINK, edgecolor="none", zorder=5))
    ax.plot([3.0, 3.0], [1.1, 2.5], color=LINK_EDGE, lw=1.4, zorder=6)
    ax.plot([4.0, 4.0], [1.1, 2.5], color=LINK_EDGE, lw=1.4, zorder=6)
    ax.add_patch(Ellipse((3.5, 2.5), 1.0, 0.32, facecolor=LINK, edgecolor=LINK_EDGE, linewidth=1.4, zorder=6))
    ax.add_patch(FancyBboxPatch((2.95, 2.45), 1.1, 0.8, boxstyle="round,pad=0,rounding_size=0.15",
                                facecolor=LINK, edgecolor=LINK_EDGE, linewidth=1.4, zorder=7))

    # links
    link(ax, 3.5, 2.85, 3.4, 0.7, 57.7, z=7)      # upper arm to elbow
    link(ax, 5.3, 5.7, 3.07, 0.6, -12.2, z=7)     # forearm to wrist
    link(ax, 8.3, 5.05, 1.25, 0.46, -36.9, z=7)   # wrist
    # flange + gripper
    tr = rot(ax, 9.3, 4.3, -36.9)
    ax.add_patch(Rectangle((9.3, 4.0), 0.25, 0.6, facecolor=LINK_SHADE, edgecolor=LINK_EDGE, linewidth=1.2, transform=tr, zorder=8))
    for y0 in (4.42, 4.0):
        ax.add_patch(FancyBboxPatch((9.55, y0), 0.8, 0.18, boxstyle="round,pad=0,rounding_size=0.05",
                                    facecolor=LINK, edgecolor=LINK_EDGE, linewidth=1.2, transform=tr, zorder=8))
    ax.add_patch(Rectangle((10.35, 4.42), 0.4, 0.13, facecolor=LINK_SHADE, edgecolor=LINK_EDGE, linewidth=1.2, transform=tr, zorder=8))
    ax.add_patch(Rectangle((10.35, 4.05), 0.4, 0.13, facecolor=LINK_SHADE, edgecolor=LINK_EDGE, linewidth=1.2, transform=tr, zorder=8))

    # J1 yaw
    ax.plot([3.5, 3.5], [0.6, 3.6], color=YAW, lw=1.4, linestyle="--", zorder=9)
    ax.add_patch(Arc((3.5, 1.9), 1.5, 0.44, theta1=180, theta2=350, color=YAW, linewidth=1.8, zorder=9))
    t = math.radians(350)
    px, py = 3.5 + 0.75 * math.cos(t), 1.9 + 0.22 * math.sin(t)
    ax.add_patch(FancyArrowPatch((px, py - 0.02), (px + 0.02, py + 0.1), arrowstyle="-|>", mutation_scale=14, color=YAW, linewidth=1.8, zorder=10))
    ax.text(2.35, 2.05, "J1", ha="center", va="center", fontsize=12, fontweight="bold", color=YAW, zorder=12)

    pitch_joint(ax, 3.5, 2.85, 0.3, 200, 330, "J2", 2.85, 3.45)
    roll_joint(ax, 4.4, 4.28, 57.7, 0.42, "J3", 3.55, 4.55)
    pitch_joint(ax, 5.3, 5.7, 0.3, 150, 20, "J4", 5.3, 6.6)
    roll_joint(ax, 6.8, 5.38, -12.2, 0.42, "J5", 6.8, 4.55)
    pitch_joint(ax, 8.3, 5.05, 0.26, 120, -10, "J6", 8.35, 5.95)
    roll_joint(ax, 9.3, 4.3, -36.9, 0.36, "J7", 9.75, 4.95)

    # TCP & part labels
    ax.add_patch(Circle((10.55, 3.35), 0.05, facecolor=LABEL, zorder=12))
    ax.plot([10.55, 10.9], [3.35, 2.7], color=LABEL, lw=0.8, zorder=12)
    note(ax, 10.1, 2.45, "TCP")
    ax.plot([4.7, 5.6], [0.95, 0.95], color=LABEL, lw=0.8, zorder=12); note(ax, 5.65, 0.95, "Base")
    ax.plot([4.2, 5.6], [4.0, 3.6], color=LABEL, lw=0.8, zorder=12); note(ax, 5.65, 3.6, "Link 2 (upper arm)")
    ax.plot([7.4, 7.0], [5.6, 7.0], color=LABEL, lw=0.8, zorder=12); note(ax, 7.0, 7.0, "Link 4 (forearm)", ha="right")
    ax.plot([10.4, 10.6], [4.3, 5.6], color=LABEL, lw=0.8, zorder=12); note(ax, 10.05, 5.85, "Gripper")

    # legend
    ax.add_patch(Arc((0.2, 7.3), 0.44, 0.44, theta1=-20, theta2=200, color=PITCH, linewidth=1.8, zorder=12))
    ax.add_patch(FancyArrowPatch((0.41, 7.22), (0.42, 7.1), arrowstyle="-|>", mutation_scale=12, color=PITCH, linewidth=1.8, zorder=12))
    note(ax, 0.55, 7.3, "Pitch axis (J2, J4, J6)")
    ax.add_patch(Arc((0.2, 6.75), 0.18, 0.44, theta1=-90, theta2=150, color=ROLL, linewidth=1.8, zorder=12))
    ax.add_patch(FancyArrowPatch((0.12, 6.86), (0.05, 6.8), arrowstyle="-|>", mutation_scale=12, color=ROLL, linewidth=1.8, zorder=12))
    note(ax, 0.55, 6.75, "Roll axis (J3, J5, J7)")
    ax.add_patch(Arc((0.22, 6.2), 0.44, 0.18, theta1=180, theta2=350, color=YAW, linewidth=1.8, zorder=12))
    ax.add_patch(FancyArrowPatch((0.43, 6.18), (0.44, 6.24), arrowstyle="-|>", mutation_scale=12, color=YAW, linewidth=1.8, zorder=12))
    note(ax, 0.55, 6.2, "Yaw axis (J1, base rotation)")
    note(ax, 0.0, 5.65, "Extra J3 roll gives redundancy: the elbow can", color=LINK_EDGE)
    note(ax, 0.0, 5.35, "swing without moving the tool (null-space motion).", color=LINK_EDGE)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
