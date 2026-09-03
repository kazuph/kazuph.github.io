import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.transforms as mtransforms

def draw_michelson_interferometer(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-5, 5)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_laser = '#E53E3E'
    c_mirror = '#A0AEC0'
    c_glass = '#E2E8F0'
    c_screen = '#2D3748'
    c_bg = '#F7FAFC'

    fig.patch.set_facecolor(c_bg)

    # 1. Laser Source (Left)
    ax.add_patch(patches.Rectangle((-4.5, -0.6), 1.4, 1.2, facecolor=c_screen, edgecolor='black', linewidth=1.5))
    ax.text(-3.8, 0, 'LASER', fontsize=12, fontweight='bold', color='white', ha='center', va='center')
    ax.add_patch(patches.Rectangle((-3.1, -0.2), 0.2, 0.4, facecolor=c_laser, edgecolor='black', linewidth=1))

    # 2. Beam Splitter (Center, 45 degrees)
    bs = patches.Rectangle((-0.15, -1.2), 0.3, 2.4, facecolor=c_glass, edgecolor='black', linewidth=1.5, alpha=0.8)
    t = mtransforms.Affine2D().rotate_deg_around(0, 0, 45) + ax.transData
    bs.set_transform(t)
    ax.add_patch(bs)
    ax.text(0.2, 0.4, 'Beam Splitter', fontsize=12, fontweight='bold', color='#1A202C')

    # 3. Mirror A (Top - Arm 1)
    ax.add_patch(patches.Rectangle((-1.0, 3.4), 2.0, 0.3, facecolor=c_mirror, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((-1.0, 3.25), 2.0, 0.15, facecolor=c_glass, edgecolor='black', linewidth=1))
    ax.text(0, 3.8, 'Mirror A (Fixed)', fontsize=13, fontweight='bold', ha='center', color='#1A202C')

    # 4. Mirror B (Right - Arm 2)
    ax.add_patch(patches.Rectangle((3.4, -1.0), 0.3, 2.0, facecolor=c_mirror, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((3.25, -1.0), 0.15, 2.0, facecolor=c_glass, edgecolor='black', linewidth=1))
    ax.text(3.7, 0, 'Mirror B (Movable)', fontsize=13, fontweight='bold', va='center', color='#1A202C', rotation=-90)

    # 5. Interference Screen (Bottom)
    ax.add_patch(patches.Rectangle((-1.2, -3.6), 2.4, 0.3, facecolor=c_screen, edgecolor='black', linewidth=1.5))
    ax.text(0, -4.0, 'Interference Screen', fontsize=13, fontweight='bold', ha='center', color='#1A202C')

    # Interference Fringes on Screen
    for x in np.linspace(-0.9, 0.9, 7):
        ax.add_patch(patches.Rectangle((x-0.06, -3.55), 0.12, 0.2, facecolor=c_laser, alpha=0.85))

    # Beams
    # Incident Beam from Laser to BS
    ax.annotate('', xy=(0, 0), xytext=(-2.9, 0), arrowprops=dict(arrowstyle='->', lw=3, color=c_laser))

    # Reflected Beam to Mirror A & Return
    ax.annotate('', xy=(0, 3.25), xytext=(0, 0), arrowprops=dict(arrowstyle='->', lw=2.5, color=c_laser))
    ax.plot([0.06, 0.06], [3.25, 0], color=c_laser, linestyle='--', linewidth=1.8, alpha=0.8)

    # Transmitted Beam to Mirror B & Return
    ax.annotate('', xy=(3.25, 0), xytext=(0, 0), arrowprops=dict(arrowstyle='->', lw=2.5, color=c_laser))
    ax.plot([3.25, 0], [-0.06, -0.06], color=c_laser, linestyle='--', linewidth=1.8, alpha=0.8)

    # Combined Beam to Screen
    ax.annotate('', xy=(0, -3.3), xytext=(0, 0), arrowprops=dict(arrowstyle='->', lw=3, color=c_laser))

    # Arm Length Labels
    ax.annotate('', xy=(-1.4, 3.25), xytext=(-1.4, 0), arrowprops=dict(arrowstyle='<->', lw=1.2, color='#718096'))
    ax.text(-1.6, 1.6, r'$d_1$', fontsize=14, fontweight='bold', color='#4A5568', ha='right', va='center')

    ax.annotate('', xy=(3.25, -1.4), xytext=(0, -1.4), arrowprops=dict(arrowstyle='<->', lw=1.2, color='#718096'))
    ax.text(1.6, -1.7, r'$d_2$', fontsize=14, fontweight='bold', color='#4A5568', ha='center', va='top')

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'michelson-interferometer.png'
    draw_michelson_interferometer(output_file)
