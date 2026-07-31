import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager, rcParams
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle


def pick_jp_font():
    candidates = [
        "Hiragino Sans",
        "Hiragino Kaku Gothic ProN",
        "Hiragino Maru Gothic ProN",
        "YuGothic",
        "Yu Gothic",
        "Noto Sans CJK JP",
        "Noto Sans JP",
        "Source Han Sans JP",
        "IPAexGothic",
        "IPAGothic",
        "TakaoGothic",
        "MS Gothic",
        "Meiryo",
    ]
    available = {f.name for f in font_manager.fontManager.ttflist}
    for name in candidates:
        if name in available:
            return name
    return None


JP_FONT = pick_jp_font()
if JP_FONT:
    rcParams["font.family"] = "sans-serif"
    rcParams["font.sans-serif"] = [JP_FONT, "DejaVu Sans"]
rcParams["axes.unicode_minus"] = False
rcParams["hatch.linewidth"] = 0.7


def T(ja, en):
    return ja if JP_FONT else en


STEEL = "#c6cedb"
STEEL_DARK = "#a9b4c4"
PISTON = "#aab5c5"
ROD = "#dbe1ea"
EDGE = "#2c3849"
OIL_HI = "#efa63e"
OIL_LO = "#f7ddb0"
SEAL = "#b34a2e"
PIPE = "#6f7b8a"
ARROW_HI = "#a2510f"
ARROW_LO = "#8a6a2f"
TXT = "#1e252e"
LEAD = "#5c6775"

fig = plt.figure(figsize=(12, 9), dpi=100, facecolor="white")
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 120)
ax.set_ylim(0, 90)
ax.set_aspect("equal")
ax.axis("off")


def metal(x, y, w, h, fc=STEEL, hatch="//", z=3):
    ax.add_patch(
        Rectangle(
            (x, y),
            w,
            h,
            facecolor=fc,
            edgecolor=EDGE,
            linewidth=1.4,
            hatch=hatch,
            zorder=z,
        )
    )


def arrow(x1, y1, x2, y2, color, lw=2.2, scale=17, z=6):
    ax.add_patch(
        FancyArrowPatch(
            (x1, y1),
            (x2, y2),
            arrowstyle="-|>",
            mutation_scale=scale,
            linewidth=lw,
            color=color,
            shrinkA=0,
            shrinkB=0,
            zorder=z,
        )
    )


def label(text, tx, ty, px, py, ha="center", va="center", size=11):
    ax.annotate(
        text,
        xy=(px, py),
        xytext=(tx, ty),
        ha=ha,
        va=va,
        fontsize=size,
        color=TXT,
        zorder=8,
        arrowprops=dict(
            arrowstyle="-",
            color=LEAD,
            linewidth=1.0,
            shrinkA=3,
            shrinkB=1,
        ),
    )
    ax.plot([px], [py], marker="o", markersize=3.2, color=LEAD, zorder=8)


# ---- oil chambers -------------------------------------------------------
ax.add_patch(Rectangle((22, 32), 28, 28, facecolor=OIL_HI, edgecolor="none", zorder=1))
ax.add_patch(Rectangle((58, 32), 30, 28, facecolor=OIL_LO, edgecolor="none", zorder=1))

# ---- external piping ----------------------------------------------------
supply = [(4, 14), (30, 14), (30, 30)]
retur = [(83, 30), (83, 10), (116, 10)]
for path, fluid in ((supply, OIL_HI), (retur, OIL_LO)):
    xs = [p[0] for p in path]
    ys = [p[1] for p in path]
    ax.plot(xs, ys, color=PIPE, linewidth=9, solid_capstyle="butt",
            solid_joinstyle="miter", zorder=1)
    ax.plot(xs, ys, color=fluid, linewidth=5, solid_capstyle="butt",
            solid_joinstyle="miter", zorder=2)

# ---- cylinder body ------------------------------------------------------
metal(22, 60, 66, 4)                      # barrel wall (top)
metal(22, 28, 66, 4)                      # barrel wall (bottom)
metal(15, 28, 7, 36, fc=STEEL_DARK)       # cap-end cover
metal(88, 48, 8, 16, fc=STEEL_DARK)       # rod-end cover (above bore)
metal(88, 28, 8, 16, fc=STEEL_DARK)       # rod-end cover (below bore)

# port drillings through the barrel wall
ax.add_patch(Rectangle((28, 28), 4, 4, facecolor=OIL_HI, edgecolor=EDGE,
                       linewidth=1.0, zorder=4))
ax.add_patch(Rectangle((81, 28), 4, 4, facecolor=OIL_LO, edgecolor=EDGE,
                       linewidth=1.0, zorder=4))

# ---- piston and rod -----------------------------------------------------
metal(50, 32, 8, 28, fc=PISTON, hatch="\\\\", z=5)
metal(58, 44, 52, 4, fc=ROD, hatch="", z=5)

for gx in (51.0, 55.2):
    for gy in (57.0, 32.0):
        ax.add_patch(Rectangle((gx, gy), 1.8, 3.0, facecolor=SEAL,
                               edgecolor=EDGE, linewidth=0.8, zorder=6))
for sy in (48.0, 41.6):
    ax.add_patch(Rectangle((90.0, sy), 2.6, 2.4, facecolor=SEAL,
                           edgecolor=EDGE, linewidth=0.8, zorder=6))

