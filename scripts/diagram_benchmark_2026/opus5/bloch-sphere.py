import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch

ELEV = math.radians(18.0)
AZIM = math.radians(25.0)

CAM = (
    math.cos(ELEV) * math.cos(AZIM),
    math.cos(ELEV) * math.sin(AZIM),
    math.sin(ELEV),
)
U = (-math.sin(AZIM), math.cos(AZIM), 0.0)
V = (
    -math.cos(AZIM) * math.sin(ELEV),
    -math.sin(AZIM) * math.sin(ELEV),
    math.cos(ELEV),
)

THETA = math.radians(52.0)
PHI = math.radians(48.0)

C_SPHERE_FILL = "#eef4fb"
C_SPHERE_EDGE = "#5c7185"
C_GRID = "#9fb3c8"
C_AXIS = "#34414d"
C_VEC = "#c0392b"
C_THETA = "#1b7a4b"
C_PHI = "#c47f0a"
C_HELP = "#7b8794"


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def scale(p, s):
    return (p[0] * s, p[1] * s, p[2] * s)


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def proj(p):
    return (dot(p, U), dot(p, V))


def depth(p):
    return dot(p, CAM)


def great_circle(a, b, n=361, t0=0.0, t1=2.0 * math.pi, radius=1.0):
    pts = []
    for i in range(n):
        t = t0 + (t1 - t0) * i / (n - 1)
        pts.append(
            scale(add(scale(a, math.cos(t)), scale(b, math.sin(t))), radius)
        )
    return pts


def split_by_visibility(pts):
    segments = []
    current = [pts[0]]
    visible = depth(pts[0]) >= 0.0
    for i in range(1, len(pts)):
        p = pts[i]
        vis = depth(p) >= 0.0
        if vis == visible:
            current.append(p)
        else:
            current.append(p)
            segments.append((visible, current))
            current = [pts[i - 1], p]
            visible = vis
    segments.append((visible, current))
    return segments


def draw_sphere_curve(ax, pts, width=1.1, zfront=2.0, zback=1.0):
    for visible, seg in split_by_visibility(pts):
        xs = [proj(p)[0] for p in seg]
        ys = [proj(p)[1] for p in seg]
        if visible:
            ax.plot(xs, ys, color=C_GRID, lw=width, alpha=0.85, zorder=zfront)
        else:
            ax.plot(
                xs,
                ys,
                color=C_GRID,
                lw=width * 0.85,
                alpha=0.45,
                ls=(0, (4, 4)),
                zorder=zback,
            )


def arrow(ax, tail, head, color, lw=1.6, size=18, zorder=6, ls="-"):
    p0 = proj(tail)
    p1 = proj(head)
    ax.add_patch(
        FancyArrowPatch(
            p0,
            p1,
            arrowstyle="-|>",
            mutation_scale=size,
            lw=lw,
            color=color,
            linestyle=ls,
            shrinkA=0,
            shrinkB=0,
            joinstyle="miter",
            capstyle="butt",
            zorder=zorder,
        )
    )


def line(ax, a, b, color, lw=1.2, ls="-", alpha=1.0, zorder=5):
    p0 = proj(a)
    p1 = proj(b)
    ax.plot(
        [p0[0], p1[0]],
        [p0[1], p1[1]],
        color=color,
        lw=lw,
        ls=ls,
        alpha=alpha,
        zorder=zorder,
        solid_capstyle="round",
    )


