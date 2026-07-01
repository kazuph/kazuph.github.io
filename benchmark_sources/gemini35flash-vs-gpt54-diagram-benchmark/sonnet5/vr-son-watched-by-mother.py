import sys
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches

output_path = sys.argv[1]

# ---------------------------------------------------------------
# helper functions
# ---------------------------------------------------------------

def limb_quad(x1, y1, x2, y2, thickness):
    """Build a simple quadrilateral (a 'limb') between two points."""
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length < 1e-6:
        length = 1e-6
    px, py = -dy / length, dx / length
    hw = thickness / 2.0
    return [
        (x1 + px * hw, y1 + py * hw),
        (x2 + px * hw, y2 + py * hw),
        (x2 - px * hw, y2 - py * hw),
        (x1 - px * hw, y1 - py * hw),
    ]


def star_points(cx, cy, r_outer, r_inner, points=5, rotation_deg=90):
    pts = []
    step = math.pi / points
    start = math.radians(rotation_deg)
    for i in range(points * 2):
        r = r_outer if i % 2 == 0 else r_inner
        theta = start + i * step
        pts.append((cx + r * math.cos(theta), cy + r * math.sin(theta)))
    return pts


# ---------------------------------------------------------------
# palette
# ---------------------------------------------------------------

C = {
    "wall_upper": "#dbe6f8",
    "wall_lower": "#f2f6fc",
    "wall_rail": "#c3d3ee",
    "floor": "#c99a63",
    "floor_line": "#b5824a",
    "baseboard": "#f5f5f0",
    "hallway": "#2b2440",
    "door_frame": "#8a6a4b",
    "window_frame": "#6b4a30",
    "sky": "#2e3a6b",
    "moon": "#f4f1de",
    "curtain": "#c86b85",
    "rug": "#f4a259",
    "skin": "#f3c9a1",
    "mother_hair": "#4a2f23",
    "mother_shirt": "#e07a5f",
    "mother_pants": "#3d5a80",
    "son_hair": "#2b2b2b",
    "son_shirt": "#4cc9f0",
    "son_pants": "#2f4858",
    "shoe": "#e63946",
    "desk": "#8d6748",
    "monitor": "#22282f",
    "screen": "#79e0ff",
    "shelf": "#a97a4b",
    "shelf_board": "#c79a63",
    "bed_frame": "#7a5133",
    "bed_mattress": "#fefaf3",
    "blanket": "#f6c667",
    "blanket_stripe": "#f28c28",
    "vr": "#20232a",
    "vr_lens": "#7cf7ff",
    "controller": "#ff6b6b",
    "gaze_mother": "#555555",
    "gaze_son": "#3d8bbf",
}

fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(C["wall_upper"])
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")


def add(p):
    ax.add_patch(p)
    return p


# ---------------------------------------------------------------
# background: walls
# ---------------------------------------------------------------

add(patches.Rectangle((0, 0), 12, 9, facecolor=C["wall_upper"], edgecolor="none", zorder=0))
add(patches.Rectangle((0, 1.3), 12, 3.3, facecolor=C["wall_lower"], edgecolor="none", zorder=0.2))
add(patches.Rectangle((0, 4.55), 12, 0.12, facecolor=C["wall_rail"], edgecolor="none", zorder=0.3))
add(patches.Rectangle((0, 8.8), 12, 0.2, facecolor=C["wall_rail"], edgecolor="none", zorder=0.3))

# floor
add(patches.Rectangle((0, 0), 12, 1.3, facecolor=C["floor"], edgecolor="none", zorder=1))
for x in [1.0, 2.4, 3.8, 5.2, 6.6, 8.0, 9.4, 10.8]:
    ax.plot([x, x], [0, 1.3], color=C["floor_line"], linewidth=1.0, zorder=1.05)
add(patches.Rectangle((0, 1.22), 12, 0.1, facecolor=C["baseboard"], edgecolor="none", zorder=1.1))

# window
add(patches.Rectangle((4.85, 5.5), 1.9, 2.9, facecolor=C["window_frame"], edgecolor="none", zorder=1.3))
add(patches.Rectangle((5.0, 5.65), 1.6, 2.6, facecolor=C["sky"], edgecolor="none", zorder=1.35))
add(patches.Circle((6.1, 7.6), 0.28, facecolor=C["moon"], zorder=1.4))
for (sx, sy) in [(5.3, 6.2), (6.4, 6.0), (5.7, 7.9), (6.35, 8.0)]:
    add(patches.Polygon(star_points(sx, sy, 0.06, 0.025, 4, 0), closed=True,
                         facecolor="#ffffff", alpha=0.85, zorder=1.42))
