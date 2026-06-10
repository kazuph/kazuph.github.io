import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

PRED = ("#5082C8", "#D7E3F5")
UPD = ("#5AAA6E", "#DCEEE1")
MEAS = ("#E69646", "#FAE8D2")
GAIN = ("#B46EB4", "#EFDFEF")
GRAY = ("#6E6E78", "#EBEBEE")


def box(ax, xy, w, h, colors, title, lines, title_size=13, body_size=11):
    edge, fill = colors
    ax.add_patch(FancyBboxPatch((xy[0] - w / 2, xy[1] - h / 2), w, h,
                                boxstyle="round,pad=0.06,rounding_size=0.12",
                                facecolor=fill, edgecolor=edge, linewidth=2))
    ax.text(xy[0], xy[1] + h / 2 - 0.38, title, ha="center", va="center",
            fontsize=title_size, weight="bold", family="sans-serif")
    for i, line in enumerate(lines):
        ax.text(xy[0], xy[1] + h / 2 - 0.95 - 0.52 * i, line, ha="center",
                va="center", fontsize=body_size)


def arrow(ax, p0, p1, label=None, lpos=None, color="#32323C", rad=0.0,
          ha="center", va="bottom"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=18,
                                 color=color, linewidth=2,
                                 connectionstyle=f"arc3,rad={rad}",
                                 shrinkA=2, shrinkB=2))
    if label:
        ax.text(lpos[0], lpos[1], label, fontsize=11, ha=ha, va=va,
                family="sans-serif")


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-4.2, 15.6)
    ax.set_ylim(-7.6, 6.4)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(5.6, 5.7, "Kalman filter block diagram", fontsize=17,
            weight="bold", family="sans-serif", ha="center")

    # blocks
    box(ax, (0, 0), 4.4, 2.6, PRED, "Prediction",
        [r"$\hat{x}_{k|k-1} = F\,\hat{x}_{k-1} + B\,u_k$",
         r"$P_{k|k-1} = F P_{k-1} F^{\top} + Q$"])
    box(ax, (6.4, 3.4), 4.0, 1.7, MEAS, "Measurement",
        [r"sensor output $z_k$"])
    box(ax, (6.4, -3.4), 4.2, 1.9, GAIN, "Kalman gain",
        [r"$K_k = P_{k|k-1} H^{\top} S_k^{-1}$"])
    box(ax, (12.2, 0), 4.6, 2.6, UPD, "Update",
        [r"$\hat{x}_k = \hat{x}_{k|k-1} + K_k\,y_k$",
         r"$P_k = (I - K_k H)\,P_{k|k-1}$"])

    # H block and unit delay
    box(ax, (3.6, 0), 1.1, 0.95, GRAY, r"$H$", [], title_size=13)
    box(ax, (4.4, -6.0), 1.3, 0.95, GRAY, r"$z^{-1}$", [], title_size=13)

    # residual sum junction
    ax.add_patch(Circle((6.4, 0), 0.34, facecolor="white", edgecolor="black",
                        linewidth=2))
    ax.text(6.4, 0, "+", fontsize=14, ha="center", va="center")
    ax.text(5.85, -0.55, "−", fontsize=13, ha="center", va="center")

    # input
    arrow(ax, (-4.0, 0), (-2.25, 0))
    ax.text(-3.95, 0.25, r"control input $u_k$", fontsize=11, ha="left",
            family="sans-serif")

    # prediction -> H -> sum
    arrow(ax, (2.25, 0), (3.0, 0))
    arrow(ax, (4.2, 0), (6.02, 0), label=r"$H\,\hat{x}_{k|k-1}$",
          lpos=(5.1, 0.25))

    # measurement -> sum
    arrow(ax, (6.4, 2.5), (6.4, 0.4), label=r"$z_k$", lpos=(6.7, 1.4),
          ha="left")

    # sum -> update
    arrow(ax, (6.78, 0), (9.85, 0), label=r"residual $y_k$",
          lpos=(8.3, 0.25))

    # prediction covariance -> gain
    ax.plot([0, 0, 4.25], [-1.36, -3.4, -3.4], color="#32323C", linewidth=2)
    arrow(ax, (4.0, -3.4), (4.28, -3.4), label=r"$P_{k|k-1}$",
          lpos=(1.7, -3.15))

    # gain -> update
    ax.plot([8.55, 11.1, 11.1], [-3.4, -3.4, -1.5], color="#32323C",
            linewidth=2)
    arrow(ax, (11.1, -1.7), (11.1, -1.42), label=r"$K_k$",
          lpos=(11.4, -2.4), ha="left")

    # update -> output
    arrow(ax, (14.55, 0), (15.5, 0))
    ax.text(15.4, 0.3, r"state estimate $\hat{x}_k$", fontsize=11,
            ha="right", family="sans-serif")

    # feedback through delay
    ax.plot([15.0, 15.0, 5.1], [0, -6.0, -6.0], color="#32323C", linewidth=2)
    ax.plot([3.72, -2.9, -2.9], [-6.0, -6.0, -1.4], color="#32323C",
            linewidth=2)
    arrow(ax, (-2.9, -1.6), (-1.9, -0.95))
    ax.text(-2.6, -4.0, r"$\hat{x}_{k-1},\ P_{k-1}$", fontsize=11, ha="left",
            family="sans-serif")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
