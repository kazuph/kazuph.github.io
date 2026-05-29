import sys

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

output_path = sys.argv[1]

fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
ax.set_xlim(0, 12)
ax.set_ylim(0, 9)
ax.set_aspect("equal")
ax.axis("off")
fig.patch.set_facecolor("#ffffff")

CLIENT = "#0ea5e9"
IDP = "#6366f1"
GW = "#f59e0b"
SVC = "#10b981"
IDT = "#2563eb"
ACT = "#16a34a"
SVT = "#7c3aed"


def box(cx, cy, w, h, color, label):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.1",
                 linewidth=2, edgecolor=color, facecolor=color + "26", zorder=4))
    ax.text(cx, cy, label, ha="center", va="center", fontsize=13, color="#1f2933", zorder=5)
    return (cx, cy)


def arrow(p0, p1, color, label="", lp="mid", off=(0, 0.25)):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=15,
                 color=color, lw=2, zorder=6))
    if label:
        mx, my = (p0[0] + p1[0]) / 2 + off[0], (p0[1] + p1[1]) / 2 + off[1]
        ax.text(mx, my, label, fontsize=9.5, color=color, ha="center", zorder=6)


# zones
ax.add_patch(FancyBboxPatch((0.3, 1.6), 2.6, 5.6, boxstyle="round,pad=0.02,rounding_size=0.1",
             facecolor="#fef2f2", edgecolor="#f87171", ls="--", lw=1.5, zorder=0))
ax.text(1.6, 7.0, "Untrusted (public)", ha="center", fontsize=10.5, fontweight="bold", color="#dc2626", zorder=1)
ax.add_patch(FancyBboxPatch((8.0, 1.0), 3.5, 5.4, boxstyle="round,pad=0.02,rounding_size=0.1",
             facecolor="#f0fdf4", edgecolor="#16a34a", lw=1.5, zorder=0))
ax.text(9.75, 6.2, "Trusted zone", ha="center", fontsize=10.5, fontweight="bold", color="#15803d", zorder=1)
# policy line
ax.plot([5.6, 5.6], [0.9, 7.8], color="#9ca3af", ls="--", lw=2, zorder=1)
ax.text(5.6, 8.0, "policy enforcement", ha="center", fontsize=9.5, color="#6b7280", zorder=1)

# nodes
user = box(1.6, 5.6, 2.0, 1.0, CLIENT, "User")
browser = box(1.6, 3.0, 2.0, 1.0, CLIENT, "Browser")
idp = box(5.6, 6.7, 2.0, 1.0, IDP, "IdP")
gw = box(5.6, 3.0, 2.1, 1.0, GW, "API\nGateway")
svcA = box(9.75, 4.6, 2.0, 1.0, SVC, "Service A")
svcB = box(9.75, 2.0, 2.0, 1.0, SVC, "Service B")

# flows
arrow((1.6, 5.1), (1.6, 3.5), IDT, "login", off=(-0.55, 0))
arrow((2.6, 3.3), (4.6, 6.5), IDT, "authn", off=(-0.2, 0.3))
arrow((5.6, 6.2), (5.6, 3.5), IDT, "ID token", off=(0.7, 0))
arrow((2.6, 3.0), (4.55, 3.0), IDT, "request + ID token", off=(0, -0.45))
arrow((6.65, 3.2), (8.75, 4.4), ACT, "access token", off=(0, 0.4))
arrow((9.75, 4.1), (9.75, 2.5), SVT, "service token\n(exchange)", off=(1.4, 0))

# legend
ax.plot([0.6, 1.1], [0.5, 0.5], color=IDT, lw=3)
ax.text(1.2, 0.5, "ID token", va="center", fontsize=10, color=IDT)
ax.plot([3.0, 3.5], [0.5, 0.5], color=ACT, lw=3)
ax.text(3.6, 0.5, "access token", va="center", fontsize=10, color=ACT)
ax.plot([5.8, 6.3], [0.5, 0.5], color=SVT, lw=3)
ax.text(6.4, 0.5, "service token", va="center", fontsize=10, color=SVT)

ax.text(6, 8.6, "Zero Trust Auth & Token Exchange", ha="center", fontsize=17,
        fontweight="bold", color="#1f2933")

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig(output_path, facecolor=fig.get_facecolor())
