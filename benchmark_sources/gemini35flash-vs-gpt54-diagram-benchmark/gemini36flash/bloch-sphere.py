import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_bloch_sphere(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-1.8, 1.8)
    ax.set_ylim(-1.5, 1.5)
    ax.set_aspect('equal')
    ax.axis('off')

    # Sphere main outline & background fill
    sphere_bg = patches.Circle((0, 0), 1.0, facecolor='#EDF2F7', edgecolor='#2D3748', linewidth=2, alpha=0.5)
    ax.add_patch(sphere_bg)

    # Equator (ellipse)
    equator_front = patches.Arc((0, 0), 2.0, 0.7, angle=0, theta1=180, theta2=360, color='#4A5568', linewidth=1.5)
    equator_back = patches.Arc((0, 0), 2.0, 0.7, angle=0, theta1=0, theta2=180, color='#A0AEC0', linestyle='--', linewidth=1.2)
    ax.add_patch(equator_front)
    ax.add_patch(equator_back)

    # Axes
    # Z Axis (vertical)
    ax.annotate('', xy=(0, 1.35), xytext=(0, -1.35), arrowprops=dict(arrowstyle='->', lw=1.5, color='#1A202C'))
    ax.text(0, 1.45, r'$|0\rangle$ (z)', fontsize=16, fontweight='bold', ha='center', va='bottom')
    ax.text(0, -1.45, r'$|1\rangle$', fontsize=16, fontweight='bold', ha='center', va='top')

    # Y Axis (horizontal)
    ax.annotate('', xy=(1.35, 0), xytext=(-1.35, 0), arrowprops=dict(arrowstyle='->', lw=1.5, color='#1A202C'))
    ax.text(1.42, 0, r'$y$', fontsize=16, fontweight='bold', ha='left', va='center')

    # X Axis (projected forward-left)
    ax.annotate('', xy=(-0.7, -0.7), xytext=(0, 0), arrowprops=dict(arrowstyle='->', lw=1.5, color='#1A202C'))
    ax.text(-0.78, -0.78, r'$x$', fontsize=16, fontweight='bold', ha='right', va='top')

    # State Vector |psi> coordinates
    # theta = 45 deg, phi = 40 deg
    px, py = 0.48, 0.75
    proj_x, proj_y = 0.48, -0.15

    # Projections (dashed lines)
    ax.plot([0, proj_x], [0, proj_y], color='#718096', linestyle='--', linewidth=1.2)
    ax.plot([px, proj_x], [py, proj_y], color='#718096', linestyle='--', linewidth=1.2)
    ax.plot([proj_x, 0.48], [proj_y, 0], color='#A0AEC0', linestyle=':', linewidth=1.0)

    # State Vector Arrow |psi>
    ax.annotate('', xy=(px, py), xytext=(0, 0), arrowprops=dict(arrowstyle='->', lw=2.8, color='#E53E3E'))
    ax.text(px + 0.08, py + 0.05, r'$|\psi\rangle$', fontsize=18, fontweight='bold', color='#C53030')

    # Angle Theta Arc (Z to vector)
    theta_arc = patches.Arc((0, 0), 0.7, 0.7, angle=0, theta1=57, theta2=90, color='#3182CE', linewidth=2.0)
    ax.add_patch(theta_arc)
    ax.text(0.14, 0.48, r'$\theta$', fontsize=16, color='#2B6CB0', fontweight='bold')

    # Angle Phi Arc (X axis to projection)
    phi_arc = patches.Arc((0, 0), 0.6, 0.22, angle=0, theta1=225, theta2=340, color='#38A169', linewidth=2.0)
    ax.add_patch(phi_arc)
    ax.text(0.12, -0.28, r'$\phi$', fontsize=16, color='#276749', fontweight='bold')

    # Origin dot
    ax.plot(0, 0, 'ko', markersize=5)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'bloch-sphere.png'
    draw_bloch_sphere(output_file)
