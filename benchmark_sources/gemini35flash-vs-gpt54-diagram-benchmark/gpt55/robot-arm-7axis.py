import sys
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d
from mpl_toolkits.mplot3d.art3d import Poly3DCollection


class Arrow3D(FancyArrowPatch):
    def __init__(self, xs, ys, zs, *args, **kwargs):
        super().__init__((0, 0), (0, 0), *args, **kwargs)
        self._verts3d = xs, ys, zs

    def do_3d_projection(self, renderer=None):
        xs, ys, zs = self._verts3d
        x2, y2, z2 = proj3d.proj_transform(xs, ys, zs, self.axes.M)
        self.set_positions((x2[0], y2[0]), (x2[1], y2[1]))
        return min(z2)


def add_cylinder_base(ax, center=(0, 0, 0), radius=0.8, height=0.28, color="#5b6472"):
    cx, cy, cz = center
    steps = 56
    top = []
    bottom = []

    for i in range(steps):
        a = 2 * math.pi * i / steps
        x = cx + radius * math.cos(a)
        y = cy + radius * math.sin(a)
        top.append((x, y, cz + height))
        bottom.append((x, y, cz))

    sides = []
    for i in range(steps):
        sides.append([bottom[i], bottom[(i + 1) % steps], top[(i + 1) % steps], top[i]])

    ax.add_collection3d(Poly3DCollection(sides, facecolor=color, edgecolor="#404652", linewidth=0.3, alpha=0.92))
    ax.add_collection3d(Poly3DCollection([top], facecolor="#707b8c", edgecolor="#404652", linewidth=0.5, alpha=0.95))
    ax.add_collection3d(Poly3DCollection([bottom], facecolor="#414955", edgecolor="#404652", linewidth=0.3, alpha=0.7))


def normalize(v):
    length = math.sqrt(sum(c * c for c in v))
    if length == 0:
        return (0, 0, 1)
    return tuple(c / length for c in v)


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def add_vec(a, b):
    return tuple(a[i] + b[i] for i in range(3))


def mul_vec(v, s):
    return tuple(c * s for c in v)


def add_rotation_arrow(ax, center, axis, radius=0.23, color="#e4572e"):
    axis = normalize(axis)
    helper = (0, 0, 1) if abs(axis[2]) < 0.85 else (0, 1, 0)
    u = normalize(cross(axis, helper))
    v = normalize(cross(axis, u))

    start = math.radians(25)
    end = math.radians(300)
    points = []

    for i in range(36):
        t = start + (end - start) * i / 35
        p = add_vec(center, add_vec(mul_vec(u, radius * math.cos(t)), mul_vec(v, radius * math.sin(t))))
        points.append(p)

    ax.plot(
        [p[0] for p in points],
        [p[1] for p in points],
        [p[2] for p in points],
        color=color,
        linewidth=2.0,
        alpha=0.95,
    )

    p0 = points[-4]
    p1 = points[-1]
    arrow = Arrow3D(
        [p0[0], p1[0]],
        [p0[1], p1[1]],
        [p0[2], p1[2]],
        mutation_scale=12,
        lw=1.8,
        arrowstyle="-|>",
        color=color,
    )
    ax.add_artist(arrow)


def add_tool(ax, wrist, tip):
    ax.plot(
        [wrist[0], tip[0]],
        [wrist[1], tip[1]],
        [wrist[2], tip[2]],
        color="#20242b",
        linewidth=7,
        solid_capstyle="round",
    )
    ax.scatter([tip[0]], [tip[1]], [tip[2]], s=80, color="#f4a261", edgecolor="#2b2f36", linewidth=1.0, zorder=10)
    ax.text(tip[0] + 0.08, tip[1] + 0.05, tip[2] + 0.04, "Hand", fontsize=12, weight="bold", color="#20242b")


def main():
    if len(sys.argv) < 2:
        raise SystemExit("output path required")

    output_path = sys.argv[1]

    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_subplot(111, projection="3d")
    fig.patch.set_facecolor("#f6f7f9")
    ax.set_facecolor("#f6f7f9")

    joints = [
        (0.0, 0.0, 0.30),
        (0.0, 0.0, 1.25),
        (0.62, 0.12, 1.95),
        (1.18, 0.42, 2.55),
        (1.82, 0.18, 2.18),
        (2.35, -0.18, 1.72),
        (2.86, 0.12, 1.34),
    ]

    axes = [
        (0, 0, 1),
        (0.25, 0.92, 0.15),
        (0.0, 0.45, 0.9),
        (0.8, -0.15, 0.55),
        (0.18, 0.95, 0.25),
        (0.65, 0.2, 0.72),
        (0.25, 0.88, 0.4),
    ]

    add_cylinder_base(ax)
    ax.text(-0.50, -0.62, 0.22, "Base", fontsize=13, weight="bold", color="#20242b")

    shadow = [(p[0] + 0.12, p[1] + 0.12, 0.04) for p in joints]
    ax.plot(
        [p[0] for p in shadow],
        [p[1] for p in shadow],
        [p[2] for p in shadow],
        color="#9aa1aa",
        linewidth=10,
        alpha=0.16,
        solid_capstyle="round",
    )

    for i in range(len(joints) - 1):
        a = joints[i]
        b = joints[i + 1]
        ax.plot(
            [a[0], b[0]],
            [a[1], b[1]],
            [a[2], b[2]],
            color="#2f6f9f",
            linewidth=12,
            alpha=0.95,
            solid_capstyle="round",
        )
        ax.plot(
            [a[0], b[0]],
            [a[1], b[1]],
            [a[2], b[2]],
            color="#8fd0ff",
            linewidth=4,
            alpha=0.55,
            solid_capstyle="round",
        )

    for i, p in enumerate(joints):
        ax.scatter([p[0]], [p[1]], [p[2]], s=230, color="#ffffff", edgecolor="#1f2a36", linewidth=1.6, zorder=20)
        ax.scatter([p[0]], [p[1]], [p[2]], s=80, color="#e4572e", edgecolor="#9c2f1c", linewidth=0.8, zorder=21)

        label_offsets = [
            (-0.35, -0.22, 0.08),
            (-0.38, -0.15, 0.10),
            (-0.25, 0.10, 0.18),
            (-0.12, 0.20, 0.16),
            (0.12, 0.18, 0.14),
            (0.18, -0.18, 0.08),
            (0.16, 0.16, 0.08),
        ]
        o = label_offsets[i]
        ax.text(p[0] + o[0], p[1] + o[1], p[2] + o[2], f"J{i + 1}", fontsize=13, weight="bold", color="#20242b")
        add_rotation_arrow(ax, p, axes[i], radius=0.22 if i < 5 else 0.18)

    tool_tip = (3.30, 0.34, 1.13)
    add_tool(ax, joints[-1], tool_tip)

    ax.plot(
        [0.0, 2.9],
        [-0.78, -0.78],
        [0.05, 0.05],
        color="#c8ced6",
        linewidth=2,
        alpha=0.9,
    )
    ax.text(1.20, -0.88, 0.08, "7-axis robot arm", fontsize=15, weight="bold", color="#20242b")

    ax.view_init(elev=24, azim=-58)
    ax.set_xlim(-0.9, 3.6)
    ax.set_ylim(-1.05, 1.15)
    ax.set_zlim(0.0, 3.05)
    ax.set_box_aspect((4.5, 2.2, 3.0))
    ax.set_axis_off()

    plt.subplots_adjust(left=0, right=1, bottom=0, top=1)
    plt.savefig(output_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)


if __name__ == "__main__":
    main()
