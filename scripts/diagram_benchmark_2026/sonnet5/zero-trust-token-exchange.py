import sys
import math
import matplotlib.pyplot as plt
from matplotlib.patches import (
    FancyBboxPatch, Rectangle, FancyArrowPatch, Circle, Polygon, Wedge, Arc
)

output_path = sys.argv[1]

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
BG = "#0b1220"
PANEL = "#111827"
TEXT_MAIN = "#e5e7eb"
TEXT_SUB = "#9ca3af"

ZONE1_COLOR = "#f87171"   # untrusted (public internet)          - red
ZONE2_COLOR = "#c084fc"   # identity trust boundary               - purple
ZONE3_COLOR = "#fbbf24"   # zero-trust perimeter / PEP / DMZ       - amber
ZONE4_COLOR = "#34d399"   # internal trust zone / service mesh     - green

TOKEN_ID_COLOR = "#60a5fa"        # ID token        - blue, dashed
TOKEN_ACCESS_COLOR = "#34d399"    # access token    - green, solid
TOKEN_SVC1_COLOR = "#fb923c"      # service token 1 - orange, thick
TOKEN_SVC2_COLOR = "#f472b6"      # service token 2 - pink, thick
CONTROL_COLOR = "#94a3b8"         # control-plane check - gray, dotted
LOCK_COLOR = "#fbbf24"            # PEP enforcement lock

# ---------------------------------------------------------------------------
# Figure / axes (full-bleed 1200x900 @ dpi100)
# ---------------------------------------------------------------------------
fig = plt.figure(figsize=(12, 9), dpi=100)
fig.patch.set_facecolor(BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_facecolor(BG)
ax.set_xlim(0, 140)
ax.set_ylim(0, 100)
ax.axis("off")


# ---------------------------------------------------------------------------
# Icon primitives
# ---------------------------------------------------------------------------
def draw_person_icon(ax, cx, cy, color):
    ax.add_patch(Circle((cx, cy + 0.75), 0.75, facecolor=color, edgecolor="none", zorder=6))
    ax.add_patch(Wedge((cx, cy - 0.65), 1.55, 0, 180, facecolor=color, edgecolor="none", zorder=6))


def draw_browser_icon(ax, cx, cy, color):
    w, h = 2.6, 1.9
    ax.add_patch(Rectangle((cx - w / 2, cy - h / 2), w, h, facecolor="none",
                            edgecolor=color, linewidth=1.4, zorder=6))
    bar_h = 0.5
    ax.add_patch(Rectangle((cx - w / 2, cy + h / 2 - bar_h), w, bar_h,
                            facecolor=color, edgecolor="none", zorder=6))
    for dx in (-0.9, -0.55, -0.2):
        ax.add_patch(Circle((cx + dx, cy + h / 2 - bar_h / 2), 0.09,
                             facecolor=BG, edgecolor="none", zorder=7))


def draw_shield_icon(ax, cx, cy, color):
    s = 1.0
    pts = [
        (cx, cy + 1.9 * s), (cx + 1.5 * s, cy + 1.1 * s), (cx + 1.5 * s, cy - 0.6 * s),
        (cx, cy - 1.9 * s), (cx - 1.5 * s, cy - 0.6 * s), (cx - 1.5 * s, cy + 1.1 * s),
    ]
    ax.add_patch(Polygon(pts, closed=True, facecolor="none", edgecolor=color,
                          linewidth=1.5, zorder=6))
    ax.plot([cx - 0.7 * s, cx - 0.1 * s, cx + 0.8 * s],
            [cy + 0.1 * s, cy - 0.7 * s, cy + 0.8 * s],
            color=color, linewidth=1.5, zorder=7, solid_capstyle="round")


def draw_gateway_icon(ax, cx, cy, color):
    r = 1.5
    pts = []
    for i in range(6):
        ang = math.radians(60 * i - 30)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    ax.add_patch(Polygon(pts, closed=True, facecolor="none", edgecolor=color,
                          linewidth=1.5, zorder=6))
    ax.add_patch(Circle((cx, cy), 0.35, facecolor=color, edgecolor="none", zorder=7))


def draw_server_icon(ax, cx, cy, color):
    w = 2.3
    bar_h = 0.55
    gap = 0.22
    total = 3 * bar_h + 2 * gap
    y0 = cy - total / 2
    for i in range(3):
        y = y0 + i * (bar_h + gap)
        ax.add_patch(Rectangle((cx - w / 2, y), w, bar_h, facecolor="none",
                                edgecolor=color, linewidth=1.2, zorder=6))
        ax.add_patch(Circle((cx - w / 2 + 0.3, y + bar_h / 2), 0.09,
                             facecolor=color, edgecolor="none", zorder=7))


def draw_lock_icon(ax, cx, cy, color=LOCK_COLOR, scale=1.3):
    ax.add_patch(Arc((cx, cy + 0.5 * scale), 1.3 * scale, 1.6 * scale,
                      angle=0, theta1=0, theta2=180, linewidth=1.8, color=color, zorder=6))
    ax.add_patch(FancyBboxPatch((cx - 0.75 * scale, cy - 0.85 * scale), 1.5 * scale, 1.3 * scale,
                                 boxstyle="round,pad=0,rounding_size=0.15",
                                 facecolor=color, edgecolor="none", zorder=6))
    ax.add_patch(Circle((cx, cy - 0.25 * scale), 0.16 * scale, facecolor=BG,
                         edgecolor="none", zorder=7))


# ---------------------------------------------------------------------------
# Structural helpers
# ---------------------------------------------------------------------------
def trust_zone(ax, x, y, w, h, label, color):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=1.5",
                                 facecolor=color, edgecolor="none", alpha=0.07, zorder=1))
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=1.5",
                                 facecolor="none", edgecolor=color, linewidth=1.8,
                                 linestyle="--", zorder=2))
    ax.text(x + 2, y + h - 2.3, label, fontsize=8.3, fontweight="bold",
            color=color, ha="left", va="top", zorder=3)


