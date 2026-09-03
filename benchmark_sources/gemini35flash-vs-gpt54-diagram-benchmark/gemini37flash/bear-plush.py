import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, Circle, Polygon, PathPatch
from matplotlib.path import Path

def draw_bear_plush(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    # Warm gradient background
    bg_gradient = np.zeros((900, 1200, 3))
    for y in range(900):
        t = y / 900.0
        # Gentle gradient from warm cream bottom to soft light peach top
        bg_gradient[y, :, 0] = 0.98 - 0.04 * (1 - t)
        bg_gradient[y, :, 1] = 0.94 - 0.05 * (1 - t)
        bg_gradient[y, :, 2] = 0.88 - 0.06 * (1 - t)
    ax.imshow(bg_gradient, extent=[0, 1200, 0, 900], origin='lower')

    # Colors
    c_fur = '#BA7A48'
    c_fur_dark = '#9E6235'
    c_inner = '#F4D2B8'
    c_snout = '#FFEBD6'
    c_nose = '#452613'
    c_eye = '#1A0E07'
    c_patch = '#FCF1D9'
    c_patch_border = '#D67C7C'
    c_bow = '#C83E3E'
    c_bow_knot = '#A82B2B'
    c_stitch = '#7A4522'

    # Ground shadow
    shadow1 = Ellipse((600, 130), 560, 80, color='#6B4426', alpha=0.15)
    shadow2 = Ellipse((600, 130), 400, 45, color='#4A2D17', alpha=0.25)
    ax.add_patch(shadow1)
    ax.add_patch(shadow2)

    # 1. EARS
    # Left ear
    ax.add_patch(Circle((430, 630), 75, color=c_fur))
    ax.add_patch(Circle((430, 630), 48, color=c_inner))
    ax.add_patch(Circle((430, 630), 62, fill=False, edgecolor=c_stitch, lw=2, ls=(0, (4, 4))))

    # Right ear
    ax.add_patch(Circle((770, 630), 75, color=c_fur))
    ax.add_patch(Circle((770, 630), 48, color=c_inner))
    ax.add_patch(Circle((770, 630), 62, fill=False, edgecolor=c_stitch, lw=2, ls=(0, (4, 4))))

    # 2. LEGS & PAWS (behind body)
    # Left leg
    ax.add_patch(Ellipse((440, 200), 190, 150, angle=10, color=c_fur))
    ax.add_patch(Ellipse((435, 185), 110, 85, angle=10, color=c_inner))
    ax.add_patch(Ellipse((435, 185), 110, 85, angle=10, fill=False, edgecolor=c_stitch, lw=1.8, ls=(0, (4, 4))))
    ax.add_patch(Circle((405, 235), 13, color=c_inner))
    ax.add_patch(Circle((435, 245), 14, color=c_inner))
    ax.add_patch(Circle((465, 235), 13, color=c_inner))

    # Right leg
    ax.add_patch(Ellipse((760, 200), 190, 150, angle=-10, color=c_fur))
    ax.add_patch(Ellipse((765, 185), 110, 85, angle=-10, color=c_inner))
    ax.add_patch(Ellipse((765, 185), 110, 85, angle=-10, fill=False, edgecolor=c_stitch, lw=1.8, ls=(0, (4, 4))))
    ax.add_patch(Circle((735, 235), 13, color=c_inner))
    ax.add_patch(Circle((765, 245), 14, color=c_inner))
    ax.add_patch(Circle((795, 235), 13, color=c_inner))

    # 3. BODY
    ax.add_patch(Ellipse((600, 320), 390, 360, color=c_fur))
    # Body center seam
    seam_y = np.linspace(150, 460, 50)
    seam_x = 600 - 6 * np.sin((seam_y - 150) / 310 * np.pi)
    ax.plot(seam_x, seam_y, color=c_stitch, lw=2, ls=(0, (5, 5)))

    # Chest Fabric Patch (Heart/Oval with Stitches)
    patch = Ellipse((600, 350), 170, 150, color=c_patch)
    ax.add_patch(patch)
    patch_stitch = Ellipse((600, 350), 170, 150, fill=False, edgecolor=c_patch_border, lw=2, ls=(0, (4, 4)))
    ax.add_patch(patch_stitch)

    # Cute button on chest patch
    ax.add_patch(Circle((600, 350), 16, color='#E86565'))
    ax.add_patch(Circle((600, 350), 13, color='#F07878'))
    for (bx, by) in [(595, 355), (605, 355), (595, 345), (605, 345)]:
        ax.add_patch(Circle((bx, by), 2.5, color='#FFFFFF'))
    ax.plot([595, 605], [355, 345], color='#A82B2B', lw=1.5)
    ax.plot([595, 605], [345, 355], color='#A82B2B', lw=1.5)

    # 4. ARMS
    # Left arm
    ax.add_patch(Ellipse((400, 370), 140, 200, angle=25, color=c_fur))
    ax.add_patch(Ellipse((370, 310), 65, 55, angle=25, color=c_inner))
    # Right arm
    ax.add_patch(Ellipse((800, 370), 140, 200, angle=-25, color=c_fur))
    ax.add_patch(Ellipse((830, 310), 65, 55, angle=-25, color=c_inner))

    # 5. HEAD
    ax.add_patch(Ellipse((600, 530), 380, 320, color=c_fur))
    # Head vertical seam
    ax.plot([600, 600], [490, 670], color=c_stitch, lw=2, ls=(0, (5, 5)))

    # 6. SNOUT
    ax.add_patch(Ellipse((600, 485), 180, 130, color=c_snout))
    ax.add_patch(Ellipse((600, 485), 180, 130, fill=False, edgecolor=c_stitch, lw=1.8, ls=(0, (4, 4))))

    # Nose
    nose_verts = [(570, 510), (630, 510), (600, 475)]
    ax.add_patch(Polygon(nose_verts, closed=True, color=c_nose))
    ax.add_patch(Ellipse((590, 508), 12, 5, angle=-10, color='#FFFFFF', alpha=0.6))

    # Mouth & Philtrum
    ax.plot([600, 600], [475, 455], color=c_nose, lw=4, solid_capstyle='round')
    mouth_theta = np.linspace(-np.pi * 0.1, np.pi * 0.85, 30)
    # Left smile
    ax.plot(580 - 20 * np.cos(mouth_theta), 455 - 18 * np.sin(mouth_theta), color=c_nose, lw=4, solid_capstyle='round')
    # Right smile
    ax.plot(620 + 20 * np.cos(mouth_theta), 455 - 18 * np.sin(mouth_theta), color=c_nose, lw=4, solid_capstyle='round')

    # 7. EYES
    for ex in (505, 695):
        ax.add_patch(Circle((ex, 545), 22, color=c_eye))
        ax.add_patch(Circle((ex - 7, 553), 7, color='#FFFFFF'))
        ax.add_patch(Circle((ex + 8, 538), 3.5, color='#FFFFFF', alpha=0.8))

    # Rosy Cheeks
    ax.add_patch(Ellipse((455, 480), 70, 40, color='#F08878', alpha=0.4))
    ax.add_patch(Ellipse((745, 480), 70, 40, color='#F08878', alpha=0.4))

    # 8. BOW TIE
    left_wing = Polygon([(600, 405), (530, 435), (520, 395), (535, 370)], closed=True, color=c_bow)
    right_wing = Polygon([(600, 405), (670, 435), (680, 395), (665, 370)], closed=True, color=c_bow)
    ax.add_patch(left_wing)
    ax.add_patch(right_wing)
    # Center knot
    ax.add_patch(Ellipse((600, 402), 34, 30, color=c_bow_knot))
    ax.add_patch(Circle((600, 402), 7, color='#E86666'))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_bear_plush(sys.argv[1])
    else:
        draw_bear_plush('bear-plush.png')
