import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Arc, PathPatch
from matplotlib.path import Path

output_path = sys.argv[1]

# ---------------------------------------------------------------------------
# Warm, gentle color palette
# ---------------------------------------------------------------------------
COL_BG_OUTER = "#FBEFDD"
COL_BG_INNER = "#FDF6EA"
COL_SHADOW = "#D8B98C"

COL_FUR_MAIN = "#D9A067"      # main body / head fur
COL_FUR_DARK = "#C68B52"      # limbs, outer ears (slightly darker for depth)
COL_FUR_LIGHT = "#F4DDB4"     # inner ears, muzzle, paw pads, foot pads
COL_OUTLINE = "#8A5A32"       # soft brown outline / stitches

COL_EYE = "#4A2E1E"
COL_NOSE = "#5C3A21"
COL_MOUTH = "#5C3A21"

COL_PATCH = "#E8785A"         # chest wappen (badge)
COL_PATCH_EDGE = "#C85A3E"
COL_STAR = "#FDF6EA"

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(COL_BG_OUTER)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.subplots_adjust(left=0, right=1, top=1, bottom=0)

OUTLINE_W = 2.2


def stitch_arc(center, radius, theta1, theta2, color=COL_OUTLINE, lw=1.6, zorder=10):
    """A soft dashed seam line to suggest plush stitching."""
    arc = Arc(
        center, radius * 2, radius * 2,
        angle=0, theta1=theta1, theta2=theta2,
        edgecolor=color, lw=lw, linestyle=(0, (2, 2)), zorder=zorder,
    )
    ax.add_patch(arc)


def star_points(center, outer_r, inner_r, n=5, rotation=90):
    cx, cy = center
    pts = []
    for i in range(n * 2):
        r = outer_r if i % 2 == 0 else inner_r
        angle = np.deg2rad(rotation + i * (360 / (n * 2)))
        pts.append((cx + r * np.cos(angle), cy + r * np.sin(angle)))
    return pts


# ---------------------------------------------------------------------------
# Background: soft warm glow + ground shadow
# ---------------------------------------------------------------------------
glow = Circle((6.0, 4.6), 4.6, facecolor=COL_BG_INNER, edgecolor="none", zorder=0)
ax.add_patch(glow)

shadow = Ellipse((6.0, 0.65), 5.4, 0.9, facecolor=COL_SHADOW, edgecolor="none",
                  alpha=0.45, zorder=0.5)
ax.add_patch(shadow)

# ---------------------------------------------------------------------------
# Legs (drawn first so the body overlaps their tops, feet peeking out front)
# ---------------------------------------------------------------------------
leg_l = Ellipse((4.3, 1.35), 2.05, 1.85, facecolor=COL_FUR_DARK,
                 edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=1)
leg_r = Ellipse((7.7, 1.35), 2.05, 1.85, facecolor=COL_FUR_DARK,
                 edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=1)
ax.add_patch(leg_l)
ax.add_patch(leg_r)

# foot pads (soles) + little toes, sitting within the visible lower leg area
for cx in (4.3, 7.7):
    pad = Ellipse((cx, 0.78), 1.05, 0.68, facecolor=COL_FUR_LIGHT,
                   edgecolor=COL_OUTLINE, lw=1.4, zorder=1.3)
    ax.add_patch(pad)
    for tx in (cx - 0.34, cx, cx + 0.34):
        toe = Circle((tx, 1.2), 0.15, facecolor=COL_FUR_LIGHT,
                      edgecolor=COL_OUTLINE, lw=1.2, zorder=1.3)
        ax.add_patch(toe)
    stitch_arc((cx, 0.78), 0.62, 20, 160, lw=1.2, zorder=1.4)

# ---------------------------------------------------------------------------
# Body (soft, wide, slightly stuffed-cotton silhouette)
# ---------------------------------------------------------------------------
body = Ellipse((6.0, 3.65), 5.1, 4.3, facecolor=COL_FUR_MAIN,
                edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=2)
ax.add_patch(body)

# belly shading (lighter, softer patch to hint at plush stuffing)
belly = Ellipse((6.0, 3.35), 3.1, 3.0, facecolor=COL_FUR_LIGHT,
                 edgecolor="none", alpha=0.55, zorder=2.1)
ax.add_patch(belly)

# center seam stitch line on belly (classic teddy bear tummy seam)
seam = Path(
    [(6.0, 5.3), (5.85, 4.6), (6.15, 3.7), (5.9, 2.6), (6.0, 1.85)],
    [Path.MOVETO, Path.CURVE3, Path.CURVE3, Path.CURVE3, Path.CURVE3],
)
seam_patch = PathPatch(seam, facecolor="none", edgecolor=COL_OUTLINE,
                        lw=1.4, linestyle=(0, (3, 3)), zorder=2.2)
ax.add_patch(seam_patch)

# ---------------------------------------------------------------------------
# Arms (short, round, hugging the belly)
# ---------------------------------------------------------------------------
arm_l = Ellipse((2.85, 3.55), 1.7, 2.65, angle=18, facecolor=COL_FUR_DARK,
                 edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=2.5)
arm_r = Ellipse((9.15, 3.55), 1.7, 2.65, angle=-18, facecolor=COL_FUR_DARK,
                 edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=2.5)
ax.add_patch(arm_l)
ax.add_patch(arm_r)

paw_l = Circle((2.35, 2.45), 0.48, facecolor=COL_FUR_LIGHT,
                edgecolor=COL_OUTLINE, lw=1.6, zorder=2.6)
paw_r = Circle((9.65, 2.45), 0.48, facecolor=COL_FUR_LIGHT,
                edgecolor=COL_OUTLINE, lw=1.6, zorder=2.6)
