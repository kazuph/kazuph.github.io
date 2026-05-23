import sys
import warnings
import logging

# Suppress all warnings and matplotlib internal logs
warnings.filterwarnings("ignore")
logging.getLogger('matplotlib').setLevel(logging.ERROR)

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

def draw_card(ax, cx, cy, w, h, title, lines, accent_color, bg_color='#111827', border_color='#374151'):
    pad = 0.08
    box_x = cx - w/2 + pad
    box_y = cy - h/2 + pad
    box_w = w - 2*pad
    box_h = h - 2*pad
    
    card = mpatches.FancyBboxPatch(
        (box_x, box_y), box_w, box_h,
        boxstyle=f"round,pad={pad}",
        facecolor=bg_color, edgecolor=border_color,
        linewidth=1.5, zorder=3
    )
    ax.add_patch(card)
    
    dot_x = cx - w/2 + 0.25
    dot_y = cy + h/2 - 0.28
    dot = mpatches.Circle((dot_x, dot_y), radius=0.07, facecolor=accent_color, edgecolor='none', zorder=4)
    ax.add_patch(dot)
    
    ax.text(cx - w/2 + 0.42, cy + h/2 - 0.28, title, color='#FFFFFF', fontsize=10, fontweight='bold', ha='left', va='center', zorder=4)
    
    ax.plot([cx - w/2 + 0.15, cx + w/2 - 0.15], [cy + h/2 - 0.48, cy + h/2 - 0.48], color='#374151', linewidth=1, zorder=4)
    
    start_y = cy + h/2 - 0.72
    for i, line in enumerate(lines):
        ax.text(cx - w/2 + 0.18, start_y - i*0.22, line, color='#9CA3AF', fontsize=8, ha='left', va='center', zorder=4)

def draw_arrow(ax, start, end, color='#38BDF8', connectionstyle="arc3,rad=0.0", linestyle='solid', label='', label_pos=(0.5, 0.5), label_offset=(0, 0.12)):
    arrow = mpatches.FancyArrowPatch(
        start, end,
        connectionstyle=connectionstyle,
        arrowstyle="Simple,tail_width=1.2,head_width=5,head_length=5",
        color=color, linestyle=linestyle, linewidth=1, zorder=4
    )
    ax.add_patch(arrow)
    if label:
        lx = start[0] + (end[0] - start[0]) * label_pos[0] + label_offset[0]
        ly = start[1] + (end[1] - start[1]) * label_pos[1] + label_offset[1]
        ax.text(lx, ly, label, color='#9CA3AF', fontsize=7.5, ha='center', va='center', fontweight='medium', zorder=5)

