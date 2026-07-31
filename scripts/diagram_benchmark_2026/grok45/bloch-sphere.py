import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d


class Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0, 0), (0, 0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs3d, ys3d, zs3d = self._verts3d
        xs, ys, zs = proj3d.proj_transform(xs3d, ys3d, zs3d, self.axes.M)
        self.set_positions((xs[0], ys[0]), (xs[1], ys[1]))
        return np.min(zs)


def sphere_wireframe(ax, n_meridian=12, n_parallel=8, radius=1.0, **kwargs):
    u = np.linspace(0, 2 * np.pi, 80)
    for i in range(n_meridian):
        phi = 2 * np.pi * i / n_meridian
        x = radius * np.sin(u) * np.cos(phi)
        y = radius * np.sin(u) * np.sin(phi)
        z = radius * np.cos(u)
        ax.plot(x, y, z, **kwargs)
    v = np.linspace(0, np.pi, n_parallel + 2)[1:-1]
    for th in v:
        x = radius * np.sin(th) * np.cos(u)
        y = radius * np.sin(th) * np.sin(u)
        z = radius * np.cos(th) * np.ones_like(u)
        ax.plot(x, y, z, **kwargs)


def equator(ax, radius=1.0, **kwargs):
    u = np.linspace(0, 2 * np.pi, 200)
    ax.plot(radius * np.cos(u), radius * np.sin(u), np.zeros_like(u), **kwargs)


def main():
    out = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_box_aspect((1, 1, 1))

    u = np.linspace(0, 2 * np.pi, 60)
    v = np.linspace(0, np.pi, 40)
    uu, vv = np.meshgrid(u, v)
    xs = np.sin(vv) * np.cos(uu)
    ys = np.sin(vv) * np.sin(uu)
    zs = np.cos(vv)
    ax.plot_surface(
        xs, ys, zs,
        color="#dce8f5",
        alpha=0.22,
        linewidth=0,
        shade=True,
        rstride=1,
        cstride=1,
        antialiased=True,
    )

    wire = dict(color="#7a8a9a", lw=0.55, alpha=0.45)
    sphere_wireframe(ax, n_meridian=10, n_parallel=6, **wire)
    equator(ax, color="#4a5a6a", lw=1.1, alpha=0.7)

    L = 1.25
    axis_kw = dict(arrowstyle="-|>", mutation_scale=14, lw=1.6, color="#2c3e50")
    for a, b, c in [
        ([-L, L], [0, 0], [0, 0]),
        ([0, 0], [-L, L], [0, 0]),
        ([0, 0], [0, 0], [-L, L]),
    ]:
        ax.add_artist(Arrow3D(a, b, c, **axis_kw))

    fs = 14
    ax.text(L + 0.08, 0, 0, r"$x$", fontsize=fs, color="#2c3e50", ha="left", va="center")
    ax.text(0, L + 0.08, 0, r"$y$", fontsize=fs, color="#2c3e50", ha="left", va="center")
    ax.text(0, 0, L + 0.08, r"$z$", fontsize=fs, color="#2c3e50", ha="center", va="bottom")
    ax.text(0, 0, 1.12, r"$|0\rangle$", fontsize=13, color="#1a1a1a", ha="center", va="bottom")
    ax.text(0, 0, -1.18, r"$|1\rangle$", fontsize=13, color="#1a1a1a", ha="center", va="top")

    theta = np.pi / 3.2
    phi = np.pi / 4.5
    px = np.sin(theta) * np.cos(phi)
    py = np.sin(theta) * np.sin(phi)
    pz = np.cos(theta)

    ax.add_artist(
        Arrow3D(
            [0, px], [0, py], [0, pz],
            arrowstyle="-|>",
            mutation_scale=18,
            lw=2.4,
            color="#c0392b",
        )
    )
    ax.scatter([px], [py], [pz], color="#c0392b", s=36, depthshade=False, zorder=10)
    ax.text(
        px * 1.12, py * 1.12, pz * 1.12,
        r"$|\psi\rangle$",
        fontsize=15,
        color="#c0392b",
        ha="left",
        va="bottom",
        fontweight="bold",
    )

    ax.plot([px, px], [py, py], [0, pz], color="#c0392b", lw=0.9, ls="--", alpha=0.55)
    ax.plot([0, px], [0, py], [0, 0], color="#c0392b", lw=0.9, ls=":", alpha=0.55)
    ax.scatter([px], [py], [0], color="#c0392b", s=18, alpha=0.7, depthshade=False)

    n_arc = 60
    t_arc = np.linspace(0, theta, n_arc)
    ux, uy = np.cos(phi), np.sin(phi)
    arc_r = 0.38
    ax.plot(
        arc_r * np.sin(t_arc) * ux,
        arc_r * np.sin(t_arc) * uy,
        arc_r * np.cos(t_arc),
        color="#2980b9",
        lw=2.0,
    )
    mid_t = theta / 2
    ax.text(
        (arc_r + 0.08) * np.sin(mid_t) * ux,
        (arc_r + 0.08) * np.sin(mid_t) * uy,
        (arc_r + 0.08) * np.cos(mid_t),
        r"$\theta$",
        fontsize=13,
        color="#2980b9",
        ha="center",
        va="center",
    )

    p_arc = np.linspace(0, phi, n_arc)
    arc_rp = 0.32
    ax.plot(
        arc_rp * np.cos(p_arc),
        arc_rp * np.sin(p_arc),
        np.zeros_like(p_arc),
        color="#27ae60",
        lw=2.0,
    )
    mid_p = phi / 2
    ax.text(
        (arc_rp + 0.1) * np.cos(mid_p),
        (arc_rp + 0.1) * np.sin(mid_p),
        0.05,
        r"$\phi$",
        fontsize=13,
        color="#27ae60",
        ha="center",
        va="bottom",
    )

    ax.view_init(elev=22, azim=35)
    ax.set_xlim(-1.35, 1.35)
    ax.set_ylim(-1.35, 1.35)
    ax.set_zlim(-1.35, 1.35)
    ax.set_axis_off()
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    fig.savefig(out, dpi=100, bbox_inches="tight", pad_inches=0.08, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
