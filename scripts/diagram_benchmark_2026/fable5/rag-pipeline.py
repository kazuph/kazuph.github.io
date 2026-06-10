import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle

USER = ("#4A78A8", "#D9E5F1")
PROC = ("#4E8C5C", "#DCEDE0")
STORE = ("#B06E32", "#F5E3D0")
LLM = ("#8C5AA0", "#EADDF0")
DOC = ("#6E6E78", "#E8E8EC")


def box(ax, xy, w, h, colors, title, sub):
    edge, fill = colors
    ax.add_patch(FancyBboxPatch((xy[0] - w / 2, xy[1] - h / 2), w, h,
                                boxstyle="round,pad=0.06,rounding_size=0.14",
                                facecolor=fill, edgecolor=edge, linewidth=2.2))
    ax.text(xy[0], xy[1] + 0.22, title, ha="center", va="center",
            fontsize=13, weight="bold", family="sans-serif")
    ax.text(xy[0], xy[1] - 0.32, sub, ha="center", va="center",
            fontsize=10.5, family="sans-serif", color="#46464E")


def cylinder(ax, xy, w, h, colors, title, sub):
    edge, fill = colors
    rx, ry = w / 2, 0.28
    ax.add_patch(Rectangle((xy[0] - rx, xy[1] - h / 2 + ry), w, h - 2 * ry,
                           facecolor=fill, edgecolor="none"))
    ax.add_patch(Ellipse((xy[0], xy[1] - h / 2 + ry), w, 2 * ry,
                         facecolor=fill, edgecolor=edge, linewidth=2.2))
    ax.plot([xy[0] - rx, xy[0] - rx], [xy[1] - h / 2 + ry, xy[1] + h / 2 - ry],
            color=edge, linewidth=2.2)
    ax.plot([xy[0] + rx, xy[0] + rx], [xy[1] - h / 2 + ry, xy[1] + h / 2 - ry],
            color=edge, linewidth=2.2)
    ax.add_patch(Ellipse((xy[0], xy[1] + h / 2 - ry), w, 2 * ry,
                         facecolor=fill, edgecolor=edge, linewidth=2.2))
    ax.text(xy[0], xy[1] + 0.1, title, ha="center", va="center",
            fontsize=13, weight="bold", family="sans-serif")
    ax.text(xy[0], xy[1] - 0.45, sub, ha="center", va="center",
            fontsize=10.5, family="sans-serif", color="#46464E")


def arrow(ax, p0, p1, color, label=None, lpos=None, style="-|>",
          linestyle="solid", ha="center"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=style, mutation_scale=18,
                                 color=color, linewidth=2.4,
                                 linestyle=linestyle, shrinkA=3, shrinkB=3))
    if label:
        ax.text(lpos[0], lpos[1], label, fontsize=10.5, ha=ha, va="center",
                family="sans-serif", color="#5A5A64")


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-2.4, 14.2)
    ax.set_ylim(-4.6, 8.2)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(5.9, 7.6, "RAG pipeline", fontsize=19, weight="bold",
            family="sans-serif", ha="center")

    # lanes
    ax.add_patch(FancyBboxPatch((-2.0, 3.0), 15.8, 3.6,
                                boxstyle="round,pad=0.05,rounding_size=0.2",
                                facecolor="#F2F2F4", edgecolor="none"))
    ax.text(-1.7, 6.2, "Offline: document ingestion (run beforehand)",
            fontsize=12, weight="bold", family="sans-serif", color="#6E6E78",
            ha="left")
    ax.add_patch(FancyBboxPatch((-2.0, -4.2), 15.8, 6.4,
                                boxstyle="round,pad=0.05,rounding_size=0.2",
                                facecolor="#EBF2F8", edgecolor="none"))
    ax.text(-1.7, 1.8, "Online: query-time pipeline", fontsize=12,
            weight="bold", family="sans-serif", color="#4A78A8", ha="left")

    # offline row
    box(ax, (0, 4.4), 2.9, 1.4, DOC, "Documents", "PDF / wiki / code")
    box(ax, (4.3, 4.4), 3.1, 1.4, PROC, "Chunk + Embed", "split, vectorize")
    cylinder(ax, (8.6, 4.3), 2.5, 2.1, STORE, "Vector DB", "embeddings + meta")

    arrow(ax, (1.5, 4.4), (2.7, 4.4), "#6E6E78", "raw text", (2.1, 4.75))
    arrow(ax, (5.9, 4.4), (7.3, 4.4), "#4E8C5C", "vectors", (6.6, 4.75))

    # online row A
    box(ax, (0, -0.6), 2.9, 1.4, USER, "User Query", "natural language")
    box(ax, (4.3, -0.6), 3.3, 1.4, PROC, "Embed + Retrieve", "top-k search")
    box(ax, (8.6, -0.6), 3.3, 1.4, STORE, "Retrieved Context", "k passages")

    arrow(ax, (1.5, -0.6), (2.6, -0.6), "#4A78A8", "query", (2.05, -0.25))
    arrow(ax, (6.0, -0.6), (6.9, -0.6), "#4E8C5C", "passages", (6.45, -0.25))

    # online row B
    box(ax, (8.6, -3.2), 3.3, 1.4, LLM, "LLM", "generate with context")
    box(ax, (12.4, -3.2), 2.9, 1.4, USER, "Answer", "grounded response")

    arrow(ax, (8.6, -1.32), (8.6, -2.48), "#B06E32", "context", (9.0, -1.9),
          ha="left")
    ax.plot([0, 0, 6.9], [-1.32, -3.2, -3.2], color="#4A78A8", linewidth=2.4)
    arrow(ax, (6.5, -3.2), (6.92, -3.2), "#4A78A8", "original question",
          (3.3, -2.85))
    arrow(ax, (10.27, -3.2), (10.93, -3.2), "#8C5AA0", "response",
          (10.6, -2.8))

    # cross-lane similarity search
    arrow(ax, (4.3, 0.12), (8.0, 3.25), "#B06E32", "similarity search",
          (5.6, 2.0), style="<|-|>", linestyle=(0, (6, 4)), ha="left")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
