import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

BG = "#FBFBFB"
UNT, UNT_E = "#FDECEC", "#C0392B"
DMZ, DMZ_E = "#FFF6DD", "#C98A1B"
MESH, MESH_E = "#E7F3EA", "#2E7D4F"
IDPZ, IDP_E = "#EAF0FB", "#2A6F97"
IDTOK = "#7B5EA7"
ACCTOK = "#2A6F97"
SVCTOK = "#2E7D4F"
INK = "#233044"
GREY = "#6B7280"
FONT = ["Hiragino Sans", "Noto Sans CJK JP", "DejaVu Sans"]


def zone(ax, x0, y0, x1, y1, fc, ec, title, sub):
    ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle="round,pad=0,rounding_size=0.25",
                                facecolor=fc, edgecolor=ec, linewidth=1.3, linestyle="--", zorder=1))
    ax.text(x0 + 0.15, y1 - 0.25, title, ha="left", va="center", fontsize=11, fontweight="bold", color=ec, fontfamily=FONT, zorder=2)
    ax.text(x0 + 0.15, y1 - 0.55, sub, ha="left", va="center", fontsize=8.5, color=ec, fontfamily=FONT, zorder=2)


def actor(ax, cx, cy, w, h, lines, ec=INK, z=5):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.12",
                                facecolor="white", edgecolor=ec, linewidth=1.6, zorder=z))
    n = len(lines)
    for i, ln in enumerate(lines):
        y = cy + (n - 1) * 0.16 - i * 0.32
        ax.text(cx, y, ln, ha="center", va="center", fontsize=10.5 if i == 0 else 8.5,
                fontweight="bold" if i == 0 else "normal", color=INK, fontfamily=FONT, zorder=z + 1)


def arrow(ax, pts, color, lw=1.8, z=4):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=color, lw=lw, zorder=z)
    ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=15, color=color, linewidth=lw,
                                 zorder=z + 1, shrinkA=0, shrinkB=0))


def step(ax, x, y, n):
    ax.add_patch(Circle((x, y), 0.19, facecolor=INK, edgecolor="none", zorder=9))
    ax.text(x, y, str(n), ha="center", va="center", fontsize=8, fontweight="bold", color="white", zorder=10)


def lab(ax, x, y, text, color=INK, ha="center", size=8.5, z=8):
    ax.text(x, y, text, ha=ha, va="center", fontsize=size, color=color, fontfamily=FONT, zorder=z,
            bbox=dict(facecolor=BG, edgecolor="none", pad=1.0))


