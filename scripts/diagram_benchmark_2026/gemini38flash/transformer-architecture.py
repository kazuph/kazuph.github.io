import numpy as np
import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_transformer(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 860, "Transformer Model Architecture", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 830, "Attention Is All You Need (Vaswani et al., 2017)",
            ha="center", va="center", fontsize=12, color="#64748b")

    # Colors matching original paper style
    c_mha = "#fed7aa"   # Orange attention
    c_mha_b = "#ea580c"
    c_ffn = "#bae6fd"   # Blue feed forward
    c_ffn_b = "#0284c7"
    c_norm = "#fef08a"  # Yellow Add & Norm
    c_norm_b = "#ca8a04"
    c_embed = "#fbcfe8" # Pink embeddings
    c_embed_b = "#db2777"
    c_linear = "#bbf7d0" # Green output
    c_linear_b = "#16a34a"

    # ==================== ENCODER STACK (Left: center x = 350) ====================
    enc_x = 350
    # Outer dashed stack
    enc_box = patches.FancyBboxPatch((enc_x - 170, 260), 340, 470, boxstyle="round,pad=0.02",
                                    facecolor="#f8fafc", edgecolor="#94a3b8", lw=2, ls="--", zorder=1)
    ax.add_patch(enc_box)
    ax.text(enc_x - 170, 495, "N×", ha="center", va="center", fontsize=15, fontweight="bold",
            color="white", bbox=dict(boxstyle="round,pad=0.3", fc="#334155", ec="#0f172a", lw=1), zorder=3)
    ax.text(enc_x, 755, "Encoder", ha="center", va="bottom", fontsize=16, fontweight="bold", color="#1e293b")

    # Inputs Text & Arrow
    ax.text(enc_x, 50, "Inputs", ha="center", va="center", fontsize=13, fontweight="bold", color="#334155")
    ax.annotate("", xy=(enc_x, 110), xytext=(enc_x, 70),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Input Embedding
    emb_in = patches.FancyBboxPatch((enc_x - 120, 110), 240, 45, boxstyle="round,pad=0.02",
                                    facecolor=c_embed, edgecolor=c_embed_b, lw=1.8, zorder=2)
    ax.add_patch(emb_in)
    ax.text(enc_x, 132, "Input Embedding", ha="center", va="center", fontsize=12, fontweight="bold", color="#831843", zorder=3)

    ax.annotate("", xy=(enc_x, 180), xytext=(enc_x, 155),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # (+) Circle with Positional Encoding
    ax.add_patch(patches.Circle((enc_x, 195), 15, facecolor="white", edgecolor="#334155", lw=2, zorder=3))
    ax.text(enc_x, 195, "+", ha="center", va="center", fontsize=16, fontweight="bold", color="#334155", zorder=4)

    # Positional Encoding Icon
    ax.add_patch(patches.Circle((enc_x - 140, 195), 22, facecolor="white", edgecolor="#9333ea", lw=1.5, zorder=3))
    t_pe = np.linspace(-15, 15, 30)
    ax.plot(enc_x - 140 + t_pe, 195 + 10 * np.sin(t_pe * 0.25), color="#9333ea", lw=2, zorder=4)
    ax.text(enc_x - 140, 155, "Positional\nEncoding", ha="center", va="top", fontsize=9, fontweight="bold", color="#7e22ce")
    ax.annotate("", xy=(enc_x - 15, 195), xytext=(enc_x - 118, 195),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    ax.annotate("", xy=(enc_x, 260), xytext=(enc_x, 210),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # 1. Multi-Head Attention (Encoder)
    mha1 = patches.FancyBboxPatch((enc_x - 120, 320), 240, 50, boxstyle="round,pad=0.02",
                                  facecolor=c_mha, edgecolor=c_mha_b, lw=2, zorder=2)
    ax.add_patch(mha1)
    ax.text(enc_x, 345, "Multi-Head Attention", ha="center", va="center", fontsize=12, fontweight="bold", color="#9a3412", zorder=3)

    ax.annotate("", xy=(enc_x, 410), xytext=(enc_x, 370),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Add & Norm 1
    norm1 = patches.FancyBboxPatch((enc_x - 120, 410), 240, 50, boxstyle="round,pad=0.02",
                                   facecolor=c_norm, edgecolor=c_norm_b, lw=2, zorder=2)
    ax.add_patch(norm1)
    ax.text(enc_x, 435, "Add & Norm", ha="center", va="center", fontsize=12, fontweight="bold", color="#854d0e", zorder=3)

    # Residual Connection 1 (Bypassing MHA)
    ax.plot([enc_x, enc_x - 145, enc_x - 145, enc_x - 120], [285, 285, 435, 435], color="#64748b", lw=2, zorder=4)
    ax.annotate("", xy=(enc_x - 120, 435), xytext=(enc_x - 130, 435),
                arrowprops=dict(arrowstyle="-|>", color="#64748b", lw=2, mutation_scale=14), zorder=4)
    ax.plot(enc_x, 285, "o", color="#334155", ms=4, zorder=5)

    ax.annotate("", xy=(enc_x, 520), xytext=(enc_x, 460),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # 2. Feed Forward (Encoder)
    ffn1 = patches.FancyBboxPatch((enc_x - 120, 520), 240, 50, boxstyle="round,pad=0.02",
                                  facecolor=c_ffn, edgecolor=c_ffn_b, lw=2, zorder=2)
    ax.add_patch(ffn1)
    ax.text(enc_x, 545, "Feed Forward", ha="center", va="center", fontsize=12, fontweight="bold", color="#075985", zorder=3)

    ax.annotate("", xy=(enc_x, 610), xytext=(enc_x, 570),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Add & Norm 2
    norm2 = patches.FancyBboxPatch((enc_x - 120, 610), 240, 50, boxstyle="round,pad=0.02",
                                   facecolor=c_norm, edgecolor=c_norm_b, lw=2, zorder=2)
    ax.add_patch(norm2)
    ax.text(enc_x, 635, "Add & Norm", ha="center", va="center", fontsize=12, fontweight="bold", color="#854d0e", zorder=3)

    # Residual Connection 2 (Bypassing FFN)
    ax.plot([enc_x, enc_x - 145, enc_x - 145, enc_x - 120], [485, 485, 635, 635], color="#64748b", lw=2, zorder=4)
    ax.annotate("", xy=(enc_x - 120, 635), xytext=(enc_x - 130, 635),
                arrowprops=dict(arrowstyle="-|>", color="#64748b", lw=2, mutation_scale=14), zorder=4)
    ax.plot(enc_x, 485, "o", color="#334155", ms=4, zorder=5)


    # ==================== DECODER STACK (Right: center x = 850) ====================
    dec_x = 850
    dec_box = patches.FancyBboxPatch((dec_x - 170, 260), 340, 500, boxstyle="round,pad=0.02",
                                    facecolor="#f8fafc", edgecolor="#94a3b8", lw=2, ls="--", zorder=1)
    ax.add_patch(dec_box)
    ax.text(dec_x + 170, 510, "N×", ha="center", va="center", fontsize=15, fontweight="bold",
            color="white", bbox=dict(boxstyle="round,pad=0.3", fc="#334155", ec="#0f172a", lw=1), zorder=3)
    ax.text(dec_x, 775, "Decoder", ha="center", va="bottom", fontsize=16, fontweight="bold", color="#1e293b")

    # Outputs Text & Arrow
    ax.text(dec_x, 50, "Outputs (shifted right)", ha="center", va="center", fontsize=13, fontweight="bold", color="#334155")
    ax.annotate("", xy=(dec_x, 110), xytext=(dec_x, 70),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Output Embedding
    emb_out = patches.FancyBboxPatch((dec_x - 120, 110), 240, 45, boxstyle="round,pad=0.02",
                                     facecolor=c_embed, edgecolor=c_embed_b, lw=1.8, zorder=2)
    ax.add_patch(emb_out)
    ax.text(dec_x, 132, "Output Embedding", ha="center", va="center", fontsize=12, fontweight="bold", color="#831843", zorder=3)

    ax.annotate("", xy=(dec_x, 180), xytext=(dec_x, 155),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # (+) Circle with Positional Encoding
    ax.add_patch(patches.Circle((dec_x, 195), 15, facecolor="white", edgecolor="#334155", lw=2, zorder=3))
    ax.text(dec_x, 195, "+", ha="center", va="center", fontsize=16, fontweight="bold", color="#334155", zorder=4)

    ax.add_patch(patches.Circle((dec_x + 140, 195), 22, facecolor="white", edgecolor="#9333ea", lw=1.5, zorder=3))
    ax.plot(dec_x + 140 + t_pe, 195 + 10 * np.sin(t_pe * 0.25), color="#9333ea", lw=2, zorder=4)
    ax.text(dec_x + 140, 155, "Positional\nEncoding", ha="center", va="top", fontsize=9, fontweight="bold", color="#7e22ce")
    ax.annotate("", xy=(dec_x + 15, 195), xytext=(dec_x + 118, 195),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    ax.annotate("", xy=(dec_x, 260), xytext=(dec_x, 210),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # 1. Masked Multi-Head Attention
    masked_mha = patches.FancyBboxPatch((dec_x - 120, 275), 240, 50, boxstyle="round,pad=0.02",
                                        facecolor=c_mha, edgecolor=c_mha_b, lw=2, zorder=2)
    ax.add_patch(masked_mha)
    ax.text(dec_x, 300, "Masked Multi-Head Attention", ha="center", va="center", fontsize=11, fontweight="bold", color="#9a3412", zorder=3)

    ax.annotate("", xy=(dec_x, 360), xytext=(dec_x, 325),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Add & Norm 1 (Decoder)
    d_norm1 = patches.FancyBboxPatch((dec_x - 120, 360), 240, 45, boxstyle="round,pad=0.02",
                                     facecolor=c_norm, edgecolor=c_norm_b, lw=2, zorder=2)
    ax.add_patch(d_norm1)
    ax.text(dec_x, 382, "Add & Norm", ha="center", va="center", fontsize=12, fontweight="bold", color="#854d0e", zorder=3)

    # Residual Connection (Decoder 1)
    ax.plot([dec_x, dec_x + 145, dec_x + 145, dec_x + 120], [240, 240, 382, 382], color="#64748b", lw=2, zorder=4)
    ax.annotate("", xy=(dec_x + 120, 382), xytext=(dec_x + 130, 382),
                arrowprops=dict(arrowstyle="-|>", color="#64748b", lw=2, mutation_scale=14), zorder=4)
    ax.plot(dec_x, 240, "o", color="#334155", ms=4, zorder=5)

    ax.annotate("", xy=(dec_x, 440), xytext=(dec_x, 405),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # 2. Multi-Head (Cross) Attention
    cross_mha = patches.FancyBboxPatch((dec_x - 120, 440), 240, 50, boxstyle="round,pad=0.02",
                                       facecolor=c_mha, edgecolor=c_mha_b, lw=2, zorder=2)
    ax.add_patch(cross_mha)
    ax.text(dec_x, 465, "Multi-Head (Cross) Attention", ha="center", va="center", fontsize=11, fontweight="bold", color="#9a3412", zorder=3)

    # Cross-Attention K, V feed from Encoder Output
    ax.plot([enc_x, enc_x, 600, 600, dec_x - 120], [660, 700, 700, 465, 465], color="#ea580c", lw=3, zorder=6)
    ax.annotate("", xy=(dec_x - 120, 465), xytext=(dec_x - 130, 465),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=3, mutation_scale=16), zorder=6)
    ax.text(600, 715, "Keys (K), Values (V)", ha="center", va="bottom", fontsize=11, fontweight="bold", color="#ea580c",
            bbox=dict(boxstyle="round,pad=0.2", fc="#fff7ed", ec="#fdba74", lw=1), zorder=7)

    ax.annotate("", xy=(dec_x, 525), xytext=(dec_x, 490),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Add & Norm 2 (Decoder)
    d_norm2 = patches.FancyBboxPatch((dec_x - 120, 525), 240, 45, boxstyle="round,pad=0.02",
                                     facecolor=c_norm, edgecolor=c_norm_b, lw=2, zorder=2)
    ax.add_patch(d_norm2)
    ax.text(dec_x, 547, "Add & Norm", ha="center", va="center", fontsize=12, fontweight="bold", color="#854d0e", zorder=3)

    # Residual Connection (Decoder 2)
    ax.plot([dec_x, dec_x + 145, dec_x + 145, dec_x + 120], [420, 420, 547, 547], color="#64748b", lw=2, zorder=4)
    ax.annotate("", xy=(dec_x + 120, 547), xytext=(dec_x + 130, 547),
                arrowprops=dict(arrowstyle="-|>", color="#64748b", lw=2, mutation_scale=14), zorder=4)
    ax.plot(dec_x, 420, "o", color="#334155", ms=4, zorder=5)

    ax.annotate("", xy=(dec_x, 605), xytext=(dec_x, 570),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # 3. Feed Forward (Decoder)
    d_ffn = patches.FancyBboxPatch((dec_x - 120, 605), 240, 50, boxstyle="round,pad=0.02",
                                   facecolor=c_ffn, edgecolor=c_ffn_b, lw=2, zorder=2)
    ax.add_patch(d_ffn)
    ax.text(dec_x, 630, "Feed Forward", ha="center", va="center", fontsize=12, fontweight="bold", color="#075985", zorder=3)

    ax.annotate("", xy=(dec_x, 690), xytext=(dec_x, 655),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Add & Norm 3 (Decoder)
    d_norm3 = patches.FancyBboxPatch((dec_x - 120, 690), 240, 45, boxstyle="round,pad=0.02",
                                     facecolor=c_norm, edgecolor=c_norm_b, lw=2, zorder=2)
    ax.add_patch(d_norm3)
    ax.text(dec_x, 712, "Add & Norm", ha="center", va="center", fontsize=12, fontweight="bold", color="#854d0e", zorder=3)

    # Residual Connection (Decoder 3)
    ax.plot([dec_x, dec_x + 145, dec_x + 145, dec_x + 120], [585, 585, 712, 712], color="#64748b", lw=2, zorder=4)
    ax.annotate("", xy=(dec_x + 120, 712), xytext=(dec_x + 130, 712),
                arrowprops=dict(arrowstyle="-|>", color="#64748b", lw=2, mutation_scale=14), zorder=4)
    ax.plot(dec_x, 585, "o", color="#334155", ms=4, zorder=5)

    # Top Output Stages (Linear, Softmax, Probabilities)
    ax.annotate("", xy=(dec_x, 785), xytext=(dec_x, 735),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Linear Layer
    lin_box = patches.FancyBboxPatch((dec_x - 100, 785), 200, 35, boxstyle="round,pad=0.02",
                                     facecolor=c_linear, edgecolor=c_linear_b, lw=1.8, zorder=2)
    ax.add_patch(lin_box)
    ax.text(dec_x, 802, "Linear", ha="center", va="center", fontsize=12, fontweight="bold", color="#15803d", zorder=3)

    ax.annotate("", xy=(dec_x, 835), xytext=(dec_x, 820),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)

    # Softmax Layer
    soft_box = patches.FancyBboxPatch((dec_x - 100, 835), 200, 30, boxstyle="round,pad=0.02",
                                      facecolor=c_linear, edgecolor=c_linear_b, lw=1.8, zorder=2)
    ax.add_patch(soft_box)
    ax.text(dec_x, 850, "Softmax", ha="center", va="center", fontsize=12, fontweight="bold", color="#15803d", zorder=3)

    ax.annotate("", xy=(dec_x, 885), xytext=(dec_x, 865),
                arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2, mutation_scale=15), zorder=4)
    ax.text(dec_x, 890, "Output Probabilities", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#0f172a")

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transformer-architecture.py <output_path>")
        sys.exit(1)
    draw_transformer(sys.argv[1])
