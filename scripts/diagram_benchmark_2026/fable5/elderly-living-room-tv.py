import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Rectangle, Wedge

WALL = "#F6ECDA"
FLOOR = "#D2B086"
FLOORLINE = "#BE9A6E"
CURTAIN = "#E29478"
CURTAIN_DARK = "#CD7C60"
SKY = "#B4D6E8"
TV_FRAME = "#46464E"
TV_SCREEN = "#8CBED7"
SOFA = "#96AA78"
SOFA_DARK = "#7A8E5E"
SKIN = "#F6D8BC"
HAIR = "#E2E2E2"
DRESS = "#AA82A0"
WOOD = "#A07448"
RUG = "#E8C4A0"
LAMP = "#FADC8C"


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    # room
    ax.add_patch(Rectangle((0, 3), 12, 6, facecolor=WALL, edgecolor="none"))
    ax.add_patch(Rectangle((0, 0), 12, 3, facecolor=FLOOR, edgecolor="none"))
    for x in range(0, 13, 2):
        ax.plot([x, x + 1.2], [0, 3], color=FLOORLINE, linewidth=1.5)

    # window and curtains
    ax.add_patch(Rectangle((4.6, 5.6), 2.8, 2.6, facecolor=SKY,
                           edgecolor=WOOD, linewidth=3))
    ax.plot([6, 6], [5.6, 8.2], color="white", linewidth=3)
    ax.plot([4.6, 7.4], [6.9, 6.9], color="white", linewidth=3)
    ax.add_patch(Polygon([(4.0, 5.3), (4.45, 6.8), (4.3, 8.4), (4.6, 8.4),
                          (4.6, 5.3)], facecolor=CURTAIN, edgecolor="none"))
    ax.add_patch(Polygon([(8.0, 5.3), (7.55, 6.8), (7.7, 8.4), (7.4, 8.4),
                          (7.4, 5.3)], facecolor=CURTAIN, edgecolor="none"))
    ax.add_patch(Rectangle((4.0, 8.2), 4.0, 0.3, facecolor=CURTAIN_DARK,
                           edgecolor="none"))

    # floor lamp
    ax.add_patch(Polygon([(10.2, 6.0), (9.2, 4.0), (11.2, 4.0)],
                         facecolor=LAMP, edgecolor="none", alpha=0.45))
    ax.plot([10.2, 10.2], [3.0, 6.0], color=WOOD, linewidth=4)
    ax.add_patch(Rectangle((9.8, 2.9), 0.8, 0.15, facecolor=WOOD,
                           edgecolor="none"))
    ax.add_patch(Polygon([(9.55, 6.0), (10.85, 6.0), (10.55, 7.0),
                          (9.85, 7.0)], facecolor=LAMP, edgecolor=WOOD,
                         linewidth=2))

    # TV and stand
    ax.add_patch(Rectangle((0.7, 2.2), 3.2, 0.7, facecolor=WOOD,
                           edgecolor="none"))
    ax.add_patch(Rectangle((0.9, 1.7), 0.3, 0.5, facecolor="#6E5030",
                           edgecolor="none"))
    ax.add_patch(Rectangle((3.4, 1.7), 0.3, 0.5, facecolor="#6E5030",
                           edgecolor="none"))
    ax.add_patch(Rectangle((0.8, 3.0), 3.0, 2.4, facecolor=TV_FRAME,
                           edgecolor="none"))
    ax.add_patch(Rectangle((0.95, 3.15), 2.7, 2.1, facecolor=TV_SCREEN,
                           edgecolor="none"))
    ax.add_patch(Rectangle((0.95, 3.15), 2.7, 0.65, facecolor="#5A966E",
                           edgecolor="none"))
    ax.add_patch(Circle((2.9, 4.5), 0.25, facecolor=LAMP, edgecolor="none"))
    ax.add_patch(Polygon([(1.1, 4.7), (1.9, 5.25), (1.45, 5.25), (0.95, 4.9)],
                         facecolor="white", edgecolor="none", alpha=0.5))

    # rug
    ax.add_patch(Ellipse((5.0, 0.6), 6.8, 1.6, facecolor=RUG,
                         edgecolor="none"))
    ax.add_patch(Ellipse((5.0, 0.6), 5.4, 1.1, facecolor="none",
                         edgecolor=CURTAIN_DARK, linewidth=1.5,
                         linestyle=(0, (5, 4))))

    # side table with steaming teacup
    ax.add_patch(Rectangle((4.7, 2.2), 1.8, 0.22, facecolor=WOOD,
                           edgecolor="none"))
    ax.plot([4.9, 4.9], [1.0, 2.2], color=WOOD, linewidth=4)
    ax.plot([6.3, 6.3], [1.0, 2.2], color=WOOD, linewidth=4)
    ax.add_patch(Rectangle((5.4, 2.42), 0.5, 0.33, facecolor="white",
                           edgecolor=CURTAIN_DARK, linewidth=1.5))
    ax.add_patch(Wedge((5.9, 2.6), 0.14, -90, 90, width=0.05,
                       facecolor=CURTAIN_DARK, edgecolor="none"))
    for x0 in (5.55, 5.75):
        ax.plot([x0, x0 - 0.05, x0 + 0.05],
                [2.8, 3.0, 3.2], color="#9C9C9C", linewidth=1.5)

    # sofa facing the TV
    ax.add_patch(Rectangle((7.2, 1.0), 3.4, 0.5, facecolor=SOFA_DARK,
                           edgecolor="none"))
    ax.add_patch(Rectangle((7.4, 1.5), 3.0, 1.1, facecolor=SOFA,
                           edgecolor=SOFA_DARK, linewidth=2))
    ax.add_patch(FancyBboxPatch((9.45, 1.6), 1.05, 2.9,
                                boxstyle="round,pad=0.08,rounding_size=0.18",
                                facecolor=SOFA, edgecolor=SOFA_DARK,
                                linewidth=2))
    ax.add_patch(FancyBboxPatch((7.55, 2.55), 1.7, 0.5,
                                boxstyle="round,pad=0.05,rounding_size=0.12",
                                facecolor="#AABc8E", edgecolor=SOFA_DARK,
                                linewidth=1.5))

    # grandma seated, facing left toward the TV
    ax.add_patch(Rectangle((7.9, 1.5), 0.6, 0.9, facecolor="#5A4458",
                           edgecolor="none"))
    ax.add_patch(Rectangle((7.75, 1.15), 0.75, 0.35, facecolor=SKIN,
                           edgecolor="none"))
    ax.add_patch(Rectangle((7.6, 1.0), 0.6, 0.3, facecolor="#B4B4B4",
                           edgecolor="none"))
    ax.add_patch(Polygon([(8.3, 2.4), (9.6, 2.4), (9.5, 4.3), (8.5, 4.3)],
                         facecolor=DRESS, edgecolor="none"))
    ax.add_patch(Rectangle((8.35, 3.15), 0.85, 0.35, facecolor=DRESS,
                           edgecolor="none"))
    ax.add_patch(Circle((8.05, 3.32), 0.19, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(Rectangle((7.8, 3.25), 0.35, 0.17, facecolor=TV_FRAME,
                           edgecolor="none"))

    # head with white hair bun, eye toward TV
    ax.add_patch(Circle((9.0, 4.75), 0.52, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(Wedge((9.05, 4.85), 0.58, 20, 175, facecolor=HAIR,
                       edgecolor="none"))
    ax.add_patch(Circle((9.4, 4.95), 0.22, facecolor=HAIR, edgecolor="none"))
    ax.add_patch(Circle((8.68, 4.8), 0.05, facecolor="black",
                        edgecolor="none"))
    ax.plot([8.6, 8.72, 8.85], [4.55, 4.47, 4.52], color="black",
            linewidth=1.5)

    # gaze direction toward the TV
    ax.annotate("", xy=(3.4, 4.6), xytext=(8.6, 4.78),
                arrowprops=dict(arrowstyle="->", linestyle="--",
                                color="#8C8C8C",
                                connectionstyle="arc3,rad=0.18"))

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
