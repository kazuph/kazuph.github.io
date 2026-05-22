import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Check output path
if len(sys.argv) < 2:
    sys.exit(1)

output_path = sys.argv[1]

# Create figure (1200x900 pixels equivalent: 12x9 inches at 100 dpi)
fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor('#0F172A') # Premium Slate 900
ax.set_facecolor('#0F172A')

# Set limits and aspect ratio
ax.set_xlim(-7, 7)
ax.set_ylim(-7, 7)
ax.set_aspect('equal')
ax.axis('off')

# Helper function to draw glowing laser beams with filled arrow heads
def draw_beam(start, end, arrow_pos=0.5, direction='right'):
    # Draw laser glow
    ax.plot([start[0], end[0]], [start[1], end[1]], color="#FF3366", linewidth=5.0, alpha=0.3, zorder=1)
    # Draw core beam
    ax.plot([start[0], end[0]], [start[1], end[1]], color="#FFD1DC", linewidth=1.5, alpha=0.95, zorder=2)
    
    # Arrow coordinates
    x = start[0] + (end[0] - start[0]) * arrow_pos
    y = start[1] + (end[1] - start[1]) * arrow_pos
    
    # Arrow size
    asz = 0.15
    if direction == 'right':
        arrow = patches.FancyArrowPatch((x - asz, y), (x + asz, y), arrowstyle="-|>", mutation_scale=14, color="#FF3366", zorder=3)
    elif direction == 'left':
        arrow = patches.FancyArrowPatch((x + asz, y), (x - asz, y), arrowstyle="-|>", mutation_scale=14, color="#FF3366", zorder=3)
    elif direction == 'up':
        arrow = patches.FancyArrowPatch((x, y - asz), (x, y + asz), arrowstyle="-|>", mutation_scale=14, color="#FF3366", zorder=3)
    elif direction == 'down':
        arrow = patches.FancyArrowPatch((x, y + asz), (x, y - asz), arrowstyle="-|>", mutation_scale=14, color="#FF3366", zorder=3)
    ax.add_patch(arrow)

# Draw Laser Source
laser_body = patches.FancyBboxPatch(
    (-6.0, -0.4), 1.4, 0.8,
    boxstyle="round,pad=0.08",
    facecolor="#334155", edgecolor="#64748B", linewidth=2.0, zorder=4
)
ax.add_patch(laser_body)

# Laser nozzle
laser_nozzle = patches.Rectangle((-4.6, -0.15), 0.2, 0.3, facecolor="#475569", edgecolor="#64748B", linewidth=1.0, zorder=4)
ax.add_patch(laser_nozzle)

# Glowing active region at nozzle exit
diode = patches.Circle((-4.4, 0), 0.06, facecolor="#FF3366", zorder=5)
ax.add_patch(diode)

# Laser Label
ax.text(-5.2, -0.85, "Laser Source\n(He-Ne Laser)", color="#E2E8F0", fontsize=11, fontweight='bold', ha='center', va='top', family='sans-serif')

# Draw Beam Splitter (BS)
# Translucent diagonal glass plate rotated by 45 degrees
theta = np.radians(45)
cos_t, sin_t = np.cos(theta), np.sin(theta)
def rotate(x, y):
    return x * cos_t - y * sin_t, x * sin_t + y * cos_t

bs_w, bs_h = 0.22, 1.8
bs_corners = [
    (-bs_w/2, -bs_h/2),
    (bs_w/2, -bs_h/2),
    (bs_w/2, bs_h/2),
    (-bs_w/2, bs_h/2)
]
bs_rot_corners = [rotate(cx, cy) for cx, cy in bs_corners]
bs_polygon = patches.Polygon(bs_rot_corners, facecolor="#38BDF8", edgecolor="#0EA5E9", linewidth=2.0, alpha=0.45, zorder=4)
ax.add_patch(bs_polygon)

# Coating (Half-silvered surface) on the diagonal y = x
coating_x = np.array([-0.65, 0.65])
coating_y = np.array([-0.65, 0.65])
ax.plot(coating_x, coating_y, color="#E2E8F0", linewidth=1.5, alpha=0.9, zorder=5)

# Beam Splitter Label
ax.text(1.2, 0.9, "Beam Splitter\n(50:50)", color="#E2E8F0", fontsize=11, fontweight='bold', ha='center', va='center', family='sans-serif')

