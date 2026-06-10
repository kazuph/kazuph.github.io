import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_rect(ax, x, y, w, h, text, color, edgecolor='#333333', lw=1.5):
    rect = patches.Rectangle(
        (x - w/2, y - h/2), w, h,
        facecolor=color, edgecolor=edgecolor, linewidth=lw, zorder=3
    )
    ax.add_patch(rect)
    ax.text(x, y, text, ha='center', va='center', fontsize=9, weight='bold', color='#222222', zorder=4)

def draw_plus_node(ax, x, y, r=0.15):
    circle = patches.Circle((x, y), r, facecolor='#FFFFFF', edgecolor='#333333', linewidth=1.5, zorder=4)
    ax.add_patch(circle)
    ax.text(x, y, "+", ha='center', va='center', fontsize=12, weight='bold', zorder=5)

def draw_arrow(ax, x_start, y_start, x_end, y_end, lw=1.5, color='#555555'):
    ax.annotate('', xy=(x_end, y_end), xytext=(x_start, y_start),
                arrowprops=dict(arrowstyle="->", color=color, lw=lw, shrinkA=0, shrinkB=0), zorder=2)

def draw_skip_connection(ax, x_start, y_start, x_end, y_end, side='left', offset=1.0, box_w=1.8):
    sign = -1 if side == 'left' else 1
    x_mid = x_start + sign * offset
    x_box_edge = x_end + sign * (box_w / 2)
    
    path = [
        (x_start, y_start),
        (x_mid, y_start),
        (x_mid, y_end),
        (x_box_edge, y_end)
    ]
    xs, ys = zip(*path)
    ax.plot(xs, ys, color='#666666', linewidth=1.5, linestyle='--', zorder=2)
    ax.annotate('', xy=(x_box_edge, y_end), xytext=(x_mid, y_end),
                arrowprops=dict(arrowstyle="->", color='#666666', lw=1.5, shrinkA=0, shrinkB=0), zorder=2)

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <output_image_path>")
        sys.exit(1)
        
    output_path = sys.argv[1]
    
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 11.0)
    ax.axis('off')
    
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    
    x_enc = 2.8
    x_dec = 7.2
    
    c_mha = '#FFE599'    
    c_mmha = '#F8CECC'   
    c_ffn = '#DAE8FC'    
    c_norm = '#D5E8D4'   
    c_emb = '#E1D5E7'    
    c_pe = '#F5F5F5'     
    c_linear = '#FFF2CC' 
    
    bbox_props = dict(boxstyle="square,pad=0.1", fc="white", ec="none", alpha=0.85)
    
    # --- ENCODER ---
    ax.text(x_enc, 0.4, "Inputs", ha='center', va='center', fontsize=11, weight='bold')
    draw_rect(ax, x_enc, 1.1, 1.8, 0.5, "Input\nEmbedding", c_emb)
    draw_arrow(ax, x_enc, 0.6, x_enc, 0.85)
    
    draw_plus_node(ax, x_enc, 1.8)
    draw_arrow(ax, x_enc, 1.35, x_enc, 1.65)
    
    draw_rect(ax, x_enc - 1.3, 1.8, 1.1, 0.5, "Positional\nEncoding", c_pe)
    draw_arrow(ax, x_enc - 0.75, 1.8, x_enc - 0.15, 1.8)
    
    rect_enc = patches.Rectangle((x_enc - 1.1, 2.2), 2.2, 4.1, facecolor='none', edgecolor='#AAAAAA', linestyle='--', linewidth=1.5, zorder=1)
    ax.add_patch(rect_enc)
    ax.text(x_enc + 1.25, 2.3, "N x", fontsize=12, weight='bold', color='#555555')
    ax.text(x_enc, 6.6, "Encoder", fontsize=13, weight='bold', ha='center', color='#333333')
    
    draw_arrow(ax, x_enc, 1.95, x_enc, 2.25)
    
    ax.plot([x_enc, x_enc - 0.3], [2.25, 2.5], color='#555555', lw=1.5)
    ax.plot([x_enc, x_enc], [2.25, 2.5], color='#555555', lw=1.5)
    ax.plot([x_enc, x_enc + 0.3], [2.25, 2.5], color='#555555', lw=1.5)
    draw_arrow(ax, x_enc - 0.3, 2.5, x_enc - 0.3, 2.75)
    draw_arrow(ax, x_enc, 2.5, x_enc, 2.75)
    draw_arrow(ax, x_enc + 0.3, 2.5, x_enc + 0.3, 2.75)
    ax.text(x_enc - 0.3, 2.6, "V", fontsize=8, ha='center', va='center', bbox=bbox_props)
    ax.text(x_enc, 2.6, "K", fontsize=8, ha='center', va='center', bbox=bbox_props)
    ax.text(x_enc + 0.3, 2.6, "Q", fontsize=8, ha='center', va='center', bbox=bbox_props)
    
    draw_rect(ax, x_enc, 3.0, 1.8, 0.5, "Multi-Head\nAttention", c_mha)
    draw_arrow(ax, x_enc, 3.25, x_enc, 3.75)
    
    draw_skip_connection(ax, x_enc, 2.1, x_enc, 4.0, side='left', offset=1.0)
    
    draw_rect(ax, x_enc, 4.0, 1.8, 0.5, "Add & Norm", c_norm)
    draw_arrow(ax, x_enc, 4.25, x_enc, 4.75)
    
    draw_rect(ax, x_enc, 5.0, 1.8, 0.5, "Feed\nForward", c_ffn)
    draw_arrow(ax, x_enc, 5.25, x_enc, 5.75)
    
    draw_skip_connection(ax, x_enc, 4.4, x_enc, 6.0, side='left', offset=1.0)
    
    draw_rect(ax, x_enc, 6.0, 1.8, 0.5, "Add & Norm", c_norm)
    
    # --- DECODER ---
    ax.text(x_dec, 0.4, "Outputs\n(shifted right)", ha='center', va='center', fontsize=11, weight='bold')
    draw_rect(ax, x_dec, 1.1, 1.8, 0.5, "Output\nEmbedding", c_emb)
    draw_arrow(ax, x_dec, 0.65, x_dec, 0.85)
    
    draw_plus_node(ax, x_dec, 1.8)
    draw_arrow(ax, x_dec, 1.35, x_dec, 1.65)
    
    draw_rect(ax, x_dec + 1.3, 1.8, 1.1, 0.5, "Positional\nEncoding", c_pe)
    draw_arrow(ax, x_dec + 0.75, 1.8, x_dec + 0.15, 1.8)
    
    rect_dec = patches.Rectangle((x_dec - 1.1, 2.2), 2.2, 6.1, facecolor='none', edgecolor='#AAAAAA', linestyle='--', linewidth=1.5, zorder=1)
    ax.add_patch(rect_dec)
    ax.text(x_dec + 1.25, 2.3, "N x", fontsize=12, weight='bold', color='#555555')
    ax.text(x_dec, 8.6, "Decoder", fontsize=13, weight='bold', ha='center', color='#333333')
    
    draw_arrow(ax, x_dec, 1.95, x_dec, 2.25)
    
    ax.plot([x_dec, x_dec - 0.3], [2.25, 2.5], color='#555555', lw=1.5)
    ax.plot([x_dec, x_dec], [2.25, 2.5], color='#555555', lw=1.5)
    ax.plot([x_dec, x_dec + 0.3], [2.25, 2.5], color='#555555', lw=1.5)
    draw_arrow(ax, x_dec - 0.3, 2.5, x_dec - 0.3, 2.75)
    draw_arrow(ax, x_dec, 2.5, x_dec, 2.75)
    draw_arrow(ax, x_dec + 0.3, 2.5, x_dec + 0.3, 2.75)
    ax.text(x_dec - 0.3, 2.6, "V", fontsize=8, ha='center', va='center', bbox=bbox_props)
    ax.text(x_dec, 2.6, "K", fontsize=8, ha='center', va='center', bbox=bbox_props)
    ax.text(x_dec + 0.3, 2.6, "Q", fontsize=8, ha='center', va='center', bbox=bbox_props)
    
    draw_rect(ax, x_dec, 3.0, 1.8, 0.5, "Masked\nMulti-Head\nAttention", c_mmha)
    draw_arrow(ax, x_dec, 3.25, x_dec, 3.75)
    
    draw_skip_connection(ax, x_dec, 2.1, x_dec, 4.0, side='right', offset=1.0)
    
    draw_rect(ax, x_dec, 4.0, 1.8, 0.5, "Add & Norm", c_norm)
    draw_arrow(ax, x_dec, 4.25, x_dec, 4.75)
    ax.text(x_dec + 0.1, 4.5, "Q", fontsize=8, ha='left', va='center')
    
    draw_rect(ax, x_dec, 5.0, 1.8, 0.5, "Multi-Head\nAttention", c_mha)
    draw_arrow(ax, x_dec, 5.25, x_dec, 5.75)
    
    draw_skip_connection(ax, x_dec, 4.4, x_dec, 6.0, side='right', offset=1.0)
    
    # Connection from Encoder to Decoder Cross-Attention
    ax.plot([x_enc, x_enc], [6.25, 6.5], color='#555555', lw=1.5)
    ax.plot([x_enc, 5.0], [6.5, 6.5], color='#555555', lw=1.5)
    ax.plot([5.0, 5.0], [6.5, 5.0], color='#555555', lw=1.5)
    ax.plot([5.0, 5.7], [5.0, 5.0], color='#555555', lw=1.5)
    
    ax.plot([5.7, 5.7], [4.85, 5.15], color='#555555', lw=1.5)
    draw_arrow(ax, 5.7, 5.15, x_dec - 0.9, 5.15)
    draw_arrow(ax, 5.7, 4.85, x_dec - 0.9, 4.85)
    ax.text(x_dec - 0.95, 5.25, "K", fontsize=8, ha='right', va='center')
    ax.text(x_dec - 0.95, 4.7, "V", fontsize=8, ha='right', va='center')
    
    draw_rect(ax, x_dec, 6.0, 1.8, 0.5, "Add & Norm", c_norm)
    draw_arrow(ax, x_dec, 6.25, x_dec, 6.75)
    
    draw_rect(ax, x_dec, 7.0, 1.8, 0.5, "Feed\nForward", c_ffn)
    draw_arrow(ax, x_dec, 7.25, x_dec, 7.75)
    
    draw_skip_connection(ax, x_dec, 6.4, x_dec, 8.0, side='right', offset=1.0)
    
    draw_rect(ax, x_dec, 8.0, 1.8, 0.5, "Add & Norm", c_norm)
    
    # --- UPPER DECODER ---
    draw_arrow(ax, x_dec, 8.25, x_dec, 8.9)
    draw_rect(ax, x_dec, 9.1, 1.8, 0.4, "Linear", c_linear)
    draw_arrow(ax, x_dec, 9.3, x_dec, 9.5)
    draw_rect(ax, x_dec, 9.7, 1.8, 0.4, "Softmax", c_pe)
    draw_arrow(ax, x_dec, 9.9, x_dec, 10.15)
    ax.text(x_dec, 10.3, "Output\nProbabilities", ha='center', va='bottom', fontsize=11, weight='bold')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=100, bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    main()
