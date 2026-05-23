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

ax.add_patch(patches.FancyBboxPatch((100, 390), 120, 44, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#f87171', edgecolor='none'))
ax.text(112, 376, 'Laser', fontsize=22, color='#991b1b')
ax.annotate('', xy=(480, 412), xytext=(220, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#f87171'))
ax.add_patch(patches.Rectangle((480, 390), 60, 44, angle=45, facecolor='#e5e7eb', edgecolor='#4b5563', linewidth=3))
ax.text(456, 510, 'Beam Splitter', fontsize=20, color='#334155')
ax.annotate('', xy=(510, 170), xytext=(510, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.annotate('', xy=(810, 412), xytext=(510, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.add_patch(patches.Rectangle((452, 120), 116, 44, facecolor='#cbd5e1', edgecolor='#475569', linewidth=3))
ax.add_patch(patches.Rectangle((752, 390), 116, 44, facecolor='#cbd5e1', edgecolor='#475569', linewidth=3))
ax.text(430, 96, 'Mirror A', fontsize=22, color='#334155')
ax.text(736, 376, 'Mirror B', fontsize=22, color='#334155')
ax.plot([510, 510], [170, 412], color='#60a5fa', linewidth=2.5, linestyle='--')
ax.plot([810, 510], [412, 412], color='#60a5fa', linewidth=2.5, linestyle='--')
ax.annotate('', xy=(920, 412), xytext=(868, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.add_patch(patches.FancyBboxPatch((920, 360), 110, 106, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#fef3c7', edgecolor='#b45309', linewidth=3))
ax.text(938, 346, 'Screen', fontsize=22, color='#b45309')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
