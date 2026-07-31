import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, FancyBboxPatch, Polygon

# ----------------------------------------------------------------------------
# font
# ----------------------------------------------------------------------------
JP_CANDIDATES = [
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Hiragino Maru Gothic Pro",
    "YuGothic",
    "Yu Gothic",
    "Noto Sans CJK JP",
    "Noto Sans JP",
    "IPAexGothic",
    "IPAPGothic",
    "TakaoPGothic",
    "MS Gothic",
]


def pick_font():
    available = {f.name for f in font_manager.fontManager.ttflist}
    for name in JP_CANDIDATES:
        if name in available:
            return name
    return None


JP_FONT = pick_font()
if JP_FONT:
    plt.rcParams["font.family"] = [JP_FONT, "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False
JA = JP_FONT is not None

# ----------------------------------------------------------------------------
# palette
# ----------------------------------------------------------------------------
BG = "#f2f5f8"
PANEL_FC = "#ffffff"
PANEL_EC = "#d9e0e7"
LINK_FC = "#5b6b79"
LINK_CAP = "#71818e"
LINK_HI = "#93a2ae"
LINK_EC = "#2c363e"
BASE_FC = "#3b464f"
BASE_CAP = "#4c5862"
FLOOR = "#e0e5eb"
TEXT = "#1e2933"
MUTED = "#6a7681"
LEADER = "#a9b4be"

ROLL = "#e07b39"
PITCH = "#2b7fc4"


def shade(hexcolor, factor):
    hexcolor = hexcolor.lstrip("#")
    r, g, b = (int(hexcolor[i:i + 2], 16) for i in (0, 2, 4))
    if factor <= 1.0:
        r, g, b = (int(c * factor) for c in (r, g, b))
    else:
        f = factor - 1.0
        r, g, b = (int(c + (255 - c) * f) for c in (r, g, b))
    clamp = lambda c: max(0, min(255, c))
    return "#%02x%02x%02x" % (clamp(r), clamp(g), clamp(b))


# ----------------------------------------------------------------------------
# 3d helpers (pure python, matplotlib only)
# ----------------------------------------------------------------------------
def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vmul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def vcross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def vunit(a):
    n = math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) or 1.0
    return (a[0] / n, a[1] / n, a[2] / n)


def perp_basis(n):
    n = vunit(n)
    ref = (0.0, 0.0, 1.0) if abs(n[2]) < 0.9 else (1.0, 0.0, 0.0)
    u = vunit(vcross(n, ref))
    return u, vcross(n, u)


# cabinet projection: z stays vertical, +y recedes toward the upper right
DEPTH = 0.52
DEPTH_A = math.radians(30.0)
SCALE = 1.42
OX, OY = 1.70, 1.00


def proj(p):
    x, y, z = p
    return (OX + SCALE * (x + DEPTH * math.cos(DEPTH_A) * y),
            OY + SCALE * (z + DEPTH * math.sin(DEPTH_A) * y))


def ring3(center, axis, radius, n=56):
    u, v = perp_basis(axis)
    out = []
    for i in range(n):
        t = 2.0 * math.pi * i / n
        out.append(vadd(center, vadd(vmul(u, radius * math.cos(t)),
                                     vmul(v, radius * math.sin(t)))))
    return out


def convex_hull(pts):
    pts = sorted(set(pts))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def cylinder(ax, center, axis, radius, half, face, cap, edge, z, lw=1.0):
    a = vunit(axis)
    c_far = vadd(center, vmul(a, half))
    c_near = vsub(center, vmul(a, half))
    r_far = [proj(p) for p in ring3(c_far, a, radius)]
    r_near = [proj(p) for p in ring3(c_near, a, radius)]
    body = convex_hull(r_far + r_near)
    ax.add_patch(Polygon(body, closed=True, facecolor=face, edgecolor=edge,
                         lw=lw, joinstyle="round", zorder=z))
    front = r_near if c_near[1] <= c_far[1] else r_far
    ax.add_patch(Polygon(front, closed=True, facecolor=cap, edgecolor=edge,
                         lw=lw, zorder=z + 0.05))
    return proj(center)


