import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d

plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

class Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0,0), (0,0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def draw(self, renderer):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, zs = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0],ys[0]), (xs[1],ys[1]))
        super().draw(renderer)

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, zs = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0],ys[0]), (xs[1],ys[1]))
        return np.min(zs)

def main():
    if len(sys.argv) < 2:
        sys.exit(1)
    
    output_path = sys.argv[1]

    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_subplot(111, projection='3d')
    ax.set_axis_off()

    u = np.linspace(0, 2 * np.pi, 100)
    v = np.linspace(0, np.pi, 100)
    x = np.outer(np.cos(u), np.sin(v))
    y = np.outer(np.sin(u), np.sin(v))
    z = np.outer(np.ones(np.size(u)), np.cos(v))
    
    ax.plot_surface(x, y, z, color='#f0f8ff', alpha=0.12, edgecolor='none', zorder=0)

    phi_grid = np.linspace(0, 2*np.pi, 200)
    theta_grid = np.linspace(0, 2*np.pi, 200)
    
    ax.plot(np.cos(phi_grid), np.sin(phi_grid), 0, color='#888888', linestyle='--', linewidth=1.2)
    ax.plot(np.cos(theta_grid), 0, np.sin(theta_grid), color='#cccccc', linestyle=':', linewidth=1.0)
    ax.plot(0, np.cos(theta_grid), np.sin(theta_grid), color='#cccccc', linestyle=':', linewidth=1.0)

    r_disk = np.linspace(0, 1, 50)
    theta_disk = np.linspace(0, 2*np.pi, 50)
    R, T = np.meshgrid(r_disk, theta_disk)
    X_disk = R * np.cos(T)
    Y_disk = R * np.sin(T)
    Z_disk = np.zeros_like(X_disk)
    ax.plot_surface(X_disk, Y_disk, Z_disk, color='#888888', alpha=0.03, edgecolor='none', zorder=-1)

    ax.add_artist(Arrow3D([0, 1.4], [0, 0], [0, 0], mutation_scale=15, lw=1.2, arrowstyle="-|>", color="black"))
    ax.add_artist(Arrow3D([0, 0], [0, 1.4], [0, 0], mutation_scale=15, lw=1.2, arrowstyle="-|>", color="black"))
    ax.add_artist(Arrow3D([0, 0], [0, 0], [0, 1.4], mutation_scale=15, lw=1.2, arrowstyle="-|>", color="black"))

    ax.plot([-1.3, 0], [0, 0], [0, 0], color='black', linestyle='--', linewidth=0.8)
    ax.plot([0, 0], [-1.3, 0], [0, 0], color='black', linestyle='--', linewidth=0.8)
    ax.plot([0, 0], [0, 0], [-1.3, 0], color='black', linestyle='--', linewidth=0.8)

    theta_val = np.pi / 3.2
    phi_val = np.pi / 4.5

    xp = np.sin(theta_val) * np.cos(phi_val)
    yp = np.sin(theta_val) * np.sin(phi_val)
    zp = np.cos(theta_val)

    ax.add_artist(Arrow3D([0, xp], [0, yp], [0, zp], mutation_scale=20, lw=2.5, arrowstyle="-|>", color="#d62728"))
    ax.scatter([xp], [yp], [zp], color='#d62728', s=30, zorder=10)

    ax.plot([xp, xp], [yp, yp], [0, zp], color='#d62728', linestyle='--', linewidth=1.0)
    ax.plot([0, xp], [0, yp], [0, 0], color='#d62728', linestyle='--', linewidth=1.0)

    r_theta = 0.38
    t_theta = np.linspace(0, theta_val, 50)
    arc_x = r_theta * np.sin(t_theta) * np.cos(phi_val)
    arc_y = r_theta * np.sin(t_theta) * np.sin(phi_val)
    arc_z = r_theta * np.cos(t_theta)
    ax.plot(arc_x, arc_y, arc_z, color='#1f77b4', linewidth=1.5)
    
    t_mid = theta_val / 2
    ax.text(r_theta * 1.3 * np.sin(t_mid) * np.cos(phi_val),
            r_theta * 1.3 * np.sin(t_mid) * np.sin(phi_val),
            r_theta * 1.15 * np.cos(t_mid),
            r'$\theta$', color='#1f77b4', fontsize=16, ha='center', va='center')

    r_phi = 0.42
    t_phi = np.linspace(0, phi_val, 50)
    arc_phi_x = r_phi * np.cos(t_phi)
    arc_phi_y = r_phi * np.sin(t_phi)
    arc_phi_z = np.zeros_like(t_phi)
    ax.plot(arc_phi_x, arc_phi_y, arc_phi_z, color='#2ca02c', linewidth=1.5)
    
    t_phi_mid = phi_val / 2
    ax.text(r_phi * 1.3 * np.cos(t_phi_mid),
            r_phi * 1.3 * np.sin(t_phi_mid),
            -0.07,
            r'$\phi$', color='#2ca02c', fontsize=16, ha='center', va='center')

    ax.text(0, 0, 1.48, r'$|0\rangle$', fontsize=18, ha='center', va='bottom')
    ax.text(0, 0, -1.55, r'$|1\rangle$', fontsize=18, ha='center', va='top')
    ax.text(1.55, 0, 0, r'$x$', fontsize=16, ha='center', va='center')
    ax.text(0, 1.55, 0, r'$y$', fontsize=16, ha='center', va='center')
    ax.text(0, 0, 1.62, r'$z$', fontsize=16, ha='center', va='center')
    
    ax.text(xp * 1.18, yp * 1.18, zp * 1.18, r'$|\psi\rangle$', color='#d62728', fontsize=20, ha='center', va='center')

    ax.set_xlim([-1.3, 1.3])
    ax.set_ylim([-1.3, 1.3])
    ax.set_zlim([-1.3, 1.3])
    ax.set_box_aspect([1, 1, 1])

    ax.view_init(elev=20, azim=35)

    plt.tight_layout()
    plt.savefig(output_path, dpi=100, bbox_inches='tight', facecolor='white')
    plt.close()

if __name__ == '__main__':
    main()
