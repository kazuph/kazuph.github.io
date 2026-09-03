import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_rag_pipeline(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_offline_bg = '#F7FAFC'
    c_offline_border = '#A0AEC0'
    c_online_bg = '#EBF8FF'
    c_online_border = '#3182CE'
    c_db = '#DD6B20'
    c_llm = '#805AD5'

    fig.patch.set_facecolor('#FFFFFF')

    # Offline Indexing Zone (Top Box)
    ax.add_patch(patches.Rectangle((-5.5, 1.6), 11.0, 2.5, facecolor=c_offline_bg, edgecolor=c_offline_border, linestyle='--', linewidth=1.5))
    ax.text(-5.3, 3.8, 'Offline Indexing Pipeline', fontsize=14, fontweight='bold', color='#4A5568', va='top')

    # Online Retrieval & Generation Zone (Bottom Box)
    ax.add_patch(patches.Rectangle((-5.5, -3.8), 11.0, 4.8, facecolor=c_online_bg, edgecolor=c_online_border, linestyle='--', linewidth=1.5))
    ax.text(-5.3, 0.7, 'Online Retrieval & Generation', fontsize=14, fontweight='bold', color=c_online_border, va='top')

    # Helper function for blocks
    def add_block(x, y, w, h, title, subtitle, bg, border):
        rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle='round,pad=0.1,rounding_size=0.15',
                                      facecolor=bg, edgecolor=border, linewidth=2)
        ax.add_patch(rect)
        ax.text(x, y + 0.15, title, fontsize=12, fontweight='bold', ha='center', va='center', color='#1A202C')
        ax.text(x, y - 0.2, subtitle, fontsize=10, ha='center', va='center', color='#4A5568')

    # Offline Blocks
    add_block(-4.0, 2.7, 2.2, 1.0, 'Documents', 'PDF / MD / Web', '#FFFFFF', c_offline_border)
    add_block(-1.4, 2.7, 2.2, 1.0, 'Chunk & Embed', 'Text Splitter', '#FFFFFF', c_offline_border)

    # Vector DB (Cylinder shape)
    cylinder_x, cylinder_y = 1.4, 2.7
    ax.add_patch(patches.Ellipse((cylinder_x, cylinder_y + 0.4), 2.2, 0.4, facecolor='#FBD38D', edgecolor=c_db, linewidth=2, zorder=3))
    ax.add_patch(patches.Rectangle((cylinder_x - 1.1, cylinder_y - 0.4), 2.2, 0.8, facecolor='#FEEBC8', edgecolor='none', zorder=1))
    ax.plot([cylinder_x - 1.1, cylinder_x - 1.1], [cylinder_y - 0.4, cylinder_y + 0.4], color=c_db, linewidth=2, zorder=2)
    ax.plot([cylinder_x + 1.1, cylinder_x + 1.1], [cylinder_y - 0.4, cylinder_y + 0.4], color=c_db, linewidth=2, zorder=2)
    ax.add_patch(patches.Ellipse((cylinder_x, cylinder_y - 0.4), 2.2, 0.4, facecolor='#FEEBC8', edgecolor=c_db, linewidth=2, zorder=2))
    ax.text(cylinder_x, cylinder_y, 'Vector DB\nEmbeddings', fontsize=11, fontweight='bold', ha='center', va='center', color='#7B341E', zorder=4)

    # Online Blocks
    add_block(-4.0, -1.2, 2.2, 1.0, 'User Query', 'Prompt Input', '#FFFFFF', c_online_border)
    add_block(-1.4, -1.2, 2.2, 1.0, 'Embedding', 'Query Vector', '#FFFFFF', c_online_border)
    add_block(1.4, -1.2, 2.2, 1.0, 'Retriever', 'Similarity Search', '#FFFFFF', c_db)
    add_block(4.2, -1.2, 2.2, 1.0, 'LLM', 'Context + Query', '#E9D8FD', c_llm)
    add_block(4.2, -2.8, 2.2, 0.9, 'Answer', 'Response', '#FFFFFF', c_online_border)

    # Flow Arrows - Offline
    ax.annotate('', xy=(-2.5, 2.7), xytext=(-2.9, 2.7), arrowprops=dict(arrowstyle='->', lw=2, color='#718096'))
    ax.annotate('', xy=(0.3, 2.7), xytext=(-0.3, 2.7), arrowprops=dict(arrowstyle='->', lw=2, color='#718096'))
    ax.text(0.0, 2.9, 'Store Vectors', fontsize=10, fontweight='bold', ha='center', color='#718096')

    # Flow Arrows - Online
    ax.annotate('', xy=(-2.5, -1.2), xytext=(-2.9, -1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_online_border))
    ax.annotate('', xy=(0.3, -1.2), xytext=(-0.3, -1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_online_border))

    # Vector DB <-> Retriever
    ax.annotate('', xy=(1.4, -0.7), xytext=(1.4, 2.1), arrowprops=dict(arrowstyle='<->', lw=2, color=c_db))
    ax.text(1.55, 0.8, 'Top-K Context', fontsize=10, fontweight='bold', color=c_db, va='center')

    # Context to LLM
    ax.annotate('', xy=(3.1, -1.2), xytext=(2.5, -1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_online_border))

    # Direct User Query to LLM (Top curve)
    ax.plot([-4.0, -4.0, 4.2, 4.2], [-0.7, 0.2, 0.2, -0.7], color=c_online_border, linestyle='-', linewidth=1.8)
    ax.annotate('', xy=(4.2, -0.7), xytext=(4.2, 0.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_online_border))
    ax.text(0.1, 0.35, 'User Query Context', fontsize=10, fontweight='bold', color=c_online_border, ha='center')

    # LLM to Answer
    ax.annotate('', xy=(4.2, -2.35), xytext=(4.2, -1.7), arrowprops=dict(arrowstyle='->', lw=2.5, color=c_llm))

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'rag-pipeline.png'
    draw_rag_pipeline(output_file)
