import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_fireworks_festival(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#030712")
    ax.set_facecolor("#030712")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # NIGHT SKY BACKGROUND GRADIENT
    # Interpolated sky layers
    y_sky = np.linspace(200, 900, 40)
    for i in range(len(y_sky) - 1):
        # From midnight purple/slate to deep black
        alpha_val = (y_sky[i] - 200) / 700.0
        # Color interpolation
        r = 0.02 + 0.12 * (1.0 - alpha_val)
        g = 0.04 + 0.12 * (1.0 - alpha_val)
        b = 0.12 + 0.25 * (1.0 - alpha_val)
        ax.add_patch(patches.Rectangle((0, y_sky[i]), 1200, y_sky[i+1] - y_sky[i],
                                       color=(r, g, b), ec="none", zorder=1))

    # SCATTERED STARS
    np.random.seed(42)
    sx = np.random.uniform(20, 1180, 80)
    sy = np.random.uniform(400, 880, 80)
    s_sizes = np.random.uniform(1.0, 3.5, 80)
    ax.scatter(sx, sy, s=s_sizes, color="#ffffff", alpha=0.7, zorder=2)

    # FIREWORKS HELPER FUNCTION
    def draw_burst(cx, cy, r_outer, count, c_main, c_tip, zorder_base=10):
        # Radial sparks
        angles = np.linspace(0, 2 * np.pi, count, endpoint=False)
        for i, ang in enumerate(angles):
            # Vary radius slightly
            r = r_outer * (0.85 + 0.15 * np.sin(i * 4))
            # Curvature slightly downward from gravity
            t = np.linspace(0.1, 1.0, 15)
            x_line = cx + r * t * np.cos(ang)
            y_line = cy + r * t * np.sin(ang) - 18 * (t**2)
            ax.plot(x_line, y_line, color=c_main, lw=2.2, alpha=0.85, zorder=zorder_base)
            # Spark tip
            ax.plot(x_line[-1], y_line[-1], "o", color=c_tip, ms=3.5, zorder=zorder_base + 1)
        # Center glow aura
        ax.add_patch(patches.Circle((cx, cy), r_outer * 0.45, color=c_main, alpha=0.15, ec="none", zorder=zorder_base - 1))
        ax.add_patch(patches.Circle((cx, cy), 8, color="#ffffff", zorder=zorder_base + 2))

    # 3 FIREWORK BURSTS
    # Burst 1: Center Big Golden Chrysanthemum & Crimson Core (600, 640)
    draw_burst(600, 640, 190, 52, "#fbbf24", "#fffbeb", zorder_base=10)
    draw_burst(600, 640, 95, 32, "#f43f5e", "#ffe4e6", zorder_base=12)

    # Burst 2: Left Cyan & Emerald Burst (280, 680)
    draw_burst(280, 680, 140, 40, "#38bdf8", "#f0f9ff", zorder_base=8)
    draw_burst(280, 680, 65, 24, "#34d399", "#ecfdf5", zorder_base=9)

    # Burst 3: Right Magenta & Purple Burst (920, 660)
    draw_burst(920, 660, 150, 44, "#c084fc", "#faf5ff", zorder_base=8)
    draw_burst(920, 660, 75, 26, "#f472b6", "#fdf2f8", zorder_base=9)

    # WATER SURFACE / RIVERBANK (Bottom: 0 to 220)
    ax.add_patch(patches.Rectangle((0, 0), 1200, 220, color="#0b1120", zorder=3))

    # Water reflections of fireworks
    ax.add_patch(patches.Ellipse((600, 210), 240, 25, color="#f59e0b", alpha=0.3, ec="none", zorder=4))
    ax.add_patch(patches.Ellipse((280, 215), 160, 20, color="#0284c7", alpha=0.25, ec="none", zorder=4))
    ax.add_patch(patches.Ellipse((920, 212), 170, 20, color="#db2777", alpha=0.25, ec="none", zorder=4))

    # FESTIVAL STALLS (YATAI) with Striped Canopies
    # Stall 1 (Left: 80 to 280)
    ax.add_patch(patches.Polygon([[80, 250], [280, 250], [300, 215], [60, 215]], color="#b91c1c", zorder=15))
    for sx in [80, 140, 200, 260]:
        ax.add_patch(patches.Polygon([[sx, 250], [sx + 30, 250], [sx + 20, 215], [sx - 10, 215]], color="#ffffff", zorder=16))
    ax.plot([90, 90], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.plot([270, 270], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.add_patch(patches.Rectangle((70, 80), 220, 70, color="#171412", zorder=14))

    # Stall 2 (Center-Left: 340 to 540)
    ax.add_patch(patches.Polygon([[340, 250], [540, 250], [560, 215], [320, 215]], color="#0284c7", zorder=15))
    for sx in [340, 400, 460, 520]:
        ax.add_patch(patches.Polygon([[sx, 250], [sx + 30, 250], [sx + 20, 215], [sx - 10, 215]], color="#ffffff", zorder=16))
    ax.plot([350, 350], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.plot([530, 530], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.add_patch(patches.Rectangle((330, 80), 220, 70, color="#171412", zorder=14))

    # Stall 3 (Center-Right: 660 to 860)
    ax.add_patch(patches.Polygon([[660, 250], [860, 250], [880, 215], [640, 215]], color="#e11d48", zorder=15))
    for sx in [660, 720, 780, 840]:
        ax.add_patch(patches.Polygon([[sx, 250], [sx + 30, 250], [sx + 20, 215], [sx - 10, 215]], color="#ffffff", zorder=16))
    ax.plot([670, 670], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.plot([850, 850], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.add_patch(patches.Rectangle((650, 80), 220, 70, color="#171412", zorder=14))

    # Stall 4 (Right: 920 to 1120)
    ax.add_patch(patches.Polygon([[920, 250], [1120, 250], [1140, 215], [900, 215]], color="#d97706", zorder=15))
    for sx in [920, 980, 1040, 1100]:
        ax.add_patch(patches.Polygon([[sx, 250], [sx + 30, 250], [sx + 20, 215], [sx - 10, 215]], color="#ffffff", zorder=16))
    ax.plot([930, 930], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.plot([1110, 1110], [215, 80], color="#451a03", lw=4, zorder=14)
    ax.add_patch(patches.Rectangle((910, 80), 220, 70, color="#171412", zorder=14))

    # LANTERNS (Chochin) with Warm Glow
    # Hanging wire
    t_wire = np.linspace(40, 1160, 100)
    y_wire = 205 - 15 * np.sin((t_wire - 40) / 1120 * np.pi)
    ax.plot(t_wire, y_wire, color="#262626", lw=1.8, zorder=17)

    lantern_x = [100, 160, 220, 280, 360, 420, 480, 540, 680, 740, 800, 860, 940, 1000, 1060, 1120]
    for lx in lantern_x:
        ly = 205 - 15 * np.sin((lx - 40) / 1120 * np.pi) - 12
        # Glow
        ax.add_patch(patches.Circle((lx, ly), 22, color="#f59e0b", alpha=0.35, ec="none", zorder=18))
        # Lantern body
        c_lan = "#ef4444" if (lx // 60) % 2 == 0 else "#f59e0b"
        ax.add_patch(patches.Rectangle((lx - 8, ly - 14), 16, 28, color=c_lan, ec="#b91c1c", lw=1, zorder=19))
        ax.add_patch(patches.Circle((lx, ly), 4, color="#fef08a", zorder=20))

    # CROWD SILHOUETTES AT BOTTOM (People watching fireworks)
    # Ground silhouette
    ax.add_patch(patches.Rectangle((0, 0), 1200, 80, color="#070a12", zorder=21))

    # Figures
    crowd_specs = [
        (130, 110, 16, True),   # Father with child pointing
        (175, 85, 11, False),
        (380, 125, 15, False),  # Yukata couple
        (420, 115, 14, True),
        (560, 120, 15, False),  # Group in center
        (600, 130, 16, True),
        (645, 118, 14, False),
        (810, 122, 15, False),  # Friends
        (850, 115, 14, True),
        (1030, 115, 15, False), # Family
        (1070, 85, 11, False),
        (1110, 120, 16, False)
    ]
    for px, py, pr, arm_up in crowd_specs:
        # Head
        ax.add_patch(patches.Circle((px, py), pr, color="#070a12", zorder=22))
        # Body
        ax.add_patch(patches.Polygon([[px - pr*1.2, py - pr*0.8], [px + pr*1.2, py - pr*0.8],
                                      [px + pr*1.4, 0], [px - pr*1.4, 0]], color="#070a12", zorder=22))
        # Raised pointing arm
        if arm_up:
            ax.plot([px + pr*0.6, px + pr*1.8], [py - pr*0.5, py + pr*1.2], color="#070a12", lw=6, solid_capstyle="round", zorder=22)

    # Ambient golden warm rim light across the festival ground
    ax.add_patch(patches.Ellipse((600, 90), 1100, 30, color="#f59e0b", alpha=0.1, ec="none", zorder=23))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python summer-fireworks-festival.py <output_path>")
        sys.exit(1)
    draw_fireworks_festival(sys.argv[1])
