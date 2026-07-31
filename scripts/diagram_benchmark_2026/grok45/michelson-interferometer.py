import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon
from matplotlib.lines import Line2D

out = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#0f1419")
ax.set_facecolor("#0f1419")

# Layout (symmetric around beam splitter at center)
bs = (6.0, 4.5)
laser = (1.5, 4.5)
mirror_a = (6.0, 7.8)   # vertical arm
mirror_b = (10.5, 4.5)  # horizontal arm
screen = (6.0, 1.2)     # detector arm

# Colors
beam = "#f0c040"
beam_a = "#5ec8ff"
beam_b = "#7ee787"
comp = "#c8d0d8"
label_c = "#e8ecef"
bs_c = "#d4a574"

def component_box(xy, w, h, label, color=comp):
    x, y = xy
    box = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.05,rounding_size=0.12",
        facecolor="#1a2332", edgecolor=color, linewidth=2.0, zorder=5,
    )
    ax.add_patch(box)
    ax.text(x, y, label, ha="center", va="center", fontsize=11,
            color=label_c, fontweight="medium", zorder=6)

def arrow_segment(p0, p1, color, lw=2.2, style="-|>"):
    ax.annotate(
        "", xy=p1, xytext=p0,
        arrowprops=dict(
            arrowstyle=style,
            color=color,
            lw=lw,
            mutation_scale=14,
        ),
        zorder=3,
    )

# --- Components ---
# Laser
ax.add_patch(FancyBboxPatch(
    (laser[0] - 0.55, laser[1] - 0.35), 1.1, 0.7,
    boxstyle="round,pad=0.04,rounding_size=0.1",
    facecolor="#2a1520", edgecolor="#ff6b8a", linewidth=2.0, zorder=5,
))
ax.text(laser[0], laser[1], "Laser", ha="center", va="center",
        fontsize=11, color="#ffb3c1", fontweight="medium", zorder=6)

# Beam Splitter (diamond / square at 45°)
bs_size = 0.55
diamond = Polygon(
    [
        (bs[0], bs[1] + bs_size),
        (bs[0] + bs_size, bs[1]),
        (bs[0], bs[1] - bs_size),
        (bs[0] - bs_size, bs[1]),
    ],
    closed=True, facecolor="#2a2218", edgecolor=bs_c, linewidth=2.2, zorder=5,
)
ax.add_patch(diamond)
# splitting coating line
ax.plot(
    [bs[0] - bs_size * 0.55, bs[0] + bs_size * 0.55],
    [bs[1] - bs_size * 0.55, bs[1] + bs_size * 0.55],
    color=bs_c, lw=1.8, zorder=6,
)
ax.text(bs[0] + 0.15, bs[1] - 0.95, "Beam Splitter", ha="center", va="top",
        fontsize=10, color=bs_c, zorder=6)

# Mirror A (top)
component_box(mirror_a, 1.4, 0.45, "Mirror A", "#8ab4f8")
# reflective face indicator
ax.plot(
    [mirror_a[0] - 0.55, mirror_a[0] + 0.55],
    [mirror_a[1] - 0.28, mirror_a[1] - 0.28],
    color="#8ab4f8", lw=3.0, zorder=6,
)

# Mirror B (right)
component_box(mirror_b, 0.45, 1.4, "Mirror B", "#8ab4f8")
ax.plot(
    [mirror_b[0] - 0.28, mirror_b[0] - 0.28],
    [mirror_b[1] - 0.55, mirror_b[1] + 0.55],
    color="#8ab4f8", lw=3.0, zorder=6,
)

# Screen
ax.add_patch(FancyBboxPatch(
    (screen[0] - 0.9, screen[1] - 0.35), 1.8, 0.7,
    boxstyle="round,pad=0.04,rounding_size=0.1",
    facecolor="#1a2830", edgecolor="#9eeaf9", linewidth=2.0, zorder=5,
))
# fringe hint
for i, dx in enumerate([-0.45, -0.15, 0.15, 0.45]):
    ax.plot(
        [screen[0] + dx, screen[0] + dx],
        [screen[1] - 0.22, screen[1] + 0.22],
        color="#9eeaf9", lw=1.2 + (i % 2) * 0.8, alpha=0.7, zorder=6,
    )
ax.text(screen[0], screen[1] - 0.7, "Screen", ha="center", va="top",
        fontsize=11, color="#9eeaf9", fontweight="medium", zorder=6)

# --- Optical paths ---
# Laser -> BS
arrow_segment((laser[0] + 0.6, laser[1]), (bs[0] - bs_size - 0.05, bs[1]), beam, lw=2.4)

# BS -> Mirror A (transmit / reflect up)
arrow_segment((bs[0], bs[1] + bs_size + 0.05), (mirror_a[0], mirror_a[1] - 0.35), beam_a)
# Mirror A -> BS (return)
arrow_segment(
    (mirror_a[0] + 0.12, mirror_a[1] - 0.35),
    (bs[0] + 0.12, bs[1] + bs_size + 0.05),
    beam_a, lw=1.8,
)

# BS -> Mirror B
arrow_segment((bs[0] + bs_size + 0.05, bs[1]), (mirror_b[0] - 0.35, mirror_b[1]), beam_b)
# Mirror B -> BS (return)
arrow_segment(
    (mirror_b[0] - 0.35, mirror_b[1] - 0.12),
    (bs[0] + bs_size + 0.05, bs[1] - 0.12),
    beam_b, lw=1.8,
)

# Combined beam BS -> Screen
arrow_segment((bs[0], bs[1] - bs_size - 0.05), (screen[0], screen[1] + 0.4), "#e8d48b", lw=2.6)

# Small path labels
ax.text(3.5, 4.85, "incident", fontsize=8, color=beam, alpha=0.85, ha="center")
ax.text(5.55, 6.3, "arm A", fontsize=8, color=beam_a, alpha=0.9, ha="right", rotation=90)
ax.text(8.2, 4.85, "arm B", fontsize=8, color=beam_b, alpha=0.9, ha="center")
ax.text(6.35, 2.7, "interference", fontsize=8, color="#e8d48b", alpha=0.9, ha="left")

# Title
ax.text(6.0, 8.6, "Michelson Interferometer", ha="center", va="center",
        fontsize=16, color=label_c, fontweight="semibold")

plt.tight_layout(pad=0.3)
fig.savefig(out, dpi=100, bbox_inches="tight", facecolor=fig.get_facecolor(),
            pad_inches=0.15)
plt.close()
