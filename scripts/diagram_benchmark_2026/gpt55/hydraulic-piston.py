import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch, Circle

def add_label(ax, text, xy, xytext, color="#222222"):
    ax.annotate(
        text,
        xy=xy,
        xytext=xytext,
        ha="center",
        va="center",
        fontsize=15,
        color=color,
        arrowprops=dict(
            arrowstyle="-",
            lw=1.6,
            color=color,
            shrinkA=6,
            shrinkB=6,
        ),
    )

def add_flow(ax, start, end, text, text_pos, color):
    arrow = FancyArrowPatch(
        start,
        end,
        arrowstyle="->",
        mutation_scale=24,
        lw=3,
        color=color,
        connectionstyle="arc3,rad=0",
    )
    ax.add_patch(arrow)
    ax.text(
        text_pos[0],
        text_pos[1],
        text,
        ha="center",
        va="center",
        fontsize=14,
        color=color,
        weight="bold",
    )

def main():
    if len(sys.argv) < 2:
        raise SystemExit("output path required: sys.argv[1]")

    output_path = sys.argv[1]

    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = [
        "Hiragino Sans",
        "Yu Gothic",
        "Noto Sans CJK JP",
        "IPAexGothic",
        "DejaVu Sans",
    ]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 90)
    ax.axis("off")
    fig.patch.set_facecolor("#ffffff")

    chamber_color = "#d8ecff"
    metal_color = "#d9dde3"
    dark_metal = "#8b96a3"
    piston_color = "#f2c14e"
    rod_color = "#b6bdc6"
    oil_blue = "#1f77b4"
    oil_red = "#d4513f"

    ax.text(
        60,
        83,
        "油圧ピストンの断面構造",
        ha="center",
        va="center",
        fontsize=26,
        weight="bold",
        color="#1f2933",
    )

    ax.add_patch(Rectangle((16, 33), 88, 24, facecolor=chamber_color, edgecolor="none"))
    ax.add_patch(Rectangle((16, 57), 88, 6, facecolor=metal_color, edgecolor=dark_metal, lw=2))
    ax.add_patch(Rectangle((16, 27), 88, 6, facecolor=metal_color, edgecolor=dark_metal, lw=2))
    ax.add_patch(Rectangle((12, 27), 4, 36, facecolor=metal_color, edgecolor=dark_metal, lw=2))
    ax.add_patch(Rectangle((104, 27), 4, 36, facecolor=metal_color, edgecolor=dark_metal, lw=2))

    ax.add_patch(Rectangle((56, 29), 8, 32, facecolor=piston_color, edgecolor="#9a6b00", lw=2.5))
    ax.add_patch(Rectangle((64, 42), 45, 6, facecolor=rod_color, edgecolor=dark_metal, lw=2))
    ax.add_patch(Circle((109, 45), 3, facecolor=rod_color, edgecolor=dark_metal, lw=2))

    ax.add_patch(Rectangle((26, 61), 8, 12, facecolor=metal_color, edgecolor=dark_metal, lw=2))
    ax.add_patch(Rectangle((86, 17), 8, 12, facecolor=metal_color, edgecolor=dark_metal, lw=2))

    ax.plot([30, 30], [73, 79], color=oil_red, lw=5, solid_capstyle="round")
    ax.plot([90, 90], [17, 11], color=oil_blue, lw=5, solid_capstyle="round")

    add_flow(ax, (30, 79), (30, 63), "加圧油 IN", (21, 75), oil_red)
    add_flow(ax, (90, 33), (90, 11), "戻り油 OUT", (101, 15), oil_blue)

    ax.add_patch(FancyArrowPatch(
        (42, 45),
        (54, 45),
        arrowstyle="->",
        mutation_scale=22,
        lw=2.8,
        color=oil_red,
    ))
    ax.add_patch(FancyArrowPatch(
        (78, 45),
        (66, 45),
        arrowstyle="->",
        mutation_scale=22,
        lw=2.8,
        color=oil_blue,
    ))

    ax.text(36, 39, "左圧力室", ha="center", va="center", fontsize=16, weight="bold", color="#1f4e79")
    ax.text(80, 39, "右圧力室", ha="center", va="center", fontsize=16, weight="bold", color="#1f4e79")

    ax.text(
        60,
        23,
        "ピストンが左右の圧力差を受け、ロッドへ直線運動を伝える",
        ha="center",
        va="center",
        fontsize=15,
        color="#344054",
    )

    add_label(ax, "シリンダー本体", (50, 60), (50, 70))
    add_label(ax, "ピストン", (60, 45), (59, 68))
    add_label(ax, "ロッド", (86, 45), (88, 61))
    add_label(ax, "左ポート", (30, 63), (18, 66))
    add_label(ax, "右ポート", (90, 27), (103, 28))
    add_label(ax, "シール部", (64, 45), (69, 72))

    ax.add_patch(Rectangle((55.4, 31), 1.2, 28, facecolor="#5b616b", edgecolor="none", alpha=0.85))
    ax.add_patch(Rectangle((63.4, 31), 1.2, 28, facecolor="#5b616b", edgecolor="none", alpha=0.85))

    ax.text(46, 52, "高圧", ha="center", va="center", fontsize=14, color=oil_red, weight="bold")
    ax.text(74, 52, "低圧", ha="center", va="center", fontsize=14, color=oil_blue, weight="bold")

    ax.add_patch(FancyArrowPatch(
        (63, 45),
        (78, 45),
        arrowstyle="simple",
        mutation_scale=28,
        color="#4b5563",
        alpha=0.75,
    ))
    ax.text(71, 49, "推力", ha="center", va="center", fontsize=14, color="#374151", weight="bold")

    plt.savefig(output_path, bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)

if __name__ == "__main__":
    main()
