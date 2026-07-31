#!/usr/bin/env python3
"""Kalman filter block diagram rendered with matplotlib only."""

import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch

BG = "#ffffff"
INK = "#1d2733"
ARROW = "#3a4654"
FEEDBACK = "#c0392b"

PRED_FACE = "#eaf3fc"
PRED_EDGE = "#2f6fa8"
PRED_BLOCK = "#cfe3f7"

UPD_FACE = "#fdf3e6"
UPD_EDGE = "#c97a1f"
UPD_BLOCK = "#fbe1c2"

MEAS_FACE = "#e3f3e8"
MEAS_EDGE = "#2e7d4f"

CTRL_FACE = "#efe7f8"
CTRL_EDGE = "#6a4c93"

OUT_FACE = "#e6e9ef"
OUT_EDGE = "#4a5568"


def panel(ax, x0, y0, x1, y1, face, edge):
    ax.add_patch(
        FancyBboxPatch(
            (x0, y0),
            x1 - x0,
            y1 - y0,
            boxstyle="round,pad=0.0,rounding_size=0.18",
            facecolor=face,
            edgecolor=edge,
            linewidth=1.8,
            linestyle=(0, (6, 3)),
            zorder=0.5,
        )
    )


def block(ax, x0, y0, x1, y1, face, edge, title, formula, tsize=10.5, fsize=10.5):
    ax.add_patch(
        FancyBboxPatch(
            (x0, y0),
            x1 - x0,
            y1 - y0,
            boxstyle="round,pad=0.0,rounding_size=0.10",
            facecolor=face,
            edgecolor=edge,
            linewidth=1.7,
            zorder=3,
        )
    )
    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0
    ax.text(cx, cy + 0.155, title, ha="center", va="center",
            fontsize=tsize, fontweight="bold", color=INK, zorder=4)
    ax.text(cx, cy - 0.165, formula, ha="center", va="center",
            fontsize=fsize, color=INK, zorder=4)


def flow(ax, pts, color=ARROW, lw=1.7, head=True):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    if head:
        if len(pts) > 2:
            ax.plot(xs[:-1], ys[:-1], color=color, lw=lw, zorder=2,
                    solid_capstyle="round", solid_joinstyle="round")
        ax.annotate(
            "",
            xy=pts[-1],
            xytext=pts[-2],
            arrowprops=dict(arrowstyle="-|>", color=color, lw=lw,
                            shrinkA=0, shrinkB=0, mutation_scale=15),
            zorder=2,
        )
    else:
        ax.plot(xs, ys, color=color, lw=lw, zorder=2,
                solid_capstyle="round", solid_joinstyle="round")


def dot(ax, x, y, color=ARROW):
    ax.plot([x], [y], marker="o", markersize=5.2, color=color, zorder=3.5)


def label(ax, x, y, text, size=9.5, ha="center", va="center", color=INK, rot=0, style="normal"):
    ax.text(x, y, text, ha=ha, va=va, fontsize=size, color=color,
            rotation=rot, style=style, zorder=4)


