import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle

OUT = sys.argv[1]
FIG_W, FIG_H, DPI = 12.0, 9.0, 100  # 1200x900

fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=DPI)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("white")
ax.set_facecolor("white")

C_EMB = "#E8F4F8"
C_POS = "#D4E6F1"
C_ATT = "#FCE4D6"
C_MASK = "#FAD7A0"
C_CROSS = "#F5B7B1"
C_FF = "#D5F5E3"
C_NORM = "#F5EEF8"
C_OUT = "#D6EAF8"
C_EDGE = "#2C3E50"
C_ARROW = "#34495E"
C_RES = "#7F8C8D"
C_TITLE = "#1A252F"


def box(x, y, w, h, text, fc, fs=8, lw=1.2):
    p = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.06",
        facecolor=fc, edgecolor=C_EDGE, linewidth=lw, zorder=3,
    )
    ax.add_patch(p)
    ax.text(
        x + w / 2, y + h / 2, text,
        ha="center", va="center", fontsize=fs, color=C_TITLE,
        fontweight="medium", zorder=4, linespacing=1.2,
    )


def arrow(x1, y1, x2, y2, color=C_ARROW, lw=1.3, rad=0.0):
    ax.add_patch(FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle="-|>", mutation_scale=10,
        linewidth=lw, color=color,
        connectionstyle=f"arc3,rad={rad}", zorder=2,
    ))


# Title
ax.text(6.0, 8.78, "Transformer Architecture", ha="center", va="center",
        fontsize=16, fontweight="bold", color=C_TITLE)
ax.text(6.0, 8.48, "Encoder–Decoder (Attention Is All You Need)",
        ha="center", va="center", fontsize=9, color="#5D6D7E", style="italic")

# Stack backgrounds
ax.add_patch(FancyBboxPatch(
    (0.30, 1.35), 4.7, 6.55,
    boxstyle="round,pad=0.02,rounding_size=0.1",
    facecolor="#EBF5FB", edgecolor="#5DADE2", linewidth=1.5, zorder=0,
))
ax.add_patch(FancyBboxPatch(
    (5.45, 1.35), 5.15, 6.55,
    boxstyle="round,pad=0.02,rounding_size=0.1",
    facecolor="#FEF9E7", edgecolor="#F4D03F", linewidth=1.5, zorder=0,
))
ax.text(2.65, 7.70, "Encoder  ×N", ha="center", va="center",
        fontsize=11, fontweight="bold", color="#1A5276")
ax.text(8.05, 7.70, "Decoder  ×N", ha="center", va="center",
        fontsize=11, fontweight="bold", color="#7D6608")

# N-stack frames
ax.add_patch(FancyBboxPatch(
    (0.50, 3.00), 4.3, 4.45,
    boxstyle="round,pad=0.02,rounding_size=0.08",
    facecolor="#F8F9F9", edgecolor="#85C1E9", linewidth=1.0, linestyle="--", zorder=1,
))
ax.add_patch(FancyBboxPatch(
    (5.65, 3.00), 4.75, 4.45,
    boxstyle="round,pad=0.02,rounding_size=0.08",
    facecolor="#F8F9F9", edgecolor="#F9E79F", linewidth=1.0, linestyle="--", zorder=1,
))

BW, BH = 2.85, 0.46
NX = 0.50 + (4.3 - BW) / 2
DX = 5.65 + (4.75 - BW) / 2
CX_E = NX + BW / 2
CX_D = DX + BW / 2

# Encoder embeddings
box(NX, 1.55, BW, BH, "Input Embedding", C_EMB, fs=8)
box(NX, 2.25, BW, BH, "Positional Encoding", C_POS, fs=8)
ax.add_patch(plt.Circle((CX_E, 2.12), 0.09, fc="white", ec=C_EDGE, lw=1.0, zorder=5))
ax.text(CX_E, 2.12, "+", ha="center", va="center", fontsize=9, zorder=6)
arrow(CX_E, 2.01, CX_E, 2.12)
arrow(CX_E, 2.21, CX_E, 2.25)
ax.text(CX_E, 1.40, "Inputs", ha="center", va="top", fontsize=8, color="#5D6D7E")

# Encoder stack
e_mha, e_an1, e_ff, e_an2 = 3.20, 4.00, 4.80, 5.60
box(NX, e_mha, BW, BH, "Multi-Head Attention", C_ATT, fs=8)
box(NX, e_an1, BW, BH, "Add & Norm", C_NORM, fs=8)
box(NX, e_ff, BW, BH, "Feed Forward", C_FF, fs=8)
box(NX, e_an2, BW, BH, "Add & Norm", C_NORM, fs=8)

arrow(CX_E, 2.71, CX_E, e_mha)
arrow(CX_E, e_mha + BH, CX_E, e_an1)
arrow(CX_E, e_an1 + BH, CX_E, e_ff)
arrow(CX_E, e_ff + BH, CX_E, e_an2)

rx1 = NX + BW + 0.28
ax.plot([CX_E, rx1, rx1, NX + BW],
        [3.05, 3.05, e_an1 + BH / 2, e_an1 + BH / 2],
        color=C_RES, lw=1.0, ls="--", zorder=2)
arrow(NX + BW - 0.02, e_an1 + BH / 2, NX + BW, e_an1 + BH / 2, color=C_RES, lw=1.0)

rx2 = NX + BW + 0.48
ax.plot([CX_E, rx2, rx2, NX + BW],
        [e_an1 + BH + 0.08, e_an1 + BH + 0.08, e_an2 + BH / 2, e_an2 + BH / 2],
        color=C_RES, lw=1.0, ls="--", zorder=2)
