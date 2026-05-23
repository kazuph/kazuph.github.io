import sys
import numpy as np
import matplotlib.pyplot as plt

if len(sys.argv) < 2:
    sys.exit(1)

output_path = sys.argv[1]

# 描画用データの定義 (Base から Hand/Gripper まで)
joints = np.array([
    [0.0, 0.0, 0.0],      # Base (P0)
    [0.0, 0.0, 1.2],      # J1 (P1)
    [0.0, 0.0, 2.2],      # J2 (P2)
    [0.3, 0.0, 3.5],      # J3 (P3)
    [0.7, 0.0, 4.5],      # J4 (P4)
    [0.9, 0.4, 5.6],      # J5 (P5)
    [1.0, 0.8, 6.4],      # J6 (P6)
    [1.0, 1.1, 7.0],      # J7 (P7)
    [1.0, 1.3, 7.3]       # Hand / Tool (P8)
])

# 各関節の回転軸ベクトル
axes_dirs = [
    [0, 0, 1],                      # J1: Z軸回転 (Roll)
    [0, 1, 0],                      # J2: Y軸回転 (Pitch)
    joints[3] - joints[2],          # J3: リンク2->3方向回転 (Roll)
    [0, 1, 0],                      # J4: Y軸回転 (Pitch)
    joints[5] - joints[4],          # J5: リンク4->5方向回転 (Roll)
    [0, 1, 0],                      # J6: Y軸回転 (Pitch)
    joints[7] - joints[6]           # J7: リンク6->7方向回転 (Roll)
]

# フィギュアと3Dアキシスの設定 (1200x900 相当)
fig = plt.figure(figsize=(12, 9), facecolor='#111318')
ax = fig.add_subplot(111, projection='3d', facecolor='#111318')

# グリッドや軸を非表示にする
ax.set_axis_off()

# カメラアングルの設定 (立体感のある構図)
ax.view_init(elev=22, azim=-55)
ax.set_box_aspect((1, 1, 1))

# 描画範囲の設定
ax.set_xlim(-1.5, 2.0)
ax.set_ylim(-1.5, 2.0)
ax.set_zlim(0, 8.0)

# 1. ベースプレートとグラウンドグリッドの描画 (サイバー調)
# 同心円ベース
r_base = 0.7
theta_base = np.linspace(0, 2 * np.pi, 100)
ax.plot(r_base * np.cos(theta_base), r_base * np.sin(theta_base), 0, color='#393E46', linewidth=1.5)
ax.plot(0.4 * np.cos(theta_base), 0.4 * np.sin(theta_base), 0, color='#393E46', linewidth=1.0)

# グリッドライン
for val in np.linspace(-1.5, 1.5, 7):
    ax.plot([val, val], [-1.5, 1.5], [0, 0], color='#222831', linewidth=0.8, zorder=1)
    ax.plot([-1.5, 1.5], [val, val], [0, 0], color='#222831', linewidth=0.8, zorder=1)

# ベースシリンダーの簡易表現
base_z = np.linspace(0, joints[1][2], 8)
for b_z in base_z:
    ax.plot(0.22 * np.cos(theta_base), 0.22 * np.sin(theta_base), b_z, color='#393E46', linewidth=1.2, alpha=0.6)

# 2. リンクの描画 (三重線を重ねて立体感と光沢を表現)
for i in range(len(joints) - 1):
    p_start = joints[i]
    p_end = joints[i+1]
    
    # 構造体 (太いダークグレー)
    ax.plot([p_start[0], p_end[0]], [p_start[1], p_end[1]], [p_start[2], p_end[2]], 
            color='#222831', linewidth=11, solid_capstyle='round', alpha=0.85, zorder=2)
    # コアライン (シアン)
    ax.plot([p_start[0], p_end[0]], [p_start[1], p_end[1]], [p_start[2], p_end[2]], 
            color='#00ADB5', linewidth=4.5, solid_capstyle='round', zorder=3)
    # ハイライト (白に近いシアン)
    ax.plot([p_start[0], p_end[0]], [p_start[1], p_end[1]], [p_start[2], p_end[2]], 
            color='#EEEEEE', linewidth=1.2, solid_capstyle='round', alpha=0.6, zorder=4)

# 3. 手先 (Gripper) の描画
hand_pos = joints[8]
hand_dir = joints[8] - joints[7]
hand_dir = hand_dir / np.linalg.norm(hand_dir)
# 手首と直交するベクトルを計算して指を開く
v_temp = np.array([1, 0, 0]) if abs(hand_dir[0]) < 0.9 else np.array([0, 1, 0])
finger_vec = np.cross(hand_dir, v_temp)
finger_vec = finger_vec / np.linalg.norm(finger_vec)

f1_base = hand_pos + finger_vec * 0.15
f2_base = hand_pos - finger_vec * 0.15
f1_tip = f1_base + hand_dir * 0.15
f2_tip = f2_base + hand_dir * 0.15

# グリッパー本体と指の描画
ax.plot([f1_base[0], f2_base[0]], [f1_base[1], f2_base[1]], [f1_base[2], f2_base[2]], color='#00ADB5', linewidth=4, zorder=3)
ax.plot([f1_base[0], f1_tip[0]], [f1_base[1], f1_tip[1]], [f1_base[2], f1_tip[2]], color='#00ADB5', linewidth=3.5, zorder=3)
ax.plot([f2_base[0], f2_tip[0]], [f2_base[1], f2_tip[1]], [f2_base[2], f2_tip[2]], color='#00ADB5', linewidth=3.5, zorder=3)

