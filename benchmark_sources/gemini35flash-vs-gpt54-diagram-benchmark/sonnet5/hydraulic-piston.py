import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch, Circle

output_path = sys.argv[1]

# --- Font settings so Japanese labels render correctly on macOS -----------------
plt.rcParams["font.family"] = [
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic",
    "Noto Sans CJK JP",
    "IPAexGothic",
    "sans-serif",
]
plt.rcParams["axes.unicode_minus"] = False

# --- Figure / axes setup ---------------------------------------------------------
fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor("#f5f6f8")
ax = fig.add_axes([0, 0, 1, 1])
ax.set_facecolor("#f5f6f8")

X_MIN, X_MAX = -1.2, 15.8
Y_MIN, Y_MAX = -0.4, 10.4
ax.set_xlim(X_MIN, X_MAX)
ax.set_ylim(Y_MIN, Y_MAX)
ax.axis("off")

# --- Palette ----------------------------------------------------------------------
METAL_FACE = "#c7cbd1"
METAL_EDGE = "#2b2f36"
PISTON_FACE = "#9fa5ad"
ROD_FACE = "#b7bcc3"
SEAL_COLOR = "#d9822b"
PRESSURE_COLOR = "#e0685a"   # high-pressure fluid (chamber A / port A)
RETURN_COLOR = "#5b9bd5"     # return / low-pressure fluid (chamber B / port B)

LABEL_BOX = dict(boxstyle="round,pad=0.32", fc="white", ec="#444444", lw=1.0)
LEADER = dict(arrowstyle="-", color="#444444", lw=1.1, shrinkA=0, shrinkB=2)


def label(text, xy, xytext, fontsize=10.3):
    ax.annotate(
        text,
        xy=xy,
        xytext=xytext,
        ha="center",
        va="center",
        fontsize=fontsize,
        bbox=LABEL_BOX,
        arrowprops=LEADER,
        zorder=10,
    )


# --- Geometry -----------------------------------------------------------------------
Y_CENTER = 5.0
BORE_HALF = 1.6
BORE_TOP, BORE_BOTTOM = Y_CENTER + BORE_HALF, Y_CENTER - BORE_HALF        # 6.6 / 3.4
WALL_T = 0.4
BARREL_TOP, BARREL_BOTTOM = BORE_TOP + WALL_T, BORE_BOTTOM - WALL_T       # 7.0 / 3.0

BARREL_LEFT, BARREL_RIGHT = 3.0, 10.0
CAP_FLANGE_TOP, CAP_FLANGE_BOTTOM = 7.3, 2.7

BLIND_CAP_LEFT, BLIND_CAP_RIGHT = 2.3, 3.0
GLAND_LEFT, GLAND_RIGHT = 10.0, 10.7

PISTON_LEFT, PISTON_RIGHT = 6.6, 7.4
ROD_TOP, ROD_BOTTOM = Y_CENTER + 0.4, Y_CENTER - 0.4                      # 5.4 / 4.6
ROD_RIGHT = 12.6
FLANGE_LEFT, FLANGE_RIGHT = 12.6, 12.95
FLANGE_TOP, FLANGE_BOTTOM = Y_CENTER + 0.8, Y_CENTER - 0.8

PORT_A_X = (3.9, 4.6)
PORT_B_X = (8.4, 9.1)

# ======================================================================================
# 1) Barrel (outer housing, metal cross-section)
# ======================================================================================
ax.add_patch(Rectangle((BARREL_LEFT, BARREL_BOTTOM), BARREL_RIGHT - BARREL_LEFT,
                        BARREL_TOP - BARREL_BOTTOM, facecolor=METAL_FACE,
                        edgecolor=METAL_EDGE, linewidth=1.8, zorder=1))
ax.add_patch(Rectangle((BARREL_LEFT, BORE_TOP), BARREL_RIGHT - BARREL_LEFT, WALL_T,
                        facecolor=METAL_FACE, edgecolor=METAL_EDGE, linewidth=1.2,
                        hatch="////", zorder=2))
ax.add_patch(Rectangle((BARREL_LEFT, BARREL_BOTTOM), BARREL_RIGHT - BARREL_LEFT, WALL_T,
                        facecolor=METAL_FACE, edgecolor=METAL_EDGE, linewidth=1.2,
                        hatch="////", zorder=2))
# hollow bore (will be overpainted by fluid chambers / piston)
ax.add_patch(Rectangle((BARREL_LEFT, BORE_BOTTOM), BARREL_RIGHT - BARREL_LEFT,
                        BORE_TOP - BORE_BOTTOM, facecolor="#ffffff",
                        edgecolor="none", zorder=3))

# ======================================================================================
# 2) End caps
# ======================================================================================
ax.add_patch(Rectangle((BLIND_CAP_LEFT, CAP_FLANGE_BOTTOM), BLIND_CAP_RIGHT - BLIND_CAP_LEFT,
                        CAP_FLANGE_TOP - CAP_FLANGE_BOTTOM, facecolor=METAL_FACE,
                        edgecolor=METAL_EDGE, linewidth=1.8, hatch="xxxx", zorder=4))
