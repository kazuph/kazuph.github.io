import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyArrowPatch
from matplotlib.path import Path
import matplotlib.patches as mpatches

FUR = "#CD965F"
FUR_DARK = "#AC7644"
MUZZLE = "#F0D6B2"
PAD = "#EBBE96"
NOSE = "#5C3E2C"
PATCH = "#F4C478"
STITCH = "#96643C"
CHEEK = "#EEA08C"
BG = "#FCF6EC"


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # legs
    for sx in (-1, 1):
        ax.add_patch(Ellipse((sx * 1.95, -3.1), 2.1, 1.7, facecolor=FUR,
                             edgecolor=FUR_DARK, linewidth=2))
        ax.add_patch(Ellipse((sx * 1.95, -3.2), 1.24, 0.96, facecolor=PAD,
                             edgecolor=FUR_DARK, linewidth=1.5))
        for dx in (-0.23, 0.0, 0.23):
            y = -2.92 if dx == 0.0 else -3.0
            ax.add_patch(Circle((sx * 1.95 + dx, y), 0.09, facecolor=FUR_DARK,
                                edgecolor="none"))

    # arms
    ax.add_patch(Ellipse((-2.6, -0.7), 1.44, 2.1, angle=25, facecolor=FUR,
                         edgecolor=FUR_DARK, linewidth=2))
    ax.add_patch(Ellipse((2.6, -0.7), 1.44, 2.1, angle=-25, facecolor=FUR,
                         edgecolor=FUR_DARK, linewidth=2))

    # body and belly
    ax.add_patch(Ellipse((0, -1.4), 4.7, 4.1, facecolor=FUR,
                         edgecolor=FUR_DARK, linewidth=2))
    ax.add_patch(Ellipse((0, -1.55), 3.1, 2.8, facecolor=MUZZLE,
                         edgecolor="none"))

    # chest patch with heart stitch
    ax.add_patch(Circle((0, -0.55), 0.52, facecolor=PATCH,
                        edgecolor=STITCH, linewidth=1.5))
    ax.add_patch(Circle((0, -0.55), 0.44, facecolor="none",
                        edgecolor=STITCH, linewidth=1.2, linestyle=(0, (3, 3))))
    heart = Path(
        [(0, -0.58), (-0.02, -0.40), (-0.20, -0.40), (-0.20, -0.62),
         (-0.20, -0.78), (0, -0.84), (0, -0.90),
         (0, -0.84), (0.20, -0.78), (0.20, -0.62),
         (0.20, -0.40), (0.02, -0.40), (0, -0.58)],
        [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4,
         Path.CURVE4, Path.CURVE4, Path.CURVE4,
         Path.CURVE4, Path.CURVE4, Path.CURVE4,
         Path.CURVE4, Path.CURVE4, Path.CURVE4],
    )
    ax.add_patch(mpatches.PathPatch(heart, facecolor="none",
                                    edgecolor=STITCH, linewidth=1.5))

    # ears
    for sx in (-1, 1):
        ax.add_patch(Circle((sx * 1.55, 3.05), 0.78, facecolor=FUR,
                            edgecolor=FUR_DARK, linewidth=2))
        ax.add_patch(Circle((sx * 1.55, 3.05), 0.42, facecolor=PAD,
                            edgecolor=FUR_DARK, linewidth=1.5))

    # head and muzzle
    ax.add_patch(Circle((0, 1.7), 2.0, facecolor=FUR,
                        edgecolor=FUR_DARK, linewidth=2))
    ax.add_patch(Ellipse((0, 1.05), 2.1, 1.56, facecolor=MUZZLE,
                         edgecolor=FUR_DARK, linewidth=1.5))

    # eyes with highlight
    for sx in (-1, 1):
        ax.add_patch(Circle((sx * 0.78, 2.15), 0.17, facecolor="black",
                            edgecolor="none"))
        ax.add_patch(Circle((sx * 0.78 + 0.06, 2.22), 0.055, facecolor="white",
                            edgecolor="none"))

    # cheeks
    for sx in (-1, 1):
        ax.add_patch(Ellipse((sx * 1.35, 1.45), 0.68, 0.44, facecolor=CHEEK,
                             edgecolor="none", alpha=0.55))

    # nose and mouth
    ax.add_patch(Ellipse((0, 1.38), 0.52, 0.36, facecolor=NOSE,
                         edgecolor="none"))
    ax.plot([0, 0], [1.2, 0.95], color=NOSE, linewidth=2.4,
            solid_capstyle="round")
    mouth_l = FancyArrowPatch(path=Path([(0, 0.95), (-0.18, 0.78), (-0.38, 0.9)],
                                        [Path.MOVETO, Path.CURVE3, Path.CURVE3]),
                              arrowstyle="-", color=NOSE, linewidth=2.4)
    mouth_r = FancyArrowPatch(path=Path([(0, 0.95), (0.18, 0.78), (0.38, 0.9)],
                                        [Path.MOVETO, Path.CURVE3, Path.CURVE3]),
                              arrowstyle="-", color=NOSE, linewidth=2.4)
    ax.add_patch(mouth_l)
    ax.add_patch(mouth_r)

    # head stitch for plush texture
    ax.plot([0, 0], [3.7, 3.35], color=STITCH, linewidth=1.6)
    ax.plot([-0.12, 0.12], [3.55, 3.55], color=STITCH, linewidth=1.6)

    fig.savefig(out_path, bbox_inches="tight", facecolor=BG)


if __name__ == "__main__":
    main()
