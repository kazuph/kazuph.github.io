import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

output_path = sys.argv[1]
fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 1200)
ax.set_ylim(0, 900)
ax.set_aspect('equal')
ax.axis('off')
fig.patch.set_facecolor('#fbfaf6')
ax.set_facecolor('#fbfaf6')

ax.add_patch(patches.FancyBboxPatch((120, 640), 220, 70, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#3f4c5a', edgecolor='none'))
joints = [(250, 620), (340, 520), (450, 430), (580, 358), (712, 310), (842, 282), (972, 268)]
xs = [p[0] for p in joints]
ys = [p[1] for p in joints]
ax.plot(xs, ys, color='#ed8936', linewidth=14, solid_capstyle='round')
ax.plot([972, 1060], [268, 240], color='#ed8936', linewidth=12, solid_capstyle='round')
ax.add_patch(patches.FancyBboxPatch((1058, 220), 44, 44, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#2b6cb0', edgecolor='none'))
for idx, (x, y) in enumerate(joints, start=1):
    ax.add_patch(patches.Circle((x, y), max(16, 36 - idx*2), facecolor='#718096', edgecolor='none'))
    ax.text(x - 32, y - 48, f'J{idx}', fontsize=18, color='#1f2937')
    ax.add_patch(patches.Arc((x + 8, y + 8), 52, 52, theta1=10, theta2=320, edgecolor='#2b6cb0', linewidth=2.2))

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