ax.plot([5.8, 5.8], [5.65, 8.25], color=C["window_frame"], linewidth=3, zorder=1.4)
ax.plot([5.0, 6.6], [6.95, 6.95], color=C["window_frame"], linewidth=3, zorder=1.4)
add(patches.Polygon([(4.6, 8.35), (5.0, 8.35), (4.95, 5.6), (4.55, 5.75)], closed=True,
                     facecolor=C["curtain"], zorder=1.45))
add(patches.Polygon([(6.75, 8.35), (6.35, 8.35), (6.4, 5.6), (6.8, 5.75)], closed=True,
                     facecolor=C["curtain"], zorder=1.45))
add(patches.Rectangle((4.4, 8.25), 2.55, 0.18, facecolor=C["window_frame"], zorder=1.46))

# doorway - mother is watching from here
add(patches.Rectangle((0.4, 1.3), 2.35, 5.55, facecolor=C["door_frame"], edgecolor="none", zorder=1.5))
add(patches.Rectangle((0.55, 1.3), 2.05, 5.4, facecolor=C["hallway"], edgecolor="none", zorder=1.55))
add(patches.Rectangle((1.3, 3.0), 0.9, 2.6, facecolor="#3a3358", alpha=0.5, zorder=1.56))

# desk & chair
add(patches.Rectangle((2.95, 1.3), 0.13, 1.3, facecolor=C["desk"], zorder=2))
add(patches.Rectangle((4.62, 1.3), 0.13, 1.3, facecolor=C["desk"], zorder=2))
add(patches.Rectangle((2.9, 2.55), 1.95, 0.18, facecolor=C["desk"], zorder=2.05))
add(patches.Rectangle((3.35, 2.73), 0.95, 0.72, facecolor=C["monitor"], zorder=2.1))
add(patches.Rectangle((3.45, 2.83), 0.75, 0.52, facecolor=C["screen"], zorder=2.12))
add(patches.Rectangle((3.65, 2.6), 0.35, 0.13, facecolor=C["monitor"], zorder=2.08))
add(patches.Rectangle((3.25, 2.6), 1.1, 0.08, facecolor="#3a4550", zorder=2.15))
add(patches.Circle((4.0, 1.95), 0.28, facecolor="#5a3d2b", zorder=1.95))
add(patches.Rectangle((3.87, 1.6), 0.26, 0.4, facecolor="#5a3d2b", zorder=1.9))

# shelf with toys
add(patches.Rectangle((9.6, 1.3), 2.0, 5.1, facecolor=C["shelf"], zorder=2))
for y in [2.55, 3.8, 5.05]:
    add(patches.Rectangle((9.55, y), 2.1, 0.12, facecolor=C["shelf_board"], zorder=2.05))
add(patches.Polygon([(9.9, 2.65), (10.1, 3.3), (10.3, 2.65)], closed=True, facecolor="#ef476f", zorder=2.1))
add(patches.Circle((10.1, 3.3), 0.1, facecolor="#ffd166", zorder=2.12))
add(patches.Circle((10.9, 2.75), 0.22, facecolor="#06d6a0", zorder=2.1))
add(patches.Rectangle((9.85, 3.9), 0.3, 0.3, facecolor="#118ab2", zorder=2.1))
add(patches.Rectangle((10.25, 3.9), 0.3, 0.3, facecolor="#ffd166", zorder=2.1))
add(patches.Rectangle((10.65, 3.85), 0.3, 0.35, facecolor="#ef476f", zorder=2.1))
_toy_colors = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2"]
for i, cx in enumerate([9.85, 10.15, 10.45, 10.75]):
    add(patches.Rectangle((cx, 5.15), 0.22, 0.35, facecolor=_toy_colors[i % 4], zorder=2.1))

# bed
add(patches.Rectangle((7.35, 7.85), 4.45, 0.95, facecolor=C["bed_frame"], zorder=1.8))
add(patches.Rectangle((7.4, 6.2), 4.3, 0.3, facecolor=C["bed_frame"], zorder=2.0))
add(patches.Rectangle((7.4, 6.45), 4.3, 1.5, facecolor=C["bed_mattress"], zorder=2.05))
add(patches.Rectangle((7.4, 6.45), 4.3, 0.85, facecolor=C["blanket"], zorder=2.1))
for x in [7.6, 8.2, 8.8, 9.4, 10.0, 10.6]:
    add(patches.Rectangle((x, 6.45), 0.22, 0.85, facecolor=C["blanket_stripe"], zorder=2.12))
