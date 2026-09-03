import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

def draw_rag_pipeline(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0b0f19')
    ax.set_facecolor('#0b0f19')

    # Title & Subtitle
    ax.text(600, 860, 'Retrieval-Augmented Generation (RAG) Architecture', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 825, 'End-to-End Pipeline: Offline Ingestion & Online Real-Time Synthesis',
            color='#94a3b8', fontsize=13, ha='center', va='center')

    # 1. OFFLINE INGESTION CONTAINER (Top)
    ax.add_patch(FancyBboxPatch((60, 560), 1080, 230, boxstyle='round,pad=0.02,rounding_size=14',
                                facecolor='#1e293b', edgecolor='#fbbf24', lw=2, ls='--', alpha=0.6))
    ax.text(210, 790, 'OFFLINE INGESTION & INDEXING', color='#fef3c7', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#854d0e', edgecolor='#fbbf24', lw=1.5))

    # Ingestion Blocks
    # Knowledge Base
    ax.add_patch(FancyBboxPatch((90, 600), 170, 150, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#451a03', edgecolor='#fbbf24', lw=1.5))
    ax.text(175, 715, 'Knowledge Base', color='#fef3c7', fontsize=14, fontweight='bold', ha='center')
    ax.text(175, 650, 'PDFs, Manuals,\nWikis, Docs, DBs', color='#d1d5db', fontsize=11, ha='center')

    # Chunker
    ax.annotate('', xy=(290, 675), xytext=(260, 675),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.add_patch(FancyBboxPatch((290, 600), 180, 150, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#451a03', edgecolor='#fbbf24', lw=1.5))
    ax.text(380, 715, 'Document Chunker', color='#fef3c7', fontsize=14, fontweight='bold', ha='center')
    ax.text(380, 655, 'Recursive Splitter\n512 tok / overlap 50', color='#fef08a', fontsize=11, ha='center')

    # Embedding Model (Offline)
    ax.annotate('', xy=(500, 675), xytext=(470, 675),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.add_patch(FancyBboxPatch((500, 600), 180, 150, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#451a03', edgecolor='#fbbf24', lw=1.5))
    ax.text(590, 715, 'Embedding Model', color='#fef3c7', fontsize=14, fontweight='bold', ha='center')
    ax.text(590, 655, 'Dense Vectorizer\nDim = 1536 / 3072', color='#fef08a', fontsize=11, ha='center')

    # Vector DB
    ax.annotate('', xy=(720, 675), xytext=(680, 675),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.add_patch(FancyBboxPatch((720, 580), 380, 180, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#064e3b', edgecolor='#34d399', lw=2))
    ax.text(910, 725, 'Vector Database', color='#ecfdf5', fontsize=16, fontweight='bold', ha='center')
    ax.text(910, 680, 'HNSW / IVF Index (Cosine / L2)', color='#a7f3d0', fontsize=12, ha='center')
    ax.text(910, 630, 'Embeddings + Metadata Index', color='#6ee7b7', fontsize=11, ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#022c22', edgecolor='#34d399', lw=1))

    # 2. ONLINE INFERENCE CONTAINER (Bottom)
    ax.add_patch(FancyBboxPatch((60, 140), 1080, 390, boxstyle='round,pad=0.02,rounding_size=14',
                                facecolor='#1e293b', edgecolor='#38bdf8', lw=2, ls='--', alpha=0.6))
    ax.text(230, 530, 'ONLINE REAL-TIME INFERENCE PIPELINE', color='#e0f2fe', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#0369a1', edgecolor='#38bdf8', lw=1.5))

    # User Query
    ax.add_patch(FancyBboxPatch((90, 370), 170, 130, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#172554', edgecolor='#38bdf8', lw=2))
    ax.text(175, 465, 'User Query', color='#7dd3fc', fontsize=14, fontweight='bold', ha='center')
    ax.text(175, 415, '"How does RAG\nwork?"', color='#f8fafc', fontsize=11, style='italic', ha='center')

    # Query Embedder
    ax.annotate('', xy=(290, 435), xytext=(260, 435),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=3, mutation_scale=16))
    ax.add_patch(FancyBboxPatch((290, 370), 180, 130, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#172554', edgecolor='#38bdf8', lw=2))
    ax.text(380, 465, 'Query Embedder', color='#7dd3fc', fontsize=14, fontweight='bold', ha='center')
    ax.text(380, 415, r'$q_{vec} = \mathrm{embed}(query)$' + '\nSimilarity Ready', color='#38bdf8', fontsize=11, ha='center')

    # Query -> Vector DB search arrow
    ax.plot([470, 550, 550, 720], [435, 435, 590, 590], color='#38bdf8', lw=2.5)
    ax.annotate('', xy=(720, 590), xytext=(650, 590),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5, mutation_scale=15))
    ax.text(600, 565, 'Top-k ANN Search', color='#38bdf8', fontsize=11, fontweight='bold', ha='center')

    # Vector DB -> Context return arrow
    ax.plot([850, 850, 680], [580, 350, 350], color='#34d399', lw=2.5)
    ax.annotate('', xy=(680, 350), xytext=(750, 350),
                arrowprops=dict(arrowstyle='-|>', color='#34d399', lw=2.5, mutation_scale=15))
    ax.text(780, 365, 'Top-k Chunks ($k=5$)', color='#34d399', fontsize=11, fontweight='bold', ha='center')

    # Retrieved Context Box
    ax.add_patch(FancyBboxPatch((500, 240), 180, 170, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#064e3b', edgecolor='#34d399', lw=2))
    ax.text(590, 380, 'Retrieved Context', color='#a7f3d0', fontsize=13, fontweight='bold', ha='center')
    ax.text(590, 315, '• Snippet #1 (score: 0.93)\n• Snippet #2 (score: 0.89)\n• Re-ranked Top-k',
            color='#6ee7b7', fontsize=10, ha='center')

    # Direct query pass
    ax.plot([175, 175, 490], [370, 270, 270], color='#38bdf8', ls='--', lw=2)
    ax.annotate('', xy=(490, 270), xytext=(400, 270),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2, mutation_scale=14))
    ax.text(320, 285, 'Direct Query Augment', color='#7dd3fc', fontsize=10)

    # Context + Query -> LLM
    ax.annotate('', xy=(740, 280), xytext=(680, 280),
                arrowprops=dict(arrowstyle='-|>', color='#c084fc', lw=3, mutation_scale=16))

    # LLM Generator Box
    ax.add_patch(FancyBboxPatch((740, 180), 360, 200, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#4c1d95', edgecolor='#c084fc', lw=2))
    ax.text(920, 350, 'LLM Generator', color='#f3e8ff', fontsize=16, fontweight='bold', ha='center')
    llm_prompt = "PROMPT TEMPLATE:\nSystem: Answer using retrieved context.\nContext: [Retrieved Passages]\nUser: [Original Query]"
    ax.text(920, 260, llm_prompt, color='#e9d5ff', fontsize=10, ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#2e1065', edgecolor='#c084fc', lw=1))

    # 3. FINAL ANSWER CARD (Bottom)
    ax.add_patch(FancyBboxPatch((60, 25), 1080, 85, boxstyle='round,pad=0.02,rounding_size=10',
                                facecolor='#1e293b', edgecolor='#34d399', lw=2))
    ax.text(80, 75, 'Synthesized Grounded Answer:', color='#34d399', fontsize=13, fontweight='bold', ha='left')
    ax.text(80, 48, '"RAG retrieves relevant domain documents and augments the LLM prompt to deliver accurate, cited answers."',
            color='#f8fafc', fontsize=11, ha='left')

    # LLM to Answer Arrow
    ax.annotate('', xy=(920, 110), xytext=(920, 180),
                arrowprops=dict(arrowstyle='-|>', color='#34d399', lw=3, mutation_scale=16))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_rag_pipeline(sys.argv[1])
    else:
        draw_rag_pipeline('rag-pipeline.png')
