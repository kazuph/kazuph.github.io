import sys
import math
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Circle, Ellipse, Polygon, Rectangle, Wedge, Arc, PathPatch
from matplotlib.path import Path
import numpy as np


def draw_room(ax):
    # Floor
    ax.add_patch(Polygon(
        [(0.5, 0.8), (11.5, 0.8), (11.0, 2.2), (1.0, 2.2)],
        closed=True, facecolor="#C4A882", edgecolor="#8B7355", lw=1.5, zorder=1
    ))
    # Floor boards
    for x in np.linspace(1.2, 11.0, 10):
        ax.plot([x, x - 0.35], [2.2, 0.8], color="#A89070", lw=0.6, alpha=0.5, zorder=1)

    # Back wall
    ax.add_patch(Rectangle((1.0, 2.2), 10.0, 6.0, facecolor="#E8F0F5", edgecolor="#7A8A95", lw=2, zorder=0))
    # Wall decoration stripe
    ax.add_patch(Rectangle((1.0, 7.5), 10.0, 0.15, facecolor="#7EB8D4", edgecolor="none", zorder=0))

    # Left wall (perspective)
    ax.add_patch(Polygon(
        [(0.5, 0.8), (1.0, 2.2), (1.0, 8.2), (0.5, 7.5)],
        closed=True, facecolor="#D5E3EA", edgecolor="#7A8A95", lw=2, zorder=0
    ))

    # Ceiling hint
    ax.add_patch(Polygon(
        [(0.5, 7.5), (1.0, 8.2), (11.0, 8.2), (11.5, 7.5)],
        closed=True, facecolor="#F5F8FA", edgecolor="#7A8A95", lw=1.5, zorder=0
    ))


def draw_doorway(ax):
    # Door frame on left side (room entrance)
    ax.add_patch(Rectangle((0.55, 1.0), 1.35, 5.6, facecolor="#4A3A2A", edgecolor="#2A1F15", lw=2, zorder=2))
    # Door opening (hallway beyond)
    ax.add_patch(Rectangle((0.7, 1.15), 1.05, 5.3, facecolor="#3D4A55", edgecolor="none", zorder=2))
    # Hallway floor visible
    ax.add_patch(Polygon(
        [(0.7, 1.15), (1.75, 1.15), (1.75, 2.0), (0.7, 1.8)],
        closed=True, facecolor="#6B5A48", edgecolor="none", zorder=2
    ))
    # Door jamb highlight
    ax.add_patch(Rectangle((0.55, 1.0), 0.12, 5.6, facecolor="#6B5344", edgecolor="none", zorder=3))
    ax.add_patch(Rectangle((1.78, 1.0), 0.12, 5.6, facecolor="#3A2A1A", edgecolor="none", zorder=3))
    ax.add_patch(Rectangle((0.55, 6.45), 1.35, 0.15, facecolor="#6B5344", edgecolor="none", zorder=3))


def draw_bed(ax):
    # Bed against back-right wall
    # Mattress
    ax.add_patch(FancyBboxPatch(
        (7.2, 2.5), 3.5, 2.0,
        boxstyle="round,pad=0.05,rounding_size=0.15",
        facecolor="#5B9BD5", edgecolor="#3A6FA0", lw=1.5, zorder=4
    ))
    # Pillow
    ax.add_patch(FancyBboxPatch(
        (9.5, 3.6), 1.0, 0.7,
        boxstyle="round,pad=0.02,rounding_size=0.1",
        facecolor="#F0F4F8", edgecolor="#B0B8C0", lw=1, zorder=5
    ))
    # Blanket fold
    ax.add_patch(Polygon(
        [(7.3, 2.6), (8.8, 2.6), (8.6, 3.5), (7.3, 3.5)],
        closed=True, facecolor="#3A7AB8", edgecolor="none", alpha=0.7, zorder=5
    ))
    # Bed legs / frame bottom
    ax.add_patch(Rectangle((7.3, 2.25), 0.25, 0.3, facecolor="#8B6914", edgecolor="#5A4510", lw=0.8, zorder=3))
    ax.add_patch(Rectangle((10.3, 2.25), 0.25, 0.3, facecolor="#8B6914", edgecolor="#5A4510", lw=0.8, zorder=3))


