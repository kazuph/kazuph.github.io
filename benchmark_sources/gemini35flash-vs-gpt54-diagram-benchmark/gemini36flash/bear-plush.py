import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_bear_plush(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    # Soft background fill
    fig.patch.set_facecolor('#FFFDF9')

    # Color palette
    c_fur = '#C68B59'
    c_muzzle = '#F3E0BE'
    c_paw = '#E5C3A6'
    c_eye = '#2B1E16'
    c_patch = '#E86A7C'
    c_blush = '#FFB3C1'
    c_outline = '#613B1F'

    lw = 2.5

    # Shadow
    shadow = patches.Ellipse((0, -3.6), 6.5, 1.2, color='#E2D8CC', alpha=0.6)
    ax.add_patch(shadow)

    # Ears (Left & Right)
    for sign in [-1, 1]:
        ear_outer = patches.Circle((sign * 2.2, 2.5), 1.1, facecolor=c_fur, edgecolor=c_outline, linewidth=lw)
        ear_inner = patches.Circle((sign * 2.2, 2.5), 0.65, facecolor=c_muzzle, edgecolor=c_outline, linewidth=lw)
        ax.add_patch(ear_outer)
        ax.add_patch(ear_inner)

    # Legs (Left & Right)
    for sign in [-1, 1]:
        leg = patches.Ellipse((sign * 2.0, -2.8), 1.4, 1.8, facecolor=c_fur, edgecolor=c_outline, linewidth=lw)
        pad = patches.Circle((sign * 2.0, -3.0), 0.55, facecolor=c_paw, edgecolor=c_outline, linewidth=lw)
        ax.add_patch(leg)
        ax.add_patch(pad)

    # Body
    body = patches.Ellipse((0, -1.3), 3.4, 3.0, facecolor=c_fur, edgecolor=c_outline, linewidth=lw)
    ax.add_patch(body)

    # Body seam line
    ax.plot([0, 0], [-0.2, -2.5], color=c_outline, linestyle='--', linewidth=1.5)

    # Arms (Left & Right)
    for sign in [-1, 1]:
        arm = patches.Ellipse((sign * 2.5, -1.0), 1.1, 1.8, angle=-sign * 25, facecolor=c_fur, edgecolor=c_outline, linewidth=lw)
        paw = patches.Circle((sign * 2.7, -1.6), 0.45, facecolor=c_paw, edgecolor=c_outline, linewidth=lw)
        ax.add_patch(arm)
        ax.add_patch(paw)

    # Chest Heart Patch
    heart = patches.Polygon([
        (0, -0.6), (-0.4, -0.2), (-0.4, 0.1), (0, -0.2), (0.4, 0.1), (0.4, -0.2)
    ], facecolor=c_patch, edgecolor=c_outline, linewidth=lw)
    # Smooth heart shape with small circle caps
    h_left = patches.Circle((-0.2, 0.05), 0.25, facecolor=c_patch, edgecolor='none')
    h_right = patches.Circle((0.2, 0.05), 0.25, facecolor=c_patch, edgecolor='none')
    h_base = patches.Polygon([(0, -0.65), (-0.45, -0.05), (0.45, -0.05)], facecolor=c_patch, edgecolor='none')
    ax.add_patch(h_base)
    ax.add_patch(h_left)
    ax.add_patch(h_right)

    # Head
    head = patches.Circle((0, 1.4), 2.3, facecolor=c_fur, edgecolor=c_outline, linewidth=lw)
    ax.add_patch(head)

    # Muzzle
    muzzle = patches.Ellipse((0, 0.8), 1.5, 1.1, facecolor=c_muzzle, edgecolor=c_outline, linewidth=lw)
    ax.add_patch(muzzle)

    # Nose & Mouth
    nose = patches.Polygon([(-0.3, 1.2), (0.3, 1.2), (0, 0.9)], facecolor=c_eye, edgecolor=c_outline, linewidth=1)
    ax.add_patch(nose)
    ax.plot([0, 0], [0.9, 0.65], color=c_outline, linewidth=2)
    # Smile arcs
    t = np.linspace(0, np.pi, 50)
    ax.plot(-0.25 + 0.25 * np.cos(t), 0.65 - 0.25 * np.sin(t), color=c_outline, linewidth=2)
    ax.plot(0.25 - 0.25 * np.cos(t), 0.65 - 0.25 * np.sin(t), color=c_outline, linewidth=2)

    # Eyes & Highlights
    for sign in [-1, 1]:
        eye = patches.Circle((sign * 1.0, 1.6), 0.25, facecolor=c_eye, edgecolor='none')
        hl = patches.Circle((sign * 0.92, 1.7), 0.08, facecolor='white', edgecolor='none')
        ax.add_patch(eye)
        ax.add_patch(hl)

        blush = patches.Circle((sign * 1.5, 1.0), 0.4, facecolor=c_blush, alpha=0.6, edgecolor='none')
        ax.add_patch(blush)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'bear-plush.png'
    draw_bear_plush(output_file)
