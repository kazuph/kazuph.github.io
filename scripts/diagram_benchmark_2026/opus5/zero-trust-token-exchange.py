import sys
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle

matplotlib.rcParams["font.family"] = "sans-serif"
matplotlib.rcParams["font.sans-serif"] = [
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic",
    "Noto Sans CJK JP",
    "IPAexGothic",
    "Arial Unicode MS",
    "DejaVu Sans",
]
matplotlib.rcParams["axes.unicode_minus"] = False

BG = "#f4f6fa"
INK = "#0f172a"
SUB = "#475569"
BLUE = "#2563eb"
AMBER = "#c2610c"
GREEN = "#047857"
GRAY = "#64748b"

fig = plt.figure(figsize=(12, 9), dpi=100, facecolor=BG)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 120)
ax.set_ylim(0, 90)
ax.set_aspect("equal")
ax.axis("off")
ax.set_facecolor(BG)


def zone(x, y, w, h, label, face, edge):
    ax.add_patch(
        FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0,rounding_size=2.0",
            facecolor=face, edgecolor=edge, linewidth=1.6,
            linestyle=(0, (7, 4)), alpha=0.95, zorder=1,
        )
    )
    ax.text(x + 1.8, y + h - 1.6, label, ha="left", va="top",
            fontsize=9.5, fontweight="bold", color=edge, zorder=2)


def node(cx, cy, w, h, title, sub, face, edge):
    ax.add_patch(
        FancyBboxPatch(
            (cx - w / 2, cy - h / 2), w, h,
            boxstyle="round,pad=0,rounding_size=1.4",
            facecolor=face, edgecolor=edge, linewidth=2.0, zorder=4,
        )
    )
    ax.text(cx, cy + h / 2 - 3.0, title, ha="center", va="center",
            fontsize=11.5, fontweight="bold", color=INK, zorder=5)
    ax.text(cx, cy + h / 2 - 5.6, sub, ha="center", va="top",
            fontsize=8.0, color=SUB, linespacing=1.5, zorder=5)


def flow(n, a, b, color, dashed=False, both=False, tb=0.26):
    style = (0, (5.5, 3.2)) if dashed else "solid"
    head = "<|-|>" if both else "-|>"
    ax.add_patch(
        FancyArrowPatch(
            a, b, arrowstyle=head, mutation_scale=15,
            linewidth=2.1, linestyle=style, color=color,
            shrinkA=0, shrinkB=0, zorder=5,
        )
    )
    if n is None:
        return
    bx = a[0] + (b[0] - a[0]) * tb
    by = a[1] + (b[1] - a[1]) * tb
    ax.add_patch(Circle((bx, by), 1.55, facecolor=color,
                        edgecolor="white", linewidth=1.3, zorder=7))
    ax.text(bx, by, str(n), ha="center", va="center", color="white",
            fontsize=8.0 if n < 10 else 7.0, fontweight="bold", zorder=8)


def along(a, b, t, text, color, side="bottom"):
    ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
    if ang > 90:
        ang -= 180
    elif ang < -90:
        ang += 180
    x = a[0] + (b[0] - a[0]) * t
    y = a[1] + (b[1] - a[1]) * t
    ax.text(x, y, text, rotation=ang, rotation_mode="anchor",
            ha="center", va=side, fontsize=8.5, color=INK,
            linespacing=1.5, zorder=7,
            bbox=dict(boxstyle="round,pad=0.30", facecolor="white",
                      edgecolor=color, alpha=0.92, linewidth=0.9))


def flat(x, y, text, color, ha="left"):
    ax.text(x, y, text, ha=ha, va="center", fontsize=8.5, color=INK,
            linespacing=1.5, zorder=7,
            bbox=dict(boxstyle="round,pad=0.30", facecolor="white",
                      edgecolor=color, alpha=0.92, linewidth=0.9))


ax.text(60, 85.2, "ゼロトラスト認証とトークン交換", ha="center", va="center",
        fontsize=17.5, fontweight="bold", color=INK)
ax.text(60, 80.6,
        "OIDC 認証 → access token による API 認可 → RFC 8693 Token Exchange による "
        "サービス間の service token 委譲",
        ha="center", va="center", fontsize=9.5, color=SUB)

zone(2, 24, 25, 52, "信頼境界 A ─ 非信頼ゾーン", "#fdecec", "#dc2626")
zone(34, 52, 32, 24, "信頼境界 B ─ Identity ドメイン", "#eee9fd", "#7c3aed")
zone(34, 16, 32, 26, "信頼境界 C ─ Edge / DMZ", "#fdf3d8", "#b45309")
zone(71, 12, 46, 62, "信頼境界 D ─ 内部サービスメッシュ (mTLS)", "#e2f7ea", "#047857")

node(14.5, 62, 21, 11, "User",
     "人間 / 所有デバイス", "#ffffff", "#dc2626")
node(14.5, 38, 21, 13, "Browser (SPA)",
     "PKCE / 短命セッション\nトークンは非永続保管", "#ffffff", "#2563eb")
node(50, 64, 28, 14, "IdP / STS",
     "OIDC + MFA + デバイス姿勢\nJWKS 公開鍵 / 失効管理\nRFC 8693 Token Exchange",
     "#ffffff", "#7c3aed")
node(50, 30, 28, 12, "API Gateway",
     "JWT 署名 / aud / scope 検証\n認可ポリシー適用点 (PEP)", "#ffffff", "#b45309")
