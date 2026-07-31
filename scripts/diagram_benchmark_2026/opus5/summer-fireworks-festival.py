import sys

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import LinearSegmentedColormap, to_rgb
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle

W, H = 1200.0, 900.0
WATER_TOP = 300.0
WATER_BOT = 190.0

SKY_STOPS = [
    (0.00, "#3a2350"),
    (0.06, "#2a2159"),
    (0.20, "#1a1c56"),
    (0.45, "#0f1440"),
    (0.72, "#080c28"),
    (1.00, "#03040f"),
]

rng = np.random.default_rng(20260731)


def glow(ax, x, y, r, color, layers=14, amax=0.55, power=2.4, zorder=5):
    for i in range(layers, 0, -1):
        f = i / layers
        ax.add_patch(
            Circle(
                (x, y),
                r * f,
                facecolor=color,
                edgecolor="none",
                alpha=amax * (1.0 - f) ** power,
                zorder=zorder,
            )
        )


def sky(ax):
    cmap = LinearSegmentedColormap.from_list("sky", SKY_STOPS)
    grad = cmap(np.linspace(0.0, 1.0, 900))[:, :3].reshape(900, 1, 3)
    ax.imshow(
        grad,
        extent=(0, W, 0, H),
        origin="lower",
        aspect="auto",
        interpolation="bilinear",
        zorder=0,
    )
    # warm haze rising from the festival ground
    for i in range(18):
        f = i / 18.0
        ax.add_patch(
            Rectangle(
                (0, WATER_TOP),
                W,
                40 + 260 * f,
                facecolor="#ff9a4d",
                edgecolor="none",
                alpha=0.016 * (1.0 - f) ** 1.3,
                zorder=1,
            )
        )


def stars(ax):
    for n, smin, smax, a, col in (
        (240, 0.4, 1.8, 0.30, "#cfd8ff"),
        (150, 1.4, 4.0, 0.58, "#ffffff"),
        (55, 3.5, 9.0, 0.88, "#fff3d6"),
    ):
        sx = rng.uniform(0, W, n)
        sy = 330 + (H - 330) * rng.random(n) ** 0.65
        ax.scatter(sx, sy, s=rng.uniform(smin, smax, n), c=col, alpha=a,
                   linewidths=0, zorder=2)
    # a few sparkling stars with a cross flare
    for _ in range(14):
        x = rng.uniform(30, W - 30)
        y = rng.uniform(430, H - 40)
        r = rng.uniform(6, 13)
        c = ["#ffffff", "#cfe4ff", "#ffe9c2"][rng.integers(0, 3)]
        ax.plot([x - r, x + r], [y, y], color=c, lw=0.8, alpha=0.45, zorder=2)
        ax.plot([x, x], [y - r, y + r], color=c, lw=0.8, alpha=0.45, zorder=2)
        ax.scatter([x], [y], s=6, c=c, alpha=0.95, linewidths=0, zorder=2)
    glow(ax, 1085, 812, 74, "#dfe7ff", layers=12, amax=0.16, power=2.0, zorder=2)
    ax.add_patch(Circle((1085, 812), 26, facecolor="#f2f4ff", edgecolor="none", zorder=2))
    ax.add_patch(Circle((1073, 820), 24, facecolor="#0a0d24", edgecolor="none", zorder=2))