def node_box(ax, cx, cy, w, h, title, subtitle, edge_color, icon_fn):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                                 boxstyle="round,pad=0.4,rounding_size=1.4",
                                 linewidth=2.0, edgecolor=edge_color,
                                 facecolor=PANEL, zorder=4))
    icon_fn(ax, cx, cy + h * 0.26, edge_color)
    ax.text(cx, cy - h * 0.08, title, ha="center", va="center",
            color=TEXT_MAIN, fontsize=10.5, fontweight="bold", zorder=6)
    ax.text(cx, cy - h * 0.34, subtitle, ha="center", va="center",
            color=TEXT_SUB, fontsize=7.3, zorder=6)


def flow_arrow(ax, pa, pb, color, style="-|>", lw=2.2, rad=0.0, ls="-", ms=16):
    ax.add_patch(FancyArrowPatch(pa, pb, connectionstyle=f"arc3,rad={rad}",
                                  arrowstyle=style, mutation_scale=ms, linewidth=lw,
                                  linestyle=ls, color=color, zorder=7))


def flow_label(ax, x, y, text, color):
    ax.text(x, y, text, fontsize=7.6, color=color, ha="center", va="center", zorder=8,
            bbox=dict(facecolor=BG, edgecolor="none", alpha=0.8, pad=1.6))


# ---------------------------------------------------------------------------
# Title
# ---------------------------------------------------------------------------
ax.text(70, 97, "Zero-Trust Authentication & Token Exchange",
        ha="center", va="center", fontsize=17, fontweight="bold", color=TEXT_MAIN, zorder=9)
ax.text(70, 93.3,
        "OIDC Login -> Access Token -> Downstream Service Token Exchange (RFC 8693), verified at every hop",
        ha="center", va="center", fontsize=9.3, color=TEXT_SUB, zorder=9)

