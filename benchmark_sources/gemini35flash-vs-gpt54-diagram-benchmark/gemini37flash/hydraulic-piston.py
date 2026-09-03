import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, Circle

def draw_hydraulic_piston(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    # Dark technical background
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Header
    ax.text(600, 840, 'Double-Acting Hydraulic Cylinder', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 805, 'Cross-Sectional Structure & Working Principle (Extension Stroke)',
            color='#94a3b8', fontsize=13, ha='center', va='center')

    # Cylinder Base Parameters
    # Internal Bore: y from 350 to 570 (height 220)
    # Barrel: x from 170 to 890 (length 720)
    # Piston Head: x from 490 to 550 (width 60)
    # Piston Rod: x from 550 to 1010, y from 425 to 495 (height 70)

    # 1. FLUID VOLUMES
    # Cap-End Chamber (High Pressure Blue)
    ax.add_patch(Rectangle((200, 350), 290, 220, color='#0284c7', alpha=0.85))
    # Rod-End Chamber (Low Pressure Amber)
    ax.add_patch(Rectangle((550, 350), 280, 220, color='#f59e0b', alpha=0.4))

    # Ports Fluid Volume
    ax.add_patch(Rectangle((280, 570), 60, 60, color='#0284c7', alpha=0.85))
    ax.add_patch(Rectangle((700, 570), 60, 60, color='#f59e0b', alpha=0.4))

    # 2. PISTON & ROD
    # Steel Rod
    ax.add_patch(Rectangle((550, 425), 460, 70, facecolor='#e2e8f0', edgecolor='#475569', lw=2))
    # Rod Clevis End
    clevis = Polygon([(1010, 420), (1060, 420), (1090, 460), (1060, 500), (1010, 500)],
                     facecolor='#cbd5e1', edgecolor='#334155', lw=2)
    ax.add_patch(clevis)
    ax.add_patch(Circle((1050, 460), 16, facecolor='#1e293b', edgecolor='#cbd5e1', lw=3))

    # Piston Head
    ax.add_patch(Rectangle((490, 350), 60, 220, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    # Dynamic Seals
    ax.add_patch(Rectangle((510, 560), 20, 15, facecolor='#ef4444', edgecolor='#991b1b', lw=1.5))
    ax.add_patch(Rectangle((510, 345), 20, 15, facecolor='#ef4444', edgecolor='#991b1b', lw=1.5))

    # 3. BARREL & CASING (Hatched Metal Walls)
    # Top wall
    ax.add_patch(Rectangle((170, 570), 110, 40, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    ax.add_patch(Rectangle((340, 570), 360, 40, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    ax.add_patch(Rectangle((760, 570), 100, 40, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    # Bottom wall
    ax.add_patch(Rectangle((170, 310), 690, 40, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))

    # Left Cap End (Blind End)
    ax.add_patch(Rectangle((140, 310), 60, 300, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    ax.add_patch(Circle((155, 460), 14, facecolor='#1e293b', edgecolor='#cbd5e1', lw=3))

    # Right Gland End
    ax.add_patch(Rectangle((830, 495), 40, 115, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    ax.add_patch(Rectangle((830, 310), 40, 115, facecolor='#64748b', edgecolor='#334155', hatch='//', lw=2))
    # Rod seals
    ax.add_patch(Rectangle((840, 485), 16, 12, color='#ef4444'))
    ax.add_patch(Rectangle((840, 423), 16, 12, color='#ef4444'))

    # Port Pipes
    ax.add_patch(Rectangle((280, 630), 60, 35, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    ax.add_patch(Rectangle((700, 630), 60, 35, facecolor='#94a3b8', edgecolor='#334155', lw=2))

    # Centerline
    ax.plot([100, 1140], [460, 460], color='#94a3b8', ls='-.', lw=1.2, alpha=0.5)

    # 4. FLOW ARROWS & MOTION
    # Inflow arrows
    ax.annotate('', xy=(310, 580), xytext=(310, 710),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=3.5, mutation_scale=18))
    for fy in [380, 420, 460, 500, 540]:
        ax.annotate('', xy=(485, fy), xytext=(430, fy),
                    arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5, mutation_scale=14))

    # Outflow arrows
    ax.annotate('', xy=(730, 710), xytext=(730, 580),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=3.0, mutation_scale=18))

    # Motion Arrow
    ax.annotate('', xy=(940, 460), xytext=(780, 460),
                arrowprops=dict(arrowstyle='-|>', color='#22c55e', lw=5.0, mutation_scale=22))
    ax.text(860, 430, 'MOTION (F = P·A)', color='#4ade80', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#14532d', edgecolor='#22c55e', lw=1))

    # 5. LABELS & CALLOUT BOXES
    # Port A
    ax.text(310, 750, 'Port A (Fluid Inlet: $P_1$)', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#0c4a6e', edgecolor='#38bdf8', lw=1.5))
    # Port B
    ax.text(730, 750, 'Port B (Fluid Return: $P_2$)', color='#fbbf24', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#713f12', edgecolor='#fbbf24', lw=1.5))

    # Cylinder Barrel
    ax.text(520, 680, 'Cylinder Barrel', color='#f8fafc', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#1e293b', edgecolor='#94a3b8', lw=1.2))
    ax.plot([520, 520], [665, 610], color='#94a3b8', lw=1.2)

    # Cap-End Chamber
    ax.text(320, 230, 'Cap-End Chamber\n(Full Bore Area $A_1$)', color='#38bdf8', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#0284c7', lw=1.5))
    ax.plot([320, 320], [270, 350], color='#0284c7', lw=1.2)

    # Piston & Seals
    ax.text(520, 230, 'Piston & Seals\n(Dynamic O-Rings)', color='#f87171', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#ef4444', lw=1.5))
    ax.plot([520, 520], [270, 345], color='#ef4444', lw=1.2)

    # Rod-End Chamber
    ax.text(710, 230, 'Rod-End Chamber\n(Annular Area $A_2$)', color='#fbbf24', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#f59e0b', lw=1.5))
    ax.plot([710, 710], [270, 350], color='#f59e0b', lw=1.2)

    # Piston Rod
    ax.text(910, 230, 'Piston Rod\n(Hard Chrome Plated)', color='#f8fafc', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#cbd5e1', lw=1.5))
    ax.plot([910, 910], [270, 425], color='#cbd5e1', lw=1.2)

    # Summary Card
    formula_text = r"$\mathbf{Extension\ Force:}\ F_{ext} = P_1 \cdot A_{piston} - P_2 \cdot (A_{piston} - A_{rod})$"
    desc_text = "Pressurized hydraulic fluid enters Port A, driving the piston forward and expelling return fluid via Port B."
    ax.text(600, 100, formula_text + "\n" + desc_text, color='#f8fafc', fontsize=12, ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.6', facecolor='#1e293b', edgecolor='#334155', lw=1.5))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_hydraulic_piston(sys.argv[1])
    else:
        draw_hydraulic_piston('hydraulic-piston.png')
