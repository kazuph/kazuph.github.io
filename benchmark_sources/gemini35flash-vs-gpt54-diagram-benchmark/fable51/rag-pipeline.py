import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle

BG = "#FAFBFD"
OFFLINE, OFFLINE_E = "#F3F0FA", "#7B5EA7"
ONLINE, ONLINE_E = "#EAF4FB", "#2A6F97"
DOC, DOC_E = "#FFF4DC", "#C98A1B"
VEC, VEC_E = "#E3F2EA", "#2E7D4F"
LLM, LLM_E = "#FDE7E7", "#C0392B"
INK = "#233044"
SIG = "#3A3F47"
FONT = ["Hiragino Sans", "Noto Sans CJK JP", "DejaVu Sans"]


def box(ax, cx, cy, w, h, title, sub, fc, ec, z=5):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.12",
                                facecolor=fc, edgecolor=ec, linewidth=1.6, zorder=z))
    ax.text(cx, cy + 0.17, title, ha="center", va="center", fontsize=10.5, fontweight="bold", color=INK, fontfamily=FONT, zorder=z + 1)
    ax.text(cx, cy - 0.2, sub, ha="center", va="center", fontsize=8.5, color=INK, fontfamily=FONT, zorder=z + 1)


def arrow(ax, pts, color=SIG, ls="-", lw=1.6, z=4):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=color, lw=lw, linestyle=ls, zorder=z)
    ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=14, color=color, linewidth=lw,
                                 linestyle=ls, zorder=z + 1, shrinkA=0, shrinkB=0))