# ---------------------------------------------------------------------------
# Trust boundary gradient bar (left margin)
# ---------------------------------------------------------------------------
bar_x, bar_y, bar_w, bar_h = 0.8, 6, 1.6, 82
seg_h = bar_h / 4
seg_colors = [ZONE1_COLOR, ZONE2_COLOR, ZONE3_COLOR, ZONE4_COLOR]
for i, c in enumerate(seg_colors):
    y = bar_y + bar_h - (i + 1) * seg_h
    ax.add_patch(Rectangle((bar_x, y), bar_w, seg_h, facecolor=c, edgecolor="none",
                            alpha=0.55, zorder=1))
ax.text(bar_x + bar_w / 2, bar_y - 2.3, "trust\nboundary", ha="center", va="top",
        fontsize=6, color=TEXT_SUB, zorder=3)

# ---------------------------------------------------------------------------
# Trust zones
# ---------------------------------------------------------------------------
trust_zone(ax, 4, 62, 48, 26, "ZONE 1 - UNTRUSTED (User Device / Public Internet)", ZONE1_COLOR)
trust_zone(ax, 58, 62, 58, 26, "ZONE 2 - IDENTITY TRUST BOUNDARY (IdP Domain)", ZONE2_COLOR)
trust_zone(ax, 4, 34, 112, 22, "ZONE 3 - ZERO-TRUST PERIMETER (PEP / DMZ / Edge)", ZONE3_COLOR)
trust_zone(ax, 4, 6, 112, 22, "ZONE 4 - INTERNAL TRUST ZONE (Service Mesh, mTLS only)", ZONE4_COLOR)

# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------
node_box(ax, 15, 77, 16, 11, "User", "Resource Owner", ZONE1_COLOR, draw_person_icon)
node_box(ax, 40, 77, 18, 11, "Browser", "Public Client (UA)", ZONE1_COLOR, draw_browser_icon)
node_box(ax, 87, 77, 22, 13, "Identity Provider", "OIDC/OAuth2 - PDP", ZONE2_COLOR, draw_shield_icon)
node_box(ax, 60, 44, 26, 13, "API Gateway", "Policy Enforcement Point", ZONE3_COLOR, draw_gateway_icon)
node_box(ax, 30, 15, 22, 12, "Service A", "Edge Microservice", ZONE4_COLOR, draw_server_icon)
node_box(ax, 90, 15, 22, 12, "Service B", "Internal Microservice", ZONE4_COLOR, draw_server_icon)

# ---------------------------------------------------------------------------
# Flows
# ---------------------------------------------------------------------------
# 1. User -> Browser
flow_arrow(ax, (23, 77), (31, 77), TEXT_SUB, lw=1.6, ms=13)
flow_label(ax, 27, 80.3, "1  Login", TEXT_SUB)

# 2. Browser -> IdP  (authentication request)
flow_arrow(ax, (49, 80), (76, 80), TEXT_SUB, lw=1.8, ms=14)
flow_label(ax, 62, 82.6, "2  AuthN Request (OIDC redirect)", TEXT_SUB)

# 3. IdP -> Browser  (ID token)
flow_arrow(ax, (76, 75), (49, 75), TOKEN_ID_COLOR, lw=2.2, rad=-0.15, ls="--", ms=15)
flow_label(ax, 62, 72.4, "3  ID Token (OIDC, aud=browser)", TOKEN_ID_COLOR)

# 4. IdP -> Browser  (access token)
flow_arrow(ax, (76, 72), (49, 72), TOKEN_ACCESS_COLOR, lw=2.2, rad=-0.15, ms=15)
flow_label(ax, 62, 69.3, "4  Access Token (JWT, scope=api)", TOKEN_ACCESS_COLOR)

# 5. Browser -> API Gateway (bearer access token)
flow_arrow(ax, (40, 71.5), (54, 50.5), TOKEN_ACCESS_COLOR, lw=2.4, rad=-0.08, ms=16)
flow_label(ax, 43.5, 61.5, "5  Access Token\n(Bearer, HTTPS)", TOKEN_ACCESS_COLOR)
draw_lock_icon(ax, 48, 58.5)

