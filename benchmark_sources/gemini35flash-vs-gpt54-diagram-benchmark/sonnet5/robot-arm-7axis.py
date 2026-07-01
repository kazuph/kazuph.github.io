import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401  (registers 3D projection)
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

output_path = sys.argv[1]

# ---------------------------------------------------------------------------
# Kinematic chain of an anthropomorphic 7-axis robot arm.
# Joint order follows a real-world 7-DOF layout (e.g. KUKA LBR iiwa style):
# ROLL - PITCH - ROLL - PITCH - ROLL - PITCH - ROLL
# ---------------------------------------------------------------------------
P0 = np.array([0.00, 0.00, 0.00])   # ground mount
P1 = np.array([0.00, 0.00, 0.65])   # J1 - waist roll
P2 = np.array([0.00, 0.00, 1.45])   # J2 - shoulder pitch
P3 = np.array([0.42, 0.30, 2.15])   # J3 - upper-arm roll
P4 = np.array([0.42, 0.30, 2.95])   # J4 - elbow pitch
P5 = np.array([1.05, 0.52, 3.35])   # J5 - forearm roll
P6 = np.array([1.75, 0.52, 3.28])   # J6 - wrist pitch
P7 = np.array([2.35, 0.40, 2.95])   # J7 - flange roll
P8 = np.array([2.85, 0.30, 2.62])   # hand / tool center point

points = np.array([P0, P1, P2, P3, P4, P5, P6, P7, P8])

JOINTS = [
    ("J1", P1, np.array([0.0, 0.0, 1.0]), "roll"),
    ("J2", P2, np.array([0.0, 1.0, 0.0]), "pitch"),
    ("J3", P3, P3 - P2, "roll"),
    ("J4", P4, np.array([0.0, 1.0, 0.0]), "pitch"),
    ("J5", P5, P5 - P4, "roll"),
    ("J6", P6, np.array([0.0, 1.0, 0.0]), "pitch"),
    ("J7", P7, P7 - P6, "roll"),
]

LABEL_OFFSETS = {
    "J1": np.array([-0.42, -0.38, -0.05]),
    "J2": np.array([-0.46, -0.36, 0.05]),
    "J3": np.array([-0.42, 0.20, 0.16]),
    "J4": np.array([-0.46, 0.18, 0.10]),
    "J5": np.array([0.05, 0.30, 0.24]),
    "J6": np.array([0.08, 0.30, 0.20]),
    "J7": np.array([0.16, 0.24, 0.24]),
}

ROLL_COLOR = "#2f6fb0"
PITCH_COLOR = "#d9822b"
LINK_COLOR = "#5b6472"
BASE_COLOR = "#3a3f47"
ARROW_COLOR = "#c0392b"
HAND_COLOR = "#2e2e2e"
BG_COLOR = "#f5f6f8"


def draw_cylinder(ax, center, radius, height, color, n=48, alpha=1.0, zorder=1):
    """Draw a solid-looking cylinder (used for the robot base / pedestal)."""
    theta = np.linspace(0.0, 2.0 * np.pi, n)
    theta_grid, h_grid = np.meshgrid(theta, [0.0, height])
    xs = center[0] + radius * np.cos(theta_grid)
    ys = center[1] + radius * np.sin(theta_grid)
    zs = center[2] + h_grid
    ax.plot_surface(xs, ys, zs, color=color, alpha=alpha, linewidth=0,
                     shade=True, zorder=zorder)

    x = center[0] + radius * np.cos(theta)
    y = center[1] + radius * np.sin(theta)
    top = [list(zip(x, y, np.full(n, center[2] + height)))]
    bottom = [list(zip(x, y, np.full(n, center[2])))]
    ax.add_collection3d(Poly3DCollection(top, facecolor=color, edgecolor="none",
                                          alpha=alpha, zorder=zorder))
    ax.add_collection3d(Poly3DCollection(bottom, facecolor=color, edgecolor="none",
                                          alpha=alpha, zorder=zorder))


