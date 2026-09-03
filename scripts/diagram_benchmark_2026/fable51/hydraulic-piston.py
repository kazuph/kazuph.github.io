import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

BG = "#FAFAF7"
STEEL = "#8D99A6"
STEEL_DARK = "#4E5A66"
STEEL_LIGHT = "#C9D1D9"
OIL_HI = "#E8A33D"
OIL_LO = "#F6DDA6"
SEAL = "#2F2F2F"
LABEL = "#233044"
ARROW_HI = "#D1495B"
ARROW_LO = "#3F7CAC"
FONT = ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "IPAexGothic", "DejaVu Sans"]


def rect(ax, x, y, w, h, fc, ec="none", lw=1.0, z=1, hatch=None):
    p = Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, hatch=hatch)
    ax.add_patch(p)
    return p


def arrow(ax, p0, p1, color, lw=2.2, z=6, ms=16):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=ms, color=color, linewidth=lw, zorder=z))


def label(ax, xy, text, ha="left", size=11, color=LABEL, weight="normal", z=8):
    ax.text(xy[0], xy[1], text, ha=ha, va="center", fontsize=size, color=color, fontweight=weight,
            fontfamily=FONT, zorder=z)


def leader(ax, pts, z=7):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=LABEL, lw=0.8, zorder=z)


