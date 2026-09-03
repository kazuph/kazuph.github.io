import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

BG = "#FBFBF9"
PRED, PRED_E = "#DCEBFA", "#2A6F97"
UPD, UPD_E = "#E5F3E1", "#2E7D4F"
MEAS, MEAS_E = "#FDEBD3", "#C9731B"
EST, EST_E = "#EEE5F7", "#6A3FA0"
INK = "#233044"
SIG = "#3A3F47"


def block(ax, cx, cy, w, h, title, formula, fc, ec, z=5):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.12",
                                facecolor=fc, edgecolor=ec, linewidth=1.6, zorder=z))
    if title:
        ax.text(cx, cy + 0.2, title, ha="center", va="center", fontsize=10.5, fontweight="bold", color=INK, zorder=z + 1)
        ax.text(cx, cy - 0.22, formula, ha="center", va="center", fontsize=10.5, color=INK, zorder=z + 1)
    else:
        ax.text(cx, cy, formula, ha="center", va="center", fontsize=11, color=INK, zorder=z + 1)


def sumnode(ax, cx, cy, z=6):
    ax.add_patch(Circle((cx, cy), 0.27, facecolor="white", edgecolor=INK, linewidth=1.5, zorder=z))
    ax.plot([cx - 0.19, cx + 0.19], [cy - 0.19, cy + 0.19], color=INK, lw=0.8, zorder=z + 1)
    ax.plot([cx - 0.19, cx + 0.19], [cy + 0.19, cy - 0.19], color=INK, lw=0.8, zorder=z + 1)


def arrow(ax, pts, color=SIG, ls="-", z=4, lw=1.5):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=color, lw=lw, linestyle=ls, zorder=z, solid_capstyle="round")
    ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=14, color=color,
                                 linewidth=lw, linestyle=ls, zorder=z + 1, shrinkA=0, shrinkB=0))


def lab(ax, x, y, text, ha="center", va="center", size=8.5, color=INK, z=8):
    ax.text(x, y, text, ha=ha, va=va, fontsize=size, color=color, zorder=z,
            bbox=dict(facecolor=BG, edgecolor="none", pad=1.2))


def frame(ax, x0, y0, x1, y1, ec, title, tx, ty, ha="left", z=1):
    ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle="round,pad=0,rounding_size=0.2",
                                facecolor="none", edgecolor=ec, linewidth=1.2, linestyle="--", zorder=z))
    ax.text(tx, ty, title, ha=ha, va="center", fontsize=10, fontweight="bold", color=ec, zorder=z + 1)


