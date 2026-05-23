import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

if len(sys.argv) < 2:
    print("Error: Please provide output file path as an argument.")
    sys.exit(1)

output_path = sys.argv[1]

# Set up matplotlib configuration for high-quality rendering
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['text.usetex'] = False

# Create figure and axis with 1200x900 equivalent dimensions (12x9 inches at 100 DPI)
fig, ax = plt.subplots(figsize=(12, 9), facecolor='#F8FAFC')
ax.set_facecolor('#F8FAFC')
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.axis('off')

# Title Block
ax.text(0.5, 8.4, "KALMAN FILTER BLOCK DIAGRAM", fontsize=16, weight='bold', color='#1E293B')
ax.text(0.5, 8.1, "State Estimation and Error Covariance Loop", fontsize=11, color='#64748B')

# --- Draw Zone Underlays ---
# 1. Prediction Zone (Blue)
pred_zone = patches.Rectangle((1.3, 2.5), 2.5, 4.9, facecolor='#F0F7FF', edgecolor='#D0E1F9', linewidth=1.5, zorder=1)
ax.add_patch(pred_zone)
ax.text(2.55, 7.2, "PREDICTION\n(Time Update)", color='#1A73E8', fontsize=11, fontweight='bold', ha='center', va='top', zorder=2)

# 2. Measurement Zone (Purple)
meas_zone = patches.Rectangle((4.1, 0.7), 3.4, 1.6, facecolor='#FAF5FF', edgecolor='#E9D5FF', linewidth=1.5, zorder=1)
ax.add_patch(meas_zone)
ax.text(5.8, 2.1, "MEASUREMENT", color='#7C3AED', fontsize=11, fontweight='bold', ha='center', va='top', zorder=2)

# 3. Update Zone (Green)
upd_zone = patches.Rectangle((4.1, 2.5), 5.5, 4.9, facecolor='#F0FDF4', edgecolor='#D1FAE5', linewidth=1.5, zorder=1)
ax.add_patch(upd_zone)
ax.text(6.85, 7.2, "UPDATE\n(Measurement Update)", color='#15803D', fontsize=11, fontweight='bold', ha='center', va='top', zorder=2)

# 4. Output Zone (Amber)
out_zone = patches.Rectangle((9.9, 2.5), 1.6, 4.9, facecolor='#FFFDF5', edgecolor='#FEF3C7', linewidth=1.5, zorder=1)
ax.add_patch(out_zone)
ax.text(10.7, 7.2, "STATE ESTIMATE", color='#B45309', fontsize=11, fontweight='bold', ha='center', va='top', zorder=2)


# --- Helper Functions for Drawing Components ---
def draw_block(ax, x, y, w, h, label, bg_color, border_color, border_width=1.5):
    # Shadow
    shadow = patches.Rectangle((x - w/2 + 0.04, y - h/2 - 0.04), w, h, facecolor='#000000', edgecolor='none', alpha=0.05, zorder=2)
    ax.add_patch(shadow)
    # Main box
    box = patches.Rectangle((x - w/2, y - h/2), w, h, facecolor=bg_color, edgecolor=border_color, linewidth=border_width, zorder=3)
    ax.add_patch(box)
    # Label
    ax.text(x, y, label, color='#1E293B', fontsize=9.5, ha='center', va='center', multialignment='center', zorder=4)


def draw_circle_node(ax, x, y, r, label, bg_color, border_color, border_width=1.5):
    # Shadow
    shadow = patches.Circle((x + 0.03, y - 0.03), r, facecolor='#000000', edgecolor='none', alpha=0.05, zorder=2)
    ax.add_patch(shadow)
    # Main circle
    circle = patches.Circle((x, y), r, facecolor=bg_color, edgecolor=border_color, linewidth=border_width, zorder=3)
    ax.add_patch(circle)
    # Label
    ax.text(x, y, label, color='#1E293B', fontsize=11, fontweight='bold', ha='center', va='center', zorder=4)


def draw_path_with_arrow(ax, points, label='', label_pos=None, color='#64748B', lw=1.5, ls='-'):
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i+1]
        if i == len(points) - 2:
            arrow = patches.FancyArrowPatch(p1, p2, arrowstyle="->,head_width=3.5,head_length=6", linestyle=ls, linewidth=lw, edgecolor=color, facecolor=color, zorder=5)
            ax.add_patch(arrow)
        else:
            line = patches.Polygon([p1, p2], closed=False, linestyle=ls, linewidth=lw, edgecolor=color, zorder=5)
            ax.add_patch(line)
    if label and label_pos:
        ax.text(label_pos[0], label_pos[1], label, color='#475569', fontsize=9, ha='center', va='center', zorder=6)


# --- Draw Core Blocks ---
# Control Input Block
draw_block(ax, 0.7, 5.0, 0.9, 0.6, "Control Input\n" + r"$u_k$", '#FFFFFF', '#64748B')

# State & Covariance Predictor
pred_text = "State & Covariance\nPredictor\n\n" + r"$\hat{x}^-_k = A \hat{x}_{k-1} + B u_k$" + "\n" + r"$P^-_k = A P_{k-1} A^T + Q$"
draw_block(ax, 2.55, 5.0, 2.1, 1.4, pred_text, '#FFFFFF', '#1A73E8', border_width=2)

# Delay Block
delay_text = "Delay\n" + r"$z^{-1}$"
draw_block(ax, 2.55, 6.6, 0.8, 0.6, delay_text, '#FFFFFF', '#64748B')

