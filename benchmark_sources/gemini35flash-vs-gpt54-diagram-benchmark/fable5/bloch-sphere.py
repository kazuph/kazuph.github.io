import sys

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Circle, FancyArrowPatch


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-5.2, 8.6)
    ax.set_ylim(-4.8, 5.6)
    ax.set_aspect("equal")
    ax.axis("off")

    R = 3.0

    # sphere body with light radial shading
    for r, a in [(R, 0.12), (R * 0.985, 0.10), (R * 0.96, 0.08)]:
        ax.add_patch(Circle((0, 0), r, facecolor="#6488C8", alpha=a,
                            edgecolor="none"))
    ax.add_patch(Circle((0, 0), R, facecolor="none", edgecolor="#5A5A64",
                        linewidth=2))

    # equator: front solid, back dashed
    ax.add_patch(Arc((0, 0), 2 * R, 1.9, theta1=180, theta2=360,
                     color="#5A5A64", linewidth=1.8))
    ax.add_patch(Arc((0, 0), 2 * R, 1.9, theta1=0, theta2=180,
                     color="#8C8C96", linewidth=1.5, linestyle=(0, (5, 4))))
    # meridian for depth
    ax.add_patch(Arc((0, 0), 1.7, 2 * R, theta1=90, theta2=270,
                     color="#B4B4BE", linewidth=1.2, linestyle=(0, (5, 4))))

    # axes
    def axis_arrow(p1, label, dx, dy):
        ax.add_patch(FancyArrowPatch((0, 0), p1, arrowstyle="-|>",
                                     mutation_scale=18, color="#1A1A22",
                                     linewidth=1.8))
        ax.text(p1[0] + dx, p1[1] + dy, label, fontsize=16,
                style="italic", ha="center", va="center")

    axis_arrow((0, 4.3), "z", 0.0, 0.3)
    axis_arrow((-2.5, -1.85), "x", -0.3, -0.25)
    axis_arrow((4.3, 0), "y", 0.35, 0.0)

    # basis states
    ax.text(0.18, 3.1, r"$|0\rangle$", fontsize=16, ha="left", va="bottom")
    ax.text(0.18, -3.1, r"$|1\rangle$", fontsize=16, ha="left", va="top")

    # state vector
    P = (1.72, 1.98)
    ax.add_patch(FancyArrowPatch((0, 0), P, arrowstyle="-|>",
                                 mutation_scale=22, color="#B43232",
                                 linewidth=2.8))
    ax.add_patch(Circle(P, 0.07, facecolor="#B43232", edgecolor="none"))
    ax.text(P[0] + 0.25, P[1] + 0.3, r"$|\psi\rangle$", fontsize=17,
            color="#B43232", ha="left")

    # projection to equator plane
    Q = (1.95, -0.52)
    ax.plot([P[0], Q[0]], [P[1], Q[1]], color="#5A5A64", linewidth=1.4,
            linestyle=(0, (5, 4)))
    ax.plot([0, Q[0]], [0, Q[1]], color="#5A5A64", linewidth=1.4,
            linestyle=(0, (5, 4)))

    # theta arc from z-axis to vector
    ax.add_patch(Arc((0, 0), 2.5, 2.5, theta1=49, theta2=90,
                     color="#2850A0", linewidth=2))
    ax.text(0.55, 1.65, r"$\theta$", fontsize=16, color="#2850A0")

    # phi arc along equator from x-axis to projection
    t = np.linspace(np.radians(215), np.radians(345), 60)
    ax.plot(1.25 * np.cos(t), 0.42 * np.sin(t), color="#2D7332", linewidth=2)
    tip_t = np.radians(345)
    ax.add_patch(FancyArrowPatch(
        (1.25 * np.cos(tip_t - 0.12), 0.42 * np.sin(tip_t - 0.12)),
        (1.25 * np.cos(tip_t), 0.42 * np.sin(tip_t)),
        arrowstyle="-|>", mutation_scale=14, color="#2D7332"))
    ax.text(0.25, -1.55, r"$\varphi$", fontsize=16, color="#2D7332")

    # state formula
    ax.text(4.1, 3.4,
            r"$|\psi\rangle = \cos\frac{\theta}{2}\,|0\rangle"
            r" + e^{i\varphi}\sin\frac{\theta}{2}\,|1\rangle$",
            fontsize=15, ha="left")

    ax.text(1.6, 5.1, "Bloch sphere", fontsize=19, weight="bold",
            family="sans-serif", ha="center")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
