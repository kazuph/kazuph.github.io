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

ax.add_patch(patches.Circle((600, 420), 250, facecolor='#f8fbff', edgecolor='#6b7280', linewidth=3))
ax.add_patch(patches.Ellipse((600, 420), 500, 180, facecolor='none', edgecolor='#cbd5e1', linewidth=2))
ax.plot([350, 850], [420, 420], color='#94a3b8', linewidth=2)
ax.plot([600, 600], [170, 670], color='#94a3b8', linewidth=2)
ax.annotate('', xy=(760, 280), xytext=(600, 420), arrowprops=dict(arrowstyle='->', lw=4, color='#2563eb'))
ax.add_patch(patches.Arc((600, 420), 220, 220, theta1=43, theta2=90, edgecolor='#ef4444', linewidth=3))
ax.add_patch(patches.Arc((670, 418), 140, 140, theta1=0, theta2=40, edgecolor='#10b981', linewidth=3))
ax.text(606, 198, 'z', fontsize=22, color='#1f2937')
ax.text(822, 408, 'x', fontsize=22, color='#1f2937')
ax.text(724, 250, '|ψ⟩', fontsize=22, color='#1f2937')
ax.text(646, 344, 'θ', fontsize=20, color='#ef4444')
ax.text(720, 388, 'φ', fontsize=20, color='#10b981')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