# Observation Matrix H
h_text = "Observation\nMatrix\n" + r"$H$"
draw_block(ax, 4.8, 4.0, 0.9, 0.6, h_text, '#FFFFFF', '#7C3AED')

# Measurement Input Box
meas_text = "Measurement\n" + r"$z_k = H x_k + v_k$"
draw_block(ax, 5.8, 1.5, 1.6, 0.6, meas_text, '#FFFFFF', '#7C3AED', border_width=2)

# Residual Sum Node (Diff)
draw_circle_node(ax, 5.8, 4.0, 0.22, r"$\Sigma$", '#FFFFFF', '#7C3AED')
ax.text(5.5, 4.1, "$-$", color='#E11D48', fontsize=12, fontweight='bold', ha='center', va='center', zorder=5)
ax.text(5.95, 3.65, "$+$", color='#16A34A', fontsize=12, fontweight='bold', ha='center', va='center', zorder=5)

# Kalman Gain Block
gain_text = "Kalman Gain\n\n" + r"$K_k = P^-_k H^T S_k^{-1}$" + "\n" + r"$S_k = H P^-_k H^T + R$"
draw_block(ax, 6.3, 5.9, 2.0, 1.1, gain_text, '#FFFFFF', '#15803D', border_width=2)

# State Update Sum Node
draw_circle_node(ax, 8.2, 5.0, 0.22, r"$\Sigma$", '#FFFFFF', '#15803D')
ax.text(7.9, 5.15, "$+$", color='#16A34A', fontsize=12, fontweight='bold', ha='center', va='center', zorder=5)
ax.text(8.35, 5.45, "$+$", color='#16A34A', fontsize=12, fontweight='bold', ha='center', va='center', zorder=5)

# Covariance Update Block
cov_text = "Covariance Update\n" + r"$P_k = (I - K_k H) P^-_k$"
draw_block(ax, 8.4, 6.7, 1.8, 0.7, cov_text, '#FFFFFF', '#15803D')

# State Estimate Box
est_text = "Posterior State\n\n" + r"$\hat{x}_k$" + "\n" + r"$P_k$"
draw_block(ax, 10.7, 5.0, 1.2, 0.8, est_text, '#FFFFFF', '#B45309', border_width=2)


# --- Draw Signal Paths & Arrows ---
# 1. Control Input -> Predictor
draw_path_with_arrow(ax, [(1.15, 5.0), (1.5, 5.0)], color='#64748B')

# 2. Predictor Output -> State Correction Node
draw_path_with_arrow(ax, [(3.6, 5.0), (7.98, 5.0)], label=r"$\hat{x}^-_k$ (Prior State)", label_pos=(4.0, 5.25), color='#1A73E8')

# 3. Predictor Output -> Observation Matrix H
draw_path_with_arrow(ax, [(3.8, 5.0), (3.8, 4.0), (4.35, 4.0)], color='#1A73E8')

# 4. Observation H -> Residual Node
draw_path_with_arrow(ax, [(5.25, 4.0), (5.58, 4.0)], color='#7C3AED')

# 5. Measurement z_k -> Residual Node
draw_path_with_arrow(ax, [(5.8, 1.8), (5.8, 3.78)], label=r"$z_k$", label_pos=(6.05, 2.7), color='#7C3AED')

# 6. Residual Node -> Kalman Gain Block
draw_path_with_arrow(ax, [(5.8, 4.22), (5.8, 5.35)], label=r"$\tilde{y}_k$ (Residual)", label_pos=(5.05, 4.75), color='#15803D')

# 7. Kalman Gain Block -> State Correction Node
draw_path_with_arrow(ax, [(7.3, 5.9), (8.2, 5.9), (8.2, 5.22)], label=r"$K_k \tilde{y}_k$ (Correction)", label_pos=(7.75, 6.1), color='#15803D')

# 8. State Correction Node -> State Estimate Output
draw_path_with_arrow(ax, [(8.42, 5.0), (10.1, 5.0)], color='#15803D')

# 9. Prior Covariance -> Covariance Update Block (Dashed)
draw_path_with_arrow(ax, [(3.4, 5.7), (3.4, 7.25), (8.4, 7.25), (8.4, 7.05)], label=r"$P^-_k$ (Prior Covariance Flow)", label_pos=(5.2, 7.45), color='#94A3B8', ls='--')

# 10. Kalman Gain -> Covariance Update Block (Dashed)
draw_path_with_arrow(ax, [(6.3, 6.45), (6.3, 6.7), (7.5, 6.7)], color='#94A3B8', ls='--')

# 11. Covariance Update -> State Estimate Box (Dashed)
draw_path_with_arrow(ax, [(9.3, 6.7), (10.7, 6.7), (10.7, 5.4)], color='#94A3B8', ls='--')

# 12. State Feedback Loop (Posterior State & Covariance)
draw_path_with_arrow(ax, [(11.3, 5.0), (11.6, 5.0), (11.6, 7.8), (2.55, 7.8), (2.55, 6.9)], label=r"$\hat{x}_{k-1}, P_{k-1}$ (Feedback Loop)", label_pos=(7.0, 8.0), color='#475569')

# 13. Delay -> Predictor
draw_path_with_arrow(ax, [(2.55, 6.3), (2.55, 5.7)], color='#475569')

# Save high-resolution, perfectly cropped visualization
plt.savefig(output_path, dpi=100, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
