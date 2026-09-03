import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Ellipse, Polygon

def draw_vr_scene(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    # Room Background (Wall & Floor)
    # Wall
    ax.add_patch(Rectangle((0, 260), 1200, 640, color='#f1f5f9'))
    # Hardwood Floor
    ax.add_patch(Rectangle((0, 0), 1200, 260, color='#fde68a'))
    ax.add_patch(Rectangle((0, 0), 1200, 260, color='#b45309', alpha=0.35))
    ax.add_patch(Rectangle((0, 255), 1200, 10, color='#cbd5e1'))

    # Floor lines
    for fy in [70, 140, 210]:
        ax.plot([0, 1200], [fy, fy], color='#92400e', lw=1, alpha=0.3)

    # 1. BEDROOM FURNITURE
    # Window (Top Right)
    ax.add_patch(Rectangle((820, 600), 260, 220, facecolor='#bae6fd', edgecolor='#ffffff', lw=8))
    ax.add_patch(Ellipse((950, 600), 200, 60, color='#86efac'))
    ax.plot([950, 950], [600, 820], color='#ffffff', lw=6)
    ax.plot([820, 710], [1080, 710], color='#ffffff', lw=6)

    # Desk & Gaming PC (Right)
    ax.add_patch(Rectangle((860, 240), 280, 150, facecolor='#94a3b8', edgecolor='#64748b', lw=2))
    ax.add_patch(Rectangle((860, 380), 280, 20, color='#cbd5e1'))
    # PC Case
    ax.add_patch(Rectangle((1060, 400), 60, 100, facecolor='#1e293b', edgecolor='#334155', lw=2))
    ax.plot([1075, 1075], [410, 480], color='#a855f7', lw=3)
    ax.plot([1085, 1085], [410, 480], color='#38bdf8', lw=3)
    # Monitor
    ax.add_patch(Rectangle((900, 410), 130, 90, facecolor='#0f172a', edgecolor='#475569', lw=3))
    ax.add_patch(Rectangle((906, 416), 118, 74, color='#1e1b4b'))
    ax.add_patch(Rectangle((955, 390), 20, 20, color='#475569'))

    # Posters on Wall
    ax.add_patch(Rectangle((420, 610), 140, 190, facecolor='#0f172a', edgecolor='#fbbf24', lw=3))
    ax.add_patch(Circle((490, 720), 35, color='#f43f5e', alpha=0.7))
    ax.add_patch(Polygon([(490, 770), (515, 700), (465, 700)], color='#38bdf8'))
    ax.text(490, 640, 'CYBER 2088', color='#facc15', fontsize=12, fontweight='bold', ha='center')

    # Bookshelf
    ax.add_patch(Rectangle((280, 640), 110, 16, color='#b45309'))
    for bx, bc, bh in [(290, '#ef4444', 40), (302, '#3b82f6', 45), (316, '#10b981', 38), (328, '#f59e0b', 42)]:
        ax.add_patch(Rectangle((bx, 656), 10, bh, color=bc))

    # Bed (Left)
    ax.add_patch(Rectangle((180, 240), 180, 120, color='#3b82f6'))
    ax.add_patch(Ellipse((240, 330), 70, 40, facecolor='#ffffff', edgecolor='#cbd5e1', lw=1.5))
    ax.add_patch(Polygon([(180, 240), (360, 240), (360, 300), (180, 320)], color='#60a5fa'))

    # 2. DOORWAY & MOTHER (Left)
    # Doorframe
    ax.plot([150, 150], [220, 820], color='#78350f', lw=8)
    ax.plot([0, 150], [820, 820], color='#78350f', lw=8)
    # Door Leaf
    ax.add_patch(Polygon([(0, 200), (40, 220), (40, 810), (0, 830)], facecolor='#92400e', edgecolor='#78350f', lw=3))

    # Mother
    # Dress & Apron
    ax.add_patch(Polygon([(70, 230), (140, 230), (120, 420), (90, 420)], color='#a855f7'))
    ax.add_patch(Polygon([(80, 230), (135, 230), (118, 390), (95, 390)], facecolor='#fef08a', edgecolor='#facc15', lw=1))
    # Slippers
    ax.add_patch(Ellipse((85, 225), 26, 12, color='#ec4899'))
    ax.add_patch(Ellipse((125, 225), 26, 12, color='#ec4899'))
    # Head & Hair
    ax.add_patch(Circle((96, 475), 22, color='#582f0e'))
    ax.add_patch(Circle((82, 468), 14, color='#582f0e'))
    ax.add_patch(Circle((108, 465), 18, color='#fed7aa'))
    # Smile & Eye
    ax.plot([114, 122], [468, 468], color='#582f0e', lw=2)
    ax.plot([112, 122], [458, 458], color='#ea580c', lw=2)
    # Dishcloth
    ax.add_patch(Rectangle((144, 380), 16, 24, facecolor='#ffffff', edgecolor='#e2e8f0', lw=1))
    # Sightline
    ax.plot([125, 540], [465, 450], color='#f59e0b', ls='--', lw=2, alpha=0.6)

    # 3. SON PLAYING IN VR (Center: 580, 450)
    # Ground shadow
    ax.add_patch(Ellipse((580, 160), 220, 45, color='#1e293b', alpha=0.3))

    # Dynamic Legs
    ax.plot([550, 520, 490], [360, 260, 170], color='#1e3a8a', lw=24, solid_capstyle='round', solid_joinstyle='round')
    ax.add_patch(Ellipse((480, 165), 50, 22, facecolor='#ffffff', edgecolor='#0284c7', lw=2))
    ax.plot([585, 630, 660], [360, 270, 175], color='#1e3a8a', lw=24, solid_capstyle='round', solid_joinstyle='round')
    ax.add_patch(Ellipse((670, 170), 50, 22, facecolor='#ffffff', edgecolor='#0284c7', lw=2))

    # Torso (Orange Hoodie)
    ax.add_patch(Polygon([(530, 345), (610, 350), (600, 450), (530, 450)], color='#f97316'))
    ax.add_patch(Polygon([(545, 350), (585, 350), (590, 380), (550, 380)], color='#ea580c'))

    # Head & VR Headset
    ax.add_patch(Rectangle((555, 445), 20, 35, color='#fed7aa'))
    ax.add_patch(Circle((565, 500), 30, color='#1e293b')) # Hair
    ax.add_patch(Circle((545, 485), 7, color='#fed7aa')) # Ear

    # VR Goggles
    ax.add_patch(Rectangle((565, 473), 48, 32, facecolor='#0f172a', edgecolor='#38bdf8', lw=2))
    ax.add_patch(Rectangle((583, 478), 26, 22, color='#00f2fe'))
    ax.plot([587, 605], [489, 489], color='#ffffff', lw=2)

    # Open smiling mouth
    ax.add_patch(Polygon([(570, 465), (592, 465), (581, 455)], color='#dc2626'))

    # Left Arm & Controller
    ax.plot([535, 480, 460], [440, 470, 520], color='#f97316', lw=18, solid_capstyle='round')
    ax.add_patch(Circle((455, 530), 10, color='#fed7aa'))
    ax.add_patch(Rectangle((446, 530), 8, 24, angle=-30, facecolor='#1e293b', edgecolor='#64748b', lw=1.5))
    ax.add_patch(Circle((450, 560), 10, fill=False, edgecolor='#38bdf8', lw=2.5))

    # Right Arm & Controller
    ax.plot([595, 670, 710], [435, 450, 480], color='#f97316', lw=18, solid_capstyle='round')
    ax.add_patch(Circle((715, 485), 10, color='#fed7aa'))
    ax.add_patch(Rectangle((716, 480), 8, 24, angle=45, facecolor='#1e293b', edgecolor='#64748b', lw=1.5))
    ax.add_patch(Circle((735, 505), 10, fill=False, edgecolor='#38bdf8', lw=2.5))

    # Sci-Fi motion sparks
    ax.plot([430, 410], [560, 580], color='#38bdf8', lw=2.5, solid_capstyle='round')
    ax.plot([740, 770], [500, 510], color='#38bdf8', lw=2.5, solid_capstyle='round')

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_vr_scene(sys.argv[1])
    else:
        draw_vr_scene('vr-son-watched-by-mother.png')