ax.add_patch(Rectangle((GLAND_LEFT, CAP_FLANGE_BOTTOM), GLAND_RIGHT - GLAND_LEFT,
                        CAP_FLANGE_TOP - CAP_FLANGE_BOTTOM, facecolor=METAL_FACE,
                        edgecolor=METAL_EDGE, linewidth=1.8, hatch="xxxx", zorder=4))
# hole in the gland through which the rod passes
ax.add_patch(Rectangle((GLAND_LEFT, ROD_BOTTOM - 0.05), GLAND_RIGHT - GLAND_LEFT,
                        (ROD_TOP - ROD_BOTTOM) + 0.10, facecolor="#ffffff",
                        edgecolor="none", zorder=5))

# ======================================================================================
# 3) Pressure chambers (colour-coded hydraulic fluid)
# ======================================================================================
ax.add_patch(Rectangle((BARREL_LEFT, BORE_BOTTOM), PISTON_LEFT - BARREL_LEFT,
                        BORE_TOP - BORE_BOTTOM, facecolor=PRESSURE_COLOR, alpha=0.55,
                        edgecolor="none", zorder=3.5))
ax.add_patch(Rectangle((PISTON_RIGHT, BORE_BOTTOM), BARREL_RIGHT - PISTON_RIGHT,
                        BORE_TOP - BORE_BOTTOM, facecolor=RETURN_COLOR, alpha=0.45,
                        edgecolor="none", zorder=3.5))

ax.text((BARREL_LEFT + PISTON_LEFT) / 2, Y_CENTER + 0.15, "加圧室 A\nChamber A（高圧）",
        ha="center", va="center", fontsize=10, color="#7a2c1d", fontweight="bold", zorder=6)
ax.text((PISTON_RIGHT + BARREL_RIGHT) / 2, Y_CENTER + 0.15, "戻り室 B\nChamber B（低圧）",
        ha="center", va="center", fontsize=10, color="#1c3f66", fontweight="bold", zorder=6)

# flow-direction arrows inside each chamber
for yy in (Y_CENTER - 0.7, Y_CENTER - 1.0):
    ax.add_patch(FancyArrowPatch((3.5, yy), (6.3, yy), arrowstyle="-|>",
                                  mutation_scale=16, color="#8f2a19", linewidth=1.6, zorder=6))
    ax.add_patch(FancyArrowPatch((7.7, yy), (9.7, yy), arrowstyle="-|>",
                                  mutation_scale=16, color="#1c3f66", linewidth=1.6, zorder=6))

# ======================================================================================
# 4) Piston + piston seals
# ======================================================================================
ax.add_patch(Rectangle((PISTON_LEFT, BORE_BOTTOM), PISTON_RIGHT - PISTON_LEFT,
                        BORE_TOP - BORE_BOTTOM, facecolor=PISTON_FACE, edgecolor=METAL_EDGE,
                        linewidth=1.8, zorder=7))
for sx in (PISTON_LEFT + 0.08, PISTON_RIGHT - 0.20):
    ax.add_patch(Rectangle((sx, BORE_BOTTOM), 0.12, BORE_TOP - BORE_BOTTOM,
                            facecolor=SEAL_COLOR, edgecolor="#5a3410", linewidth=0.8, zorder=8))

# ======================================================================================
# 5) Piston rod, rod seal, clevis fitting
# ======================================================================================
ax.add_patch(Rectangle((PISTON_RIGHT, ROD_BOTTOM), ROD_RIGHT - PISTON_RIGHT,
                        ROD_TOP - ROD_BOTTOM, facecolor=ROD_FACE, edgecolor=METAL_EDGE,
                        linewidth=1.6, zorder=6))
ax.add_patch(Rectangle((GLAND_LEFT + 0.05, ROD_BOTTOM - 0.08), 0.14,
                        (ROD_TOP - ROD_BOTTOM) + 0.16, facecolor=SEAL_COLOR,
                        edgecolor="#5a3410", linewidth=0.8, zorder=7))
ax.add_patch(Rectangle((FLANGE_LEFT, FLANGE_BOTTOM), FLANGE_RIGHT - FLANGE_LEFT,
                        FLANGE_TOP - FLANGE_BOTTOM, facecolor=METAL_FACE,
                        edgecolor=METAL_EDGE, linewidth=1.6, zorder=6))
ax.add_patch(Circle(((FLANGE_LEFT + FLANGE_RIGHT) / 2, Y_CENTER), 0.28,
                     facecolor="#ffffff", edgecolor=METAL_EDGE, linewidth=1.6, zorder=7))

# piston / rod motion direction
ax.add_patch(FancyArrowPatch((PISTON_RIGHT + 0.3, 8.15), (11.3, 8.15), arrowstyle="-|>",
                              mutation_scale=26, color="#222222", linewidth=2.4, zorder=6))
ax.text((PISTON_RIGHT + 11.3) / 2, 8.5, "ピストン運動方向（伸長 / Extend Stroke）",
        ha="center", va="center", fontsize=10.5, fontweight="bold", color="#222222", zorder=6)

