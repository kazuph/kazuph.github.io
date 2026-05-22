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

ax.add_patch(patches.FancyBboxPatch((140, 310), 820, 210, boxstyle='round,pad=0.02,rounding_size=36', facecolor='#e7edf3', edgecolor='#617587', linewidth=5))
ax.add_patch(patches.Rectangle((300, 340), 220, 150, facecolor='#cdd8e3', edgecolor='#617587', linewidth=4))
ax.add_patch(patches.Rectangle((500, 336), 40, 158, facecolor='#617587', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((540, 388), 380, 54, boxstyle='round,pad=0.02,rounding_size=14', facecolor='#b8c7d6', edgecolor='#617587', linewidth=4))
ax.add_patch(patches.FancyBboxPatch((248, 370), 28, 92, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#d97d5d', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((564, 374), 24, 84, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#d97d5d', edgecolor='none'))
ax.annotate('', xy=(286, 402), xytext=(120, 402), arrowprops=dict(arrowstyle='->', lw=4, color='#60a5fa'))
ax.annotate('', xy=(828, 402), xytext=(980, 402), arrowprops=dict(arrowstyle='->', lw=4, color='#f87171'))
ax.text(188, 280, 'Cylinder', fontsize=22, color='#445566')
ax.text(332, 538, 'Pressure chamber A', fontsize=22, color='#445566')
ax.text(610, 538, 'Pressure chamber B', fontsize=22, color='#445566')
ax.text(486, 292, 'Piston', fontsize=20, color='#445566')
ax.text(690, 372, 'Rod', fontsize=20, color='#445566')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
