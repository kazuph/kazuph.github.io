import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle, Ellipse

def draw_michelson(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Title & Subtitle
    ax.text(600, 850, 'Michelson Interferometer', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 815, 'Optical Wave Amplitude Splitting & Phase Interference Geometry',
            color='#94a3b8', fontsize=13, ha='center', va='center')

    # Optical Center at (600, 450)
    cx, cy = 600, 450

    # Optical Baselines (Dashed)
    ax.plot([120, 1080], [cy, cy], color='#334155', ls='--', lw=1.5)
    ax.plot([cx, cx], [120, 760], color='#334155', ls='--', lw=1.5)

    # 1. LASER SOURCE (Left)
    ax.add_patch(FancyBboxPatch((130, cy - 45), 130, 90, boxstyle='round,pad=0.02,rounding_size=8',
                                facecolor='#1e293b', edgecolor='#ef4444', lw=2))
    ax.add_patch(Rectangle((260, cy - 15), 20, 30, facecolor='#94a3b8', edgecolor='#475569', lw=1.2))
    ax.text(195, cy + 15, 'Laser Source', color='#f8fafc', fontsize=14, fontweight='bold', ha='center')
    ax.text(195, cy - 15, r'($\lambda = 632.8\ \mathrm{nm}$)', color='#fca5a5', fontsize=11, ha='center')

    # 2. BEAM SPLITTER (Center, 45 degrees)
    # 45-degree angled glass slab
    bs_len = 120
    bs_w = 14
    cos45 = np.cos(np.pi / 4)
    sin45 = np.sin(np.pi / 4)
    bs_poly = [
        (cx - bs_len/2 * cos45 - bs_w/2 * sin45, cy + bs_len/2 * sin45 - bs_w/2 * cos45),
        (cx + bs_len/2 * cos45 - bs_w/2 * sin45, cy - bs_len/2 * sin45 - bs_w/2 * cos45),
        (cx + bs_len/2 * cos45 + bs_w/2 * sin45, cy - bs_len/2 * sin45 + bs_w/2 * cos45),
        (cx - bs_len/2 * cos45 + bs_w/2 * sin45, cy + bs_len/2 * sin45 + bs_w/2 * cos45),
    ]
    ax.add_patch(plt.Polygon(bs_poly, closed=True, facecolor='#0284c7', edgecolor='#38bdf8', lw=2, alpha=0.5))
    # Semi-reflective coated surface
    ax.plot([cx - bs_len/2 * cos45, cx + bs_len/2 * cos45],
            [cy + bs_len/2 * sin45, cy - bs_len/2 * sin45], color='#ffffff', ls='--', lw=2.5)

    # Beam Splitter Callout
    ax.text(450, cy + 120, 'Beam Splitter (BS)\n50/50 Semi-silvered', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))
    ax.plot([510, cx - 15], [cy + 100, cy + 20], color='#38bdf8', lw=1.2)

    # Compensator Plate
    comp_poly = [
        (720 - 40 * cos45 - 10 * sin45, cy + 40 * sin45 - 10 * cos45),
        (720 + 40 * cos45 - 10 * sin45, cy - 40 * sin45 - 10 * cos45),
        (720 + 40 * cos45 + 10 * sin45, cy - 40 * sin45 + 10 * cos45),
        (720 - 40 * cos45 + 10 * sin45, cy + 40 * sin45 + 10 * cos45),
    ]
    ax.add_patch(plt.Polygon(comp_poly, closed=True, facecolor='#0284c7', edgecolor='#38bdf8', lw=1.5, alpha=0.35))
    ax.text(720, cy + 70, 'Compensator', color='#7dd3fc', fontsize=11, ha='center')

    # 3. MIRROR M1 (Fixed Mirror, Top at y=700)
    ax.add_patch(Rectangle((cx - 80, 700), 160, 24, facecolor='#cbd5e1', edgecolor='#334155', lw=2))
    ax.plot([cx - 80, cx + 80], [700, 700], color='#38bdf8', lw=3.5) # front surface
    ax.text(cx + 120, 720, 'Mirror $M_1$ (Fixed)\nReference Arm: $L_1$', color='#38bdf8', fontsize=12, fontweight='bold', ha='left',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))

    # 4. MIRROR M2 (Movable Mirror, Right at x=980)
    ax.add_patch(Rectangle((980, cy - 80), 24, 160, facecolor='#cbd5e1', edgecolor='#334155', lw=2))
    ax.plot([980, 980], [cy - 80, cy + 80], color='#fbbf24', lw=3.5) # front surface
    # Translation stage / micrometer screw
    ax.add_patch(Rectangle((1004, cy - 25), 35, 50, facecolor='#475569', edgecolor='#334155', lw=1.2))
    ax.text(1000, cy + 120, r'Mirror $M_2$ (Movable)' + '\n' + r'Test Arm: $L_2 = L_1 \pm \Delta d$',
            color='#fbbf24', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#fbbf24', lw=1.2))
    ax.annotate('', xy=(950, cy - 100), xytext=(1010, cy - 100),
                arrowprops=dict(arrowstyle='<->', color='#fbbf24', lw=2))
    ax.text(980, cy - 120, r'$\pm \Delta d$', color='#fbbf24', fontsize=12, fontweight='bold', ha='center')

    # 5. DETECTOR & SCREEN (Bottom at y=200)
    ax.add_patch(FancyBboxPatch((cx - 100, 180), 200, 35, boxstyle='round,pad=0.02,rounding_size=4',
                                facecolor='#0f172a', edgecolor='#f43f5e', lw=2))
    # Interference rings preview
    for r_ring in [6, 14, 24, 38]:
        ax.add_patch(Ellipse((cx, 197), r_ring * 2, r_ring * 0.4, fill=False, edgecolor='#ef4444', lw=1.5))
    ax.text(cx, 140, 'Detector / Screen\n(Circular Interference Fringes)', color='#f8fafc', fontsize=12, fontweight='bold', ha='center')

    # 6. OPTICAL BEAMS & FLOW ARROWS
    # Main Laser Beam to BS
    ax.plot([280, cx], [cy, cy], color='#ef4444', lw=3.5)
    ax.annotate('', xy=(460, cy), xytext=(380, cy),
                arrowprops=dict(arrowstyle='-|>', color='#ef4444', lw=3, mutation_scale=16))

    # Split Beam 1 (Up to M1 and back down)
    ax.plot([cx, cx], [cy, 700], color='#f87171', lw=3)
    ax.annotate('', xy=(cx, 600), xytext=(cx, 520),
                arrowprops=dict(arrowstyle='-|>', color='#f87171', lw=2.5, mutation_scale=14))
    ax.annotate('', xy=(cx, 510), xytext=(cx, 600),
                arrowprops=dict(arrowstyle='-|>', color='#f87171', lw=2.5, mutation_scale=14))

    # Split Beam 2 (Right to M2 and back left)
    ax.plot([cx, 980], [cy, cy], color='#f87171', lw=3)
    ax.annotate('', xy=(850, cy), xytext=(780, cy),
                arrowprops=dict(arrowstyle='-|>', color='#f87171', lw=2.5, mutation_scale=14))
    ax.annotate('', xy=(770, cy), xytext=(850, cy),
                arrowprops=dict(arrowstyle='-|>', color='#f87171', lw=2.5, mutation_scale=14))

    # Recombined Interference Beam to Detector
    ax.plot([cx, cx], [cy, 215], color='#fb7185', lw=4.5)
    ax.annotate('', xy=(cx, 280), xytext=(cx, 380),
                arrowprops=dict(arrowstyle='-|>', color='#fb7185', lw=4, mutation_scale=18))

    # 7. INTERFERENCE CONDITION BOX (Bottom Left)
    cond_text = "Interference Conditions:\n" + r"$\Delta = 2(L_1 - L_2) = m\lambda\quad \mathrm{(Constructive)}$" + "\n" + r"$\Delta = 2(L_1 - L_2) = (m+\frac{1}{2})\lambda\quad \mathrm{(Destructive)}$"
    ax.text(120, 180, cond_text, color='#f8fafc', fontsize=11,
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#1e293b', edgecolor='#334155', lw=1.2))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_michelson(sys.argv[1])
    else:
        draw_michelson('michelson-interferometer.png')
