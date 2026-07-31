import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle

INK = "#0F172A"
MUTED = "#64748B"
OFFLINE = "#6366F1"
OFFLINE_BG = "#EEF2FF"
ONLINE = "#0891B2"
ONLINE_BG = "#ECFEFF"
STORE = "#7C3AED"
MODEL = "#DB2777"
ACCENT = "#059669"


def band(ax, x, y, w, h, face, edge, label, label_color):
    ax.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0,rounding_size=2.2",
            facecolor=face,
            edgecolor=edge,
            linewidth=1.6,
            linestyle=(0, (6, 4)),
            zorder=1,
        )
    )
    ax.text(
        x + 3,
        y + h - 2.6,
        label,
        fontsize=11,
        fontweight="bold",
        color=label_color,
        va="center",
        ha="left",
        zorder=2,
    )


def box(ax, cx, cy, w, h, title, sub, edge, fill="#FFFFFF", title_size=13):
    x, y = cx - w / 2.0, cy - h / 2.0
    ax.add_patch(
        FancyBboxPatch(
            (x + 0.6, y - 0.7),
            w,
            h,
            boxstyle="round,pad=0,rounding_size=1.8",
            facecolor="#0F172A",
            edgecolor="none",
            alpha=0.07,
            zorder=2,
        )
    )
    ax.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0,rounding_size=1.8",
            facecolor=fill,
            edgecolor=edge,
            linewidth=2.2,
            zorder=3,
        )
    )
    ax.add_patch(Rectangle((x, y), 0.9, h, facecolor=edge, edgecolor="none", zorder=4))
    if sub:
        ax.text(cx, cy + 1.5, title, fontsize=title_size, fontweight="bold", color=INK,
                ha="center", va="center", zorder=5)
        ax.text(cx, cy - 2.2, sub, fontsize=9, color=MUTED, ha="center", va="center", zorder=5)
    else:
        ax.text(cx, cy, title, fontsize=title_size, fontweight="bold", color=INK,
                ha="center", va="center", zorder=5)


def cylinder(ax, cx, cy, w, h, title, sub, color):
    ry = 1.6
    ax.add_patch(
        Ellipse((cx, cy - h / 2.0), w, ry * 2, facecolor="#F5F3FF", edgecolor=color,
                linewidth=2.2, zorder=3)
    )
    ax.add_patch(
        Rectangle((cx - w / 2.0, cy - h / 2.0), w, h, facecolor="#F5F3FF", edgecolor="none",
                  zorder=3)
    )
    ax.plot([cx - w / 2.0, cx - w / 2.0], [cy - h / 2.0, cy + h / 2.0], color=color, lw=2.2,
            zorder=4, solid_capstyle="butt")
    ax.plot([cx + w / 2.0, cx + w / 2.0], [cy - h / 2.0, cy + h / 2.0], color=color, lw=2.2,
            zorder=4, solid_capstyle="butt")
    ax.add_patch(
        Ellipse((cx, cy + h / 2.0), w, ry * 2, facecolor="#EDE9FE", edgecolor=color,
                linewidth=2.2, zorder=5)
    )
    ax.text(cx, cy - 0.2, title, fontsize=13, fontweight="bold", color=INK, ha="center",
            va="center", zorder=6)
    ax.text(cx, cy - 4.0, sub, fontsize=9, color=MUTED, ha="center", va="center", zorder=6)


def arrow(ax, p1, p2, color, rad=0.0, dashed=False, lw=2.2):
    ax.add_patch(
        FancyArrowPatch(
            p1,
            p2,
            arrowstyle="-|>",
            mutation_scale=22,
            connectionstyle="arc3,rad=%s" % rad,
            linewidth=lw,
            linestyle=(0, (5, 3)) if dashed else "solid",
            color=color,
            shrinkA=0,
            shrinkB=0,
            zorder=6,
        )
    )


def badge(ax, x, y, n, color):
    ax.add_patch(Circle((x, y), 1.7, facecolor=color, edgecolor="#FFFFFF", linewidth=1.6,
                        zorder=8))
    ax.text(x, y - 0.05, str(n), fontsize=9.5, fontweight="bold", color="#FFFFFF",
            ha="center", va="center", zorder=9)