def main():
    if len(sys.argv) < 2:
        print("Usage: python rag_diagram.py <output_path>")
        sys.exit(1)
        
    output_path = sys.argv[1]
    
    # Configure Matplotlib fonts to support Japanese on macOS, Windows, and Linux
    plt.rcParams['font.family'] = ['Hiragino Sans', 'Hiragino Kaku Gothic Pro', 'IPAexGothic', 'MS Gothic', 'DejaVu Sans', 'sans-serif']
    
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor('#0B0F19')
    ax.set_facecolor('#0B0F19')
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 9.6)
    ax.axis('off')
    
    # 1. Background Panels (Dotted container boxes)
    # Offline Ingestion Panel
    offline_panel = mpatches.FancyBboxPatch(
        (0.5 + 0.1, 6.0 + 0.1), 5.7 - 0.2, 2.7 - 0.2,
        boxstyle="round,pad=0.1",
        facecolor='#111827', edgecolor='#312E81',
        linestyle='--', linewidth=1.5, zorder=1
    )
    ax.add_patch(offline_panel)
    ax.text(0.7, 8.4, "事前の文書投入 (Offline Document Ingestion)", color='#818CF8', fontsize=11, fontweight='bold', ha='left', va='center', zorder=2)
    
    # Online Processing Panel
    online_panel = mpatches.FancyBboxPatch(
        (0.5 + 0.1, 0.3 + 0.1), 12.0 - 0.2, 3.9 - 0.2,
        boxstyle="round,pad=0.1",
        facecolor='#0F172A', edgecolor='#0F766E',
        linestyle='--', linewidth=1.5, zorder=1
    )
    ax.add_patch(online_panel)
    ax.text(0.7, 3.9, "オンライン処理 (Online Processing & RAG Flow)", color='#06B6D4', fontsize=11, fontweight='bold', ha='left', va='center', zorder=2)
    
    # 2. Draw Cards
    w, h = 2.4, 1.2
    
    # --- Offline Nodes ---
    draw_card(
        ax, cx=1.8, cy=7.2, w=w, h=h,
        title="1. Raw Documents",
        lines=["• PDF, Word, Web pages", "• Manuals & Policies"],
        accent_color='#818CF8'
    )
    
    draw_card(
        ax, cx=4.6, cy=7.2, w=w, h=h,
        title="2. Chunk & Embed",
        lines=["• Split text into chunks", "• text-embedding-3"],
        accent_color='#6366F1'
    )
    
    # --- Shared Node ---
    draw_card(
        ax, cx=8.5, cy=5.0, w=2.4, h=1.4,
        title="Vector Database",
        lines=["• Store chunk embeddings", "• High-dimensional index", "• Cosine Similarity search"],
        accent_color='#10B981', bg_color='#064E3B', border_color='#047857'
    )
    
    # --- Online Nodes ---
    draw_card(
        ax, cx=1.8, cy=2.5, w=w, h=h,
        title="3. User Query",
        lines=["• Natural language input", "• \"How do I configure X?\""],
        accent_color='#0EA5E9'
    )
    
    draw_card(
        ax, cx=4.6, cy=2.5, w=w, h=h,
        title="4. Embed & Retrieve",
        lines=["• Vectorize query", "• Search similar vectors"],
        accent_color='#06B6D4'
    )
    
    draw_card(
        ax, cx=8.5, cy=2.5, w=w, h=h,
        title="5. Context Chunks",
        lines=["• Top-K matching segments", "• Injected into prompt"],
        accent_color='#F59E0B'
    )
    
    draw_card(
        ax, cx=11.4, cy=2.5, w=w, h=h,
        title="6. LLM Engine",
        lines=["• Gemini 1.5 Pro / GPT-4", "• Generate grounded reply"],
        accent_color='#8B5CF6'
    )
    
    draw_card(
        ax, cx=11.4, cy=0.9, w=w, h=0.8,
        title="7. Generated Answer",
        lines=["• Accurate response with cites"],
        accent_color='#EC4899'
    )
    
    # 3. Draw Arrows & Connectors
    # --- Offline Flow ---
    draw_arrow(ax, (1.8 + w/2, 7.2), (4.6 - w/2, 7.2), color='#818CF8', label="Read & Process")
    draw_arrow(ax, (4.6 + w/2, 7.2), (8.5 - 1.2, 5.2), color='#6366F1', connectionstyle="arc3,rad=-0.1", label="Upsert Embeddings", label_pos=(0.4, 0.4), label_offset=(0, 0.15))
    
    # --- Online Flow ---
    draw_arrow(ax, (1.8 + w/2, 2.5), (4.6 - w/2, 2.5), color='#0EA5E9', label="Query Input")
    draw_arrow(ax, (4.6 + w/2, 2.5), (8.5 - 1.2, 4.8), color='#06B6D4', connectionstyle="arc3,rad=0.1", label="Vector Query", label_pos=(0.4, 0.4), label_offset=(0, 0.15))
    draw_arrow(ax, (8.5, 4.3), (8.5, 2.5 + h/2), color='#10B981', label="Top-K Results", label_pos=(0.5, 0.5), label_offset=(0.5, 0.0))
    draw_arrow(ax, (8.5 + w/2, 2.5), (11.4 - w/2, 2.5), color='#F59E0B', label="Inject Context")
    draw_arrow(ax, (11.4, 2.5 - h/2), (11.4, 0.9 + 0.4), color='#8B5CF6')
    
    draw_arrow(
        ax, (1.8, 2.5 - h/2), (11.4 - 0.4, 0.9),
        color='#9CA3AF', connectionstyle="arc3,rad=-0.22", linestyle='--',
        label="Raw Query Input (Prompt Assembly)", label_pos=(0.5, 0.5), label_offset=(0, -0.2)
    )
    
    # 4. Header Titles
    ax.text(0.5, 9.2, "RAG Pipeline Architecture", color='#FFFFFF', fontsize=18, fontweight='bold', ha='left', va='center')
    ax.text(0.5, 8.95, "Retrieval-Augmented Generation — Offline Document Ingestion vs. Online Query-Retrieval-Generation Flow", color='#6B7280', fontsize=9, ha='left', va='center')
    
    # 5. Top Right Badge
    badge_bg = mpatches.FancyBboxPatch(
        (10.7, 8.95), 1.8, 0.35,
        boxstyle="round,pad=0.05",
        facecolor='#1E293B', edgecolor='#4B5563',
        linewidth=1, zorder=2
    )
    ax.add_patch(badge_bg)
    ax.text(11.6, 9.12, "SYSTEM TOPOLOGY", color='#10B981', fontsize=8, fontweight='bold', ha='center', va='center', zorder=3)
    
    plt.tight_layout()
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    print(f"Successfully generated clean RAG diagram at: {output_path}")

if __name__ == '__main__':
    main()