def link_tube(ax, a, b, radius, z, face=LINK_FC, cap=LINK_CAP, edge=LINK_EC):
    d = vsub(b, a)
    length = math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
    mid = vmul(vadd(a, b), 0.5)
    cylinder(ax, mid, d, radius, length / 2.0, face, cap, edge, z)
    # lit edge on the upper-left flank
    pa, pb = proj(a), proj(b)
    dx, dy = pb[0] - pa[0], pb[1] - pa[1]
    L = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / L, dx / L
    if nx * -0.6 + ny * 0.8 < 0:
        nx, ny = -nx, -ny
    r = radius * SCALE
    o1, o2 = 0.62 * r, 0.26 * r
    strip = [(pa[0] + nx * o1, pa[1] + ny * o1),
             (pb[0] + nx * o1, pb[1] + ny * o1),
             (pb[0] + nx * o2, pb[1] + ny * o2),
             (pa[0] + nx * o2, pa[1] + ny * o2)]
    ax.add_patch(Polygon(strip, closed=True, facecolor=LINK_HI,
                         edgecolor="none", alpha=0.85, zorder=z + 0.06))


def axis_line(ax, center, axis, half_len, color, z):
    a = vunit(axis)
    p1 = proj(vsub(center, vmul(a, half_len)))
    p2 = proj(vadd(center, vmul(a, half_len)))
    ax.add_line(Line2D([p1[0], p2[0]], [p1[1], p2[1]], color=color, lw=1.1,
                       ls=(0, (4, 3)), alpha=0.9, zorder=z))


def rotation_arrow(ax, center, axis, radius, t0, t1, color, z,
                   lw=2.0, head=0.15):
    u, v = perp_basis(axis)
    pts = []
    n = 72
    for i in range(n + 1):
        t = math.radians(t0 + (t1 - t0) * i / n)
        pts.append(proj(vadd(center, vadd(vmul(u, radius * math.cos(t)),
                                          vmul(v, radius * math.sin(t))))))
    ax.add_line(Line2D([p[0] for p in pts], [p[1] for p in pts], color=color,
                       lw=lw, solid_capstyle="round", zorder=z))
    p1, p2 = pts[-5], pts[-1]
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    L = math.hypot(dx, dy) or 1.0
    dx, dy = dx / L, dy / L
    px, py = -dy, dx
    tip = (p2[0] + dx * head * 0.85, p2[1] + dy * head * 0.85)
    left = (p2[0] - dx * head * 0.35 + px * head * 0.52,
            p2[1] - dy * head * 0.35 + py * head * 0.52)
    right = (p2[0] - dx * head * 0.35 - px * head * 0.52,
             p2[1] - dy * head * 0.35 - py * head * 0.52)
    ax.add_patch(Polygon([tip, left, right], closed=True, facecolor=color,
                         edgecolor="none", zorder=z + 0.1))


# ----------------------------------------------------------------------------
# kinematics of the pose
# ----------------------------------------------------------------------------
YAW = math.radians(30.0)
H = (math.cos(YAW), math.sin(YAW), 0.0)          # in-plane horizontal
SIDE = (-math.sin(YAW), math.cos(YAW), 0.0)      # pitch axis
UP = (0.0, 0.0, 1.0)


def direction(pitch_deg):
    p = math.radians(pitch_deg)
    return vunit(vadd(vmul(H, math.sin(p)), vmul(UP, math.cos(p))))


SEGMENTS = [
    (0.62, 0.0),    # J1 -> J2
    (0.95, 24.0),   # J2 -> J3
    (0.80, 24.0),   # J3 -> J4
    (0.80, 48.0),   # J4 -> J5
    (0.68, 48.0),   # J5 -> J6
    (0.45, 78.0),   # J6 -> J7
    (0.42, 78.0),   # J7 -> tool tip
]

