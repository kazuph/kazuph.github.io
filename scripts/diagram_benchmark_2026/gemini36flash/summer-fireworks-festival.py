import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_summer_fireworks_festival(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_night = '#0B132B'
    c_sky = '#1C2541'
    c_gold = '#FFD166'
    c_pink = '#EF476F'
    c_blue = '#118AB2'
    c_lantern = '#E63946'
    c_glow = '#FFB703'
    c_person = '#080E1E'

    # Night Sky Background
    fig.patch.set_facecolor(c_night)
    ax.add_patch(patches.Rectangle((-6, -4.5), 12, 9, facecolor=c_night))

    # Stars
    np.random.seed(42)
    star_x = np.random.uniform(-5.5, 5.5, 60)
    star_y = np.random.uniform(-1.0, 4.2, 60)
    ax.scatter(star_x, star_y, s=np.random.uniform(2, 10, 60), color='white', alpha=0.8)

    # Fireworks Helper
    def add_firework(cx, cy, r_max, color_main, color_sub, num_rays=24):
        for angle in np.linspace(0, 2*np.pi, num_rays, endpoint=False):
            rx = cx + r_max * np.cos(angle)
            ry = cy + r_max * np.sin(angle)
            ax.plot([cx, rx], [cy, ry], color=color_main, linewidth=1.5, alpha=0.9)
            ax.scatter(rx, ry, s=25, color=color_main, zorder=3)

            # Inner ring
            sub_x = cx + 0.6 * r_max * np.cos(angle + 0.1)
            sub_y = cy + 0.6 * r_max * np.sin(angle + 0.1)
            ax.scatter(sub_x, sub_y, s=15, color=color_sub, zorder=3)
        ax.scatter(cx, cy, s=80, color='white', zorder=4)

    # 3 Fireworks
    add_firework(-2.0, 2.0, 1.8, c_gold, c_pink, 28)
    add_firework(2.2, 2.5, 1.5, c_pink, c_gold, 24)
    add_firework(3.5, 0.6, 1.1, c_blue, c_gold, 20)

    # River / Ground Silhouette
    ax.add_patch(patches.Polygon([(-6, -4.5), (6, -4.5), (6, -2.0), (-6, -2.0)], facecolor=c_person))

    # Festival Stalls (Bottom Left & Right)
    ax.add_patch(patches.Rectangle((-5.2, -3.8), 2.8, 1.4, facecolor='#4A2810', edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Polygon([(-5.4, -2.4), (-2.2, -2.4), (-2.5, -2.0), (-5.1, -2.0)], facecolor=c_lantern))

    ax.add_patch(patches.Rectangle((1.5, -3.8), 2.8, 1.4, facecolor='#4A2810', edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Polygon([(1.3, -2.4), (4.5, -2.4), (4.2, -2.0), (1.6, -2.0)], facecolor=c_glow))

    # Hanging Lanterns (Chochin)
    ax.plot([-5.5, 5.5], [-1.8, -1.8], color='white', linewidth=1, alpha=0.7)
    for lx in np.linspace(-5.0, 5.0, 11):
        ax.add_patch(patches.Circle((lx, -2.2), 0.3, facecolor=c_glow, alpha=0.3))
        ax.add_patch(patches.Rectangle((lx - 0.15, -2.35), 0.3, 0.35, facecolor=c_lantern, edgecolor='black', linewidth=1))
        ax.add_patch(patches.Rectangle((lx - 0.08, -2.3), 0.16, 0.25, facecolor=c_glow, edgecolor='none'))
        ax.plot([lx, lx], [-1.8, -2.0], color='black', linewidth=1)

    # Crowd Silhouettes
    for px in np.linspace(-5.2, 5.2, 18):
        # Head
        ax.add_patch(patches.Circle((px, -3.0), 0.22, facecolor='#030712'))
        # Body / Yukata
        ax.add_patch(patches.Polygon([(px-0.28, -4.2), (px-0.15, -3.2), (px+0.15, -3.2), (px+0.28, -4.2)], facecolor='#030712'))

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'summer-fireworks-festival.png'
    draw_summer_fireworks_festival(output_file)