add(patches.FancyBboxPatch((7.65, 7.55), 1.3, 0.6, boxstyle="round,pad=0.02,rounding_size=0.15",
                            facecolor="#ffffff", zorder=2.15))

# rug & scattered toys
add(patches.Ellipse((7.0, 1.55), 3.2, 0.85, facecolor=C["rug"], alpha=0.9, zorder=1.6))
add(patches.Rectangle((5.85, 1.32), 0.26, 0.26, facecolor="#ef476f", zorder=1.65))
add(patches.Rectangle((8.35, 1.3), 0.24, 0.24, facecolor="#ffd166", zorder=1.65))
add(patches.Circle((6.3, 1.44), 0.15, facecolor="#118ab2", zorder=1.65))

# wall stickers
for (sx, sy, col) in [(3.2, 7.0, "#ffd166"), (3.7, 7.5, "#ef476f"), (3.0, 6.4, "#06d6a0")]:
    add(patches.Polygon(star_points(sx, sy, 0.16, 0.07, 5, 90), closed=True,
                         facecolor=col, alpha=0.85, zorder=1.7))

# ================================================================
# MOTHER - standing at the doorway, watching her son
# ================================================================

add(patches.Ellipse((1.55, 1.32), 0.9, 0.16, facecolor="black", alpha=0.15, zorder=2.9))

add(patches.FancyBboxPatch((1.25, 1.3), 0.28, 1.5, boxstyle="round,pad=0.02,rounding_size=0.08",
                            facecolor=C["mother_pants"], zorder=3))
add(patches.FancyBboxPatch((1.62, 1.3), 0.28, 1.5, boxstyle="round,pad=0.02,rounding_size=0.08",
                            facecolor=C["mother_pants"], zorder=3))
add(patches.FancyBboxPatch((1.13, 2.75), 0.92, 1.55, boxstyle="round,pad=0.02,rounding_size=0.15",
                            facecolor=C["mother_shirt"], zorder=3.1))

arm1 = limb_quad(1.9, 4.15, 2.68, 3.85, 0.22)
add(patches.Polygon(arm1, closed=True, facecolor=C["skin"], zorder=3.2))
add(patches.Circle((2.68, 3.85), 0.12, facecolor=C["skin"], zorder=3.22))

arm2 = limb_quad(1.25, 4.1, 1.32, 4.62, 0.2)
add(patches.Polygon(arm2, closed=True, facecolor=C["skin"], zorder=3.2))
add(patches.Circle((1.32, 4.62), 0.11, facecolor=C["skin"], zorder=3.22))

add(patches.Rectangle((1.45, 4.25), 0.2, 0.18, facecolor=C["skin"], zorder=3.15))
add(patches.Circle((1.55, 4.8), 0.52, facecolor=C["mother_hair"], zorder=3.25))
add(patches.Circle((1.55, 4.78), 0.42, facecolor=C["skin"], zorder=3.3))
add(patches.FancyBboxPatch((1.1, 3.95), 0.18, 0.85, boxstyle="round,pad=0.01,rounding_size=0.08",
                            facecolor=C["mother_hair"], zorder=3.28))
add(patches.FancyBboxPatch((1.82, 3.95), 0.18, 0.85, boxstyle="round,pad=0.01,rounding_size=0.08",
                            facecolor=C["mother_hair"], zorder=3.28))
add(patches.Wedge((1.55, 5.05), 0.38, 0, 180, facecolor=C["mother_hair"], zorder=3.32))

# face - eyebrows raised in surprise, eyes looking toward the son
ax.plot([1.4, 1.49], [4.95, 5.0], color="#2e1b12", linewidth=2.2, solid_capstyle="round", zorder=3.4)
ax.plot([1.61, 1.7], [5.0, 4.95], color="#2e1b12", linewidth=2.2, solid_capstyle="round", zorder=3.4)
add(patches.Circle((1.48, 4.78), 0.075, facecolor="white", zorder=3.4))
add(patches.Circle((1.66, 4.78), 0.075, facecolor="white", zorder=3.4))
add(patches.Circle((1.515, 4.775), 0.035, facecolor="#2e1b12", zorder=3.45))
add(patches.Circle((1.695, 4.775), 0.035, facecolor="#2e1b12", zorder=3.45))
add(patches.Circle((1.57, 4.62), 0.055, facecolor="#8a3b3b", zorder=3.4))
add(patches.Circle((1.38, 4.68), 0.06, facecolor="#f4a89a", alpha=0.5, zorder=3.35))
add(patches.Circle((1.72, 4.68), 0.06, facecolor="#f4a89a", alpha=0.5, zorder=3.35))

