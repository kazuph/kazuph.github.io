import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

output_path = sys.argv[1]

fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor("#f7f7fa")
ax = fig.add_axes([0.02, 0.06, 0.96, 0.86])
ax.set_facecolor("#f7f7fa")
ax.set_xlim(-0.3, 13.3)
ax.set_ylim(-0.3, 9.6)
ax.axis("off")
ax.set_aspect("auto")


def draw_box(cx, cy, w, h, title, body, facecolor, edgecolor,
             title_size=11.5, body_size=10.5, title_dy=None):
    box = FancyBboxPatch(
        (cx - w / 2, cy - h / 2), w, h,
        boxstyle="round,pad=0.03,rounding_size=0.12",
        linewidth=2.2, edgecolor=edgecolor, facecolor=facecolor,
        zorder=3,
    )
    ax.add_patch(box)
    if title_dy is None:
        title_dy = h * 0.28
    ax.text(cx, cy + title_dy, title, ha="center", va="center",
             fontsize=title_size, fontweight="bold", color=edgecolor, zorder=4)
    ax.text(cx, cy - h * 0.14, body, ha="center", va="center",
             fontsize=body_size, color="#1a1a1a", zorder=4, linespacing=1.9)


def draw_arrow(p1, p2, color="#374151", rad=0.0, lw=2.2, style="-|>"):
    a = FancyArrowPatch(
        p1, p2, connectionstyle=f"arc3,rad={rad}",
        arrowstyle=style, mutation_scale=18, linewidth=lw,
        color=color, zorder=2, shrinkA=2, shrinkB=2,
    )
    ax.add_patch(a)


def label(x, y, text, color="#1a1a1a", size=10.5, weight="normal"):
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color=color,
             fontweight=weight, zorder=5,
             bbox=dict(boxstyle="round,pad=0.18", fc="white", ec="none", alpha=0.88))


# ---------------------------------------------------------------------------
# Color palette (pastel fill + strong edge, one hue per stage)
# ---------------------------------------------------------------------------
C_PREDICT = ("#dbeafe", "#1d4ed8")
C_MEAS = ("#fef3c7", "#b45309")
C_INNOV = ("#dcfce7", "#15803d")
C_GAIN = ("#ede9fe", "#6d28d9")
C_UPDATE = ("#fee2e2", "#b91c1c")
C_STATE = ("#ccfbf1", "#0f766e")
C_DELAY = ("#e5e7eb", "#374151")

# ---------------------------------------------------------------------------
# Box geometry (cx, cy, w, h)
# ---------------------------------------------------------------------------
PREDICT = (1.9, 4.4, 3.0, 2.0)
MEAS = (6.0, 8.4, 2.8, 1.0)
INNOV = (6.0, 6.8, 3.2, 1.7)
GAIN = (6.0, 2.0, 3.2, 1.7)
UPDATE = (10.1, 4.4, 3.0, 2.2)
STATE = (10.1, 1.6, 3.0, 1.4)
DELAY = (1.9, 1.6, 1.8, 1.0)

draw_box(*PREDICT,
         "PREDICTION\n(Time Update)",
         r"$\hat{x}_k^- = A\hat{x}_{k-1} + Bu_k$" "\n" r"$P_k^- = AP_{k-1}A^T + Q$",
         *C_PREDICT)

draw_box(*MEAS,
         "MEASUREMENT",
         r"$z_k$  (sensor input)",
         *C_MEAS, title_size=11, body_size=10, title_dy=MEAS[3] * 0.30)

draw_box(*INNOV,
         "INNOVATION\n(RESIDUAL)",
         r"$y_k = z_k - H\hat{x}_k^-$" "\n" r"$S_k = HP_k^-H^T + R$",
         *C_INNOV)

draw_box(*GAIN,
         "KALMAN GAIN",
         r"$K_k = P_k^- H^T S_k^{-1}$",
         *C_GAIN)

draw_box(*UPDATE,
         "UPDATE\n(Measurement Update)",
         r"$\hat{x}_k = \hat{x}_k^- + K_k y_k$" "\n" r"$P_k = (I - K_kH)P_k^-$",
         *C_UPDATE)

