import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_vr_son_watched_by_mother(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_wall = '#E2E8F0'
    c_floor = '#CBD5E0'
    c_door = '#718096'
    c_bed = '#63B3ED'
    c_desk = '#A0AEC0'
    c_son = '#ED8936'
    c_vr = '#1A202C'
    c_mom = '#9F7AEA'
    c_skin = '#FBD38D'

    fig.patch.set_facecolor('#FFFFFF')

    # Room Background
    ax.add_patch(patches.Rectangle((-6, -2), 12, 6.5, facecolor=c_wall))
    ax.add_patch(patches.Rectangle((-6, -4.5), 12, 2.5, facecolor=c_floor))
    ax.plot([-6, 6], [-2, -2], color=c_door, linewidth=3)

    # Doorway Entrance (Left)
    ax.add_patch(patches.Rectangle((-5.8, -2.0), 1.8, 5.5, facecolor='#4A5568', edgecolor='black', linewidth=2))
    ax.add_patch(patches.Rectangle((-5.5, -2.0), 1.3, 5.2, facecolor='white', edgecolor='none'))

    # Bed (Right background)
    ax.add_patch(patches.Rectangle((2.4, -2.5), 3.0, 1.6, facecolor=c_bed, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((2.6, -1.3), 1.0, 0.4, facecolor='white', edgecolor='black', linewidth=1))

    # Desk (Center background)
    ax.add_patch(patches.Rectangle((-1.0, -2.3), 2.4, 1.2, facecolor=c_desk, edgecolor='black', linewidth=1.5))
    ax.plot([-0.8, -0.8], [-3.5, -2.3], color=c_desk, linewidth=3)
    ax.plot([1.2, 1.2], [-3.5, -2.3], color=c_desk, linewidth=3)
    # Monitor
    ax.add_patch(patches.Rectangle((-0.4, -1.1), 1.2, 0.9, facecolor=c_vr, edgecolor='black', linewidth=1.5))

    # Poster on wall
    ax.add_patch(patches.Rectangle((0.2, 1.4), 1.4, 1.6, facecolor='#E9D8FD', edgecolor='#805AD5', linewidth=1.5))
    ax.text(0.9, 2.2, 'GAME', fontsize=12, fontweight='bold', color='#6B46C1', ha='center', va='center')

    # Mother (Standing at doorway on left)
    # Skirt / Torso
    ax.add_patch(patches.Polygon([(-4.6, -2.5), (-4.2, -1.6), (-4.8, -1.6)], facecolor='#6B46C1'))
    ax.add_patch(patches.Rectangle((-4.7, -1.6), 0.6, 1.4, facecolor=c_mom, edgecolor='black', linewidth=1.5))
    # Head
    ax.add_patch(patches.Circle((-4.4, 0.2), 0.4, facecolor=c_skin, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Circle((-4.25, 0.3), 0.42, facecolor='#4A2511', edgecolor='black', linewidth=1.5)) # Hair
    # Sightline from Mom to Son
    ax.plot([-4.0, 0.2], [0.2, 0.2], color='#805AD5', linestyle='--', linewidth=1.8)
    ax.text(-2.0, 0.35, 'Watching Gaze', fontsize=11, fontweight='bold', color='#6B46C1', ha='center')

    # Son (Center, playing with VR)
    # Legs (Active pose)
    ax.add_patch(patches.Polygon([(-0.3, -3.2), (-0.1, -2.0), (0.3, -2.0), (0.1, -3.2)], facecolor='#2B6CB0'))
    ax.add_patch(patches.Polygon([(0.3, -2.0), (0.9, -2.3), (1.1, -2.7), (0.7, -2.8)], facecolor='#2B6CB0'))

    # Torso
    ax.add_patch(patches.Polygon([(-0.3, -2.0), (0.5, -2.0), (0.6, -0.6), (-0.2, -0.6)], facecolor=c_son, edgecolor='black', linewidth=1.5))

    # Head & VR Headset
    ax.add_patch(patches.Circle((0.2, 0.0), 0.45, facecolor=c_skin, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Circle((0.15, 0.2), 0.48, facecolor='#1A202C', edgecolor='black', linewidth=1.5)) # Hair
    # VR Headset
    ax.add_patch(patches.Rectangle((-0.3, -0.2), 0.7, 0.35, facecolor=c_vr, edgecolor='#00B5D8', linewidth=2))
    ax.plot([-0.2, 0.3], [-0.02, -0.02], color='#00B5D8', linewidth=2) # LED Strip

    # Arms with Controllers
    # Left Arm
    ax.plot([-0.2, -1.0], [-0.7, -0.3], color=c_son, linewidth=8, solid_capstyle='round')
    ax.add_patch(patches.Circle((-1.2, -0.2), 0.18, facecolor=c_vr, edgecolor='black', linewidth=1))

    # Right Arm
    ax.plot([0.5, 1.2], [-0.7, 0.1], color=c_son, linewidth=8, solid_capstyle='round')
    ax.add_patch(patches.Circle((1.35, 0.25), 0.18, facecolor=c_vr, edgecolor='black', linewidth=1))

    # Action lines
    ax.plot([-1.5, -1.7], [-0.1, -0.1], color='#00B5D8', linewidth=2)
    ax.plot([1.6, 1.8], [0.4, 0.5], color='#00B5D8', linewidth=2)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'vr-son-watched-by-mother.png'
    draw_vr_son_watched_by_mother(output_file)
