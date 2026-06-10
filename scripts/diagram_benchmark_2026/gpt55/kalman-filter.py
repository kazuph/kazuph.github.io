import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle


def add_block(ax, xy, width, height, title, lines, facecolor, edgecolor="#263238"):
    x, y = xy
    block = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.02,rounding_size=0.035",
        linewidth=2.0,
        edgecolor=edgecolor,
        facecolor=facecolor,
        zorder=2,
    )
    ax.add_patch(block)

    ax.text(
        x + width / 2,
        y + height - 0.16,
        title,
        ha="center",
        va="top",
        fontsize=16,
        fontweight="bold",
        color="#102027",
        zorder=3,
    )

    for i, line in enumerate(lines):
        ax.text(
            x + width / 2,
            y + height - 0.42 - i * 0.18,
            line,
            ha="center",
            va="top",
            fontsize=12,
            color="#263238",
            zorder=3,
        )

    return {
        "left": (x, y + height / 2),
        "right": (x + width, y + height / 2),
        "top": (x + width / 2, y + height),
        "bottom": (x + width / 2, y),
        "center": (x + width / 2, y + height / 2),
    }


def add_arrow(ax, start, end, label=None, offset=(0, 0), color="#263238", rad=0.0, lw=2.0):
    arrow = FancyArrowPatch(
        start,
        end,
        arrowstyle="-|>",
        mutation_scale=18,
        linewidth=lw,
        color=color,
        connectionstyle=f"arc3,rad={rad}",
        shrinkA=8,
        shrinkB=8,
        zorder=4,
    )
    ax.add_patch(arrow)

    if label:
        mx = (start[0] + end[0]) / 2 + offset[0]
        my = (start[1] + end[1]) / 2 + offset[1]
        ax.text(
            mx,
            my,
            label,
            ha="center",
            va="center",
            fontsize=11,
            color=color,
            bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="none", alpha=0.9),
            zorder=5,
        )


def add_sum(ax, center, radius=0.18, label="+ / -"):
    circle = Circle(center, radius, edgecolor="#263238", facecolor="#ffffff", linewidth=2.0, zorder=3)
    ax.add_patch(circle)
    ax.text(center[0], center[1], label, ha="center", va="center", fontsize=12, fontweight="bold", zorder=4)
    return {
        "left": (center[0] - radius, center[1]),
        "right": (center[0] + radius, center[1]),
        "top": (center[0], center[1] + radius),
        "bottom": (center[0], center[1] - radius),
        "center": center,
    }


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: python kalman_block_diagram.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")
    fig.patch.set_facecolor("#f7f9fb")
    ax.set_facecolor("#f7f9fb")

    prediction = add_block(
        ax,
        (1.0, 5.45),
        2.65,
        1.45,
        "Prediction",
        ["x_hat(k|k-1) = F x_hat(k-1|k-1) + B u(k)", "P(k|k-1) = F P(k-1|k-1) F^T + Q"],
        "#d7ecff",
    )

    measurement = add_block(
        ax,
        (1.0, 2.0),
        2.65,
        1.25,
        "Measurement",
        ["z(k)", "sensor observation"],
        "#fff4c7",
    )

    residual_sum = add_sum(ax, (4.55, 2.65), label="+ / -")

    residual = add_block(
        ax,
        (5.25, 2.0),
        2.05,
        1.25,
        "Residual",
        ["y(k) = z(k) - H x_hat(k|k-1)", "innovation"],
        "#ffe0d6",
    )

    gain = add_block(
        ax,
        (5.25, 4.0),
        2.05,
        1.05,
        "Kalman Gain",
        ["K(k) = P H^T S^-1"],
        "#e8ddff",
    )

    update = add_block(
        ax,
        (8.05, 3.35),
        2.65,
        1.55,
        "Update",
        ["x_hat(k|k) = x_hat(k|k-1) + K(k)y(k)", "P(k|k) = (I - K(k)H)P(k|k-1)"],
        "#d8f5df",
    )

    estimate = add_block(
        ax,
        (8.05, 6.0),
        2.65,
        1.25,
        "State estimate",
        ["x_hat(k|k)", "P(k|k)"],
        "#e7edf2",
    )

    ax.text(0.6, 6.25, "u(k)", ha="center", va="center", fontsize=12, color="#263238")
    add_arrow(ax, (0.75, 6.25), prediction["left"], "control input", offset=(0, 0.25))

    add_arrow(ax, prediction["right"], (7.95, 4.15), "predicted state and covariance", offset=(0, 0.55))
    add_arrow(ax, prediction["right"], residual_sum["top"], "H x_hat(k|k-1)", offset=(-0.3, 0.25), rad=-0.25)

    add_arrow(ax, measurement["right"], residual_sum["left"], "measurement z(k)", offset=(-0.05, 0.22))
    add_arrow(ax, residual_sum["right"], residual["left"])
    add_arrow(ax, residual["right"], update["left"], "residual y(k)", offset=(0, -0.35))
    add_arrow(ax, gain["right"], update["left"], "gain K(k)", offset=(0, 0.35))

    add_arrow(ax, update["right"], estimate["right"], "corrected estimate", offset=(0.45, 0.0), rad=0.28)
    add_arrow(ax, estimate["left"], prediction["top"], "feedback to next prediction", offset=(0.0, 0.45), rad=0.18)
    add_arrow(ax, update["top"], gain["right"], "updated uncertainty", offset=(0.45, 0.2), rad=-0.25)

    ax.text(
        6.0,
        8.15,
        "Kalman Filter Control Block Diagram",
        ha="center",
        va="center",
        fontsize=20,
        fontweight="bold",
        color="#102027",
    )

    ax.text(
        6.0,
        7.75,
        "prediction -> residual -> gain-weighted correction -> state feedback",
        ha="center",
        va="center",
        fontsize=12,
        color="#455a64",
    )

    plt.savefig(output_path, dpi=100, bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)


if __name__ == "__main__":
    main()