def burst(ax, cx, cy, R, colors, n_rays=96, seed=0, droop=0.16, ell=1.0, alpha=1.0,
          zorder=6):
    r = np.random.default_rng(seed)
    ang = np.linspace(0, 2 * np.pi, n_rays, endpoint=False) + r.normal(0, 0.014, n_rays)
    t = np.linspace(0.10, 1.0, 20)
    segs, cols, lws = [], [], []
    tips, tipc = [], []
    for i, a in enumerate(ang):
        L = R * (0.70 + 0.45 * r.random())
        base = np.array(to_rgb(colors[i % len(colors)]))
        x = cx + np.cos(a) * L * t
        y = cy + np.sin(a) * L * t * ell - droop * R * t ** 2.4
        p = np.stack([x, y], axis=1)
        segs.append(np.stack([p[:-1], p[1:]], axis=1))
        tt = t[:-1]
        rgb = np.clip(
            (1.0 - tt)[:, None] * 0.62 + base[None, :] * (0.42 + 0.62 * tt)[:, None],
            0,
            1,
        )
        aa = (0.10 + 0.85 * tt ** 0.75) * alpha
        cols.append(np.concatenate([rgb, aa[:, None]], axis=1))
        lws.append(0.45 + 2.0 * tt)
        tips.append([x[-1], y[-1]])
        tipc.append(base)
    segs = np.concatenate(segs, axis=0)
    cols = np.concatenate(cols, axis=0)
    lws = np.concatenate(lws, axis=0)
    ax.add_collection(
        LineCollection(segs, colors=cols, linewidths=lws, capstyle="round", zorder=zorder)
    )
    tips = np.array(tips)
    ax.scatter(tips[:, 0], tips[:, 1], s=26, c=np.array(tipc), alpha=0.35 * alpha,
               linewidths=0, zorder=zorder)
    ax.scatter(tips[:, 0], tips[:, 1], s=4.5, c="#ffffff", alpha=0.85 * alpha,
               linewidths=0, zorder=zorder)
    # lingering smoke and the hot core
    ax.add_patch(Circle((cx, cy), R * 0.95, facecolor="#8ea0c8", edgecolor="none",
                        alpha=0.045 * alpha, zorder=zorder - 1))
    glow(ax, cx, cy, R * 0.75, colors[0], layers=13, amax=0.30 * alpha, power=2.2,
         zorder=zorder)
    glow(ax, cx, cy, R * 0.20, "#ffffff", layers=8, amax=0.40 * alpha, power=1.9,
         zorder=zorder)


def rising_trail(ax, x0, y0, y1, color, seed=0):
    r = np.random.default_rng(seed)
    t = np.linspace(0, 1, 26)
    x = x0 + np.sin(t * 3.1) * 9 + r.normal(0, 0.8, 26)
    y = y0 + (y1 - y0) * t ** 0.85
    p = np.stack([x, y], axis=1)
    segs = np.stack([p[:-1], p[1:]], axis=1)
    base = np.array(to_rgb(color))
    tt = t[:-1]
    rgb = np.clip((1 - tt)[:, None] * 0.15 + base[None, :], 0, 1)
    cols = np.concatenate([rgb, (0.05 + 0.55 * tt ** 2)[:, None]], axis=1)
    ax.add_collection(
        LineCollection(segs, colors=cols, linewidths=0.3 + 1.5 * tt, zorder=5)
    )
    ax.scatter([x[-1]], [y[-1]], s=16, c=[base], alpha=0.7, linewidths=0, zorder=5)


def skyline(ax):
    # distant hills
    xs = np.linspace(-40, W + 40, 400)
    for amp, base, col, al in ((46, 356, "#12143c", 1.0), (30, 330, "#0d0f2e", 1.0)):
        ys = (
            base
            + amp * np.sin(xs / 210.0 + amp)
            + amp * 0.45 * np.sin(xs / 71.0 + 1.3)
        )
        ax.fill_between(xs, ys, WATER_TOP - 6, color=col, alpha=al, zorder=3, lw=0)
    # town roofs with tiny windows
    x = -20.0
    while x < W + 20:
        w = rng.uniform(34, 78)
        h = rng.uniform(18, 52)
        ax.add_patch(
            Polygon(
                [(x, 302), (x, 302 + h), (x + w * 0.5, 302 + h + w * 0.20),
                 (x + w, 302 + h), (x + w, 302)],
                facecolor="#090b24",
                edgecolor="none",
                zorder=3,
            )
        )
        for _ in range(int(rng.integers(0, 3))):
            wx = x + rng.uniform(6, max(7, w - 10))
            wy = 302 + rng.uniform(6, max(7, h - 6))
            ax.scatter([wx], [wy], s=rng.uniform(2, 6), c="#ffca6e",
                       alpha=rng.uniform(0.35, 0.9), linewidths=0, zorder=3)
        x += w * rng.uniform(0.72, 1.0)


