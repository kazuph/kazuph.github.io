import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Rectangle, Wedge

WALL = "#DEECF2"
FLOOR = "#D8BA8E"
FLOORLINE = "#C4A476"
DOOR = "#A87C50"
DOOR_DARK = "#8C643E"
BED = "#78A0C8"
SHEET = "#EBF2F8"
DESK = "#B08458"
SHIRT = "#F09650"
PANTS = "#5A78AA"
SKIN = "#F8D8BA"
HAIR_BOY = "#5A3E28"
HAIR_MOM = "#785032"
MOM_DRESS = "#96B48C"
VR = "#3C3C46"
CTRL = "#50505A"
TOY = "#E67878"


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")

    # room
    ax.add_patch(Rectangle((0, 2.6), 12, 6.4, facecolor=WALL, edgecolor="none"))
    ax.add_patch(Rectangle((0, 0), 12, 2.6, facecolor=FLOOR, edgecolor="none"))
    for x in range(0, 13, 2):
        ax.plot([x, x + 1.0], [0, 2.6], color=FLOORLINE, linewidth=1.5)

    # bed on the left
    ax.add_patch(Rectangle((0.4, 1.3), 3.2, 0.9, facecolor=BED, edgecolor="none"))
    ax.add_patch(Rectangle((0.4, 2.2), 3.2, 0.5, facecolor=SHEET, edgecolor="none"))
    ax.add_patch(Rectangle((0.3, 1.1), 0.25, 2.0, facecolor="#54759A", edgecolor="none"))
    ax.add_patch(Rectangle((3.55, 1.1), 0.25, 1.4, facecolor="#54759A", edgecolor="none"))
    ax.add_patch(Ellipse((0.85, 2.5), 1.1, 0.56, facecolor="white",
                         edgecolor="#54759A", linewidth=1.5))

    # desk with monitor
    ax.add_patch(Rectangle((4.2, 3.4), 2.4, 0.25, facecolor=DESK, edgecolor="none"))
    ax.plot([4.4, 4.4], [2.4, 3.4], color=DESK, linewidth=5)
    ax.plot([6.4, 6.4], [2.4, 3.4], color=DESK, linewidth=5)
    ax.add_patch(Rectangle((4.9, 3.65), 1.1, 0.8, facecolor=VR, edgecolor="none"))
    ax.add_patch(Rectangle((5.0, 3.75), 0.9, 0.6, facecolor="#A8C8E0", edgecolor="none"))

    # wall shelf with books and a toy
    ax.add_patch(Rectangle((4.4, 6.2), 3.0, 0.2, facecolor=DESK, edgecolor="none"))
    ax.add_patch(Rectangle((4.7, 6.4), 0.3, 0.6, facecolor=TOY, edgecolor="none"))
    ax.add_patch(Rectangle((5.1, 6.4), 0.3, 0.65, facecolor=BED, edgecolor="none"))
    ax.add_patch(Rectangle((5.5, 6.4), 0.3, 0.55, facecolor=SHIRT, edgecolor="none"))
    ax.add_patch(Circle((6.6, 6.66), 0.25, facecolor=TOY, edgecolor="none"))

    # poster
    ax.add_patch(Rectangle((1.4, 5.6), 1.6, 2.0, facecolor="white",
                           edgecolor=BED, linewidth=2.5))
    ax.add_patch(Circle((2.2, 6.9), 0.4, facecolor=TOY, edgecolor="none"))
    ax.plot([1.7, 2.7], [6.0, 6.4], color=BED, linewidth=2.5)

    # son playing VR: legs in motion
    ax.add_patch(Polygon([(7.0, 1.25), (7.45, 2.3), (7.95, 2.3), (7.7, 1.2)],
                         facecolor=PANTS, edgecolor="none"))
    ax.add_patch(Polygon([(8.6, 1.5), (8.05, 2.3), (8.55, 2.45), (9.05, 1.8)],
                         facecolor=PANTS, edgecolor="none"))
    ax.add_patch(Rectangle((6.75, 1.05), 0.6, 0.27, facecolor=VR, edgecolor="none"))
    ax.add_patch(Rectangle((8.95, 1.55), 0.55, 0.27, facecolor=VR, edgecolor="none"))

    # torso
    ax.add_patch(Polygon([(7.35, 2.25), (8.55, 2.4), (8.4, 3.85), (7.5, 3.75)],
                         facecolor=SHIRT, edgecolor="none"))
    # arms with controllers
    ax.add_patch(Polygon([(7.5, 3.5), (6.7, 4.4), (6.95, 4.65), (7.8, 3.8)],
                         facecolor=SHIRT, edgecolor="none"))
    ax.add_patch(Circle((6.78, 4.5), 0.17, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(FancyBboxPatch((6.5, 4.6), 0.35, 0.25,
                                boxstyle="round,pad=0.02,rounding_size=0.06",
                                facecolor=CTRL, edgecolor="none"))
    ax.add_patch(Polygon([(8.3, 3.6), (9.15, 4.5), (8.9, 4.75), (8.05, 3.9)],
                         facecolor=SHIRT, edgecolor="none"))
    ax.add_patch(Circle((9.05, 4.6), 0.17, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(FancyBboxPatch((8.95, 4.7), 0.35, 0.25,
                                boxstyle="round,pad=0.02,rounding_size=0.06",
                                facecolor=CTRL, edgecolor="none"))

    # head with VR goggles and happy mouth
    ax.add_patch(Circle((7.95, 4.35), 0.5, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(Wedge((7.95, 4.45), 0.55, 15, 165, facecolor=HAIR_BOY,
                       edgecolor="none"))
    ax.add_patch(FancyBboxPatch((7.5, 4.25), 0.8, 0.37,
                                boxstyle="round,pad=0.02,rounding_size=0.08",
                                facecolor=VR, edgecolor="none"))
    ax.add_patch(Ellipse((7.98, 3.98), 0.24, 0.18, facecolor=TOY, edgecolor="none"))
    # motion marks
    ax.plot([6.45, 6.7], [5.05, 4.95], color=CTRL, linewidth=2)
    ax.plot([9.55, 9.3], [5.15, 5.0], color=CTRL, linewidth=2)
    ax.plot([8.05, 8.0], [5.1, 4.95], color=CTRL, linewidth=2)

    # door frame with mother peeking
    ax.add_patch(Rectangle((10.0, 2.45), 1.9, 5.15, facecolor=DOOR_DARK,
                           edgecolor="none"))
    ax.add_patch(Rectangle((10.15, 2.55), 1.6, 4.9, facecolor="#EFF5F8",
                           edgecolor="none"))
    ax.add_patch(Polygon([(10.15, 2.55), (11.0, 2.85), (11.0, 7.15),
                          (10.15, 7.45)], facecolor=DOOR, edgecolor="none"))
    ax.add_patch(Circle((10.8, 4.9), 0.07, facecolor=CTRL, edgecolor="none"))

    # mother body and head
    ax.add_patch(Polygon([(11.0, 2.7), (11.75, 2.7), (11.75, 5.0),
                          (11.15, 5.0)], facecolor=MOM_DRESS, edgecolor="none"))
    ax.add_patch(Circle((11.3, 5.45), 0.42, facecolor=SKIN, edgecolor="none"))
    ax.add_patch(Wedge((11.32, 5.55), 0.48, 25, 195, facecolor=HAIR_MOM,
                       edgecolor="none"))
    ax.add_patch(Rectangle((11.62, 4.85), 0.16, 0.7, facecolor=HAIR_MOM,
                           edgecolor="none"))
    ax.add_patch(Circle((11.12, 5.45), 0.05, facecolor="black", edgecolor="none"))
    ax.plot([11.05, 11.17, 11.3], [5.2, 5.13, 5.18], color="black", linewidth=1.5)
    ax.add_patch(Circle((11.02, 3.9), 0.14, facecolor=SKIN, edgecolor="none"))

    # gaze line from mother to son
    ax.annotate("", xy=(8.5, 4.6), xytext=(11.05, 5.4),
                arrowprops=dict(arrowstyle="->", linestyle="--",
                                color="#8C8C8C",
                                connectionstyle="arc3,rad=-0.15"))

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