def draw_desk(ax):
    # Desk on left-center
    ax.add_patch(FancyBboxPatch(
        (2.2, 2.4), 2.8, 1.3,
        boxstyle="round,pad=0.02,rounding_size=0.08",
        facecolor="#D4A574", edgecolor="#8B6914", lw=1.5, zorder=4
    ))
    # Desk legs
    for x in [2.35, 4.65]:
        ax.add_patch(Rectangle((x, 1.7), 0.18, 0.75, facecolor="#A07840", edgecolor="#6B5030", lw=0.8, zorder=3))
    # Monitor
    ax.add_patch(FancyBboxPatch(
        (2.6, 3.7), 1.6, 1.1,
        boxstyle="round,pad=0.02,rounding_size=0.05",
        facecolor="#2A2A2A", edgecolor="#1A1A1A", lw=1.5, zorder=5
    ))
    ax.add_patch(Rectangle((2.75, 3.85), 1.3, 0.8, facecolor="#4A90D9", edgecolor="none", zorder=6))
    # Screen glow content
    ax.add_patch(Rectangle((2.9, 4.1), 0.5, 0.3, facecolor="#7EC8E8", edgecolor="none", alpha=0.8, zorder=7))
    # Monitor stand
    ax.add_patch(Rectangle((3.25, 3.55), 0.3, 0.2, facecolor="#444", edgecolor="none", zorder=5))
    ax.add_patch(Rectangle((3.0, 3.45), 0.8, 0.12, facecolor="#555", edgecolor="none", zorder=5))
    # Keyboard
    ax.add_patch(FancyBboxPatch(
        (2.7, 3.0), 1.2, 0.35,
        boxstyle="round,pad=0.01,rounding_size=0.04",
        facecolor="#333", edgecolor="#222", lw=0.8, zorder=5
    ))
    # Mouse
    ax.add_patch(Ellipse((4.3, 3.15), 0.3, 0.2, facecolor="#444", edgecolor="#222", lw=0.6, zorder=5))
    # Chair
    ax.add_patch(Ellipse((3.5, 2.0), 1.0, 0.45, facecolor="#2C5F8A", edgecolor="#1A3A55", lw=1, zorder=3))
    ax.add_patch(FancyBboxPatch(
        (3.05, 2.15), 0.9, 0.9,
        boxstyle="round,pad=0.02,rounding_size=0.1",
        facecolor="#3A7AB0", edgecolor="#1A4A70", lw=1, zorder=4
    ))


def draw_shelf(ax):
    # Bookshelf against back wall left-center
    ax.add_patch(FancyBboxPatch(
        (5.0, 2.5), 1.6, 3.2,
        boxstyle="square,pad=0",
        facecolor="#B8956A", edgecolor="#7A5A30", lw=1.5, zorder=4
    ))
    # Shelves
    for y in [3.3, 4.1, 4.9]:
        ax.add_patch(Rectangle((5.05, y), 1.5, 0.08, facecolor="#8B6914", edgecolor="none", zorder=5))
    # Books
    book_colors = ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C", "#E67E22", "#34495E"]
    for i, c in enumerate(book_colors[:5]):
        ax.add_patch(Rectangle((5.15 + i * 0.28, 4.2), 0.24, 0.65, facecolor=c, edgecolor="#222", lw=0.4, zorder=6))
    for i, c in enumerate(book_colors[3:8]):
        ax.add_patch(Rectangle((5.15 + i * 0.28, 3.4), 0.24, 0.6, facecolor=c, edgecolor="#222", lw=0.4, zorder=6))
    # Toy / game box on top shelf
    ax.add_patch(FancyBboxPatch(
        (5.2, 5.05), 0.7, 0.5,
        boxstyle="round,pad=0.01,rounding_size=0.05",
        facecolor="#E74C3C", edgecolor="#A03020", lw=0.8, zorder=6
    ))
    ax.add_patch(FancyBboxPatch(
        (6.05, 5.1), 0.4, 0.4,
        boxstyle="round,pad=0.01,rounding_size=0.08",
        facecolor="#F1C40F", edgecolor="#C0A000", lw=0.8, zorder=6
    ))
    # Poster on wall above shelf area
    ax.add_patch(FancyBboxPatch(
        (5.1, 6.0), 1.4, 1.2,
        boxstyle="round,pad=0.02,rounding_size=0.05",
        facecolor="#2C3E50", edgecolor="#1A252F", lw=1.5, zorder=3
    ))
    ax.text(5.8, 6.6, "GAME", fontsize=8, color="#ECF0F1", ha="center", va="center",
            fontweight="bold", zorder=4, family="sans-serif")


