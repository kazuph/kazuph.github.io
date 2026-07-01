import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle, FancyBboxPatch
from matplotlib.lines import Line2D

output_path = sys.argv[1]

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
c_bg = "#0b1020"
c_box = "#1b2544"
c_edge = "#4a5a8a"
c_text = "#f2f3fb"
c_mirror = "#eef0f7"
c_bs = "#7fd8ff"
c_beam_out = "#ff5a5a"      # outgoing beam (laser -> arms)
c_beam_return = "#ffb454"   # returning beam (arms -> beam splitter)
c_beam_combined = "#c77dff"  # recombined beam -> screen

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(c_bg)
ax.set_facecolor(c_bg)
ax.set_xlim(-7.8, 7.8)
ax.set_ylim(-6.6, 6.9)
ax.set_aspect("equal")
ax.axis("off")

# ---------------------------------------------------------------------------
# Symmetric layout: Beam Splitter (BS) sits at the origin.
#   Laser  --------- BS --------- Mirror B      (horizontal axis)
#                    |
#                 Mirror A                       (up arm)
#                    |
#                    BS
#                    |
#                  Screen                        (down arm)
# ---------------------------------------------------------------------------
BS = (0.0, 0.0)
LASER_X = -5.6
MIRROR_B_X = 5.6
MIRROR_A_Y = 4.6
SCREEN_Y = -4.6
GAP = 0.18  # clearance around the beam-splitter center so beams don't overlap it


def arrow(start, end, color, lw=2.6, mutation=18, alpha=1.0, z=3):
    a = FancyArrowPatch(
        start, end,
        arrowstyle="-|>",
        mutation_scale=mutation,
        color=color,
        linewidth=lw,
        alpha=alpha,
        shrinkA=0, shrinkB=0,
        zorder=z,
    )
    ax.add_patch(a)


# ---------------------------------------------------------------------------
# Laser
# ---------------------------------------------------------------------------
laser_box = FancyBboxPatch(
    (LASER_X - 1.1, -0.55), 1.7, 1.1,
    boxstyle="round,pad=0.04,rounding_size=0.1",
    facecolor=c_box, edgecolor=c_edge, linewidth=1.8, zorder=4,
)
ax.add_patch(laser_box)
ax.text(LASER_X - 0.25, 0, "LASER", color=c_text, fontsize=13, fontweight="bold",
        ha="center", va="center", zorder=5)
ax.add_patch(Rectangle((LASER_X + 0.6, -0.08), 0.25, 0.16,
                        facecolor=c_beam_out, edgecolor="none", zorder=5))

# ---------------------------------------------------------------------------
# Beam splitter: a thin plate tilted at 45 degrees through the origin
# ---------------------------------------------------------------------------
bs_len = 1.05
diag = bs_len * np.cos(np.radians(45))
ax.plot([-diag, diag], [-diag, diag], color=c_bs, linewidth=7,
        solid_capstyle="round", alpha=0.9, zorder=6)
ax.plot([-diag, diag], [-diag, diag], color="white", linewidth=1.3, alpha=0.55, zorder=7)
ax.text(-2.1, 1.75, "BEAM SPLITTER", color=c_bs, fontsize=12, fontweight="bold",
        ha="left", va="center", zorder=8)
ax.plot([-1.15, -0.5], [1.6, 0.5], color=c_bs, linewidth=1.1, linestyle=":", alpha=0.8, zorder=6)

# ---------------------------------------------------------------------------
# Mirror A (top arm, horizontal reflective surface facing down)
# ---------------------------------------------------------------------------
ax.plot([-0.9, 0.9], [MIRROR_A_Y, MIRROR_A_Y], color=c_mirror, linewidth=7,
        solid_capstyle="round", zorder=6)
for hx in np.linspace(-0.82, 0.82, 9):
    ax.plot([hx, hx - 0.18], [MIRROR_A_Y, MIRROR_A_Y + 0.28],
            color=c_mirror, linewidth=1.3, alpha=0.7, zorder=5)
