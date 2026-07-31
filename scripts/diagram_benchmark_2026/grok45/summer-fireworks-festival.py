import sys
import math
import random
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Rectangle
from matplotlib.collections import LineCollection

random.seed(42)
np.random.seed(42)

out_path = sys.argv[1]
fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#0a0a1a")
ax.set_facecolor("#0a0a1a")

# Night sky gradient (deep navy)
n_bands = 80
for i in range(n_bands):
    y0 = 2.2 + (9 - 2.2) * i / n_bands
    y1 = 2.2 + (9 - 2.2) * (i + 1) / n_bands
    t = i / (n_bands - 1)
    r = int(8 + 12 * (1 - t))
    g = int(10 + 20 * (1 - t))
    b = int(28 + 50 * (1 - t) + 20 * t)
    ax.add_patch(
        Rectangle((0, y0), 12, y1 - y0 + 0.02, facecolor=(r / 255, g / 255, b / 255), edgecolor="none", zorder=0)
    )

# Stars
n_stars = 180
sx = np.random.uniform(0.1, 11.9, n_stars)
sy = np.random.uniform(2.8, 8.9, n_stars)
ss = np.random.uniform(0.3, 2.2, n_stars)
sa = np.random.uniform(0.35, 1.0, n_stars)
for x, y, s, a in zip(sx, sy, ss, sa):
    ax.plot(x, y, marker="*", markersize=s, color="white", alpha=a, zorder=1, linestyle="none")

# Bright twinkles
for _ in range(25):
    x, y = random.uniform(0.3, 11.7), random.uniform(3.5, 8.7)
    ax.plot(x, y, marker="+", markersize=random.uniform(3, 6), color="#ddeeff", alpha=0.7, zorder=1, linestyle="none")


def draw_firework(cx, cy, radius, colors, n_rays=48, layers=3, z=5):
    """Radial firework burst with glowing core."""
    # Soft glow
    for i, alpha in enumerate([0.08, 0.12, 0.18]):
        r = radius * (1.4 - i * 0.15)
        ax.add_patch(Circle((cx, cy), r, facecolor=colors[0], edgecolor="none", alpha=alpha, zorder=z))

    for layer in range(layers):
        r_scale = radius * (0.55 + 0.45 * (layer + 1) / layers)
        n = n_rays - layer * 8
        color = colors[layer % len(colors)]
        segs = []
        widths = []
        alphas = []
        for i in range(n):
            angle = 2 * math.pi * i / n + layer * 0.07
            # Slight length variation
            length = r_scale * random.uniform(0.75, 1.05)
            # Sparkle mid-points
            x0, y0 = cx, cy
            x1 = cx + length * math.cos(angle)
            y1 = cy + length * math.sin(angle)
            # Curve tip slightly with intermediate point
            mid = 0.55 + random.uniform(-0.05, 0.08)
            xm = cx + length * mid * math.cos(angle)
            ym = cy + length * mid * math.sin(angle)
            segs.append([(x0, y0), (xm, ym), (x1, y1)])
            widths.append(random.uniform(0.8, 2.2) * (1 - layer * 0.15))
            alphas.append(random.uniform(0.55, 0.95))

            # Tip spark
            ax.plot(
                x1, y1,
                marker="o",
                markersize=random.uniform(1.2, 3.0),
                color=color,
                alpha=random.uniform(0.5, 0.95),
                zorder=z + 2,
                linestyle="none",
            )

        for seg, w, a in zip(segs, widths, alphas):
            xs = [p[0] for p in seg]
            ys = [p[1] for p in seg]
            ax.plot(xs, ys, color=color, linewidth=w, alpha=a, solid_capstyle="round", zorder=z + 1)

    # Core
    ax.add_patch(Circle((cx, cy), radius * 0.08, facecolor="white", edgecolor="none", alpha=0.95, zorder=z + 3))
    ax.add_patch(Circle((cx, cy), radius * 0.18, facecolor=colors[0], edgecolor="none", alpha=0.55, zorder=z + 2))

    # Falling sparks
    for _ in range(40):
        ang = random.uniform(0, 2 * math.pi)
        dist = radius * random.uniform(0.3, 1.15)
        px = cx + dist * math.cos(ang)
        py = cy + dist * math.sin(ang) - random.uniform(0, 0.35)
        ax.plot(
            px, py,
            marker=".",
            markersize=random.uniform(1.5, 4),
            color=random.choice(colors),
            alpha=random.uniform(0.4, 0.85),
            zorder=z + 2,
            linestyle="none",
        )