def draw_son(ax):
    cx, cy = 7.5, 4.0  # standing center-right in room

    # Shadow
    ax.add_patch(Ellipse((cx, 1.95), 1.4, 0.35, facecolor="#000", alpha=0.15, zorder=2))

    # Legs (action pose - slightly apart, one bent)
    # Left leg
    ax.plot([cx - 0.15, cx - 0.45], [cy - 0.3, 2.1], color="#2C3E50", lw=8, solid_capstyle="round", zorder=8)
    ax.add_patch(Ellipse((cx - 0.5, 2.05), 0.4, 0.18, facecolor="#1A1A2E", edgecolor="none", zorder=9))
    # Right leg (stepping)
    ax.plot([cx + 0.15, cx + 0.55], [cy - 0.3, 2.25], color="#2C3E50", lw=8, solid_capstyle="round", zorder=8)
    ax.add_patch(Ellipse((cx + 0.6, 2.2), 0.4, 0.18, facecolor="#1A1A2E", edgecolor="none", zorder=9))

    # Torso
    torso = FancyBboxPatch(
        (cx - 0.45, cy - 0.35), 0.9, 1.3,
        boxstyle="round,pad=0.02,rounding_size=0.2",
        facecolor="#E74C3C", edgecolor="#C0392B", lw=1.5, zorder=10
    )
    ax.add_patch(torso)
    # Shirt stripe
    ax.add_patch(Rectangle((cx - 0.4, cy + 0.3), 0.8, 0.15, facecolor="#FFFFFF", edgecolor="none", alpha=0.9, zorder=11))

    # Head
    head_y = cy + 1.35
    ax.add_patch(Circle((cx, head_y), 0.48, facecolor="#F5CBA7", edgecolor="#D4A574", lw=1.5, zorder=12))

    # Hair
    ax.add_patch(Wedge((cx, head_y + 0.1), 0.5, 10, 170, facecolor="#5D4037", edgecolor="#3E2723", lw=1, zorder=13))
    ax.add_patch(Ellipse((cx - 0.25, head_y + 0.25), 0.35, 0.25, facecolor="#5D4037", edgecolor="none", zorder=13))
    ax.add_patch(Ellipse((cx + 0.2, head_y + 0.28), 0.3, 0.22, facecolor="#5D4037", edgecolor="none", zorder=13))

    # VR headset
    ax.add_patch(FancyBboxPatch(
        (cx - 0.42, head_y - 0.18), 0.84, 0.42,
        boxstyle="round,pad=0.01,rounding_size=0.12",
        facecolor="#1A1A1A", edgecolor="#000", lw=1.5, zorder=14
    ))
    # VR lenses glow
    ax.add_patch(Circle((cx - 0.18, head_y + 0.02), 0.14, facecolor="#00E5FF", edgecolor="#0088AA", lw=1, zorder=15, alpha=0.9))
    ax.add_patch(Circle((cx + 0.18, head_y + 0.02), 0.14, facecolor="#00E5FF", edgecolor="#0088AA", lw=1, zorder=15, alpha=0.9))
    # Strap
    ax.add_patch(Arc((cx, head_y), 0.95, 0.7, angle=0, theta1=200, theta2=340,
                      color="#333", lw=3, zorder=13))
    # Headband top
    ax.add_patch(Rectangle((cx - 0.08, head_y + 0.25), 0.16, 0.25, facecolor="#222", edgecolor="#111", lw=0.8, zorder=14))

    # Smile (enjoying)
    ax.add_patch(Arc((cx, head_y - 0.28), 0.35, 0.22, angle=0, theta1=200, theta2=340,
                      color="#C0392B", lw=1.5, zorder=14))

    # Arms raised with controllers (excited pose)
    # Left arm
    ax.plot([cx - 0.4, cx - 1.3], [cy + 0.6, cy + 1.5], color="#F5CBA7", lw=7, solid_capstyle="round", zorder=11)
    ax.plot([cx - 0.4, cx - 1.3], [cy + 0.6, cy + 1.5], color="#E74C3C", lw=5, solid_capstyle="round",
            zorder=11, alpha=0)  # sleeve hint via wider base
    # Left sleeve
    ax.plot([cx - 0.4, cx - 0.85], [cy + 0.6, cy + 1.05], color="#C0392B", lw=9, solid_capstyle="round", zorder=11)

    # Right arm
    ax.plot([cx + 0.4, cx + 1.4], [cy + 0.7, cy + 1.3], color="#F5CBA7", lw=7, solid_capstyle="round", zorder=11)
    ax.plot([cx + 0.4, cx + 0.9], [cy + 0.7, cy + 1.0], color="#C0392B", lw=9, solid_capstyle="round", zorder=11)

    # Controllers
    # Left controller
    lx, ly = cx - 1.35, cy + 1.55
    ax.add_patch(FancyBboxPatch(
        (lx - 0.18, ly - 0.28), 0.36, 0.55,
        boxstyle="round,pad=0.01,rounding_size=0.1",
        facecolor="#222", edgecolor="#000", lw=1.2, zorder=16
    ))
    ax.add_patch(Circle((lx, ly + 0.05), 0.1, facecolor="#00E5FF", edgecolor="#0088AA", lw=0.8, zorder=17))
    ax.add_patch(Circle((lx - 0.08, ly - 0.12), 0.05, facecolor="#555", edgecolor="none", zorder=17))
    ax.add_patch(Circle((lx + 0.08, ly - 0.12), 0.05, facecolor="#555", edgecolor="none", zorder=17))

    # Right controller
    rx, ry = cx + 1.45, cy + 1.35
    ax.add_patch(FancyBboxPatch(
        (rx - 0.18, ry - 0.28), 0.36, 0.55,
        boxstyle="round,pad=0.01,rounding_size=0.1",
        facecolor="#222", edgecolor="#000", lw=1.2, zorder=16
    ))
    ax.add_patch(Circle((rx, ry + 0.05), 0.1, facecolor="#FF4081", edgecolor="#AA2060", lw=0.8, zorder=17))
    ax.add_patch(Circle((rx - 0.08, ry - 0.12), 0.05, facecolor="#555", edgecolor="none", zorder=17))
    ax.add_patch(Circle((rx + 0.08, ry - 0.12), 0.05, facecolor="#555", edgecolor="none", zorder=17))

    # Motion swooshes (playing actively)
    for i, (ox, oy, a) in enumerate([(-1.7, 1.8, 30), (-1.9, 1.4, 50), (1.8, 1.6, -20)]):
        theta = np.linspace(0, np.pi * 0.6, 30)
        sx = cx + ox + 0.3 * np.cos(theta + math.radians(a))
        sy = cy + oy + 0.2 * np.sin(theta + math.radians(a))
        ax.plot(sx, sy, color="#00E5FF", lw=1.5, alpha=0.45, zorder=9, solid_capstyle="round")

    return cx, head_y


