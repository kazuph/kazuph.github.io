import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_token_exchange(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 860, "Zero Trust Architecture: Token Exchange Sequence", ha="center", va="center",
            fontsize=20, fontweight="bold", color="#0f172a")
    ax.text(600, 830, "RFC 8693 OAuth 2.0 Token Exchange & Downstream Least-Privilege Delegation",
            ha="center", va="center", fontsize=11, color="#64748b")

    # Lifeline X coordinates: Client, API GW, IdP, Resource Server
    cols = {
        "client": 180,
        "gw": 460,
        "idp": 740,
        "rs": 1020
    }

    # Vertical Lifeline Dashed Guides
    for name, x in cols.items():
        ax.plot([x, x], [120, 780], color="#cbd5e1", lw=1.8, ls="--", zorder=1)

    # Participant Header Boxes (Top)
    headers = [
        ("client", "Client\nUser / Web App", "#e0f2fe", "#0284c7"),
        ("gw", "API Gateway\nPEP / Edge Proxy", "#f3e8ff", "#9333ea"),
        ("idp", "Identity Provider\nOAuth 2.0 / STS", "#fef3c7", "#d97706"),
        ("rs", "Resource Server\nBackend Microservice", "#dcfce7", "#16a34a")
    ]
    for key, text, fc, ec in headers:
        x = cols[key]
        box = patches.FancyBboxPatch((x - 80, 745), 160, 50, boxstyle="round,pad=0.02",
                                     facecolor=fc, edgecolor=ec, lw=2, zorder=3)
        ax.add_patch(box)
        ax.text(x, 770, text, ha="center", va="center", fontsize=11, fontweight="bold", color="#0f172a", zorder=4)

    # Activation Bars
    # Client active 180 to 720
    ax.add_patch(patches.Rectangle((cols["client"] - 6, 170), 12, 560, color="#bae6fd", ec="#0284c7", lw=1.5, zorder=2))
    # GW active 200 to 600
    ax.add_patch(patches.Rectangle((cols["gw"] - 6, 210), 12, 430, color="#e9d5ff", ec="#9333ea", lw=1.5, zorder=2))
    # IdP active slots
    ax.add_patch(patches.Rectangle((cols["idp"] - 6, 640), 12, 80, color="#fde68a", ec="#d97706", lw=1.5, zorder=2))
    ax.add_patch(patches.Rectangle((cols["idp"] - 6, 420), 12, 90, color="#fde68a", ec="#d97706", lw=1.5, zorder=2))
    # RS active
    ax.add_patch(patches.Rectangle((cols["rs"] - 6, 280), 12, 100, color="#bbf7d0", ec="#16a34a", lw=1.5, zorder=2))

    # SEQUENCE STEPS (Y: 700 down to 180)
    # Helper for arrow and label
    def seq_msg(y, x1, x2, text, subtext="", is_dashed=False, color="#0f172a"):
        ls = "--" if is_dashed else "-"
        ax.plot([x1, x2], [y, y], color=color, lw=2.2, ls=ls, zorder=5)
        # Arrowhead
        ax.annotate("", xy=(x2, y), xytext=(x2 - 10 if x2 > x1 else x2 + 10, y),
                    arrowprops=dict(arrowstyle="-|>", color=color, lw=2.2, mutation_scale=14), zorder=5)
        # Text label
        mid_x = (x1 + x2) / 2
        ax.text(mid_x, y + 14, text, ha="center", va="bottom", fontsize=10, fontweight="bold", color=color,
                bbox=dict(boxstyle="round,pad=0.2", fc="#ffffff", ec="#e2e8f0", lw=1), zorder=6)
        if subtext:
            ax.text(mid_x, y - 5, subtext, ha="center", va="top", fontsize=9, color="#64748b", zorder=6)

    # 1. Client -> IdP: Authenticate & Token Request
    seq_msg(700, cols["client"], cols["idp"], "1. User Auth & Token Request",
            "POST /oauth/v2/token (grant_type=authorization_code)", color="#0f172a")

    # 2. IdP -> Client: Issue Subject Token
    seq_msg(640, cols["idp"], cols["client"], "2. 200 OK: Issue Subject Token",
            "JWT (aud=api-gateway, sub=user123)", is_dashed=True, color="#d97706")

    # 3. Client -> API Gateway: Protected Resource Call
    seq_msg(570, cols["client"], cols["gw"], "3. GET /api/v1/orders",
            "Authorization: Bearer <Subject-JWT>", color="#0284c7")

    # 4. API Gateway -> IdP: Token Exchange (RFC 8693)
    seq_msg(490, cols["gw"], cols["idp"], "4. Token Exchange Request (RFC 8693)",
            "POST /token (grant_type=token-exchange, aud=orders-service)", color="#d97706")

    # 5. IdP -> API Gateway: Issue Downscoped Token
    seq_msg(420, cols["idp"], cols["gw"], "5. 200 OK: Issue Downstream Token",
            "Downscoped JWT (aud=orders-service, scope=orders:read)", is_dashed=True, color="#d97706")

    # 6. API Gateway -> Resource Server: Call Internal Service
    seq_msg(340, cols["gw"], cols["rs"], "6. GET /orders (Internal Service Call)",
            "Authorization: Bearer <Downscoped-JWT> + mTLS", color="#16a34a")

    # 7. Resource Server -> API Gateway: Return Data
    seq_msg(270, cols["rs"], cols["gw"], "7. 200 OK: Token Validated & Orders Data",
            "Signed JSON Payload", is_dashed=True, color="#16a34a")

    # 8. API Gateway -> Client: Filtered Response
    seq_msg(200, cols["gw"], cols["client"], "8. 200 OK: Forward Sanitized Response",
            "HTTP 200 Application JSON", is_dashed=True, color="#0284c7")

    # Zero Trust Principles Callout Box (Bottom)
    ax.text(600, 110, "Zero Trust Principle: Never Trust, Always Verify. External tokens are never passed directly to backend services.",
            ha="center", va="center", fontsize=10, color="#475569",
            bbox=dict(boxstyle="round,pad=0.4", fc="#f8fafc", ec="#cbd5e1", lw=1.2))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python zero-trust-token-exchange.py <output_path>")
        sys.exit(1)
    draw_token_exchange(sys.argv[1])