def lantern(ax, x, y, s=1.0, color="#ff7a3d", zorder=9):
    glow(ax, x, y, 34 * s, "#ffb35c", layers=12, amax=0.34, power=2.1, zorder=zorder - 1)
    ax.add_patch(Rectangle((x - 4.2 * s, y + 8.5 * s), 8.4 * s, 3.0 * s,
                           facecolor="#1a1206", edgecolor="none", zorder=zorder))
    ax.add_patch(Rectangle((x - 3.4 * s, y - 10.5 * s), 6.8 * s, 2.6 * s,
                           facecolor="#1a1206", edgecolor="none", zorder=zorder))
    ax.add_patch(Ellipse((x, y), 15.5 * s, 20.5 * s, facecolor=color,
                         edgecolor="#b83a12", lw=0.6 * s, zorder=zorder))
    ax.add_patch(Ellipse((x, y), 9.5 * s, 14.0 * s, facecolor="#ffd07a",
                         edgecolor="none", alpha=0.85, zorder=zorder))
    ax.add_patch(Ellipse((x, y), 4.5 * s, 7.5 * s, facecolor="#fff3c4",
                         edgecolor="none", alpha=0.95, zorder=zorder))
    for dy in (-0.32, 0.0, 0.32):
        ax.plot([x - 7.4 * s, x + 7.4 * s], [y + dy * 20.5 * s] * 2,
                color="#c2481a", lw=0.5 * s, alpha=0.55, zorder=zorder)


def stall(ax, cx, base, w, h, seed=0):
    r = np.random.default_rng(seed)
    hw = w / 2.0
    top = base + h
    # warm interior
    ax.add_patch(Rectangle((cx - hw * 0.92, base), hw * 1.84, h * 0.95,
                           facecolor="#2a1608", edgecolor="none", zorder=7))
    glow(ax, cx, base + h * 0.42, w * 0.55, "#ffa33c", layers=12, amax=0.30,
         power=2.0, zorder=7)
    # posts
    for sx in (-hw * 0.94, -hw * 0.32, hw * 0.32, hw * 0.94):
        ax.add_patch(Rectangle((cx + sx - 3, base), 6, h, facecolor="#120c06",
                               edgecolor="none", zorder=8))
    # counter
    ax.add_patch(Rectangle((cx - hw * 0.98, base), hw * 1.96, h * 0.34,
                           facecolor="#0a0a16", edgecolor="none", zorder=9))
    ax.plot([cx - hw * 0.98, cx + hw * 0.98], [base + h * 0.34] * 2,
            color="#ffb765", lw=1.4, alpha=0.55, zorder=9)
    # striped roof
    ridge = top + h * 0.26
    n = 8
    for i in range(n):
        x0 = cx - hw * 1.12 + (2.24 * hw) * i / n
        x1 = cx - hw * 1.12 + (2.24 * hw) * (i + 1) / n
        col = "#c02b28" if i % 2 == 0 else "#f2e6cf"
        ax.add_patch(
            Polygon(
                [(x0, top), (x1, top), (x1 * 0.86 + cx * 0.14, ridge),
                 (x0 * 0.86 + cx * 0.14, ridge)],
                facecolor=col, edgecolor="none", alpha=0.94, zorder=10,
            )
        )
    ax.add_patch(Rectangle((cx - hw * 1.14, top - 5), hw * 2.28, 7,
                           facecolor="#1a1008", edgecolor="none", zorder=10))
    ax.plot([cx - hw * 1.14, cx + hw * 1.14], [top + 1.5] * 2, color="#ffcf8a",
            lw=1.0, alpha=0.5, zorder=10)
    # noren banner
    ax.add_patch(Rectangle((cx - hw * 0.55, top - h * 0.30), hw * 1.10, h * 0.26,
                           facecolor="#0f1a3a", edgecolor="none", alpha=0.95,
                           zorder=10))
    for k in range(3):
        ax.plot([cx - hw * 0.30 + k * hw * 0.30] * 2,
                [top - h * 0.26, top - h * 0.10],
                color="#ffd79a", lw=1.5, alpha=0.75, zorder=10)
    # hanging lanterns under the eave
    for k in range(4):
        lx = cx - hw * 0.80 + k * (hw * 1.60 / 3.0)
        lantern(ax, lx, top - h * 0.06, s=0.85, zorder=11)
    # tiny vendor silhouette
    vx = cx + r.uniform(-hw * 0.4, hw * 0.4)
    ax.add_patch(Circle((vx, base + h * 0.60), 6, facecolor="#07070f",
                        edgecolor="none", zorder=9))
    ax.add_patch(Polygon([(vx - 11, base + h * 0.34), (vx + 11, base + h * 0.34),
                          (vx + 8, base + h * 0.55), (vx - 8, base + h * 0.55)],
                         facecolor="#07070f", edgecolor="none", zorder=9))


