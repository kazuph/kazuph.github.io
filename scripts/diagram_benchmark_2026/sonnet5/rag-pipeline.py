import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle
from matplotlib.lines import Line2D

output_path = sys.argv[1]

# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------
fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor("#f4f6fb")

ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 16.4)
ax.set_ylim(0, 10)
ax.set_facecolor("#f4f6fb")
ax.axis("off")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def draw_box(x, y, w, h, text, facecolor, edgecolor, fontsize=11.5):
    box = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.03,rounding_size=0.14",
        linewidth=2.2,
        edgecolor=edgecolor,
        facecolor=facecolor,
        zorder=5,
    )
    ax.add_patch(box)
    ax.text(
        x + w / 2,
        y + h / 2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        color="white",
        fontweight="bold",
        linespacing=1.35,
        zorder=6,
    )


def draw_cylinder(cx, cy, w, h, text, facecolor, edgecolor, fontsize=11):
    """Database-style cylinder used for the shared Vector DB node."""
    ellipse_h = h * 0.22
    body_bottom = cy - h / 2 + ellipse_h / 2
    body_height = h - ellipse_h

    body = Rectangle(
        (cx - w / 2, body_bottom),
        w,
        body_height,
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=2.2,
        zorder=4,
    )
    ax.add_patch(body)

    bottom_ellipse = Ellipse(
        (cx, body_bottom),
        w,
        ellipse_h,
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=2.2,
        zorder=4,
    )
    ax.add_patch(bottom_ellipse)

    top_ellipse = Ellipse(
        (cx, cy + h / 2 - ellipse_h / 2),
        w,
        ellipse_h,
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=2.2,
        zorder=6,
    )
    ax.add_patch(top_ellipse)

    ax.text(
        cx,
        cy - ellipse_h * 0.2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        color="white",
        fontweight="bold",
        linespacing=1.4,
        zorder=7,
    )


def draw_arrow(start, end, color, dashed=False, rad=0.0, lw=2.4):
    arrow = FancyArrowPatch(
        start,
        end,
        arrowstyle="-|>",
        mutation_scale=20,
        linewidth=lw,
        color=color,
        linestyle="--" if dashed else "-",
        connectionstyle=f"arc3,rad={rad}",
        zorder=3,
    )
    ax.add_patch(arrow)


# ---------------------------------------------------------------------------
# Title
# ---------------------------------------------------------------------------
ax.text(
    8.2,
    9.75,
    "RAG Pipeline Architecture",
    ha="center",
    va="center",
    fontsize=23,
    fontweight="bold",
    color="#1e293b",
)
ax.text(
    8.2,
    9.4,
    "Retrieval-Augmented Generation — offline ingestion builds the index, online inference answers each query",
    ha="center",
    va="center",
    fontsize=11.5,
    style="italic",
    color="#475569",
)

# ---------------------------------------------------------------------------
# Lane backgrounds
# ---------------------------------------------------------------------------
offline_lane = Rectangle(
    (0.3, 6.55),
    15.8,
    2.55,
    facecolor="#e2e8f0",
    edgecolor="#94a3b8",
    linewidth=1.6,
    linestyle="--",
    alpha=0.55,
    zorder=1,
)
ax.add_patch(offline_lane)
ax.text(
    0.6,
    8.8,
    "OFFLINE — Document Ingestion (batch, ahead of time)",
    ha="left",
    va="center",
    fontsize=12.5,
    fontweight="bold",
    color="#334155",
    zorder=2,
)

online_lane = Rectangle(
    (0.3, 0.3),
    15.8,
    2.6,
    facecolor="#ccfbf1",
    edgecolor="#14b8a6",
    linewidth=1.6,
    linestyle="--",
    alpha=0.45,
    zorder=1,
)
ax.add_patch(online_lane)
ax.text(
    0.6,
    2.65,
    "ONLINE — Query-Time Inference (per user request)",
    ha="left",
    va="center",
    fontsize=12.5,
    fontweight="bold",
    color="#0f766e",
    zorder=2,
)

