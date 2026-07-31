import sys
import math
import matplotlib.pyplot as plt
from matplotlib.patches import (
    FancyBboxPatch,
    Rectangle,
    Circle,
    Ellipse,
    Polygon,
    Arc,
    Wedge,
)
from matplotlib.collections import PatchCollection

out = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#f5e6d3")
ax.set_facecolor("#f5e6d3")

# --- walls / floor ---
# back wall
ax.add_patch(Rectangle((0, 3.2), 12, 5.8, facecolor="#e8d4b8", edgecolor="none", zorder=0))
# floor
ax.add_patch(Polygon([(0, 0), (12, 0), (12, 3.2), (0, 3.2)], facecolor="#c4a574", edgecolor="none", zorder=0))
# floor boards subtle lines
for x in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]:
    ax.plot([x, x], [0, 3.2], color="#b8956a", lw=0.6, alpha=0.35, zorder=0.5)
# wall/floor baseboard
ax.add_patch(Rectangle((0, 3.15), 12, 0.12, facecolor="#a67c52", edgecolor="none", zorder=1))

# --- window + curtains ---
# window frame
ax.add_patch(FancyBboxPatch((0.4, 4.6), 2.8, 3.2, boxstyle="round,pad=0.02",
                            facecolor="#7eb8d4", edgecolor="#8b6914", linewidth=3, zorder=2))
# sky gradient suggestion
ax.add_patch(Rectangle((0.55, 6.2), 2.5, 1.45, facecolor="#a8cce0", edgecolor="none", zorder=2.1))
ax.add_patch(Rectangle((0.55, 4.75), 2.5, 1.45, facecolor="#c5dce8", edgecolor="none", zorder=2.1))
# distant soft hills
ax.add_patch(Ellipse((1.2, 5.1), 1.8, 0.7, facecolor="#9bc4a8", edgecolor="none", alpha=0.7, zorder=2.2))
ax.add_patch(Ellipse((2.5, 5.0), 1.5, 0.55, facecolor="#8bb898", edgecolor="none", alpha=0.65, zorder=2.2))
# window cross bars
ax.plot([1.8, 1.8], [4.75, 7.65], color="#8b6914", lw=2, zorder=2.5)
ax.plot([0.55, 3.05], [6.2, 6.2], color="#8b6914", lw=2, zorder=2.5)

# left curtain
curtain_l = Polygon(
    [(0.15, 4.4), (0.55, 4.5), (0.7, 7.9), (0.2, 8.0), (0.1, 4.45)],
    facecolor="#d4786a", edgecolor="#b85a4c", linewidth=1, zorder=3,
)
ax.add_patch(curtain_l)
# right curtain
curtain_r = Polygon(
    [(2.95, 4.5), (3.55, 4.4), (3.65, 8.0), (2.9, 7.9)],
    facecolor="#d4786a", edgecolor="#b85a4c", linewidth=1, zorder=3,
)
ax.add_patch(curtain_r)
# curtain folds
for cx, cy0, cy1 in [(0.35, 4.6, 7.85), (0.5, 4.55, 7.88), (3.15, 4.55, 7.85), (3.4, 4.5, 7.9)]:
    ax.plot([cx, cx + 0.02], [cy0, cy1], color="#c06055", lw=1.2, alpha=0.5, zorder=3.1)
# curtain rod
ax.plot([0.1, 3.7], [8.05, 8.05], color="#8b6914", lw=4, solid_capstyle="round", zorder=3.2)
ax.add_patch(Circle((0.1, 8.05), 0.08, facecolor="#6b5010", edgecolor="none", zorder=3.3))
ax.add_patch(Circle((3.7, 8.05), 0.08, facecolor="#6b5010", edgecolor="none", zorder=3.3))

# --- wall picture frame ---
ax.add_patch(FancyBboxPatch((4.2, 6.8), 1.4, 1.1, boxstyle="round,pad=0.02",
                            facecolor="#f0e8d8", edgecolor="#8b6914", linewidth=2.5, zorder=2))
ax.add_patch(Ellipse((4.9, 7.45), 0.9, 0.55, facecolor="#8ec4a0", edgecolor="none", zorder=2.1))
ax.add_patch(Circle((4.7, 7.55), 0.15, facecolor="#f5e8a0", edgecolor="none", zorder=2.2))