def light_string(ax, x0, x1, y0, y1, sag, n, zorder=11):
    t = np.linspace(0, 1, 220)
    x = x0 + (x1 - x0) * t
    y = y0 + (y1 - y0) * t - sag * np.sin(np.pi * t)
    ax.plot(x, y, color="#1b1408", lw=1.1, alpha=0.9, zorder=zorder)
    tb = np.linspace(0.04, 0.96, n)
    bx = x0 + (x1 - x0) * tb
    by = y0 + (y1 - y0) * tb - sag * np.sin(np.pi * tb)
    for px, py in zip(bx, by):
        lantern(ax, px, py - 12, s=0.62, zorder=zorder)


def water(ax, bursts):
    cmap = LinearSegmentedColormap.from_list(
        "w", [(0.0, "#050716"), (0.55, "#0a1130"), (1.0, "#1a2159")]
    )
    grad = cmap(np.linspace(0, 1, 240))[:, :3].reshape(240, 1, 3)
    ax.imshow(grad, extent=(0, W, WATER_BOT, WATER_TOP), origin="lower",
              aspect="auto", interpolation="bilinear", zorder=4)
    ax.plot([0, W], [WATER_TOP] * 2, color="#5f6bb0", lw=1.2, alpha=0.5, zorder=5)
    # squashed reflections of each burst
    for cx, cy, R, colors in bursts:
        ry = WATER_TOP - (cy - WATER_TOP) * 0.085
        r = np.random.default_rng(int(cx))
        for _ in range(150):
            a = r.uniform(0, 2 * np.pi)
            t = r.random() ** 0.6
            px = cx + np.cos(a) * R * t * 1.05 + r.normal(0, 5)
            py = ry + np.sin(a) * R * t * 0.085
            if WATER_BOT < py < WATER_TOP:
                ax.plot([px - r.uniform(3, 12), px + r.uniform(3, 12)], [py, py],
                        color=colors[r.integers(0, len(colors))],
                        lw=r.uniform(0.6, 1.7),
                        alpha=r.uniform(0.10, 0.34), zorder=5,
                        solid_capstyle="round")
        for k in range(26):
            f = k / 26.0
            py = WATER_TOP - f * (WATER_TOP - WATER_BOT)
            if py <= WATER_BOT:
                break
            half = R * (0.28 + 0.75 * f)
            ax.plot([cx - half, cx + half], [py, py], color=colors[0],
                    lw=np.random.default_rng(k + int(cx)).uniform(0.8, 2.4),
                    alpha=0.16 * (1 - f) ** 1.4, zorder=5, solid_capstyle="round")
    # warm lantern reflections from the far bank
    for _ in range(180):
        px = rng.uniform(0, W)
        py = rng.uniform(WATER_BOT, WATER_TOP)
        f = (py - WATER_BOT) / (WATER_TOP - WATER_BOT)
        ax.plot([px - rng.uniform(4, 16), px + rng.uniform(4, 16)], [py, py],
                color=["#ffb35c", "#ff8a3d", "#ffd79a"][rng.integers(0, 3)],
                lw=rng.uniform(0.5, 1.8), alpha=0.05 + 0.22 * f ** 2, zorder=5,
                solid_capstyle="round")
    # ripples
    for _ in range(120):
        px = rng.uniform(0, W)
        py = rng.uniform(WATER_BOT, WATER_TOP)
        ax.plot([px - rng.uniform(6, 22), px + rng.uniform(6, 22)], [py, py],
                color="#9fb0ff", lw=rng.uniform(0.4, 0.9),
                alpha=rng.uniform(0.04, 0.13), zorder=5, solid_capstyle="round")


