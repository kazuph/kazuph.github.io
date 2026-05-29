import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch

plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = [
    "Hiragino Sans", "Hiragino Kaku Gothic Pro", "Noto Sans CJK JP", "DejaVu Sans",
]

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#f7f4ec")

STEEL = "#b9c2cc"
STEELD = "#8c97a3"
ROD = "#6e7884"
OILL = "#6fb1e0"
OILR = "#f0a35e"
SEAL = "#3c4450"
LBL = "#2b313a"
FLOW = "#c0392b"


def box(x, y, w, h, fc, ec=None, lw=0):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fc,
                           edgecolor=ec if ec else "none", lw=lw))


# cylinder body
box(1.5, 3.0, 8.1, 3.6, STEEL, STEELD, 3)
box(1.9, 3.4, 7.3, 2.8, "white")
# chambers
box(1.9, 3.4, 2.8, 2.8, OILL)
box(5.5, 3.4, 3.7, 2.8, OILR)
# piston
box(4.7, 3.4, 0.8, 2.8, SEAL)
box(4.78, 3.5, 0.64, 2.6, STEELD)
for y in (3.9, 4.45, 5.0, 5.55):
    box(4.7, y, 0.8, 0.14, SEAL)
# rod
box(5.5, 4.55, 5.5, 0.5, ROD, STEELD, 2.5)
# end cap + seal
box(9.2, 3.4, 0.4, 2.8, SEAL)
box(9.2, 4.45, 0.4, 0.7, STEEL)

arrow = dict(arrowstyle="-|>", mutation_scale=22, lw=3.5)
# oil in
ax.add_patch(FancyArrowPatch((3.1, 1.9), (3.1, 3.35), color=FLOW, **arrow))
ax.text(3.1, 1.7, "高圧オイル流入", ha="center", va="top", fontsize=12, color=LBL)
# oil out
ax.add_patch(FancyArrowPatch((7.3, 3.35), (7.3, 1.9), color=FLOW, **arrow))
ax.text(7.3, 1.7, "オイル排出", ha="center", va="top", fontsize=12, color=LBL)
# piston motion
ax.add_patch(FancyArrowPatch((4.55, 6.9), (6.1, 6.9), color=SEAL,
                             arrowstyle="-|>", mutation_scale=24, lw=4))
ax.text(5.3, 7.05, "ピストン移動", ha="center", va="bottom", fontsize=12, color=LBL)

# labels with leaders
ax.annotate("シリンダー", xy=(2.3, 6.6), xytext=(0.3, 7.2), fontsize=12, color=LBL,
            arrowprops=dict(arrowstyle="-", color=LBL, lw=1.2))
ax.annotate("ピストン", xy=(5.1, 6.25), xytext=(5.1, 8.4), fontsize=12, color=LBL,
            ha="center", arrowprops=dict(arrowstyle="-", color=LBL, lw=1.2))
ax.annotate("ロッド", xy=(10.4, 5.1), xytext=(10.5, 6.0), fontsize=12, color=LBL,
            arrowprops=dict(arrowstyle="-", color=LBL, lw=1.2))
ax.annotate("シール", xy=(9.4, 3.9), xytext=(9.8, 3.0), fontsize=12, color=LBL,
            arrowprops=dict(arrowstyle="-", color=LBL, lw=1.2))
ax.text(3.3, 3.25, "圧力室A", ha="center", va="top", fontsize=11, color="#1f5f8b")
ax.text(7.35, 3.25, "圧力室B", ha="center", va="top", fontsize=11, color="#a85a1f")

ax.text(6, 8.85, "油圧ピストン 断面構造", ha="center", va="center",
        fontsize=17, fontweight="bold", color=LBL)

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