# --- ceiling lamp / pendant light ---
ax.plot([8.2, 8.2], [9.0, 8.35], color="#666666", lw=1.5, zorder=4)
ax.add_patch(Polygon(
    [(7.7, 8.35), (8.7, 8.35), (8.55, 7.85), (7.85, 7.85)],
    facecolor="#f5d76e", edgecolor="#d4a84b", linewidth=1.5, zorder=4,
))
# glow
ax.add_patch(Ellipse((8.2, 7.5), 2.4, 1.0, facecolor="#ffe9a0", edgecolor="none", alpha=0.25, zorder=1.5))
ax.add_patch(Ellipse((8.2, 6.5), 3.5, 2.2, facecolor="#ffe9a0", edgecolor="none", alpha=0.12, zorder=1.4))

# --- TV stand ---
ax.add_patch(FancyBboxPatch((8.6, 3.2), 2.9, 0.55, boxstyle="round,pad=0.02",
                            facecolor="#6b4f35", edgecolor="#4a3520", linewidth=1.5, zorder=5))
# cabinet doors
ax.add_patch(Rectangle((8.75, 3.3), 1.2, 0.35, facecolor="#7a5a3d", edgecolor="#4a3520", linewidth=0.8, zorder=5.1))
ax.add_patch(Rectangle((10.1, 3.3), 1.2, 0.35, facecolor="#7a5a3d", edgecolor="#4a3520", linewidth=0.8, zorder=5.1))
ax.add_patch(Circle((9.35, 3.47), 0.05, facecolor="#c9a84c", edgecolor="none", zorder=5.2))
ax.add_patch(Circle((10.7, 3.47), 0.05, facecolor="#c9a84c", edgecolor="none", zorder=5.2))

# --- TV ---
# TV body
ax.add_patch(FancyBboxPatch((8.85, 3.85), 2.5, 1.85, boxstyle="round,pad=0.03",
                            facecolor="#2a2a2a", edgecolor="#1a1a1a", linewidth=2, zorder=6))
# screen
ax.add_patch(Rectangle((9.0, 4.0), 2.2, 1.55, facecolor="#3a6ea5", edgecolor="none", zorder=6.1))
# screen content - soft landscape / program
ax.add_patch(Rectangle((9.0, 4.0), 2.2, 0.7, facecolor="#5a9e6a", edgecolor="none", zorder=6.2))
ax.add_patch(Ellipse((9.5, 5.15), 0.55, 0.45, facecolor="#f0d878", edgecolor="none", zorder=6.3))
ax.add_patch(Polygon([(10.2, 4.7), (10.8, 5.3), (11.2, 4.7)], facecolor="#6b8f5a", edgecolor="none", zorder=6.3))
# TV stand neck / base
ax.add_patch(Rectangle((9.9, 3.75), 0.4, 0.12, facecolor="#333333", edgecolor="none", zorder=5.5))
# screen glow toward room
ax.add_patch(Wedge((10.1, 4.7), 2.8, 160, 250, facecolor="#6a9fd4", edgecolor="none", alpha=0.08, zorder=1.6))

# --- side table (coffee table) ---
ax.add_patch(Ellipse((5.5, 2.35), 2.4, 0.85, facecolor="#8b6914", edgecolor="#6b4f10", linewidth=1.5, zorder=7))
ax.add_patch(Ellipse((5.5, 2.45), 2.2, 0.7, facecolor="#a67c3d", edgecolor="none", zorder=7.1))
# table legs hint
for lx in [4.55, 6.45]:
    ax.plot([lx, lx - 0.05], [2.0, 1.35], color="#6b4f10", lw=3, zorder=6.5)
    ax.plot([lx, lx + 0.05], [2.0, 1.35], color="#6b4f10", lw=3, zorder=6.5)

