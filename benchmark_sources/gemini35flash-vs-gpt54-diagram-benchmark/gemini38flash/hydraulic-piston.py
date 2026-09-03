import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_hydraulic_piston(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 830, "Hydraulic Cylinder Cross-Section", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 795, "Double-Acting Linear Actuator (Extension Stroke)", ha="center", va="center",
            fontsize=12, color="#64748b")

    # Centerline
    ax.plot([100, 1100], [450, 450], color="#dc2626", lw=1.5, ls="-.", zorder=2)

    # 1. High-Pressure Fluid Chamber (Cap-End / Bore Chamber)
    # X: 220 to 450, Y: 330 to 570
    fluid_in = patches.Rectangle((220, 330), 230, 240, color="#f97316", alpha=0.85, zorder=3)
    ax.add_patch(fluid_in)
    ax.text(335, 450, "High-Pressure\nFluid (P1)", ha="center", va="center",
            fontsize=12, fontweight="bold", color="white", zorder=4)

    # 2. Low-Pressure Fluid Chamber (Rod-End / Annular Chamber)
    # X: 520 to 750, Y: 330 to 570 (except rod in center Y: 400 to 500)
    fluid_out1 = patches.Rectangle((520, 500), 230, 70, color="#38bdf8", alpha=0.85, zorder=3)
    fluid_out2 = patches.Rectangle((520, 330), 230, 70, color="#38bdf8", alpha=0.85, zorder=3)
    ax.add_patch(fluid_out1)
    ax.add_patch(fluid_out2)
    ax.text(635, 535, "Return Fluid (P2)", ha="center", va="center",
            fontsize=11, fontweight="bold", color="white", zorder=4)

    # 3. Piston Rod (Chrome Plated Steel)
    # X: 510 to 1000, Y: 400 to 500
    rod = patches.Rectangle((510, 400), 490, 100, color="#cbd5e1", ec="#334155", lw=2, zorder=5)
    ax.add_patch(rod)
    # Rod Clevis / Eyelet
    clevis = patches.FancyBboxPatch((980, 390), 90, 120, boxstyle="round,pad=0.05",
                                   color="#94a3b8", ec="#334155", lw=2, zorder=5)
    ax.add_patch(clevis)
    ax.add_patch(patches.Circle((1030, 450), 22, color="#ffffff", ec="#334155", lw=2, zorder=6))
    ax.add_patch(patches.Circle((1030, 450), 12, color="#cbd5e1", ec="#475569", lw=1.5, zorder=7))

    # 4. Piston Head
    # X: 450 to 520, Y: 330 to 570
    piston = patches.Rectangle((450, 330), 70, 240, color="#64748b", ec="#1e293b", lw=2.5, hatch="//", zorder=6)
    ax.add_patch(piston)
    # Piston Seals (O-rings)
    for sx in [462, 492]:
        ax.add_patch(patches.Rectangle((sx, 555), 14, 15, color="#0f172a", zorder=7))
        ax.add_patch(patches.Rectangle((sx, 330), 14, 15, color="#0f172a", zorder=7))

    # 5. Cylinder Tube Walls & End Caps
    # Top wall
    ax.add_patch(patches.Rectangle((180, 570), 600, 45, color="#475569", ec="#1e293b", lw=2, hatch="\\", zorder=8))
    # Bottom wall
    ax.add_patch(patches.Rectangle((180, 285), 600, 45, color="#475569", ec="#1e293b", lw=2, hatch="\\", zorder=8))
    # Cap-End Cap (Left)
    ax.add_patch(patches.Rectangle((130, 285), 90, 330, color="#475569", ec="#1e293b", lw=2.5, hatch="\\", zorder=8))
    ax.add_patch(patches.Circle((150, 450), 16, color="#ffffff", ec="#1e293b", lw=2, zorder=9))
    # Rod-End Cap / Gland (Right)
    ax.add_patch(patches.Rectangle((750, 500), 70, 115, color="#475569", ec="#1e293b", lw=2, hatch="\\", zorder=8))
    ax.add_patch(patches.Rectangle((750, 285), 70, 115, color="#475569", ec="#1e293b", lw=2, hatch="\\", zorder=8))
    # Rod Gland Seals & Wiper
    ax.add_patch(patches.Rectangle((770, 500), 12, 14, color="#0f172a", zorder=9))
    ax.add_patch(patches.Rectangle((795, 500), 10, 10, color="#e11d48", zorder=9))
    ax.add_patch(patches.Rectangle((770, 386), 12, 14, color="#0f172a", zorder=9))
    ax.add_patch(patches.Rectangle((795, 390), 10, 10, color="#e11d48", zorder=9))

    # 6. Ports & Flow Arrows
    # Port A (Inlet)
    ax.add_patch(patches.Rectangle((270, 615), 45, 55, color="#475569", ec="#1e293b", lw=2, zorder=8))
    ax.add_patch(patches.Rectangle((280, 570), 25, 90, color="#ea580c", zorder=9))
    ax.annotate("", xy=(292, 540), xytext=(292, 690),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=4, mutation_scale=18), zorder=10)
    ax.text(292, 715, "Port A (Inlet)", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#ea580c")

    # Port B (Outlet)
    ax.add_patch(patches.Rectangle((650, 615), 45, 55, color="#475569", ec="#1e293b", lw=2, zorder=8))
    ax.add_patch(patches.Rectangle((660, 570), 25, 90, color="#0284c7", zorder=9))
    ax.annotate("", xy=(672, 690), xytext=(672, 540),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=4, mutation_scale=18), zorder=10)
    ax.text(672, 715, "Port B (Outlet)", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#0284c7")

    # Extension Motion Arrow
    ax.annotate("", xy=(920, 450), xytext=(760, 450),
                arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=5, mutation_scale=22), zorder=11)
    ax.text(840, 475, "Extension Force F ->", ha="center", va="bottom", fontsize=11, fontweight="bold", color="#15803d")

    # Callout Labels & Leader Lines
    # Label styling
    lbl_style = dict(boxstyle="round,pad=0.3", fc="#f8fafc", ec="#94a3b8", lw=1)

    # Cylinder Barrel
    ax.plot([400, 400], [615, 680], color="#475569", lw=1.2, zorder=12)
    ax.plot(400, 615, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(400, 695, "Cylinder Barrel", ha="center", va="bottom", fontsize=11, fontweight="bold", bbox=lbl_style)

    # Piston
    ax.plot([485, 485], [330, 230], color="#475569", lw=1.2, zorder=12)
    ax.plot(485, 330, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(485, 215, "Piston Head", ha="center", va="top", fontsize=11, fontweight="bold", bbox=lbl_style)

    # Piston Rod
    ax.plot([860, 860], [500, 630], color="#475569", lw=1.2, zorder=12)
    ax.plot(860, 500, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(860, 645, "Piston Rod", ha="center", va="bottom", fontsize=11, fontweight="bold", bbox=lbl_style)

    # Piston Seals
    ax.plot([500, 540], [570, 640], color="#475569", lw=1.2, zorder=12)
    ax.plot(500, 570, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(540, 655, "Piston Seals", ha="left", va="bottom", fontsize=10, bbox=lbl_style)

    # Rod Gland & Wiper
    ax.plot([800, 800], [285, 230], color="#475569", lw=1.2, zorder=12)
    ax.plot(800, 285, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(800, 215, "Rod Gland & Wiper", ha="center", va="top", fontsize=11, fontweight="bold", bbox=lbl_style)

    # Clevis
    ax.plot([1030, 1030], [390, 310], color="#475569", lw=1.2, zorder=12)
    ax.plot(1030, 390, "o", color="#1e293b", ms=4, zorder=12)
    ax.text(1030, 295, "Rod End Clevis", ha="center", va="top", fontsize=11, fontweight="bold", bbox=lbl_style)

    # Formula Card at bottom
    ax.text(600, 110, r"$F = P_1 \cdot A_{\mathrm{bore}} - P_2 \cdot (A_{\mathrm{bore}} - A_{\mathrm{rod}})$",
            ha="center", va="center", fontsize=14,
            bbox=dict(boxstyle="round,pad=0.5", fc="#fff7ed", ec="#fdba74", lw=1.5), zorder=15)

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python hydraulic-piston.py <output_path>")
        sys.exit(1)
    draw_hydraulic_piston(sys.argv[1])
