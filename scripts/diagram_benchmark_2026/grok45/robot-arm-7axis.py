#!/usr/bin/env python3
"""7-axis robot arm diagram (matplotlib)."""

import sys
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Polygon, Arc
from matplotlib.lines import Line2D
import matplotlib.patches as mpatches


def isometric(x, y, z):
    """Simple isometric projection."""
    sx = x - z * 0.55
    sy = y + (x + z) * 0.28
    return sx, sy


def draw_cylinder_link(ax, p0, p1, width, color, edge="#2a2a2a", zorder=5):
    """Draw a thick link segment with slight 3D shading."""
    x0, y0 = p0
    x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1e-6
    nx, ny = -dy / length, dx / length

    # Main body (parallelogram-ish quad)
    hw = width / 2
    pts = [
        (x0 + nx * hw, y0 + ny * hw),
        (x1 + nx * hw, y1 + ny * hw),
        (x1 - nx * hw, y1 - ny * hw),
        (x0 - nx * hw, y0 - ny * hw),
    ]
    # Highlight edge (lighter)
    light = [
        (x0 + nx * hw * 0.3, y0 + ny * hw * 0.3),
        (x1 + nx * hw * 0.3, y1 + ny * hw * 0.3),
        (x1 + nx * hw, y1 + ny * hw),
        (x0 + nx * hw, y0 + ny * hw),
    ]
    ax.add_patch(Polygon(pts, closed=True, facecolor=color, edgecolor=edge,
                          linewidth=1.2, zorder=zorder))
    ax.add_patch(Polygon(light, closed=True, facecolor="white", alpha=0.18,
                          edgecolor="none", zorder=zorder + 0.1))
    # End caps
    ax.add_patch(Circle(p0, width * 0.52, facecolor=color, edgecolor=edge,
                         linewidth=1.0, zorder=zorder + 0.2))
    ax.add_patch(Circle(p1, width * 0.52, facecolor=color, edgecolor=edge,
                         linewidth=1.0, zorder=zorder + 0.2))


def draw_joint(ax, center, radius, label, color="#f5f0e6", text_offset=(0, 0)):
    """Draw a joint disk with label."""
    ax.add_patch(Circle(center, radius * 1.15, facecolor="#1a1a1a",
                         edgecolor="none", alpha=0.12, zorder=8))
    ax.add_patch(Circle(center, radius, facecolor=color, edgecolor="#222222",
                         linewidth=1.4, zorder=9))
    ax.add_patch(Circle(center, radius * 0.35, facecolor="#333333",
                         edgecolor="#111111", linewidth=0.8, zorder=10))
    tx = center[0] + text_offset[0]
    ty = center[1] + text_offset[1]
    ax.text(tx, ty, label, fontsize=11, fontweight="bold", ha="center",
            va="center", color="#111111", zorder=12,
            bbox=dict(boxstyle="round,pad=0.18", facecolor="#fffef8",
                      edgecolor="#444444", linewidth=0.8, alpha=0.95))


def draw_rotation_arrow(ax, center, radius, start_deg, sweep_deg, color="#c0392b"):
    """Curved arrow indicating rotation about a joint."""
    arc = Arc(center, radius * 2, radius * 2, angle=0,
              theta1=start_deg, theta2=start_deg + sweep_deg,
              color=color, linewidth=1.6, zorder=11)
    ax.add_patch(arc)
    # Arrow head at end of arc
    end = math.radians(start_deg + sweep_deg)
    ex = center[0] + radius * math.cos(end)
    ey = center[1] + radius * math.sin(end)
    # Tangent direction
    tang = end + math.pi / 2 if sweep_deg > 0 else end - math.pi / 2
    ah = 0.18
    ax.annotate(
        "",
        xy=(ex + ah * 0.4 * math.cos(tang), ey + ah * 0.4 * math.sin(tang)),
        xytext=(ex - ah * math.cos(tang), ey - ah * math.sin(tang)),
        arrowprops=dict(arrowstyle="-|>", color=color, lw=1.4,
                        mutation_scale=10),
        zorder=12,
    )


def draw_axis_arrow(ax, origin, direction, length, color, label=None):
    """Small straight arrow for axis sense."""
    dx, dy = direction
    n = math.hypot(dx, dy) or 1e-6
    dx, dy = dx / n * length, dy / n * length
    ax.annotate(
        "",
        xy=(origin[0] + dx, origin[1] + dy),
        xytext=origin,
        arrowprops=dict(arrowstyle="-|>", color=color, lw=1.5,
                        mutation_scale=11),
        zorder=13,
    )


