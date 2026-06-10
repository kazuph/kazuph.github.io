import numpy as np
import matplotlib.pyplot as plt
import sys
import matplotlib.patches as patches
from matplotlib.colors import LinearSegmentedColormap

if len(sys.argv) < 2:
    output_path = "hanabi.png"
else:
    output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_facecolor('#02020a')

X_grid, Y_grid = np.meshgrid(np.linspace(0, 12, 100), np.linspace(0, 9, 100))
Z = Y_grid / 9.0
colors = [(0.0, 0.0, 0.02), (0.02, 0.02, 0.12), (0.05, 0.05, 0.2)]
cmap = LinearSegmentedColormap.from_list('sky', colors, N=256)
ax.imshow(Z, cmap=cmap, aspect='auto', extent=[0, 12, 0, 9], origin='lower', zorder=1)

np.random.seed(42)
num_stars = 150
star_x = np.random.uniform(0, 12, num_stars)
star_y = np.random.uniform(2, 9, num_stars)
star_sizes = np.random.uniform(0.5, 3.0, num_stars)
star_alpha = np.random.uniform(0.3, 0.9, num_stars)
star_colors = np.zeros((num_stars, 4))
star_colors[:, :3] = 1.0
star_colors[:, 3] = star_alpha
ax.scatter(star_x, star_y, s=star_sizes, c=star_colors, zorder=2, edgecolors='none')

def draw_firework(ax, cx, cy, max_r, num_rays, color_inner, color_outer, zorder=3):
    for theta in np.linspace(0, 2*np.pi, num_rays, endpoint=False):
        r_len = max_r * np.random.uniform(0.8, 1.1)
        num_particles = 30
        rs = np.linspace(0, r_len, num_particles)
        
        gravity = 0.08
        xs = cx + rs * np.cos(theta)
        ys = cy + rs * np.sin(theta) - gravity * (rs ** 1.8)
        
        alphas = np.linspace(1.0, 0.1, num_particles)
        sizes = np.linspace(12, 1, num_particles)
        
        c_inner = np.array(color_inner)
        c_outer = np.array(color_outer)
        
        colors_list = []
        for i in range(num_particles):
            t = i / (num_particles - 1)
            c = (1-t)*c_inner + t*c_outer
            colors_list.append(np.append(c, alphas[i]))
            
        ax.scatter(xs, ys, s=sizes, c=colors_list, edgecolors='none', zorder=zorder)
        
        if np.random.rand() > 0.3:
            spark_r = r_len + np.random.uniform(0.1, 0.4)
            spark_x = cx + spark_r * np.cos(theta)
            spark_y = cy + spark_r * np.sin(theta) - gravity * (spark_r ** 1.8)
            ax.scatter(spark_x, spark_y, s=np.random.uniform(5, 15), 
                       color=np.append(c_outer, np.random.uniform(0.6, 1.0)), 
                       edgecolors='none', zorder=zorder)

draw_firework(ax, cx=4.0, cy=5.5, max_r=2.2, num_rays=45, 
              color_inner=[1.0, 1.0, 0.8], color_outer=[1.0, 0.5, 0.0], zorder=4)

draw_firework(ax, cx=8.5, cy=6.5, max_r=1.8, num_rays=40, 
              color_inner=[0.8, 1.0, 1.0], color_outer=[0.0, 0.6, 1.0], zorder=3)

draw_firework(ax, cx=6.5, cy=4.0, max_r=1.5, num_rays=35, 
              color_inner=[1.0, 0.9, 0.9], color_outer=[1.0, 0.1, 0.6], zorder=5)

ax.scatter([4.0, 8.5, 6.5], [5.5, 6.5, 4.0], s=[15000, 10000, 8000], 
           c=[[1.0, 0.5, 0.0, 0.05], [0.0, 0.6, 1.0, 0.05], [1.0, 0.1, 0.6, 0.05]], 
           edgecolors='none', zorder=3)

