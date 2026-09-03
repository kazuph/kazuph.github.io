import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_transformer_architecture(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 5.0)
    ax.set_aspect('equal')
    ax.axis('off')

    c_enc_bg = '#FFF5F5'
    c_enc_border = '#E53E3E'
    c_dec_bg = '#EBF8FF'
    c_dec_border = '#3182CE'
    c_mha = '#F6AD55'
    c_ffn = '#68D391'
    c_addnorm = '#F6E05E'
    c_embed = '#B794F4'

    fig.patch.set_facecolor('#FFFFFF')

    # Container Boxes
    # Encoder Box (Left)
    ax.add_patch(patches.Rectangle((-5.2, -1.8), 4.2, 6.2, facecolor=c_enc_bg, edgecolor=c_enc_border, linestyle='--', linewidth=1.5))
    ax.text(-5.0, 4.2, r'Encoder (N$\times$)', fontsize=14, fontweight='bold', color=c_enc_border, va='top')

    # Decoder Box (Right)
    ax.add_patch(patches.Rectangle((0.2, -1.8), 4.8, 6.2, facecolor=c_dec_bg, edgecolor=c_dec_border, linestyle='--', linewidth=1.5))
    ax.text(0.4, 4.2, r'Decoder (N$\times$)', fontsize=14, fontweight='bold', color=c_dec_border, va='top')

    # Helper function for blocks
    def add_block(x, y, w, h, text, bg):
        rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle='round,pad=0.08,rounding_size=0.12',
                                      facecolor=bg, edgecolor='#2D3748', linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x, y, text, fontsize=11, fontweight='bold', ha='center', va='center', color='#1A202C')

    # Encoder Stack
    ax.text(-3.1, -3.8, 'Inputs', fontsize=12, fontweight='bold', ha='center')
    add_block(-3.1, -3.0, 3.0, 0.7, 'Input Embedding', c_embed)
    add_block(-3.1, -1.0, 3.0, 0.8, 'Multi-Head Attention', c_mha)
    add_block(-3.1, 0.2, 3.0, 0.7, 'Add & Norm', c_addnorm)
    add_block(-3.1, 1.8, 3.0, 0.8, 'Feed Forward', c_ffn)
    add_block(-3.1, 3.0, 3.0, 0.7, 'Add & Norm', c_addnorm)

    # Encoder Flow
    ax.annotate('', xy=(-3.1, -2.65), xytext=(-3.1, -3.5), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(-3.1, -1.4), xytext=(-3.1, -2.65), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(-3.1, -0.15), xytext=(-3.1, -0.6), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(-3.1, 1.4), xytext=(-3.1, 0.55), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(-3.1, 2.65), xytext=(-3.1, 2.2), arrowprops=dict(arrowstyle='->', lw=1.8))

    # Encoder Residuals
    ax.plot([-3.1, -4.8, -4.8, -3.1], [-1.8, -1.8, 0.2, 0.2], color='#718096', linewidth=1.5)
    ax.annotate('', xy=(-3.1, 0.2), xytext=(-4.8, 0.2), arrowprops=dict(arrowstyle='->', lw=1.5, color='#718096'))

    ax.plot([-3.1, -4.8, -4.8, -3.1], [1.0, 1.0, 3.0, 3.0], color='#718096', linewidth=1.5)
    ax.annotate('', xy=(-3.1, 3.0), xytext=(-4.8, 3.0), arrowprops=dict(arrowstyle='->', lw=1.5, color='#718096'))


    # Decoder Stack
    ax.text(2.6, -3.8, 'Outputs (shifted right)', fontsize=12, fontweight='bold', ha='center')
    add_block(2.6, -3.0, 3.2, 0.7, 'Output Embedding', c_embed)
    add_block(2.6, -1.0, 3.2, 0.8, 'Masked Multi-Head Attn', c_mha)
    add_block(2.6, 0.0, 3.2, 0.6, 'Add & Norm', c_addnorm)
    add_block(2.6, 1.2, 3.2, 0.8, 'Multi-Head Cross Attn', c_mha)
    add_block(2.6, 2.2, 3.2, 0.6, 'Add & Norm', c_addnorm)
    add_block(2.6, 3.2, 3.2, 0.7, 'Feed Forward', c_ffn)
    add_block(2.6, 4.2, 3.2, 0.6, 'Add & Norm', c_addnorm)

    add_block(2.6, 4.9, 3.2, 0.5, 'Linear', '#FED7D7')
    add_block(2.6, 5.5, 3.2, 0.5, 'Softmax', '#FBB6CE')
    ax.text(2.6, 6.1, 'Output Probabilities', fontsize=12, fontweight='bold', ha='center')

    # Decoder Flow
    ax.annotate('', xy=(2.6, -2.65), xytext=(2.6, -3.5), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, -1.4), xytext=(2.6, -2.65), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, -0.3), xytext=(2.6, -0.6), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 0.8), xytext=(2.6, 0.3), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 1.9), xytext=(2.6, 1.6), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 2.85), xytext=(2.6, 2.5), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 3.9), xytext=(2.6, 3.55), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 4.65), xytext=(2.6, 4.5), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 5.25), xytext=(2.6, 5.15), arrowprops=dict(arrowstyle='->', lw=1.8))
    ax.annotate('', xy=(2.6, 5.85), xytext=(2.6, 5.75), arrowprops=dict(arrowstyle='->', lw=1.8))

    # Cross-Attention Arrow from Encoder to Decoder
    ax.plot([-1.6, -0.3, -0.3, 1.0], [3.0, 3.0, 1.2, 1.2], color=c_enc_border, linewidth=2.0)
    ax.annotate('', xy=(1.0, 1.2), xytext=(-0.3, 1.2), arrowprops=dict(arrowstyle='->', lw=2.0, color=c_enc_border))
    ax.text(-0.1, 1.35, 'Keys, Values', fontsize=10, fontweight='bold', color=c_enc_border)

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'transformer-architecture.png'
    draw_transformer_architecture(output_file)
