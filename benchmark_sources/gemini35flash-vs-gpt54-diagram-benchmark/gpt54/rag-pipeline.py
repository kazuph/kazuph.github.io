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

box(80, 336, 160, 82, '#dbeafe', '#2563eb', 'Query')
box(300, 336, 190, 82, '#fef3c7', '#b45309', 'Embed / Retrieve')
box(560, 220, 210, 82, '#d1fae5', '#047857', 'Vector DB')
box(560, 452, 210, 82, '#ccfbf1', '#0f766e', 'Retrieved docs')
box(840, 336, 160, 82, '#e9d5ff', '#7e22ce', 'LLM')
box(1040, 336, 120, 82, '#fee2e2', '#b91c1c', 'Answer')
box(310, 120, 240, 70, '#f3f4f6', '#6b7280', 'Document ingest / chunking')
ax.annotate('', xy=(300, 377), xytext=(240, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(560, 262), xytext=(490, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(840, 377), xytext=(770, 262), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(1040, 377), xytext=(1000, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(640, 220), xytext=(430, 190), arrowprops=dict(arrowstyle='->', lw=2.0, color='#6b7280', linestyle='--'))
ax.annotate('', xy=(640, 452), xytext=(640, 302), arrowprops=dict(arrowstyle='->', lw=2.0, color='#6b7280', linestyle='--'))
ax.annotate('', xy=(900, 418), xytext=(770, 492), arrowprops=dict(arrowstyle='->', lw=2.5, color='#047857'))

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