# teacup on table
ax.add_patch(Ellipse((5.3, 2.55), 0.35, 0.18, facecolor="#f5f0e6", edgecolor="#c4b8a0", linewidth=1, zorder=8))
ax.add_patch(Rectangle((5.15, 2.45), 0.3, 0.18, facecolor="#f5f0e6", edgecolor="none", zorder=7.9))
ax.add_patch(Arc((5.48, 2.52), 0.18, 0.2, theta1=-60, theta2=60, color="#c4b8a0", lw=1.5, zorder=8.1))
ax.add_patch(Ellipse((5.3, 2.62), 0.22, 0.08, facecolor="#d4a574", edgecolor="none", alpha=0.7, zorder=8.2))

# remote on table
ax.add_patch(FancyBboxPatch((5.85, 2.4), 0.45, 0.18, boxstyle="round,pad=0.01",
                            facecolor="#333333", edgecolor="#222222", linewidth=0.8, zorder=8))
for i, dx in enumerate([0.08, 0.18, 0.28]):
    ax.add_patch(Circle((5.9 + dx, 2.49), 0.03, facecolor="#555555", edgecolor="none", zorder=8.1))

# --- rug ---
ax.add_patch(Ellipse((5.2, 1.6), 4.5, 1.5, facecolor="#c45c4a", edgecolor="#a04035", linewidth=2, zorder=4))
ax.add_patch(Ellipse((5.2, 1.6), 3.8, 1.15, facecolor="#d4786a", edgecolor="none", alpha=0.6, zorder=4.1))
# rug pattern
for a in range(0, 360, 40):
    r = math.radians(a)
    ax.plot(
        [5.2 + 0.3 * math.cos(r), 5.2 + 1.5 * math.cos(r)],
        [1.6 + 0.1 * math.sin(r), 1.6 + 0.45 * math.sin(r)],
        color="#b05045", lw=1, alpha=0.4, zorder=4.2,
    )

# --- sofa / armchair ---
# seat base
ax.add_patch(FancyBboxPatch((1.4, 1.55), 2.6, 1.15, boxstyle="round,pad=0.05",
                            facecolor="#6b8cae", edgecolor="#4a6a8a", linewidth=1.5, zorder=9))
# seat cushion
ax.add_patch(FancyBboxPatch((1.55, 2.0), 2.3, 0.55, boxstyle="round,pad=0.04",
                            facecolor="#7a9cb8", edgecolor="#5a7a98", linewidth=1, zorder=9.5))
# backrest
ax.add_patch(FancyBboxPatch((1.35, 2.4), 2.7, 1.35, boxstyle="round,pad=0.06",
                            facecolor="#6b8cae", edgecolor="#4a6a8a", linewidth=1.5, zorder=8.5))
# armrests
ax.add_patch(FancyBboxPatch((1.2, 1.9), 0.45, 1.1, boxstyle="round,pad=0.04",
                            facecolor="#5a7a98", edgecolor="#3a5a78", linewidth=1, zorder=10))
ax.add_patch(FancyBboxPatch((3.7, 1.9), 0.45, 1.1, boxstyle="round,pad=0.04",
                            facecolor="#5a7a98", edgecolor="#3a5a78", linewidth=1, zorder=10))
# sofa legs
for sx in [1.6, 3.6]:
    ax.add_patch(Rectangle((sx, 1.25), 0.15, 0.35, facecolor="#5a4030", edgecolor="none", zorder=8))

# throw pillow
ax.add_patch(Ellipse((2.0, 2.85), 0.7, 0.55, facecolor="#e8c4a0", edgecolor="#d4a878", linewidth=1, zorder=10.5))

# --- grandmother ---
# body / torso facing toward TV (right)
# skirt / dress lower
ax.add_patch(Polygon(
    [(2.35, 2.15), (3.35, 2.15), (3.55, 2.55), (2.15, 2.55)],
    facecolor="#c45c7a", edgecolor="#a04060", linewidth=1, zorder=11,
))
# torso
ax.add_patch(FancyBboxPatch((2.35, 2.5), 1.0, 1.05, boxstyle="round,pad=0.05",
                            facecolor="#d4789a", edgecolor="#b05878", linewidth=1, zorder=11.5))
# cardigan / shawl
ax.add_patch(Polygon(
    [(2.25, 3.4), (2.4, 2.55), (2.55, 2.55), (2.5, 3.45)],
    facecolor="#e8d0b0", edgecolor="#d4b890", linewidth=0.8, zorder=12,
))
ax.add_patch(Polygon(
    [(3.45, 3.4), (3.3, 2.55), (3.15, 2.55), (3.2, 3.45)],
    facecolor="#e8d0b0", edgecolor="#d4b890", linewidth=0.8, zorder=12,
))