def draw_mother(ax):
    # Mother standing in doorway, looking at son
    mx, my = 1.2, 3.8

    # Body partially in doorway
    # Legs
    ax.plot([mx - 0.1, mx - 0.15], [my - 0.5, 1.4], color="#2C3E50", lw=7, solid_capstyle="round", zorder=20)
    ax.plot([mx + 0.12, mx + 0.2], [my - 0.5, 1.45], color="#2C3E50", lw=7, solid_capstyle="round", zorder=20)
    ax.add_patch(Ellipse((mx - 0.18, 1.35), 0.35, 0.15, facecolor="#4A3728", edgecolor="none", zorder=21))
    ax.add_patch(Ellipse((mx + 0.22, 1.4), 0.35, 0.15, facecolor="#4A3728", edgecolor="none", zorder=21))

    # Dress / torso
    dress = Polygon(
        [(mx - 0.45, my - 0.55), (mx + 0.45, my - 0.55),
         (mx + 0.35, my + 0.9), (mx - 0.35, my + 0.9)],
        closed=True, facecolor="#8E44AD", edgecolor="#6C3483", lw=1.5, zorder=20
    )
    ax.add_patch(dress)
    # Apron hint
    ax.add_patch(Polygon(
        [(mx - 0.25, my - 0.4), (mx + 0.25, my - 0.4), (mx + 0.2, my + 0.5), (mx - 0.2, my + 0.5)],
        closed=True, facecolor="#F5E6D3", edgecolor="#D4C4A8", lw=0.8, zorder=21
    ))

    # Arms - one on hip, one raised near face (watching)
    ax.plot([mx + 0.35, mx + 0.7], [my + 0.5, my + 0.2], color="#F5CBA7", lw=6, solid_capstyle="round", zorder=21)
    ax.plot([mx + 0.35, mx + 0.55], [my + 0.5, my + 0.35], color="#8E44AD", lw=8, solid_capstyle="round", zorder=21)
    # Hand near chin (observing)
    ax.add_patch(Circle((mx + 0.72, my + 0.15), 0.12, facecolor="#F5CBA7", edgecolor="#D4A574", lw=0.8, zorder=22))
    # Other arm
    ax.plot([mx - 0.35, mx - 0.55], [my + 0.4, my - 0.1], color="#F5CBA7", lw=6, solid_capstyle="round", zorder=21)
    ax.plot([mx - 0.35, mx - 0.45], [my + 0.4, my + 0.15], color="#8E44AD", lw=8, solid_capstyle="round", zorder=21)
    ax.add_patch(Circle((mx - 0.55, my - 0.15), 0.11, facecolor="#F5CBA7", edgecolor="#D4A574", lw=0.8, zorder=22))

    # Head
    mh_y = my + 1.35
    ax.add_patch(Circle((mx, mh_y), 0.42, facecolor="#F5CBA7", edgecolor="#D4A574", lw=1.5, zorder=22))

    # Hair (mother's longer hair)
    ax.add_patch(Wedge((mx, mh_y + 0.05), 0.45, 0, 180, facecolor="#3E2723", edgecolor="#1A1008", lw=1, zorder=23))
    # Side hair
    ax.add_patch(Ellipse((mx - 0.38, mh_y - 0.1), 0.22, 0.7, facecolor="#3E2723", edgecolor="none", zorder=21))
    ax.add_patch(Ellipse((mx + 0.38, mh_y - 0.05), 0.2, 0.65, facecolor="#3E2723", edgecolor="none", zorder=21))
    ax.add_patch(Ellipse((mx, mh_y + 0.25), 0.5, 0.28, facecolor="#3E2723", edgecolor="none", zorder=23))

    # Eyes looking toward son (gaze direction rightward)
    ax.add_patch(Circle((mx + 0.08, mh_y + 0.05), 0.08, facecolor="#FFFFFF", edgecolor="#333", lw=0.6, zorder=24))
    ax.add_patch(Circle((mx + 0.28, mh_y + 0.05), 0.08, facecolor="#FFFFFF", edgecolor="#333", lw=0.6, zorder=24))
    # Pupils looking right (toward son)
    ax.add_patch(Circle((mx + 0.12, mh_y + 0.05), 0.04, facecolor="#2C1810", edgecolor="none", zorder=25))
    ax.add_patch(Circle((mx + 0.32, mh_y + 0.05), 0.04, facecolor="#2C1810", edgecolor="none", zorder=25))
    # Brows (mild surprise / amused)
    ax.plot([mx + 0.0, mx + 0.16], [mh_y + 0.2, mh_y + 0.22], color="#3E2723", lw=1.5, zorder=24)
    ax.plot([mx + 0.2, mx + 0.38], [mh_y + 0.22, mh_y + 0.2], color="#3E2723", lw=1.5, zorder=24)

    # Soft smile
    ax.add_patch(Arc((mx + 0.15, mh_y - 0.15), 0.28, 0.18, angle=0, theta1=200, theta2=340,
                      color="#C0392B", lw=1.3, zorder=24))

    return mx, mh_y