draw_box(*STATE,
         "STATE ESTIMATE",
         r"$\hat{x}_k,\ P_k$" "\n(posterior output)",
         *C_STATE, title_size=11, body_size=10, title_dy=STATE[3] * 0.30)

draw_box(*DELAY,
         "UNIT DELAY",
         r"$z^{-1}$",
         *C_DELAY, title_size=9.5, body_size=11, title_dy=DELAY[3] * 0.30)

# ---------------------------------------------------------------------------
# External control input into PREDICTION
# ---------------------------------------------------------------------------
draw_arrow((1.9, 6.15), (1.9, 5.42), color="#4b5563", rad=0.0)
label(1.9, 6.42, r"control input  $u_k$", color="#374151", size=9.5)

# PREDICT -> INNOVATION  (predicted state feeds the residual computation)
draw_arrow((3.05, 5.15), (4.55, 6.15), color=C_PREDICT[1], rad=-0.22)
label(3.9, 5.85, r"$\hat{x}_k^-$", color=C_PREDICT[1], weight="bold")

# PREDICT -> KALMAN GAIN (predicted covariance feeds the gain computation)
draw_arrow((3.05, 3.65), (4.55, 2.65), color=C_PREDICT[1], rad=0.22)
label(3.9, 3.0, r"$P_k^-$", color=C_PREDICT[1], weight="bold")

# MEASUREMENT -> INNOVATION
draw_arrow((6.0, 7.88), (6.0, 7.68), color=C_MEAS[1], rad=0.0)
label(6.75, 7.78, r"$z_k$", color=C_MEAS[1], weight="bold")

# INNOVATION -> UPDATE
draw_arrow((7.55, 6.35), (8.65, 5.1), color=C_INNOV[1], rad=-0.22)
label(8.15, 5.95, r"$y_k$", color=C_INNOV[1], weight="bold")

# KALMAN GAIN -> UPDATE
draw_arrow((7.55, 2.45), (8.65, 3.75), color=C_GAIN[1], rad=0.22)
label(8.15, 2.85, r"$K_k$", color=C_GAIN[1], weight="bold")

# UPDATE -> STATE ESTIMATE
draw_arrow((10.1, 3.3), (10.1, 2.31), color=C_UPDATE[1], rad=0.0)
label(10.85, 2.8, r"$\hat{x}_k, P_k$", color=C_UPDATE[1], weight="bold")

# ---------------------------------------------------------------------------
# Feedback loop: STATE ESTIMATE -> (bottom rail) -> UNIT DELAY -> PREDICTION
# Routed along the very bottom so it never crosses the Kalman-gain box.
# ---------------------------------------------------------------------------
draw_arrow((10.1, 0.9), (10.1, 0.5), color=C_STATE[1], rad=0.0)
draw_arrow((10.1, 0.5), (2.75, 0.5), color=C_STATE[1], rad=0.0, style="-")
draw_arrow((2.75, 0.5), (1.9, 1.08), color=C_STATE[1], rad=0.0)
draw_arrow((1.9, 2.12), (1.9, 3.38), color=C_STATE[1], rad=0.0)
label(6.4, 0.24, r"feedback:  $\hat{x}_{k-1},\ P_{k-1}$  (previous posterior becomes next prior)",
      color=C_STATE[1], size=9.5, weight="bold")

# ---------------------------------------------------------------------------
# Titles / caption
# ---------------------------------------------------------------------------
fig.text(0.5, 0.965, "Kalman Filter — Recursive Estimation Loop",
          ha="center", va="center", fontsize=19, fontweight="bold", color="#111827")
fig.text(0.5, 0.925,
          "Prediction propagates the state forward; each new measurement is fused in via the "
          "Kalman gain during the Update step",
          ha="center", va="center", fontsize=11, color="#4b5563", style="italic")
fig.text(0.5, 0.022,
          "Blue = Prediction   Amber = Measurement   Green = Innovation   "
          "Purple = Kalman Gain   Red = Update   Teal = State Estimate   Gray = Unit Delay",
          ha="center", va="center", fontsize=9.5, color="#6b7280")

fig.savefig(output_path, facecolor=fig.get_facecolor(), dpi=100)
