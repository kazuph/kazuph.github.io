import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Arc, Circle, Ellipse
import matplotlib.patheffects as pe

def draw_bloch_sphere(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.2, 1.2)
    ax.set_aspect('equal')
    ax.axis('off')

    # Background color
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Title & equation
    ax.text(0, 1.08, 'Bloch Sphere Representation', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(0, 0.98, r'$|\psi\rangle = \cos(\theta/2)|0\rangle + e^{i\phi}\sin(\theta/2)|1\rangle$',
            color='#94a3b8', fontsize=14, ha='center', va='center', style='italic')

    # Bloch Sphere Parameters
    R = 0.75
    # Center at (0, -0.05)
    cx, cy = 0.0, -0.05

    # 1. Sphere Outline & Shading
    # Circular boundary
    sphere_bg = Circle((cx, cy), R, facecolor='#0284c7', alpha=0.08, edgecolor='#38bdf8', lw=2.2)
    ax.add_patch(sphere_bg)

    # Equator (Ellipse rx=R, ry=R*0.3)
    eq_ry = R * 0.32
    # Back equator (dashed)
    eq_theta_back = np.linspace(0, np.pi, 100)
    ax.plot(cx + R * np.cos(eq_theta_back), cy + eq_ry * np.sin(eq_theta_back),
            color='#64748b', ls='--', lw=1.5, alpha=0.7)
    # Front equator (solid)
    eq_theta_front = np.linspace(np.pi, 2 * np.pi, 100)
    ax.plot(cx + R * np.cos(eq_theta_front), cy + eq_ry * np.sin(eq_theta_front),
            color='#38bdf8', lw=2.0, alpha=0.85)

    # Prime Meridian (Ellipse rx=R*0.35, ry=R)
    mer_rx = R * 0.35
    mer_theta_back = np.linspace(np.pi/2, 3*np.pi/2, 100)
    ax.plot(cx + mer_rx * np.cos(mer_theta_back), cy + R * np.sin(mer_theta_back),
            color='#64748b', ls='--', lw=1.2, alpha=0.5)
    mer_theta_front = np.linspace(-np.pi/2, np.pi/2, 100)
    ax.plot(cx + mer_rx * np.cos(mer_theta_front), cy + R * np.sin(mer_theta_front),
            color='#38bdf8', lw=1.5, alpha=0.6)

    # 2. AXES
    axis_color = '#94a3b8'
    axis_dim = '#475569'

    # -Z Axis (dashed down)
    ax.plot([cx, cx], [cy, cy - R * 1.15], color=axis_dim, ls='--', lw=1.5)
    # +Z Axis (solid up with arrow)
    ax.annotate('', xy=(cx, cy + R * 1.35), xytext=(cx, cy),
                arrowprops=dict(arrowstyle='-|>', color=axis_color, lw=2, mutation_scale=18))
    ax.text(cx, cy + R * 1.45, 'z', color='#cbd5e1', fontsize=16, fontweight='bold', ha='center', va='center')

    # +Y Axis (pointing right along equator)
    ax.plot([cx, cx - R * 1.1], [cy, cy], color=axis_dim, ls='--', lw=1.5)
    ax.annotate('', xy=(cx + R * 1.35, cy), xytext=(cx, cy),
                arrowprops=dict(arrowstyle='-|>', color=axis_color, lw=2, mutation_scale=18))
    ax.text(cx + R * 1.45, cy, 'y', color='#cbd5e1', fontsize=16, fontweight='bold', ha='left', va='center')

    # +X Axis (projected forward-left, e.g. angle -140 deg)
    x_angle = -np.deg2rad(135)
    ax.plot([cx, cx - R * 0.8 * np.cos(x_angle)], [cy, cy - eq_ry * 0.8 * np.sin(x_angle)],
            color=axis_dim, ls='--', lw=1.5)
    ax_end_x = cx + R * 1.25 * np.cos(x_angle)
    ax_end_y = cy + eq_ry * 1.25 * np.sin(x_angle)
    ax.annotate('', xy=(ax_end_x, ax_end_y), xytext=(cx, cy),
                arrowprops=dict(arrowstyle='-|>', color=axis_color, lw=2, mutation_scale=18))
    ax.text(ax_end_x - 0.06, ax_end_y - 0.05, 'x', color='#cbd5e1', fontsize=16, fontweight='bold', ha='right', va='top')

    # 3. QUANTUM STATE VECTOR |psi>
    # Choice of state: theta = 50 deg, phi = 45 deg
    theta_val = np.deg2rad(48)
    phi_val = np.deg2rad(40)

    # 3D unit vector coordinates
    # x3 = sin(theta)*cos(phi), y3 = sin(theta)*sin(phi), z3 = cos(theta)
    # Projected 2D coordinates:
    # 2D x_proj = y3 * R + x3 * R * cos(-135 deg)
    # 2D y_proj = z3 * R + (x3 * sin(-135 deg) + y3 * 0) * eq_ry/R ...
    # Standard isometric-like projection matching the diagram:
    psi_px = cx + 0.38
    psi_py = cy + 0.46

    # Equatorial projection of |psi>
    proj_px = cx + 0.38
    proj_py = cy - 0.12

    # Projection dashed lines
    ax.plot([cx, proj_px], [cy, proj_py], color='#fbbf24', ls='--', lw=1.8)
    ax.plot([proj_px, psi_px], [proj_py, psi_py], color='#f43f5e', ls='--', lw=1.8)
    ax.plot(proj_px, proj_py, 'o', color='#fbbf24', markersize=5)

    # Angle phi arc
    phi_arc_theta = np.linspace(-np.deg2rad(135), np.arctan2(proj_py - cy, (proj_px - cx) * (eq_ry / R)), 50)
    r_arc_phi = 0.28
    ax.plot(cx + r_arc_phi * np.cos(phi_arc_theta), cy + r_arc_phi * 0.35 * np.sin(phi_arc_theta),
            color='#fbbf24', lw=2)
    ax.text(cx - 0.02, cy - 0.16, r'$\phi$', color='#fbbf24', fontsize=16, fontweight='bold', ha='center')

    # Angle theta arc (from z-axis to state vector)
    theta_arc = np.linspace(np.pi/2, np.arctan2(psi_py - cy, psi_px - cx), 50)
    r_arc_th = 0.32
    ax.plot(cx + r_arc_th * np.cos(theta_arc), cy + r_arc_th * np.sin(theta_arc),
            color='#38bdf8', lw=2)
    ax.text(cx + 0.10, cy + 0.30, r'$\theta$', color='#38bdf8', fontsize=16, fontweight='bold')

    # State Vector Arrow |psi>
    ax.annotate('', xy=(psi_px, psi_py), xytext=(cx, cy),
                arrowprops=dict(arrowstyle='-|>', color='#f43f5e', lw=3.5, mutation_scale=22))
    ax.plot(psi_px, psi_py, 'o', color='#f43f5e', markersize=7, markeredgecolor='#ffffff', markeredgewidth=1.5)

    # State label box
    ax.text(psi_px + 0.08, psi_py + 0.05, r'$|\psi\rangle$', color='#f43f5e', fontsize=18, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.25', facecolor='#1e293b', edgecolor='#f43f5e', lw=1.5))

    # Standard basis state labels
    # |0> North pole
    ax.plot(cx, cy + R, 'o', color='#38bdf8', markersize=5)
    ax.text(cx + 0.08, cy + R + 0.04, r'$|0\rangle$', color='#38bdf8', fontsize=15, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))

    # |1> South pole
    ax.plot(cx, cy - R, 'o', color='#38bdf8', markersize=5)
    ax.text(cx + 0.08, cy - R - 0.04, r'$|1\rangle$', color='#38bdf8', fontsize=15, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))

    # |+> state
    ax.text(cx - 0.42, cy - 0.28, r'$|+\rangle$', color='#a5b4fc', fontsize=14, fontweight='bold')
    # |+i> state
    ax.text(cx + R + 0.04, cy - 0.06, r'$|+i\rangle$', color='#a5b4fc', fontsize=14, fontweight='bold')

    # Origin
    ax.plot(cx, cy, 'o', color='#94a3b8', markersize=4)

    # Legend / Info box
    info_text = "Coordinates:\n" + r"$\theta \in [0, \pi]$ (polar angle)" + "\n" + r"$\phi \in [0, 2\pi)$ (azimuth angle)" + "\nRadius: $r=1$ (pure states)"
    ax.text(-1.45, -0.95, info_text, color='#94a3b8', fontsize=11,
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#1e293b', edgecolor='#334155', lw=1.2, alpha=0.95))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_bloch_sphere(sys.argv[1])
    else:
        draw_bloch_sphere('bloch-sphere.png')