# ---------------------------------------------------------------------------
# Offline ingestion row
# ---------------------------------------------------------------------------
draw_box(0.6, 7.1, 3.2, 1.1, "Raw Documents\n(PDF · Wiki · Tickets)", "#64748b", "#334155")
draw_box(4.6, 7.1, 3.2, 1.1, "Chunking &\nPreprocessing", "#6366f1", "#3730a3")
draw_box(8.6, 7.1, 3.6, 1.1, "Embedding Model\n(batch encode)", "#8b5cf6", "#5b21b6")

draw_arrow((3.8, 7.65), (4.6, 7.65), "#64748b", dashed=True)
draw_arrow((7.8, 7.65), (8.6, 7.65), "#64748b", dashed=True)

# ---------------------------------------------------------------------------
# Shared Vector DB (hub between the two lanes)
# ---------------------------------------------------------------------------
draw_cylinder(
    7.6,
    4.75,
    3.6,
    1.8,
    "Vector DB\n(embeddings +\nsimilarity search)",
    "#d97706",
    "#92400e",
)

draw_arrow((10.4, 7.1), (8.6, 5.65), "#64748b", dashed=True, rad=0.25)
ax.text(
    9.95,
    6.35,
    "index / upsert\nembeddings",
    ha="center",
    va="center",
    fontsize=9.3,
    style="italic",
    color="#475569",
)

# ---------------------------------------------------------------------------
# Online query row
# ---------------------------------------------------------------------------
draw_box(0.6, 0.8, 2.4, 1.1, "User Query", "#0ea5e9", "#075985")
draw_box(3.5, 0.8, 2.8, 1.1, "Embed Query &\nRetrieve", "#14b8a6", "#0f766e")
draw_box(7.0, 0.8, 3.0, 1.1, "Retrieved Context\n(top-k chunks)", "#10b981", "#047857")
draw_box(10.5, 0.8, 2.6, 1.1, "LLM\n(generation)", "#c026d3", "#86198f")
draw_box(13.6, 0.8, 2.2, 1.1, "Answer", "#e11d48", "#881337")

draw_arrow((3.0, 1.35), (3.5, 1.35), "#0d9488")
draw_arrow((4.9, 1.9), (6.4, 3.85), "#0d9488", rad=0.2)
draw_arrow((8.6, 3.85), (8.5, 1.9), "#0d9488", rad=-0.2)
draw_arrow((10.0, 1.35), (10.5, 1.35), "#0d9488")
draw_arrow((13.1, 1.35), (13.6, 1.35), "#0d9488", lw=2.8)

ax.text(
    5.05,
    3.05,
    "query\nembedding",
    ha="center",
    va="center",
    fontsize=9.3,
    style="italic",
    color="#0f766e",
)
ax.text(
    9.05,
    3.05,
    "top-k\nchunks",
    ha="center",
    va="center",
    fontsize=9.3,
    style="italic",
    color="#0f766e",
)
ax.text(
    10.25,
    2.2,
    "augmented prompt\n(query + context)",
    ha="center",
    va="center",
    fontsize=9.2,
    style="italic",
    color="#475569",
)
ax.text(
    13.35,
    2.2,
    "generated\nanswer",
    ha="center",
    va="center",
    fontsize=9.2,
    style="italic",
    color="#475569",
)

# ---------------------------------------------------------------------------
# Legend
# ---------------------------------------------------------------------------
legend_handles = [
    Line2D([0], [0], color="#0d9488", lw=2.6, label="Online data flow (per query)"),
    Line2D([0], [0], color="#64748b", lw=2.2, linestyle="--", label="Offline data flow (batch ingestion)"),
]
ax.legend(
    handles=legend_handles,
    loc="center",
    bbox_to_anchor=(13.1, 2.7),
    bbox_transform=ax.transData,
    fontsize=9.5,
    frameon=True,
    facecolor="white",
    edgecolor="#cbd5e1",
    framealpha=0.9,
)

fig.savefig(output_path, facecolor=fig.get_facecolor())
plt.close(fig)
