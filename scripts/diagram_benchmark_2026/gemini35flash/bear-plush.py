import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

if len(sys.argv) < 2:
    sys.exit(1)
output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(-6.0, 6.0)
ax.set_ylim(-5.1, 3.9)
ax.axis('off')

fig.patch.set_facecolor('#FAF3EA')
ax.set_facecolor('#FAF3EA')
plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

shadow = patches.Ellipse((0, -4.6), width=7.0, height=1.0, color='#D8C8B8', alpha=0.35, zorder=0)
ax.add_patch(shadow)

ear_l_out = patches.Circle((-2.3, 2.4), radius=1.05, color='#C8916C', zorder=1)
ear_l_in = patches.Circle((-2.3, 2.4), radius=0.65, color='#EFAAA0', zorder=2)
ear_r_out = patches.Circle((2.3, 2.4), radius=1.05, color='#C8916C', zorder=1)
ear_r_in = patches.Circle((2.3, 2.4), radius=0.65, color='#EFAAA0', zorder=2)
ax.add_patch(ear_l_out)
ax.add_patch(ear_l_in)
ax.add_patch(ear_r_out)
ax.add_patch(ear_r_in)

body = patches.Ellipse((0, -2.1), width=4.6, height=3.8, color='#C8916C', zorder=3)
ax.add_patch(body)

ax.plot([0, 0], [-3.8, -1.2], color='#986542', linestyle=':', linewidth=2, zorder=4)

arm_l = patches.Ellipse((-2.4, -1.7), width=2.2, height=1.2, angle=35, color='#C8916C', zorder=5)
arm_r = patches.Ellipse((2.4, -1.7), width=2.2, height=1.2, angle=-35, color='#C8916C', zorder=5)
ax.add_patch(arm_l)
ax.add_patch(arm_r)

foot_l = patches.Circle((-1.9, -3.6), radius=1.1, color='#C8916C', zorder=6)
foot_l_pad = patches.Ellipse((-1.9, -3.6), width=1.4, height=1.2, color='#EFAAA0', zorder=7)
toe_l1 = patches.Circle((-2.4, -2.8), radius=0.22, color='#EFAAA0', zorder=7)
toe_l2 = patches.Circle((-1.9, -2.6), radius=0.22, color='#EFAAA0', zorder=7)
toe_l3 = patches.Circle((-1.4, -2.8), radius=0.22, color='#EFAAA0', zorder=7)

foot_r = patches.Circle((1.9, -3.6), radius=1.1, color='#C8916C', zorder=6)
foot_r_pad = patches.Ellipse((1.9, -3.6), width=1.4, height=1.2, color='#EFAAA0', zorder=7)
toe_r1 = patches.Circle((1.4, -2.8), radius=0.22, color='#EFAAA0', zorder=7)
toe_r2 = patches.Circle((1.9, -2.6), radius=0.22, color='#EFAAA0', zorder=7)
toe_r3 = patches.Circle((2.4, -2.8), radius=0.22, color='#EFAAA0', zorder=7)

ax.add_patch(foot_l)
ax.add_patch(foot_l_pad)
ax.add_patch(toe_l1)
ax.add_patch(toe_l2)
ax.add_patch(toe_l3)

ax.add_patch(foot_r)
ax.add_patch(foot_r_pad)
ax.add_patch(toe_r1)
ax.add_patch(toe_r2)
ax.add_patch(toe_r3)

head = patches.Ellipse((0, 0.9), width=5.0, height=4.2, color='#C8916C', zorder=8)
ax.add_patch(head)

ax.plot([0, 0], [1.3, 2.8], color='#986542', linestyle=':', linewidth=2, zorder=9)

blush_l = patches.Ellipse((-1.7, 0.4), width=0.9, height=0.5, color='#F38883', alpha=0.45, zorder=10)
blush_r = patches.Ellipse((1.7, 0.4), width=0.9, height=0.5, color='#F38883', alpha=0.45, zorder=10)
ax.add_patch(blush_l)
ax.add_patch(blush_r)

