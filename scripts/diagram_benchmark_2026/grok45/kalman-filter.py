import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Rectangle

output_path = sys.argv[1]

fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor("#f7f7fa")
ax = fig.add_axes([0.02, 0.04, 0.96, 0.92])
ax.set_facecolor("#f7f7fa")
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.axis("off")


def box(cx, cy, w, h, title, body, face, edge):
    p = FancyBboxPatch(
        (cx - w / 2, cy - h / 2), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        linewidth=2.0, edgecolor=edge, facecolor=face, zorder=3,
    )
    ax.add_patch(p)
    ax.text(cx, cy + h * 0.28, title, ha="center", va="center",
            fontsize=11, fontweight="bold", color=edge, zorder=4)
    ax.text(cx, cy - h * 0.12, body, ha="center", va="center",
            fontsize=9.5, color="#1a1a1a", zorder=4, linespacing=1.45)


def arrow(p1, p2, color="#374151", rad=0.0):
    a = FancyArrowPatch(
        p1, p2, connectionstyle=f"arc3,rad={rad}",
        arrowstyle="-|>", mutation_scale=16, linewidth=1.8,
        color=color, zorder=2, shrinkA=1, shrinkB=1,
    )
    ax.add_patch(a)


def label(x, y, text, size=9):
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color="#1f2937",
            zorder=5, bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.9))


ax.text(6.0, 8.55, "Kalman Filter Block Diagram", ha="center", va="center",
        fontsize=16, fontweight="bold", color="#111827")

# Prediction / Measurement / State / Residual / Gain / Update / Delay
box(2.3, 6.3, 3.2, 1.7, "Prediction",
    r"$\hat{x}_{k|k-1}=F\hat{x}_{k-1}$" + "\n" + r"$P_{k|k-1}=FPF^\top+Q$",
    "#dbeafe", "#1d4ed8")
box(6.2, 6.3, 3.0, 1.5, "Measurement",
    r"$z_k = Hx_k + v_k$",
    "#fef3c7", "#b45309")
box(2.3, 2.7, 3.0, 1.5, "State estimate",
    r"$\hat{x}_{k|k}$, $P_{k|k}$",
    "#ccfbf1", "#0f766e")

ax.add_patch(Circle((6.2, 4.35), 0.28, facecolor="#dcfce7", edgecolor="#15803d", lw=1.8, zorder=3))
ax.text(6.2, 4.35, "−", ha="center", va="center", fontsize=14, fontweight="bold", color="#15803d", zorder=4)

box(9.5, 4.35, 2.8, 1.35, "Residual",
    r"$y_k=z_k-H\hat{x}$",
    "#dcfce7", "#15803d")
box(9.5, 2.0, 2.8, 1.35, "Kalman gain",
    r"$K_k=PH^\top S^{-1}$",
    "#ede9fe", "#6d28d9")
box(6.2, 2.0, 3.0, 1.5, "Update",
    r"$\hat{x}=\hat{x}+Ky$" + "\n" + r"$P=(I-KH)P$",
    "#fee2e2", "#b91c1c")
box(2.3, 0.85, 1.8, 0.8, r"$z^{-1}$", "", "#e5e7eb", "#374151")

# arrows
arrow((2.3, 3.45), (2.3, 5.45), "#1d4ed8")
label(1.45, 4.45, "prior")
arrow((3.9, 6.3), (5.92, 4.55), "#1d4ed8")
label(4.55, 5.7, r"$\hat{x}_{k|k-1}$")
arrow((6.2, 5.55), (6.2, 4.63), "#b45309")
arrow((6.48, 4.35), (8.1, 4.35), "#15803d")
arrow((9.5, 3.67), (9.5, 2.68), "#15803d")
arrow((8.1, 2.0), (7.7, 2.0), "#6d28d9")
arrow((2.3, 5.45), (2.3, 4.8), "#1d4ed8")
# predicted state into update
arrow((3.9, 5.7), (6.2, 2.75), "#1d4ed8", rad=-0.15)
label(5.0, 3.7, "predicted")
arrow((4.7, 2.0), (3.8, 2.7), "#b91c1c")
arrow((2.3, 1.95), (2.3, 1.25), "#374151")
# feedback loop
arrow((3.2, 0.85), (4.6, 0.85), "#374151")
arrow((4.6, 0.85), (4.6, 6.3), "#374151")
arrow((4.6, 6.3), (3.9, 6.3), "#374151")
label(5.15, 3.5, "feedback", size=8)

ax.text(11.3, 8.0, "Legend\nPrediction → prior\nUpdate → posterior\nResidual → innovation",
        ha="left", va="top", fontsize=8.5, color="#6b7280")

fig.savefig(output_path, dpi=100, facecolor=fig.get_facecolor())
plt.close(fig)
