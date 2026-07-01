import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import proj3d  # noqa: F401  (registers 3d projection)
from matplotlib.patches import FancyArrowPatch

output_path = sys.argv[1]


class Arrow3D(FancyArrowPatch):
    """A FancyArrowPatch that projects a 3D segment onto the current 3D axes."""

    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0, 0), (0, 0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs2d, ys2d, zs2d = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs2d[0], ys2d[0]), (xs2d[1], ys2d[1]))
        return np.min(zs2d)


# ---------------------------------------------------------------------------
# figure / axes setup
# ---------------------------------------------------------------------------
fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor("white")

ax = fig.add_subplot(111, projection="3d")
ax.set_facecolor("white")
ax.view_init(elev=22, azim=-55)

LIM = 1.35
ax.set_xlim(-LIM, LIM)
ax.set_ylim(-LIM, LIM)
ax.set_zlim(-LIM, LIM)
try:
    ax.set_box_aspect((1, 1, 1))
except AttributeError:
    pass

ax.set_axis_off()  # no ticks / panes / grid / default axis box

# ---------------------------------------------------------------------------
# the sphere itself: light surface + sparse latitude/longitude wireframe
# ---------------------------------------------------------------------------
u = np.linspace(0, 2 * np.pi, 60)
v = np.linspace(0, np.pi, 60)
sx = np.outer(np.cos(u), np.sin(v))
sy = np.outer(np.sin(u), np.sin(v))
sz = np.outer(np.ones_like(u), np.cos(v))

ax.plot_surface(sx, sy, sz, color="#bcd8f0", alpha=0.10, linewidth=0, shade=False)
ax.plot_wireframe(sx, sy, sz, rstride=6, cstride=6, color="#7f9db9", linewidth=0.4, alpha=0.35)

# equator (xy-plane, z=0) and prime meridian (xz-plane, y=0) drawn explicitly
t = np.linspace(0, 2 * np.pi, 200)
ax.plot(np.cos(t), np.sin(t), np.zeros_like(t), color="#5b7fa6", lw=1.1, ls="--", alpha=0.8)
ax.plot(np.cos(t), np.zeros_like(t), np.sin(t), color="#5b7fa6", lw=1.1, ls="--", alpha=0.5)
ax.plot(np.zeros_like(t), np.cos(t), np.sin(t), color="#5b7fa6", lw=1.1, ls="--", alpha=0.5)

# ---------------------------------------------------------------------------
# x, y, z coordinate axes (through the sphere, arrowhead on the positive end)
# ---------------------------------------------------------------------------
AXIS_EXT = 1.28
axis_specs = [
    ((-AXIS_EXT, AXIS_EXT), (0, 0), (0, 0), "x"),
    ((0, 0), (-AXIS_EXT, AXIS_EXT), (0, 0), "y"),
    ((0, 0), (0, 0), (-AXIS_EXT, AXIS_EXT), "z"),
]
for xs, ys, zs, label in axis_specs:
    ax.plot(xs, ys, zs, color="black", lw=1.0, alpha=0.85, zorder=1)
    arrow = Arrow3D(
        [0, xs[1]], [0, ys[1]], [0, zs[1]],
        mutation_scale=14, lw=1.3, arrowstyle="-|>", color="black", zorder=2,
    )
    ax.add_artist(arrow)
    ax.text(xs[1] * 1.08, ys[1] * 1.08, zs[1] * 1.08, f"${label}$",
             fontsize=17, ha="center", va="center")

# textbook convention: poles are the computational basis states
ax.text(0, 0, 1.18, r"$|0\rangle$", fontsize=15, ha="center", va="bottom")
ax.text(0, 0, -1.18, r"$|1\rangle$", fontsize=15, ha="center", va="top")

# ---------------------------------------------------------------------------
# quantum state vector |psi> on the sphere surface
# ---------------------------------------------------------------------------
theta = np.radians(55)   # polar angle, measured from +z
phi = np.radians(40)     # azimuthal angle, measured from +x in the xy-plane

psi_x = np.sin(theta) * np.cos(phi)
psi_y = np.sin(theta) * np.sin(phi)
psi_z = np.cos(theta)

state_arrow = Arrow3D(
    [0, psi_x], [0, psi_y], [0, psi_z],
    mutation_scale=22, lw=2.6, arrowstyle="-|>", color="#c0392b", zorder=6,
)
ax.add_artist(state_arrow)
ax.text(psi_x * 1.14, psi_y * 1.14, psi_z * 1.14, r"$|\psi\rangle$",
        fontsize=17, color="#c0392b", ha="center", va="center", zorder=6)

# helper guide lines: drop from the tip to the equatorial plane, and out to
# the azimuthal projection point, so theta/phi read visually off the figure
ax.plot([psi_x, psi_x], [psi_y, psi_y], [0, psi_z], color="#888888", lw=0.9, ls=":", alpha=0.8)
ax.plot([0, psi_x], [0, psi_y], [0, 0], color="#888888", lw=0.9, ls=":", alpha=0.8)

# ---------------------------------------------------------------------------
# small arcs indicating theta (in the meridian plane through |psi>) and
# phi (in the equatorial plane)
# ---------------------------------------------------------------------------
r_theta = 0.42
t_theta = np.linspace(0, theta, 60)
theta_arc_x = r_theta * np.sin(t_theta) * np.cos(phi)
theta_arc_y = r_theta * np.sin(t_theta) * np.sin(phi)
theta_arc_z = r_theta * np.cos(t_theta)
ax.plot(theta_arc_x, theta_arc_y, theta_arc_z, color="#1f6fb2", lw=2.0, zorder=5)

mid_t = theta * 0.55
ax.text(
    1.18 * r_theta * np.sin(mid_t) * np.cos(phi),
    1.18 * r_theta * np.sin(mid_t) * np.sin(phi),
    1.18 * r_theta * np.cos(mid_t),
    r"$\theta$", fontsize=15, color="#1f6fb2", ha="center", va="center", zorder=5,
)

r_phi = 0.30
t_phi = np.linspace(0, phi, 60)
phi_arc_x = r_phi * np.cos(t_phi)
phi_arc_y = r_phi * np.sin(t_phi)
phi_arc_z = np.zeros_like(t_phi)
ax.plot(phi_arc_x, phi_arc_y, phi_arc_z, color="#218c5a", lw=2.0, zorder=5)

mid_p = phi * 0.55
ax.text(
    1.28 * r_phi * np.cos(mid_p),
    1.28 * r_phi * np.sin(mid_p),
    0.0,
    r"$\phi$", fontsize=15, color="#218c5a", ha="center", va="center", zorder=5,
)

# ---------------------------------------------------------------------------
# title, styled like a physics textbook figure caption
# ---------------------------------------------------------------------------
ax.text2D(
    0.5, 0.94, "Bloch Sphere Representation of a Qubit State",
    transform=ax.transAxes, fontsize=15, ha="center", va="center", color="#222222",
)

fig.savefig(output_path, facecolor=fig.get_facecolor())