ax.text(0, MIRROR_A_Y + 0.62, "MIRROR A", color=c_text, fontsize=13, fontweight="bold",
        ha="center", va="bottom", zorder=5)

# ---------------------------------------------------------------------------
# Mirror B (right arm, vertical reflective surface facing left)
# ---------------------------------------------------------------------------
ax.plot([MIRROR_B_X, MIRROR_B_X], [-0.9, 0.9], color=c_mirror, linewidth=7,
        solid_capstyle="round", zorder=6)
for hy in np.linspace(-0.82, 0.82, 9):
    ax.plot([MIRROR_B_X, MIRROR_B_X + 0.28], [hy, hy - 0.18],
            color=c_mirror, linewidth=1.3, alpha=0.7, zorder=5)
ax.text(MIRROR_B_X + 0.6, 0, "MIRROR B", color=c_text, fontsize=13, fontweight="bold",
        ha="left", va="center", rotation=90, zorder=5)

# ---------------------------------------------------------------------------
# Screen (bottom arm) with a simple interference-fringe pattern
# ---------------------------------------------------------------------------
screen_w, screen_h = 1.7, 1.9
screen_box = FancyBboxPatch(
    (-screen_w / 2, SCREEN_Y - screen_h / 2), screen_w, screen_h,
    boxstyle="round,pad=0.03,rounding_size=0.06",
    facecolor="#05070f", edgecolor=c_edge, linewidth=1.8, zorder=4,
)
ax.add_patch(screen_box)
fringe = np.tile(0.5 + 0.5 * np.cos(np.linspace(0, 10 * np.pi, 300)), (40, 1))
ax.imshow(
    fringe, cmap="gray", aspect="auto", zorder=5,
    extent=(-screen_w / 2 + 0.12, screen_w / 2 - 0.12,
            SCREEN_Y - screen_h / 2 + 0.12, SCREEN_Y + screen_h / 2 - 0.12),
)
ax.text(0, SCREEN_Y - screen_h / 2 - 0.3, "SCREEN", color=c_text, fontsize=13,
        fontweight="bold", ha="center", va="top", zorder=5)

# ---------------------------------------------------------------------------
# Light paths (straight arrows)
# ---------------------------------------------------------------------------
# 1) Laser -> beam splitter (incoming beam)
arrow((LASER_X + 0.85, 0), (-GAP, 0), c_beam_out)

# 2) Beam splitter -> Mirror B (transmitted, outgoing) / Mirror B -> BS (returning)
arrow((GAP, 0.14), (MIRROR_B_X - 0.06, 0.14), c_beam_out)
arrow((MIRROR_B_X - 0.06, -0.14), (GAP, -0.14), c_beam_return)

# 3) Beam splitter -> Mirror A (reflected, outgoing) / Mirror A -> BS (returning)
arrow((-0.14, GAP), (-0.14, MIRROR_A_Y - 0.06), c_beam_out)
arrow((0.14, MIRROR_A_Y - 0.06), (0.14, GAP), c_beam_return)

# 4) Beam splitter -> Screen (recombined / interfered beam)
arrow((0, -GAP), (0, SCREEN_Y + screen_h / 2 + 0.05), c_beam_combined, lw=3.4, mutation=22)

# ---------------------------------------------------------------------------
# Title + legend
# ---------------------------------------------------------------------------
ax.text(0, 6.15, "Michelson Interferometer", color=c_text, fontsize=20,
        fontweight="bold", ha="center", va="center", zorder=9)

legend_elements = [
    Line2D([0], [0], color=c_beam_out, lw=2.8, label="Outgoing beam"),
    Line2D([0], [0], color=c_beam_return, lw=2.8, label="Returning beam"),
    Line2D([0], [0], color=c_beam_combined, lw=3.2, label="Recombined (interference) beam"),
]
leg = ax.legend(
    handles=legend_elements, loc="lower left", bbox_to_anchor=(0.0, 0.0),
    frameon=True, facecolor=c_box, edgecolor=c_edge, fontsize=10, labelcolor=c_text,
)
leg.set_zorder(9)

fig.savefig(output_path, facecolor=fig.get_facecolor())