# 6. API Gateway <-> IdP (JWKS / introspection)
flow_arrow(ax, (70, 50.5), (87, 70.5), CONTROL_COLOR, style="<|-|>", lw=1.8, rad=0.2, ls=":", ms=12)
flow_label(ax, 82, 61.5, "6  JWKS /\nIntrospect", CONTROL_COLOR)
draw_lock_icon(ax, 77, 58.5)

# 7. API Gateway -> Service A (service token, token exchange)
flow_arrow(ax, (52, 37.5), (30, 21), TOKEN_SVC1_COLOR, lw=3.0, rad=-0.1, ms=17)
flow_label(ax, 36.5, 30.5, "7  Service Token\n(Token Exchange, RFC 8693)", TOKEN_SVC1_COLOR)
draw_lock_icon(ax, 43, 31)

# 8. Service A -> Service B (re-issued service token, mTLS)
flow_arrow(ax, (41, 15), (79, 15), TOKEN_SVC2_COLOR, lw=3.0, ms=17)
flow_label(ax, 60, 18.6, "8  Service Token (mTLS, re-issued, short-lived)", TOKEN_SVC2_COLOR)
draw_lock_icon(ax, 60, 12.2)

# ---------------------------------------------------------------------------
# Legend panel
# ---------------------------------------------------------------------------
lx, ly, lw_, lh = 118, 6, 20, 84
ax.add_patch(FancyBboxPatch((lx, ly), lw_, lh, boxstyle="round,pad=0,rounding_size=1.5",
                             facecolor=PANEL, edgecolor="#334155", linewidth=1.4, alpha=0.9, zorder=1))

ax.text(lx + lw_ / 2, 86, "LEGEND", ha="center", va="center", fontsize=11,
        fontweight="bold", color=TEXT_MAIN, zorder=9)

ax.text(lx + 1, 81, "TOKEN FLOWS", ha="left", va="center", fontsize=7.6,
        fontweight="bold", color=TEXT_MAIN, zorder=9)

legend_items = [
    (TOKEN_ID_COLOR, "--", 2.2, 76, "ID Token (identity)"),
    (TOKEN_ACCESS_COLOR, "-", 2.2, 70, "Access Token (API)"),
    (TOKEN_SVC1_COLOR, "-", 3.0, 63, "Service Token\n(Token Exchange)"),
    (TOKEN_SVC2_COLOR, "-", 3.0, 55, "Service Token\n(mTLS re-issued)"),
    (CONTROL_COLOR, ":", 2.0, 48, "JWKS / Introspect"),
]
for color, ls, lwv, y, text in legend_items:
    ax.plot([lx + 1, lx + 4.2], [y, y], color=color, linewidth=lwv, linestyle=ls,
            solid_capstyle="round", zorder=9)
    ax.text(lx + 5.2, y, text, ha="left", va="center", fontsize=6.7,
            color=TEXT_MAIN, zorder=9)

ax.text(lx + 1, 42, "SYMBOLS", ha="left", va="center", fontsize=7.6,
        fontweight="bold", color=TEXT_MAIN, zorder=9)
draw_lock_icon(ax, lx + 2.7, 37, scale=1.1)
ax.text(lx + 5.2, 37, "PEP: verify\nevery hop", ha="left", va="center",
        fontsize=6.7, color=TEXT_MAIN, zorder=9)

ax.text(lx + 1, 31, "ZERO TRUST PRINCIPLES", ha="left", va="center", fontsize=7.3,
        fontweight="bold", color=TEXT_MAIN, zorder=9)
principles = [
    "- Never trust, verify always",
    "- Scope-narrowed short tokens",
    "- Verify identity every hop",
    "- Continuous validation",
]
py = 27
for line in principles:
    ax.text(lx + 1, py, line, ha="left", va="center", fontsize=6.5, color=TEXT_SUB, zorder=9)
    py -= 4

# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------
fig.savefig(output_path, facecolor=fig.get_facecolor())
