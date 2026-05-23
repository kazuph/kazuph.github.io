import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# コマンドライン引数から保存先パスを取得
if len(sys.argv) < 2:
    print("Usage: python script.py <output_image_path>")
    sys.exit(1)

output_path = sys.argv[1]

# 日本語フォントの設定 (環境に合わせて自動フォールバック)
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = [
    'Hiragino Sans', 'Hiragino Kaku Gothic Pro', 'AppleGothic', 
    'IPAexGothic', 'Noto Sans CJK JP', 'DejaVu Sans', 'sans-serif'
]

# フィギュアと座標系の設定 (1200x900 ピクセル相当)
fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor('#f7f9fa')
ax.set_facecolor('#f7f9fa')

ax.set_xlim(0, 18)
ax.set_ylim(0, 12)
ax.set_aspect('equal')
ax.axis('off')

# タイトル
ax.text(9.0, 11.5, '油圧ピストン断面構造図 (Double-Acting Hydraulic Cylinder)', 
        fontsize=16, fontweight='bold', color='#1a237e', ha='center', va='center')

# ---------------------------------------------------------
# 1. 流体 (作動油) の描画 (背面レイヤー)
# ---------------------------------------------------------
# 左側圧力室 (高圧側) - 赤色半透明
rect_left_fluid = patches.Rectangle((3.0, 4.0), 2.4, 4.0, linewidth=0, facecolor='#ff8a80', alpha=0.35, zorder=1)
rect_left_port_fluid = patches.Rectangle((4.0, 8.0), 0.8, 1.2, linewidth=0, facecolor='#ff8a80', alpha=0.35, zorder=1)
ax.add_patch(rect_left_fluid)
ax.add_patch(rect_left_port_fluid)

# 右側圧力室 (低圧側) - 青色半透明
rect_right_fluid = patches.Rectangle((6.6, 4.0), 4.4, 4.0, linewidth=0, facecolor='#80d8ff', alpha=0.35, zorder=1)
rect_right_port_fluid = patches.Rectangle((9.2, 8.0), 0.8, 1.2, linewidth=0, facecolor='#80d8ff', alpha=0.35, zorder=1)
ax.add_patch(rect_right_fluid)
ax.add_patch(rect_right_port_fluid)

# ---------------------------------------------------------
# 2. シリンダー金属構造 (中間レイヤー)
# ---------------------------------------------------------
metal_color = '#455a64'
metal_edge = '#1c313a'