# legs / feet (slippers)
ax.add_patch(Ellipse((2.55, 1.75), 0.45, 0.22, facecolor="#f5e8d0", edgecolor="#d4c4a8", linewidth=1, zorder=10.8))
ax.add_patch(Ellipse((3.15, 1.78), 0.45, 0.22, facecolor="#f5e8d0", edgecolor="#d4c4a8", linewidth=1, zorder=10.8))
# socks hint
ax.add_patch(Rectangle((2.45, 1.85), 0.22, 0.35, facecolor="#e8e0d8", edgecolor="none", zorder=10.7))
ax.add_patch(Rectangle((3.05, 1.88), 0.22, 0.35, facecolor="#e8e0d8", edgecolor="none", zorder=10.7))

# arms - right arm resting, left slightly toward lap; body angled to TV
# left arm (farther from TV)
ax.add_patch(Polygon(
    [(2.35, 3.2), (2.15, 2.7), (2.3, 2.55), (2.5, 3.0)],
    facecolor="#f0c8b0", edgecolor="#d4a890", linewidth=0.8, zorder=12.2,
))
# right arm closer to TV / resting on armrest
ax.add_patch(Polygon(
    [(3.35, 3.15), (3.85, 2.55), (3.95, 2.65), (3.45, 3.25)],
    facecolor="#f0c8b0", edgecolor="#d4a890", linewidth=0.8, zorder=12.2,
))
ax.add_patch(Ellipse((3.95, 2.58), 0.22, 0.16, facecolor="#f0c8b0", edgecolor="#d4a890", linewidth=0.6, zorder=12.3))

# neck
ax.add_patch(Rectangle((2.72, 3.45), 0.28, 0.22, facecolor="#f0c8b0", edgecolor="none", zorder=12.5))

# head - turned toward TV (right)
head_cx, head_cy = 3.05, 3.95
ax.add_patch(Ellipse((head_cx, head_cy), 0.72, 0.85, facecolor="#f0c8b0", edgecolor="#d4a890", linewidth=1, zorder=13))

# hair (gray/white bun + soft waves)
ax.add_patch(Ellipse((head_cx - 0.05, head_cy + 0.15), 0.78, 0.75, facecolor="#d8d0c8", edgecolor="#b8b0a8", linewidth=1, zorder=12.8))
ax.add_patch(Circle((head_cx - 0.15, head_cy + 0.45), 0.28, facecolor="#e8e4e0", edgecolor="#c8c4c0", linewidth=1, zorder=14))
# hair bun
ax.add_patch(Circle((head_cx - 0.25, head_cy + 0.55), 0.22, facecolor="#d0ccc8", edgecolor="#b0aca8", linewidth=0.8, zorder=14.1))
# side hair covering left of face a bit
ax.add_patch(Wedge((head_cx, head_cy), 0.4, 90, 200, facecolor="#d8d0c8", edgecolor="none", zorder=12.9))

# face features - eyes looking RIGHT toward TV
# left eye (farther)
ax.add_patch(Ellipse((head_cx - 0.02, head_cy + 0.05), 0.12, 0.1, facecolor="white", edgecolor="#888888", linewidth=0.6, zorder=14.5))
ax.add_patch(Circle((head_cx + 0.02, head_cy + 0.05), 0.045, facecolor="#4a3a2a", edgecolor="none", zorder=14.6))
# right eye (closer to TV)
ax.add_patch(Ellipse((head_cx + 0.22, head_cy + 0.08), 0.13, 0.1, facecolor="white", edgecolor="#888888", linewidth=0.6, zorder=14.5))
ax.add_patch(Circle((head_cx + 0.27, head_cy + 0.08), 0.05, facecolor="#4a3a2a", edgecolor="none", zorder=14.6))
# soft eyelids / smile wrinkles
ax.plot([head_cx - 0.08, head_cx + 0.06], [head_cy + 0.14, head_cy + 0.16], color="#c4a090", lw=1, zorder=14.7)
ax.plot([head_cx + 0.15, head_cx + 0.32], [head_cy + 0.18, head_cy + 0.2], color="#c4a090", lw=1, zorder=14.7)
# nose
ax.plot([head_cx + 0.12, head_cx + 0.2, head_cx + 0.14], [head_cy + 0.0, head_cy - 0.08, head_cy - 0.12],
        color="#d4a890", lw=1.2, zorder=14.5)
