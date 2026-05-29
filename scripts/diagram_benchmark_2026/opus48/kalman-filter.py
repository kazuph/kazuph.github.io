import sys

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#ffffff")

COL = {"pred": "#3b82f6", "upd": "#10b981", "meas": "#f59e0b", "state": "#8b5cf6"}


def box(cx, cy, w, h, color, title, sub):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.12",
                 linewidth=2, edgecolor=color, facecolor=color + "2e"))
    ax.text(cx, cy + 0.28, title, ha="center", va="center", fontsize=13,
            fontweight="bold", color="#1f2933")
    ax.text(cx, cy - 0.34, sub, ha="center", va="center", fontsize=11, color="#374151")
    return (cx, cy, w, h)


pred = box(2.6, 6.0, 3.0, 1.4, COL["pred"], "Prediction", r"$\hat{x}_k^-,\ P_k^-$")
meas = box(2.6, 2.2, 3.0, 1.4, COL["meas"], "Measurement", r"$z_k$")
upd = box(6.9, 4.1, 3.1, 1.4, COL["upd"], "Update", r"Kalman gain $K_k$")
state = box(10.3, 4.1, 2.9, 1.4, COL["state"], "State estimate", r"$\hat{x}_k,\ P_k$")


def arrow(p0, p1, color="#4b5563", dashed=False, lw=2):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=18,
                 color=color, lw=lw, ls="--" if dashed else "-",
                 shrinkA=0, shrinkB=0))


# signal flow
arrow((4.1, 6.0), (5.5, 4.7))
ax.text(4.7, 5.6, r"$\hat{x}_k^-$", fontsize=12, color="#374151")
arrow((4.1, 2.2), (5.5, 3.5))
ax.text(4.7, 2.5, r"$z_k$", fontsize=12, color="#374151")
arrow((8.45, 4.1), (8.85, 4.1))
ax.text(8.65, 4.5, r"$\hat{x}_k$", fontsize=12, color="#374151", ha="center")

# residual annotation
ax.text(4.55, 3.35, r"residual $z_k-H\hat{x}_k^-$", fontsize=10, color="#b91c1c", ha="center")

# control input
arrow((0.5, 6.0), (1.1, 6.0))
ax.text(0.5, 6.45, r"control $u_k$", fontsize=11, color="#374151")

# delay block + feedback
ax.add_patch(FancyBboxPatch((6.3, 6.7), 1.2, 0.9,
             boxstyle="round,pad=0.02,rounding_size=0.1",
             linewidth=1.5, edgecolor="#6b7280", facecolor="#f3f4f6"))
ax.text(6.9, 7.15, r"$z^{-1}$", ha="center", va="center", fontsize=13, color="#374151")
arrow((10.3, 4.8), (10.3, 7.15), color="#b91c1c", dashed=True)
arrow((10.3, 7.15), (7.5, 7.15), color="#b91c1c", dashed=True)
arrow((6.3, 7.15), (2.6, 7.15), color="#b91c1c", dashed=True)
arrow((2.6, 7.15), (2.6, 6.7), color="#b91c1c", dashed=True)
ax.text(4.4, 7.4, r"prev $\hat{x}_{k-1}$", fontsize=10, color="#b91c1c", ha="center")

# phase notes
ax.text(2.6, 7.9, "Time update (predict)", ha="center", fontsize=10, color="#9ca3af")
ax.text(6.9, 5.4, "Measurement update (correct)", ha="center", fontsize=10, color="#9ca3af")

ax.text(6, 8.6, "Kalman Filter — Block Diagram", ha="center", fontsize=17,
        fontweight="bold", color="#1f2933")

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
