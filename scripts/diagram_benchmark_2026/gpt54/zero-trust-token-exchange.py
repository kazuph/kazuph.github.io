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

ax.add_patch(patches.FancyBboxPatch((280, 180), 800, 400, boxstyle='round,pad=0.02,rounding_size=26', facecolor='none', edgecolor='#94a3b8', linewidth=4, linestyle='--'))
box(80, 240, 150, 90, '#dbeafe', '#2563eb', 'User')
box(80, 430, 150, 90, '#dbeafe', '#2563eb', 'Browser')
box(320, 320, 180, 90, '#fef3c7', '#b45309', 'IdP')
box(590, 240, 180, 90, '#d1fae5', '#047857', 'Service A')
box(590, 430, 180, 90, '#ccfbf1', '#0f766e', 'Service B')
box(870, 320, 170, 90, '#e9d5ff', '#7e22ce', 'API Gateway')
ax.annotate('', xy=(320, 355), xytext=(230, 285), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(320, 375), xytext=(230, 475), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(590, 285), xytext=(500, 355), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(590, 475), xytext=(500, 375), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(870, 355), xytext=(770, 285), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(870, 375), xytext=(770, 475), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.text(450, 220, 'Zero-trust boundary', fontsize=20, color='#64748b')
ax.text(278, 280, 'ID token', fontsize=16, color='#b45309')
ax.text(494, 260, 'Access token', fontsize=16, color='#047857')
ax.text(792, 286, 'Service token', fontsize=16, color='#7e22ce')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
