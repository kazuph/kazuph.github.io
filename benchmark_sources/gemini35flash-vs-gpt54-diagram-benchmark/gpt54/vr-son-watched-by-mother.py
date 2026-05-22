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

ax.add_patch(patches.Rectangle((120, 600), 960, 180, facecolor='#e7dccc', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((150, 170), 240, 260, boxstyle='round,pad=0.02,rounding_size=24', facecolor='#d7c3a7', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((182, 208), 176, 180, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#f2eadf', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((780, 170), 190, 250, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#c1d2dd', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((820, 210), 110, 130, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#edf4fa', edgecolor='none'))
ax.add_patch(patches.Circle((600, 365), 60, facecolor='#f0c9ad', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((545, 342), 110, 44, boxstyle='round,pad=0.02,rounding_size=20', facecolor='#151a22', edgecolor='none'))
ax.plot([600, 532, 412], [420, 580, 640], color='#39506b', linewidth=18)
ax.plot([598, 682, 804], [418, 585, 638], color='#39506b', linewidth=18)
ax.plot([528, 412], [522, 640], color='#39506b', linewidth=16)
ax.plot([672, 804], [530, 638], color='#39506b', linewidth=16)
ax.add_patch(patches.Circle((396, 652), 22, facecolor='#7dd3fc', edgecolor='none'))
ax.add_patch(patches.Circle((820, 646), 22, facecolor='#7dd3fc', edgecolor='none'))
ax.add_patch(patches.Circle((910, 345), 52, facecolor='#f3d8c6', edgecolor='none'))
ax.plot([864, 910, 956], [334, 256, 334], color='#7a5a44', linewidth=9)
ax.plot([908, 860], [396, 546], color='#6b4d3a', linewidth=12)
ax.plot([908, 966], [398, 538], color='#b38a6f', linewidth=12)
ax.annotate('', xy=(644, 344), xytext=(872, 342), arrowprops=dict(arrowstyle='->', lw=2.5, color='#d64b4b', linestyle='--'))
ax.text(188, 150, 'Bed', fontsize=22, color='#665749')
ax.text(790, 150, 'Shelf', fontsize=22, color='#665749')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