# ヘッドカバー (左側端面キャップ)
left_cover = patches.Rectangle((2.4, 3.4), 0.6, 5.2, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
ax.add_patch(left_cover)

# シリンダーチューブ (上部壁面、ポート穴で分割)
top_wall_1 = patches.Rectangle((3.0, 8.0), 1.0, 0.6, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
top_wall_2 = patches.Rectangle((4.8, 8.0), 4.4, 0.6, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
top_wall_3 = patches.Rectangle((10.0, 8.0), 1.0, 0.6, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
ax.add_patch(top_wall_1)
ax.add_patch(top_wall_2)
ax.add_patch(top_wall_3)

# シリンダーチューブ (下部壁面)
bottom_wall = patches.Rectangle((3.0, 3.4), 8.0, 0.6, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
ax.add_patch(bottom_wall)

# ロッドカバー (右側端面キャップ、ロッド用の隙間あり)
right_cover_top = patches.Rectangle((11.0, 6.6), 0.6, 2.0, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
right_cover_bottom = patches.Rectangle((11.0, 3.4), 0.6, 2.0, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
ax.add_patch(right_cover_top)
ax.add_patch(right_cover_bottom)

# 配管接続用ポート部
lp_lw = patches.Rectangle((3.7, 8.6), 0.3, 1.2, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
lp_rw = patches.Rectangle((4.8, 8.6), 0.3, 1.2, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
rp_lw = patches.Rectangle((8.9, 8.6), 0.3, 1.2, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
rp_rw = patches.Rectangle((10.0, 8.6), 0.3, 1.2, edgecolor=metal_edge, facecolor=metal_color, linewidth=1.5, zorder=2)
ax.add_patch(lp_lw)
ax.add_patch(lp_rw)
ax.add_patch(rp_lw)
ax.add_patch(rp_rw)

# ---------------------------------------------------------
# 3. ピストンおよびピストンロッド (前面レイヤー)
# ---------------------------------------------------------
piston_color = '#5c6bc0'
piston_edge = '#283593'

# ピストン本体
piston_body = patches.Rectangle((5.4, 4.0), 1.2, 4.0, edgecolor=piston_edge, facecolor=piston_color, linewidth=2, zorder=4)
ax.add_patch(piston_body)

# 機械加工表現用のスリット線
ax.plot([5.4, 6.6], [6.0, 6.0], color=piston_edge, linewidth=1, alpha=0.5, zorder=5)
ax.plot([5.4, 6.6], [5.0, 5.0], color=piston_edge, linewidth=1, alpha=0.5, zorder=5)
ax.plot([5.4, 6.6], [7.0, 7.0], color=piston_edge, linewidth=1, alpha=0.5, zorder=5)

# ピストンシール (往復動用ゴムパッキン)
piston_seal_top = patches.Rectangle((5.8, 7.7), 0.4, 0.3, facecolor='#212121', edgecolor='#000000', linewidth=1, zorder=5)
piston_seal_bottom = patches.Rectangle((5.8, 4.0), 0.4, 0.3, facecolor='#212121', edgecolor='#000000', linewidth=1, zorder=5)
ax.add_patch(piston_seal_top)
ax.add_patch(piston_seal_bottom)

# ピストンロッド
rod_body = patches.Rectangle((6.6, 5.4), 7.6, 1.2, edgecolor='#37474f', facecolor='#eceff1', linewidth=2, zorder=3)
ax.add_patch(rod_body)

# 金属鏡面反射ハイライト (3D感の向上)
ax.plot([6.6, 14.2], [6.3, 6.3], color='#ffffff', linewidth=3, alpha=0.8, zorder=4)
ax.plot([6.6, 14.2], [5.7, 5.7], color='#b0bec5', linewidth=2, alpha=0.5, zorder=4)

# ロッド先端クレビス (接続用アイ型ジョイント)
linkage_base = patches.Rectangle((14.2, 5.2), 0.3, 1.6, edgecolor='#37474f', facecolor='#cfd8dc', linewidth=1.5, zorder=3)
linkage_eye = patches.Circle((15.1, 6.0), 0.8, edgecolor='#37474f', facecolor='#b0bec5', linewidth=1.5, zorder=3)
linkage_hole = patches.Circle((15.1, 6.0), 0.35, edgecolor='#37474f', facecolor='#f7f9fa', linewidth=1.5, zorder=4)
ax.add_patch(linkage_base)
ax.add_patch(linkage_eye)
ax.add_patch(linkage_hole)

# ---------------------------------------------------------
# 4. ロッドパッキンおよびガイドブッシュ (詳細部品)
# ---------------------------------------------------------
# ロッドシール (漏れ防止パッキン)
rod_seal_top = patches.Rectangle((11.35, 6.6), 0.2, 0.2, facecolor='#212121', edgecolor='#000000', linewidth=1, zorder=5)
rod_seal_bottom = patches.Rectangle((11.35, 5.2), 0.2, 0.2, facecolor='#212121', edgecolor='#000000', linewidth=1, zorder=5)
ax.add_patch(rod_seal_top)
ax.add_patch(rod_seal_bottom)

# ガイドブッシュ (軸受メタル)
guide_bushing_top = patches.Rectangle((11.05, 6.6), 0.25, 0.3, facecolor='#ffb74d', edgecolor='#e65100', linewidth=1, zorder=5)
guide_bushing_bottom = patches.Rectangle((11.05, 5.1), 0.25, 0.3, facecolor='#ffb74d', edgecolor='#e65100', linewidth=1, zorder=5)
ax.add_patch(guide_bushing_top)
ax.add_patch(guide_bushing_bottom)

# ---------------------------------------------------------
# 5. 流体の方向・動作指示矢印
# ---------------------------------------------------------
# 流入側ポート矢印
ax.annotate('', xy=(4.4, 8.2), xytext=(4.4, 10.3),
            arrowprops=dict(facecolor='#e53935', edgecolor='#b71c1c', width=6, headwidth=16, headlength=12, shrink=0.05))
# 流出側ポート矢印
ax.annotate('', xy=(9.6, 10.3), xytext=(9.6, 8.2),
            arrowprops=dict(facecolor='#1e88e5', edgecolor='#0d47a1', width=6, headwidth=16, headlength=12, shrink=0.05))
# ピストン移動方向矢印
ax.annotate('', xy=(17.0, 6.0), xytext=(15.8, 6.0),
            arrowprops=dict(facecolor='#4caf50', edgecolor='#1b5e20', width=7, headwidth=16, headlength=12))

# 矢印周囲のテキスト
ax.text(3.6, 9.8, '高圧作動油\n(流入)', color='#c62828', fontsize=9.5, fontweight='bold', ha='right', va='center')
ax.text(10.4, 9.8, '低圧作動油\n(排出)', color='#1565c0', fontsize=9.5, fontweight='bold', ha='left', va='center')
ax.text(16.4, 6.8, 'ピストン移動方向\n(前進)', color='#2e7d32', fontsize=9.5, fontweight='bold', ha='center', va='center')

# ---------------------------------------------------------
# 6. 主要部品ラベルと指示線の追加
# ---------------------------------------------------------
def draw_label(ax, target, text_pos, text, ha='center', va='center'):
    # 指示端ドット
    ax.plot(target[0], target[1], 'o', color='#37474f', markersize=5, zorder=15)
    # 引出線 (極細グレー)
    ax.plot([target[0], text_pos[0]], [target[1], text_pos[1]], color='#78909c', linewidth=1.2, linestyle='-', zorder=14)
    # ラベルテキスト (白地フチ付きで視認性を最大化)
    ax.text(text_pos[0], text_pos[1], text, fontsize=9.5, fontweight='bold', color='#263238',
            ha=ha, va=va,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#ffffff', edgecolor='#cfd8dc', alpha=0.95, linewidth=1),
            zorder=16)

# 各部位ラベルマッピング
draw_label(ax, (7.0, 8.3), (7.0, 10.8), 'シリンダーチューブ\n(Cylinder Tube)', ha='center', va='center')
draw_label(ax, (6.0, 4.8), (6.0, 1.2), 'ピストン\n(Piston)', ha='center', va='center')
draw_label(ax, (12.0, 6.0), (12.0, 4.2), 'ピストンロッド\n(Piston Rod)', ha='center', va='center')
draw_label(ax, (3.8, 6.5), (1.2, 6.5), 'ヘッド側圧力室\n(左圧力室 / 高圧)\nHead-end Chamber', ha='right', va='center')
draw_label(ax, (8.5, 4.8), (8.5, 2.2), 'ロッド側圧力室\n(右圧力室 / 低圧)\nRod-end Chamber', ha='center', va='center')
draw_label(ax, (4.4, 9.4), (2.8, 11.2), '供給ポート\n(Inlet Port)', ha='right', va='center')
draw_label(ax, (9.6, 9.4), (11.2, 11.2), '排出ポート\n(Outlet Port)', ha='left', va='center')
draw_label(ax, (6.0, 7.9), (4.2, 2.2), 'ピストンシール\n(Piston Seal)', ha='center', va='center')
draw_label(ax, (11.3, 6.7), (13.8, 8.5), 'ロッドシール\n(Rod Seal)', ha='left', va='center')
draw_label(ax, (11.3, 5.0), (13.8, 2.2), 'ガイドブッシュ\n(Guide Bushing)', ha='left', va='center')

# ---------------------------------------------------------
# 7. 画像の保存処理 (厳密に1200x900pxを保証)
# ---------------------------------------------------------
fig.set_size_inches(12, 9)
plt.savefig(output_path, dpi=100, facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
