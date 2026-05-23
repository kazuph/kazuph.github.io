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

ax.add_patch(patches.Rectangle((90, 620), 1020, 160, facecolor='#e9dcc9', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((130, 160), 190, 300, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#d8ccb8', edgecolor='#8b7d6b', linewidth=3))
ax.add_patch(patches.FancyBboxPatch((158, 188), 134, 220, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#2f3540', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((820, 410), 210, 150, boxstyle='round,pad=0.02,rounding_size=24', facecolor='#b48162', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((840, 350), 170, 90, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#b48162', edgecolor='none'))
ax.add_patch(patches.Circle((890, 318), 52, facecolor='#f3d8c6', edgecolor='none'))
ax.plot([852, 890, 946], [320, 244, 320], color='#ece7e2', linewidth=10)
ax.plot([858, 892, 930], [400, 358, 400], color='#7b5747', linewidth=10)
ax.plot([934, 970, 1002], [404, 436, 430], color='#7b5747', linewidth=10)
ax.plot([875, 905], [346, 352], color='#6f4f3d', linewidth=3)
ax.plot([858, 892], [540, 670], color='#6b4d3a', linewidth=12)
ax.plot([972, 952], [540, 690], color='#6b4d3a', linewidth=12)
ax.add_patch(patches.Arc((760, 330), 150, 170, theta1=260, theta2=100, edgecolor='#d7c7b4', linewidth=10))
ax.add_patch(patches.Arc((1050, 330), 150, 170, theta1=80, theta2=280, edgecolor='#d7c7b4', linewidth=10))
ax.scatter([872, 916], [318, 318], s=25, color='#49362c')
ax.annotate('', xy=(856, 320), xytext=(292, 302), arrowprops=dict(arrowstyle='->', lw=2.5, color='#8fb3da', linestyle='--'))
ax.add_patch(patches.Circle((232, 302), 10, facecolor='#f5e66a', edgecolor='none'))
ax.text(212, 148, 'TV', fontsize=22, color='#665749')
ax.text(760, 220, 'Curtain', fontsize=22, color='#665749')
ax.text(806, 610, 'Sofa', fontsize=22, color='#665749')

plt.tight_layout(pad=0)
fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)
