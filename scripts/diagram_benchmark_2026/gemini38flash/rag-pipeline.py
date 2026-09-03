import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_rag_pipeline(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 840, "RAG Pipeline Architecture", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 805, "Retrieval-Augmented Generation: Offline Ingestion vs. Online Query Flow",
            ha="center", va="center", fontsize=12, color="#64748b")

    # LANE 1: OFFLINE DOCUMENT INGESTION (Top Lane)
    lane1 = patches.FancyBboxPatch((70, 520), 1060, 240, boxstyle="round,pad=0.02",
                                  facecolor="#faf5ff", edgecolor="#c084fc", lw=1.8, ls="--", zorder=1)
    ax.add_patch(lane1)
    ax.text(90, 740, "OFFLINE DOCUMENT INGESTION & INDEXING", ha="left", va="center",
            fontsize=12, fontweight="bold", color="#7e22ce",
            bbox=dict(boxstyle="round,pad=0.3", fc="#f3e8ff", ec="#c084fc", lw=1), zorder=2)

    # 1. Raw Documents
    docs_box = patches.FancyBboxPatch((100, 570), 140, 120, boxstyle="round,pad=0.02",
                                     facecolor="#ffffff", edgecolor="#cbd5e1", lw=1.5, zorder=3)
    ax.add_patch(docs_box)
    ax.text(170, 645, "Raw Docs", ha="center", va="center", fontsize=13, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(170, 615, "PDF / Web / DB", ha="center", va="center", fontsize=10, color="#64748b", zorder=4)

    ax.annotate("", xy=(290, 630), xytext=(240, 630),
                arrowprops=dict(arrowstyle="-|>", color="#9333ea", lw=2.5, mutation_scale=15), zorder=5)

    # 2. Chunking
    chunk_box = patches.FancyBboxPatch((290, 570), 150, 120, boxstyle="round,pad=0.02",
                                       facecolor="#ffffff", edgecolor="#cbd5e1", lw=1.5, zorder=3)
    ax.add_patch(chunk_box)
    ax.text(365, 645, "Chunking", ha="center", va="center", fontsize=13, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(365, 615, "Splitting & Meta", ha="center", va="center", fontsize=10, color="#64748b", zorder=4)

    ax.annotate("", xy=(490, 630), xytext=(440, 630),
                arrowprops=dict(arrowstyle="-|>", color="#9333ea", lw=2.5, mutation_scale=15), zorder=5)

    # 3. Embedding Model (Offline)
    embed_box = patches.FancyBboxPatch((490, 570), 170, 120, boxstyle="round,pad=0.02",
                                       facecolor="#f3e8ff", edgecolor="#9333ea", lw=2, zorder=3)
    ax.add_patch(embed_box)
    ax.text(575, 650, "Embedding Model", ha="center", va="center", fontsize=13, fontweight="bold", color="#6b21a8", zorder=4)
    ax.text(575, 620, "Text -> Vectors", ha="center", va="center", fontsize=11, color="#7e22ce", zorder=4)

    ax.annotate("", xy=(730, 630), xytext=(660, 630),
                arrowprops=dict(arrowstyle="-|>", color="#9333ea", lw=3, mutation_scale=18), zorder=5)
    ax.text(695, 645, "Index", ha="center", va="bottom", fontsize=10, fontweight="bold", color="#9333ea", zorder=6)

    # 4. Vector Database (Hub)
    vdb_box = patches.FancyBboxPatch((730, 550), 170, 160, boxstyle="round,pad=0.02",
                                     facecolor="#fef3c7", edgecolor="#d97706", lw=2.5, zorder=3)
    ax.add_patch(vdb_box)
    ax.text(815, 645, "Vector DB", ha="center", va="center", fontsize=15, fontweight="bold", color="#92400e", zorder=4)
    ax.text(815, 615, "ANN Index\nDense Vectors", ha="center", va="center", fontsize=10, color="#b45309", zorder=4)

    # LANE 2: ONLINE RETRIEVAL & GENERATION (Bottom Lane)
    lane2 = patches.FancyBboxPatch((70, 150), 1060, 340, boxstyle="round,pad=0.02",
                                  facecolor="#f0fdf4", edgecolor="#86efac", lw=1.8, ls="--", zorder=1)
    ax.add_patch(lane2)
    ax.text(90, 470, "ONLINE QUERY & GENERATION FLOW", ha="left", va="center",
            fontsize=12, fontweight="bold", color="#15803d",
            bbox=dict(boxstyle="round,pad=0.3", fc="#dcfce7", ec="#86efac", lw=1), zorder=2)

    # 1. User Query
    q_box = patches.FancyBboxPatch((100, 310), 140, 110, boxstyle="round,pad=0.02",
                                   facecolor="#ffffff", edgecolor="#0284c7", lw=2, zorder=3)
    ax.add_patch(q_box)
    ax.text(170, 380, "User Query", ha="center", va="center", fontsize=13, fontweight="bold", color="#0369a1", zorder=4)
    ax.text(170, 345, "Input Question", ha="center", va="center", fontsize=10, color="#64748b", zorder=4)

    ax.annotate("", xy=(290, 365), xytext=(240, 365),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=2.5, mutation_scale=15), zorder=5)

    # 2. Query Embedding
    qe_box = patches.FancyBboxPatch((290, 310), 160, 110, boxstyle="round,pad=0.02",
                                    facecolor="#e0f2fe", edgecolor="#0284c7", lw=2, zorder=3)
    ax.add_patch(qe_box)
    ax.text(370, 380, "Query Embed", ha="center", va="center", fontsize=13, fontweight="bold", color="#0369a1", zorder=4)
    ax.text(370, 345, "Query Vector", ha="center", va="center", fontsize=11, color="#0284c7", zorder=4)

    # Query Vector -> Vector DB search arrow
    ax.plot([450, 750], [365, 365], color="#0284c7", lw=2.5, zorder=5)
    ax.annotate("", xy=(750, 550), xytext=(750, 365),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=2.5, mutation_scale=15), zorder=5)
    ax.text(580, 380, "Similarity Search (Top-K)", ha="center", va="bottom", fontsize=11, fontweight="bold", color="#0284c7",
            bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#bae6fd", lw=1), zorder=6)

    # Vector DB -> Retrieved Context (arrow down)
    ax.annotate("", xy=(860, 420), xytext=(860, 550),
                arrowprops=dict(arrowstyle="-|>", color="#d97706", lw=3, mutation_scale=18), zorder=5)

    # 3. Retrieved Context
    ctx_box = patches.FancyBboxPatch((770, 315), 180, 105, boxstyle="round,pad=0.02",
                                     facecolor="#fef3c7", edgecolor="#f59e0b", lw=2, zorder=3)
    ax.add_patch(ctx_box)
    ax.text(860, 380, "Retrieved Context", ha="center", va="center", fontsize=13, fontweight="bold", color="#92400e", zorder=4)
    ax.text(860, 345, "Top-K Relevant Chunks", ha="center", va="center", fontsize=10, color="#b45309", zorder=4)

    # 4. Prompt Synthesis
    # User query to prompt synthesis
    ax.plot([170, 170, 480], [310, 220, 220], color="#0284c7", lw=2, ls="--", zorder=5)
    ax.annotate("", xy=(480, 220), xytext=(470, 220),
                arrowprops=dict(arrowstyle="-|>", color="#0284c7", lw=2, mutation_scale=15), zorder=5)
    ax.text(260, 232, "User Query", ha="center", va="bottom", fontsize=10, color="#0284c7", zorder=6)

    # Context to prompt synthesis
    ax.plot([860, 860, 680], [315, 220, 220], color="#d97706", lw=2, ls="--", zorder=5)
    ax.annotate("", xy=(680, 220), xytext=(690, 220),
                arrowprops=dict(arrowstyle="-|>", color="#d97706", lw=2, mutation_scale=15), zorder=5)
    ax.text(770, 232, "Retrieved Chunks", ha="center", va="bottom", fontsize=10, color="#d97706", zorder=6)

    synth_box = patches.FancyBboxPatch((480, 175), 200, 95, boxstyle="round,pad=0.02",
                                       facecolor="#ffffff", edgecolor="#64748b", lw=2, zorder=3)
    ax.add_patch(synth_box)
    ax.text(580, 235, "Prompt Synthesis", ha="center", va="center", fontsize=13, fontweight="bold", color="#1e293b", zorder=4)
    ax.text(580, 205, "System + Context + Query", ha="center", va="center", fontsize=10, color="#64748b", zorder=4)

    ax.annotate("", xy=(720, 220), xytext=(680, 220),
                arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=3, mutation_scale=18), zorder=5)

    # 5. Foundation LLM
    llm_box = patches.FancyBboxPatch((720, 170), 160, 105, boxstyle="round,pad=0.02",
                                     facecolor="#dcfce7", edgecolor="#16a34a", lw=2.5, zorder=3)
    ax.add_patch(llm_box)
    ax.text(800, 235, "Foundation LLM", ha="center", va="center", fontsize=14, fontweight="bold", color="#15803d", zorder=4)
    ax.text(800, 205, "Reasoning & Synthesis", ha="center", va="center", fontsize=10, color="#166534", zorder=4)

    ax.annotate("", xy=(930, 220), xytext=(880, 220),
                arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=3, mutation_scale=18), zorder=5)

    # 6. Grounded Answer
    ans_box = patches.FancyBboxPatch((930, 170), 160, 105, boxstyle="round,pad=0.02",
                                     facecolor="#ffffff", edgecolor="#16a34a", lw=2, zorder=3)
    ax.add_patch(ans_box)
    ax.text(1010, 235, "Grounded Answer", ha="center", va="center", fontsize=13, fontweight="bold", color="#15803d", zorder=4)
    ax.text(1010, 205, "Accurate & Fact-Checked", ha="center", va="center", fontsize=10, color="#64748b", zorder=4)

    # Bottom Legend
    ax.text(600, 95, "RAG: Combines Parametric Knowledge (LLM) with Non-Parametric Memory (Vector DB)",
            ha="center", va="center", fontsize=11, color="#475569",
            bbox=dict(boxstyle="round,pad=0.4", fc="#f8fafc", ec="#cbd5e1", lw=1))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rag-pipeline.py <output_path>")
        sys.exit(1)
    draw_rag_pipeline(sys.argv[1])