P = [(0.0, 0.0, 0.50)]
DIRS = []
for length, pitch in SEGMENTS:
    d = direction(pitch)
    DIRS.append(d)
    P.append(vadd(P[-1], vmul(d, length)))

JOINT_AXIS = [UP, SIDE, DIRS[1], SIDE, DIRS[3], SIDE, DIRS[5]]
JOINT_KIND = ["roll", "pitch", "roll", "pitch", "roll", "pitch", "roll"]
JOINT_R = [0.30, 0.27, 0.245, 0.235, 0.205, 0.185, 0.165]
JOINT_T = [0.20, 0.19, 0.17, 0.165, 0.15, 0.135, 0.12]
LINK_R = [0.185, 0.185, 0.175, 0.165, 0.145, 0.125, 0.115]
ARC_SPAN = [(30, 305), (20, 300), (35, 310), (20, 300), (35, 310), (25, 300),
            (35, 310)]

COLOR = [ROLL if k == "roll" else PITCH for k in JOINT_KIND]

# ----------------------------------------------------------------------------
# copy
# ----------------------------------------------------------------------------
if JA:
    TITLE = "7軸ロボットアームと各軸のはたらき"
    SUBTITLE = "ベース → リンク → 手先 を7つの回転軸がつなぎ、姿勢と向きを自由に作る"
    PANEL_TITLE = "各軸のはたらき"
    ROWS = [
        ("基部旋回", "垂直軸(Z)まわりにアーム全体を旋回させる", "ロール軸"),
        ("肩ピッチ", "上腕を前後に振り、腕を持ち上げる", "ピッチ軸"),
        ("上腕ロール", "上腕の長手軸まわりにひねる", "ロール軸"),
        ("肘ピッチ", "前腕を曲げ伸ばしして距離を調整する", "ピッチ軸"),
        ("前腕ロール", "前腕の長手軸まわりにひねる", "ロール軸"),
        ("手首ピッチ", "手先を上下に振って向きを整える", "ピッチ軸"),
        ("フランジロール", "取り付けたツールを回転させる", "ロール軸"),
    ]
    LEGEND = [
        (ROLL, "オレンジ = ひねり（ロール）軸"),
        (PITCH, "ブルー = 曲げ（ピッチ）軸"),
    ]
    NOTE = "破線 = 回転軸　／　曲線の矢印 = 回転方向"
    LBL_BASE = "ベース（床に固定）"
    LBL_LINK = "リンク（腕の構造体）"
    LBL_TOOL = "手先（エンドエフェクタ）"
else:
    TITLE = "7-Axis Robot Arm and Its Joint Axes"
    SUBTITLE = ("Seven rotary joints chain the base, the links "
                "and the end effector.")
    PANEL_TITLE = "What each axis does"
    ROWS = [
        ("Base yaw", "Swings the whole arm about the vertical Z axis", "roll"),
        ("Shoulder pitch", "Raises and lowers the upper arm", "pitch"),
        ("Upper-arm roll", "Twists about the upper-arm axis", "roll"),
        ("Elbow pitch", "Bends the forearm to set the reach", "pitch"),
        ("Forearm roll", "Twists about the forearm axis", "roll"),
        ("Wrist pitch", "Tilts the hand up and down", "pitch"),
        ("Flange roll", "Spins the mounted tool", "roll"),
    ]
    LEGEND = [
        (ROLL, "orange = roll (twist) axis"),
        (PITCH, "blue = pitch (bend) axis"),
    ]
    NOTE = "dashed line = axis of rotation   /   curved arrow = direction"
    LBL_BASE = "base (fixed to the floor)"
    LBL_LINK = "link (arm structure)"
    LBL_TOOL = "end effector"

