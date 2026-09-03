import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch

def draw_kalman_filter(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Title & Subtitle
    ax.text(600, 850, 'Discrete Kalman Filter Block Diagram', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 815, 'Recursive State Estimation: Predict (Time Update) & Correct (Measurement Update)',
            color='#94a3b8', fontsize=13, ha='center', va='center')

    # 1. PREDICT REGION (Left)
    ax.add_patch(FancyBboxPatch((60, 240), 440, 520, boxstyle='round,pad=0.02,rounding_size=16',
                                facecolor='#1e293b', edgecolor='#38bdf8', lw=2, ls='--', alpha=0.7))
    ax.text(200, 770, '1. PREDICT (Time Update)', color='#ffffff', fontsize=14, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#0369a1', edgecolor='#38bdf8', lw=1.5))

    # Predictor State Block
    ax.add_patch(FancyBboxPatch((100, 570), 360, 150, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#172554', edgecolor='#38bdf8', lw=2))
    ax.text(280, 685, 'Project State Ahead', color='#7dd3fc', fontsize=14, fontweight='bold', ha='center')
    ax.text(280, 625, r'$\hat{x}_k^- = A \hat{x}_{k-1} + B u_k$', color='#f8fafc', fontsize=16, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#0f172a', edgecolor='#334155', lw=1.2))

    # Predictor Covariance Block
    ax.add_patch(FancyBboxPatch((100, 360), 360, 150, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#172554', edgecolor='#38bdf8', lw=2))
    ax.text(280, 475, 'Project Error Covariance', color='#7dd3fc', fontsize=14, fontweight='bold', ha='center')
    ax.text(280, 415, r'$P_k^- = A P_{k-1} A^T + Q$', color='#f8fafc', fontsize=16, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#0f172a', edgecolor='#334155', lw=1.2))

    # Process Noise Info
    ax.text(280, 280, r'Process Noise Covariance: $Q = E[w_k w_k^T]$', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#0f172a', edgecolor='#475569', lw=1.2))

    # Control input arrow
    ax.annotate('', xy=(100, 625), xytext=(20, 625),
                arrowprops=dict(arrowstyle='-|>', color='#c084fc', lw=2.5, mutation_scale=15))
    ax.text(45, 655, 'Input $u_k$', color='#e9d5ff', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#3b0764', edgecolor='#c084fc', lw=1))

    # 2. UPDATE REGION (Right)
    ax.add_patch(FancyBboxPatch((680, 240), 460, 520, boxstyle='round,pad=0.02,rounding_size=16',
                                facecolor='#1e293b', edgecolor='#4ade80', lw=2, ls='--', alpha=0.7))
    ax.text(820, 770, '2. UPDATE (Measurement Update)', color='#ffffff', fontsize=14, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#047857', edgecolor='#4ade80', lw=1.5))

    # Kalman Gain Block
    ax.add_patch(FancyBboxPatch((720, 610), 380, 120, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#451a03', edgecolor='#fbbf24', lw=2))
    ax.text(910, 700, 'Compute Kalman Gain', color='#fde047', fontsize=14, fontweight='bold', ha='center')
    ax.text(910, 650, r'$K_k = P_k^- H^T (H P_k^- H^T + R)^{-1}$', color='#f8fafc', fontsize=14, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#0f172a', edgecolor='#334155', lw=1.2))

    # State Update Block
    ax.add_patch(FancyBboxPatch((720, 430), 380, 150, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#022c22', edgecolor='#4ade80', lw=2))
    ax.text(910, 545, 'Update State Estimate (with Residual)', color='#86efac', fontsize=13, fontweight='bold', ha='center')
    ax.text(910, 495, r'$\hat{x}_k = \hat{x}_k^- + K_k (z_k - H \hat{x}_k^-)$', color='#f8fafc', fontsize=15, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#0f172a', edgecolor='#334155', lw=1.2))
    ax.text(910, 450, r'Residual: $y_k = z_k - H \hat{x}_k^-$', color='#fbbf24', fontsize=12, fontweight='bold', ha='center')

    # Covariance Update Block
    ax.add_patch(FancyBboxPatch((720, 270), 380, 130, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#022c22', edgecolor='#4ade80', lw=2))
    ax.text(910, 365, 'Update Error Covariance', color='#86efac', fontsize=13, fontweight='bold', ha='center')
    ax.text(910, 315, r'$P_k = (I - K_k H) P_k^-$', color='#f8fafc', fontsize=15, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#0f172a', edgecolor='#334155', lw=1.2))

    # Measurement z_k input
    ax.annotate('', xy=(910, 580), xytext=(910, 810),
                arrowprops=dict(arrowstyle='-|>', color='#f43f5e', lw=2.5, ls='--', mutation_scale=15))
    ax.text(910, 815, r'Measurement $z_k$', color='#fecdd3', fontsize=13, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#831843', edgecolor='#f43f5e', lw=1.5))

    # 3. INTER-BLOCK FORWARD FLOWS
    # Prior state flow
    ax.annotate('', xy=(720, 625), xytext=(460, 625),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=3, mutation_scale=16))
    ax.text(590, 645, r'$\hat{x}_k^-$ (prior)', color='#38bdf8', fontsize=13, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0c4a6e', edgecolor='#38bdf8', lw=1.2))

    # Prior Covariance flow
    ax.annotate('', xy=(720, 670), xytext=(560, 670),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.plot([460, 560, 560], [435, 435, 670], color='#fbbf24', lw=2.5)
    ax.plot([560, 720], [335, 335], color='#fbbf24', lw=2.5)
    ax.annotate('', xy=(720, 335), xytext=(560, 335),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.text(560, 510, r'$P_k^-$', color='#fbbf24', fontsize=13, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#713f12', edgecolor='#fbbf24', lw=1.2))

    # 4. OUTPUT & FEEDBACK LOOP
    ax.annotate('', xy=(1180, 495), xytext=(1100, 495),
                arrowprops=dict(arrowstyle='-|>', color='#4ade80', lw=3.5, mutation_scale=18))
    ax.text(1140, 530, r'$\hat{x}_k, P_k$', color='#86efac', fontsize=14, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#064e3b', edgecolor='#4ade80', lw=1.2))

    # Feedback path
    fb_x = [1140, 1140, 300, 300]
    fb_y = [495, 170, 170, 240]
    ax.plot(fb_x, fb_y, color='#4ade80', ls='--', lw=2.5)
    ax.annotate('', xy=(300, 240), xytext=(300, 180),
                arrowprops=dict(arrowstyle='-|>', color='#4ade80', lw=2.5, mutation_scale=15))

    # Delay Block
    ax.add_patch(FancyBboxPatch((530, 135), 140, 70, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#1e293b', edgecolor='#4ade80', lw=2))
    ax.text(600, 180, r'Delay: $z^{-1}$', color='#f8fafc', fontsize=14, fontweight='bold', ha='center')
    ax.text(600, 155, r'$(k \rightarrow k+1)$', color='#94a3b8', fontsize=11, ha='center')
    ax.text(420, 190, r'$\hat{x}_{k-1}, P_{k-1}$', color='#86efac', fontsize=13, fontweight='bold', ha='center')

    # Summary box
    s_text = r"$\mathbf{1.\ Prediction:}$ Uses physics model to project ahead. $\mathbf{2.\ Correction:}$ Adjusts estimate weighted by optimal gain $K_k$."
    ax.text(600, 60, s_text, color='#f8fafc', fontsize=12, ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.6', facecolor='#1e293b', edgecolor='#334155', lw=1.5))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_kalman_filter(sys.argv[1])
    else:
        draw_kalman_filter('kalman-filter.png')