def build(path):
    fig = plt.figure(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")

    ax.text(6.0, 8.72, "Kalman Filter  —  Block Diagram",
            ha="center", va="center", fontsize=16.5, fontweight="bold", color=INK)

    # --- top row: exogenous inputs -------------------------------------
    block(ax, 0.55, 7.65, 2.95, 8.37, CTRL_FACE, CTRL_EDGE,
          "Control input", r"$u_k$")
    block(ax, 5.65, 7.65, 8.05, 8.37, MEAS_FACE, MEAS_EDGE,
          "Measurement", r"$z_k = H x_k + v_k$", fsize=10)

    # --- panels ---------------------------------------------------------
    panel(ax, 0.35, 4.80, 5.30, 7.55, PRED_FACE, PRED_EDGE)
    label(ax, 5.10, 7.32, "PREDICTION   (time update)", size=11.5,
          ha="right", color=PRED_EDGE)

    panel(ax, 6.35, 2.45, 11.85, 7.55, UPD_FACE, UPD_EDGE)
    label(ax, 11.65, 7.32, "UPDATE   (measurement update)", size=11.5,
          ha="right", color=UPD_EDGE)

    # --- prediction blocks ---------------------------------------------
    block(ax, 1.05, 6.35, 4.95, 7.10, PRED_BLOCK, PRED_EDGE,
          "State prediction", r"$\hat{x}^-_k = F\,\hat{x}_{k-1} + B\,u_k$")
    block(ax, 1.05, 5.20, 4.95, 5.95, PRED_BLOCK, PRED_EDGE,
          "Covariance prediction", r"$P^-_k = F\,P_{k-1}F^{T} + Q$")

    # --- update blocks ---------------------------------------------------
    block(ax, 7.83, 5.95, 11.40, 7.05, UPD_BLOCK, UPD_EDGE,
          "Kalman gain", r"$K_k = P^-_k H^{T}\,(H P^-_k H^{T} + R)^{-1}$",
          fsize=9.8)
    block(ax, 7.83, 4.15, 11.40, 5.20, UPD_BLOCK, UPD_EDGE,
          "State update", r"$\hat{x}_k = \hat{x}^-_k + K_k\,y_k$")
    block(ax, 7.83, 2.75, 11.40, 3.80, UPD_BLOCK, UPD_EDGE,
          "Covariance update", r"$P_k = (I - K_k H)\,P^-_k$")

    # --- observation matrix + summing junction ---------------------------
    ax.add_patch(
        FancyBboxPatch(
            (5.70, 6.50),
            0.60,
            0.45,
            boxstyle="round,pad=0.0,rounding_size=0.08",
            facecolor="#ffffff",
            edgecolor=ARROW,
            linewidth=1.7,
            zorder=3,
        )
    )
    label(ax, 6.00, 6.725, r"$H$", size=12)
    ax.add_patch(Circle((6.85, 6.725), 0.25, facecolor="#ffffff",
                        edgecolor=INK, linewidth=1.7, zorder=3))
    label(ax, 6.85, 6.725, r"$\Sigma$", size=13)
    label(ax, 7.04, 6.93, r"$+$", size=11)
    label(ax, 6.62, 6.52, r"$-$", size=11)
    label(ax, 6.85, 6.28, "residual", size=8.5, style="italic")

    # --- inputs into the loop --------------------------------------------
    flow(ax, [(1.75, 7.63), (1.75, 7.12)])
    label(ax, 1.88, 7.37, r"$u_k$", ha="left")

    flow(ax, [(6.85, 7.63), (6.85, 6.99)])
    label(ax, 6.98, 7.35, r"$z_k$", ha="left")

    # --- prior state: to H/sum and to the state update --------------------
    flow(ax, [(4.95, 6.725), (5.68, 6.725)])
    dot(ax, 5.45, 6.725)
    label(ax, 5.20, 6.90, r"$\hat{x}^-_k$", size=10)
    flow(ax, [(6.30, 6.725), (6.58, 6.725)])

    flow(ax, [(5.45, 6.725), (5.45, 4.90), (7.81, 4.90)])
    label(ax, 6.62, 5.05, r"$\hat{x}^-_k$  (prior)", size=9, ha="center")

    # --- prior covariance: to the gain ------------------------------------
    flow(ax, [(4.95, 5.575), (7.40, 5.575), (7.40, 6.30), (7.81, 6.30)])
    label(ax, 6.05, 5.73, r"$P^-_k$", size=10)

    # --- residual -> gain -> updates --------------------------------------
    flow(ax, [(7.10, 6.725), (7.81, 6.725)])
    label(ax, 7.46, 6.90, r"$y_k$", size=10)

    flow(ax, [(9.30, 5.95), (9.30, 5.22)])
    label(ax, 9.43, 5.58, r"$K_k$", ha="left")

    flow(ax, [(11.40, 6.50), (11.62, 6.50), (11.62, 3.275), (11.42, 3.275)])
    label(ax, 11.75, 4.90, r"$K_k$", size=9, rot=90)

    # --- outputs -----------------------------------------------------------
    block(ax, 6.55, 1.25, 11.45, 2.10, OUT_FACE, OUT_EDGE,
          "State estimate  (posterior)", r"$\hat{x}_k$   ,   $P_k$")

    flow(ax, [(7.81, 4.35), (7.00, 4.35), (7.00, 2.12)])
    label(ax, 6.88, 3.30, r"$\hat{x}_k$", size=10, ha="right")

    flow(ax, [(10.20, 2.75), (10.20, 2.12)])
    label(ax, 10.33, 2.42, r"$P_k$", size=10, ha="left")

    # --- feedback path ------------------------------------------------------
    block(ax, 2.30, 1.28, 4.20, 2.07, "#f4f5f7", OUT_EDGE,
          "Unit delay", r"$z^{-1}$")

    flow(ax, [(6.53, 1.675), (4.22, 1.675)], color=FEEDBACK)
    label(ax, 5.37, 1.84, "feedback", size=9, color=FEEDBACK, style="italic")

    flow(ax, [(2.28, 1.675), (0.72, 1.675), (0.72, 5.575), (1.03, 5.575)],
         color=FEEDBACK)
    flow(ax, [(0.72, 5.575), (0.72, 6.725), (1.03, 6.725)], color=FEEDBACK)
    dot(ax, 0.72, 5.575, color=FEEDBACK)
    label(ax, 0.55, 4.05, r"$\hat{x}_{k-1}\,,\ P_{k-1}$", size=9.5,
          color=FEEDBACK, rot=90)

    # --- notation -----------------------------------------------------------
    ax.add_patch(
        FancyBboxPatch(
            (1.05, 2.45),
            4.30,
            1.90,
            boxstyle="round,pad=0.0,rounding_size=0.10",
            facecolor="#f7f8fa",
            edgecolor="#b6bec9",
            linewidth=1.2,
            zorder=1,
        )
    )
    ax.text(1.25, 4.13, "Notation", ha="left", va="center", fontsize=9.5,
            fontweight="bold", color=INK, zorder=4)
    notes = [
        (3.83, r"$\hat{x}^-_k,\ P^-_k$ : prior (predicted) state & covariance"),
        (3.58, r"$\hat{x}_k,\ P_k$ : posterior (corrected) estimate"),
        (3.33, r"$y_k = z_k - H\,\hat{x}^-_k$ : residual (innovation)"),
        (3.08, r"$K_k$ : Kalman gain (blends prior and residual)"),
        (2.83, r"$F,\ B,\ H$ : state / control / observation matrices"),
        (2.58, r"$Q,\ R$ : process / measurement noise covariance"),
    ]
    for y, txt in notes:
        ax.text(1.25, y, txt, ha="left", va="center", fontsize=8.5,
                color=INK, zorder=4)

    fig.savefig(path, dpi=100, facecolor=BG)
    plt.close(fig)


if __name__ == "__main__":
    build(sys.argv[1])
