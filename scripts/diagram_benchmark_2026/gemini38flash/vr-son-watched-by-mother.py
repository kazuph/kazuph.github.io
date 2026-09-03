import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_vr_scene(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # ROOM BACKGROUND
    # Wall (top) & Floor (bottom)
    ax.add_patch(patches.Rectangle((0, 300), 1200, 600, color="#f1f5f9", zorder=1))
    ax.add_patch(patches.Rectangle((0, 290), 1200, 15, color="#64748b", zorder=2))
    ax.add_patch(patches.Rectangle((0, 0), 1200, 290, color="#b45309", zorder=1))

    # Floor plank lines
    for fy in [80, 150, 220]:
        ax.plot([0, 1200], [fy, fy], color="#78350f", lw=1.2, alpha=0.5, zorder=2)

    # BEDROOM FURNITURE
    # 1. Poster on wall
    ax.add_patch(patches.Rectangle((480, 600), 150, 200, color="#0f172a", ec="white", lw=4, zorder=3))
    ax.add_patch(patches.Polygon([[555, 760], [515, 680], [595, 680]], color="#38bdf8", zorder=4))
    ax.text(555, 630, "CYBER 2026", ha="center", va="center", fontsize=10, fontweight="bold", color="white", zorder=5)

    # 2. Bookshelf (Right-center: 720 to 880, 290 to 750)
    ax.add_patch(patches.Rectangle((720, 290), 160, 460, color="#a16207", ec="#451a03", lw=2, zorder=3))
    for sy in [430, 580]:
        ax.add_patch(patches.Rectangle((730, sy), 140, 12, color="#78350f", zorder=4))
    # Books
    colors_book = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]
    for i, cb in enumerate(colors_book):
        ax.add_patch(patches.Rectangle((735 + i * 14, 595), 11, 100, color=cb, zorder=5))
    for i, cb in enumerate(colors_book[::-1]):
        ax.add_patch(patches.Rectangle((735 + i * 14, 445), 11, 100, color=cb, zorder=5))

    # 3. Teen Bed (Far Right: 930 to 1200, 200 to 450)
    ax.add_patch(patches.Rectangle((930, 240), 250, 160, color="#1e293b", ec="#0f172a", lw=2, zorder=3))
    ax.add_patch(patches.Rectangle((930, 280), 250, 120, color="#2563eb", zorder=4))
    ax.add_patch(patches.Ellipse((980, 360), 70, 35, color="#ffffff", ec="#cbd5e1", lw=1.5, zorder=5))
    ax.add_patch(patches.Rectangle((915, 340), 20, 140, color="#475569", zorder=3))

    # Circular Play Mat Rug
    ax.add_patch(patches.Ellipse((600, 150), 500, 160, color="#e0e7ff", ec="#c7d2fe", lw=2, zorder=3))
    # Holographic VR Play Boundary
    ax.add_patch(patches.Ellipse((600, 150), 400, 120, color="#38bdf8", alpha=0.2, zorder=4))
    t_circ = np.linspace(0, 2 * np.pi, 50)
    ax.plot(600 + 200 * np.cos(t_circ), 150 + 60 * np.sin(t_circ), color="#0284c7", lw=1.5, ls="--", zorder=5)

    # SON PLAYING VR (Center: 600, 380)
    # Legs (Dynamic bent athletic stance)
    ax.plot([570, 540, 530], [330, 220, 150], color="#1e293b", lw=22, solid_capstyle="round", solid_joinstyle="round", zorder=6)
    ax.add_patch(patches.Ellipse((525, 145), 40, 20, color="#ef4444", zorder=7))

    ax.plot([630, 660, 675], [330, 220, 150], color="#1e293b", lw=22, solid_capstyle="round", solid_joinstyle="round", zorder=6)
    ax.add_patch(patches.Ellipse((685, 145), 40, 20, color="#ef4444", zorder=7))

    # Torso (Yellow T-shirt)
    ax.add_patch(patches.Polygon([[560, 460], [640, 460], [635, 330], [565, 330]], color="#eab308", ec="#ca8a04", lw=2, zorder=6))

    # Arms with VR controllers
    # Left arm stretching forward-left
    ax.plot([565, 490, 430], [450, 430, 460], color="#eab308", lw=16, solid_capstyle="round", solid_joinstyle="round", zorder=7)
    ax.add_patch(patches.Circle((425, 465), 10, color="#fcd5ce", zorder=8))
    # Controller left
    ax.add_patch(patches.Rectangle((405, 455), 12, 30, angle=25, color="#0f172a", zorder=9))
    ax.add_patch(patches.Ellipse((400, 475), 26, 14, angle=25, fill=False, edgecolor="#0284c7", lw=2.5, zorder=10))

    # Right arm reaching up-right
    ax.plot([635, 710, 765], [450, 480, 525], color="#eab308", lw=16, solid_capstyle="round", solid_joinstyle="round", zorder=7)
    ax.add_patch(patches.Circle((770, 530), 10, color="#fcd5ce", zorder=8))
    # Controller right
    ax.add_patch(patches.Rectangle((765, 520), 12, 30, angle=-30, color="#0f172a", zorder=9))
    ax.add_patch(patches.Ellipse((780, 545), 26, 14, angle=-30, fill=False, edgecolor="#0284c7", lw=2.5, zorder=10))

    # Head & Spiky Hair
    ax.add_patch(patches.Rectangle((590, 460), 20, 30, color="#fcd5ce", zorder=6))
    ax.add_patch(patches.Circle((600, 510), 30, color="#fcd5ce", zorder=7))
    ax.add_patch(patches.Polygon([[565, 515], [560, 555], [600, 560], [640, 555], [635, 515]], color="#451a03", zorder=8))

    # Excited open smile
    ax.add_patch(patches.Arc((600, 495), 18, 14, theta1=180, theta2=360, color="#991b1b", lw=3, zorder=9))

    # VR Headset (Goggles) with glowing Cyan LED strip
    ax.add_patch(patches.Rectangle((568, 515), 64, 28, color="#1e293b", ec="#0f172a", lw=2, zorder=10))
    ax.add_patch(patches.Rectangle((576, 527), 48, 6, color="#38bdf8", zorder=11))

    # MOTHER AT DOORWAY (Left: 180, 360)
    # Hallway opening
    ax.add_patch(patches.Rectangle((0, 100), 180, 700, color="#fef3c7", zorder=2))
    ax.add_patch(patches.Rectangle((180, 100), 22, 700, color="#475569", zorder=3))
    # Open door leaf
    ax.add_patch(patches.Polygon([[50, 130], [180, 100], [180, 780], [50, 750]], color="#e2e8f0", ec="#94a3b8", lw=2, zorder=3))

    # Mother standing in doorway
    # Skirt
    ax.add_patch(patches.Polygon([[215, 340], [255, 340], [260, 160], [210, 160]], color="#0f766e", zorder=6))
    # Slippers
    ax.add_patch(patches.Ellipse((225, 155), 24, 12, color="#fde047", zorder=7))
    ax.add_patch(patches.Ellipse((250, 155), 24, 12, color="#fde047", zorder=7))

    # Blouse / Cardigan
    ax.add_patch(patches.Polygon([[215, 460], [255, 460], [255, 340], [215, 340]], color="#f472b6", zorder=6))
    # Left arm leaning on frame
    ax.plot([215, 190, 195], [450, 425, 380], color="#f472b6", lw=12, solid_capstyle="round", solid_joinstyle="round", zorder=7)
    ax.add_patch(patches.Circle((195, 375), 8, color="#fcd5ce", zorder=8))

    # Right hand on chest in gentle affection
    ax.plot([255, 245, 235], [450, 410, 415], color="#f472b6", lw=12, solid_capstyle="round", zorder=7)
    ax.add_patch(patches.Circle((235, 415), 7, color="#fcd5ce", zorder=8))

    # Head & Hair (Turned right, watching son)
    ax.add_patch(patches.Rectangle((230, 460), 12, 20, color="#fcd5ce", zorder=6))
    ax.add_patch(patches.Circle((236, 495), 22, color="#fcd5ce", zorder=7))
    ax.add_patch(patches.Circle((230, 502), 22, color="#291e17", zorder=8))
    ax.add_patch(patches.Circle((236, 495), 21, color="#fcd5ce", zorder=9))
    # Hair back
    ax.add_patch(patches.Polygon([[214, 490], [214, 525], [245, 525], [255, 490]], color="#291e17", zorder=10))

    # Eye looking right towards son & gentle smile
    ax.add_patch(patches.Ellipse((243, 497), 4, 6, color="#1e293b", zorder=11))
    ax.plot([240, 248], [482, 484], color="#be123c", lw=2, zorder=11) # Smile

    # Sightline arrow from Mother to Son
    ax.plot([255, 560], [497, 525], color="#f43f5e", lw=1.8, ls="--", alpha=0.7, zorder=12)
    ax.annotate("", xy=(560, 525), xytext=(540, 523),
                arrowprops=dict(arrowstyle="-|>", color="#f43f5e", lw=1.8, mutation_scale=14), zorder=12)

    # Scene Title Card at Top
    ax.text(600, 830, "Mother Affectionately Watching Her Son Playing VR", ha="center", va="center",
            fontsize=16, fontweight="bold", color="#0f172a",
            bbox=dict(boxstyle="round,pad=0.4", fc="#ffffff", ec="#cbd5e1", lw=1.5), zorder=20)

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vr-son-watched-by-mother.py <output_path>")
        sys.exit(1)
    draw_vr_scene(sys.argv[1])