def main() -> None:
    out_path = sys.argv[1]
    plt.rcParams["hatch.linewidth"] = 0.6
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.6, 11.4)
    ax.set_ylim(-0.9, 8.1)
    ax.set_aspect("equal")
    ax.axis("off")
    rect(ax, -0.6, -0.9, 12, 9, BG, z=0)

    label(ax, (-0.2, 7.6), "油圧シリンダー（複動型）の断面構造", size=17, weight="bold")
    label(ax, (-0.2, 7.15), "ポートAに圧油を送るとピストンが右へ動き、ポートB側の油が戻る", size=11, color=STEEL_DARK)

    # cylinder body (cut walls with hatching)
    for x, y, w, h in ((0.4, 2.0, 8.6, 0.5), (0.4, 5.5, 8.6, 0.5), (0.4, 2.0, 0.5, 4.0), (8.5, 2.0, 0.5, 4.0)):
        rect(ax, x, y, w, h, STEEL, ec=STEEL_DARK, lw=1.0, z=2, hatch="///")
    rect(ax, 0.4, 5.85, 8.6, 0.15, STEEL_LIGHT, z=3)
    rect(ax, 0.4, 2.0, 8.6, 0.15, STEEL_LIGHT, z=3)

    # chambers
    rect(ax, 0.9, 2.5, 3.2, 3.0, OIL_HI, z=2)
    rect(ax, 5.1, 2.5, 3.4, 3.0, OIL_LO, z=2)

    # piston + seals
    rect(ax, 4.1, 2.55, 1.0, 2.9, STEEL_LIGHT, ec=STEEL_DARK, lw=1.0, z=4, hatch="\\\\\\")
    rect(ax, 4.3, 5.3, 0.6, 0.2, SEAL, z=5)
    rect(ax, 4.3, 2.5, 0.6, 0.2, SEAL, z=5)
    # rod
    rect(ax, 5.1, 3.65, 5.5, 0.7, STEEL_LIGHT, ec=STEEL_DARK, lw=1.0, z=4)
    rect(ax, 5.1, 3.65, 3.4, 0.7, STEEL_LIGHT, ec="none", z=4, hatch="\\\\\\")
    rect(ax, 8.55, 4.35, 0.4, 0.15, SEAL, z=5)
    rect(ax, 8.55, 3.5, 0.4, 0.15, SEAL, z=5)
    rect(ax, 10.6, 3.35, 0.5, 1.3, STEEL, ec=STEEL_DARK, lw=1.0, z=4)
    ax.add_patch(Circle((10.85, 4.0), 0.17, facecolor=BG, edgecolor=STEEL_DARK, linewidth=1.0, zorder=5))

    # ports
    rect(ax, 1.5, 6.0, 0.6, 0.7, STEEL, ec=STEEL_DARK, lw=1.0, z=3)
    rect(ax, 1.65, 5.5, 0.3, 1.2, OIL_HI, z=4)
    rect(ax, 7.3, 6.0, 0.6, 0.7, STEEL, ec=STEEL_DARK, lw=1.0, z=3)
    rect(ax, 7.45, 5.5, 0.3, 1.2, OIL_LO, z=4)
    ax.text(1.8, 6.78, "ポート A（供給）", ha="center", va="bottom", fontsize=11, fontweight="bold", color=LABEL, fontfamily=FONT, zorder=8)
    ax.text(7.6, 6.78, "ポート B（戻り）", ha="center", va="bottom", fontsize=11, fontweight="bold", color=LABEL, fontfamily=FONT, zorder=8)

    # flow arrows
    arrow(ax, (1.8, 7.05), (1.8, 5.8), ARROW_HI)
    for y in (3.0, 4.0, 5.0):
        arrow(ax, (1.6, y), (3.6, y), ARROW_HI)
    for y in (3.0, 5.0):
        arrow(ax, (5.5, y), (7.3, y), ARROW_LO)
    arrow(ax, (7.6, 5.3), (7.6, 7.05), ARROW_LO)
    label(ax, (1.55, 2.7), "高圧側（P₁）", size=9, color=ARROW_HI)
    label(ax, (8.4, 2.7), "低圧側（P₂）", ha="right", size=9, color="#2E5F86")
    label(ax, (2.5, 4.5), "圧力室 A", ha="center", size=11, color="#8E2E3D", weight="bold")
    label(ax, (6.8, 4.75), "圧力室 B", ha="center", size=11, color="#2E5F86", weight="bold")

    # piston motion
    arrow(ax, (4.6, 1.55), (6.6, 1.55), LABEL, lw=3.2, ms=22)
    ax.text(5.6, 1.4, "ピストンの移動方向（F = P₁·A₁ − P₂·A₂）", ha="center", va="top", fontsize=11, color=LABEL, fontfamily=FONT, zorder=8)

    # labels with leaders
    leader(ax, [(2.5, 5.75), (2.5, 6.55), (3.4, 6.55)]); label(ax, (3.45, 6.55), "シリンダーチューブ")
    leader(ax, [(4.6, 4.6), (4.6, 6.35), (5.0, 6.35)]); label(ax, (5.05, 6.35), "ピストン")
    leader(ax, [(4.6, 5.4), (4.9, 5.95), (5.9, 5.95)]); label(ax, (5.95, 5.95), "ピストンシール", size=9)
    leader(ax, [(9.6, 4.35), (9.6, 5.1), (9.9, 5.1)]); label(ax, (9.95, 5.1), "ピストンロッド")
    leader(ax, [(8.75, 4.5), (8.75, 5.25), (8.9, 5.25)]); label(ax, (8.95, 5.25), "ロッドシール", size=9)
    leader(ax, [(10.85, 3.35), (10.85, 2.7), (10.4, 2.7)]); label(ax, (10.35, 2.7), "ロッドエンド", ha="right", size=9)
    leader(ax, [(0.65, 2.5), (0.65, 1.3), (1.0, 1.3)]); label(ax, (1.05, 1.3), "キャップ（ヘッド側）", size=9)
    leader(ax, [(8.75, 2.5), (8.75, 0.9), (8.4, 0.9)]); label(ax, (8.35, 0.9), "ロッドカバー（グランド）", ha="right", size=9)

    # legend
    rect(ax, 0.0, 0.0, 0.4, 0.3, OIL_HI, ec=STEEL_DARK, lw=0.6, z=5); label(ax, (0.5, 0.15), "高圧の作動油", size=9)
    rect(ax, 2.6, 0.0, 0.4, 0.3, OIL_LO, ec=STEEL_DARK, lw=0.6, z=5); label(ax, (3.1, 0.15), "低圧の作動油（戻り）", size=9)
    rect(ax, 5.7, 0.0, 0.4, 0.3, STEEL, ec=STEEL_DARK, lw=0.6, z=5, hatch="///"); label(ax, (6.2, 0.15), "金属（断面ハッチング）", size=9)
    rect(ax, 8.8, 0.05, 0.4, 0.2, SEAL, z=5); label(ax, (9.3, 0.15), "シール", size=9)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