# Fireworks: 3 bursts, different colors
draw_firework(
    3.2, 6.8, 2.1,
    ["#ff4466", "#ff88aa", "#ffccdd"],
    n_rays=56, layers=3, z=5,
)
draw_firework(
    8.5, 7.2, 1.9,
    ["#44ddff", "#88eeff", "#cceeff"],
    n_rays=50, layers=3, z=5,
)
draw_firework(
    5.8, 5.5, 1.55,
    ["#ffdd44", "#ffaa22", "#ffeebb"],
    n_rays=42, layers=3, z=6,
)

# Subtle smoke trails under fireworks
for cx, cy, col in [(3.2, 6.8, "#ff6688"), (8.5, 7.2, "#66ccff"), (5.8, 5.5, "#ffcc66")]:
    trail_y = np.linspace(cy - 0.3, 2.6, 40)
    trail_x = cx + 0.08 * np.sin(np.linspace(0, 4, 40)) + np.random.uniform(-0.02, 0.02, 40)
    for i in range(len(trail_y) - 1):
        a = 0.15 * (1 - i / len(trail_y))
        ax.plot(
            trail_x[i : i + 2],
            trail_y[i : i + 2],
            color=col,
            linewidth=1.2,
            alpha=a,
            zorder=4,
        )

# Ground / river reflection strip
ax.add_patch(Rectangle((0, 0), 12, 2.35, facecolor="#060612", edgecolor="none", zorder=8))
# Water reflection glow
for i in range(30):
    y0 = 0.05 + i * 0.07
    t = i / 29
    ax.add_patch(
        Rectangle(
            (0, y0), 12, 0.08,
            facecolor="#0a1528",
            edgecolor="none",
            alpha=0.35 + 0.25 * (1 - t),
            zorder=8,
        )
    )

# Firework reflections on water
for cx, col, intensity in [(3.2, "#ff4466", 0.25), (8.5, "#44ddff", 0.22), (5.8, "#ffdd44", 0.2)]:
    for j in range(12):
        yy = 0.15 + j * 0.12
        ww = 1.8 * (1 - j / 14) * random.uniform(0.7, 1.1)
        ax.add_patch(
            Ellipse(
                (cx + random.uniform(-0.1, 0.1), yy),
                ww,
                0.06,
                facecolor=col,
                edgecolor="none",
                alpha=intensity * (1 - j / 14),
                zorder=9,
            )
        )


def draw_stall(x, w, h, roof_color, body_color):
    # Body
    ax.add_patch(Rectangle((x, 1.55), w, h, facecolor=body_color, edgecolor="none", zorder=12))
    # Roof
    roof = Polygon(
        [(x - 0.12, 1.55 + h), (x + w / 2, 1.55 + h + 0.35), (x + w + 0.12, 1.55 + h)],
        closed=True,
        facecolor=roof_color,
        edgecolor="none",
        zorder=13,
    )
    ax.add_patch(roof)
    # Counter glow
    ax.add_patch(
        Rectangle((x + 0.05, 1.55), w - 0.1, 0.12, facecolor="#ffcc66", edgecolor="none", alpha=0.55, zorder=13)
    )


# Stalls with lanterns
stalls = [
    (0.4, 1.6, 1.1, "#8b2942", "#2a1a12"),
    (2.3, 1.8, 1.0, "#2a4a6a", "#1a1510"),
    (4.4, 1.5, 1.15, "#6a3a28", "#221810"),
    (6.3, 1.7, 1.05, "#4a2860", "#1c1218"),
    (8.4, 1.9, 1.1, "#286048", "#121a14"),
    (10.4, 1.5, 1.0, "#6a2828", "#1a1010"),
]
for sx, sw, sh, roof, body in stalls:
    draw_stall(sx, sw, sh, roof, body)

# Lanterns
lantern_positions = []
for sx, sw, sh, *_ in stalls:
    for k in range(2):
        lx = sx + 0.35 + k * (sw - 0.5)
        ly = 1.55 + sh + 0.05
        lantern_positions.append((lx, ly))

