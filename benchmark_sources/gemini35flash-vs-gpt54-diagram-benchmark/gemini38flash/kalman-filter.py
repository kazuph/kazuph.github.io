import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_kalman_filter(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 840, "Kalman Filter Block Diagram", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 805, "Recursive State Estimation: Time Update (Predict) & Measurement Update (Correct)",
            ha="center", va="center", fontsize=12, color="#64748b")

    # STAGE 1: PREDICTION (TIME UPDATE) - Left Outer Box
    pred_box = patches.FancyBboxPatch((80, 240), 450, 520, boxstyle="round,pad=0.02",
                                      facecolor="#f0f9ff", edgecolor="#0284c7", lw=2, ls="--", zorder=1)
    ax.add_patch(pred_box)
    ax.text(180, 735, "PREDICTION (Time Update)", ha="left", va="center",
            fontsize=13, fontweight="bold", color="#0369a1",
            bbox=dict(boxstyle="round,pad=0.3", fc="#e0f2fe", ec="#0284c7", lw=1.2), zorder=2)

    # Control Input u_k
    u_box = patches.FancyBboxPatch((110, 620), 110, 50, boxstyle="round,pad=0.02",
                                   facecolor="#f8fafc", edgecolor="#94a3b8", lw=1.5, zorder=3)
    ax.add_patch(u_box)
    ax.text(165, 652, "Control Input", ha="center", va="center", fontsize=11, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(165, 632, r"$u_k$", ha="center", va="center", fontsize=13, color="#0284c7", zorder=4)
    ax.annotate("", xy=(280, 645), xytext=(220, 645),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=5)

    # State Prediction Block
    x_pred = patches.FancyBboxPatch((280, 590), 220, 95, boxstyle="round,pad=0.02",
                                    facecolor="#bae6fd", edgecolor="#0284c7", lw=2, zorder=3)
    ax.add_patch(x_pred)
    ax.text(390, 655, "State Prediction", ha="center", va="center", fontsize=12, fontweight="bold", color="#0369a1", zorder=4)
    ax.text(390, 620, r"$\hat{x}_{k|k-1} = F_k \hat{x}_{k-1|k-1} + B_k u_k$", ha="center", va="center", fontsize=11, zorder=4)

    # Process Noise Q_k
    q_box = patches.FancyBboxPatch((110, 480), 110, 50, boxstyle="round,pad=0.02",
                                   facecolor="#f8fafc", edgecolor="#94a3b8", lw=1.5, zorder=3)
    ax.add_patch(q_box)
    ax.text(165, 512, "Process Noise", ha="center", va="center", fontsize=11, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(165, 492, r"$Q_k$", ha="center", va="center", fontsize=13, color="#0284c7", zorder=4)
    ax.annotate("", xy=(280, 505), xytext=(220, 505),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=5)

    # Covariance Prediction Block
    p_pred = patches.FancyBboxPatch((280, 455), 220, 95, boxstyle="round,pad=0.02",
                                    facecolor="#bae6fd", edgecolor="#0284c7", lw=2, zorder=3)
    ax.add_patch(p_pred)
    ax.text(390, 520, "Covariance Prediction", ha="center", va="center", fontsize=12, fontweight="bold", color="#0369a1", zorder=4)
    ax.text(390, 485, r"$P_{k|k-1} = F_k P_{k-1|k-1} F_k^T + Q_k$", ha="center", va="center", fontsize=11, zorder=4)

    # Unit Delay Feedback Store Block
    delay_box = patches.FancyBboxPatch((280, 270), 220, 75, boxstyle="round,pad=0.02",
                                       facecolor="#ffffff", edgecolor="#64748b", lw=2, zorder=3)
    ax.add_patch(delay_box)
    ax.text(390, 320, "Unit Delay (Feedback)", ha="center", va="center", fontsize=12, fontweight="bold", color="#334155", zorder=4)
    ax.text(390, 292, r"$z^{-1}$ (Stores $\hat{x}_{k|k}, P_{k|k}$)", ha="center", va="center", fontsize=11, color="#0284c7", zorder=4)
    ax.annotate("", xy=(390, 455), xytext=(390, 345),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=2.5, mutation_scale=15), zorder=5)

    # FORWARD INTER-STAGE ARROWS
    # State forward
    ax.annotate("", xy=(660, 637), xytext=(500, 637),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=3, mutation_scale=18), zorder=6)
    ax.text(580, 655, r"$\hat{x}_{k|k-1}$", ha="center", va="bottom", fontsize=13, fontweight="bold", color="#0284c7",
            bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#bae6fd", lw=1), zorder=7)

    # Covariance forward
    ax.annotate("", xy=(660, 502), xytext=(500, 502),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=3, mutation_scale=18), zorder=6)
    ax.text(580, 520, r"$P_{k|k-1}$", ha="center", va="bottom", fontsize=13, fontweight="bold", color="#0284c7",
            bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#bae6fd", lw=1), zorder=7)

    # STAGE 2: UPDATE (MEASUREMENT UPDATE) - Right Outer Box
    update_box = patches.FancyBboxPatch((650, 240), 470, 520, boxstyle="round,pad=0.02",
                                        facecolor="#f0fdf4", edgecolor="#16a34a", lw=2, ls="--", zorder=1)
    ax.add_patch(update_box)
    ax.text(750, 735, "CORRECTION (Measurement Update)", ha="left", va="center",
            fontsize=13, fontweight="bold", color="#15803d",
            bbox=dict(boxstyle="round,pad=0.3", fc="#dcfce7", ec="#16a34a", lw=1.2), zorder=2)

    # Measurement Input z_k
    z_box = patches.FancyBboxPatch((990, 615), 110, 55, boxstyle="round,pad=0.02",
                                   facecolor="#fef3c7", edgecolor="#f59e0b", lw=2, zorder=3)
    ax.add_patch(z_box)
    ax.text(1045, 650, "Measurement", ha="center", va="center", fontsize=11, fontweight="bold", color="#92400e", zorder=4)
    ax.text(1045, 630, r"$z_k$", ha="center", va="center", fontsize=13, color="#b45309", zorder=4)

    # Summing Junction for Residual
    sum_circle = patches.Circle((920, 642), 18, facecolor="white", edgecolor="#1e293b", lw=2, zorder=5)
    ax.add_patch(sum_circle)
    ax.text(920, 642, "+", ha="center", va="center", fontsize=16, fontweight="bold", zorder=6)
    ax.text(905, 622, "-", ha="center", va="center", fontsize=16, fontweight="bold", color="#dc2626", zorder=6)
    ax.annotate("", xy=(938, 642), xytext=(990, 642),
                arrowprops=dict(arrowstyle="-|>", color="#d97706", lw=2.5, mutation_scale=15), zorder=5)

    # Observation model H_k
    h_box = patches.FancyBboxPatch((720, 620), 80, 45, boxstyle="round,pad=0.02",
                                   facecolor="white", edgecolor="#64748b", lw=1.5, zorder=4)
    ax.add_patch(h_box)
    ax.text(760, 642, r"$H_k$", ha="center", va="center", fontsize=13, zorder=5)
    ax.annotate("", xy=(902, 642), xytext=(800, 642),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=5)

    # Residual Arrow & Label
    ax.annotate("", xy=(920, 570), xytext=(920, 624),
                arrowprops=dict(arrowstyle="-|>", color="#dc2626", lw=2.5, mutation_scale=15), zorder=5)
    ax.text(920, 585, r"Residual: $y_k = z_k - H_k \hat{x}_{k|k-1}$", ha="center", va="center",
            fontsize=10, fontweight="bold", color="#991b1b",
            bbox=dict(boxstyle="round,pad=0.2", fc="#fee2e2", ec="#fca5a5", lw=1), zorder=6)

    # Kalman Gain Block K_k
    gain_box = patches.FancyBboxPatch((680, 465), 250, 80, boxstyle="round,pad=0.02",
                                      facecolor="#f3e8ff", edgecolor="#9333ea", lw=2, zorder=3)
    ax.add_patch(gain_box)
    ax.text(805, 520, "Optimal Kalman Gain", ha="center", va="center", fontsize=12, fontweight="bold", color="#7e22ce", zorder=4)
    ax.text(805, 490, r"$K_k = P_{k|k-1} H_k^T (H_k P_{k|k-1} H_k^T + R_k)^{-1}$", ha="center", va="center", fontsize=10, zorder=4)

    # Measurement Noise R_k
    r_box = patches.FancyBboxPatch((990, 480), 110, 50, boxstyle="round,pad=0.02",
                                   facecolor="#f8fafc", edgecolor="#94a3b8", lw=1.5, zorder=3)
    ax.add_patch(r_box)
    ax.text(1045, 510, "Meas. Noise", ha="center", va="center", fontsize=11, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(1045, 490, r"$R_k$", ha="center", va="center", fontsize=13, color="#0284c7", zorder=4)
    ax.annotate("", xy=(930, 505), xytext=(990, 505),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=5)

    # State & Covariance Update Block (Final Correction)
    update_block = patches.FancyBboxPatch((680, 335), 410, 95, boxstyle="round,pad=0.02",
                                          facecolor="#bbf7d0", edgecolor="#16a34a", lw=2, zorder=3)
    ax.add_patch(update_block)
    ax.text(885, 405, "State & Covariance Update", ha="center", va="center", fontsize=13, fontweight="bold", color="#15803d", zorder=4)
    ax.text(885, 375, r"$\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k y_k$", ha="center", va="center", fontsize=12, zorder=4)
    ax.text(885, 350, r"$P_{k|k} = (I - K_k H_k) P_{k|k-1}$", ha="center", va="center", fontsize=12, zorder=4)

    ax.annotate("", xy=(805, 430), xytext=(805, 465),
                arrowprops=dict(arrowstyle="-|>", color="#9333ea", lw=2.5, mutation_scale=15), zorder=5)

    # FEEDBACK LOOP ARROW (Correction back to Delay Block)
    ax.plot([885, 885, 500], [335, 305, 305], color="#16a34a", lw=3, zorder=6)
    ax.annotate("", xy=(500, 305), xytext=(510, 305),
                arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=3, mutation_scale=18), zorder=6)
    ax.text(690, 290, "Feedback Loop (k -> k+1)", ha="center", va="center",
            fontsize=11, fontweight="bold", color="#16a34a",
            bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#86efac", lw=1), zorder=7)

    # OUTPUT ARROW
    ax.annotate("", xy=(1150, 382), xytext=(1090, 382),
                arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=3.5, mutation_scale=20), zorder=6)
    ax.text(1155, 382, r"$\hat{x}_{k|k}$", ha="left", va="center", fontsize=15, fontweight="bold", color="#15803d")

    # Explanatory Legend / Table at bottom
    ax.text(600, 140, "Kalman Filter Algorithm Loop", ha="center", va="center", fontsize=14, fontweight="bold", color="#1e293b")
    info_text = (
        "1. Predict next state from system model  ->  "
        "2. Calculate measurement residual  ->  "
        "3. Compute optimal Kalman gain  ->  "
        "4. Update estimate with residual"
    )
    ax.text(600, 105, info_text, ha="center", va="center", fontsize=11, color="#475569",
            bbox=dict(boxstyle="round,pad=0.5", fc="#f8fafc", ec="#cbd5e1", lw=1.2))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python kalman-filter.py <output_path>")
        sys.exit(1)
    draw_kalman_filter(sys.argv[1])