def main() -> None:
    out_path = sys.argv[1]
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.6, 12.4)
    ax.set_ylim(-0.9, 8.5)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((-0.6, -0.9), 13, 9.4, facecolor=BG, zorder=0))
    ax.text(-0.3, 8.1, "ゼロトラスト認証とトークン交換", ha="left", va="center", fontsize=16, fontweight="bold", color=INK, fontfamily=FONT)
    ax.text(-0.3, 7.7, "すべてのホップで認証する。ネットワーク上の位置だけでは何も信頼しない", ha="left", va="center", fontsize=10, color=GREY, fontfamily=FONT)

    zone(ax, -0.3, 0.4, 2.6, 7.2, UNT, UNT_E, "UNTRUSTED", "public internet")
    zone(ax, 3.2, 4.9, 7.6, 7.2, IDPZ, IDP_E, "IDENTITY PROVIDER", "OIDC / OAuth 2.0 トークン発行者")
    zone(ax, 3.2, 0.4, 6.4, 4.4, DMZ, DMZ_E, "EDGE (PEP)", "ポリシー強制点")
    zone(ax, 7.0, 0.4, 12.1, 4.4, MESH, MESH_E, "INTERNAL SERVICE MESH", "mTLS + 呼び出しごとの service token")

    actor(ax, 1.15, 5.4, 2.1, 0.95, ["User", "credentials + MFA"])
    actor(ax, 1.15, 2.4, 2.1, 0.95, ["Browser", "(OIDC client)"])
    actor(ax, 5.4, 5.75, 2.9, 1.15, ["IdP", "ユーザーを認証し", "ID / access token を発行"], ec=IDP_E)
    actor(ax, 4.8, 2.0, 2.6, 1.5, ["API Gateway", "JWT 検証", "ポリシー判定", "トークン交換"], ec=DMZ_E)
    actor(ax, 8.5, 2.4, 2.4, 1.15, ["Service A", "service token 検証", "ユーザー代理で B を呼ぶ"], ec=MESH_E)
    actor(ax, 11.0, 2.4, 1.9, 1.15, ["Service B", "service token 検証", "scope: read:orders"], ec=MESH_E)

    # 1 login
    arrow(ax, [(1.15, 4.92), (1.15, 2.88)], GREY); lab(ax, 1.5, 3.9, "login", ha="left"); step(ax, 0.85, 4.0, 1)
    # 2 authorize
    arrow(ax, [(2.2, 2.7), (2.85, 2.7), (2.85, 5.2), (3.95, 5.2)], GREY); step(ax, 2.85, 3.9, 2)
    lab(ax, 2.85, 4.75, "authorize\n(PKCE)", size=8)
    # 3 tokens back to browser
    arrow(ax, [(3.95, 5.75), (3.3, 5.75), (3.3, 2.4), (2.2, 2.4)], IDTOK); step(ax, 3.3, 6.2, 3)
    lab(ax, 2.6, 3.2, "ID token", color=IDTOK, ha="left"); lab(ax, 2.6, 2.9, "access token", color=ACCTOK, ha="left")
    # 4 bearer to gateway
    arrow(ax, [(1.15, 1.92), (1.15, 1.2), (4.2, 1.2), (4.2, 1.25)], ACCTOK); step(ax, 2.85, 1.2, 4)
    lab(ax, 2.2, 0.85, "Bearer: access token", color=ACCTOK)
    # 5 JWKS + token exchange
    arrow(ax, [(5.4, 2.75), (5.4, 4.9)], GREY); step(ax, 5.1, 4.6, 5)
    lab(ax, 5.6, 4.65, "JWKS 検証 +\ntoken exchange", ha="left", size=8)
    # 6 gateway -> A
    arrow(ax, [(6.1, 2.0), (7.3, 2.0), (7.3, 2.4)], SVCTOK); step(ax, 6.7, 1.6, 6)
    lab(ax, 6.7, 2.3, "service token", color=SVCTOK); lab(ax, 6.7, 1.15, "aud: svc-a, act: user", color=SVCTOK, size=7.5)
    # 7 A -> B
    arrow(ax, [(9.7, 2.4), (10.05, 2.4)], SVCTOK); step(ax, 9.87, 1.6, 7)
    lab(ax, 9.87, 2.75, "service token'", color=SVCTOK); lab(ax, 9.87, 1.15, "aud: svc-b", color=SVCTOK, size=7.5)
    # 8 response
    arrow(ax, [(11.0, 1.82), (11.0, 0.75), (1.55, 0.75), (1.55, 1.92)], GREY); step(ax, 8.6, 0.1, 8)
    lab(ax, 6.5, 0.55, "response（トークンはメッシュの外へ出ない）", color=GREY)

    # legend
    ax.plot([7.9, 8.5], [7.0, 7.0], color=IDTOK, lw=2); ax.text(8.6, 7.0, "ID token: ユーザーが誰か（OIDC）", va="center", fontsize=8.5, color=INK, fontfamily=FONT)
    ax.plot([7.9, 8.5], [6.55, 6.55], color=ACCTOK, lw=2); ax.text(8.6, 6.55, "Access token: エッジへの委譲（aud: gateway）", va="center", fontsize=8.5, color=INK, fontfamily=FONT)
    ax.plot([7.9, 8.5], [6.1, 6.1], color=SVCTOK, lw=2); ax.text(8.6, 6.1, "Service token: 短命・ホップごと・狭い aud", va="center", fontsize=8.5, color=INK, fontfamily=FONT)
    ax.plot([7.9, 8.5], [5.65, 5.65], color=GREY, lw=2); ax.text(8.6, 5.65, "制御 / 応答トラフィック", va="center", fontsize=8.5, color=INK, fontfamily=FONT)
    ax.text(7.85, 5.2, "Token exchange (RFC 8693): ゲートウェイが\nユーザーの access token を service token に交換。\nユーザートークンはメッシュ内に持ち込まない。", va="center", fontsize=8, color=GREY, fontfamily=FONT)

    fig.savefig(out_path, dpi=100, facecolor=BG)


if __name__ == "__main__":
    main()
