import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon

out = sys.argv[1]
fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#f7f5f0")
ax.set_facecolor("#f7f5f0")

steel = "#6b7280"
steel_dark = "#4b5563"
piston_c = "#374151"
rod_c = "#9ca3af"
oil_left = "#93c5fd"
oil_right = "#fca5a5"
housing = "#d1d5db"
port = "#1f2937"
label_bg = "#ffffff"

# Cylinder housing
ax.add_patch(Rectangle((1.2, 5.6), 7.6, 0.55, facecolor=housing, edgecolor=steel_dark, lw=2, zorder=3))
ax.add_patch(Rectangle((1.2, 2.85), 7.6, 0.55, facecolor=housing, edgecolor=steel_dark, lw=2, zorder=3))
ax.add_patch(FancyBboxPatch((0.7, 2.85), 0.7, 3.3, boxstyle="round,pad=0.02,rounding_size=0.08",
                            facecolor=steel, edgecolor=steel_dark, lw=2, zorder=4))
ax.add_patch(FancyBboxPatch((8.6, 2.85), 0.85, 3.3, boxstyle="round,pad=0.02,rounding_size=0.08",
                            facecolor=steel, edgecolor=steel_dark, lw=2, zorder=4))
ax.plot([1.4, 8.6], [5.6, 5.6], color=steel_dark, lw=1.5, zorder=3)
ax.plot([1.4, 8.6], [3.4, 3.4], color=steel_dark, lw=1.5, zorder=3)

# Pressure chambers
ax.add_patch(Rectangle((1.4, 3.4), 2.55, 2.2, facecolor=oil_left, edgecolor="none", alpha=0.85, zorder=1))
ax.add_patch(Rectangle((5.15, 3.4), 3.45, 2.2, facecolor=oil_right, edgecolor="none", alpha=0.75, zorder=1))
for y in [3.7, 4.1, 4.5, 4.9, 5.3]:
    ax.plot([1.55, 3.8], [y, y], color="#60a5fa", lw=0.8, alpha=0.35, zorder=2)
    ax.plot([5.3, 8.4], [y, y], color="#f87171", lw=0.8, alpha=0.3, zorder=2)

# Piston and seals
ax.add_patch(FancyBboxPatch((3.95, 3.45), 1.2, 2.1, boxstyle="round,pad=0.01,rounding_size=0.06",
                            facecolor=piston_c, edgecolor="#111827", lw=2, zorder=5))
for dy in [0.25, 1.05, 1.85]:
    ax.add_patch(Rectangle((3.95, 3.45 + dy), 1.2, 0.12, facecolor="#f59e0b", edgecolor="#b45309", lw=0.8, zorder=6))

# Piston rod
ax.add_patch(FancyBboxPatch((5.15, 4.15), 4.6, 0.7, boxstyle="round,pad=0.01,rounding_size=0.05",
                            facecolor=rod_c, edgecolor=steel_dark, lw=2, zorder=5))
ax.add_patch(Circle((9.9, 4.5), 0.28, facecolor=rod_c, edgecolor=steel_dark, lw=2, zorder=6))
ax.plot([9.75, 10.05], [4.35, 4.65], color=steel_dark, lw=1.5, zorder=7)
ax.plot([9.75, 10.05], [4.65, 4.35], color=steel_dark, lw=1.5, zorder=7)
ax.add_patch(Rectangle((8.7, 4.0), 0.65, 1.0, facecolor="#4b5563", edgecolor="#111827", lw=1.2, zorder=6))

# Ports
ax.add_patch(Rectangle((2.15, 2.35), 0.7, 0.55, facecolor=port, edgecolor="#000", lw=1.5, zorder=4))
ax.add_patch(Rectangle((2.3, 1.85), 0.4, 0.55, facecolor=port, edgecolor="#000", lw=1.5, zorder=4))
ax.add_patch(Rectangle((6.6, 2.35), 0.7, 0.55, facecolor=port, edgecolor="#000", lw=1.5, zorder=4))
ax.add_patch(Rectangle((6.75, 1.85), 0.4, 0.55, facecolor=port, edgecolor="#000", lw=1.5, zorder=4))

# Flow arrows: pressure into cap side (extend)
ax.annotate("", xy=(2.5, 3.55), xytext=(2.5, 1.7),
            arrowprops=dict(arrowstyle="-|>", color="#1d4ed8", lw=2.5, mutation_scale=18), zorder=8)
ax.annotate("", xy=(3.2, 4.5), xytext=(2.0, 4.5),
            arrowprops=dict(arrowstyle="-|>", color="#1d4ed8", lw=2.2, mutation_scale=14), zorder=8)
ax.annotate("", xy=(3.2, 5.1), xytext=(2.0, 5.1),
            arrowprops=dict(arrowstyle="-|>", color="#1d4ed8", lw=2.2, mutation_scale=14), zorder=8)