arrow(NX + BW - 0.02, e_an2 + BH / 2, NX + BW, e_an2 + BH / 2, color=C_RES, lw=1.0)

ax.text(CX_E, 6.30, "Encoder Output", ha="center", va="center",
        fontsize=7.5, color="#1A5276", fontweight="bold")
arrow(CX_E, e_an2 + BH, CX_E, 6.20)

# Decoder embeddings
box(DX, 1.55, BW, BH, "Output Embedding", C_EMB, fs=8)
box(DX, 2.25, BW, BH, "Positional Encoding", C_POS, fs=8)
ax.add_patch(plt.Circle((CX_D, 2.12), 0.09, fc="white", ec=C_EDGE, lw=1.0, zorder=5))
ax.text(CX_D, 2.12, "+", ha="center", va="center", fontsize=9, zorder=6)
arrow(CX_D, 2.01, CX_D, 2.12)
arrow(CX_D, 2.21, CX_D, 2.25)
ax.text(CX_D, 1.40, "Outputs (shifted right)", ha="center", va="top",
        fontsize=7.5, color="#5D6D7E")

# Decoder stack
d_mmha, d_an1 = 3.15, 3.75
d_cross, d_an2 = 4.40, 5.05
d_ff, d_an3 = 5.70, 6.35
box(DX, d_mmha, BW, 0.50, "Masked Multi-Head\nAttention", C_MASK, fs=7.5)
box(DX, d_an1, BW, BH, "Add & Norm", C_NORM, fs=8)
box(DX, d_cross, BW, 0.50, "Cross-Attention\n(Multi-Head)", C_CROSS, fs=7.5)
box(DX, d_an2, BW, BH, "Add & Norm", C_NORM, fs=8)
box(DX, d_ff, BW, BH, "Feed Forward", C_FF, fs=8)
box(DX, d_an3, BW, BH, "Add & Norm", C_NORM, fs=8)

arrow(CX_D, 2.71, CX_D, d_mmha)
arrow(CX_D, d_mmha + 0.50, CX_D, d_an1)
arrow(CX_D, d_an1 + BH, CX_D, d_cross)
arrow(CX_D, d_cross + 0.50, CX_D, d_an2)
arrow(CX_D, d_an2 + BH, CX_D, d_ff)
arrow(CX_D, d_ff + BH, CX_D, d_an3)

lx1 = DX - 0.28
ax.plot([CX_D, lx1, lx1, DX],
        [3.00, 3.00, d_an1 + BH / 2, d_an1 + BH / 2],
        color=C_RES, lw=1.0, ls="--", zorder=2)
arrow(DX + 0.02, d_an1 + BH / 2, DX, d_an1 + BH / 2, color=C_RES, lw=1.0)

lx2 = DX - 0.48
ax.plot([CX_D, lx2, lx2, DX],
        [d_an1 + BH + 0.06, d_an1 + BH + 0.06, d_an2 + BH / 2, d_an2 + BH / 2],
        color=C_RES, lw=1.0, ls="--", zorder=2)
arrow(DX + 0.02, d_an2 + BH / 2, DX, d_an2 + BH / 2, color=C_RES, lw=1.0)

rx3 = DX + BW + 0.30
ax.plot([CX_D, rx3, rx3, DX + BW],
        [d_an2 + BH + 0.06, d_an2 + BH + 0.06, d_an3 + BH / 2, d_an3 + BH / 2],
        color=C_RES, lw=1.0, ls="--", zorder=2)
arrow(DX + BW - 0.02, d_an3 + BH / 2, DX + BW, d_an3 + BH / 2, color=C_RES, lw=1.0)

# Encoder → Decoder Cross-Attention (K, V)
ax.annotate(
    "",
    xy=(DX, d_cross + 0.25),
    xytext=(NX + BW + 0.05, e_an2 + BH / 2),
    arrowprops=dict(
        arrowstyle="-|>", color="#C0392B", lw=1.6,
        connectionstyle="arc3,rad=-0.18",
    ),
    zorder=5,
)
ax.text(5.15, 5.55, "K, V", ha="center", va="center",
        fontsize=8, color="#C0392B", fontweight="bold")

# Linear + Softmax
box(DX, 7.15, BW, BH, "Linear", C_OUT, fs=9)
box(DX, 7.75, BW, BH, "Softmax", C_OUT, fs=9)
arrow(CX_D, d_an3 + BH, CX_D, 7.15)
arrow(CX_D, 7.15 + BH, CX_D, 7.75)
ax.text(CX_D, 8.35, "Output Probabilities", ha="center", va="bottom",
        fontsize=8, color="#1A5276", fontweight="bold")
arrow(CX_D, 7.75 + BH, CX_D, 8.30)

# Legend
items = [
    (C_ATT, "Self-Attention"),
    (C_MASK, "Masked Attention"),
    (C_CROSS, "Cross-Attention"),
    (C_FF, "Feed Forward"),
    (C_NORM, "Add & Norm"),
]
lx = 0.45
for fc, label in items:
    ax.add_patch(Rectangle((lx, 0.28), 0.26, 0.20, facecolor=fc, edgecolor=C_EDGE, lw=0.8))
    ax.text(lx + 0.32, 0.38, label, ha="left", va="center", fontsize=7, color=C_TITLE)
    lx += 2.25
ax.text(0.45, 0.70, "Dashed lines: residual connections into Add & Norm",
        ha="left", va="center", fontsize=7, color=C_RES, style="italic")

fig.savefig(OUT, dpi=DPI, bbox_inches="tight", pad_inches=0.12, facecolor="white")
plt.close()