# ---- mounting eyes ------------------------------------------------------
metal(10, 43, 5, 6, fc=STEEL_DARK, hatch="", z=4)
for cx in (10.5, 113.5):
    ax.add_patch(Circle((cx, 46), 4.6, facecolor=STEEL_DARK, edgecolor=EDGE,
                        linewidth=1.4, zorder=5))
    ax.add_patch(Circle((cx, 46), 2.1, facecolor="white", edgecolor=EDGE,
                        linewidth=1.2, zorder=6))

# ---- fluid flow ---------------------------------------------------------
arrow(14, 14, 22, 14, ARROW_HI)
arrow(30, 19, 30, 26, ARROW_HI)
arrow(30, 33, 30, 36.5, ARROW_HI, lw=2.0, scale=15)
arrow(25, 38, 35, 38, ARROW_HI)
arrow(37.5, 38, 47.5, 38, ARROW_HI)

arrow(61, 38, 71, 38, ARROW_LO)
arrow(73.5, 38, 80.5, 38, ARROW_LO)
arrow(83, 36.5, 83, 33, ARROW_LO, lw=2.0, scale=15)
arrow(83, 24, 83, 16, ARROW_LO)
arrow(95, 10, 105, 10, ARROW_LO)

# piston travel
arrow(99, 38, 114, 38, "#1f5f8b", lw=3.0, scale=22)
ax.text(106, 34, T("ピストンの動き", "piston travel"), ha="center", va="center",
        fontsize=11, color="#1f5f8b", zorder=8)

# ---- chamber captions ---------------------------------------------------
ax.text(36, 54.5, T("キャップ側圧力室", "cap-end chamber"), ha="center",
        va="center", fontsize=10.5, color="#5a3406", zorder=7)
ax.text(36, 50.8, T("（高圧油）", "(high pressure)"), ha="center", va="center",
        fontsize=10.5, color="#5a3406", zorder=7)
ax.text(36, 45, T("F = P × A（推力）", "F = P x A (thrust)"), ha="center",
        va="center", fontsize=10, color="#5a3406", zorder=7)

ax.text(73, 54.5, T("ロッド側室", "rod-end chamber"), ha="center", va="center",
        fontsize=10.5, color="#5b4a1e", zorder=7)
ax.text(73, 50.8, T("（戻り油）", "(return oil)"), ha="center", va="center",
        fontsize=10.5, color="#5b4a1e", zorder=7)

# ---- part labels --------------------------------------------------------
label(T("シリンダチューブ", "cylinder barrel"), 38, 77, 38, 64.3)
label(T("ピストン", "piston"), 57, 77, 54, 60.3)
label(T("ピストンパッキン", "piston seal"), 78, 77, 57.0, 60.3)
label(T("キャップ側カバー", "cap-end cover"), 9, 68.5, 18.5, 63.5, ha="left")
label(T("ロッド側カバー（ヘッド）", "rod-end head"), 97, 71, 92.5, 64.3, ha="left")
label(T("ピストンロッド", "piston rod"), 118, 58, 104, 48.3, ha="right")
label(T("ロッドパッキン", "rod seal"), 118, 26, 91.3, 41.6, ha="right")
label(T("取付アイ", "mounting eye"), 2, 32, 9.5, 41.8, ha="left")
label(T("ポートA（給油口）", "port A (inlet)"), 42, 23, 31.5, 30, ha="left", size=10.5)
label(T("ポートB（排油口）", "port B (outlet)"), 72, 20, 82, 30, ha="right", size=10.5)

ax.text(4, 20, T("ポンプ（高圧油の供給）", "from pump (pressurized oil)"),
        ha="left", va="bottom", fontsize=10.5, color=TXT, zorder=8)
ax.text(118, 15, T("タンクへ（戻り油）", "to tank (return oil)"), ha="right",
        va="bottom", fontsize=10.5, color=TXT, zorder=8)

# ---- title and legend ---------------------------------------------------
ax.text(60, 86, T("複動式油圧シリンダの断面構造", "Double-Acting Hydraulic Cylinder"),
        ha="center", va="center", fontsize=18, color=TXT, zorder=8)
ax.text(60, 81.5,
        T("圧油の給排によりピストンとロッドが往復運動する",
          "oil supply and discharge drive the piston and rod"),
        ha="center", va="center", fontsize=10.5, color="#4a5563", zorder=8)

ax.add_patch(FancyBboxPatch((5, 74.5), 20, 11.5,
                            boxstyle="round,pad=0.8,rounding_size=1.2",
                            facecolor="#f4f6f9", edgecolor="#aab3c0",
                            linewidth=1.0, zorder=7))
legend_items = [
    (OIL_HI, T("高圧油（供給）", "high-pressure oil")),
    (OIL_LO, T("低圧油（戻り）", "low-pressure oil")),
    (SEAL, T("シール部品", "seal / packing")),
]
for i, (color, name) in enumerate(legend_items):
    y = 83 - i * 3.6
    ax.add_patch(Rectangle((6.5, y - 1.1), 3.0, 2.2, facecolor=color,
                           edgecolor=EDGE, linewidth=0.8, zorder=8))
    ax.text(10.6, y, name, ha="left", va="center", fontsize=9.5, color=TXT,
            zorder=8)

fig.savefig(sys.argv[1], dpi=100, facecolor=fig.get_facecolor())
plt.close(fig)
