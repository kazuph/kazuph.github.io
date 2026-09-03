import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_elderly_living_room_tv(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    # Color palette
    c_wall = '#F9F3EA'
    c_floor = '#DDB892'
    c_rug = '#E6C280'
    c_sofa = '#B5838D'
    c_tv = '#333333'
    c_screen = '#E8F1F5'
    c_wood = '#7F5539'
    c_curtain = '#E07A5F'
    c_lamp = '#F2CC8F'
    c_hair = '#E0E0E0'
    c_cloth = '#81B29A'
    c_skin = '#FFDAB9'

    # Background Wall & Floor
    ax.add_patch(patches.Rectangle((-6, -2), 12, 6.5, facecolor=c_wall))
    ax.add_patch(patches.Rectangle((-6, -4.5), 12, 2.5, facecolor=c_floor))
    ax.plot([-6, 6], [-2, -2], color=c_wood, linewidth=3)

    # Rug
    ax.add_patch(patches.Ellipse((-4, -3.8), 7.0, 1.2, facecolor=c_rug, edgecolor=c_wood, linewidth=1.5))

    # Window & Curtains (Right side)
    ax.add_patch(patches.Rectangle((2.5, 0.5), 2.5, 3.2, facecolor='white', edgecolor=c_wood, linewidth=2))
    ax.plot([2.5, 5.0], [2.1, 2.1], color='#CBD5E0', linewidth=1.5)
    ax.plot([3.75, 3.75], [0.5, 3.7], color='#CBD5E0', linewidth=1.5)
    ax.add_patch(patches.Rectangle((2.1, 0.4), 0.5, 3.5, facecolor=c_curtain))
    ax.add_patch(patches.Rectangle((4.9, 0.4), 0.5, 3.5, facecolor=c_curtain))
    ax.plot([2.0, 5.5], [3.9, 3.9], color=c_wood, linewidth=3)

    # Floor Lamp (Far left background)
    ax.plot([-5.0, -5.0], [-3.2, 2.5], color=c_wood, linewidth=3)
    ax.add_patch(patches.Polygon([(-5.5, 2.5), (-4.5, 2.5), (-4.2, 3.3), (-5.8, 3.3)], facecolor=c_lamp, edgecolor=c_wood, linewidth=1.5))
    # Light beam
    ax.add_patch(patches.Polygon([(-5.8, 3.3), (-4.2, 3.3), (-3.2, -2.0), (-6.0, -2.0)], facecolor=c_lamp, alpha=0.3))

    # TV Unit & TV (Left side)
    ax.add_patch(patches.Rectangle((-5.5, -2.6), 2.5, 1.4, facecolor=c_wood, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((-5.2, -1.2), 2.0, 2.0, facecolor=c_tv, edgecolor='black', linewidth=2))
    ax.add_patch(patches.Rectangle((-5.0, -1.0), 1.6, 1.6, facecolor=c_screen, edgecolor=c_tv, linewidth=1))

    # TV Glow cone towards grandma
    ax.add_patch(patches.Polygon([(-3.4, 0.6), (-3.4, -1.0), (0.5, -1.5), (0.5, 0.8)], facecolor=c_screen, alpha=0.35))

    # Small Table with Tea Cup
    ax.add_patch(patches.Rectangle((-1.8, -2.8), 1.2, 1.0, facecolor=c_wood, edgecolor='black', linewidth=1.5))
    ax.plot([-1.6, -1.6], [-3.6, -2.8], color=c_wood, linewidth=3)
    ax.plot([-0.8, -0.8], [-3.6, -2.8], color=c_wood, linewidth=3)
    # Tea Cup
    ax.add_patch(patches.Rectangle((-1.3, -1.8), 0.3, 0.35, facecolor='white', edgecolor='black', linewidth=1))

    # Sofa (Right-center)
    ax.add_patch(patches.Rectangle((0.2, -2.8), 3.0, 1.8, facecolor=c_sofa, edgecolor='black', linewidth=2))
    ax.add_patch(patches.Rectangle((1.8, -1.0), 1.4, 2.6, facecolor=c_sofa, edgecolor='black', linewidth=2))

    # Grandma (Sitting on sofa facing left to TV)
    # Lower Body
    ax.add_patch(patches.Rectangle((0.5, -2.4), 1.6, 0.9, facecolor='#4A5568', edgecolor='black', linewidth=1.5))
    # Upper Body
    ax.add_patch(patches.Polygon([(0.8, -1.5), (1.8, -1.5), (1.9, -0.1), (0.9, -0.1)], facecolor=c_cloth, edgecolor='black', linewidth=1.5))
    # Arm
    ax.add_patch(patches.Rectangle((0.5, -1.3), 0.8, 0.35, facecolor=c_cloth, edgecolor='black', linewidth=1.5))
    # Head
    ax.add_patch(patches.Circle((1.1, 0.35), 0.55, facecolor=c_skin, edgecolor='black', linewidth=1.5))
    # Hair
    ax.add_patch(patches.Circle((1.2, 0.65), 0.58, facecolor=c_hair, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Circle((1.75, 0.55), 0.28, facecolor=c_hair, edgecolor='black', linewidth=1.5)) # Bun
    # Glasses
    ax.add_patch(patches.Circle((0.75, 0.4), 0.15, facecolor='none', edgecolor='black', linewidth=1.5))
    ax.plot([0.6, 0.9], [0.4, 0.4], color='black', linewidth=1.5)

    # Sightline
    ax.plot([0.6, -3.4], [0.4, -0.2], color='#E53E3E', linestyle='--', linewidth=1.5, alpha=0.7)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'elderly-living-room-tv.png'
    draw_elderly_living_room_tv(output_file)