def main() -> None:
    out_path = sys.argv[1]
    plt.rcParams["mathtext.fontset"] = "dejavusans"
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.7, 12.3)
    ax.set_ylim(-0.7, 8.2)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-0.7, -0.7), 13, 8.9, facecolor=BG, zorder=0))
    ax.text(-0.4, 7.8, "Kalman filter – predict / update loop", ha="left", va="center", fontsize=16, fontweight="bold", color=INK)

    # blocks
    block(ax, 2.4, 4.9, 3.6, 1.2, "State prediction", r"$\hat{x}^-_k = F\,\hat{x}_{k-1} + B\,u_k$", PRED, PRED_E)
    block(ax, 2.4, 3.3, 3.6, 1.2, "Covariance prediction", r"$P^-_k = F P_{k-1} F^{\mathsf{T}} + Q$", PRED, PRED_E)
    block(ax, 6.9, 7.0, 2.2, 1.05, "Measurement", r"$z_k = H x_k + v_k$", MEAS, MEAS_E)
    block(ax, 6.6, 4.9, 1.6, 0.8, "", r"$H\,\hat{x}^-_k$", PRED, PRED_E)
    block(ax, 6.6, 2.3, 4.2, 1.2, "Kalman gain", r"$K_k = P^-_k H^{\mathsf{T}}(H P^-_k H^{\mathsf{T}} + R)^{-1}$", UPD, UPD_E)
    block(ax, 6.6, 0.5, 3.4, 1.1, "Covariance update", r"$P_k = (I - K_k H)\,P^-_k$", UPD, UPD_E)
    block(ax, 10.2, 2.3, 2.4, 1.2, "State estimate", r"$\hat{x}_k,\; P_k$", EST, EST_E)
    block(ax, 4.2, 6.6, 3.0, 0.75, "", r"$z^{-1}$ (one step delay)", EST, EST_E)
    # gain triangle
    ax.add_patch(Polygon([(8.05, 4.75), (8.05, 3.65), (9.15, 4.2)], closed=True, facecolor=UPD, edgecolor=UPD_E, linewidth=1.6, zorder=5))
    ax.text(8.45, 4.2, r"$K_k$", ha="center", va="center", fontsize=11, color=INK, zorder=6)
    sumnode(ax, 8.6, 5.9)
    sumnode(ax, 10.2, 4.9)

    # signal flow
    arrow(ax, [(-0.2, 4.9), (0.6, 4.9)]); lab(ax, 0.15, 5.15, r"$u_k$ control input")
    arrow(ax, [(4.2, 4.9), (5.8, 4.9)]); lab(ax, 5.0, 5.15, r"$\hat{x}^-_k$ (a priori)")
    arrow(ax, [(7.4, 4.9), (8.05, 4.9), (8.05, 5.9), (8.33, 5.9)]); lab(ax, 8.15, 5.65, "−", ha="right")
    arrow(ax, [(8.0, 7.0), (8.6, 7.0), (8.6, 6.17)]); lab(ax, 8.3, 7.25, r"$z_k$"); lab(ax, 8.85, 6.5, "+", ha="left")
    arrow(ax, [(8.6, 5.63), (8.6, 4.75)]); lab(ax, 8.85, 5.2, r"residual $y_k = z_k - H\hat{x}^-_k$", ha="left")
    arrow(ax, [(9.15, 4.2), (9.7, 4.2), (9.7, 5.6), (10.2, 5.6), (10.2, 5.17)]); lab(ax, 9.95, 5.85, r"$K_k y_k$")
    arrow(ax, [(4.2, 4.55), (4.55, 4.55), (4.55, 4.1), (9.6, 4.1), (9.6, 4.9), (9.93, 4.9)]); lab(ax, 9.75, 5.15, "+", ha="right")
    arrow(ax, [(10.2, 4.63), (10.2, 2.9)]); lab(ax, 10.45, 3.75, r"$\hat{x}_k = \hat{x}^-_k + K_k y_k$", ha="left"); lab(ax, 10.45, 3.45, "(a posteriori)", ha="left")
    arrow(ax, [(11.4, 2.3), (12.1, 2.3)]); lab(ax, 11.75, 2.55, "estimate")
    arrow(ax, [(4.2, 3.3), (4.5, 3.3), (4.5, 2.3), (4.5, 2.3)]); lab(ax, 4.35, 3.55, r"$P^-_k$", ha="left")
    arrow(ax, [(6.6, 1.7), (6.6, 1.05)]); lab(ax, 6.8, 1.4, r"$K_k$", ha="left")
    arrow(ax, [(8.7, 2.3), (8.6, 2.3), (8.6, 3.65)]); lab(ax, 8.85, 3.2, r"$K_k$", ha="left")
    arrow(ax, [(8.3, 0.5), (10.2, 0.5), (10.2, 1.7)]); lab(ax, 9.25, 0.75, r"$P_k$")

    # feedback (dashed purple)
    arrow(ax, [(11.4, 2.9), (11.4, 6.6), (5.7, 6.6)], color=EST_E, ls="--"); lab(ax, 11.6, 5.0, r"$\hat{x}_k$", ha="left", color=EST_E)
    arrow(ax, [(2.7, 6.6), (2.4, 6.6), (2.4, 5.5)], color=EST_E, ls="--"); lab(ax, 2.2, 6.1, r"$\hat{x}_{k-1}$", ha="right", color=EST_E)
    arrow(ax, [(4.9, 0.5), (3.6, 0.5), (3.6, 2.7)], color=EST_E, ls="--"); lab(ax, 3.4, 1.6, r"$P_{k-1}$", ha="right", color=EST_E)

    # group frames
    frame(ax, 0.35, 2.45, 4.3, 5.75, PRED_E, "PREDICTION (time update)", 0.4, 5.95)
    frame(ax, 4.4, -0.35, 11.0, 6.35, UPD_E, "UPDATE (measurement update)", 4.5, -0.15, ha="left")
    frame(ax, 5.65, 6.4, 8.15, 7.65, MEAS_E, "SENSOR", 5.75, 7.45)
    frame(ax, 8.85, 1.55, 11.55, 3.05, EST_E, "OUTPUT", 8.95, 1.35)

    # legend
    arrow(ax, [(-0.4, 0.2), (0.4, 0.2)]); ax.text(0.5, 0.2, "signal flow", va="center", fontsize=8.5, color=INK)
    arrow(ax, [(-0.4, -0.25), (0.4, -0.25)], color=EST_E, ls="--"); ax.text(0.5, -0.25, "feedback to the next step (k → k+1)", va="center", fontsize=8.5, color=INK)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
