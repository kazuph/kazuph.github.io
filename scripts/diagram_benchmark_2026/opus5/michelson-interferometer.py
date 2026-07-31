import sys

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle


BEAM_IN = "#e4572e"
BEAM_A = "#1b7fd4"
BEAM_B = "#2aa876"
BEAM_OUT = "#8452c9"
INK = "#22252b"
PAPER = "#fbfaf7"

BS = (0.0, 0.0)
ARM = 3.4
LASER_X = -4.6
SCREEN_Y = -3.6
OFFSET = 0.22


def beam(ax, p0, p1, color, label=None, label_offset=(0.0, 0.0), double=False):
    arrow = FancyArrowPatch(
        p0,
        p1,
        arrowstyle="-|>",
        mutation_scale=20,
        linewidth=2.4,
        color=color,
        shrinkA=0,
        shrinkB=0,
        zorder=3,
    )
    ax.add_patch(arrow)
    if double:
        ax.add_patch(
            FancyArrowPatch(
                p1,
                p0,
                arrowstyle="-|>",
                mutation_scale=20,
                linewidth=2.4,
                color=color,
                shrinkA=0,
                shrinkB=0,
                zorder=3,
            )
        )
    if label:
        mx = (p0[0] + p1[0]) / 2 + label_offset[0]
        my = (p0[1] + p1[1]) / 2 + label_offset[1]
        ax.text(
            mx,
            my,
            label,
            color=color,
            fontsize=11,
            fontweight="bold",
            ha="center",
            va="center",
            zorder=4,
        )


def mirror(ax, cx, cy, angle, label, label_pos):
    length = 1.7
    thickness = 0.22
    rect = Rectangle(
        (-length / 2, 0.0),
        length,
        thickness,
        facecolor="#5b6472",
        edgecolor=INK,
        linewidth=1.6,
        zorder=5,
    )
    trans = (
        matplotlib.transforms.Affine2D().rotate_deg(angle).translate(cx, cy) + ax.transData
    )
    rect.set_transform(trans)
    ax.add_patch(rect)

    hatch = Rectangle(
        (-length / 2, thickness),
        length,
        0.16,
        facecolor="none",
        edgecolor=INK,
        hatch="////",
        linewidth=0.8,
        zorder=5,
    )
    hatch.set_transform(trans)
    ax.add_patch(hatch)

    ax.text(
        label_pos[0],
        label_pos[1],
        label,
        fontsize=13,
        fontweight="bold",
        color=INK,
        ha="center",
        va="center",
        zorder=6,
    )


