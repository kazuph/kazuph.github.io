import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Ellipse, Polygon, Arc
from matplotlib.lines import Line2D

def add_rect(ax, xy, w, h, color, ec="none", lw=1, alpha=1, z=1):
    p = Rectangle(xy, w, h, facecolor=color, edgecolor=ec, linewidth=lw, alpha=alpha, zorder=z)
    ax.add_patch(p)
    return p

def add_circle(ax, xy, r, color, ec="none", lw=1, alpha=1, z=1):
    p = Circle(xy, r, facecolor=color, edgecolor=ec, linewidth=lw, alpha=alpha, zorder=z)
    ax.add_patch(p)
    return p

def add_ellipse(ax, xy, w, h, color, ec="none", lw=1, alpha=1, z=1):
    p = Ellipse(xy, w, h, facecolor=color, edgecolor=ec, linewidth=lw, alpha=alpha, zorder=z)
    ax.add_patch(p)
    return p

def main():
    if len(sys.argv) < 2:
        raise SystemExit("output path required")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect("equal")
    ax.axis("off")

    # warm room
    add_rect(ax, (0, 0), 1200, 900, "#f4d6b8", z=0)
    add_rect(ax, (0, 0), 1200, 230, "#b8794d", z=1)
    for x in range(0, 1200, 80):
        ax.plot([x, x + 55], [40, 230], color="#a4663f", lw=1.2, alpha=0.35, zorder=2)
    add_rect(ax, (0, 220), 1200, 16, "#8a5638", z=3)

    # window and curtains
    add_rect(ax, (760, 500), 290, 245, "#fff7cf", ec="#8f6645", lw=8, z=2)
    ax.plot([905, 905], [505, 740], color="#8f6645", lw=4, zorder=4)
    ax.plot([765, 1045], [622, 622], color="#8f6645", lw=4, zorder=4)
    add_rect(ax, (720, 475), 60, 295, "#d96f61", z=5)
    add_rect(ax, (1035, 475), 60, 295, "#d96f61", z=5)
    for x in [735, 755, 1055, 1075]:
        ax.plot([x, x], [480, 765], color="#b74f48", lw=2, alpha=0.45, zorder=6)
    add_rect(ax, (710, 758), 395, 18, "#70412f", z=7)

    # lamp
    ax.plot([650, 650], [330, 650], color="#604638", lw=9, zorder=4)
    add_rect(ax, (615, 315), 70, 18, "#604638", z=4)
    add_ellipse(ax, (650, 665), 135, 70, "#ffd978", ec="#8d6940", lw=3, alpha=0.95, z=7)
    add_ellipse(ax, (650, 642), 95, 34, "#f2b75d", alpha=0.65, z=8)
    add_circle(ax, (650, 610), 125, "#ffe9a7", alpha=0.16, z=3)

    # television
    add_rect(ax, (85, 390), 395, 235, "#2b2f38", ec="#1b1d23", lw=8, z=5)
    add_rect(ax, (112, 417), 341, 181, "#3f6f8f", z=6)
    add_rect(ax, (122, 430), 145, 65, "#8bc0d8", alpha=0.65, z=7)
    add_rect(ax, (290, 455), 125, 75, "#6aa36f", alpha=0.7, z=7)
    add_circle(ax, (390, 545), 16, "#ffe384", z=8)
    ax.plot([270, 305, 340, 385], [430, 480, 452, 510], color="#eaf5ff", lw=3, alpha=0.7, zorder=9)
    ax.plot([282, 365], [385, 330], color="#333333", lw=7, zorder=4)
    ax.plot([282, 200], [385, 330], color="#333333", lw=7, zorder=4)
    add_rect(ax, (155, 285), 260, 45, "#6b4634", z=4)

    # rug and table
    add_ellipse(ax, (560, 185), 560, 150, "#d78f69", alpha=0.75, z=3)
    add_ellipse(ax, (560, 185), 500, 118, "#e7b07e", alpha=0.75, z=4)
    add_ellipse(ax, (565, 265), 300, 70, "#9b5f3b", ec="#6d422b", lw=3, z=8)
    for x in [450, 680]:
        ax.plot([x, x - 22], [245, 150], color="#6d422b", lw=8, zorder=7)
    add_ellipse(ax, (520, 285), 58, 24, "#f8f0da", ec="#8e785e", lw=2, z=10)
    add_rect(ax, (505, 292), 30, 28, "#c77459", ec="#8e4a3d", lw=2, z=10)
    add_ellipse(ax, (520, 320), 31, 10, "#e09b83", ec="#8e4a3d", lw=1.5, z=11)
    ax.plot([538, 560], [306, 318], color="#8e4a3d", lw=3, zorder=11)

    # sofa/chair
    add_rect(ax, (680, 215), 300, 190, "#8f5c7a", ec="#684058", lw=4, z=6)
    add_rect(ax, (655, 260), 65, 135, "#7d4c68", ec="#684058", lw=4, z=7)
    add_rect(ax, (940, 260), 65, 135, "#7d4c68", ec="#684058", lw=4, z=7)
    add_rect(ax, (695, 185), 280, 70, "#764a63", ec="#684058", lw=4, z=8)
    add_rect(ax, (710, 305), 115, 75, "#9d6b86", ec="#7b4e69", lw=2, z=8)
    add_rect(ax, (835, 305), 115, 75, "#9d6b86", ec="#7b4e69", lw=2, z=8)

    # grandmother seated alone, facing television
    add_ellipse(ax, (780, 390), 125, 145, "#6c8f70", ec="#4d6e52", lw=3, z=12)
    add_circle(ax, (745, 505), 50, "#f2c7a6", ec="#a87358", lw=2.5, z=14)
    add_ellipse(ax, (758, 523), 78, 62, "#d9d9d9", z=15)
    add_ellipse(ax, (730, 535), 68, 80, "#e8e8e8", z=13)
    add_circle(ax, (708, 510), 12, "#f2c7a6", ec="#a87358", lw=1.5, z=15)
    add_circle(ax, (728, 515), 4, "#3a2b24", z=16)
    ax.plot([730, 704], [498, 496], color="#8d5c4c", lw=2, zorder=16)
    ax.add_patch(Arc((730, 488), 24, 14, theta1=200, theta2=340, color="#8d5c4c", lw=2, zorder=16))
    ax.plot([705, 565], [515, 555], color="#2e3740", lw=2.4, zorder=17)
    ax.plot([705, 565], [515, 475], color="#2e3740", lw=2.4, zorder=17)
    add_circle(ax, (565, 555), 6, "#2e3740", z=17)
    add_circle(ax, (565, 475), 6, "#2e3740", z=17)

    ax.plot([720, 680], [350, 270], color="#f2c7a6", lw=15, solid_capstyle="round", zorder=13)
    ax.plot([835, 895], [350, 300], color="#f2c7a6", lw=15, solid_capstyle="round", zorder=13)
    add_circle(ax, (680, 270), 13, "#f2c7a6", z=14)
    add_circle(ax, (895, 300), 13, "#f2c7a6", z=14)
    ax.plot([760, 720], [250, 150], color="#4a4f65", lw=20, solid_capstyle="round", zorder=10)
    ax.plot([835, 880], [250, 155], color="#4a4f65", lw=20, solid_capstyle="round", zorder=10)
    add_ellipse(ax, (705, 140), 62, 24, "#3f2e29", z=11)
    add_ellipse(ax, (900, 145), 62, 24, "#3f2e29", z=11)

    # cozy details
    add_rect(ax, (1000, 210), 95, 130, "#5f7f68", ec="#3d5745", lw=2, z=5)
    add_circle(ax, (1020, 365), 30, "#6fa071", z=6)
    add_circle(ax, (1070, 380), 34, "#7cad76", z=6)
    add_circle(ax, (1048, 420), 28, "#86b982", z=6)
    add_rect(ax, (1040, 328), 14, 76, "#3d5745", z=5)

    add_rect(ax, (180, 660), 180, 95, "#f2c17b", ec="#8d6940", lw=4, z=4)
    add_circle(ax, (228, 707), 26, "#fff4d1", ec="#9d7a48", lw=2, z=5)
    ax.plot([228, 228], [707, 727], color="#9d7a48", lw=2, zorder=6)
    ax.plot([228, 242], [707, 698], color="#9d7a48", lw=2, zorder=6)
    add_rect(ax, (250, 690), 78, 12, "#9f6b4b", z=5)
    add_rect(ax, (250, 718), 78, 12, "#9f6b4b", z=5)

    # soft ambient highlights
    add_circle(ax, (650, 610), 230, "#fff0bd", alpha=0.08, z=2)
    add_circle(ax, (520, 360), 270, "#fff2c7", alpha=0.07, z=2)

    plt.savefig(output_path, dpi=100, bbox_inches="tight", pad_inches=0)
    plt.close(fig)

if __name__ == "__main__":
    main()
