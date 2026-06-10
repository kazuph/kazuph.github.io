import sys

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle

STEEL_DARK = "#788490"
OIL_HI = "#F0965A"
OIL_LO = "#FAD6A0"
OIL_HI_DARK = "#B05A1E"
OIL_LO_DARK = "#A07840"
PISTON = "#606E7C"
ROD = "#96A0AA"
SEAL = "#3C3C42"


def hatched_rect(ax, x, y, w, h):
    ax.add_patch(Rectangle((x, y), w, h, facecolor="white",
                           edgecolor=STEEL_DARK, hatch="////", linewidth=0))
    ax.add_patch(Rectangle((x, y), w, h, facecolor="none",
                           edgecolor="black", linewidth=2))


def label(ax, text, xy_text, xy_point, color="#3C3C46"):
    ax.annotate(text, xy=xy_point, xytext=xy_text, fontsize=11,
                family="sans-serif", color=color, ha="center", va="center",
                arrowprops=dict(arrowstyle="-", color="#6E6E78", linewidth=1.2))


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-2.2, 13.0)
    ax.set_ylim(-3.2, 7.2)
    ax.set_aspect("equal")
    ax.axis("off")

    # cylinder walls (hatched cross-section)
    hatched_rect(ax, 0, 3.0, 10.0, 0.6)
    hatched_rect(ax, 0, -0.6, 10.0, 0.6)
    hatched_rect(ax, -0.6, -0.6, 0.6, 4.2)
    hatched_rect(ax, 10.0, 1.95, 0.6, 1.65)
    hatched_rect(ax, 10.0, -0.6, 0.6, 1.65)

    # chambers
    ax.add_patch(Rectangle((0, 0), 4.0, 3.0, facecolor=OIL_HI, edgecolor="none"))
    ax.add_patch(Rectangle((5.0, 0), 5.0, 3.0, facecolor=OIL_LO, edgecolor="none"))

    # piston with seals
    ax.add_patch(Rectangle((4.0, 0.02), 1.0, 2.96, facecolor=PISTON,
                           edgecolor="black", linewidth=1.8))
    ax.add_patch(Rectangle((4.12, 2.78), 0.76, 0.18, facecolor=SEAL,
                           edgecolor="none"))
    ax.add_patch(Rectangle((4.12, 0.04), 0.76, 0.18, facecolor=SEAL,
                           edgecolor="none"))

    # rod and rod seal
    ax.add_patch(Rectangle((5.0, 1.05), 6.8, 0.9, facecolor=ROD,
                           edgecolor="black", linewidth=1.8))
    ax.add_patch(Rectangle((10.05, 1.92), 0.5, 0.18, facecolor=SEAL,
                           edgecolor="none"))
    ax.add_patch(Rectangle((10.05, 0.9), 0.5, 0.18, facecolor=SEAL,
                           edgecolor="none"))

    # center line
    ax.plot([-1.0, 12.4], [1.5, 1.5], color="#787878", linewidth=1.2,
            linestyle=(0, (8, 4, 2, 4)))

    # ports
    ax.add_patch(Rectangle((1.4, 3.6), 0.6, 0.8, facecolor=OIL_HI,
                           edgecolor="black", linewidth=1.8))
    ax.add_patch(Rectangle((8.0, 3.6), 0.6, 0.8, facecolor=OIL_LO,
                           edgecolor="black", linewidth=1.8))
    ax.add_patch(FancyArrowPatch((1.7, 5.1), (1.7, 3.8),
                                 arrowstyle="-|>", mutation_scale=22,
                                 color=OIL_HI_DARK, linewidth=2.5))
    ax.text(1.7, 5.45, "IN (high pressure)", ha="center", fontsize=11,
            family="sans-serif", color=OIL_HI_DARK)
    ax.add_patch(FancyArrowPatch((8.3, 3.8), (8.3, 5.1),
                                 arrowstyle="-|>", mutation_scale=22,
                                 color=OIL_LO_DARK, linewidth=2.5))
    ax.text(8.3, 5.45, "OUT (return)", ha="center", fontsize=11,
            family="sans-serif", color=OIL_LO_DARK)

    # flow arrows inside chambers
    for x0, y0, x1, y1, c in [
        (1.0, 1.5, 2.2, 1.5, OIL_HI_DARK),
        (1.6, 2.3, 2.8, 2.3, OIL_HI_DARK),
        (1.6, 0.7, 2.8, 0.7, OIL_HI_DARK),
        (6.6, 2.4, 7.8, 2.7, OIL_LO_DARK),
        (6.4, 0.7, 7.6, 0.5, OIL_LO_DARK),
    ]:
        ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-|>",
                                     mutation_scale=16, color=c, linewidth=2))

    # piston motion arrow
    ax.add_patch(FancyArrowPatch((5.4, 3.95), (7.0, 3.95), arrowstyle="-|>",
                                 mutation_scale=26, color="#46525E",
                                 linewidth=3))
    ax.text(6.2, 4.3, "piston motion", ha="center", fontsize=11,
            family="sans-serif", color="#46525E")

    # labels
    label(ax, "Cylinder barrel", (1.0, -1.7), (1.0, -0.35))
    label(ax, "End cap", (-1.4, -1.2), (-0.3, -0.5))
    label(ax, "Cap-side chamber A", (3.0, -2.3), (3.0, 0.4))
    label(ax, "Piston + seals", (5.2, -1.6), (4.5, 0.05))
    label(ax, "Rod-side chamber B", (7.6, -2.3), (7.2, 0.35))
    label(ax, "Piston rod", (10.8, -1.3), (11.0, 1.05))
    label(ax, "Rod seal / gland", (11.6, 4.0), (10.4, 2.15))

    ax.text(5.2, 6.4, "Hydraulic cylinder — cross section", ha="center",
            fontsize=15, family="sans-serif", weight="bold")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