# Return flow from rod side
ax.annotate("", xy=(6.95, 1.7), xytext=(6.95, 3.55),
            arrowprops=dict(arrowstyle="-|>", color="#b91c1c", lw=2.5, mutation_scale=18), zorder=8)
ax.annotate("", xy=(7.0, 4.5), xytext=(8.1, 4.5),
            arrowprops=dict(arrowstyle="-|>", color="#b91c1c", lw=2.0, mutation_scale=14), zorder=8)
ax.annotate("", xy=(7.0, 5.1), xytext=(8.1, 5.1),
            arrowprops=dict(arrowstyle="-|>", color="#b91c1c", lw=2.0, mutation_scale=14), zorder=8)

# Rod extension motion
ax.annotate("", xy=(11.1, 4.5), xytext=(10.35, 4.5),
            arrowprops=dict(arrowstyle="-|>", color="#065f46", lw=3, mutation_scale=20), zorder=8)

# Mounting feet
ax.add_patch(Polygon([(0.75, 2.85), (0.55, 2.4), (1.35, 2.4), (1.15, 2.85)],
                     closed=True, facecolor=steel, edgecolor=steel_dark, lw=1.5, zorder=4))
ax.add_patch(Polygon([(8.75, 2.85), (8.55, 2.4), (9.35, 2.4), (9.15, 2.85)],
                     closed=True, facecolor=steel, edgecolor=steel_dark, lw=1.5, zorder=4))

ax.text(6.0, 8.35, "Hydraulic Piston - Cross Section (Double-Acting)",
        ha="center", va="center", fontsize=16, fontweight="bold", color="#111827", zorder=10)
ax.text(6.0, 7.85, "Cap-side pressure extends the rod; rod-side oil returns to tank",
        ha="center", va="center", fontsize=10, color="#4b5563", style="italic", zorder=10)


def label(x, y, text, ha="center"):
    ax.text(x, y, text, ha=ha, va="center", fontsize=11, fontweight="medium",
            color="#111827",
            bbox=dict(boxstyle="round,pad=0.25", facecolor=label_bg, edgecolor="#9ca3af", lw=0.8),
            zorder=10)


label(2.65, 6.55, "Cap-side\npressure chamber")
label(6.8, 6.55, "Rod-side\npressure chamber")
label(4.55, 7.15, "Piston")
label(7.8, 3.0, "Piston rod")
label(5.0, 2.1, "Cylinder tube")
label(2.5, 1.35, "Port A (P)")
label(6.95, 1.35, "Port B (T)")
label(9.2, 6.2, "Rod gland")
label(10.85, 5.15, "Extend")
ax.text(4.55, 4.5, "Seals", ha="center", va="center", fontsize=9,
        color="#fbbf24", fontweight="bold", zorder=10)

ax.annotate("", xy=(4.55, 5.55), xytext=(4.55, 6.95),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)
ax.annotate("", xy=(2.65, 5.55), xytext=(2.65, 6.2),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)
ax.annotate("", xy=(6.8, 5.55), xytext=(6.8, 6.2),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)
ax.annotate("", xy=(9.0, 5.0), xytext=(9.2, 5.95),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)
ax.annotate("", xy=(7.5, 4.15), xytext=(7.8, 3.25),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)
ax.annotate("", xy=(5.0, 2.85), xytext=(5.0, 2.35),
            arrowprops=dict(arrowstyle="-", color="#6b7280", lw=1), zorder=7)

ax.add_patch(Rectangle((0.5, 0.35), 0.35, 0.35, facecolor=oil_left, edgecolor="#1e40af", lw=1, zorder=9))
ax.text(1.0, 0.52, "Pressurized oil (in)", ha="left", va="center", fontsize=9, color="#1e3a8a")
ax.add_patch(Rectangle((3.8, 0.35), 0.35, 0.35, facecolor=oil_right, edgecolor="#991b1b", lw=1, zorder=9))
ax.text(4.3, 0.52, "Return oil (out)", ha="left", va="center", fontsize=9, color="#7f1d1d")
ax.add_patch(Rectangle((7.0, 0.35), 0.35, 0.35, facecolor=piston_c, edgecolor="#111827", lw=1, zorder=9))
ax.text(7.5, 0.52, "Piston / seals", ha="left", va="center", fontsize=9, color="#111827")
ax.add_patch(Rectangle((9.5, 0.35), 0.35, 0.35, facecolor=housing, edgecolor=steel_dark, lw=1, zorder=9))
ax.text(10.0, 0.52, "Cylinder body", ha="left", va="center", fontsize=9, color="#111827")

plt.tight_layout(pad=0.4)
fig.savefig(out, dpi=100, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