muzzle = patches.Ellipse((0, 0.2), width=2.1, height=1.5, color='#FFFDF8', zorder=11)
ax.add_patch(muzzle)

nose = patches.Ellipse((0, 0.55), width=0.65, height=0.42, color='#3B281B', zorder=12)
ax.add_patch(nose)

tongue = patches.Ellipse((0, 0.18), width=0.28, height=0.22, color='#F29494', zorder=12)
ax.add_patch(tongue)

t = np.linspace(0, np.pi, 50)
x_l = -0.3 + 0.3 * np.cos(t)
y_l = 0.32 - 0.22 * np.sin(t)
ax.plot(x_l, y_l, color='#3B281B', linewidth=2.5, zorder=13)

x_r = 0.3 - 0.3 * np.cos(t)
y_r = 0.32 - 0.22 * np.sin(t)
ax.plot(x_r, y_r, color='#3B281B', linewidth=2.5, zorder=13)

ax.plot([0, 0], [0.34, 0.32], color='#3B281B', linewidth=2.5, zorder=13)

eye_l = patches.Circle((-1.2, 1.0), radius=0.32, color='#2B1E13', zorder=14)
eye_r = patches.Circle((1.2, 1.0), radius=0.32, color='#2B1E13', zorder=14)
ax.add_patch(eye_l)
ax.add_patch(eye_r)

hl_l1 = patches.Circle((-1.12, 1.1), radius=0.09, color='#FFFFFF', zorder=15)
hl_l2 = patches.Circle((-1.3, 0.9), radius=0.04, color='#FFFFFF', zorder=15)
hl_r1 = patches.Circle((1.28, 1.1), radius=0.09, color='#FFFFFF', zorder=15)
hl_r2 = patches.Circle((1.1, 0.9), radius=0.04, color='#FFFFFF', zorder=15)
ax.add_patch(hl_l1)
ax.add_patch(hl_l2)
ax.add_patch(hl_r1)
ax.add_patch(hl_r2)

def get_heart_coords(cx, cy, scale):
    t_val = np.linspace(0, 2*np.pi, 300)
    x = 16 * np.sin(t_val)**3
    y = 13 * np.cos(t_val) - 5 * np.cos(2*t_val) - 2 * np.cos(3*t_val) - np.cos(4*t_val)
    return cx + x * scale * 0.05, cy + y * scale * 0.05

def get_star_coords(cx, cy, r_outer, r_inner):
    pts = []
    for i in range(10):
        r = r_outer if i % 2 == 0 else r_inner
        angle = i * np.pi / 5 - np.pi / 2
        pts.append((cx + r * np.cos(angle), cy + r * np.sin(angle)))
    return np.array(pts)

hx, hy = get_heart_coords(0, -1.8, scale=0.75)
ax.fill(hx, hy, color='#D86C6A', zorder=20)

hx_s, hy_s = get_heart_coords(0, -1.8, scale=0.81)
ax.plot(hx_s, hy_s, color='#FFFDF8', linestyle=':', linewidth=1.5, zorder=21)

s_pts = get_star_coords(0, -2.025, r_outer=0.16, r_inner=0.07)
ax.fill(s_pts[:, 0], s_pts[:, 1], color='#F3C159', zorder=22)

ax.plot([1.2, 1.4], [-0.8, -0.6], color='#8A5432', linewidth=2, zorder=25)
ax.plot([1.4, 1.2], [-0.8, -0.6], color='#8A5432', linewidth=2, zorder=25)

ax.plot([-1.5, -1.3], [1.9, 2.1], color='#8A5432', linewidth=2, zorder=25)
ax.plot([-1.3, -1.5], [1.9, 2.1], color='#8A5432', linewidth=2, zorder=25)

plt.savefig(output_path, dpi=100, facecolor=fig.get_facecolor(), edgecolor='none')
plt.close(fig)