def label(ax, p, text, dx=0.0, dy=0.0, color="#1c1c1c", size=19, ha="center",
          va="center", weight="normal", zorder=9):
    x, y = proj(p)
    ax.text(
        x + dx,
        y + dy,
        text,
        color=color,
        fontsize=size,
        ha=ha,
        va=va,
        fontweight=weight,
        zorder=zorder,
    )


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: bloch-sphere.py OUTPUT_PATH\n")
        return 1
    out_path = sys.argv[1]

    fig = plt.figure(figsize=(12.0, 9.0), dpi=100)
    ax = fig.add_axes([0.0, 0.0, 1.0, 1.0])
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.2, 1.2)
    ax.set_aspect("equal")
    ax.set_axis_off()
    fig.patch.set_facecolor("white")

    ex = (1.0, 0.0, 0.0)
    ey = (0.0, 1.0, 0.0)
    ez = (0.0, 0.0, 1.0)

    ax.add_patch(
        Circle(
            (0.0, 0.0),
            1.0,
            facecolor=C_SPHERE_FILL,
            edgecolor="none",
            alpha=0.9,
            zorder=0,
        )
    )
    ax.add_patch(
        Circle(
            (0.0, 0.0),
            1.0,
            facecolor="none",
            edgecolor=C_SPHERE_EDGE,
            lw=1.8,
            zorder=3,
        )
    )

    draw_sphere_curve(ax, great_circle(ex, ey), width=1.3)
    draw_sphere_curve(ax, great_circle(ex, ez), width=1.0)
    draw_sphere_curve(ax, great_circle(ey, ez), width=1.0)
    for lat in (30.0, -30.0, 60.0, -60.0):
        r = math.cos(math.radians(lat))
        h = math.sin(math.radians(lat))
        ring = [add(p, (0.0, 0.0, h)) for p in great_circle(ex, ey, radius=r)]
        draw_sphere_curve(ax, ring, width=0.7)

    for axis, tip, lab, dx, dy in (
        (ex, 1.34, "$x$", -0.07, -0.05),
        (ey, 1.34, "$y$", 0.07, -0.03),
        (ez, 1.30, "$z$", 0.09, 0.02),
    ):
        line(ax, scale(axis, -1.28), (0.0, 0.0, 0.0), C_AXIS, lw=1.1,
             ls=(0, (5, 4)), alpha=0.65, zorder=1)
        arrow(ax, (0.0, 0.0, 0.0), scale(axis, tip), C_AXIS, lw=1.7, size=17,
              zorder=6)
        label(ax, scale(axis, tip), lab, dx=dx, dy=dy, color=C_AXIS, size=22,
              weight="bold")

    for pole, lab, dy in ((ez, r"$|0\rangle$", 0.09), (scale(ez, -1.0),
                                                       r"$|1\rangle$", -0.10)):
        px, py = proj(pole)
        ax.plot([px], [py], marker="o", ms=7.0, color=C_AXIS, zorder=7)
        ax.text(px + 0.13, py + dy, lab, fontsize=21, color="#1c1c1c",
                ha="left", va="center", zorder=9)

    n_phi = (math.cos(PHI), math.sin(PHI), 0.0)
    psi = add(scale(n_phi, math.sin(THETA)), scale(ez, math.cos(THETA)))
    psi_xy = scale(n_phi, math.sin(THETA))

    line(ax, psi_xy, psi, C_HELP, lw=1.3, ls=(0, (3, 3)), alpha=0.95, zorder=5)
    line(ax, (0.0, 0.0, 0.0), psi_xy, C_HELP, lw=1.3, ls=(0, (3, 3)),
         alpha=0.95, zorder=5)
    line(ax, psi_xy, (psi_xy[0], 0.0, 0.0), C_HELP, lw=0.9, ls=(0, (2, 4)),
         alpha=0.6, zorder=5)
    line(ax, psi_xy, (0.0, psi_xy[1], 0.0), C_HELP, lw=0.9, ls=(0, (2, 4)),
         alpha=0.6, zorder=5)
    px, py = proj(psi_xy)
    ax.plot([px], [py], marker="o", ms=4.5, color=C_HELP, zorder=6)

    r_theta = 0.42
    arc_theta = [
        scale(
            add(scale(ez, math.cos(t)), scale(n_phi, math.sin(t))),
            r_theta,
        )
        for t in [THETA * i / 200.0 for i in range(201)]
    ]
    xs = [proj(p)[0] for p in arc_theta]
    ys = [proj(p)[1] for p in arc_theta]
    ax.plot(xs, ys, color=C_THETA, lw=2.0, zorder=7)
    arrow(ax, arc_theta[-3], arc_theta[-1], C_THETA, lw=1.6, size=12, zorder=7)
    label(
        ax,
        scale(
            add(
                scale(ez, math.cos(THETA * 0.5)),
                scale(n_phi, math.sin(THETA * 0.5)),
            ),
            r_theta * 1.30,
        ),
        r"$\theta$",
        color=C_THETA,
        size=24,
    )

    r_phi = 0.55
    arc_phi = [
        (r_phi * math.cos(t), r_phi * math.sin(t), 0.0)
        for t in [PHI * i / 200.0 for i in range(201)]
    ]
    xs = [proj(p)[0] for p in arc_phi]
    ys = [proj(p)[1] for p in arc_phi]
    ax.plot(xs, ys, color=C_PHI, lw=2.0, zorder=7)
    arrow(ax, arc_phi[-3], arc_phi[-1], C_PHI, lw=1.6, size=12, zorder=7)
    label(
        ax,
        (
            r_phi * 1.28 * math.cos(PHI * 0.5),
            r_phi * 1.28 * math.sin(PHI * 0.5),
            0.0,
        ),
        r"$\varphi$",
        dy=-0.06,
        color=C_PHI,
        size=24,
    )

    arrow(ax, (0.0, 0.0, 0.0), psi, C_VEC, lw=2.8, size=24, zorder=8)
    tx, ty = proj(psi)
    ax.plot([tx], [ty], marker="o", ms=8.0, color=C_VEC, zorder=8)
    ax.text(tx + 0.10, ty + 0.10, r"$|\psi\rangle$", color=C_VEC, fontsize=26,
            ha="left", va="bottom", zorder=9)

    ax.text(
        -1.50,
        -1.02,
        r"$|\psi\rangle = \cos\dfrac{\theta}{2}\,|0\rangle"
        r" + e^{i\varphi}\sin\dfrac{\theta}{2}\,|1\rangle$",
        fontsize=21,
        color="#1c1c1c",
        ha="left",
        va="center",
        zorder=9,
    )

    fig.savefig(out_path, dpi=100, facecolor="white")
    plt.close(fig)
    return 0


if __name__ == "__main__":
    sys.exit(main())
