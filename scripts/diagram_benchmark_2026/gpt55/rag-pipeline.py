import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

def add_box(ax, x, y, w, h, text, facecolor, edgecolor="#263238", fontsize=14):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.018,rounding_size=0.035",
        linewidth=1.8,
        edgecolor=edgecolor,
        facecolor=facecolor,
        zorder=2
    )
    ax.add_patch(box)
    ax.text(
        x + w / 2, y + h / 2, text,
        ha="center", va="center",
        fontsize=fontsize,
        color="#102027",
        fontweight="semibold",
        zorder=3
    )
    return box

def add_arrow(ax, start, end, color="#455A64", lw=2.2, style="-|>", rad=0.0, dashed=False):
    arrow = FancyArrowPatch(
        start, end,
        arrowstyle=style,
        mutation_scale=18,
        linewidth=lw,
        color=color,
        connectionstyle=f"arc3,rad={rad}",
        linestyle="--" if dashed else "-",
        zorder=4
    )
    ax.add_patch(arrow)

def add_lane(ax, x, y, w, h, title, color):
    lane = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.012,rounding_size=0.025",
        linewidth=1.2,
        edgecolor=color,
        facecolor=color,
        alpha=0.08,
        zorder=1
    )
    ax.add_patch(lane)
    ax.text(
        x + 0.03, y + h - 0.055, title,
        ha="left", va="center",
        fontsize=15,
        color=color,
        fontweight="bold",
        zorder=3
    )

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python rag_pipeline.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#F7F9FB")
    ax.set_facecolor("#F7F9FB")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    add_lane(ax, 0.06, 0.58, 0.88, 0.30, "Offline Document Ingestion", "#5E35B1")
    add_lane(ax, 0.06, 0.12, 0.88, 0.36, "Online RAG Query Flow", "#0277BD")

    docs = add_box(ax, 0.11, 0.70, 0.16, 0.09, "Documents", "#EDE7F6", "#5E35B1")
    chunk = add_box(ax, 0.34, 0.70, 0.18, 0.09, "Chunk / Embed", "#EDE7F6", "#5E35B1")
    vdb = add_box(ax, 0.62, 0.68, 0.20, 0.13, "Vector DB", "#E8F5E9", "#2E7D32", 16)

    query = add_box(ax, 0.10, 0.29, 0.16, 0.10, "User Query", "#E3F2FD", "#0277BD")
    retrieve = add_box(ax, 0.34, 0.29, 0.19, 0.10, "Embed / Retrieve", "#E3F2FD", "#0277BD")
    context = add_box(ax, 0.62, 0.29, 0.20, 0.10, "Retrieved\nContext", "#FFF8E1", "#F9A825")
    llm = add_box(ax, 0.46, 0.15, 0.16, 0.09, "LLM", "#FCE4EC", "#C2185B", 16)
    answer = add_box(ax, 0.74, 0.15, 0.16, 0.09, "Answer", "#E0F2F1", "#00796B", 16)

    add_arrow(ax, (0.27, 0.745), (0.34, 0.745), "#5E35B1")
    add_arrow(ax, (0.52, 0.745), (0.62, 0.745), "#5E35B1")

    add_arrow(ax, (0.26, 0.34), (0.34, 0.34), "#0277BD")
    add_arrow(ax, (0.53, 0.34), (0.62, 0.34), "#0277BD")
    add_arrow(ax, (0.72, 0.68), (0.44, 0.39), "#2E7D32", dashed=True, rad=0.12)
    add_arrow(ax, (0.72, 0.29), (0.56, 0.24), "#F9A825", rad=0.05)
    add_arrow(ax, (0.62, 0.195), (0.74, 0.195), "#00796B")

    ax.text(
        0.72, 0.53, "semantic search",
        ha="center", va="center",
        fontsize=11,
        color="#546E7A",
        fontstyle="italic"
    )
    ax.text(
        0.58, 0.255, "grounding context",
        ha="center", va="center",
        fontsize=11,
        color="#546E7A",
        fontstyle="italic"
    )

    plt.savefig(output_path, dpi=100, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)

if __name__ == "__main__":
    main()
