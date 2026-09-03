import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Ellipse, Polygon

def draw_summer_fireworks(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    # Deep Navy Night Sky Gradient
    sky = np.zeros((900, 1200, 3))
    for y in range(900):
        t = y / 900.0
        # Dark navy top to deep indigo near horizon
        if y < 180: # River
            sky[y, :, 0] = 0.03 + 0.04 * (y / 180.0)
            sky[y, :, 1] = 0.04 + 0.05 * (y / 180.0)
            sky[y, :, 2] = 0.12 + 0.12 * (y / 180.0)
        else:
            sky[y, :, 0] = 0.01 + 0.08 * (1.0 - (y - 180) / 720.0)
            sky[y, :, 1] = 0.03 + 0.06 * (1.0 - (y - 180) / 720.0)
            sky[y, :, 2] = 0.10 + 0.18 * (1.0 - (y - 180) / 720.0)
    ax.imshow(sky, extent=[0, 1200, 0, 900], origin='lower')

    # Distant Stars
    np.random.seed(42)
    star_x = np.random.uniform(20, 1180, 50)
    star_y = np.random.uniform(300, 880, 50)
    ax.scatter(star_x, star_y, s=np.random.uniform(2, 6, 50), color='#ffffff', alpha=0.8)

    # 1. FIREWORK 1: Main Golden Burst (Center-Left: 420, 620)
    fx1, fy1 = 420, 620
    # Core
    ax.add_patch(Circle((fx1, fy1), 16, color='#FFFFFF'))
    ax.add_patch(Circle((fx1, fy1), 35, color='#FEF08A', alpha=0.3))

    # Rays
    n_rays = 32
    angles = np.linspace(0, 2 * np.pi, n_rays, endpoint=False)
    for a in angles:
        # Inner Ruby Spark
        r_in = 70
        ax.plot([fx1, fx1 + r_in * np.cos(a)], [fy1, fy1 + r_in * np.sin(a)], color='#F43F5E', lw=2.5)
        # Outer Gold Trail
        r_out = 190
        tx = fx1 + r_out * np.cos(a)
        ty = fy1 + r_out * np.sin(a) - 15 * np.sin(a)**2
        ax.plot([fx1 + r_in * np.cos(a), tx], [fy1 + r_in * np.sin(a), ty], color='#FACC15', lw=2.0, ls=(0, (4, 2)))
        ax.plot(tx, ty, 'o', color='#FEF9C3', markersize=3.5)

    # Launch Trail
    launch_y = np.linspace(180, fy1, 40)
    launch_x = fx1 + 8 * np.sin((launch_y - 180) / 440 * np.pi)
    ax.plot(launch_x, launch_y, color='#FEF08A', ls=':', lw=1.5, alpha=0.7)

    # 2. FIREWORK 2: Cyan & Magenta Peony (Top-Right: 850, 680)
    fx2, fy2 = 850, 680
    ax.add_patch(Circle((fx2, fy2), 14, color='#FFFFFF'))
    ax.add_patch(Circle((fx2, fy2), 30, color='#38BDF8', alpha=0.3))

    n_rays2 = 24
    angles2 = np.linspace(0, 2 * np.pi, n_rays2, endpoint=False)
    for a in angles2:
        # Inner Magenta
        r_in = 60
        ax.plot([fx2, fx2 + r_in * np.cos(a)], [fy2, fy2 + r_in * np.sin(a)], color='#EC4899', lw=2.5)
        # Outer Cyan
        r_out = 160
        tx = fx2 + r_out * np.cos(a)
        ty = fy2 + r_out * np.sin(a) - 10 * np.sin(a)**2
        ax.plot([fx2 + r_in * np.cos(a), tx], [fy2 + r_in * np.sin(a), ty], color='#38BDF8', lw=2.2)
        ax.plot(tx, ty, 'o', color='#BAE6FD', markersize=3.5)

    # Launch Trail 2
    launch_y2 = np.linspace(180, fy2, 40)
    launch_x2 = fx2 - 10 * np.sin((launch_y2 - 180) / 500 * np.pi)
    ax.plot(launch_x2, launch_y2, color='#BAE6FD', ls=':', lw=1.5, alpha=0.7)

    # 3. FIREWORK 3: Lime & Purple Starburst (Left: 180, 540)
    fx3, fy3 = 180, 540
    ax.add_patch(Circle((fx3, fy3), 10, color='#FFFFFF'))
    angles3 = np.linspace(0, 2 * np.pi, 16, endpoint=False)
    for a in angles3:
        ax.plot([fx3, fx3 + 45 * np.cos(a)], [fy3, fy3 + 45 * np.sin(a)], color='#C084FC', lw=2.5)
        ax.plot([fx3 + 45 * np.cos(a), fx3 + 110 * np.cos(a)], [fy3 + 45 * np.sin(a), fy3 + 110 * np.sin(a)], color='#A3E635', lw=2.0)
        ax.plot(fx3 + 110 * np.cos(a), fy3 + 110 * np.sin(a), 'o', color='#D9F99D', markersize=3)

    # 4. WATER REFLECTIONS
    ax.add_patch(Ellipse((fx1, 140), 280, 25, color='#FACC15', alpha=0.35))
    ax.add_patch(Ellipse((fx1, 100), 180, 16, color='#EA580C', alpha=0.25))
    ax.add_patch(Ellipse((fx2, 140), 220, 20, color='#38BDF8', alpha=0.35))
    ax.add_patch(Ellipse((fx2, 100), 140, 14, color='#EC4899', alpha=0.25))

    # 5. FOREGROUND FESTIVAL EMBANKMENT & STALLS
    # River Embankment Ground Silhouette
    ax.add_patch(Polygon([(0, 0), (1200, 0), (1200, 160), (600, 150), (0, 140)], color='#090D16'))

    # Ambient light warmth from stalls
    ax.add_patch(Ellipse((280, 120), 500, 60, color='#F97316', alpha=0.25))
    ax.add_patch(Ellipse((780, 120), 550, 60, color='#F97316', alpha=0.25))

    # Stall 1: Takoyaki (x=80)
    ax.add_patch(Polygon([(80, 210), (240, 210), (220, 250), (100, 250)], color='#DC2626'))
    ax.add_patch(Rectangle((100, 140), 120, 70, color='#1E1B4B'))
    ax.add_patch(Rectangle((125, 220), 70, 20, color='#FFFFFF'))
    ax.text(160, 230, 'TAKOYAKI', color='#DC2626', fontsize=8, fontweight='bold', ha='center', va='center')
    # Chochin Lanterns
    for lx, col in [(95, '#EF4444'), (130, '#FACC15'), (190, '#FACC15'), (225, '#EF4444')]:
        ax.add_patch(Ellipse((lx, 205), 18, 24, color=col))

    # Stall 2: Kingyo-sukui (x=340)
    ax.add_patch(Polygon([(340, 205), (490, 205), (475, 245), (355, 245)], color='#0284C7'))
    ax.add_patch(Rectangle((360, 140), 110, 65, color='#1E1B4B'))
    ax.add_patch(Rectangle((380, 215), 70, 20, color='#FFFFFF'))
    ax.text(415, 225, 'GOLDFISH', color='#0284C7', fontsize=8, fontweight='bold', ha='center', va='center')
    for lx, col in [(355, '#EF4444'), (415, '#FACC15'), (475, '#EF4444')]:
        ax.add_patch(Ellipse((lx, 200), 18, 22, color=col))

    # Stall 3: Yakisoba (x=590)
    ax.add_patch(Polygon([(590, 210), (750, 210), (730, 250), (610, 250)], color='#16A34A'))
    ax.add_patch(Rectangle((610, 140), 120, 70, color='#1E1B4B'))
    ax.add_patch(Rectangle((635, 220), 70, 20, color='#FFFFFF'))
    ax.text(670, 230, 'YAKISOBA', color='#16A34A', fontsize=8, fontweight='bold', ha='center', va='center')
    for lx, col in [(605, '#FACC15'), (650, '#EF4444'), (690, '#EF4444'), (735, '#FACC15')]:
        ax.add_patch(Ellipse((lx, 205), 18, 24, color=col))

    # String of Lanterns across stalls
    stall_wire_x = np.linspace(60, 860, 100)
    stall_wire_y = 205 - 12 * np.sin((stall_wire_x - 60) / 800 * 3 * np.pi)
    ax.plot(stall_wire_x, stall_wire_y, color='#78350F', lw=1.5)

    # 6. CROWD SILHOUETTES
    # Parent & Child
    ax.add_patch(Circle((860, 155), 14, color='#070A12'))
    ax.add_patch(Polygon([(845, 60), (875, 60), (870, 145), (850, 145)], color='#070A12'))
    ax.add_patch(Circle((890, 125), 9, color='#070A12'))
    ax.add_patch(Polygon([(880, 60), (900, 60), (898, 118), (882, 118)], color='#070A12'))

    # Couple in Yukata
    ax.add_patch(Circle((970, 160), 15, color='#070A12'))
    ax.add_patch(Polygon([(950, 50), (990, 50), (985, 150), (955, 150)], color='#070A12'))
    ax.add_patch(Rectangle((955, 115), 30, 8, color='#E11D48')) # Red Obi

    ax.add_patch(Circle((1010, 155), 14, color='#070A12'))
    ax.add_patch(Polygon([(992, 50), (1028, 50), (1022, 145), (998, 145)], color='#070A12'))
    ax.add_patch(Rectangle((998, 110), 24, 8, color='#3B82F6')) # Blue Obi

    # Spectator pointing to sky
    ax.add_patch(Circle((1100, 165), 15, color='#070A12'))
    ax.add_patch(Polygon([(1080, 40), (1120, 40), (1115, 155), (1085, 155)], color='#070A12'))
    ax.plot([1100, 1050], [140, 200], color='#070A12', lw=6, solid_capstyle='round')

    # People near stalls
    for cx in [280, 310, 520, 550]:
        ax.add_patch(Circle((cx, 145), 12, color='#070A12'))
        ax.add_patch(Polygon([(cx - 15, 60), (cx + 15, 60), (cx + 10, 135), (cx - 10, 135)], color='#070A12'))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_summer_fireworks(sys.argv[1])
    else:
        draw_summer_fireworks('summer-fireworks-festival.png')