def draw_rotation_arrow(ax, center, axis, radius=0.20, color=ARROW_COLOR,
                         span=4.6, zorder=8):
    """Draw a short curved arrow around `axis` to indicate rotation direction."""
    axis = np.asarray(axis, dtype=float)
    axis = axis / (np.linalg.norm(axis) + 1e-9)

    reference = np.array([1.0, 0.0, 0.0]) if abs(axis[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    u = np.cross(reference, axis)
    u = u / (np.linalg.norm(u) + 1e-9)
    v = np.cross(axis, u)

    theta = np.linspace(0.0, span, 40)
    arc = center + radius * (np.cos(theta)[:, None] * u + np.sin(theta)[:, None] * v)
    ax.plot(arc[:, 0], arc[:, 1], arc[:, 2], color=color, linewidth=2.2, zorder=zorder)

    tangent = -np.sin(theta[-1]) * u + np.cos(theta[-1]) * v
    tangent = tangent / (np.linalg.norm(tangent) + 1e-9)
    ax.quiver(arc[-1, 0], arc[-1, 1], arc[-1, 2],
              tangent[0], tangent[1], tangent[2],
              length=0.18, color=color, linewidth=2.2,
              arrow_length_ratio=0.9, zorder=zorder + 1)


fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(BG_COLOR)
ax = fig.add_subplot(111, projection="3d")
ax.set_facecolor(BG_COLOR)

# --- ground foot plate + base pedestal (columns represent "Base") ---------
draw_cylinder(ax, np.array([0.0, 0.0, -0.10]), 0.80, 0.10, BASE_COLOR, alpha=1.0, zorder=0)
draw_cylinder(ax, np.array([0.0, 0.0, 0.0]), 0.50, 0.65, BASE_COLOR, alpha=1.0, zorder=1)

# --- arm links (Base -> J1 -> J2 -> ... -> J7 -> Hand) ---------------------
chain = points[1:]  # P1..P8
widths = np.linspace(11.0, 4.0, len(chain) - 1)
for i in range(len(chain) - 1):
    seg = chain[i:i + 2]
    ax.plot(seg[:, 0], seg[:, 1], seg[:, 2], color=LINK_COLOR,
             linewidth=widths[i], solid_capstyle="round", zorder=3)

# --- joints: spheres colored by rotation type, labeled J1..J7 -------------
for name, pos, axis, kind in JOINTS:
    color = ROLL_COLOR if kind == "roll" else PITCH_COLOR
    ax.scatter(*pos, s=460, color=color, edgecolor="black",
               linewidth=1.4, depthshade=True, zorder=9)
    label_pos = pos + LABEL_OFFSETS[name]
    ax.text(label_pos[0], label_pos[1], label_pos[2], name,
            fontsize=13, fontweight="bold", color="#1c1c1c", zorder=11,
            ha="center", va="center")
    draw_rotation_arrow(ax, pos, axis)

# --- hand / end-effector: simple open parallel gripper ---------------------
forward = P8 - P7
forward = forward / np.linalg.norm(forward)
lateral = np.cross(forward, np.array([0.0, 0.0, 1.0]))
if np.linalg.norm(lateral) < 1e-6:
    lateral = np.array([0.0, 1.0, 0.0])
lateral = lateral / np.linalg.norm(lateral)

finger_len = 0.42
tip1 = P8 + forward * finger_len + lateral * 0.14
tip2 = P8 + forward * finger_len - lateral * 0.14

ax.scatter(*P8, s=260, color=HAND_COLOR, edgecolor="black", linewidth=1.2, zorder=9)
for tip in (tip1, tip2):
    seg = np.array([P8, tip])
    ax.plot(seg[:, 0], seg[:, 1], seg[:, 2], color=HAND_COLOR, linewidth=6.0,
             solid_capstyle="round", zorder=9)
    ax.scatter(*tip, s=60, color=HAND_COLOR, zorder=9)

# --- descriptive (non-axis) labels for base / link / hand -----------------
ax.text(0.0, 0.0, -0.35, "Base", fontsize=13, fontweight="bold",
        color="#1c1c1c", ha="center", zorder=11)
mid_link = (P2 + P3) / 2.0 + np.array([-0.55, 0.0, 0.15])
ax.text(mid_link[0], mid_link[1], mid_link[2], "Link", fontsize=12,
        fontstyle="italic", color="#444a52", ha="center", zorder=11)
hand_label = P8 + np.array([0.35, 0.0, -0.30])
ax.text(hand_label[0], hand_label[1], hand_label[2], "Hand (End-Effector)",
        fontsize=13, fontweight="bold", color="#1c1c1c", ha="left", zorder=11)

# --- legend -----------------------------------------------------------------
legend_handles = [
    Line2D([0], [0], marker="o", color="none", markerfacecolor=ROLL_COLOR,
           markeredgecolor="black", markersize=13, label="Roll joint (J1,J3,J5,J7)"),
    Line2D([0], [0], marker="o", color="none", markerfacecolor=PITCH_COLOR,
           markeredgecolor="black", markersize=13, label="Pitch joint (J2,J4,J6)"),
    Line2D([0], [0], color=ARROW_COLOR, linewidth=2.2, label="Rotation direction"),
    Line2D([0], [0], color=LINK_COLOR, linewidth=6, label="Link"),
]
legend = ax.legend(handles=legend_handles, loc="upper left", bbox_to_anchor=(0.02, 0.95),
                    frameon=True, facecolor="white", edgecolor="#cccccc", fontsize=10)
legend.get_frame().set_alpha(0.9)

# --- framing / view ----------------------------------------------------------
ax.set_xlim(-1.2, 3.4)
ax.set_ylim(-1.4, 1.6)
ax.set_zlim(-0.6, 3.9)
ax.set_box_aspect((1.5, 1.0, 1.5))
ax.view_init(elev=18, azim=-55)
ax.set_axis_off()

fig.suptitle("7-Axis Robot Arm — Joint Layout & Rotation Directions (J1–J7)",
             fontsize=16, fontweight="bold", color="#1c1c1c", y=0.97)

fig.tight_layout()
fig.savefig(output_path, facecolor=fig.get_facecolor())
