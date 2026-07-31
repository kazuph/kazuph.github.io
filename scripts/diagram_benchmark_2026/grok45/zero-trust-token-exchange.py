#!/usr/bin/env python3
"""Zero Trust authentication & token exchange diagram (matplotlib)."""

import sys
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D


def main() -> None:
    out = sys.argv[1]
    fig, ax = plt.subplots(1, 1, figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor("#0f1419")
    ax.set_facecolor("#0f1419")

    # --- color palette ---
    c_user = "#3d5a80"
    c_browser = "#4a7c59"
    c_idp = "#c44536"
    c_gw = "#2a9d8f"
    c_svc = "#457b9d"
    c_id_tok = "#e9c46a"
    c_acc_tok = "#f4a261"
    c_svc_tok = "#e76f51"
    c_text = "#e8eef4"
    c_muted = "#8b9aab"
    c_boundary = "#5c6b7a"
    c_trust_user = "#1a2332"
    c_trust_idp = "#2a1a1a"
    c_trust_edge = "#0d2a28"
    c_trust_svc = "#142433"

    def zone(x, y, w, h, facecolor, edgecolor, label, label_y_offset=0.12):
        r = FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.02,rounding_size=0.15",
            facecolor=facecolor, edgecolor=edgecolor,
            linewidth=1.6, linestyle="--", alpha=0.92, zorder=1,
        )
        ax.add_patch(r)
        ax.text(
            x + 0.12, y + h - label_y_offset, label,
            fontsize=7.5, color=edgecolor, fontweight="bold",
            va="top", ha="left", zorder=2, family="sans-serif",
        )

    def node(x, y, w, h, facecolor, edgecolor, title, subtitle=None):
        r = FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.02,rounding_size=0.12",
            facecolor=facecolor, edgecolor=edgecolor,
            linewidth=2.0, alpha=1.0, zorder=3,
        )
        ax.add_patch(r)
        if subtitle:
            ax.text(
                x + w / 2, y + h * 0.62, title,
                fontsize=10, color=c_text, fontweight="bold",
                ha="center", va="center", zorder=4, family="sans-serif",
            )
            ax.text(
                x + w / 2, y + h * 0.28, subtitle,
                fontsize=7, color=c_muted,
                ha="center", va="center", zorder=4, family="sans-serif",
            )
        else:
            ax.text(
                x + w / 2, y + h / 2, title,
                fontsize=10, color=c_text, fontweight="bold",
                ha="center", va="center", zorder=4, family="sans-serif",
            )

    def arrow(x1, y1, x2, y2, color, label=None, label_offset=(0, 0.18),
              style="-", lw=1.8, connectionstyle="arc3,rad=0"):
        a = FancyArrowPatch(
            (x1, y1), (x2, y2),
            arrowstyle="-|>", mutation_scale=12,
            color=color, linewidth=lw, linestyle=style,
            connectionstyle=connectionstyle, zorder=5,
        )
        ax.add_patch(a)
        if label:
            mx = (x1 + x2) / 2 + label_offset[0]
            my = (y1 + y2) / 2 + label_offset[1]
            ax.text(
                mx, my, label, fontsize=6.5, color=color,
                ha="center", va="bottom", zorder=6, fontweight="bold",
                family="sans-serif",
                bbox=dict(boxstyle="round,pad=0.15", facecolor="#0f1419",
                          edgecolor="none", alpha=0.85),
            )

    # --- trust zones ---
    zone(0.25, 5.85, 3.4, 2.85, c_trust_user, "#6b8cae",
         "Trust Zone: User Device", 0.18)
    zone(4.0, 5.85, 3.6, 2.85, c_trust_idp, "#c44536",
         "Trust Zone: Identity Provider", 0.18)
    zone(0.25, 0.35, 11.5, 5.15, c_trust_edge, "#2a9d8f",
         "Trust Zone: Zero-Trust Edge / Protected Network", 0.18)
    zone(7.9, 0.55, 3.65, 4.7, c_trust_svc, "#457b9d",
         "Service Mesh / Internal", 0.18)

    # --- nodes ---
    # User
    node(0.55, 7.35, 1.35, 0.95, c_user, "#8eb4d4", "User", "human")
    # Browser
    node(2.1, 7.35, 1.35, 0.95, c_browser, "#7cbc8e", "Browser", "client")
    # IdP
    node(4.35, 7.15, 2.9, 1.15, c_idp, "#e07a6e", "IdP / OIDC", "authn + tokens")
    # API Gateway
    node(0.55, 3.55, 2.6, 1.15, c_gw, "#5ecfc0", "API Gateway", "policy + exchange")
    # Service A
    node(8.2, 3.65, 1.5, 1.0, c_svc, "#7ba8c9", "Service A", "workload")
    # Service B
    node(9.95, 3.65, 1.4, 1.0, c_svc, "#7ba8c9", "Service B", "workload")

    # Policy / Token Exchange box inside gateway zone
    node(3.5, 3.55, 2.4, 1.15, "#1e3a36", "#5ecfc0", "Token Exchange", "STS / RFC 8693")
    # Policy decision
    node(0.55, 1.7, 2.6, 0.95, "#1a2e2c", "#5ecfc0", "Policy Engine", "mTLS + claims")
    # Service token issuer note
    node(8.2, 1.7, 3.15, 0.95, "#1a2836", "#7ba8c9", "mTLS / SPIFFE", "workload identity")

    # --- token flows ---
    # 1. User -> Browser (login intent)
    arrow(1.9, 7.82, 2.1, 7.82, c_muted, "1. login", (0, 0.12), lw=1.2)

    # 2. Browser -> IdP (OIDC auth code / ROPC)
    arrow(3.45, 7.9, 4.35, 7.7, c_muted, "2. OIDC AuthN", (0.15, 0.22), lw=1.4)

    # 3. IdP -> Browser: ID token + access token
    arrow(4.35, 7.35, 3.45, 7.5, c_id_tok, "3a. ID Token", (-0.05, -0.28),
          lw=2.0, connectionstyle="arc3,rad=-0.25")
    arrow(4.35, 7.55, 3.45, 7.7, c_acc_tok, "3b. Access Token", (0.0, 0.28),
          lw=2.0, connectionstyle="arc3,rad=0.2")

    # 4. Browser -> API Gateway with access token
    arrow(2.75, 7.35, 1.85, 4.7, c_acc_tok, "4. Access Token\n   (Bearer)", (0.85, 0.0),
          lw=2.0, connectionstyle="arc3,rad=0.15")

    # 5. Gateway validates / policy
    arrow(1.85, 3.55, 1.85, 2.65, c_muted, "5. authorize", (0.55, 0.0), lw=1.3)

    # 6. Token exchange: access -> service token
    arrow(3.15, 4.1, 3.5, 4.1, c_acc_tok, None, lw=1.8)
    arrow(5.9, 4.0, 8.2, 4.15, c_svc_tok, "6. Service Token\n   (exchanged)", (0.1, 0.35),
          lw=2.2, connectionstyle="arc3,rad=-0.12")

    # 7. Service A -> Service B with service token
    arrow(9.7, 4.15, 9.95, 4.15, c_svc_tok, "7. Service Token", (0.0, 0.22), lw=2.0)

    # 8. IdP may issue refresh / introspection path (dashed)
    arrow(5.8, 7.15, 5.0, 4.7, c_id_tok, "introspect /\nJWKS", (0.55, 0.0),
          style="--", lw=1.2, connectionstyle="arc3,rad=0.1")

    # Return path Service B -> A (response, muted)
    arrow(9.95, 3.8, 9.7, 3.8, c_muted, None, lw=1.0, style=":")

    # --- legend ---
    legend_elems = [
        Line2D([0], [0], color=c_id_tok, lw=2.5, label="ID Token (identity)"),
        Line2D([0], [0], color=c_acc_tok, lw=2.5, label="Access Token (API)"),
        Line2D([0], [0], color=c_svc_tok, lw=2.5, label="Service Token (workload)"),
        Line2D([0], [0], color=c_muted, lw=1.5, label="Control / AuthN flow"),
        Line2D([0], [0], color=c_muted, lw=1.2, linestyle="--", label="Validation / JWKS"),
    ]
    leg = ax.legend(
        handles=legend_elems, loc="lower left",
        bbox_to_anchor=(0.02, 0.02), frameon=True, fontsize=7.5,
        facecolor="#151c24", edgecolor="#5c6b7a", labelcolor=c_text,
        title="Token Types", title_fontsize=8,
    )
    leg.get_title().set_color(c_text)

    # Title
    ax.text(
        6.0, 8.78, "Zero Trust Authentication & Token Exchange",
        fontsize=14, color=c_text, fontweight="bold",
        ha="center", va="center", zorder=10, family="sans-serif",
    )
    ax.text(
        6.0, 8.48, "OIDC identity  →  Access token at edge  →  Exchanged service token east-west",
        fontsize=8, color=c_muted, ha="center", va="center", zorder=10, family="sans-serif",
    )

    # Step callouts (small numbered badges near zones)
    steps = [
        (0.7, 6.55, "Device never trusted by default"),
        (4.5, 6.55, "IdP is sole identity authority"),
        (3.7, 2.85, "Exchange narrows audience & TTL"),
        (8.4, 2.85, "Workloads prove via mTLS + token"),
    ]
    for x, y, t in steps:
        ax.text(x, y, "▸ " + t, fontsize=6.5, color=c_muted,
                ha="left", va="center", zorder=6, family="sans-serif",
                style="italic")

    fig.tight_layout(pad=0.3)
    fig.savefig(out, dpi=100, bbox_inches="tight", facecolor=fig.get_facecolor(),
                edgecolor="none")
    plt.close(fig)


if __name__ == "__main__":
    main()