def lab(ax, x, y, text, ha="center", size=8.5, color=INK, z=8):
    ax.text(x, y, text, ha=ha, va="center", fontsize=size, color=color, fontfamily=FONT, zorder=z,
            bbox=dict(facecolor=BG, edgecolor="none", pad=1.2))


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.6, 12.4)
    ax.set_ylim(-0.6, 8.4)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-0.6, -0.6), 13, 9, facecolor=BG, zorder=0))
    ax.text(-0.3, 8.0, "RAGパイプライン: オフラインの文書投入とオンラインの検索拡張生成", ha="left", va="center",
            fontsize=15, fontweight="bold", color=INK, fontfamily=FONT)

    # lanes
    ax.add_patch(FancyBboxPatch((-0.3, 5.2), 12.4, 2.3, boxstyle="round,pad=0,rounding_size=0.25", facecolor=OFFLINE,
                                edgecolor=OFFLINE_E, linewidth=1.2, linestyle="--", zorder=1))
    ax.text(-0.1, 7.25, "OFFLINE: 文書投入（バッチ。初回と更新時だけ実行）", ha="left", va="center", fontsize=11,
            fontweight="bold", color=OFFLINE_E, fontfamily=FONT, zorder=2)
    ax.add_patch(FancyBboxPatch((-0.3, 0.2), 12.4, 4.5, boxstyle="round,pad=0,rounding_size=0.25", facecolor=ONLINE,
                                edgecolor=ONLINE_E, linewidth=1.2, linestyle="--", zorder=1))
    ax.text(-0.1, 4.45, "ONLINE: リクエストごとに実行（レイテンシが重要）", ha="left", va="center", fontsize=11,
            fontweight="bold", color=ONLINE_E, fontfamily=FONT, zorder=2)

    # offline row
    box(ax, 0.9, 6.1, 1.9, 1.05, "Documents", "PDF / HTML / wiki", DOC, DOC_E)
    box(ax, 3.4, 6.1, 1.9, 1.05, "Chunking", "分割 + オーバーラップ", "white", OFFLINE_E)
    box(ax, 6.0, 6.1, 2.1, 1.05, "Embedding model", "テキスト → ベクトル", "white", OFFLINE_E)
    box(ax, 8.6, 6.1, 1.9, 1.05, "Index build", "HNSW / IVF", "white", OFFLINE_E)
    arrow(ax, [(1.85, 6.1), (2.45, 6.1)])
    arrow(ax, [(4.35, 6.1), (4.95, 6.1)]); lab(ax, 4.65, 6.35, "chunks")
    arrow(ax, [(7.05, 6.1), (7.65, 6.1)]); lab(ax, 7.35, 6.35, "vectors")

    # vector DB cylinder
    cx, cy, rw, rh = 10.9, 4.95, 1.1, 0.22
    ax.add_patch(Rectangle((cx - rw, cy - 0.75), 2 * rw, 1.5, facecolor=VEC, edgecolor="none", zorder=5))
    ax.plot([cx - rw, cx - rw], [cy - 0.75, cy + 0.75], color=VEC_E, lw=1.6, zorder=6)
    ax.plot([cx + rw, cx + rw], [cy - 0.75, cy + 0.75], color=VEC_E, lw=1.6, zorder=6)
    ax.add_patch(Ellipse((cx, cy - 0.75), 2 * rw, 2 * rh, facecolor=VEC, edgecolor=VEC_E, linewidth=1.6, zorder=5))
    ax.add_patch(Ellipse((cx, cy + 0.75), 2 * rw, 2 * rh, facecolor="#CFE8D8", edgecolor=VEC_E, linewidth=1.6, zorder=6))
    ax.text(cx, cy + 0.2, "Vector DB", ha="center", va="center", fontsize=10.5, fontweight="bold", color=INK, fontfamily=FONT, zorder=7)
    ax.text(cx, cy - 0.15, "vectors + metadata", ha="center", va="center", fontsize=8.5, color=INK, fontfamily=FONT, zorder=7)
    ax.text(cx, cy - 0.45, "+ chunk text", ha="center", va="center", fontsize=8.5, color=INK, fontfamily=FONT, zorder=7)
    arrow(ax, [(9.55, 6.1), (10.9, 6.1), (10.9, 5.95)], color=OFFLINE_E, ls="--"); lab(ax, 10.2, 6.35, "upsert", color=OFFLINE_E)

    # online row
    box(ax, 0.8, 2.6, 1.7, 1.05, "User Query", "「〜するには？」", "white", ONLINE_E)
    box(ax, 3.4, 2.6, 2.1, 1.05, "Embed / Retrieve", "query → vector, top-k ANN", "white", ONLINE_E)
    box(ax, 6.2, 2.6, 2.0, 1.05, "Retrieved Context", "k chunks + 出典", VEC, VEC_E)
    box(ax, 6.2, 0.95, 2.3, 1.05, "Prompt builder", "system + context + query", "white", ONLINE_E)
    box(ax, 8.9, 2.6, 1.6, 1.05, "LLM", "generation", LLM, LLM_E)
    box(ax, 11.0, 2.6, 1.6, 1.05, "Answer", "+ citations", "white", ONLINE_E)

    arrow(ax, [(1.65, 2.6), (2.35, 2.6)]); lab(ax, 2.0, 2.85, "query")
    arrow(ax, [(3.4, 3.13), (3.4, 3.9), (9.8, 3.9), (9.8, 4.95)]); lab(ax, 6.6, 4.12, "query vector")
    arrow(ax, [(10.9, 4.0), (10.9, 3.6), (7.2, 3.6), (7.2, 3.13)]); lab(ax, 9.0, 3.38, "top-k hits")
    arrow(ax, [(4.45, 2.6), (5.2, 2.6)])
    arrow(ax, [(6.2, 2.07), (6.2, 1.48)]); lab(ax, 6.55, 1.78, "context", ha="left")
    arrow(ax, [(0.8, 2.07), (0.8, 0.95), (5.05, 0.95)]); lab(ax, 2.9, 1.18, "query")
    arrow(ax, [(7.35, 0.95), (8.9, 0.95), (8.9, 2.07)]); lab(ax, 8.1, 1.18, "augmented prompt")
    arrow(ax, [(9.7, 2.6), (10.2, 2.6)]); lab(ax, 9.95, 2.85, "tokens")
    arrow(ax, [(11.0, 3.13), (11.0, 3.35), (0.8, 3.35), (0.8, 3.13)]); lab(ax, 5.0, 3.35, "response back to the user")

    ax.text(-0.1, -0.15, "共通部品: オフライン（索引作成）とオンライン（クエリ）で同じ埋め込みモデルを使い、ベクトル空間を揃える。",
            ha="left", va="center", fontsize=9, color="#5C6470", fontfamily=FONT)
    ax.text(-0.1, -0.45, "グラウンディング: LLM は取得した chunk だけを根拠に回答し、出典を引用する。",
            ha="left", va="center", fontsize=9, color="#5C6470", fontfamily=FONT)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
