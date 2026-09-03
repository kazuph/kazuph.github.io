import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_hydraulic_piston(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_steel = '#708090'
    c_darksteel = '#4A5568'
    c_piston = '#E53E3E'
    c_fluid_hi = '#3182CE'
    c_fluid_lo = '#90CDF4'
    c_bg = '#F7FAFC'

    fig.patch.set_facecolor(c_bg)

    # Cylinder Housing (Outer wall)
    ax.add_patch(patches.Rectangle((-4.5, -2.2), 6.5, 4.4, facecolor='#E2E8F0', edgecolor=c_darksteel, linewidth=2))
    # Cylinder Chamber (Interior)
    ax.add_patch(patches.Rectangle((-4.0, -1.6), 5.5, 3.2, facecolor='white', edgecolor=c_darksteel, linewidth=2))

    # High Pressure Chamber (Left)
    ax.add_patch(patches.Rectangle((-4.0, -1.6), 2.8, 3.2, facecolor=c_fluid_hi, alpha=0.5))

    # Low Pressure Chamber (Right)
    ax.add_patch(patches.Rectangle((-0.6, -1.6), 2.1, 3.2, facecolor=c_fluid_lo, alpha=0.3))

    # Piston Head
    ax.add_patch(patches.Rectangle((-1.2, -1.58), 0.6, 3.16, facecolor=c_piston, edgecolor='black', linewidth=1.5))
    # Seals
    ax.add_patch(patches.Rectangle((-1.2, 1.35), 0.6, 0.23, facecolor='black'))
    ax.add_patch(patches.Rectangle((-1.2, -1.58), 0.6, 0.23, facecolor='black'))

    # Piston Rod
    ax.add_patch(patches.Rectangle((-0.6, -0.45), 5.4, 0.9, facecolor=c_steel, edgecolor='black', linewidth=1.5))
    # Rod Guide Seals on right wall
    ax.add_patch(patches.Rectangle((1.5, -1.6), 0.5, 1.15, facecolor=c_darksteel, edgecolor='black', linewidth=1))
    ax.add_patch(patches.Rectangle((1.5, 0.45), 0.5, 1.15, facecolor=c_darksteel, edgecolor='black', linewidth=1))

    # Fluid Ports (Top Inflow / Outflow)
    ax.add_patch(patches.Rectangle((-3.2, 1.6), 0.8, 1.0, facecolor='white', edgecolor=c_darksteel, linewidth=1.5))
    ax.add_patch(patches.Rectangle((-3.15, 1.6), 0.7, 0.95, facecolor=c_fluid_hi, alpha=0.5))

    ax.add_patch(patches.Rectangle((0.2, 1.6), 0.8, 1.0, facecolor='white', edgecolor=c_darksteel, linewidth=1.5))
    ax.add_patch(patches.Rectangle((0.25, 1.6), 0.7, 0.95, facecolor=c_fluid_lo, alpha=0.3))

    # Fluid Flow Arrows
    # Inflow
    ax.annotate('', xy=(-2.8, 1.8), xytext=(-2.8, 3.0), arrowprops=dict(arrowstyle='->', lw=3, color=c_fluid_hi))
    ax.annotate('', xy=(-3.5, 0.5), xytext=(-2.8, 1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_fluid_hi))
    ax.annotate('', xy=(-2.0, 0), xytext=(-2.8, 1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_fluid_hi))

    # Outflow
    ax.annotate('', xy=(0.6, 3.0), xytext=(0.6, 1.8), arrowprops=dict(arrowstyle='->', lw=3, color='#2B6CB0'))

    # Piston Motion Arrow
    ax.annotate('Motion', xy=(1.0, 0), xytext=(-0.3, 0), arrowprops=dict(arrowstyle='->', lw=3, color=c_piston),
                fontsize=14, fontweight='bold', color=c_piston, ha='center', va='bottom')

    # Labels
    ax.text(-2.8, 3.2, 'Fluid Inflow (P1)', fontsize=14, fontweight='bold', ha='center', color=c_fluid_hi)
    ax.text(0.6, 3.2, 'Fluid Outflow (P2)', fontsize=14, fontweight='bold', ha='center', color='#2B6CB0')
    ax.text(-2.6, -0.8, 'High Pressure\nChamber', fontsize=13, fontweight='bold', ha='center', color='#1A365D')
    ax.text(0.4, -0.8, 'Low Pressure', fontsize=13, fontweight='bold', ha='center', color='#4A5568')
    ax.text(-0.9, 1.9, 'Piston Head', fontsize=13, fontweight='bold', ha='center', color=c_piston)
    ax.text(3.5, 0.65, 'Piston Rod', fontsize=13, fontweight='bold', ha='center', color=c_darksteel)
    ax.text(-1.2, -2.5, 'Cylinder Housing', fontsize=14, fontweight='bold', ha='center', color=c_darksteel)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'hydraulic-piston.png'
    draw_hydraulic_piston(output_file)