# gentle smile
ax.add_patch(Arc((head_cx + 0.12, head_cy - 0.22), 0.28, 0.18, theta1=200, theta2=340, color="#c07070", lw=1.5, zorder=14.5))
# glasses
ax.add_patch(Circle((head_cx - 0.02, head_cy + 0.05), 0.14, fill=False, edgecolor="#666666", lw=1.2, zorder=14.8))
ax.add_patch(Circle((head_cx + 0.22, head_cy + 0.08), 0.14, fill=False, edgecolor="#666666", lw=1.2, zorder=14.8))
ax.plot([head_cx + 0.12, head_cx + 0.08], [head_cy + 0.06, head_cy + 0.07], color="#666666", lw=1.2, zorder=14.8)
ax.plot([head_cx + 0.36, head_cx + 0.42], [head_cy + 0.1, head_cy + 0.12], color="#666666", lw=1.2, zorder=14.8)

# gaze line hint (subtle dashed toward TV)
ax.annotate(
    "",
    xy=(9.2, 4.7),
    xytext=(head_cx + 0.4, head_cy + 0.05),
    arrowprops=dict(arrowstyle="-", color="#9aa8b8", lw=0.9, linestyle=(0, (3, 4)), alpha=0.45),
    zorder=15,
)

# --- floor lamp near sofa ---
ax.plot([0.7, 0.7], [1.3, 5.2], color="#8b7355", lw=3, zorder=7)
ax.add_patch(Ellipse((0.7, 1.25), 0.55, 0.18, facecolor="#6b5535", edgecolor="#4a3820", linewidth=1, zorder=7))
ax.add_patch(Polygon(
    [(0.3, 5.15), (1.1, 5.15), (1.25, 5.85), (0.15, 5.85)],
    facecolor="#f0d890", edgecolor="#d4b870", linewidth=1.2, zorder=8,
))
ax.add_patch(Ellipse((0.7, 5.5), 1.6, 1.0, facecolor="#ffe8a0", edgecolor="none", alpha=0.2, zorder=1.7))

# --- wall shelf / clock ---
ax.add_patch(Circle((6.8, 7.5), 0.45, facecolor="#f5f0e6", edgecolor="#8b6914", linewidth=2.5, zorder=2))
ax.add_patch(Circle((6.8, 7.5), 0.05, facecolor="#333333", edgecolor="none", zorder=2.1))
# clock hands pointing roughly
ax.plot([6.8, 6.8], [7.5, 7.78], color="#333333", lw=1.5, zorder=2.2)
ax.plot([6.8, 7.05], [7.5, 7.55], color="#333333", lw=1.2, zorder=2.2)

# --- plant in corner ---
ax.add_patch(Polygon([(11.3, 3.2), (11.7, 3.2), (11.85, 3.7), (11.15, 3.7)],
                     facecolor="#c47850", edgecolor="#a05830", linewidth=1, zorder=5))
for angle, length in [(70, 0.9), (90, 1.1), (110, 0.95), (50, 0.7), (130, 0.75)]:
    r = math.radians(angle)
    tip_x = 11.5 + length * math.cos(r)
    tip_y = 3.7 + length * math.sin(r)
    ax.add_patch(Ellipse((tip_x, tip_y), 0.35, 0.55, angle=angle - 90,
                         facecolor="#5a9e6a", edgecolor="#3a7e4a", linewidth=0.6, zorder=5.5))

# --- warm ambient vignette soft patches ---
ax.add_patch(Ellipse((6, 4), 14, 10, facecolor="#fff5e0", edgecolor="none", alpha=0.06, zorder=0.1))

plt.tight_layout(pad=0)
fig.savefig(out, dpi=100, bbox_inches="tight", pad_inches=0.05, facecolor=fig.get_facecolor())
plt.close()
