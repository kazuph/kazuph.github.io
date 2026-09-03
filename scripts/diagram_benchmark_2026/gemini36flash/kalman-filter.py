import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_kalman_filter(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    # Color palette
    c_pred_bg = '#EBF8FF'
    c_pred_border = '#3182CE'
    c_upd_bg = '#F0FFF4'
    c_upd_border = '#38A169'
    c_meas_bg = '#FFFAF0'
    c_meas_border = '#DD6B20'
    c_line = '#2D3748'

    # Step Containers
    # Predict Step Box (Left)
    ax.add_patch(patches.Rectangle((-5.5, -2.2), 4.2, 5.8, facecolor=c_pred_bg, edgecolor=c_pred_border, linestyle='--', linewidth=1.5))
    ax.text(-5.3, 3.2, '1. Predict (Time Update)', fontsize=14, fontweight='bold', color=c_pred_border, va='top')

    # Update Step Box (Right)
    ax.add_patch(patches.Rectangle((-0.8, -2.2), 6.0, 5.8, facecolor=c_upd_bg, edgecolor=c_upd_border, linestyle='--', linewidth=1.5))
    ax.text(-0.6, 3.2, '2. Update (Measurement Update)', fontsize=14, fontweight='bold', color=c_upd_border, va='top')

    # Helper function for blocks
    def add_block(x, y, w, h, text, bg, border):
        rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle='round,pad=0.1,rounding_size=0.15',
                                      facecolor=bg, edgecolor=border, linewidth=2)
        ax.add_patch(rect)
        ax.text(x, y, text, fontsize=12, fontweight='bold', ha='center', va='center', color='#1A202C')

    # Predict Blocks
    add_block(-3.4, 2.0, 3.2, 1.2, r'State Predict' + '\n' + r'$\hat{x}_k^- = A \hat{x}_{k-1} + B u_k$', '#FFFFFF', c_pred_border)
    add_block(-3.4, -0.6, 3.2, 1.2, r'Covariance Predict' + '\n' + r'$P_k^- = A P_{k-1} A^T + Q$', '#FFFFFF', c_pred_border)

    # Summing Junction
    sum_circle = patches.Circle((0.5, 2.0), 0.35, facecolor='white', edgecolor=c_line, linewidth=2)
    ax.add_patch(sum_circle)
    ax.text(0.5, 2.0, '+', fontsize=16, fontweight='bold', ha='center', va='center')

    # Update Blocks
    add_block(2.6, 0.4, 3.2, 1.2, r'Kalman Gain' + '\n' + r'$K_k = P_k^- H^T (H P_k^- H^T + R)^{-1}$', '#FFFFFF', c_upd_border)
    add_block(3.8, 2.0, 3.2, 1.2, r'State Update' + '\n' + r'$\hat{x}_k = \hat{x}_k^- + K_k y_k$', '#FFFFFF', c_upd_border)
    add_block(2.6, -1.2, 3.2, 1.2, r'Covariance Update' + '\n' + r'$P_k = (I - K_k H) P_k^-$', '#FFFFFF', c_upd_border)

    # Measurement Block
    add_block(0.5, -1.2, 2.4, 1.2, r'Measurement' + '\n' + r'$z_k = H x_k + v_k$', '#FFFFFF', c_meas_border)

    # Arrows & Connections
    # Control input u_k
    ax.annotate('', xy=(-3.4, 2.6), xytext=(-3.4, 3.8), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))
    ax.text(-3.4, 3.9, r'Control Input $u_k$', fontsize=12, fontweight='bold', ha='center', va='bottom')

    # State Predict to Sum
    ax.annotate('', xy=(0.15, 2.0), xytext=(-1.8, 2.0), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))
    ax.text(-0.8, 2.15, r'$\hat{x}_k^-$', fontsize=12, fontweight='bold', ha='center')

    # Sum to State Update
    ax.annotate('', xy=(2.2, 2.0), xytext=(0.85, 2.0), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))

    # Measurement to Sum
    ax.annotate('', xy=(0.5, 1.65), xytext=(0.5, -0.6), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))
    ax.text(0.65, 0.4, r'Measurement $z_k$', fontsize=11, fontweight='bold', va='center')
    ax.text(0.35, 1.4, '-', fontsize=14, fontweight='bold', ha='right')

    # Residual label
    ax.text(1.3, 2.4, r'Residual $y_k$', fontsize=11, fontweight='bold', color='#C53030', ha='center')

    # Covariance Predict to Gain & Covariance Update
    ax.plot([-1.8, -0.2, -0.2], [-0.6, -0.6, 0.4], color=c_line, linewidth=2)
    ax.annotate('', xy=(1.0, 0.4), xytext=(-0.2, 0.4), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))
    ax.text(0.4, 0.55, r'$P_k^-$', fontsize=12, fontweight='bold', ha='center')

    ax.plot([-0.2, -0.2, 1.0], [-0.6, -1.8, -1.8], color=c_line, linewidth=2)
    ax.annotate('', xy=(1.0, -1.8), xytext=(-0.2, -1.8), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))

    # Gain to State & Covariance Update
    ax.annotate('', xy=(3.8, 1.4), xytext=(2.6, 1.0), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))
    ax.annotate('', xy=(2.6, -0.6), xytext=(2.6, -0.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_line))

    # Feedback Loop to Predict Step for k+1
    ax.plot([3.8, 5.3, 5.3, -5.0, -5.0, -3.4], [1.4, 1.4, -3.4, -3.4, 1.4, 1.4], color='#2B6CB0', linestyle='-', linewidth=2)
    ax.annotate('', xy=(-3.4, 1.4), xytext=(-5.0, 1.4), arrowprops=dict(arrowstyle='->', lw=2, color='#2B6CB0'))
    ax.text(0.1, -3.2, r'State Estimate Feedback $\hat{x}_k$ for Next Step $k+1$', fontsize=12, fontweight='bold', color='#2B6CB0', ha='center', va='bottom')

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'kalman-filter.png'
    draw_kalman_filter(output_file)