# small surprised "!" mark above her head
add(patches.FancyBboxPatch((1.9, 5.35), 0.09, 0.32, boxstyle="round,pad=0.005,rounding_size=0.04",
                            facecolor="#ffb703", zorder=4))
add(patches.Circle((1.945, 5.2), 0.05, facecolor="#ffb703", zorder=4))

# ================================================================
# SON - playing with a VR headset, oblivious to his mother
# ================================================================

add(patches.Ellipse((7.0, 1.32), 1.3, 0.18, facecolor="black", alpha=0.15, zorder=2.9))

add(patches.FancyBboxPatch((6.62, 1.3), 0.32, 1.5, boxstyle="round,pad=0.02,rounding_size=0.1",
                            facecolor=C["son_pants"], zorder=3))
thigh = limb_quad(7.2, 2.7, 7.55, 1.95, 0.34)
add(patches.Polygon(thigh, closed=True, facecolor=C["son_pants"], zorder=3))
shin = limb_quad(7.55, 1.95, 7.72, 1.35, 0.28)
add(patches.Polygon(shin, closed=True, facecolor=C["son_pants"], zorder=3))

add(patches.FancyBboxPatch((6.55, 1.26), 0.42, 0.22, boxstyle="round,pad=0.005,rounding_size=0.08",
                            facecolor=C["shoe"], zorder=3.05))
add(patches.FancyBboxPatch((7.52, 1.16), 0.4, 0.22, boxstyle="round,pad=0.005,rounding_size=0.08",
                            facecolor=C["shoe"], zorder=3.05))

add(patches.FancyBboxPatch((6.52, 2.68), 1.0, 1.68, boxstyle="round,pad=0.02,rounding_size=0.18",
                            facecolor=C["son_shirt"], zorder=3.1))
add(patches.Polygon(star_points(7.02, 3.5, 0.16, 0.07, 5, 90), closed=True,
                     facecolor="#ffe066", zorder=3.12))

arm_r = limb_quad(7.48, 4.2, 8.28, 5.35, 0.3)
add(patches.Polygon(arm_r, closed=True, facecolor=C["skin"], zorder=3.15))
add(patches.Circle((8.28, 5.35), 0.15, facecolor=C["skin"], zorder=3.18))
arm_l = limb_quad(6.56, 4.2, 5.85, 5.3, 0.3)
add(patches.Polygon(arm_l, closed=True, facecolor=C["skin"], zorder=3.15))
add(patches.Circle((5.85, 5.3), 0.15, facecolor=C["skin"], zorder=3.18))

# controllers in both raised hands
add(patches.FancyBboxPatch((8.12, 5.18), 0.35, 0.35, boxstyle="round,pad=0.01,rounding_size=0.1",
                            facecolor=C["controller"], zorder=3.2))
add(patches.Circle((8.12, 5.35), 0.09, facecolor="none", edgecolor="#7a1f1f", linewidth=1.5, zorder=3.22))
add(patches.FancyBboxPatch((5.53, 5.13), 0.35, 0.35, boxstyle="round,pad=0.01,rounding_size=0.1",
                            facecolor=C["controller"], zorder=3.2))
add(patches.Circle((5.88, 5.3), 0.09, facecolor="none", edgecolor="#7a1f1f", linewidth=1.5, zorder=3.22))

add(patches.Rectangle((6.85, 4.3), 0.3, 0.2, facecolor=C["skin"], zorder=3.2))
add(patches.Circle((7.0, 4.85), 0.45, facecolor=C["skin"], zorder=3.3))
add(patches.Polygon([(6.6, 5.05), (6.75, 5.35), (6.9, 5.1)], closed=True, facecolor=C["son_hair"], zorder=3.32))
add(patches.Polygon([(6.9, 5.15), (7.02, 5.5), (7.15, 5.18)], closed=True, facecolor=C["son_hair"], zorder=3.32))
add(patches.Polygon([(7.1, 5.1), (7.28, 5.4), (7.4, 5.05)], closed=True, facecolor=C["son_hair"], zorder=3.32))

# VR headset covering the upper part of his face
add(patches.FancyBboxPatch((6.6, 4.66), 0.8, 0.42, boxstyle="round,pad=0.02,rounding_size=0.12",
                            facecolor=C["vr"], zorder=3.5))