# ======================================================================================
# 6) Ports (through the barrel wall)
# ======================================================================================
for (x0, x1), color in ((PORT_A_X, PRESSURE_COLOR), (PORT_B_X, RETURN_COLOR)):
    ax.add_patch(Rectangle((x0, BORE_TOP), x1 - x0, WALL_T + 0.55, facecolor=color,
                            alpha=0.75, edgecolor=METAL_EDGE, linewidth=1.4, zorder=4))

ax.add_patch(FancyArrowPatch((sum(PORT_A_X) / 2, 8.85), (sum(PORT_A_X) / 2, 7.6),
                              arrowstyle="-|>", mutation_scale=20, color="#8f2a19",
                              linewidth=2.0, zorder=6))
ax.add_patch(FancyArrowPatch((sum(PORT_B_X) / 2, 7.6), (sum(PORT_B_X) / 2, 8.85),
                              arrowstyle="-|>", mutation_scale=20, color="#1c3f66",
                              linewidth=2.0, zorder=6))

# ======================================================================================
# 7) Centreline (reference)
# ======================================================================================
ax.plot([1.6, ROD_RIGHT + 0.4], [Y_CENTER, Y_CENTER], color="#888888",
        linewidth=1.0, linestyle=(0, (6, 4)), zorder=1)

# ======================================================================================
# 8) Labels with leader lines
# ======================================================================================
label("シリンダーチューブ\n(Cylinder Barrel)", (5.3, BARREL_TOP), (5.3, 8.55))
label("ブラインドエンドキャップ\n(Blind End Cap)",
      ((BLIND_CAP_LEFT + BLIND_CAP_RIGHT) / 2, CAP_FLANGE_TOP), (1.4, 9.3))
label("ロッドエンドキャップ（グランド）\n(Rod End Cap / Gland)",
      ((GLAND_LEFT + GLAND_RIGHT) / 2, CAP_FLANGE_TOP), (13.2, 9.3))
label("作動油 流入ポート A\n高圧側 (Pressure Port In)", (sum(PORT_A_X) / 2, 8.85), (1.4, 7.85))
label("作動油 流出ポート B\n低圧・戻り側 (Return Port Out)", (sum(PORT_B_X) / 2, 8.85), (13.3, 7.85))
label("ピストン\n(Piston)", (7.0, BORE_BOTTOM), (7.0, 1.55))
label("ピストンシール（Oリング）\n(Piston Seal)", (PISTON_LEFT + 0.14, BORE_BOTTOM), (6.15, 0.55))
label("ピストンロッド\n(Piston Rod)", (9.6, ROD_BOTTOM), (9.6, 1.55))
label("ロッドシール／ワイパー\n(Rod Seal / Wiper)", (GLAND_LEFT + 0.12, ROD_BOTTOM - 0.08), (10.9, 0.55))
label("クレビス（ロッドエンド金具）\n(Clevis Fitting)",
      ((FLANGE_LEFT + FLANGE_RIGHT) / 2, FLANGE_BOTTOM), (12.9, 1.55))

# ======================================================================================
# 9) Title
# ======================================================================================
ax.text((X_MIN + X_MAX) / 2, 10.05, "油圧ピストン（複動シリンダー）の断面構造",
        ha="center", va="top", fontsize=17, fontweight="bold", color="#1a1a1a")
ax.text((X_MIN + X_MAX) / 2, 9.65, "Hydraulic Piston — Double-Acting Cylinder Cross-Section",
        ha="center", va="top", fontsize=11, color="#444444")

# ======================================================================================
# 10) Legend
# ======================================================================================
legend_x, legend_y = 0.35, 0.35
ax.add_patch(Rectangle((legend_x, legend_y), 4.9, 1.55, facecolor="white",
                        edgecolor="#444444", linewidth=1.0, zorder=9))
ax.add_patch(Rectangle((legend_x + 0.15, legend_y + 1.15), 0.5, 0.28, facecolor=METAL_FACE,
                        edgecolor=METAL_EDGE, hatch="////", zorder=10))
ax.text(legend_x + 0.75, legend_y + 1.29, "金属断面（切断面） Metal (cut section)",
        fontsize=8.6, va="center", zorder=10)
ax.add_patch(Rectangle((legend_x + 0.15, legend_y + 0.72), 0.5, 0.28, facecolor=PRESSURE_COLOR,
                        alpha=0.6, edgecolor="#444444", zorder=10))
ax.text(legend_x + 0.75, legend_y + 0.86, "高圧作動油 High-pressure fluid",
        fontsize=8.6, va="center", zorder=10)
ax.add_patch(Rectangle((legend_x + 0.15, legend_y + 0.29), 0.5, 0.28, facecolor=RETURN_COLOR,
                        alpha=0.5, edgecolor="#444444", zorder=10))
ax.text(legend_x + 0.75, legend_y + 0.43, "低圧・戻り作動油 Low-pressure / return fluid",
        fontsize=8.6, va="center", zorder=10)

fig.savefig(output_path, facecolor=fig.get_facecolor(), dpi=100)
plt.close(fig)
