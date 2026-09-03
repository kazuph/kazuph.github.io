import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path
import numpy as np

def draw_bear(out_path):
    # 1200x900 equivalent: 12 x 9 inches at 100 dpi
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#fcf6ee")
    ax.set_facecolor("#fcf6ee")

    # Coordinate system [0, 1200] x [0, 900]
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Background soft aura
    bg_circle1 = patches.Circle((600, 450), 380, color="#faeee0", ec="none", zorder=0)
    bg_circle2 = patches.Circle((600, 450), 280, color="#f6e4d0", ec="none", zorder=1)
    ax.add_patch(bg_circle1)
    ax.add_patch(bg_circle2)

    # Floor shadow
    shadow1 = patches.Ellipse((600, 120), 620, 90, color="#d8bfac", alpha=0.5, ec="none", zorder=2)
    shadow2 = patches.Ellipse((600, 115), 450, 50, color="#bfa18c", alpha=0.6, ec="none", zorder=3)
    ax.add_patch(shadow1)
    ax.add_patch(shadow2)

    # Colors
    c_fur = "#c98f55"
    c_fur_dark = "#a87139"
    c_fur_light = "#dba56c"
    c_cream = "#faebd7"
    c_stitch = "#9e6833"
    c_pink = "#f7b2a6"
    c_dark = "#341f11"
    c_patch = "#e06363"
    c_bow = "#d9383a"

    # Feet (Sitting pose)
    # Left foot
    ax.add_patch(patches.Ellipse((390, 190), 230, 170, angle=-12, color=c_fur, ec=c_fur_dark, lw=3, zorder=10))
    ax.add_patch(patches.Ellipse((375, 185), 150, 115, angle=-12, color=c_cream, ec=c_stitch, lw=2, ls="--", zorder=11))
    # Toes left
    for dx, dy in [(-45, 45), (-5, 60), (35, 55)]:
        ax.add_patch(patches.Ellipse((375 + dx, 185 + dy), 34, 30, angle=-12, color=c_cream, ec=c_stitch, lw=1.5, zorder=12))

    # Right foot
    ax.add_patch(patches.Ellipse((810, 190), 230, 170, angle=12, color=c_fur, ec=c_fur_dark, lw=3, zorder=10))
    ax.add_patch(patches.Ellipse((825, 185), 150, 115, angle=12, color=c_cream, ec=c_stitch, lw=2, ls="--", zorder=11))
    # Toes right
    for dx, dy in [(45, 45), (5, 60), (-35, 55)]:
        ax.add_patch(patches.Ellipse((825 + dx, 185 + dy), 34, 30, angle=12, color=c_cream, ec=c_stitch, lw=1.5, zorder=12))

    # Plump Stuffed Body
    body = patches.Ellipse((600, 330), 450, 410, color=c_fur, ec=c_fur_dark, lw=3, zorder=6)
    ax.add_patch(body)

    # Soft Belly Patch
    belly = patches.Ellipse((600, 300), 290, 260, color=c_cream, ec=c_stitch, lw=2.5, ls="--", zorder=7)
    ax.add_patch(belly)

    # Body seam line
    ax.plot([600, 600], [180, 480], color=c_stitch, lw=2.5, ls=":", zorder=8)

    # Stitched Heart Chest Patch
    # Parametric heart shape
    t = np.linspace(0, 2 * np.pi, 100)
    hx = 16 * np.sin(t)**3
    hy = 13 * np.cos(t) - 5 * np.cos(2*t) - 2 * np.cos(3*t) - np.cos(4*t)
    hx_scaled = hx * 3.2 + 600
    hy_scaled = hy * 3.2 + 375
    ax.fill(hx_scaled, hy_scaled, color=c_patch, zorder=9, ec="white", lw=2, ls="--")
    # Patch button in center
    ax.add_patch(patches.Circle((600, 375), 10, color="#f7df8b", ec="#b5943a", lw=2, zorder=10))
    ax.plot([596, 604], [371, 379], color="#8f6b1e", lw=1.5, zorder=11)
    ax.plot([596, 604], [379, 371], color="#8f6b1e", lw=1.5, zorder=11)

    # Arms (Short & rounded)
    # Left Arm
    ax.add_patch(patches.Ellipse((370, 370), 160, 240, angle=35, color=c_fur, ec=c_fur_dark, lw=3, zorder=8))
    ax.add_patch(patches.Ellipse((330, 300), 75, 60, angle=35, color=c_cream, ec=c_stitch, lw=1.5, ls="--", zorder=9))

    # Right Arm
    ax.add_patch(patches.Ellipse((830, 370), 160, 240, angle=-35, color=c_fur, ec=c_fur_dark, lw=3, zorder=8))
    ax.add_patch(patches.Ellipse((870, 300), 75, 60, angle=-35, color=c_cream, ec=c_stitch, lw=1.5, ls="--", zorder=9))

    # Large Symmetrical Round Ears
    # Left ear
    ax.add_patch(patches.Circle((420, 680), 95, color=c_fur, ec=c_fur_dark, lw=3, zorder=13))
    ax.add_patch(patches.Circle((420, 680), 56, color=c_pink, ec=c_stitch, lw=2, ls="--", zorder=14))
    # Right ear
    ax.add_patch(patches.Circle((780, 680), 95, color=c_fur, ec=c_fur_dark, lw=3, zorder=13))
    ax.add_patch(patches.Circle((780, 680), 56, color=c_pink, ec=c_stitch, lw=2, ls="--", zorder=14))

    # Round Head
    ax.add_patch(patches.Circle((600, 560), 210, color=c_fur, ec=c_fur_dark, lw=3.5, zorder=15))
    # Head seam
    ax.plot([600, 600], [600, 765], color=c_stitch, lw=2, ls=":", zorder=16)

    # Rosy Cheeks
    ax.add_patch(patches.Ellipse((450, 520), 90, 55, color="#f79c94", alpha=0.45, ec="none", zorder=17))
    ax.add_patch(patches.Ellipse((750, 520), 90, 55, color="#f79c94", alpha=0.45, ec="none", zorder=17))

    # Big Cream Muzzle
    ax.add_patch(patches.Ellipse((600, 510), 195, 145, color=c_cream, ec=c_stitch, lw=2.5, ls="--", zorder=18))

    # Glossy Button Eyes
    for ex in [510, 690]:
        # Felt backing
        ax.add_patch(patches.Circle((ex, 580), 27, color="none", ec=c_stitch, lw=2, ls=":", zorder=19))
        # Button
        ax.add_patch(patches.Circle((ex, 580), 22, color=c_dark, ec="#1a0e08", lw=1.5, zorder=20))
        # Highlights
        ax.add_patch(patches.Circle((ex - 7, 587), 8, color="white", zorder=21))
        ax.add_patch(patches.Circle((ex + 7, 573), 3.5, color="white", alpha=0.8, zorder=21))

    # Triangular Soft Stitched Nose
    nose_verts = [(575, 545), (625, 545), (600, 515), (575, 545)]
    nose_path = Path(nose_verts, [Path.MOVETO, Path.LINETO, Path.LINETO, Path.CLOSEPOLY])
    nose_patch = patches.PathPatch(nose_path, facecolor=c_dark, edgecolor="#1a0e08", lw=2, zorder=22)
    ax.add_patch(nose_patch)
    ax.add_patch(patches.Ellipse((592, 538), 12, 5, angle=10, color="#593a25", zorder=23))

    # Embroidered Mouth Lines
    ax.plot([600, 600], [515, 490], color=c_dark, lw=4, solid_capstyle="round", zorder=22)
    # Smile curves
    t_mouth = np.linspace(0, np.pi, 50)
    ax.plot(600 - 32 + 32 * np.cos(t_mouth), 490 - 24 * np.sin(t_mouth), color=c_dark, lw=4, solid_capstyle="round", zorder=22)
    ax.plot(600 + 32 - 32 * np.cos(t_mouth), 490 - 24 * np.sin(t_mouth), color=c_dark, lw=4, solid_capstyle="round", zorder=22)

    # Cute Muzzle Whiskers / Stipple
    for px, py in [(545, 510), (535, 498), (550, 485), (655, 510), (665, 498), (650, 485)]:
        ax.add_patch(patches.Circle((px, py), 2.5, color="#ab7e54", zorder=20))

    # Neck Red Bow
    ax.add_patch(patches.Polygon([[600, 455], [510, 495], [520, 420]], closed=True, color=c_bow, ec="#961a1b", lw=2, zorder=24))
    ax.add_patch(patches.Polygon([[600, 455], [690, 495], [680, 420]], closed=True, color=c_bow, ec="#961a1b", lw=2, zorder=24))
    ax.add_patch(patches.Ellipse((600, 455), 44, 36, color="#bd2426", ec="#961a1b", lw=2, zorder=25))
    ax.plot([550, 580], [455, 455], color="#fca5a5", lw=2, zorder=25)
    ax.plot([620, 650], [455, 455], color="#fca5a5", lw=2, zorder=25)

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bear-plush.py <output_path>")
        sys.exit(1)
    draw_bear(sys.argv[1])
