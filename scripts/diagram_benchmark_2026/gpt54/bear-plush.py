from matplotlib import patches
import matplotlib.pyplot as plt
import sys


output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=120)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.axis("off")
fig.patch.set_facecolor("#fffaf5")
ax.set_facecolor("#fffaf5")


def add(patch):
    ax.add_patch(patch)


shadow = patches.Ellipse((6, 1.0), 4.3, 0.45, facecolor="#ead8c8", edgecolor="none")
add(shadow)

# Ears
add(patches.Circle((4.55, 6.95), 0.9, facecolor="#b77a4d", edgecolor="none"))
add(patches.Circle((7.45, 6.95), 0.9, facecolor="#b77a4d", edgecolor="none"))
add(patches.Circle((4.55, 6.95), 0.45, facecolor="#e8c9af", edgecolor="none"))
add(patches.Circle((7.45, 6.95), 0.45, facecolor="#e8c9af", edgecolor="none"))

# Head and muzzle
add(patches.Circle((6, 5.8), 2.05, facecolor="#c98a5e", edgecolor="none"))
add(patches.Ellipse((6, 5.15), 2.3, 1.8, facecolor="#efdcc9", edgecolor="none"))
add(patches.Circle((5.28, 5.82), 0.12, facecolor="#2b211d", edgecolor="none"))
add(patches.Circle((6.72, 5.82), 0.12, facecolor="#2b211d", edgecolor="none"))
add(patches.Circle((5.2, 5.9), 0.04, facecolor="#ffffff", edgecolor="none", alpha=0.75))
add(patches.Circle((6.64, 5.9), 0.04, facecolor="#ffffff", edgecolor="none", alpha=0.75))
add(patches.Ellipse((6, 5.25), 0.65, 0.46, facecolor="#50362c", edgecolor="none"))

# Body
add(patches.Ellipse((6, 2.95), 4.4, 4.1, facecolor="#c98a5e", edgecolor="none"))
add(patches.Ellipse((6, 2.85), 2.6, 2.9, facecolor="#f2e4d5", edgecolor="none"))

# Arms and legs
add(patches.Ellipse((4.1, 3.35), 1.4, 2.5, angle=338, facecolor="#c98a5e", edgecolor="none"))
add(patches.Ellipse((7.9, 3.35), 1.4, 2.5, angle=22, facecolor="#c98a5e", edgecolor="none"))
add(patches.Ellipse((4.8, 1.45), 1.55, 2.2, facecolor="#c98a5e", edgecolor="none"))
add(patches.Ellipse((7.2, 1.45), 1.55, 2.2, facecolor="#c98a5e", edgecolor="none"))
for x in (4.8, 7.2):
    add(patches.Ellipse((x, 1.0), 0.95, 0.62, facecolor="#efdcc9", edgecolor="none"))
for x0 in (4.58, 4.8, 5.02, 6.98, 7.2, 7.42):
    add(patches.Circle((x0, 1.02 if x0 in (4.58, 5.02, 6.98, 7.42) else 1.15), 0.07, facecolor="#c98a5e", edgecolor="none"))

# Ribbon and stitch
add(patches.Polygon([[6, 4.38], [5.58, 3.98], [6, 3.58], [6.42, 3.98]], closed=True, facecolor="#8f6de0", edgecolor="none"))
add(patches.Circle((6, 3.98), 0.16, facecolor="#fff7f2", edgecolor="none"))
ax.plot([5.22, 6.0, 6.78], [3.05, 3.4, 3.05], color="#d8b188", linewidth=6, solid_capstyle="round")
ax.plot([5.45, 6.0, 6.55], [3.45, 3.7, 3.45], color="#d8b188", linewidth=5, alpha=0.85, solid_capstyle="round")

# Patch
add(patches.Circle((6.9, 2.98), 0.42, facecolor="#f9f4ea", edgecolor="#8f6de0", linewidth=4))
ax.plot([6.72, 6.84, 7.14], [2.98, 2.82, 3.16], color="#8f6de0", linewidth=4, solid_capstyle="round", solid_joinstyle="round")

# Face lines
ax.plot([6, 6], [5.06, 4.86], color="#50362c", linewidth=4, solid_capstyle="round")
ax.plot([5.65, 6.0, 6.35], [4.8, 4.55, 4.8], color="#50362c", linewidth=5, solid_capstyle="round")
ax.plot([5.08, 5.3, 5.48], [5.58, 5.66, 5.6], color="#8a5b3d", linewidth=4, alpha=0.75, solid_capstyle="round")
ax.plot([6.52, 6.7, 6.92], [5.6, 5.66, 5.58], color="#8a5b3d", linewidth=4, alpha=0.75, solid_capstyle="round")

plt.tight_layout()
fig.savefig(output_path, bbox_inches="tight", pad_inches=0.15)