# ----------------------------------------------------------------------------
# figure
# ----------------------------------------------------------------------------
fig = plt.figure(figsize=(12.0, 9.0), dpi=100)
fig.patch.set_facecolor(BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.set_axis_off()

# floor
floor = [proj((1.20 * math.cos(2 * math.pi * i / 72),
               1.20 * math.sin(2 * math.pi * i / 72), 0.0)) for i in range(72)]
ax.add_patch(Polygon(floor, closed=True, facecolor=FLOOR, edgecolor="#d2d9e0",
                     lw=1.0, zorder=1))
inner = [proj((0.86 * math.cos(2 * math.pi * i / 72),
               0.86 * math.sin(2 * math.pi * i / 72), 0.0)) for i in range(72)]
ax.add_patch(Polygon(inner, closed=True, facecolor="#d7dee5", edgecolor="none",
                     zorder=1.1))

# base pedestal
cylinder(ax, (0.0, 0.0, 0.05), UP, 0.78, 0.05, shade(BASE_FC, 0.85),
         BASE_FC, LINK_EC, 2.0)
cylinder(ax, (0.0, 0.0, 0.27), UP, 0.60, 0.17, BASE_FC, BASE_CAP, LINK_EC, 2.2)

# links
for i in range(7):
    link_tube(ax, P[i], P[i + 1], LINK_R[i], 3.0 + i * 0.3)

# end effector: flange, gripper body and two fingers
tool_d = DIRS[6]
tip = P[7]
cylinder(ax, vadd(tip, vmul(tool_d, 0.03)), tool_d, 0.165, 0.055,
         shade(LINK_FC, 0.9), LINK_CAP, LINK_EC, 5.4)
for sgn in (1.0, -1.0):
    root = vadd(vadd(tip, vmul(tool_d, 0.07)), vmul(SIDE, 0.135 * sgn))
    end = vadd(root, vmul(tool_d, 0.30))
    link_tube(ax, root, end, 0.05, 5.5 + 0.1 * sgn,
              face=shade(LINK_FC, 1.1), cap=LINK_HI)

# joints, axes and rotation arrows
for i in range(7):
    c = P[i]
    col = COLOR[i]
    cylinder(ax, c, JOINT_AXIS[i], JOINT_R[i], JOINT_T[i], shade(col, 0.86),
             col, shade(col, 0.55), 6.0 + i * 0.3)
    hub = proj(c)
    ax.add_patch(Circle(hub, JOINT_R[i] * SCALE * 0.30, facecolor="#ffffff",
                        edgecolor="none", alpha=0.85, zorder=6.2 + i * 0.3))
    axis_line(ax, c, JOINT_AXIS[i], JOINT_R[i] * 2.9, shade(col, 0.7), 9.0)
    t0, t1 = ARC_SPAN[i]
    rotation_arrow(ax, c, JOINT_AXIS[i], JOINT_R[i] * 1.85, t0, t1,
                   shade(col, 0.78), 10.0,
                   lw=2.1 - i * 0.05, head=0.17 - i * 0.006)

# joint badges with leader lines
BADGE_OFFSET = [(-1.20, -0.05), (-1.15, 0.10), (-1.10, 0.20), (-1.10, 0.34),
                (-1.05, 0.60), (-0.85, 0.80), (0.05, 0.85)]
BADGE_R = 0.225
for i in range(7):
    hub = proj(P[i])
    bx = hub[0] + BADGE_OFFSET[i][0]
    by = hub[1] + BADGE_OFFSET[i][1]
    dx, dy = hub[0] - bx, hub[1] - by
    L = math.hypot(dx, dy) or 1.0
    sx, sy = bx + dx / L * BADGE_R, by + dy / L * BADGE_R
    ex = hub[0] - dx / L * (JOINT_R[i] * SCALE * 1.9)
    ey = hub[1] - dy / L * (JOINT_R[i] * SCALE * 1.9)
    ax.add_line(Line2D([sx, ex], [sy, ey], color=LEADER, lw=0.9, zorder=11.0))
    ax.add_patch(Circle((bx, by), BADGE_R, facecolor=COLOR[i],
                        edgecolor="#ffffff", lw=1.6, zorder=12.0))
    ax.text(bx, by, "J%d" % (i + 1), ha="center", va="center", fontsize=10.5,
            color="#ffffff", fontweight="bold", zorder=12.1)

# structural callouts
ax.text(proj((0.0, 0.0, 0.0))[0], 0.30, LBL_BASE, ha="center", va="center",
        fontsize=9.5, color=TEXT, zorder=13)

link_mid = proj(vmul(vadd(P[2], P[3]), 0.5))
ax.add_line(Line2D([4.22, link_mid[0] + 0.28], [3.34, link_mid[1] - 0.06],
                   color=LEADER, lw=0.9, zorder=11))
ax.add_patch(Circle((link_mid[0] + 0.28, link_mid[1] - 0.06), 0.045,
                    facecolor=LEADER, edgecolor="none", zorder=11.1))
ax.text(4.30, 3.30, LBL_LINK, ha="left", va="center", fontsize=9.5,
        color=TEXT, zorder=13)

tool_mid = proj(vadd(tip, vmul(tool_d, 0.20)))
ax.add_line(Line2D([6.02, tool_mid[0] - 0.05], [5.52, tool_mid[1] - 0.30],
                   color=LEADER, lw=0.9, zorder=11))
ax.text(5.98, 5.36, LBL_TOOL, ha="center", va="center", fontsize=9.5,
        color=TEXT, zorder=13)

# ----------------------------------------------------------------------------
# titles and side panel
# ----------------------------------------------------------------------------
ax.text(0.55, 8.58, TITLE, ha="left", va="center", fontsize=20,
        color=TEXT, fontweight="bold", zorder=13)
ax.text(0.58, 8.20, SUBTITLE, ha="left", va="center", fontsize=10,
        color=MUTED, zorder=13)

ax.add_patch(FancyBboxPatch((7.45, 0.60), 4.20, 7.35,
                            boxstyle="round,pad=0.0,rounding_size=0.16",
                            facecolor=PANEL_FC, edgecolor=PANEL_EC, lw=1.2,
                            zorder=14))
ax.text(7.72, 7.68, PANEL_TITLE, ha="left", va="center", fontsize=12.5,
        color=TEXT, fontweight="bold", zorder=15)
ax.add_line(Line2D([7.72, 11.38], [7.48, 7.48], color=PANEL_EC, lw=1.0,
                   zorder=15))

row_y = 7.08
for i, (title, desc, kind) in enumerate(ROWS):
    col = COLOR[i]
    ax.add_patch(Circle((7.92, row_y + 0.02), 0.185, facecolor=col,
                        edgecolor="none", zorder=15))
    ax.text(7.92, row_y + 0.02, "J%d" % (i + 1), ha="center", va="center",
            fontsize=8.5, color="#ffffff", fontweight="bold", zorder=15.1)
    ax.text(8.20, row_y + 0.15, title, ha="left", va="center", fontsize=10.5,
            color=TEXT, fontweight="bold", zorder=15)
    ax.text(11.38, row_y + 0.15, kind, ha="right", va="center", fontsize=8.5,
            color=col, fontweight="bold", zorder=15)
    ax.text(8.20, row_y - 0.17, desc, ha="left", va="center", fontsize=8.8,
            color=MUTED, zorder=15)
    row_y -= 0.80

ax.add_line(Line2D([7.72, 11.38], [1.80, 1.80], color=PANEL_EC, lw=1.0,
                   zorder=15))
ly = 1.48
for col, text in LEGEND:
    ax.add_patch(Circle((7.86, ly), 0.085, facecolor=col, edgecolor="none",
                        zorder=15))
    ax.text(8.06, ly, text, ha="left", va="center", fontsize=9,
            color=TEXT, zorder=15)
    ly -= 0.33
ax.text(7.72, 0.86, NOTE, ha="left", va="center", fontsize=8.5, color=MUTED,
        zorder=15)

fig.savefig(sys.argv[1], dpi=100, facecolor=BG)
plt.close(fig)
