import sys
import math
import random
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon, Ellipse
from matplotlib.collections import LineCollection


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def draw_gradient_sky(ax):
    top = hex_to_rgb("#050714")
    mid = hex_to_rgb("#091436")
    bottom = hex_to_rgb("#18255a")

    rows = 360
    gradient = []
    for i in range(rows):
        t = i / (rows - 1)
        if t < 0.62:
            color = mix(top, mid, t / 0.62)
        else:
            color = mix(mid, bottom, (t - 0.62) / 0.38)
        gradient.append([color] * 2)

    ax.imshow(gradient, extent=[0, 120, 0, 90], origin="upper", aspect="auto")


def draw_stars(ax):
    random.seed(8)
    for _ in range(130):
        x = random.uniform(3, 117)
        y = random.uniform(27, 87)
        s = random.uniform(0.03, 0.11)
        alpha = random.uniform(0.35, 0.95)
        ax.add_patch(Circle((x, y), s, color=(1.0, 0.96, 0.78, alpha), lw=0))

    for x, y, r in [(14, 80, 0.15), (33, 68, 0.12), (82, 83, 0.14), (108, 72, 0.11)]:
        ax.plot([x - r, x + r], [y, y], color="#fff2b8", lw=0.7, alpha=0.85)
        ax.plot([x, x], [y - r, y + r], color="#fff2b8", lw=0.7, alpha=0.85)


def draw_firework(ax, cx, cy, radius, colors, seed, burst=72):
    random.seed(seed)

    for glow_r, alpha in [(radius * 0.95, 0.035), (radius * 0.62, 0.055), (radius * 0.32, 0.07)]:
        ax.add_patch(Circle((cx, cy), glow_r, color=colors[0], alpha=alpha, lw=0))

    segments = []
    segment_colors = []
    widths = []

    for i in range(burst):
        angle = 2 * math.pi * i / burst + random.uniform(-0.035, 0.035)
        length = radius * random.uniform(0.62, 1.03)
        inner = radius * random.uniform(0.07, 0.18)

        x1 = cx + math.cos(angle) * inner
        y1 = cy + math.sin(angle) * inner
        x2 = cx + math.cos(angle) * length
        y2 = cy + math.sin(angle) * length

        segments.append([(x1, y1), (x2, y2)])
        segment_colors.append(random.choice(colors))
        widths.append(random.uniform(1.0, 2.3))

        if random.random() < 0.38:
            spark_len = random.uniform(0.8, 2.0)
            tx = cx + math.cos(angle) * (length + spark_len)
            ty = cy + math.sin(angle) * (length + spark_len)
            ax.add_patch(Circle((tx, ty), random.uniform(0.08, 0.18),
                                color=random.choice(colors), alpha=random.uniform(0.62, 0.95), lw=0))

    lc = LineCollection(segments, colors=segment_colors, linewidths=widths, alpha=0.88)
    ax.add_collection(lc)

    for r in [radius * 0.28, radius * 0.52, radius * 0.78]:
        ax.add_patch(Circle((cx, cy), r, fill=False, ec=random.choice(colors),
                            lw=0.7, alpha=0.12))

    ax.add_patch(Circle((cx, cy), radius * 0.08, color="#fff7c2", alpha=0.85, lw=0))


def draw_trail(ax, x0, y0, x1, y1, color):
    steps = 18
    for i in range(steps):
        t1 = i / steps
        t2 = (i + 1) / steps
        xa = lerp(x0, x1, t1)
        ya = lerp(y0, y1, t1)
        xb = lerp(x0, x1, t2)
        yb = lerp(y0, y1, t2)
        ax.plot([xa, xb], [ya, yb], color=color, lw=1.4 * (1 - t1) + 0.2, alpha=0.55 * (1 - t1))


def draw_lantern(ax, x, y, scale=1.0):
    glow = "#ffb347"
    ax.add_patch(Circle((x, y), 2.4 * scale, color=glow, alpha=0.12, lw=0))
    ax.add_patch(Ellipse((x, y), 1.35 * scale, 1.85 * scale,
                         facecolor="#ff5f3d", edgecolor="#3a1712", lw=0.6))
    ax.add_patch(Rectangle((x - 0.42 * scale, y + 0.88 * scale),
                           0.84 * scale, 0.18 * scale, color="#2b1110", lw=0))
    ax.add_patch(Rectangle((x - 0.42 * scale, y - 1.05 * scale),
                           0.84 * scale, 0.18 * scale, color="#2b1110", lw=0))
    ax.plot([x, x], [y - 0.72 * scale, y + 0.72 * scale],
            color="#ffd27a", lw=0.6, alpha=0.75)


