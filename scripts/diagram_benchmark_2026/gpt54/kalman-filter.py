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

def box(x, y, w, h, fc, ec, label):
    ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.02,rounding_size=18', facecolor=fc, edgecolor=ec, linewidth=3))
    ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=20, color='#1f2937')

box(120, 360, 120, 70, '#dbeafe', '#1d4ed8', 'u_k')
box(320, 300, 210, 90, '#fef3c7', '#b45309', 'Prediction')
box(640, 300, 210, 90, '#d1fae5', '#047857', 'Update')
box(920, 300, 150, 90, '#e9d5ff', '#7e22ce', 'x̂_k')
box(650, 520, 180, 78, '#fee2e2', '#b91c1c', 'Residual / K_k')
ax.annotate('', xy=(320, 345), xytext=(240, 395), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(640, 345), xytext=(530, 345), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(920, 345), xytext=(850, 345), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.plot([994, 994, 830], [390, 530, 560], color='#374151', linewidth=2.5)
ax.annotate('', xy=(830, 560), xytext=(994, 530), arrowprops=dict(arrowstyle='->', lw=0, color='#374151'))
ax.plot([650, 430, 430], [560, 560, 390], color='#374151', linewidth=2.5)
ax.annotate('', xy=(430, 390), xytext=(430, 560), arrowprops=dict(arrowstyle='->', lw=0, color='#374151'))
ax.annotate('', xy=(650, 520), xytext=(160, 520), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa', linestyle='--'))
ax.text(210, 505, 'Measurement z_k', fontsize=18, color='#1f2937')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
