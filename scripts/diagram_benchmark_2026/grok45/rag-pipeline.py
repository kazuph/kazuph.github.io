import sys
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#0f1419")
ax.set_facecolor("#0f1419")


def rounded_box(x, y, w, h, facecolor, edgecolor, linewidth=1.5, radius=0.12):
    box = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle=f"round,pad=0.02,rounding_size={radius}",
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=linewidth,
        zorder=2,
    )
    ax.add_patch(box)
    return box


def arrow(x1, y1, x2, y2, color="#7dd3fc", style="-|>", lw=1.8):
    arr = FancyArrowPatch(
        (x1, y1),
        (x2, y2),
        arrowstyle=style,
        mutation_scale=14,
        color=color,
        linewidth=lw,
        zorder=3,
        connectionstyle="arc3,rad=0",
    )
    ax.add_patch(arr)


def label(x, y, text, fontsize=11, color="#e7ecf3", weight="bold", ha="center", va="center"):
    ax.text(x, y, text, fontsize=fontsize, color=color, fontweight=weight, ha=ha, va=va, zorder=4)


# Title
label(6.0, 8.55, "RAG Pipeline Architecture", fontsize=18, color="#f0f4f8", weight="bold")
label(6.0, 8.15, "Retrieval-Augmented Generation", fontsize=10, color="#94a3b8", weight="normal")

# ── Offline / Ingestion lane background ──
rounded_box(0.35, 5.35, 11.3, 2.45, "#1a2332", "#334155", linewidth=1.2, radius=0.15)
label(0.55, 7.5, "OFFLINE  ·  Document Ingestion", fontsize=9, color="#64748b", weight="bold", ha="left")

# Offline nodes
rounded_box(0.7, 5.7, 2.2, 1.35, "#1e3a5f", "#38bdf8", radius=0.1)
label(1.8, 6.55, "Source Docs", fontsize=11, color="#e0f2fe")
label(1.8, 6.15, "PDF / HTML / MD", fontsize=8, color="#7dd3fc", weight="normal")

rounded_box(3.5, 5.7, 2.2, 1.35, "#1e3a5f", "#38bdf8", radius=0.1)
label(4.6, 6.55, "Chunk & Embed", fontsize=11, color="#e0f2fe")
label(4.6, 6.15, "split → vectors", fontsize=8, color="#7dd3fc", weight="normal")

rounded_box(6.3, 5.7, 2.4, 1.35, "#164e63", "#22d3ee", radius=0.1)
label(7.5, 6.55, "Vector DB", fontsize=12, color="#ecfeff")
label(7.5, 6.15, "index store", fontsize=8, color="#67e8f9", weight="normal")

arrow(2.95, 6.375, 3.45, 6.375, color="#38bdf8")
arrow(5.75, 6.375, 6.25, 6.375, color="#38bdf8")

# dashed note for offline flow
ax.annotate(
    "",
    xy=(8.75, 6.0),
    xytext=(8.75, 5.0),
    arrowprops=dict(arrowstyle="-|>", color="#475569", lw=1.2, linestyle="--"),
    zorder=3,
)
label(9.55, 5.45, "shared\nindex", fontsize=7, color="#64748b", weight="normal")

# ── Online / Query lane background ──
rounded_box(0.35, 0.45, 11.3, 4.55, "#1a2332", "#334155", linewidth=1.2, radius=0.15)
label(0.55, 4.7, "ONLINE  ·  Query-time Retrieval & Generation", fontsize=9, color="#64748b", weight="bold", ha="left")

# Online nodes — top row: query path
rounded_box(0.7, 3.15, 2.0, 1.2, "#3b1f4a", "#c084fc", radius=0.1)
label(1.7, 3.9, "User Query", fontsize=11, color="#f3e8ff")
label(1.7, 3.5, "natural language", fontsize=8, color="#d8b4fe", weight="normal")

rounded_box(3.3, 3.15, 2.3, 1.2, "#3b1f4a", "#c084fc", radius=0.1)
label(4.45, 3.9, "Embed / Retrieve", fontsize=11, color="#f3e8ff")
label(4.45, 3.5, "query → top-k", fontsize=8, color="#d8b4fe", weight="normal")

# Vector DB (online read) — shared look
rounded_box(6.2, 3.15, 2.2, 1.2, "#164e63", "#22d3ee", radius=0.1)
label(7.3, 3.9, "Vector DB", fontsize=11, color="#ecfeff")
label(7.3, 3.5, "similarity search", fontsize=8, color="#67e8f9", weight="normal")

rounded_box(9.0, 3.15, 2.3, 1.2, "#14532d", "#4ade80", radius=0.1)
label(10.15, 3.9, "Retrieved Context", fontsize=10, color="#dcfce7")
label(10.15, 3.5, "ranked chunks", fontsize=8, color="#86efac", weight="normal")

arrow(2.75, 3.75, 3.25, 3.75, color="#c084fc")
arrow(5.65, 3.75, 6.15, 3.75, color="#c084fc")
arrow(8.45, 3.75, 8.95, 3.75, color="#22d3ee")

# Bottom row: generation
rounded_box(3.0, 0.85, 2.8, 1.35, "#422006", "#fb923c", radius=0.1)
label(4.4, 1.7, "LLM", fontsize=13, color="#fff7ed")
label(4.4, 1.3, "prompt = query + context", fontsize=8, color="#fdba74", weight="normal")

rounded_box(7.0, 0.85, 2.8, 1.35, "#422006", "#fbbf24", radius=0.1)
label(8.4, 1.7, "Answer", fontsize=13, color="#fffbeb")
label(8.4, 1.3, "grounded response", fontsize=8, color="#fcd34d", weight="normal")

# Context → LLM (down-left)
arrow(10.15, 3.15, 5.4, 2.25, color="#4ade80", lw=1.6)
# Query also to LLM
arrow(1.7, 3.15, 3.4, 2.2, color="#c084fc", lw=1.5)
# LLM → Answer
arrow(5.85, 1.525, 6.95, 1.525, color="#fb923c", lw=2.0)

# Legend
legend_items = [
    ("#38bdf8", "Ingestion (offline)"),
    ("#c084fc", "Query path (online)"),
    ("#22d3ee", "Vector store"),
    ("#fb923c", "Generation"),
]
lx = 0.7
for i, (c, t) in enumerate(legend_items):
    ax.add_patch(
        mpatches.FancyBboxPatch(
            (lx + i * 2.75, 0.12),
            0.28,
            0.22,
            boxstyle="round,pad=0.01,rounding_size=0.04",
            facecolor=c,
            edgecolor="none",
            zorder=2,
        )
    )
    ax.text(lx + i * 2.75 + 0.38, 0.23, t, fontsize=7.5, color="#94a3b8", va="center", ha="left", zorder=4)

out = sys.argv[1]
fig.savefig(out, dpi=100, bbox_inches="tight", pad_inches=0.15, facecolor=fig.get_facecolor())
plt.close()
