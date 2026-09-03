import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_bloch_sphere(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.3, 1.4)
    ax.set_aspect("equal")
    ax.axis("off")

    # Title & Subtitle
    ax.text(0, 1.25, "Bloch Sphere", ha="center", va="center",
            fontsize=20, fontweight="bold", color="#1e293b")
    ax.text(0, 1.15, "Geometric representation of a two-level qubit pure state", ha="center", va="center",
            fontsize=11, color="#64748b")

    # Sphere boundary circle
    R = 0.95
    sphere_bg = patches.Circle((0, 0), R, facecolor="#f1f7fd", edgecolor="#334155", lw=2, zorder=2)
    ax.add_patch(sphere_bg)

    # Equator ellipse (XY-plane)
    # Parametric: x = R * cos(t), y = R * 0.3 * sin(t)
    t_back = np.linspace(0, np.pi, 100)
    t_front = np.linspace(np.pi, 2 * np.pi, 100)
    # Back half (dashed)
    ax.plot(R * np.cos(t_back), R * 0.28 * np.sin(t_back), color="#94a3b8", lw=1.5, ls="--", zorder=3)
    # Front half (solid)
    ax.plot(R * np.cos(t_front), R * 0.28 * np.sin(t_front), color="#475569", lw=1.8, zorder=5)

    # Meridian ellipse (YZ-plane)
    t_meridian = np.linspace(0, 2 * np.pi, 200)
    ax.plot(R * 0.28 * np.sin(t_meridian), R * np.cos(t_meridian), color="#cbd5e1", lw=1.2, ls=":", zorder=3)

    # Negative Z-axis (dashed inside, solid outside)
    ax.plot([0, 0], [0, -R], color="#94a3b8", lw=1.5, ls="--", zorder=3)
    ax.annotate("", xy=(0, -1.22), xytext=(0, -R),
                arrowprops=dict(arrowstyle="-|>", color="#1e293b", lw=2, mutation_scale=15), zorder=6)
    ax.text(0, -1.30, "-z", ha="center", va="top", fontsize=13, fontweight="bold", color="#1e293b")
    ax.text(0, -R - 0.08, r"$|1\rangle$", ha="center", va="top", fontsize=15, fontweight="bold", color="#2563eb")

    # Negative X-axis
    ax.plot([0, 0.45], [0, 0.25], color="#94a3b8", lw=1.5, ls="--", zorder=3)

    # Negative Y-axis
    ax.plot([0, -R], [0, 0], color="#94a3b8", lw=1.5, ls="--", zorder=3)

    # Positive X-axis (projected front-left)
    ax.annotate("", xy=(-0.65, -0.38), xytext=(0, 0),
                arrowprops=dict(arrowstyle="-|>", color="#1e293b", lw=2, mutation_scale=15), zorder=7)
    ax.text(-0.72, -0.42, "x", ha="right", va="top", fontsize=14, fontweight="bold", color="#1e293b")
    ax.text(-0.55, -0.22, r"$|+\rangle$", ha="right", va="center", fontsize=12, fontweight="bold", color="#475569")

    # Positive Y-axis (right)
    ax.annotate("", xy=(1.25, 0), xytext=(0, 0),
                arrowprops=dict(arrowstyle="-|>", color="#1e293b", lw=2, mutation_scale=15), zorder=7)
    ax.text(1.30, 0, "y", ha="left", va="center", fontsize=14, fontweight="bold", color="#1e293b")
    ax.text(R + 0.05, 0.06, r"$|+i\rangle$", ha="left", va="bottom", fontsize=12, fontweight="bold", color="#475569")

    # Positive Z-axis (up)
    ax.annotate("", xy=(0, 1.25), xytext=(0, 0),
                arrowprops=dict(arrowstyle="-|>", color="#1e293b", lw=2, mutation_scale=15), zorder=7)
    ax.text(0, 1.30, "z", ha="center", va="bottom", fontsize=14, fontweight="bold", color="#1e293b")
    ax.text(0, R + 0.05, r"$|0\rangle$", ha="center", va="bottom", fontsize=15, fontweight="bold", color="#2563eb")

    # Quantum State Vector |psi>
    # Physical angles: theta = 48 deg (from +z), phi = 35 deg (from +x)
    theta = np.deg2rad(50)
    phi = np.deg2rad(40)
    # 3D unit coordinates:
    # x3d = sin(theta)*cos(phi), y3d = sin(theta)*sin(phi), z3d = cos(theta)
    # Projected onto 2D:
    # u_x_proj = (-0.55, -0.32), u_y_proj = (1.0, 0.0), u_z_proj = (0.0, 1.0)
    x3d = np.sin(theta) * np.cos(phi)
    y3d = np.sin(theta) * np.sin(phi)
    z3d = np.cos(theta)

    # 2D screen coords:
    px = R * (x3d * (-0.52) + y3d * 0.92)
    py = R * (x3d * (-0.30) + y3d * 0.0 + z3d * 1.0)

    # XY-plane projection point
    px_xy = R * (x3d * (-0.52) + y3d * 0.92)
    py_xy = R * (x3d * (-0.30) + y3d * 0.0)

    # Dashed line from |psi> down to XY-plane
    ax.plot([px, px_xy], [py, py_xy], color="#94a3b8", lw=1.5, ls="--", zorder=8)
    # Origin to XY-plane projection
    ax.plot([0, px_xy], [0, py_xy], color="#0284c7", lw=1.8, ls="--", zorder=8)
    ax.plot(px_xy, py_xy, "o", color="#0284c7", ms=5, zorder=9)

    # Angle phi arc (in XY-plane)
    t_phi = np.linspace(np.arctan2(-0.30, -0.52), np.arctan2(py_xy, px_xy), 30)
    r_phi = 0.28
    ax.plot(r_phi * np.cos(t_phi) * 1.2, r_phi * np.sin(t_phi) * 0.65, color="#0284c7", lw=2, zorder=10)
    ax.text(px_xy * 0.5 - 0.03, py_xy * 0.5 - 0.08, r"$\phi$", fontsize=15, fontweight="bold", color="#0284c7", zorder=11)

    # Angle theta arc (from z-axis to |psi>)
    t_theta = np.linspace(np.pi/2, np.arctan2(py, px), 30)
    r_theta = 0.35
    ax.plot(r_theta * np.cos(t_theta), r_theta * np.sin(t_theta), color="#dc2626", lw=2, zorder=10)
    ax.text(0.12, 0.32, r"$\theta$", fontsize=15, fontweight="bold", color="#dc2626", zorder=11)

    # State Vector Arrow |psi>
    ax.annotate("", xy=(px, py), xytext=(0, 0),
                arrowprops=dict(arrowstyle="-|>", color="#dc2626", lw=3.2, mutation_scale=20), zorder=12)
    ax.plot(0, 0, "o", color="#1e293b", ms=5, zorder=13)
    ax.plot(px, py, "o", color="#dc2626", ms=6, zorder=13)

    # Label |psi>
    bbox_props = dict(boxstyle="round,pad=0.3", fc="#fee2e2", ec="#f87171", lw=1.2)
    ax.text(px + 0.08, py + 0.04, r"$|\psi\rangle$", fontsize=16, fontweight="bold", color="#991b1b",
            bbox=bbox_props, zorder=14)

    # State Equation Card at bottom
    eq_text = r"$|\psi\rangle = \cos\left(\frac{\theta}{2}\right)|0\rangle + e^{i\phi}\sin\left(\frac{\theta}{2}\right)|1\rangle$"
    ax.text(0, -1.05, eq_text, ha="center", va="center", fontsize=14,
            bbox=dict(boxstyle="round,pad=0.5", fc="#f8fafc", ec="#cbd5e1", lw=1.2), zorder=15)

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bloch-sphere.py <output_path>")
        sys.exit(1)
    draw_bloch_sphere(sys.argv[1])
