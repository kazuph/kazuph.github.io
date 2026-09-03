import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_michelson(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 840, "Michelson Interferometer Schematic", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 805, "Amplitude-Splitting Optical Interferometry with Variable Path Difference",
            ha="center", va="center", fontsize=12, color="#64748b")

    # Center coordinates: Beam Splitter at (550, 450)
    cx, cy = 550, 450

    # Optical Axis Guidelines (dashed)
    ax.plot([150, 1000], [cy, cy], color="#e2e8f0", lw=1.5, ls="--", zorder=1)
    ax.plot([cx, cx], [150, 750], color="#e2e8f0", lw=1.5, ls="--", zorder=1)

    # 1. LASER SOURCE (Left: 180, 450)
    laser_box = patches.FancyBboxPatch((160, 410), 130, 80, boxstyle="round,pad=0.02",
                                       facecolor="#334155", edgecolor="#0f172a", lw=2, zorder=3)
    ax.add_patch(laser_box)
    ax.add_patch(patches.Rectangle((290, 435), 20, 30, facecolor="#475569", edgecolor="#0f172a", lw=1.5, zorder=3))
    ax.add_patch(patches.Circle((305, 450), 7, facecolor="#ef4444", zorder=4))
    ax.text(225, 460, "LASER", ha="center", va="center", fontsize=13, fontweight="bold", color="#f8fafc", zorder=5)
    ax.text(225, 435, r"$\lambda = 632.8\,\mathrm{nm}$", ha="center", va="center", fontsize=10, color="#94a3b8", zorder=5)
    ax.text(225, 385, "Laser Source", ha="center", va="top", fontsize=12, fontweight="bold", color="#1e293b")

    # 2. BEAM SPLITTER (Center: 550, 450, 45 degrees angle)
    bs_poly = patches.Polygon([[cx - 45, cy - 45], [cx - 35, cy - 55], [cx + 45, cy + 25], [cx + 35, cy + 35]],
                              closed=True, facecolor="#bae6fd", edgecolor="#0284c7", lw=2, alpha=0.8, zorder=6)
    ax.add_patch(bs_poly)
    ax.plot([cx - 45, cx + 35], [cy - 45, cy + 35], color="#0369a1", lw=3.5, zorder=7)
    ax.text(cx - 30, cy + 60, "Beam Splitter (BS)\n50:50 Splitting", ha="center", va="bottom",
            fontsize=11, fontweight="bold", color="#0369a1",
            bbox=dict(boxstyle="round,pad=0.3", fc="#f0f9ff", ec="#7dd3fc", lw=1), zorder=8)

    # 3. REFERENCE MIRROR A (Top: 550, 710)
    mirror_a = patches.Rectangle((470, 710), 160, 20, facecolor="#94a3b8", edgecolor="#334155", lw=2, zorder=3)
    ax.add_patch(mirror_a)
    ax.plot([470, 630], [710, 710], color="#0284c7", lw=3.5, zorder=4)
    ax.text(cx, 750, "Fixed Mirror A (Reference)", ha="center", va="bottom",
            fontsize=12, fontweight="bold", color="#1e293b")
    ax.text(cx + 15, 580, r"Path $L_1$", ha="left", va="center", fontsize=11, color="#64748b")

    # 4. MOVABLE MIRROR B (Right: 920, 450)
    mirror_b = patches.Rectangle((920, 370), 20, 160, facecolor="#94a3b8", edgecolor="#334155", lw=2, zorder=3)
    ax.add_patch(mirror_b)
    ax.plot([920, 920], [370, 530], color="#0284c7", lw=3.5, zorder=4)
    ax.add_patch(patches.Rectangle((940, 390), 30, 120, facecolor="#475569", ec="#1e293b", lw=1.5, zorder=3))
    ax.add_patch(patches.Rectangle((970, 435), 40, 30, facecolor="#64748b", ec="#1e293b", lw=1.5, zorder=3))
    ax.annotate("", xy=(890, 345), xytext=(950, 345),
                arrowprops=dict(arrowstyle="<|-|>", color="#2563eb", lw=2.5, mutation_scale=15), zorder=5)
    ax.text(920, 325, r"Movable $\pm\Delta L$", ha="center", va="top", fontsize=11, fontweight="bold", color="#2563eb")
    ax.text(940, 555, "Movable Mirror B", ha="center", va="bottom",
            fontsize=12, fontweight="bold", color="#1e293b")
    ax.text(735, cy + 18, r"Path $L_2$", ha="center", va="bottom", fontsize=11, color="#64748b")

    # 5. OBSERVATION SCREEN & INTERFERENCE FRINGES (Bottom: 550, 200)
    screen_base = patches.Rectangle((450, 190), 200, 20, facecolor="#334155", edgecolor="#0f172a", lw=2, zorder=3)
    ax.add_patch(screen_base)
    fringe_center = (cx, 105)
    ax.add_patch(patches.Circle(fringe_center, 65, facecolor="#0f172a", edgecolor="#475569", lw=2, zorder=4))
    for r in [55, 40, 25, 12]:
        ax.add_patch(patches.Circle(fringe_center, r, fill=False, edgecolor="#ef4444", lw=2.5, zorder=5))
    ax.add_patch(patches.Circle(fringe_center, 4, facecolor="#ffffff", zorder=6))
    ax.text(cx, 225, "Observation Screen / Detector", ha="center", va="bottom",
            fontsize=12, fontweight="bold", color="#1e293b")
    ax.text(cx + 80, 105, "Circular\nFringes", ha="left", va="center",
            fontsize=10, fontweight="bold", color="#b91c1c")

    # 6. LIGHT BEAMS & DIRECTIONAL ARROWS
    c_beam = "#ef4444"
    c_ret = "#f87171"

    # Incident Beam: Laser -> BS
    ax.plot([305, cx], [cy, cy], color=c_beam, lw=3.5, zorder=5)
    ax.annotate("", xy=(440, cy), xytext=(400, cy),
                arrowprops=dict(arrowstyle="-|>", color=c_beam, lw=3.5, mutation_scale=16), zorder=5)

    # Transmitted Beam: BS -> Mirror B
    ax.plot([cx, 920], [cy + 3, cy + 3], color=c_beam, lw=2.5, zorder=5)
    ax.annotate("", xy=(750, cy + 3), xytext=(710, cy + 3),
                arrowprops=dict(arrowstyle="-|>", color=c_beam, lw=2.5, mutation_scale=14), zorder=5)
    ax.plot([920, cx], [cy - 3, cy - 3], color=c_ret, lw=2.5, ls="--", zorder=5)
    ax.annotate("", xy=(710, cy - 3), xytext=(750, cy - 3),
                arrowprops=dict(arrowstyle="-|>", color=c_ret, lw=2.5, mutation_scale=14), zorder=5)

    # Reflected Beam: BS -> Mirror A
    ax.plot([cx - 3, cx - 3], [cy, 710], color=c_beam, lw=2.5, zorder=5)
    ax.annotate("", xy=(cx - 3, 590), xytext=(cx - 3, 550),
                arrowprops=dict(arrowstyle="-|>", color=c_beam, lw=2.5, mutation_scale=14), zorder=5)
    ax.plot([cx + 3, cx + 3], [710, cy], color=c_ret, lw=2.5, ls="--", zorder=5)
    ax.annotate("", xy=(cx + 3, 550), xytext=(cx + 3, 590),
                arrowprops=dict(arrowstyle="-|>", color=c_ret, lw=2.5, mutation_scale=14), zorder=5)

    # Combined Interference Beam: BS -> Screen
    ax.plot([cx, cx], [cy, 210], color="#dc2626", lw=4.5, zorder=5)
    ax.annotate("", xy=(cx, 290), xytext=(cx, 340),
                arrowprops=dict(arrowstyle="-|>", color="#dc2626", lw=4.5, mutation_scale=18), zorder=5)

    # 7. PHYSICS SUMMARY CARD
    card = patches.FancyBboxPatch((130, 210), 260, 140, boxstyle="round,pad=0.02",
                                  facecolor="#f8fafc", edgecolor="#cbd5e1", lw=1.5, zorder=2)
    ax.add_patch(card)
    ax.text(260, 325, "Interference Conditions", ha="center", va="center", fontsize=12, fontweight="bold", color="#0f172a")
    ax.text(145, 295, r"Path Diff: $\Delta = 2|L_1 - L_2|$", ha="left", va="center", fontsize=11, color="#0284c7")
    ax.text(145, 268, r"Bright: $\Delta = m\lambda$", ha="left", va="center", fontsize=11, fontweight="bold", color="#15803d")
    ax.text(145, 240, r"Dark: $\Delta = (m + 1/2)\lambda$", ha="left", va="center", fontsize=11, fontweight="bold", color="#b91c1c")
    ax.text(145, 218, r"$(m = 0, \pm 1, \pm 2, \ldots)$", ha="left", va="center", fontsize=10, color="#64748b")

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python michelson-interferometer.py <output_path>")
        sys.exit(1)
    draw_michelson(sys.argv[1])
