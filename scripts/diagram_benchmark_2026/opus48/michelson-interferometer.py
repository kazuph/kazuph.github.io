import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#0f172a")

BEAM = "#f87171"
BEAM2 = "#fca5a5"
MIR = "#93c5fd"
MIRBK = "#1e3a5f"
BS = "#fcd34d"
DEV = "#cbd5e1"
LBL = "#e2e8f0"

BSx, BSy = 5.0, 4.4
MAx, MAy = 5.0, 7.6
MBx, MBy = 10.2, 4.4
SCx, SCy = 5.0, 0.9


def beam(p0, p1, color, lw=4):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=16,
                 color=color, lw=lw, zorder=4))


# laser
ax.add_patch(Rectangle((0.4, 3.95), 0.9, 0.9, color=DEV))
ax.add_patch(Rectangle((1.3, 4.25), 0.2, 0.3, color=BEAM))
ax.text(0.85, 4.95, "Laser", ha="center", va="bottom", fontsize=12, color=LBL)

# beam splitter (45deg)
ax.plot([BSx - 0.55, BSx + 0.55], [BSy - 0.55, BSy + 0.55], color=BS, lw=6, zorder=5)
ax.text(BSx + 0.4, BSy + 0.4, "Beam Splitter", fontsize=11, color=BS, ha="left")

# mirror A (top)
ax.add_patch(Rectangle((4.0, 7.65), 2.0, 0.25, color=MIRBK))
ax.plot([4.0, 6.0], [7.62, 7.62], color=MIR, lw=5)
ax.text(5.0, 7.98, "Mirror A", ha="center", va="bottom", fontsize=12, color=LBL)

# mirror B (right)
ax.add_patch(Rectangle((10.25, 3.4), 0.25, 2.0, color=MIRBK))
ax.plot([10.22, 10.22], [3.4, 5.4], color=MIR, lw=5)
ax.text(10.6, 4.4, "Mirror B", ha="left", va="center", fontsize=12, color=LBL)

# screen
ax.add_patch(Rectangle((4.1, 0.4), 1.8, 0.55, color=DEV))
ax.text(5.0, 0.3, "Screen", ha="center", va="top", fontsize=12, color=LBL)

# beams
beam((1.5, 4.4), (BSx - 0.55, 4.4), BEAM, 5)
beam((BSx - 0.08, BSy + 0.45), (MAx - 0.08, MAy - 0.55), BEAM)
beam((MAx + 0.08, MAy - 0.55), (BSx + 0.08, BSy + 0.45), BEAM2)
beam((BSx + 0.5, BSy + 0.08), (MBx - 0.45, BSy + 0.08), BEAM)
beam((MBx - 0.45, BSy - 0.08), (BSx + 0.5, BSy - 0.08), BEAM2)
beam((BSx, BSy - 0.5), (SCx, SCy + 0.6), BEAM, 5)

# arm labels
ax.text(5.2, 6.3, "arm 1", fontsize=10, color=BEAM2)
ax.text(7.6, 4.6, "arm 2", fontsize=10, color=BEAM2, ha="center")

ax.text(6, 8.5, "Michelson Interferometer", ha="center", fontsize=17,
        fontweight="bold", color=LBL)

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