ax.add_patch(paw_l)
ax.add_patch(paw_r)
stitch_arc((2.35, 2.45), 0.34, 200, 340, lw=1.1, zorder=2.7)
stitch_arc((9.65, 2.45), 0.34, 200, 340, lw=1.1, zorder=2.7)

# ---------------------------------------------------------------------------
# Chest wappen (patch/badge) with a little cream star
# ---------------------------------------------------------------------------
patch = FancyBboxPatch(
    (5.32, 3.95), 1.36, 1.1,
    boxstyle="round,pad=0.02,rounding_size=0.28",
    facecolor=COL_PATCH, edgecolor=COL_PATCH_EDGE, lw=2.0,
    linestyle=(0, (3, 2)), zorder=3.0,
)
ax.add_patch(patch)
star = Polygon(star_points((6.0, 4.5), 0.42, 0.18), closed=True,
               facecolor=COL_STAR, edgecolor=COL_PATCH_EDGE, lw=1.0, zorder=3.1)
ax.add_patch(star)

# ---------------------------------------------------------------------------
# Ears (outer + inner) — placed so the head overlaps their base, leaving a
# natural attached crescent shape on top of the head
# ---------------------------------------------------------------------------
HEAD_C = (6.0, 6.6)
HEAD_R = 1.9

ear_l_outer = Circle((4.55, 7.65), 1.0, facecolor=COL_FUR_DARK,
                      edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=3)
ear_r_outer = Circle((7.45, 7.65), 1.0, facecolor=COL_FUR_DARK,
                      edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=3)
ax.add_patch(ear_l_outer)
ax.add_patch(ear_r_outer)

ear_l_inner = Circle((4.27, 7.86), 0.5, facecolor=COL_FUR_LIGHT,
                      edgecolor=COL_OUTLINE, lw=1.4, zorder=3.1)
ear_r_inner = Circle((7.73, 7.86), 0.5, facecolor=COL_FUR_LIGHT,
                      edgecolor=COL_OUTLINE, lw=1.4, zorder=3.1)
ax.add_patch(ear_l_inner)
ax.add_patch(ear_r_inner)

# ---------------------------------------------------------------------------
# Head (drawn on top of the ear bases so ears look attached, not floating)
# ---------------------------------------------------------------------------
head = Circle(HEAD_C, HEAD_R, facecolor=COL_FUR_MAIN,
              edgecolor=COL_OUTLINE, lw=OUTLINE_W, zorder=5)
ax.add_patch(head)

# subtle cheek shading for a soft, rounded, plush look
cheek_l = Ellipse((5.05, 6.0), 1.05, 0.85, facecolor=COL_FUR_LIGHT,
                   edgecolor="none", alpha=0.35, zorder=5.1)
cheek_r = Ellipse((6.95, 6.0), 1.05, 0.85, facecolor=COL_FUR_LIGHT,
                   edgecolor="none", alpha=0.35, zorder=5.1)
ax.add_patch(cheek_l)
ax.add_patch(cheek_r)

# muzzle patch
muzzle = Ellipse((6.0, 5.85), 1.75, 1.3, facecolor=COL_FUR_LIGHT,
                  edgecolor=COL_OUTLINE, lw=1.8, zorder=6)
ax.add_patch(muzzle)

# ---------------------------------------------------------------------------
# Face: eyes, nose, mouth
# ---------------------------------------------------------------------------
eye_l = Circle((5.35, 6.75), 0.20, facecolor=COL_EYE, edgecolor="none", zorder=7)
eye_r = Circle((6.65, 6.75), 0.20, facecolor=COL_EYE, edgecolor="none", zorder=7)
ax.add_patch(eye_l)
ax.add_patch(eye_r)

hi_l = Circle((5.29, 6.81), 0.06, facecolor="white", edgecolor="none", zorder=7.1)
hi_r = Circle((6.59, 6.81), 0.06, facecolor="white", edgecolor="none", zorder=7.1)
ax.add_patch(hi_l)
ax.add_patch(hi_r)

# small round rosy cheeks (blush) for extra cuteness
blush_l = Ellipse((4.85, 6.05), 0.5, 0.3, facecolor="#F0A98A", edgecolor="none",
                   alpha=0.5, zorder=6.2)
blush_r = Ellipse((7.15, 6.05), 0.5, 0.3, facecolor="#F0A98A", edgecolor="none",
                   alpha=0.5, zorder=6.2)
ax.add_patch(blush_l)
ax.add_patch(blush_r)

nose = Ellipse((6.0, 6.15), 0.5, 0.36, facecolor=COL_NOSE, edgecolor=COL_OUTLINE,
               lw=1.0, zorder=7)
ax.add_patch(nose)

# stitched "Y" shaped mouth typical of a teddy bear: a short vertical stem
# from the nose, then two soft curves branching down-left and down-right
mouth_path = Path(
    [(6.0, 5.97), (6.0, 5.60)],
    [Path.MOVETO, Path.LINETO],
)
mouth_l = Path(
    [(6.0, 5.60), (5.78, 5.42), (5.58, 5.30)],
    [Path.MOVETO, Path.CURVE3, Path.CURVE3],
)
mouth_r = Path(
    [(6.0, 5.60), (6.22, 5.42), (6.42, 5.30)],
    [Path.MOVETO, Path.CURVE3, Path.CURVE3],
)
for p in (mouth_path, mouth_l, mouth_r):
    ax.add_patch(PathPatch(p, facecolor="none", edgecolor=COL_MOUTH, lw=2.2,
                            capstyle="round", zorder=7))

# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------
fig.savefig(output_path, facecolor=fig.get_facecolor())
plt.close(fig)