# Draw Mirror A (Stationary Mirror M1)
# Reflective surface at x = 5.0
mirror_a_back = patches.Rectangle((5.0, -0.9), 0.35, 1.8, facecolor="#334155", edgecolor="#64748B", linewidth=2.0, zorder=4)
ax.add_patch(mirror_a_back)
# Reflective coating line (facing left)
ax.plot([5.0, 5.0], [-0.9, 0.9], color="#F1F5F9", linewidth=3.5, zorder=5)
ax.plot([5.0, 5.0], [-0.9, 0.9], color="#38BDF8", linewidth=6.0, alpha=0.4, zorder=3)

# Mirror A Label
ax.text(5.2, 1.25, "Mirror A\n(Stationary)", color="#E2E8F0", fontsize=11, fontweight='bold', ha='center', va='bottom', family='sans-serif')

# Draw Mirror B (Movable Mirror M2)
# Reflective surface at y = 5.0
mirror_b_back = patches.Rectangle((-0.9, 5.0), 1.8, 0.35, facecolor="#334155", edgecolor="#64748B", linewidth=2.0, zorder=4)
ax.add_patch(mirror_b_back)
# Reflective coating line (facing down)
ax.plot([-0.9, 0.9], [5.0, 5.0], color="#F1F5F9", linewidth=3.5, zorder=5)
ax.plot([-0.9, 0.9], [5.0, 5.0], color="#38BDF8", linewidth=6.0, alpha=0.4, zorder=3)

# Mirror B Label
ax.text(-1.25, 5.2, "Mirror B\n(Movable)", color="#E2E8F0", fontsize=11, fontweight='bold', ha='right', va='center', family='sans-serif')

# Draw Screen (Detector)
# Circular detector window at (0, -5.2) with concentric fringes
detector_outer = patches.Circle((0, -5.2), 0.9, facecolor="#334155", edgecolor="#64748B", linewidth=2.0, zorder=4)
ax.add_patch(detector_outer)
detector_inner = patches.Circle((0, -5.2), 0.8, facecolor="#020617", edgecolor="#10B981", linewidth=1.5, zorder=5)
ax.add_patch(detector_inner)

# Interference fringes (alternating concentric red rings)
for r, alpha in [(0.15, 0.85), (0.32, 0.65), (0.50, 0.45), (0.68, 0.25)]:
    fringe = patches.Circle((0, -5.2), r, fill=False, edgecolor="#FF3366", linewidth=3.5, alpha=alpha, zorder=6)
    ax.add_patch(fringe)

# Screen Label
ax.text(1.3, -5.2, "Screen\n(Interference Pattern)", color="#E2E8F0", fontsize=11, fontweight='bold', ha='left', va='center', family='sans-serif')

# Laser Beams Layout
# Offset to separate outgoing and returning beams clearly
offset = 0.18

# 1. Laser to Beam Splitter (Incoming Beam)
draw_beam((-4.4, 0), (0, 0), arrow_pos=0.55, direction='right')

# 2. Path A (to Mirror A and back)
# Outgoing to Mirror A (offset slightly up)
draw_beam((0 + offset, offset), (5.0, offset), arrow_pos=0.5, direction='right')
# Returning from Mirror A (offset slightly down)
draw_beam((5.0, -offset), (-offset, -offset), arrow_pos=0.5, direction='left')

# 3. Path B (to Mirror B and back)
# Outgoing to Mirror B (offset slightly left)
draw_beam((-offset, -offset), (-offset, 5.0), arrow_pos=0.5, direction='up')
# Returning from Mirror B (offset slightly right)
draw_beam((offset, 5.0), (offset, offset), arrow_pos=0.5, direction='down')

# 4. From Beam Splitter to Screen (Superimposed Beams)
# Reflected beam from Path A (goes down along -offset)
draw_beam((-offset, -offset), (-offset, -4.4), arrow_pos=0.45, direction='down')
# Transmitted beam from Path B (goes down along +offset)
draw_beam((offset, offset), (offset, -4.4), arrow_pos=0.55, direction='down')

# Save figure with tight borders
plt.tight_layout()
plt.savefig(output_path, facecolor=fig.get_facecolor(), bbox_inches='tight', pad_inches=0.1)
plt.close()
