import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_scene(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#f4ede4")
    ax.set_facecolor("#f4ede4")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # WALL & FLOOR
    # Wall background
    ax.add_patch(patches.Rectangle((0, 300), 1200, 600, color="#f0e6d8", zorder=1))
    # Skirting board
    ax.add_patch(patches.Rectangle((0, 280), 1200, 20, color="#6b4423", zorder=2))
    # Floor (hardwood)
    ax.add_patch(patches.Rectangle((0, 0), 1200, 280, color="#9c6644", zorder=1))
    # Floor perspective planks
    for y in [60, 130, 200]:
        ax.plot([0, 1200], [y, y], color="#7f4f24", lw=1.5, zorder=2)

    # WINDOW & EVENING SKY
    # Window Frame
    ax.add_patch(patches.Rectangle((420, 480), 260, 340, color="#6b4423", zorder=3))
    # Evening Sky
    ax.add_patch(patches.Rectangle((430, 490), 240, 320, color="#1d2d44", zorder=4))
    # Warm Moon & stars
    ax.add_patch(patches.Circle((610, 740), 30, color="#ffeaa7", alpha=0.9, zorder=5))
    # Window panes cross
    ax.plot([550, 550], [490, 810], color="#8d5b4c", lw=4, zorder=6)
    ax.plot([430, 670], [650, 650], color="#8d5b4c", lw=4, zorder=6)
    # Curtain Rod
    ax.plot([390, 710], [835, 835], color="#4a2810", lw=6, solid_capstyle="round", zorder=7)
    # Curtains (Draped warm rose)
    c_curt = "#b56576"
    ax.add_patch(patches.Polygon([[400, 835], [440, 835], [425, 650], [440, 480], [395, 480]], color=c_curt, zorder=8))
    ax.add_patch(patches.Polygon([[700, 835], [660, 835], [675, 650], [660, 480], [705, 480]], color=c_curt, zorder=8))

    # WALL CLOCK
    ax.add_patch(patches.Circle((820, 740), 36, color="white", ec="#6b4423", lw=4, zorder=3))
    ax.add_patch(patches.Circle((820, 740), 3, color="#333333", zorder=4))
    # Clock hands (7:15)
    ax.plot([820, 805], [740, 735], color="#333333", lw=3, solid_capstyle="round", zorder=4)
    ax.plot([820, 820], [740, 765], color="#333333", lw=2, solid_capstyle="round", zorder=4)

    # PICTURE FRAME (Mt. Fuji art)
    ax.add_patch(patches.Rectangle((180, 680), 140, 100, color="#fefae0", ec="#6b4423", lw=5, zorder=3))
    ax.add_patch(patches.Polygon([[200, 685], [250, 750], [300, 685]], color="#457b9d", zorder=4))
    ax.add_patch(patches.Polygon([[238, 734], [250, 750], [262, 734]], color="white", zorder=5))
    ax.add_patch(patches.Circle((225, 750), 10, color="#e63946", zorder=4))

    # LIVING ROOM RUG
    ax.add_patch(patches.Ellipse((650, 160), 760, 220, color="#ddb892", zorder=3))
    ax.add_patch(patches.Ellipse((650, 160), 700, 190, fill=False, ec="#faedcd", lw=2.5, ls="--", zorder=4))

    # TV CABINET & TELEVISION (Left)
    # Cabinet
    ax.add_patch(patches.Rectangle((80, 210), 280, 150, color="#7f5539", ec="#58311a", lw=2.5, zorder=5))
    ax.plot([220, 220], [210, 360], color="#58311a", lw=2, zorder=6)
    ax.add_patch(patches.Circle((205, 285), 5, color="#d4a373", zorder=7))
    ax.add_patch(patches.Circle((235, 285), 5, color="#d4a373", zorder=7))
    # Legs
    ax.add_patch(patches.Rectangle((95, 185), 20, 25, color="#58311a", zorder=4))
    ax.add_patch(patches.Rectangle((325, 185), 20, 25, color="#58311a", zorder=4))

    # TV Stand
    ax.add_patch(patches.Rectangle((180, 360), 80, 15, color="#2b2d42", zorder=6))
    ax.add_patch(patches.Rectangle((212, 375), 16, 50, color="#2b2d42", zorder=6))

    # TV Frame & Screen
    ax.add_patch(patches.Rectangle((100, 425), 240, 205, color="#1b1c1e", ec="#333", lw=3, zorder=7))
    ax.add_patch(patches.Rectangle((110, 440), 220, 175, color="#a2d2ff", zorder=8))
    # Broadcast image on TV
    t_hill = np.linspace(110, 330, 50)
    y_hill = 440 + 35 * np.sin((t_hill - 110) / 220 * np.pi) + 20
    ax.fill_between(t_hill, 440, y_hill, color="#588157", zorder=9)
    ax.add_patch(patches.Circle((280, 575), 20, color="#ffb703", zorder=9))

    # Soft TV light glow cone towards grandma
    tv_glow = patches.Polygon([[220, 520], [1050, 480], [1050, 150], [220, 410]],
                              color="#90e0ef", alpha=0.18, zorder=10)
    ax.add_patch(tv_glow)

    # TV Cabinet Plant
    ax.add_patch(patches.Polygon([[305, 360], [335, 360], [330, 390], [310, 390]], color="#bc6c25", zorder=7))
    ax.add_patch(patches.Circle((320, 402), 16, color="#2a9d8f", zorder=8))
    ax.add_patch(patches.Circle((330, 412), 14, color="#52b788", zorder=8))
    ax.add_patch(patches.Circle((310, 412), 14, color="#52b788", zorder=8))

    # FLOOR LAMP (Far Right)
    ax.add_patch(patches.Ellipse((1080, 160), 90, 30, color="#4a3525", zorder=5))
    ax.plot([1080, 1080], [160, 620], color="#b08968", lw=8, solid_capstyle="round", zorder=6)
    # Lamp shade
    ax.add_patch(patches.Polygon([[1035, 620], [1125, 620], [1145, 540], [1015, 540]],
                                 color="#ffe8d6", ec="#ddb892", lw=2, zorder=7))
    # Warm lamp aura
    ax.add_patch(patches.Circle((1080, 550), 160, color="#ffd166", alpha=0.2, zorder=8))

    # GRANDMOTHER & ARMCHAIR (Right)
    # Armchair Back & Wings
    ax.add_patch(patches.Rectangle((750, 250), 200, 280, color="#5c6b73", ec="#46535a", lw=3, zorder=11))
    ax.add_patch(patches.Ellipse((850, 530), 200, 100, color="#5c6b73", ec="#46535a", lw=3, zorder=11))

    # Grandma Body (warm mauve cardigan)
    ax.add_patch(patches.Ellipse((815, 330), 140, 150, color="#d88c9a", ec="#b36a78", lw=2, zorder=12))
    # Cozy shawl
    ax.add_patch(patches.Polygon([[770, 390], [840, 390], [860, 320], [760, 320]], color="#f6bd60", ec="#e76f51", lw=1.5, zorder=13))
    # Green lap blanket
    ax.add_patch(patches.Ellipse((800, 230), 170, 110, color="#84a59d", ec="#5f7972", lw=2, zorder=14))
    # Hands resting on lap
    ax.add_patch(patches.Circle((755, 250), 14, color="#fcd5ce", zorder=15))
    ax.add_patch(patches.Circle((765, 252), 12, color="#fcd5ce", zorder=15))

    # Neck
    ax.add_patch(patches.Rectangle((795, 420), 20, 35, color="#fcd5ce", zorder=13))

    # Head (Profile turned towards TV left)
    # Hair Bun
    ax.add_patch(patches.Circle((845, 475), 26, color="#ced4da", ec="#adb5bd", lw=2, zorder=14))
    # Head main
    ax.add_patch(patches.Ellipse((805, 465), 65, 75, color="#ced4da", ec="#adb5bd", lw=2, zorder=14))
    # Face skin
    ax.add_patch(patches.Ellipse((790, 455), 45, 55, color="#fcd5ce", zorder=15))
    # Eye looking left at TV
    ax.plot([770, 782], [465, 465], color="#4a3525", lw=2.5, solid_capstyle="round", zorder=16)
    # Glasses
    ax.add_patch(patches.Circle((776, 465), 10, fill=False, ec="#8d99ae", lw=2, zorder=17))
    ax.plot([786, 810], [465, 470], color="#8d99ae", lw=1.8, zorder=17)
    # Kind smile
    ax.plot([772, 780], [440, 442], color="#b36a78", lw=2.5, solid_capstyle="round", zorder=16)
    # Rosy cheek
    ax.add_patch(patches.Circle((782, 450), 6, color="#e29578", alpha=0.4, zorder=16))

    # Armchair Front Armrest & Legs
    ax.add_patch(patches.Ellipse((735, 310), 45, 120, color="#46535a", ec="#333f44", lw=2, zorder=16))
    ax.add_patch(patches.Rectangle((740, 160), 16, 60, color="#58311a", zorder=10))
    ax.add_patch(patches.Rectangle((870, 160), 16, 60, color="#58311a", zorder=10))

    # COFFEE TABLE & TEA CUP (Center Foreground)
    ax.add_patch(patches.Ellipse((530, 190), 280, 80, color="#8b5e34", ec="#58311a", lw=3, zorder=17))
    ax.add_patch(patches.Ellipse((530, 195), 260, 70, color="#a47148", zorder=18))
    # Table legs
    ax.plot([430, 420], [180, 110], color="#58311a", lw=7, solid_capstyle="round", zorder=16)
    ax.plot([630, 640], [180, 110], color="#58311a", lw=7, solid_capstyle="round", zorder=16)

    # Green Tea Cup (Yunomi)
    ax.add_patch(patches.Ellipse((520, 205), 45, 16, color="#58311a", zorder=19))
    ax.add_patch(patches.Rectangle((508, 205), 24, 30, color="#e9edc9", ec="#ccd5ae", lw=1.5, zorder=20))
    ax.add_patch(patches.Ellipse((520, 235), 24, 8, color="#588157", zorder=21))
    # Steam
    ax.plot([518, 523, 517], [242, 255, 270], color="white", alpha=0.7, lw=2, zorder=22)
    ax.plot([524, 519, 525], [245, 258, 272], color="white", alpha=0.6, lw=1.8, zorder=22)

    # Remote control
    ax.add_patch(patches.Rectangle((560, 200), 38, 14, angle=15, color="#212529", zorder=20))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python elderly-living-room-tv.py <output_path>")
        sys.exit(1)
    draw_scene(sys.argv[1])
