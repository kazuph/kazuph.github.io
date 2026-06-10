import sys
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, PathPatch
from matplotlib.path import Path
import matplotlib.patheffects as pe

def add_patch(ax, patch, shadow=True):
    if shadow:
        patch.set_path_effects([
            pe.SimplePatchShadow(offset=(3, -3), alpha=0.18, rho=0.95),
            pe.Normal()
        ])
    ax.add_patch(patch)
    return patch

def heart_path(cx, cy, s):
    verts = [
        (cx, cy - 0.32 * s),
        (cx - 0.95 * s, cy + 0.35 * s),
        (cx - 0.55 * s, cy + 1.05 * s),
        (cx, cy + 0.55 * s),
        (cx + 0.55 * s, cy + 1.05 * s),
        (cx + 0.95 * s, cy + 0.35 * s),
        (cx, cy - 0.32 * s),
        (cx, cy - 0.32 * s),
    ]
    codes = [
        Path.MOVETO,
        Path.CURVE4,
        Path.CURVE4,
        Path.CURVE4,
        Path.CURVE4,
        Path.CURVE4,
        Path.CURVE4,
        Path.CLOSEPOLY,
    ]
    return Path(verts, codes)

def main():
    if len(sys.argv) < 2:
        raise SystemExit("output path required")

    out_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#fff7ed")
    ax.set_facecolor("#fff7ed")
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.6, 5.7)
    ax.set_aspect("equal")
    ax.axis("off")

    fur = "#c98b58"
    fur_light = "#dfad7d"
    fur_dark = "#9f643e"
    inner = "#f0bf9b"
    cream = "#ffe0bd"
    blush = "#ef9a8a"
    stitch = "#7e4f34"
    dark = "#37241b"
    patch_red = "#d97361"
    patch_gold = "#f2c36b"

    add_patch(ax, Ellipse((0, -0.55), 5.25, 5.25, facecolor=fur, edgecolor=fur_dark, linewidth=4))
    add_patch(ax, Ellipse((-2.85, -0.3), 1.35, 3.1, angle=-24, facecolor=fur, edgecolor=fur_dark, linewidth=3))
    add_patch(ax, Ellipse((2.85, -0.3), 1.35, 3.1, angle=24, facecolor=fur, edgecolor=fur_dark, linewidth=3))
    add_patch(ax, Ellipse((-1.45, -3.0), 1.8, 1.45, angle=-9, facecolor=fur, edgecolor=fur_dark, linewidth=3))
    add_patch(ax, Ellipse((1.45, -3.0), 1.8, 1.45, angle=9, facecolor=fur, edgecolor=fur_dark, linewidth=3))

    add_patch(ax, Ellipse((-1.45, -3.0), 1.02, 0.78, angle=-9, facecolor=cream, edgecolor=fur_dark, linewidth=2), shadow=False)
    add_patch(ax, Ellipse((1.45, -3.0), 1.02, 0.78, angle=9, facecolor=cream, edgecolor=fur_dark, linewidth=2), shadow=False)
    for x in (-1.75, -1.45, -1.15):
        add_patch(ax, Circle((x, -2.58), 0.13, facecolor=fur_light, edgecolor=fur_dark, linewidth=1), shadow=False)
    for x in (1.15, 1.45, 1.75):
        add_patch(ax, Circle((x, -2.58), 0.13, facecolor=fur_light, edgecolor=fur_dark, linewidth=1), shadow=False)

    add_patch(ax, Circle((-2.15, 2.75), 1.05, facecolor=fur, edgecolor=fur_dark, linewidth=4))
    add_patch(ax, Circle((2.15, 2.75), 1.05, facecolor=fur, edgecolor=fur_dark, linewidth=4))
    add_patch(ax, Circle((-2.15, 2.75), 0.58, facecolor=inner, edgecolor=fur_dark, linewidth=2), shadow=False)
    add_patch(ax, Circle((2.15, 2.75), 0.58, facecolor=inner, edgecolor=fur_dark, linewidth=2), shadow=False)

    add_patch(ax, Circle((0, 2.15), 2.45, facecolor=fur, edgecolor=fur_dark, linewidth=4))
    add_patch(ax, Ellipse((0, 1.55), 1.75, 1.18, facecolor=cream, edgecolor=fur_dark, linewidth=2.5), shadow=False)

    add_patch(ax, Circle((-0.8, 2.45), 0.2, facecolor=dark, edgecolor=dark, linewidth=1), shadow=False)
    add_patch(ax, Circle((0.8, 2.45), 0.2, facecolor=dark, edgecolor=dark, linewidth=1), shadow=False)
    add_patch(ax, Circle((-0.88, 2.54), 0.055, facecolor="white", edgecolor="none"), shadow=False)
    add_patch(ax, Circle((0.72, 2.54), 0.055, facecolor="white", edgecolor="none"), shadow=False)

    add_patch(ax, Ellipse((0, 1.82), 0.52, 0.36, facecolor=dark, edgecolor=dark, linewidth=1.5), shadow=False)
    ax.plot([0, 0], [1.64, 1.35], color=dark, linewidth=3, solid_capstyle="round")
    ax.plot([-0.38, -0.18, 0, 0.18, 0.38], [1.34, 1.14, 1.08, 1.14, 1.34],
            color=dark, linewidth=3, solid_capstyle="round")

    add_patch(ax, Ellipse((-1.25, 1.55), 0.58, 0.28, facecolor=blush, edgecolor="none", alpha=0.58), shadow=False)
    add_patch(ax, Ellipse((1.25, 1.55), 0.58, 0.28, facecolor=blush, edgecolor="none", alpha=0.58), shadow=False)

    add_patch(ax, Ellipse((0, -0.65), 2.35, 2.15, facecolor=fur_light, edgecolor=fur_dark, linewidth=2.5, alpha=0.92), shadow=False)

    heart = PathPatch(heart_path(0, -0.45, 0.62), facecolor=patch_red, edgecolor=fur_dark, linewidth=2.2)
    add_patch(ax, heart, shadow=False)
    add_patch(ax, Circle((-0.18, -0.18), 0.08, facecolor=patch_gold, edgecolor=fur_dark, linewidth=1), shadow=False)
    add_patch(ax, Circle((0.22, -0.48), 0.07, facecolor=patch_gold, edgecolor=fur_dark, linewidth=1), shadow=False)

    for y in [-2.15, -1.65, -1.15, -0.65, -0.15, 0.35]:
        ax.plot([-0.12, 0.12], [y, y + 0.08], color=stitch, linewidth=2, alpha=0.72, solid_capstyle="round")

    for x, y, r in [(-2.95, -0.95, 0.08), (2.95, -0.95, 0.08), (-1.9, 0.75, 0.06),
                    (1.9, 0.75, 0.06), (-0.75, -2.65, 0.055), (0.75, -2.65, 0.055)]:
        add_patch(ax, Circle((x, y), r, facecolor=fur_dark, edgecolor="none", alpha=0.45), shadow=False)

    ax.plot([-3.05, -2.7, -2.35], [0.55, 0.42, 0.55], color=stitch, linewidth=2.2, alpha=0.7)
    ax.plot([2.35, 2.7, 3.05], [0.55, 0.42, 0.55], color=stitch, linewidth=2.2, alpha=0.7)
    ax.plot([-2.4, -2.15, -1.9], [3.22, 3.06, 3.22], color=stitch, linewidth=2.0, alpha=0.62)
    ax.plot([1.9, 2.15, 2.4], [3.22, 3.06, 3.22], color=stitch, linewidth=2.0, alpha=0.62)

    add_patch(ax, Ellipse((-0.85, 3.0), 0.6, 0.16, angle=16, facecolor="#f6c08b", edgecolor="none", alpha=0.25), shadow=False)
    add_patch(ax, Ellipse((0.65, 3.05), 0.52, 0.14, angle=-14, facecolor="#f6c08b", edgecolor="none", alpha=0.22), shadow=False)
    add_patch(ax, Ellipse((-0.65, 0.55), 0.72, 0.18, angle=-16, facecolor="#ffe2c0", edgecolor="none", alpha=0.22), shadow=False)
    add_patch(ax, Ellipse((0.78, 0.18), 0.62, 0.16, angle=18, facecolor="#ffe2c0", edgecolor="none", alpha=0.18), shadow=False)

    plt.savefig(out_path, bbox_inches="tight", pad_inches=0, facecolor=fig.get_facecolor())
    plt.close(fig)

if __name__ == "__main__":
    main()