# 4. 関節の球体描画 (J1 〜 J7)
for i in range(1, 8):
    p = joints[i]
    # 外側のネオン光彩
    ax.scatter(p[0], p[1], p[2], color='#FF2E63', s=240, edgecolors='none', alpha=0.25, zorder=5)
    # 内側のコア球
    ax.scatter(p[0], p[1], p[2], color='#FF2E63', s=85, edgecolors='#EEEEEE', linewidths=0.8, zorder=6)

# 5. 各軸の回転方向を示す矢印の描画関数と実行
def draw_rotation_arrow(ax, center, axis, radius=0.38, color='#F9D56E'):
    axis = np.array(axis, dtype=float)
    norm = np.linalg.norm(axis)
    if norm == 0:
        return
    u = axis / norm
    
    # 軸に垂直な直交基底を作成
    if abs(u[2]) < 0.9:
        v1 = np.cross(u, [0, 0, 1])
    else:
        v1 = np.cross(u, [1, 0, 0])
    v1 /= np.linalg.norm(v1)
    v2 = np.cross(u, v1)
    v2 /= np.linalg.norm(v2)
    
    # 回転矢印の円弧座標 (約240度の範囲)
    theta = np.linspace(0.15 * np.pi, 1.45 * np.pi, 60)
    arc_x = center[0] + radius * (v1[0] * np.cos(theta) + v2[0] * np.sin(theta))
    arc_y = center[1] + radius * (v1[1] * np.cos(theta) + v2[1] * np.sin(theta))
    arc_z = center[2] + radius * (v1[2] * np.cos(theta) + v2[2] * np.sin(theta))
    
    # 円弧の描画
    ax.plot(arc_x, arc_y, arc_z, color=color, linewidth=2.5, zorder=10)
    
    # 円弧先端の接線ベクトル (矢印方向)
    theta_end = theta[-1]
    tangent = -v1 * np.sin(theta_end) + v2 * np.cos(theta_end)
    tangent /= np.linalg.norm(tangent)
    
    # 接線方向に小さなコーン矢印を配置
    ax.quiver(
        arc_x[-1], arc_y[-1], arc_z[-1],
        tangent[0], tangent[1], tangent[2],
        length=0.15, color=color, arrow_length_ratio=0.45, linewidth=2, pivot='tail', zorder=11
    )

for i in range(1, 8):
    draw_rotation_arrow(ax, joints[i], axes_dirs[i-1])

# 6. 関節ラベル (J1 〜 J7) の配置
# 重なりを防ぐための最適化されたオフセット
offsets = [
    [0.35, 0.35, 0.0],    # J1
    [-0.42, 0.35, 0.1],   # J2
    [0.45, -0.25, 0.05],  # J3
    [-0.45, 0.35, 0.1],   # J4
    [0.45, 0.35, 0.05],   # J5
    [-0.45, 0.35, 0.1],   # J6
    [0.42, 0.22, 0.25]    # J7
]

for i in range(1, 8):
    p = joints[i]
    off = offsets[i-1]
    ax.text(
        p[0] + off[0], p[1] + off[1], p[2] + off[2],
        f"J{i}",
        color='#EEEEEE',
        fontsize=12,
        fontweight='bold',
        bbox=dict(facecolor='#FF2E63', alpha=0.9, edgecolor='#EEEEEE', boxstyle='round,pad=0.28', lw=0.6),
        zorder=15
    )

# 7. タイトルと情報プレートの描画
fig.text(
    0.06, 0.90, 
    "7-DOF Robot Arm Configuration", 
    color='#EEEEEE', 
    fontsize=24, 
    fontweight='bold', 
    fontfamily='sans-serif'
)
fig.text(
    0.06, 0.85, 
    "Joints J1 - J7 & Axis Rotation Directions", 
    color='#00ADB5', 
    fontsize=14, 
    fontstyle='italic',
    fontfamily='sans-serif'
)

# 凡例/詳細説明プレート
legend_text = (
    "■ Base (J0): Stationary foundation\n"
    "■ Joints (J1 - J7): 7 Degrees of Freedom\n"
    "   - Roll Axes (Rotary): J1, J3, J5, J7\n"
    "   - Pitch Axes (Bending): J2, J4, J6\n"
    "■ Yellow Arrows: Local rotational direction\n"
    "■ End-Effector: 2-Finger Tool / Gripper"
)
fig.text(
    0.06, 0.10, 
    legend_text, 
    color='#B0B5BC', 
    fontsize=10, 
    fontfamily='monospace',
    linespacing=1.6,
    bbox=dict(facecolor='#1E222B', alpha=0.85, edgecolor='#393E46', boxstyle='round,pad=0.8', lw=1.0)
)

# 画像の保存 (1200x900 相当)
plt.savefig(
    output_path, 
    dpi=100, 
    facecolor=fig.get_facecolor(), 
    edgecolor='none', 
    bbox_inches='tight'
)
plt.close(fig)