add(patches.Rectangle((6.48, 4.76), 0.14, 0.16, facecolor=C["vr"], zorder=3.48))
add(patches.Rectangle((7.38, 4.76), 0.14, 0.16, facecolor=C["vr"], zorder=3.48))
add(patches.Ellipse((7.0, 4.88), 0.55, 0.2, facecolor=C["vr_lens"], alpha=0.85, zorder=3.55))
add(patches.Circle((7.33, 5.0), 0.035, facecolor="#ff5d5d", zorder=3.6))

# big laughing mouth + blush, visible below the headset
add(patches.Ellipse((7.0, 4.55), 0.22, 0.15, facecolor="#7a2e2e", zorder=3.5))
add(patches.Rectangle((6.92, 4.6), 0.16, 0.05, facecolor="white", zorder=3.52))
add(patches.Circle((6.78, 4.63), 0.05, facecolor="#ff9aa2", alpha=0.6, zorder=3.5))
add(patches.Circle((7.22, 4.63), 0.05, facecolor="#ff9aa2", alpha=0.6, zorder=3.5))

# motion swooshes near his hands and kicking foot
add(patches.Arc((8.5, 5.55), 0.5, 0.35, angle=25, theta1=200, theta2=340,
                 edgecolor="#ffd166", linewidth=2.2, alpha=0.85, zorder=3.7))
add(patches.Arc((8.68, 5.3), 0.35, 0.25, angle=25, theta1=200, theta2=340,
                 edgecolor="#ffd166", linewidth=1.8, alpha=0.65, zorder=3.7))
add(patches.Arc((5.6, 5.5), 0.5, 0.35, angle=155, theta1=200, theta2=340,
                 edgecolor="#ffd166", linewidth=2.2, alpha=0.85, zorder=3.7))
add(patches.Arc((5.42, 5.25), 0.35, 0.25, angle=155, theta1=200, theta2=340,
                 edgecolor="#ffd166", linewidth=1.8, alpha=0.65, zorder=3.7))
add(patches.Arc((7.85, 1.75), 0.4, 0.3, angle=15, theta1=190, theta2=330,
                 edgecolor="#ffd166", linewidth=2.0, alpha=0.7, zorder=3.7))

# ---------------------------------------------------------------
# VR view bubble - what the son is actually looking at
# ---------------------------------------------------------------

add(patches.FancyBboxPatch((6.85, 5.55), 1.8, 1.3, boxstyle="round,pad=0.02,rounding_size=0.25",
                            facecolor="#eaf7ff", edgecolor="#8fd8ff", linewidth=1.5, alpha=0.95, zorder=4))
add(patches.Rectangle((6.95, 5.65), 1.6, 0.15, facecolor="#95d5b2", zorder=4.05))
add(patches.Polygon([(7.05, 5.8), (7.4, 6.35), (7.7, 5.8)], closed=True, facecolor="#8ecae6", zorder=4.06))
add(patches.Polygon([(7.5, 5.8), (7.9, 6.45), (8.25, 5.8)], closed=True, facecolor="#6ba9d1", zorder=4.06))
add(patches.Circle((8.15, 6.5), 0.14, facecolor="#ffd166", zorder=4.02))
add(patches.Polygon(star_points(7.15, 6.65, 0.07, 0.03, 4, 0), closed=True, facecolor="#ffffff", zorder=4.1))
add(patches.Polygon(star_points(8.45, 6.15, 0.06, 0.025, 4, 0), closed=True, facecolor="#ffffff", zorder=4.1))

# ---------------------------------------------------------------
# gaze relationship: mother watches the son, the son looks into his
# virtual world instead - the dashed lines make both lines of sight
# explicit and show that they do not meet.
# ---------------------------------------------------------------

gaze_mother = patches.FancyArrowPatch((2.0, 4.85), (6.55, 5.15), arrowstyle="-|>", mutation_scale=16,
                                       connectionstyle="arc3,rad=-0.18", linewidth=1.8,
                                       linestyle=(0, (6, 4)), color=C["gaze_mother"], zorder=5)
add(gaze_mother)
gaze_son = patches.FancyArrowPatch((7.35, 4.98), (7.15, 5.55), arrowstyle="-|>", mutation_scale=14,
                                    connectionstyle="arc3,rad=0.1", linewidth=1.6,
                                    linestyle=(0, (4, 3)), color=C["gaze_son"], zorder=5)
add(gaze_son)

fig.savefig(output_path, facecolor=fig.get_facecolor())
