import sys

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch

USER = ("#4A6EA8", "#DCE4F1")
IDP = ("#8C5AA0", "#EADDF0")
GW = ("#C87832", "#F7E6D2")
SVC = ("#46825A", "#DCEDE2")

ID_TOK = "#2850A0"
AC_TOK = "#2D7332"
SV_TOK = "#C86414"
PLAIN = "#5A5A64"


def box(ax, xy, w, h, colors, title, sub=None):
    edge, fill = colors
    ax.add_patch(FancyBboxPatch((xy[0] - w / 2, xy[1] - h / 2), w, h,
                                boxstyle="round,pad=0.06,rounding_size=0.12",
                                facecolor=fill, edgecolor=edge, linewidth=2.2))
    dy = 0.2 if sub else 0.0
    ax.text(xy[0], xy[1] + dy, title, ha="center", va="center", fontsize=13,
            weight="bold", family="sans-serif")
    if sub:
        ax.text(xy[0], xy[1] - 0.32, sub, ha="center", va="center",
                fontsize=10.5, family="sans-serif", color="#46464E")


def zone(ax, x, y, w, h, color, label, label_color):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=0.05,rounding_size=0.2",
                                facecolor=color, edgecolor=label_color,
                                linewidth=1.8, linestyle=(0, (6, 4)),
                                alpha=0.9))
    ax.text(x + 0.25, y + h - 0.4, label, fontsize=11.5, weight="bold",
            family="sans-serif", color=label_color, ha="left")


def arrow(ax, p0, p1, color, step, label, lpos, linestyle="solid", rad=0.0,
          style="-|>", ha="center"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=style, mutation_scale=17,
                                 color=color, linewidth=2.4,
                                 linestyle=linestyle,
                                 connectionstyle=f"arc3,rad={rad}",
                                 shrinkA=4, shrinkB=4))
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    if step:
        ax.add_patch(Circle((mid[0], mid[1] + 0.28), 0.17, facecolor="black",
                            edgecolor="none", zorder=6))
        ax.text(mid[0], mid[1] + 0.28, step, color="white", fontsize=9,
                weight="bold", ha="center", va="center", zorder=7)
    ax.text(lpos[0], lpos[1], label, fontsize=10.5, family="sans-serif",
            color="#32323C", ha=ha, va="center")


def main() -> None:
    out_path = sys.argv[1]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-2.4, 14.2)
    ax.set_ylim(-2.4, 7.4)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(5.9, 6.9, "Zero trust auth & token exchange", fontsize=18,
            weight="bold", family="sans-serif", ha="center")

    # trust zones
    zone(ax, -1.9, -1.6, 3.9, 7.2, "#FBEFEF", "Untrusted (Internet)",
         "#A04040")
    zone(ax, 2.6, 2.6, 4.0, 3.0, "#F4ECF6", "Identity zone", "#8C5AA0")
    zone(ax, 2.6, -1.6, 11.0, 3.6, "#EDF5EE",
         "Zero trust perimeter (every call verified)", "#3C6E48")

    # actors
    box(ax, (0, 3.9), 2.6, 1.2, USER, "User")
    box(ax, (0, 0.6), 2.6, 1.3, USER, "Browser", "SPA client")
    box(ax, (4.6, 3.9), 2.7, 1.3, IDP, "IdP", "OIDC provider")
    box(ax, (4.6, 0.2), 2.9, 1.3, GW, "API Gateway", "token validation")
    box(ax, (8.6, 0.2), 2.5, 1.2, SVC, "Service A")
    box(ax, (12.0, 0.2), 2.5, 1.2, SVC, "Service B")

    # flows
    arrow(ax, (0, 3.3), (0, 1.3), PLAIN, "1", "login", (0.35, 2.3), ha="left")
    arrow(ax, (0.9, 1.25), (3.2, 3.6), ID_TOK, "2",
          "authenticate / ID token", (1.0, 2.95), rad=0.25, ha="right")
    arrow(ax, (1.35, 0.45), (3.1, 0.35), AC_TOK, "3", "access token",
          (2.2, -0.15), linestyle=(0, (7, 3)))
    arrow(ax, (4.6, 0.9), (4.6, 3.2), PLAIN, "4", "verify signature (JWKS)",
          (4.95, 2.0), style="<|-|>", ha="left")
    arrow(ax, (6.1, 0.2), (7.3, 0.2), SV_TOK, "5",
          "token exchange\nservice token", (6.7, -0.75),
          linestyle=(0, (2.5, 2.5)))
    arrow(ax, (9.9, 0.2), (10.7, 0.2), SV_TOK, "6",
          "scoped service token", (10.3, -0.6), linestyle=(0, (2.5, 2.5)))

    # legend
    ax.add_patch(FancyBboxPatch((7.7, 3.3), 5.9, 2.1,
                                boxstyle="round,pad=0.05,rounding_size=0.12",
                                facecolor="white", edgecolor="#5A5A64",
                                linewidth=1.5))
    ax.text(8.0, 5.05, "Tokens", fontsize=12, weight="bold",
            family="sans-serif", ha="left")
    for y, c, ls, txt in [
        (4.65, ID_TOK, "solid", "ID token (identity)"),
        (4.15, AC_TOK, (0, (7, 3)), "access token (API scope)"),
        (3.65, SV_TOK, (0, (2.5, 2.5)), "service token (per-hop)"),
    ]:
        ax.plot([8.0, 9.2], [y, y], color=c, linewidth=2.6, linestyle=ls)
        ax.text(9.4, y, txt, fontsize=10.5, family="sans-serif", va="center")

    fig.savefig(out_path, bbox_inches="tight")


if __name__ == "__main__":
    main()
