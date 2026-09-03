import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, Rectangle

def draw_transformer(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Header
    ax.text(600, 865, 'The Transformer Model Architecture', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 835, 'Vaswani et al. (2017) "Attention Is All You Need" Encoder-Decoder Structure',
            color='#94a3b8', fontsize=12, ha='center', va='center')

    # Color Palette
    c_mha = '#ea580c'
    c_ffn = '#0284c7'
    c_norm = '#eab308'
    c_emb = '#9333ea'
    c_smax = '#16a34a'

    # 1. ENCODER COLUMN (Left: cx=360)
    enc_cx = 360

    # Encoder Stack Boundary (Nx)
    ax.add_patch(FancyBboxPatch((210, 370), 300, 390, boxstyle='round,pad=0.02,rounding_size=12',
                                facecolor='#1e293b', edgecolor='#38bdf8', lw=2, ls='--', alpha=0.5))
    ax.text(230, 740, 'N×', color='#38bdf8', fontsize=18, fontweight='bold')
    ax.text(enc_cx, 740, 'ENCODER LAYER', color='#7dd3fc', fontsize=12, fontweight='bold', ha='center')

    # Input Tokens & Embedding
    ax.text(enc_cx, 160, 'Inputs', color='#f8fafc', fontsize=13, fontweight='bold', ha='center')
    ax.annotate('', xy=(enc_cx, 195), xytext=(enc_cx, 175),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((enc_cx - 100, 195), 200, 42, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_emb, edgecolor='#c084fc', lw=1.5))
    ax.text(enc_cx, 216, 'Input Embedding', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Sum + Positional Encoding
    ax.annotate('', xy=(enc_cx, 275), xytext=(enc_cx, 237),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(Circle((enc_cx, 285), 14, facecolor='#334155', edgecolor='#cbd5e1', lw=1.5))
    ax.text(enc_cx, 285, '+', color='#ffffff', fontsize=16, fontweight='bold', ha='center', va='center')

    ax.add_patch(FancyBboxPatch((enc_cx - 210, 265), 150, 38, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor='#1e293b', edgecolor='#38bdf8', lw=1.5))
    ax.text(enc_cx - 135, 284, 'Positional Encoding', color='#7dd3fc', fontsize=10, fontweight='bold', ha='center', va='center')
    ax.annotate('', xy=(enc_cx - 14, 285), xytext=(enc_cx - 60, 285),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2))

    ax.annotate('', xy=(enc_cx, 400), xytext=(enc_cx, 299),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))

    # Encoder Sublayer 1: Multi-Head Attention
    ax.add_patch(FancyBboxPatch((enc_cx - 100, 400), 200, 48, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_mha, edgecolor='#f97316', lw=1.5))
    ax.text(enc_cx, 424, 'Multi-Head Attention', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Add & Norm 1
    ax.annotate('', xy=(enc_cx, 485), xytext=(enc_cx, 448),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((enc_cx - 100, 485), 200, 40, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_norm, edgecolor='#facc15', lw=1.5))
    ax.text(enc_cx, 505, 'Add & Norm', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Residual 1
    ax.plot([enc_cx, enc_cx - 125, enc_cx - 125, enc_cx - 100], [350, 350, 505, 505], color='#fbbf24', ls='--', lw=1.8)
    ax.annotate('', xy=(enc_cx - 100, 505), xytext=(enc_cx - 105, 505),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=1.8))

    # Encoder Sublayer 2: Feed Forward
    ax.annotate('', xy=(enc_cx, 560), xytext=(enc_cx, 525),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((enc_cx - 100, 560), 200, 48, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_ffn, edgecolor='#38bdf8', lw=1.5))
    ax.text(enc_cx, 584, 'Feed Forward (FFN)', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Add & Norm 2
    ax.annotate('', xy=(enc_cx, 645), xytext=(enc_cx, 608),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((enc_cx - 100, 645), 200, 40, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_norm, edgecolor='#facc15', lw=1.5))
    ax.text(enc_cx, 665, 'Add & Norm', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Residual 2
    ax.plot([enc_cx, enc_cx - 125, enc_cx - 125, enc_cx - 100], [540, 540, 665, 665], color='#fbbf24', ls='--', lw=1.8)
    ax.annotate('', xy=(enc_cx - 100, 665), xytext=(enc_cx - 105, 665),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=1.8))

    # Encoder output to Decoder Cross-Attention
    ax.plot([enc_cx, enc_cx, 600, 600], [685, 720, 720, 520], color='#38bdf8', lw=2.5)
    ax.plot([600, 655], [530, 530], color='#38bdf8', lw=2.5)
    ax.annotate('', xy=(655, 530), xytext=(630, 530),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5))
    ax.plot([600, 655], [515, 515], color='#38bdf8', lw=2.5)
    ax.annotate('', xy=(655, 515), xytext=(630, 515),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5))
    ax.text(530, 735, 'Keys, Values (K, V)', color='#e0f2fe', fontsize=11, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0369a1', edgecolor='#38bdf8', lw=1))

    # 2. DECODER COLUMN (Right: cx=760)
    dec_cx = 760

    # Decoder Stack Boundary (Nx)
    ax.add_patch(FancyBboxPatch((610, 320), 300, 440, boxstyle='round,pad=0.02,rounding_size=12',
                                facecolor='#1e293b', edgecolor='#ec4899', lw=2, ls='--', alpha=0.5))
    ax.text(630, 740, 'N×', color='#ec4899', fontsize=18, fontweight='bold')
    ax.text(dec_cx, 740, 'DECODER LAYER', color='#f472b6', fontsize=12, fontweight='bold', ha='center')

    # Output Tokens & Embedding
    ax.text(dec_cx, 160, 'Outputs (Shifted Right)', color='#f8fafc', fontsize=13, fontweight='bold', ha='center')
    ax.annotate('', xy=(dec_cx, 195), xytext=(dec_cx, 175),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 195), 200, 42, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_emb, edgecolor='#c084fc', lw=1.5))
    ax.text(dec_cx, 216, 'Output Embedding', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Positional Encoding
    ax.annotate('', xy=(dec_cx, 275), xytext=(dec_cx, 237),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(Circle((dec_cx, 285), 14, facecolor='#334155', edgecolor='#cbd5e1', lw=1.5))
    ax.text(dec_cx, 285, '+', color='#ffffff', fontsize=16, fontweight='bold', ha='center', va='center')

    ax.add_patch(FancyBboxPatch((dec_cx + 60, 265), 150, 38, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor='#1e293b', edgecolor='#ec4899', lw=1.5))
    ax.text(dec_cx + 135, 284, 'Positional Encoding', color='#f472b6', fontsize=10, fontweight='bold', ha='center', va='center')
    ax.annotate('', xy=(dec_cx + 14, 285), xytext=(dec_cx + 60, 285),
                arrowprops=dict(arrowstyle='-|>', color='#ec4899', lw=2))

    ax.annotate('', xy=(dec_cx, 345), xytext=(dec_cx, 299),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))

    # Decoder Sublayer 1: Masked Multi-Head Attention
    ax.add_patch(FancyBboxPatch((dec_cx - 105, 345), 210, 45, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_mha, edgecolor='#f97316', lw=1.5))
    ax.text(dec_cx, 367, 'Masked Multi-Head Attn', color='#ffffff', fontsize=11, fontweight='bold', ha='center', va='center')

    # Add & Norm 1
    ax.annotate('', xy=(dec_cx, 420), xytext=(dec_cx, 390),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 420), 200, 36, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_norm, edgecolor='#facc15', lw=1.5))
    ax.text(dec_cx, 438, 'Add & Norm', color='#ffffff', fontsize=11, fontweight='bold', ha='center', va='center')

    # Residual 1
    ax.plot([dec_cx, dec_cx - 125, dec_cx - 125, dec_cx - 100], [320, 320, 438, 438], color='#fbbf24', ls='--', lw=1.8)
    ax.annotate('', xy=(dec_cx - 100, 438), xytext=(dec_cx - 105, 438),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=1.8))

    # Decoder Sublayer 2: Cross-Attention
    ax.annotate('', xy=(dec_cx, 495), xytext=(dec_cx, 456),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 105, 495), 210, 48, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_mha, edgecolor='#f97316', lw=1.5))
    ax.text(dec_cx, 524, 'Multi-Head Attention', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')
    ax.text(dec_cx, 506, '(Cross-Attention)', color='#fed7aa', fontsize=10, ha='center', va='center')

    # Add & Norm 2
    ax.annotate('', xy=(dec_cx, 570), xytext=(dec_cx, 543),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 570), 200, 36, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_norm, edgecolor='#facc15', lw=1.5))
    ax.text(dec_cx, 588, 'Add & Norm', color='#ffffff', fontsize=11, fontweight='bold', ha='center', va='center')

    # Residual 2
    ax.plot([dec_cx, dec_cx - 125, dec_cx - 125, dec_cx - 100], [475, 475, 588, 588], color='#fbbf24', ls='--', lw=1.8)
    ax.annotate('', xy=(dec_cx - 100, 588), xytext=(dec_cx - 105, 588),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=1.8))

    # Decoder Sublayer 3: FFN
    ax.annotate('', xy=(dec_cx, 635), xytext=(dec_cx, 606),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 635), 200, 44, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_ffn, edgecolor='#38bdf8', lw=1.5))
    ax.text(dec_cx, 657, 'Feed Forward (FFN)', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    # Add & Norm 3
    ax.annotate('', xy=(dec_cx, 705), xytext=(dec_cx, 679),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 705), 200, 36, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_norm, edgecolor='#facc15', lw=1.5))
    ax.text(dec_cx, 723, 'Add & Norm', color='#ffffff', fontsize=11, fontweight='bold', ha='center', va='center')

    # Residual 3
    ax.plot([dec_cx, dec_cx - 125, dec_cx - 125, dec_cx - 100], [620, 620, 723, 723], color='#fbbf24', ls='--', lw=1.8)
    ax.annotate('', xy=(dec_cx - 100, 723), xytext=(dec_cx - 105, 723),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=1.8))

    # Top Head: Linear & Softmax
    ax.annotate('', xy=(dec_cx, 770), xytext=(dec_cx, 741),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 770), 200, 36, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_emb, edgecolor='#c084fc', lw=1.5))
    ax.text(dec_cx, 788, 'Linear (Projection)', color='#ffffff', fontsize=11, fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(dec_cx, 825), xytext=(dec_cx, 806),
                arrowprops=dict(arrowstyle='-|>', color='#f8fafc', lw=2))
    ax.add_patch(FancyBboxPatch((dec_cx - 100, 825), 200, 36, boxstyle='round,pad=0.02,rounding_size=6',
                                facecolor=c_smax, edgecolor='#4ade80', lw=1.5))
    ax.text(dec_cx, 843, 'Softmax', color='#ffffff', fontsize=12, fontweight='bold', ha='center', va='center')

    ax.annotate('', xy=(dec_cx, 885), xytext=(dec_cx, 861),
                arrowprops=dict(arrowstyle='-|>', color='#4ade80', lw=2.5))
    ax.text(dec_cx, 895, 'Output Probabilities', color='#4ade80', fontsize=13, fontweight='bold', ha='center')

    # Summary Footer Box
    footer_text = r"$\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$" + "   |   " + r"$\mathrm{Residual}:\ \mathrm{LayerNorm}(x + \mathrm{SubLayer}(x))$"
    ax.text(600, 60, footer_text, color='#f8fafc', fontsize=12, ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#1e293b', edgecolor='#334155', lw=1.5))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_transformer(sys.argv[1])
    else:
        draw_transformer('transformer-architecture.png')