def draw_stall(ax, x_start, width, height, zorder=10):
    roof = patches.Polygon([
        [x_start - 0.2, height - 0.4],
        [x_start + width + 0.2, height - 0.4],
        [x_start + width + 0.4, height],
        [x_start - 0.4, height]
    ], closed=True, color='#020205', zorder=zorder)
    ax.add_patch(roof)
    
    table = patches.Rectangle((x_start, 0), width, height - 0.5, color='#020205', zorder=zorder)
    ax.add_patch(table)
    
    post_l = patches.Rectangle((x_start + 0.1, 0), 0.1, height, color='#020205', zorder=zorder)
    post_r = patches.Rectangle((x_start + width - 0.2, 0), 0.1, height, color='#020205', zorder=zorder)
    ax.add_patch(post_l)
    ax.add_patch(post_r)

    num_lanterns = 4
    lantern_xs = np.linspace(x_start + 0.2, x_start + width - 0.2, num_lanterns)
    lantern_y = height - 0.5
    
    for lx in lantern_xs:
        ax.plot([lx, lx], [height - 0.4, lantern_y], color='#020205', lw=1.5, zorder=zorder+1)
        ax.scatter(lx, lantern_y, s=400, color='#ff6600', alpha=0.2, zorder=zorder+1, edgecolors='none')
        ax.scatter(lx, lantern_y, s=200, color='#ffaa00', alpha=0.5, zorder=zorder+2, edgecolors='none')
        ax.scatter(lx, lantern_y, s=80, color='#ffeaad', alpha=0.9, zorder=zorder+3, edgecolors='none')
        ax.scatter(lx, lantern_y + 0.15, s=15, marker='s', color='#020205', zorder=zorder+4)
        ax.scatter(lx, lantern_y - 0.15, s=15, marker='s', color='#020205', zorder=zorder+4)

draw_stall(ax, x_start=1.0, width=2.8, height=2.2, zorder=10)
draw_stall(ax, x_start=4.6, width=2.8, height=2.2, zorder=10)
draw_stall(ax, x_start=8.2, width=2.8, height=2.2, zorder=10)

def draw_person_silhouette(ax, x, y, scale=1.0, zorder=12):
    head = patches.Circle((x, y + 0.8 * scale), 0.15 * scale, color='#010103', zorder=zorder)
    ax.add_patch(head)
    body = patches.Polygon([
        [x - 0.25 * scale, y],
        [x + 0.25 * scale, y],
        [x + 0.15 * scale, y + 0.75 * scale],
        [x - 0.15 * scale, y + 0.75 * scale]
    ], closed=True, color='#010103', zorder=zorder)
    ax.add_patch(body)

np.random.seed(123)
ground = patches.Rectangle((0, 0), 12, 0.4, color='#010103', zorder=11)
ax.add_patch(ground)

people_pos = [
    (0.5, 0.2, 1.1), (0.8, 0.3, 0.95),
    (4.0, 0.2, 1.0), (4.3, 0.1, 1.05), (4.5, 0.3, 0.9),
    (7.6, 0.25, 1.0), (7.9, 0.2, 1.0), (8.1, 0.3, 0.9),
    (11.2, 0.1, 1.1), (11.5, 0.2, 0.95),
    (2.0, 0.05, 1.2), (2.5, 0.1, 1.15),
    (5.8, 0.05, 1.2), (6.3, 0.1, 1.15),
    (9.4, 0.05, 1.2), (10.0, 0.1, 1.15)
]

for px, py, pscale in people_pos:
    draw_person_silhouette(ax, px, py, scale=pscale, zorder=12)

for x_center in [2.4, 6.0, 9.6]:
    glow = patches.Ellipse((x_center, 0.3), 3.5, 0.6, color='#ff6600', alpha=0.15, zorder=9)
    ax.add_patch(glow)

ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.axis('off')

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
plt.savefig(output_path, dpi=100, bbox_inches='tight', pad_inches=0, facecolor='#02020a')
plt.close()
