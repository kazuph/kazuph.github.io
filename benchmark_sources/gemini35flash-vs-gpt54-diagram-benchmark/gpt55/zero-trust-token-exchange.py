import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D


def rounded_box(ax, x, y, w, h, label, fc="#ffffff", ec="#1f2937", lw=1.8):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.035",
        linewidth=lw,
        edgecolor=ec,
        facecolor=fc,
        zorder=3,
    )
    ax.add_patch(box)
    ax.text(
        x + w / 2, y + h / 2,
        label,
        ha="center",
        va="center",
        fontsize=13,
        fontweight="bold",
        color="#111827",
        zorder=4,
    )


def arrow(ax, start, end, label, color, style="-", rad=0.0, lw=2.2, text_offset=(0, 0)):
    arr = FancyArrowPatch(
        start,
        end,
        arrowstyle="-|>",
        mutation_scale=16,
        linewidth=lw,
        linestyle=style,
        color=color,
        connectionstyle=f"arc3,rad={rad}",
        shrinkA=8,
        shrinkB=8,
        zorder=2,
    )
    ax.add_patch(arr)

    mx = (start[0] + end[0]) / 2 + text_offset[0]
    my = (start[1] + end[1]) / 2 + text_offset[1]
    ax.text(
        mx,
        my,
        label,
        ha="center",
        va="center",
        fontsize=9.5,
        color=color,
        bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=color, lw=0.8, alpha=0.95),
        zorder=5,
    )


def boundary(ax, x, y, w, h, label, fc, ec):
    rect = Rectangle(
        (x, y), w, h,
        linewidth=2.0,
        linestyle=(0, (8, 5)),
        edgecolor=ec,
        facecolor=fc,
        alpha=0.18,
        zorder=0,
    )
    ax.add_patch(rect)
    ax.text(
        x + 0.18,
        y + h - 0.22,
        label,
        ha="left",
        va="top",
        fontsize=12,
        fontweight="bold",
        color=ec,
        zorder=1,
    )


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: python zero_trust_flow.py output.png")

    output_path = sys.argv[1]

    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")

    boundary(ax, 0.4, 0.55, 3.2, 7.75, "Untrusted / User Device", "#dbeafe", "#2563eb")
    boundary(ax, 3.95, 0.55, 2.75, 7.75, "Identity Trust Boundary", "#fef3c7", "#b45309")
    boundary(ax, 7.05, 0.55, 4.55, 7.75, "Protected Service Boundary", "#dcfce7", "#15803d")

    rounded_box(ax, 1.15, 6.7, 1.7, 0.85, "User", "#eff6ff", "#2563eb")
    rounded_box(ax, 1.15, 4.65, 1.7, 0.85, "Browser", "#eff6ff", "#2563eb")
    rounded_box(ax, 4.45, 5.7, 1.8, 0.9, "IdP", "#fffbeb", "#b45309")
    rounded_box(ax, 7.45, 5.75, 2.0, 0.9, "API Gateway", "#f0fdf4", "#15803d")
    rounded_box(ax, 9.65, 6.7, 1.65, 0.85, "Service A", "#f0fdf4", "#15803d")
    rounded_box(ax, 9.65, 4.45, 1.65, 0.85, "Service B", "#f0fdf4", "#15803d")

    rounded_box(ax, 7.55, 2.0, 1.8, 0.75, "Policy\nEngine", "#ecfeff", "#0891b2", lw=1.5)
    rounded_box(ax, 4.55, 2.0, 1.6, 0.75, "Token\nEndpoint", "#fff7ed", "#ea580c", lw=1.5)

    id_token = "#7c3aed"
    access_token = "#2563eb"
    service_token = "#059669"
    policy = "#dc2626"

    arrow(ax, (2.0, 6.7), (2.0, 5.5), "1. Sign-in request", "#374151", text_offset=(-0.85, 0))
    arrow(ax, (2.85, 5.2), (4.45, 6.05), "2. OIDC auth", access_token, rad=0.12, text_offset=(0, 0.25))
    arrow(ax, (4.45, 5.95), (2.85, 5.05), "3. ID token", id_token, rad=0.12, text_offset=(0, -0.25))
    arrow(ax, (2.85, 4.95), (4.55, 2.4), "4. Code + ID token\nvalidation", id_token, rad=-0.18, text_offset=(-0.25, -0.05))
    arrow(ax, (6.15, 2.38), (7.55, 2.38), "5. Access token", access_token, text_offset=(0, 0.35))

    arrow(ax, (2.85, 4.95), (7.45, 6.05), "6. API request\nBearer access token", access_token, rad=-0.12, text_offset=(0.45, 0.35))
    arrow(ax, (8.25, 5.75), (8.25, 2.75), "7. continuous\npolicy check", policy, style="--", text_offset=(0.85, 0))
    arrow(ax, (7.55, 2.38), (8.25, 5.75), "claims, device,\nrisk, session", policy, style="--", rad=-0.12, text_offset=(-0.65, 0.05))

    arrow(ax, (9.45, 6.2), (9.65, 6.98), "8. token exchange", service_token, rad=0.15, text_offset=(0.65, 0))
    arrow(ax, (9.45, 6.0), (9.65, 4.9), "9. service token", service_token, rad=-0.15, text_offset=(0.55, -0.1))
    arrow(ax, (10.48, 6.7), (10.48, 5.3), "10. service-to-service\nscoped token", service_token, style="-.", text_offset=(1.0, 0))

    ax.text(
        6,
        8.55,
        "Zero Trust Authentication and Token Exchange",
        ha="center",
        va="center",
        fontsize=20,
        fontweight="bold",
        color="#111827",
    )

    ax.text(
        6,
        8.15,
        "Every boundary crossing validates identity, token scope, device posture, and policy before trust is granted.",
        ha="center",
        va="center",
        fontsize=11,
        color="#4b5563",
    )

    legend_items = [
        Line2D([0], [0], color=id_token, lw=3, label="ID token"),
        Line2D([0], [0], color=access_token, lw=3, label="Access token"),
        Line2D([0], [0], color=service_token, lw=3, label="Service token"),
        Line2D([0], [0], color=policy, lw=3, linestyle="--", label="Policy / risk signal"),
    ]
    ax.legend(
        handles=legend_items,
        loc="lower center",
        bbox_to_anchor=(0.5, 0.035),
        ncol=4,
        frameon=True,
        fontsize=10,
        framealpha=0.95,
        edgecolor="#d1d5db",
    )

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    fig.savefig(output_path, dpi=100, bbox_inches="tight", pad_inches=0.12)
    plt.close(fig)


if __name__ == "__main__":
    main()