def draw_gaze(ax, mother_pos, son_pos):
    mx, mh_y = mother_pos
    sx, sh_y = son_pos
    # Dashed gaze line from mother's eyes to son's VR headset
    ax.annotate(
        "",
        xy=(sx - 0.5, sh_y),
        xytext=(mx + 0.45, mh_y + 0.05),
        arrowprops=dict(
            arrowstyle="-|>",
            color="#E74C3C",
            lw=1.8,
            linestyle=(0, (4, 3)),
            alpha=0.7,
            connectionstyle="arc3,rad=-0.08",
        ),
        zorder=30,
    )
    # Label near gaze
    mid_x = (mx + sx) / 2 + 0.3
    mid_y = (mh_y + sh_y) / 2 + 0.55
    ax.text(mid_x, mid_y, "watching", fontsize=9, color="#C0392B",
            ha="center", style="italic", alpha=0.75, zorder=30, family="sans-serif")


def draw_window(ax):
    # Window on back wall
    ax.add_patch(FancyBboxPatch(
        (8.5, 5.5), 2.0, 1.8,
        boxstyle="round,pad=0.02,rounding_size=0.05",
        facecolor="#87CEEB", edgecolor="#5A7A8A", lw=2, zorder=2
    ))
    # Cross bars
    ax.plot([9.5, 9.5], [5.5, 7.3], color="#5A7A8A", lw=2, zorder=3)
    ax.plot([8.5, 10.5], [6.4, 6.4], color="#5A7A8A", lw=2, zorder=3)
    # Sky gradient hint
    ax.add_patch(Rectangle((8.6, 6.5), 0.85, 0.7, facecolor="#B0D4F0", edgecolor="none", zorder=2, alpha=0.6))
    ax.add_patch(Rectangle((9.6, 6.5), 0.85, 0.7, facecolor="#B0D4F0", edgecolor="none", zorder=2, alpha=0.6))
    # Curtain
    ax.add_patch(Polygon(
        [(8.4, 7.3), (8.7, 7.3), (8.55, 5.4), (8.35, 5.4)],
        closed=True, facecolor="#E8A0B0", edgecolor="#C08090", lw=0.8, zorder=3
    ))