def main(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)

    ax.set_xlim(-6.2, 6.2)
    ax.set_ylim(-5.0, 5.5)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(
        0.0,
        5.05,
        "Michelson Interferometer",
        fontsize=20,
        fontweight="bold",
        color=INK,
        ha="center",
        va="center",
    )

    # --- Laser source ---
    laser_body = Rectangle(
        (LASER_X - 1.25, -0.45),
        1.25,
        0.9,
        facecolor="#f5d6cc",
        edgecolor=INK,
        linewidth=1.8,
        zorder=5,
    )
    ax.add_patch(laser_body)
    ax.add_patch(
        Rectangle(
            (LASER_X - 0.12, -0.2),
            0.12,
            0.4,
            facecolor=BEAM_IN,
            edgecolor="none",
            zorder=6,
        )
    )
    ax.text(
        LASER_X - 0.62,
        0.0,
        "Laser",
        fontsize=13,
        fontweight="bold",
        color=INK,
        ha="center",
        va="center",
        zorder=7,
    )

    # --- Beam splitter (45 deg plate) ---
    bs = Rectangle(
        (-0.95, -0.11),
        1.9,
        0.22,
        facecolor="#cfe3f2",
        edgecolor=INK,
        linewidth=1.8,
        alpha=0.95,
        zorder=5,
    )
    bs.set_transform(
        matplotlib.transforms.Affine2D().rotate_deg(45).translate(*BS) + ax.transData
    )
    ax.add_patch(bs)
    ax.add_patch(Circle(BS, 0.06, color=INK, zorder=6))
    ax.text(
        -1.15,
        1.35,
        "Beam Splitter\n(50 : 50)",
        fontsize=12,
        fontweight="bold",
        color=INK,
        ha="center",
        va="center",
        zorder=6,
    )

    # --- Mirrors ---
    mirror(ax, ARM + 0.55, 0.0, 90, "Mirror A", (ARM + 1.55, 0.0))
    mirror(ax, 0.0, ARM + 0.55, 180, "Mirror B", (0.0, ARM + 1.55))

    # --- Screen / detector ---
    screen = Rectangle(
        (-1.15, SCREEN_Y - 0.16),
        2.3,
        0.32,
        facecolor="#dcd6ea",
        edgecolor=INK,
        linewidth=1.8,
        zorder=5,
    )
    ax.add_patch(screen)
    for i in range(-2, 3):
        ax.add_patch(
            Circle(
                (i * 0.34, SCREEN_Y),
                0.1,
                facecolor=BEAM_OUT if i % 2 == 0 else PAPER,
                edgecolor="none",
                zorder=6,
            )
        )
    ax.text(
        0.0,
        SCREEN_Y - 0.75,
        "Screen  (interference fringes)",
        fontsize=13,
        fontweight="bold",
        color=INK,
        ha="center",
        va="center",
        zorder=6,
    )

    # --- Incoming beam ---
    beam(
        ax,
        (LASER_X, OFFSET * 0.0),
        (-0.35, 0.0),
        BEAM_IN,
        "incident beam",
        (0.15, 0.42),
    )

    # --- Arm A: transmitted -> Mirror A -> back (symmetric offsets) ---
    beam(ax, (0.35, OFFSET), (ARM + 0.35, OFFSET), BEAM_A, "arm A", (0.0, 0.62))
    beam(ax, (ARM + 0.35, -OFFSET), (0.35, -OFFSET), BEAM_A, "return", (0.0, -0.62))

    # --- Arm B: reflected -> Mirror B -> back (mirrored geometry) ---
    beam(ax, (-OFFSET, 0.35), (-OFFSET, ARM + 0.35), BEAM_B, "arm B", (-0.72, 0.0))
    beam(ax, (OFFSET, ARM + 0.35), (OFFSET, 0.35), BEAM_B, "return", (0.78, 0.0))

    # --- Recombined beam to screen ---
    beam(
        ax,
        (0.0, -0.35),
        (0.0, SCREEN_Y + 0.22),
        BEAM_OUT,
        "recombined",
        (0.95, 0.55),
    )

    # --- Symmetry guides ---
    ax.plot([-5.4, 5.4], [0, 0], linestyle=(0, (6, 6)), color="#b6b2aa", linewidth=1.0, zorder=1)
    ax.plot([0, 0], [-4.6, 4.9], linestyle=(0, (6, 6)), color="#b6b2aa", linewidth=1.0, zorder=1)

    # --- Arm length annotations (symmetry) ---
    ax.annotate(
        "",
        xy=(0.0, -1.35),
        xytext=(ARM + 0.55, -1.35),
        arrowprops=dict(arrowstyle="<->", color="#7b7f88", linewidth=1.2),
    )
    ax.text(
        (ARM + 0.55) / 2,
        -1.68,
        "L₁",
        fontsize=12,
        color="#7b7f88",
        ha="center",
        va="center",
    )
    ax.annotate(
        "",
        xy=(-1.85, 0.0),
        xytext=(-1.85, ARM + 0.55),
        arrowprops=dict(arrowstyle="<->", color="#7b7f88", linewidth=1.2),
    )
    ax.text(
        -2.2,
        (ARM + 0.55) / 2,
        "L₂",
        fontsize=12,
        color="#7b7f88",
        ha="center",
        va="center",
    )

    fig.savefig(out_path, dpi=100, facecolor=PAPER, bbox_inches=None)
    plt.close(fig)


if __name__ == "__main__":
    main(sys.argv[1])
