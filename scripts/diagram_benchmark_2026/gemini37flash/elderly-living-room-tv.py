import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Ellipse, Polygon

def draw_living_room(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    # 1. Background Wall & Floor
    # Wall (warm beige)
    ax.add_patch(Rectangle((0, 280), 1200, 620, color='#FAF0E6'))
    # Floor (warm wood planks)
    ax.add_patch(Rectangle((0, 0), 1200, 280, color='#9C6338'))
    ax.add_patch(Rectangle((0, 275), 1200, 15, color='#D8B896'))
    # Floor board lines
    for fy in [70, 140, 210]:
        ax.plot([0, 1200], [fy, fy], color='#7D4E2A', lw=1.5, alpha=0.5)

    # 2. Window (Left)
    ax.add_patch(Rectangle((80, 460), 200, 320, color='#93C5FD', ec='#E2E8F0', lw=6))
    ax.add_patch(Ellipse((180, 480), 160, 60, color='#4ADE80'))
    ax.plot([180, 180], [460, 780], color='#E2E8F0', lw=4)
    ax.plot([80, 280], [620, 620], color='#E2E8F0', lw=4)
    # Curtains
    ax.add_patch(Polygon([(60, 790), (100, 790), (70, 450), (50, 450)], color='#FED7AA'))
    ax.add_patch(Polygon([(260, 790), (300, 790), (310, 450), (290, 450)], color='#FED7AA'))
    ax.plot([40, 320], [790, 790], color='#B45309', lw=6, solid_capstyle='round')

    # Wall picture & clock
    ax.add_patch(Rectangle((420, 660), 140, 100, color='#FEF3C7', ec='#B45309', lw=5))
    ax.add_patch(Circle((490, 720), 22, color='#F87171', alpha=0.8))
    ax.add_patch(Polygon([(430, 670), (490, 715), (550, 670)], color='#34D399'))

    ax.add_patch(Circle((720, 740), 40, color='#FFFFFF', ec='#92400E', lw=5))
    ax.plot([720, 720], [740, 765], color='#1E293B', lw=3)
    ax.plot([720, 740], [740, 740], color='#1E293B', lw=3)

    # 3. Floor Lamp & Light Cone
    ax.add_patch(Polygon([(280, 580), (140, 150), (420, 150)], color='#FEF08A', alpha=0.35))
    ax.plot([280, 280], [200, 620], color='#78350F', lw=5)
    ax.add_patch(Ellipse((280, 200), 70, 20, color='#451A03'))
    ax.add_patch(Polygon([(250, 620), (310, 620), (330, 570), (230, 570)], color='#FDE047', ec='#EAB308', lw=2))

    # 4. Cozy Rug
    ax.add_patch(Ellipse((490, 160), 480, 160, color='#FEF3C7', alpha=0.7))
    ax.add_patch(Ellipse((490, 160), 440, 140, color='#FDE68A', alpha=0.5))

    # 5. Grandma in Armchair
    # Armchair back
    ax.add_patch(Rectangle((330, 270), 150, 290, color='#9A3412', ec='#7C2D12', lw=3))
    ax.add_patch(Ellipse((405, 560), 150, 50, color='#C2410C'))

    # Grandma Body & Cardigan
    ax.add_patch(Ellipse((430, 360), 100, 130, color='#4D7C0F'))
    # Red Blanket on lap
    ax.add_patch(Polygon([(400, 260), (520, 260), (540, 340), (410, 350)], color='#DC2626'))
    ax.plot([410, 530], [300, 300], color='#FEF08A', ls='--', lw=2.5)

    # Slippers
    ax.add_patch(Ellipse((530, 240), 40, 20, color='#EC4899'))

    # Grandma Head & Bun (profile facing right toward TV)
    ax.add_patch(Circle((390, 500), 22, color='#CBD5E1', ec='#94A3B8', lw=1.5))
    ax.add_patch(Circle((430, 480), 32, color='#FED7AA'))
    ax.add_patch(Polygon([(405, 505), (445, 510), (455, 480), (410, 475)], color='#CBD5E1'))
    # Glasses & smile
    ax.add_patch(Ellipse((448, 480), 18, 22, fill=False, edgecolor='#D97706', lw=2.5))
    ax.plot([438, 420], [480, 485], color='#D97706', lw=2)
    ax.plot([458, 464, 458], [482, 478, 474], color='#EA580C', lw=2.5)
    ax.plot([450, 458], [465, 467], color='#EA580C', lw=2)

    # Armrest
    ax.add_patch(Rectangle((360, 270), 110, 110, color='#C2410C'))
    ax.add_patch(Ellipse((415, 380), 110, 35, color='#EA580C'))

    # Sleeping Cat
    ax.add_patch(Ellipse((390, 230), 65, 45, color='#FB923C'))
    ax.add_patch(Circle((425, 245), 16, color='#FB923C'))
    ax.add_patch(Polygon([(425, 258), (435, 268), (435, 255)], color='#F97316'))
    ax.plot([360, 380], [230, 245], color='#EA580C', lw=4, solid_capstyle='round')

    # 6. Low Tea Table
    ax.add_patch(Rectangle((620, 170), 15, 80, color='#78350F'))
    ax.add_patch(Rectangle((780, 170), 15, 80, color='#78350F'))
    ax.add_patch(Ellipse((710, 250), 200, 55, color='#92400E'))
    ax.add_patch(Ellipse((710, 255), 190, 48, color='#B45309'))

    # Teapot & Cup
    ax.add_patch(Ellipse((670, 275), 32, 24, color='#065F46'))
    ax.add_patch(Rectangle((740, 265), 18, 20, color='#ECFDF5', ec='#A7F3D0', lw=1.5))
    ax.plot([748, 750], [288, 305], color='#94A3B8', lw=1.5, alpha=0.7)

    # 7. TV & Cabinet (Right)
    # Line of sight ray (from grandma eyes ~ (460, 480) to TV ~ (950, 470))
    ax.plot([460, 920], [480, 470], color='#60A5FA', ls=(0, (4, 6)), lw=2.0, alpha=0.5)

    # TV Glow cone
    ax.add_patch(Polygon([(920, 470), (620, 600), (620, 340)], color='#38BDF8', alpha=0.12))

    # TV Cabinet
    ax.add_patch(Rectangle((880, 140), 230, 150, color='#78350F', ec='#451A03', lw=3))
    ax.add_patch(Rectangle((900, 160), 90, 45, color='#292524'))
    ax.add_patch(Rectangle((1000, 160), 90, 45, color='#292524'))

    # TV Stand Base
    ax.add_patch(Rectangle((980, 290), 30, 35, color='#334155'))
    ax.add_patch(Ellipse((995, 290), 90, 18, color='#1E293B'))

    # TV Frame & Screen
    ax.add_patch(Rectangle((890, 320), 210, 165, color='#1E293B', ec='#0F172A', lw=4))
    ax.add_patch(Rectangle((902, 332), 186, 141, color='#7DD3FC'))
    ax.add_patch(Circle((1030, 430), 18, color='#FBBF24'))
    ax.add_patch(Polygon([(902, 332), (960, 380), (1020, 350), (1088, 385), (1088, 332)], color='#22C55E'))

    # Houseplant
    ax.add_patch(Polygon([(1130, 130), (1170, 130), (1160, 200), (1140, 200)], color='#EA580C'))
    ax.add_patch(Polygon([(1150, 200), (1120, 260), (1145, 230)], color='#16A34A'))
    ax.add_patch(Polygon([(1150, 200), (1155, 280), (1165, 230)], color='#22C55E'))
    ax.add_patch(Polygon([(1150, 200), (1185, 255), (1165, 220)], color='#15803D'))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_living_room(sys.argv[1])
    else:
        draw_living_room('elderly-living-room-tv.png')