for lx, ly in lantern_positions:
    # Glow
    ax.add_patch(Circle((lx, ly - 0.05), 0.28, facecolor="#ffaa33", edgecolor="none", alpha=0.18, zorder=14))
    ax.add_patch(Circle((lx, ly - 0.05), 0.16, facecolor="#ffcc55", edgecolor="none", alpha=0.35, zorder=14))
    # Lantern body
    ax.add_patch(
        FancyBboxPatch(
            (lx - 0.09, ly - 0.22),
            0.18,
            0.26,
            boxstyle="round,pad=0.01,rounding_size=0.04",
            facecolor="#ff9944",
            edgecolor="#cc6622",
            linewidth=0.6,
            zorder=15,
        )
    )
    # Top/bottom caps
    ax.add_patch(Rectangle((lx - 0.1, ly + 0.02), 0.2, 0.04, facecolor="#5a3010", edgecolor="none", zorder=16))
    ax.add_patch(Rectangle((lx - 0.1, ly - 0.24), 0.2, 0.04, facecolor="#5a3010", edgecolor="none", zorder=16))
    # Hanging string
    ax.plot([lx, lx], [ly + 0.06, ly + 0.22], color="#333322", linewidth=0.7, zorder=14)
    # Warm ground light under lantern
    ax.add_patch(
        Ellipse((lx, 1.52), 0.55, 0.12, facecolor="#ffaa44", edgecolor="none", alpha=0.22, zorder=11)
    )

# People silhouettes
people = [
    (1.1, 1.35, 0.55),
    (1.55, 1.32, 0.48),
    (2.9, 1.38, 0.62),
    (3.4, 1.30, 0.45),
    (3.7, 1.28, 0.38),  # child
    (5.0, 1.36, 0.58),
    (5.5, 1.33, 0.52),
    (7.0, 1.37, 0.60),
    (7.45, 1.31, 0.47),
    (7.75, 1.29, 0.36),  # child
    (9.2, 1.35, 0.56),
    (9.7, 1.32, 0.50),
    (11.0, 1.34, 0.54),
    (11.4, 1.30, 0.46),
]


def draw_person(px, py, h):
    # Head
    hr = h * 0.13
    ax.add_patch(Circle((px, py + h - hr), hr, facecolor="#0a0a0c", edgecolor="none", zorder=17))
    # Body
    body_w = h * 0.28
    ax.add_patch(
        Polygon(
            [
                (px - body_w, py),
                (px + body_w, py),
                (px + body_w * 0.7, py + h * 0.55),
                (px + body_w * 0.55, py + h * 0.72),
                (px - body_w * 0.55, py + h * 0.72),
                (px - body_w * 0.7, py + h * 0.55),
            ],
            closed=True,
            facecolor="#0a0a0c",
            edgecolor="none",
            zorder=17,
        )
    )
    # Yukata hem suggestion
    ax.add_patch(
        Polygon(
            [
                (px - body_w * 1.05, py),
                (px + body_w * 1.05, py),
                (px + body_w * 0.85, py + h * 0.25),
                (px - body_w * 0.85, py + h * 0.25),
            ],
            closed=True,
            facecolor="#050508",
            edgecolor="none",
            zorder=17,
        )
    )


for px, py, h in people:
    draw_person(px, py, h)

# Crowd distant tiny silhouettes
for _ in range(20):
    px = random.uniform(0.2, 11.8)
    h = random.uniform(0.22, 0.35)
    ax.add_patch(
        Ellipse((px, 1.45), 0.12, h, facecolor="#08080c", edgecolor="none", alpha=0.85, zorder=16)
    )

# Ambient lantern light wash near stalls
for sx, sw, sh, *_ in stalls:
    ax.add_patch(
        Ellipse(
            (sx + sw / 2, 1.7),
            sw * 1.3,
            0.55,
            facecolor="#ff9944",
            edgecolor="none",
            alpha=0.08,
            zorder=10,
        )
    )

# Festival banner hint (noren-like stripes on one stall)
ax.add_patch(Rectangle((4.55, 2.35), 0.18, 0.35, facecolor="#cc2244", edgecolor="none", alpha=0.7, zorder=14))
ax.add_patch(Rectangle((4.85, 2.35), 0.18, 0.35, facecolor="#2244aa", edgecolor="none", alpha=0.7, zorder=14))
ax.add_patch(Rectangle((5.15, 2.35), 0.18, 0.35, facecolor="#cc2244", edgecolor="none", alpha=0.7, zorder=14))

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0)
plt.close()