node(94, 52, 36, 13, "Service A  (BFF / Orchestrator)",
     "ユーザー委譲を受けて処理\n下流呼び出しは権限を降格", "#ffffff", "#047857")
node(94, 24, 36, 13, "Service B  (Data Service)",
     "aud=service-b の service token のみ受理\nact クレームで委譲元を監査", "#ffffff", "#047857")

ax.text(14.5, 27.6,
        "ネットワーク位置を\n信頼の根拠にしない",
        ha="center", va="center", fontsize=8, color="#b91c1c", linespacing=1.5, zorder=2)
ax.text(50, 20.0,
        "ポリシー: 明示的に検証 / 最小権限 / 侵害前提",
        ha="center", va="center", fontsize=8.5, color="#92400e", zorder=2)
ax.text(94, 15.6,
        "全ホップで aud・scope・有効期限・失効を再検証 (暗黙の信頼なし)",
        ha="center", va="center", fontsize=8.5, color="#065f46", zorder=2)

# 1. User -> Browser
a, b = (14.5, 56.5), (14.5, 45.0)
flow(1, a, b, GRAY)
flat(16.6, 50.5, "アクセス要求", GRAY)

# 2. Browser -> IdP
a, b = (23.5, 44.5), (38.0, 57.0)
flow(2, a, b, GRAY, tb=0.28)
along(a, b, 0.62, "認可リクエスト (PKCE)", GRAY, side="bottom")

# 3. IdP -> User
a, b = (36.0, 69.5), (25.0, 66.5)
flow(3, a, b, GRAY, dashed=True, tb=0.18)
along(a, b, 0.55, "MFA / 姿勢検証", GRAY, side="bottom")

# 4. IdP -> Browser
a, b = (44.0, 57.0), (25.0, 39.0)
flow(4, a, b, BLUE, tb=0.28)
along(a, b, 0.60, "ID token 発行", BLUE, side="top")

# 5. Browser -> API Gateway
a, b = (25.0, 38.0), (36.0, 34.0)
flow(5, a, b, AMBER, tb=0.28)
along(a, b, 0.62, "access token 提示", AMBER, side="bottom")

# 6. API Gateway <-> IdP
a, b = (60.0, 36.0), (60.0, 57.0)
flow(6, a, b, GRAY, dashed=True, both=True, tb=0.28)
flat(58.4, 49.0, "JWKS / introspection 検証", GRAY, ha="right")

# 7. API Gateway -> Service A
a, b = (64.0, 33.0), (76.0, 47.0)
flow(7, a, b, AMBER, tb=0.22)
along(a, b, 0.50, "検証済み\naccess token", AMBER, side="bottom")

# 8. Service A -> IdP (token exchange)
a, b = (82.0, 58.5), (62.0, 72.0)
flow(8, a, b, AMBER, tb=0.25)
along(a, b, 0.55, "token exchange\n(RFC 8693)", AMBER, side="bottom")

# 9. IdP -> Service A (service token)
a, b = (64.0, 59.0), (78.0, 53.0)
flow(9, a, b, GREEN, tb=0.30)
flat(65.5, 50.5, "service token\naud=service-b", GREEN)

# 10. Service A -> Service B
a, b = (86.0, 45.5), (86.0, 30.5)
flow(10, a, b, GREEN, tb=0.26)
flat(88.0, 39.0, "service token\n(mTLS / 5 分)", GREEN)

# 11. Service B -> Service A
a, b = (103.0, 30.5), (103.0, 45.5)
flow(11, a, b, GRAY, dashed=True, tb=0.26)
flat(105.0, 38.0, "応答", GRAY)

ax.add_patch(
    FancyBboxPatch(
        (2, 1.5), 115, 8.5,
        boxstyle="round,pad=0,rounding_size=1.4",
        facecolor="#ffffff", edgecolor="#cbd5e1", linewidth=1.2, zorder=2,
    )
)

legend = [
    (4, 7.0, BLUE, "solid", "ID token ─ 認証の証明 (OIDC)"),
    (4, 3.6, AMBER, "solid", "access token ─ ユーザー委譲 / API 認可"),
    (44, 7.0, GREEN, "solid", "service token ─ サービス間委譲 (RFC 8693)"),
    (44, 3.6, GRAY, "solid", "ユーザー操作 / 認可リクエスト"),
    (82, 7.0, GRAY, "dashed", "検証・応答 (MFA / JWKS / introspection)"),
]
for x, y, color, kind, text in legend:
    ls = (0, (5.5, 3.2)) if kind == "dashed" else "solid"
    ax.plot([x, x + 5], [y, y], color=color, linewidth=2.4, linestyle=ls, zorder=3)
    ax.text(x + 6.2, y, text, ha="left", va="center", fontsize=8.5, color=INK, zorder=3)

ax.add_patch(
    FancyBboxPatch(
        (82, 2.7), 5, 1.8,
        boxstyle="round,pad=0,rounding_size=0.5",
        facecolor="#eef2f7", edgecolor="#7c3aed", linewidth=1.4,
        linestyle=(0, (4, 2.5)), zorder=3,
    )
)
ax.text(88.2, 3.6, "信頼境界 (Trust Boundary)", ha="left", va="center",
        fontsize=8.5, color=INK, zorder=3)

fig.savefig(sys.argv[1], dpi=100, facecolor=fig.get_facecolor())