def flow_label(ax, x, y, text, color, ha="center", size=9):
    ax.text(x, y, text, fontsize=size, color=color, ha=ha, va="center", zorder=7,
            bbox=dict(boxstyle="round,pad=0.28", facecolor="#FFFFFF", edgecolor="none",
                      alpha=0.9))


def main(out_path):
    fig = plt.figure(figsize=(12, 9), dpi=100, facecolor="#FFFFFF")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 90)
    ax.axis("off")

    ax.text(60, 85.4, "RAG Pipeline Architecture", fontsize=21, fontweight="bold",
            color=INK, ha="center", va="center")
    ax.text(60, 81.2, "Retrieval-Augmented Generation  ·  offline indexing + online query flow",
            fontsize=11, color=MUTED, ha="center", va="center")

    band(ax, 5, 58, 110, 19, OFFLINE_BG, OFFLINE,
         "OFFLINE  ·  Document Ingestion & Indexing", OFFLINE)
    box(ax, 22, 65, 26, 10, "Documents", "PDF / Web / Wiki", OFFLINE)
    box(ax, 57, 65, 26, 10, "Chunk & Clean", "split · normalize", OFFLINE)
    box(ax, 95, 65, 30, 10, "Embedding Model", "text → vectors", MODEL)
    arrow(ax, (35.2, 65), (43.6, 65), OFFLINE, dashed=True)
    arrow(ax, (70.2, 65), (79.6, 65), OFFLINE, dashed=True)

    cylinder(ax, 95, 44, 30, 12, "Vector DB", "embeddings + metadata", STORE)
    arrow(ax, (95, 59.8), (95, 46.2), OFFLINE, dashed=True)
    flow_label(ax, 97.5, 53, "upsert index", OFFLINE, ha="left")

    band(ax, 5, 4, 110, 30, ONLINE_BG, ONLINE, "ONLINE  ·  Query Time", ONLINE)
    box(ax, 22, 24, 26, 9, "User Query", "natural language", ONLINE)
    box(ax, 57, 24, 26, 9, "Embed & Retrieve", "encode · top-k search", MODEL)
    box(ax, 95, 24, 30, 9, "Retrieved Context", "top-k relevant chunks", ONLINE)
    box(ax, 95, 11, 30, 9, "LLM", "generate with context", MODEL)
    box(ax, 22, 11, 26, 9, "Answer", "grounded response", ACCENT)

    arrow(ax, (35.2, 24), (43.6, 24), ONLINE)
    arrow(ax, (70.2, 26.5), (79.4, 41.4), ONLINE, rad=0.25)
    flow_label(ax, 71.5, 35.5, "query vector", ONLINE, ha="left")
    arrow(ax, (95, 36.2), (95, 28.9), STORE)
    flow_label(ax, 92.5, 32.5, "similar chunks", STORE, ha="right")
    arrow(ax, (95, 19.3), (95, 15.8), ONLINE)
    flow_label(ax, 92.5, 17.5, "prompt = query + context", ONLINE, ha="right")
    arrow(ax, (79.6, 11), (35.4, 11), ACCENT)
    flow_label(ax, 57.5, 12.8, "generated answer, grounded in retrieved evidence", ACCENT)

    badge(ax, 11.4, 28.4, 1, ONLINE)
    badge(ax, 46.4, 28.4, 2, MODEL)
    badge(ax, 81.4, 38.6, 3, STORE)
    badge(ax, 82.4, 28.4, 4, ONLINE)
    badge(ax, 82.4, 15.4, 5, MODEL)
    badge(ax, 11.4, 15.4, 6, ACCENT)

    ax.text(60, 1.6,
            "Dashed arrows: offline indexing path      Solid arrows: online request path",
            fontsize=9.5, color=MUTED, ha="center", va="center")

    fig.savefig(out_path, dpi=100, facecolor=fig.get_facecolor())
    plt.close(fig)


if __name__ == "__main__":
    main(sys.argv[1])