def person(ax, x, base, h, dark="#05060e", rim="#ffb266", fan=False, bun=False,
           arm=False, zorder=13):
    hw = h * 0.14
    hr = h * 0.082
    hy = base + h - hr
    body = [
        (x - hw * 1.20, base),
        (x - hw * 1.02, base + h * 0.40),
        (x - hw * 0.98, base + h * 0.66),
        (x - hw * 0.30, base + h * 0.80),
        (x + hw * 0.30, base + h * 0.80),
        (x + hw * 0.98, base + h * 0.66),
        (x + hw * 1.02, base + h * 0.40),
        (x + hw * 1.20, base),
    ]
    ax.add_patch(Polygon(body, facecolor=dark, edgecolor="none", zorder=zorder))
    ax.add_patch(Circle((x, hy), hr, facecolor=dark, edgecolor="none", zorder=zorder))
    if bun:
        ax.add_patch(Circle((x - hr * 0.15, hy + hr * 0.95), hr * 0.52,
                            facecolor=dark, edgecolor="none", zorder=zorder))
    if arm:
        ax.add_patch(Polygon([(x + hw * 0.75, base + h * 0.70),
                              (x + hw * 2.0, base + h * 0.98),
                              (x + hw * 2.2, base + h * 0.90),
                              (x + hw * 0.95, base + h * 0.58)],
                             facecolor=dark, edgecolor="none", zorder=zorder))
    if fan:
        fx, fy = x + hw * 2.3, base + h * 1.0
        ax.add_patch(Circle((fx, fy), h * 0.075, facecolor=dark, edgecolor="none",
                            zorder=zorder))
        ax.plot([fx, fx - h * 0.06], [fy - h * 0.06, fy - h * 0.11], color=dark,
                lw=2.0, zorder=zorder)
        a = np.linspace(0.5, 2.4, 40)
        ax.plot(fx + h * 0.075 * np.cos(a), fy + h * 0.075 * np.sin(a), color=rim,
                lw=1.2, alpha=0.45, zorder=zorder)
    a = np.linspace(0.35, 2.79, 60)
    ax.plot(x + hr * np.cos(a), hy + hr * np.sin(a), color=rim, lw=1.5, alpha=0.5,
            zorder=zorder)
    ax.plot([x - hw * 0.95, x - hw * 0.28], [base + h * 0.665, base + h * 0.795],
            color=rim, lw=1.2, alpha=0.35, zorder=zorder)
    ax.plot([x + hw * 0.95, x + hw * 0.28], [base + h * 0.665, base + h * 0.795],
            color=rim, lw=1.2, alpha=0.35, zorder=zorder)


def far_crowd(ax):
    for _ in range(90):
        x = rng.uniform(-10, W + 10)
        h = rng.uniform(20, 34)
        ax.add_patch(Polygon([(x - h * 0.16, 300), (x - h * 0.13, 300 + h * 0.72),
                              (x + h * 0.13, 300 + h * 0.72), (x + h * 0.16, 300)],
                             facecolor="#04050c", edgecolor="none", zorder=12))
        ax.add_patch(Circle((x, 300 + h * 0.83), h * 0.13, facecolor="#04050c",
                            edgecolor="none", zorder=12))
        if rng.random() < 0.4:
            ax.scatter([x], [300 + h * 0.95], s=3, c="#ffb266", alpha=0.35,
                       linewidths=0, zorder=12)