def draw_rug(ax):
    ax.add_patch(Ellipse((7.2, 2.0), 2.8, 0.7, facecolor="#E67E22", edgecolor="#D35400", lw=1.5, zorder=2, alpha=0.85))
    ax.add_patch(Ellipse((7.2, 2.0), 1.8, 0.4, facecolor="#F5CBA7", edgecolor="none", lw=0, zorder=2, alpha=0.5))


def draw_lamp(ax):
    # Floor lamp near bed
    ax.plot([10.8, 10.8], [2.2, 5.5], color="#888", lw=2.5, zorder=5)
    ax.add_patch(Polygon(
        [(10.3, 5.5), (11.3, 5.5), (11.1, 6.3), (10.5, 6.3)],
        closed=True, facecolor="#F9E79F", edgecolor="#D4AC0D", lw=1, zorder=6
    ))
    ax.add_patch(Ellipse((10.8, 2.15), 0.5, 0.15, facecolor="#555", edgecolor="#333", lw=0.8, zorder=5))
    # Light glow
    ax.add_patch(Circle((10.8, 5.9), 0.6, facecolor="#F9E79F", alpha=0.2, edgecolor="none", zorder=4))


def main():
    out = sys.argv[1]
    fig, ax = plt.subplots(1, 1, figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor("#F0EDE6")
    ax.set_facecolor("#F0EDE6")

    draw_room(ax)
    draw_doorway(ax)
    draw_window(ax)
    draw_rug(ax)
    draw_bed(ax)
    draw_desk(ax)
    draw_shelf(ax)
    draw_lamp(ax)

    son_pos = draw_son(ax)
    mother_pos = draw_mother(ax)
    draw_gaze(ax, mother_pos, son_pos)

    # Soft labels
    ax.text(7.5, 0.45, "son's room", fontsize=10, color="#7A6A5A",
            ha="center", style="italic", alpha=0.6, family="sans-serif")
    ax.text(1.2, 6.9, "mom", fontsize=9, color="#8E44AD",
            ha="center", style="italic", alpha=0.7, family="sans-serif")

    plt.tight_layout(pad=0.1)
    fig.savefig(out, dpi=100, bbox_inches="tight", pad_inches=0.05, facecolor=fig.get_facecolor())
    plt.close()


if __name__ == "__main__":
    main()