def draw_stall(ax, x, y, w, h, roof_color, cloth_color):
    ax.add_patch(Rectangle((x, y), w, h, facecolor="#251617", edgecolor="none"))
    ax.add_patch(Rectangle((x + 1.2, y + 1.0), w - 2.4, h - 2.0,
                           facecolor="#3a2220", edgecolor="none"))

    roof = Polygon([(x - 1.5, y + h), (x + w + 1.5, y + h),
                    (x + w - 2.0, y + h + 5.6), (x + 2.0, y + h + 5.6)],
                   closed=True, facecolor=roof_color, edgecolor="#180b0b", lw=1.0)
    ax.add_patch(roof)

    stripe_count = 8
    stripe_w = w / stripe_count
    for i in range(stripe_count):
        color = cloth_color if i % 2 == 0 else "#fff2cf"
        ax.add_patch(Polygon([
            (x + i * stripe_w - 0.7, y + h + 0.15),
            (x + (i + 1) * stripe_w + 0.7, y + h + 0.15),
            (x + (i + 1) * stripe_w - 0.25, y + h + 5.25),
            (x + i * stripe_w + 0.25, y + h + 5.25),
        ], closed=True, facecolor=color, edgecolor="none", alpha=0.96))

    ax.add_patch(Rectangle((x + 1.0, y + h - 2.1), w - 2.0, 2.1,
                           facecolor="#2d1615", edgecolor="none"))
    ax.plot([x + 1.0, x + w - 1.0], [y + h + 0.05, y + h + 0.05],
            color="#120909", lw=1.1)

    for lx in [x + 4.0, x + 9.0, x + w - 9.0, x + w - 4.0]:
        draw_lantern(ax, lx, y + h + 1.0, 0.9)

    ax.add_patch(Rectangle((x + 4, y + 2.0), w - 8, 1.6,
                           facecolor="#f7a84b", alpha=0.45, edgecolor="none"))
    ax.add_patch(Rectangle((x + 6, y + 4.0), w - 12, 2.4,
                           facecolor="#f9d36a", alpha=0.18, edgecolor="none"))


def draw_person(ax, x, y, scale=1.0, facing=1):
    color = "#07080d"
    ax.add_patch(Circle((x, y + 3.2 * scale), 0.62 * scale, color=color, lw=0))
    ax.add_patch(Polygon([(x - 0.72 * scale, y + 2.6 * scale),
                          (x + 0.72 * scale, y + 2.6 * scale),
                          (x + 1.05 * scale, y + 0.45 * scale),
                          (x - 1.05 * scale, y + 0.45 * scale)],
                         closed=True, facecolor=color, edgecolor="none"))
    ax.plot([x - 0.35 * scale, x - 0.55 * scale], [y + 0.55 * scale, y],
            color=color, lw=1.6 * scale)
    ax.plot([x + 0.35 * scale, x + 0.62 * scale], [y + 0.55 * scale, y],
            color=color, lw=1.6 * scale)
    ax.plot([x + 0.65 * facing * scale, x + 1.35 * facing * scale],
            [y + 2.05 * scale, y + 1.35 * scale], color=color, lw=1.25 * scale)


def draw_reflections(ax):
    for x, y, w, color, alpha in [
        (18, 9.0, 18, "#ff9e45", 0.12),
        (51, 8.2, 21, "#ffd36c", 0.10),
        (84, 8.8, 20, "#ff6f5f", 0.11),
        (35, 13.5, 50, "#78b8ff", 0.055),
    ]:
        for i in range(7):
            ax.add_patch(Ellipse((x + random.uniform(-w / 2, w / 2), y - i * 0.55),
                                 random.uniform(2.0, 6.0), 0.18,
                                 facecolor=color, alpha=alpha * (1 - i * 0.09),
                                 edgecolor="none"))


def main():
    if len(sys.argv) < 2:
        raise SystemExit("output path required")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 90)
    ax.set_axis_off()

    draw_gradient_sky(ax)
    draw_stars(ax)

    ax.add_patch(Ellipse((72, 35), 95, 12, color="#101735", alpha=0.22, lw=0))
    ax.add_patch(Rectangle((0, 0), 120, 20, facecolor="#08090d", alpha=0.62, edgecolor="none"))
    draw_reflections(ax)

    draw_trail(ax, 53, 20, 39, 62, "#ffdc7c")
    draw_trail(ax, 73, 20, 76, 70, "#8dd7ff")
    draw_trail(ax, 93, 20, 97, 57, "#ff9ed8")

    draw_firework(ax, 39, 63, 14.5, ["#ffd86b", "#ff714d", "#fff5bd", "#ffb347"], 1, 82)
    draw_firework(ax, 76, 71, 12.5, ["#83d9ff", "#5787ff", "#d7f7ff", "#b18cff"], 2, 76)
    draw_firework(ax, 98, 58, 10.5, ["#ff8ccf", "#ff5278", "#ffe0ef", "#f7a35c"], 3, 58)

    draw_stall(ax, 8, 6, 30, 12, "#c93632", "#e94a35")
    draw_stall(ax, 46, 5.4, 31, 13, "#1f7c72", "#2aa696")
    draw_stall(ax, 84, 6.2, 28, 11.6, "#b83f6e", "#d85b87")

    for lx in range(7, 115, 9):
        y = 23 + math.sin(lx * 0.25) * 1.4
        ax.plot([lx - 4.2, lx + 4.2], [y + 1.8, y + 1.8],
                color="#1a1114", lw=1.0, alpha=0.7)
        draw_lantern(ax, lx, y, 0.72)

    people = [
        (4, 2.7, 1.25, 1), (10, 2.1, 0.95, -1), (16, 2.4, 1.08, 1),
        (28, 2.0, 0.95, -1), (39, 2.5, 1.18, 1), (44, 2.2, 0.9, -1),
        (58, 2.0, 1.1, 1), (64, 2.4, 0.95, -1), (72, 2.0, 1.2, 1),
        (82, 2.3, 0.9, -1), (94, 2.2, 1.12, 1), (105, 2.0, 1.0, -1),
        (114, 2.4, 1.2, 1),
    ]
    for person in people:
        draw_person(ax, *person)

    ax.add_patch(Rectangle((0, 0), 120, 4.0, facecolor="#030407", alpha=0.85, edgecolor="none"))

    fig.savefig(output_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0)
    plt.close(fig)


if __name__ == "__main__":
    main()