def crowd(ax):
    ax.add_patch(Rectangle((0, 0), W, 205, facecolor="#04050d", edgecolor="none",
                           zorder=12))
    for i in range(16):
        ax.add_patch(Rectangle((0, 195 - i * 3), W, 3, facecolor="#2b2a63",
                               edgecolor="none", alpha=0.05, zorder=12))
    # back row of the foreground crowd
    for _ in range(26):
        x = rng.uniform(-20, W + 20)
        person(ax, x, rng.uniform(120, 150), rng.uniform(120, 165),
               dark="#060713", rim="#c98a52", bun=rng.random() < 0.4,
               fan=rng.random() < 0.18, zorder=13)
    # front row
    spots = np.linspace(-30, W + 30, 19) + rng.normal(0, 16, 19)
    tall = []
    for i, x in enumerate(spots):
        h = rng.uniform(195, 265)
        if i in (3, 12):
            h = rng.uniform(150, 175)  # children
        base = rng.uniform(-14, 24)
        person(ax, x, base, h, dark="#02030a", rim="#ffb266",
               bun=rng.random() < 0.42, fan=rng.random() < 0.28,
               arm=rng.random() < 0.22, zorder=14)
        tall.append((base + h * 0.80, x))
    # a child riding on the shoulders of the tallest adult
    shoulder, px = max(tall)
    person(ax, px, shoulder - 6, 108, dark="#02030a", rim="#ffc07a", arm=True,
           zorder=15)
    # a couple of hand-held lanterns in the crowd
    for lx, ly in ((spots[2] + 34, 150), (spots[15] - 30, 138)):
        lantern(ax, lx, ly, s=0.7, zorder=15)


def main(out):
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    ax.set_autoscale_on(False)
    ax.axis("off")

    sky(ax)
    stars(ax)

    bursts = [
        (330, 655, 205, ["#ffd24a", "#ffae1f", "#fff2b8", "#ff8a3a"]),
        (795, 735, 165, ["#ff5fa6", "#ffa5d2", "#ffffff", "#c96bff"]),
        (985, 520, 122, ["#6ff0ff", "#9dffd2", "#ffffff", "#54c7f7"]),
    ]

    burst(ax, 150, 815, 62, ["#ffe6a0", "#ffc46a"], n_rays=44, seed=11, alpha=0.45,
          droop=0.10)
    burst(ax, 1120, 645, 74, ["#a8b6ff", "#ffffff"], n_rays=52, seed=12, alpha=0.4,
          droop=0.12)

    rising_trail(ax, 560, 320, 560, "#ffd79a", seed=3)
    rising_trail(ax, 905, 315, 430, "#ffc07a", seed=4)

    for cx, cy, R, colors in bursts:
        burst(ax, cx, cy, R, colors, n_rays=104, seed=int(cx), droop=0.15)
        # secondary inner ring
        burst(ax, cx, cy, R * 0.42, [colors[-1], "#ffffff"], n_rays=46,
              seed=int(cx) + 5, droop=0.08, alpha=0.75)

    skyline(ax)
    water(ax, bursts)
    far_crowd(ax)

    for cx, w, seed in ((150, 250, 1), (450, 215, 2), (800, 225, 3), (1085, 240, 4)):
        stall(ax, cx, 298, w, 118, seed=seed)

    light_string(ax, -20, 400, 452, 438, 44, 7)
    light_string(ax, 400, 830, 438, 446, 52, 8)
    light_string(ax, 830, 1220, 446, 458, 40, 7)

    crowd(ax)

    # overall night bloom
    for cx, cy, R, colors in bursts:
        glow(ax, cx, cy, R * 2.1, colors[0], layers=10, amax=0.10, power=2.6,
             zorder=16)

    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    fig.savefig(out, dpi=100, facecolor="#03040f", pad_inches=0)
    plt.close(fig)


if __name__ == "__main__":
    main(sys.argv[1])