def main():
    out = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#f7f4ef")
    ax.set_facecolor("#f7f4ef")
    ax.set_xlim(-1.2, 10.5)
    ax.set_ylim(-1.0, 8.2)
    ax.set_aspect("equal")
    ax.axis("off")

    # Soft ground / shadow plane
    ground = Polygon(
        [(-0.8, -0.35), (9.8, -0.35), (9.2, -0.85), (-1.1, -0.85)],
        closed=True, facecolor="#d9d2c5", edgecolor="none", alpha=0.55, zorder=0,
    )
    ax.add_patch(ground)

    # ---- Joint positions in a natural reach pose (screen coords via isometric) ----
    # World coords (x forward, y up, z lateral)
    joints_w = [
        (0.0, 0.0, 0.0),    # J1 base yaw
        (0.0, 0.55, 0.0),   # J2 shoulder pitch
        (0.0, 1.85, 0.15),  # J3 upper arm roll
        (0.35, 3.35, 0.55), # J4 elbow pitch
        (1.55, 4.45, 1.15), # J5 forearm roll
        (2.85, 5.15, 1.85), # J6 wrist pitch
        (3.95, 5.55, 2.55), # J7 wrist yaw / flange
    ]

    pts = [isometric(*p) for p in joints_w]
    # Scale & shift into figure space
    scale = 1.55
    ox, oy = 2.4, 1.15
    pts = [(ox + x * scale, oy + y * scale) for x, y in pts]

    # End-effector tip beyond J7
    tip_w = (4.55, 5.75, 2.95)
    tip = isometric(*tip_w)
    tip = (ox + tip[0] * scale, oy + tip[1] * scale)

    # Base pedestal
    base_pts = [
        isometric(-0.55, 0, -0.55),
        isometric(0.55, 0, -0.55),
        isometric(0.55, 0, 0.55),
        isometric(-0.55, 0, 0.55),
    ]
    base_pts = [(ox + x * scale, oy + y * scale) for x, y in base_pts]
    ax.add_patch(Polygon(base_pts, closed=True, facecolor="#5a6570",
                          edgecolor="#2c3338", linewidth=1.3, zorder=2))
    # Base top plate
    top_z = 0.12
    top_pts = [
        isometric(-0.45, top_z, -0.45),
        isometric(0.45, top_z, -0.45),
        isometric(0.45, top_z, 0.45),
        isometric(-0.45, top_z, 0.45),
    ]
    top_pts = [(ox + x * scale, oy + y * scale) for x, y in top_pts]
    ax.add_patch(Polygon(top_pts, closed=True, facecolor="#6e7a86",
                          edgecolor="#2c3338", linewidth=1.1, zorder=3))
    # Base column sides for depth
    side = [
        isometric(-0.55, 0, 0.55),
        isometric(0.55, 0, 0.55),
        isometric(0.55, -0.35, 0.55),
        isometric(-0.55, -0.35, 0.55),
    ]
    side = [(ox + x * scale, oy + y * scale) for x, y in side]
    ax.add_patch(Polygon(side, closed=True, facecolor="#4a545c",
                          edgecolor="#2c3338", linewidth=1.0, zorder=1))

    # Link colors (cool steel → warm accent toward EE)
    link_colors = [
        "#4a6fa5",  # base→J2
        "#3d7ea6",  # J2→J3
        "#2f8f9a",  # J3→J4
        "#3a9a7a",  # J4→J5
        "#5a9a55",  # J5→J6
        "#8a8a40",  # J6→J7
        "#b07040",  # J7→tip
    ]
    widths = [0.42, 0.38, 0.34, 0.30, 0.26, 0.22, 0.18]

    chain = pts + [tip]
    for i in range(len(chain) - 1):
        draw_cylinder_link(ax, chain[i], chain[i + 1], widths[i],
                           link_colors[i], zorder=4 + i)

    # Joints J1–J7
    joint_radii = [0.28, 0.26, 0.24, 0.22, 0.20, 0.18, 0.17]
    label_offsets = [
        (-0.55, -0.45),
        (0.55, -0.35),
        (-0.60, 0.25),
        (0.50, 0.40),
        (-0.55, 0.35),
        (0.50, 0.40),
        (-0.15, 0.55),
    ]
    for i, (p, r, off) in enumerate(zip(pts, joint_radii, label_offsets)):
        draw_joint(ax, p, r, f"J{i + 1}", text_offset=off)

    # Rotation direction arcs (small curved arrows at each joint)
    rot_params = [
        # (start_deg, sweep_deg, radius_scale)
        (200, 90, 1.55),   # J1 yaw
        (40, 75, 1.50),    # J2 pitch
        (160, 80, 1.45),   # J3 roll
        (20, 70, 1.40),    # J4 pitch
        (140, 75, 1.45),   # J5 roll
        (30, 70, 1.40),    # J6 pitch
        (180, 85, 1.50),   # J7 yaw
    ]
    for p, r, (start, sweep, rs) in zip(pts, joint_radii, rot_params):
        draw_rotation_arrow(ax, p, r * rs, start, sweep, color="#c0392b")

    # End-effector gripper
    j7 = pts[6]
    # Direction J6→J7→tip
    dx = tip[0] - j7[0]
    dy = tip[1] - j7[1]
    ln = math.hypot(dx, dy) or 1e-6
    ux, uy = dx / ln, dy / ln
    px, py = -uy, ux  # perpendicular

    palm = (tip[0] + ux * 0.05, tip[1] + uy * 0.05)
    finger_len = 0.55
    gap = 0.22
    for sign in (-1, 1):
        base_f = (palm[0] + px * gap * sign, palm[1] + py * gap * sign)
        tip_f = (base_f[0] + ux * finger_len + px * 0.08 * sign,
                 base_f[1] + uy * finger_len + py * 0.08 * sign)
        draw_cylinder_link(ax, base_f, tip_f, 0.10, "#8b4518",
                           edge="#3a2010", zorder=14)
    ax.add_patch(Circle(palm, 0.14, facecolor="#a0522d", edgecolor="#3a2010",
                         linewidth=1.2, zorder=15))
    ax.text(tip[0] + 0.85, tip[1] + 0.35, "End Effector",
            fontsize=10, ha="left", va="center", color="#333333",
            style="italic", zorder=16)

    # Legend / annotations for structure
    ax.text(0.15, 7.55, "7-Axis Robot Arm", fontsize=18, fontweight="bold",
            color="#1a1a1a", ha="left", va="top")
    ax.text(0.15, 7.15, "Base  →  Links  →  Wrist  →  End Effector",
            fontsize=10, color="#555555", ha="left", va="top")

    # Small legend for rotation arrow
    ax.annotate(
        "",
        xy=(8.9, 7.45),
        xytext=(8.2, 7.45),
        arrowprops=dict(arrowstyle="-|>", color="#c0392b", lw=1.6,
                        mutation_scale=11),
    )
    # Mini arc legend
    legend_c = (8.55, 6.95)
    ax.add_patch(Arc(legend_c, 0.7, 0.7, angle=0, theta1=20, theta2=140,
                     color="#c0392b", linewidth=1.5, zorder=20))
    ax.annotate(
        "",
        xy=(legend_c[0] + 0.35 * math.cos(math.radians(140)),
            legend_c[1] + 0.35 * math.sin(math.radians(140))),
        xytext=(legend_c[0] + 0.28 * math.cos(math.radians(130)),
                legend_c[1] + 0.28 * math.sin(math.radians(130))),
        arrowprops=dict(arrowstyle="-|>", color="#c0392b", lw=1.3,
                        mutation_scale=9),
        zorder=21,
    )
    ax.text(9.1, 6.95, "Axis rotation", fontsize=9, color="#444444",
            ha="left", va="center")

    # Base label
    ax.text(pts[0][0] - 0.15, pts[0][1] - 1.05, "Base",
            fontsize=11, fontweight="bold", ha="center", color="#333333")

    # Link region callouts
    mid_upper = ((pts[1][0] + pts[3][0]) / 2 - 1.3,
                 (pts[1][1] + pts[3][1]) / 2)
    ax.text(mid_upper[0], mid_upper[1], "Upper Arm",
            fontsize=9, color="#3d5a80", ha="center", rotation=72)

    mid_fore = ((pts[3][0] + pts[5][0]) / 2 + 0.95,
                (pts[3][1] + pts[5][1]) / 2 - 0.15)
    ax.text(mid_fore[0], mid_fore[1], "Forearm",
            fontsize=9, color="#3d6b4f", ha="center", rotation=28)

    ax.text((pts[5][0] + pts[6][0]) / 2 + 0.7,
            (pts[5][1] + pts[6][1]) / 2 + 0.55,
            "Wrist", fontsize=9, color="#7a5a20", ha="center")

    fig.savefig(out, dpi=100, bbox_inches="tight", pad_inches=0.15,
                facecolor=fig.get_facecolor())
    plt.close(fig)


if __name__ == "__main__":
    main()
