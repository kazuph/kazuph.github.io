import sys

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse, Rectangle

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#ffffff")

COL = {"blue": "#2563eb", "orange": "#d97706", "violet": "#7c3aed",
       "green": "#059669", "gray": "#6b7280", "teal": "#0d9488"}


def box(cx, cy, w, h, color, label):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.12",
                 linewidth=2, edgecolor=color, facecolor=color + "26", zorder=3))
    ax.text(cx, cy, label, ha="center", va="center", fontsize=12,
            color="#1f2933", zorder=4)
    return (cx, cy, w, h)


def cyl(cx, cy, w, h, color, label):
    ax.add_patch(Ellipse((cx, cy + h / 2), w, h * 0.3, facecolor=color + "26",
                 edgecolor=color, lw=2, zorder=3))
    ax.add_patch(Rectangle((cx - w / 2, cy - h / 2), w, h, facecolor=color + "26",
                 edgecolor="none", zorder=3))
    ax.add_patch(Ellipse((cx, cy - h / 2), w, h * 0.3, facecolor=color + "26",
                 edgecolor=color, lw=2, zorder=3))
    ax.plot([cx - w / 2, cx - w / 2], [cy - h / 2, cy + h / 2], color=color, lw=2, zorder=3)
    ax.plot([cx + w / 2, cx + w / 2], [cy - h / 2, cy + h / 2], color=color, lw=2, zorder=3)
    ax.text(cx, cy, label, ha="center", va="center", fontsize=12, color="#1f2933", zorder=4)


def arrow(p0, p1, color, dashed=False):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=16,
                 color=color, lw=2, ls="--" if dashed else "-", zorder=5))


# lanes
ax.add_patch(FancyBboxPatch((0.4, 5.2), 6.2, 2.7, boxstyle="round,pad=0.02,rounding_size=0.1",
             facecolor="#f3f4f6", edgecolor="#9ca3af", ls="--", lw=1.5, zorder=0))
ax.text(0.7, 7.6, "Offline ingestion", fontsize=12, fontweight="bold", color="#6b7280", zorder=1)
ax.add_patch(FancyBboxPatch((0.4, 0.7), 11.2, 3.9, boxstyle="round,pad=0.02,rounding_size=0.1",
             facecolor="#eff6ff", edgecolor="#93c5fd", lw=1.5, zorder=0))
ax.text(0.7, 1.1, "Online query", fontsize=12, fontweight="bold", color="#2563eb", zorder=1)

# offline row
docs = box(1.7, 6.5, 2.2, 1.0, COL["gray"], "Documents")
chunk = box(4.7, 6.5, 2.2, 1.0, COL["gray"], "Chunk /\nEmbed")

# online row
q = box(1.5, 3.0, 2.0, 1.0, COL["blue"], "User\nQuery")
emb = box(4.0, 3.0, 2.0, 1.0, COL["blue"], "Embed /\nRetrieve")
cyl(6.5, 5.5, 1.8, 1.3, COL["teal"], "Vector\nDB")
ctx = box(6.9, 3.0, 2.0, 1.0, COL["orange"], "Retrieved\nContext")
llm = box(9.3, 3.0, 1.6, 1.0, COL["violet"], "LLM")
ans = box(11.0, 3.0, 1.4, 1.0, COL["green"], "Answer")

# online edges
arrow((2.5, 3.0), (3.0, 3.0), COL["blue"])
arrow((5.0, 3.2), (6.0, 4.9), COL["blue"])
arrow((6.5, 4.85), (6.9, 3.55), COL["blue"])
arrow((7.9, 3.0), (8.5, 3.0), COL["blue"])
arrow((10.1, 3.0), (10.3, 3.0), COL["blue"])
# query -> llm prompt (bottom path: down, across, up into LLM)
ax.plot([1.5, 1.5, 9.3, 9.3], [2.5, 1.9, 1.9, 2.5], color=COL["blue"], lw=2, zorder=2)
ax.add_patch(FancyArrowPatch((9.3, 2.0), (9.3, 2.5), arrowstyle="-|>",
             mutation_scale=16, color=COL["blue"], lw=2, zorder=2))
ax.text(5.4, 1.6, "original query (prompt)", fontsize=10, color="#2563eb", ha="center")

# offline edges
arrow((2.8, 6.5), (3.6, 6.5), COL["gray"], dashed=True)
arrow((5.5, 6.4), (6.5, 6.2), COL["gray"], dashed=True)
ax.text(6.0, 6.55, "index", fontsize=10, color="#6b7280")

ax.text(6, 8.5, "RAG Pipeline", ha="center", fontsize=18, fontweight="bold", color="#1f2933")

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
