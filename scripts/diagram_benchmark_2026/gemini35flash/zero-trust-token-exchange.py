import matplotlib.pyplot as plt
import matplotlib.patches as patches
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <output_image_path>")
        sys.exit(1)
        
    output_path = sys.argv[1]
    
    # 1200x900 相当で保存する設定 (12x9 インチ, 100 dpi)
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_facecolor('#f8fafc') # Slate 50
    fig.patch.set_facecolor('#f8fafc')
    
    # 座標の範囲設定
    plt.xlim(0, 13.0)
    plt.ylim(0.7, 10.3)
    plt.axis('off')
    
    # 1. 信頼境界 (Trust Boundaries - 縦の帯領域として表現)
    def draw_boundary(x_start, x_end, y_start, y_end, label, bg_color, border_color):
        width = x_end - x_start
        height = y_end - y_start
        rect = patches.Rectangle(
            (x_start, y_start), width, height,
            edgecolor=border_color, facecolor=bg_color,
            linestyle='--', linewidth=2, alpha=0.7, zorder=1
        )
        ax.add_patch(rect)
        # 境界ラベルを上部に配置
        ax.text((x_start + x_end)/2, y_end - 0.3, label, fontsize=11, fontweight='bold', color=border_color, ha='center', va='center', zorder=2)

    # 境界の描画 (alphaを適用して柔らかい色合いにしつつ境界を明示)
    draw_boundary(0.5, 4.6, 1.4, 9.4, "External / Untrusted Zone", "#fff5f5", "#f43f5e") # Rose 500
    draw_boundary(4.6, 8.8, 1.4, 9.4, "DMZ / Identity Zone", "#f0f9ff", "#0ea5e9") # Sky 500
    draw_boundary(8.8, 12.5, 1.4, 9.4, "Secure Internal Zone", "#f0fdf4", "#10b981") # Emerald 500

    # 2. ライフライン (Lifelines for Sequence Diagram)
    nodes_x = {
        'User': 1.5,
        'Browser': 3.5,
        'IdP': 5.7,
        'APIGW': 7.8,
        'ServiceA': 9.8,
        'ServiceB': 11.8
    }
    
    for x in nodes_x.values():
        ax.plot([x, x], [1.5, 8.0], linestyle=':', color='#cbd5e1', linewidth=1.5, zorder=2)

    # 3. ノード描画 (Nodes at the top)
    def draw_node(x, y, name, subtitle, tech=""):
        # 影
        rect_shadow = patches.FancyBboxPatch(
            (x - 0.9, y - 0.6), 1.8, 1.2,
            boxstyle="round,pad=0.1",
            edgecolor="none", facecolor="#cbd5e1",
            alpha=0.4, zorder=2
        )
        ax.add_patch(rect_shadow)
        
        # 本体
        rect = patches.FancyBboxPatch(
            (x - 0.9, y - 0.6), 1.8, 1.2,
            boxstyle="round,pad=0.1",
            edgecolor="#64748b", facecolor="#ffffff",
            linewidth=1.5, zorder=3
        )
        ax.add_patch(rect)
        
        # テキスト
        ax.text(x, y + 0.15, name, fontsize=12, fontweight='bold', color='#1e293b', ha='center', va='center', zorder=4)
        ax.text(x, y - 0.15, subtitle, fontsize=9, color='#64748b', ha='center', va='center', zorder=4)
        if tech:
            ax.text(x, y - 0.4, tech, fontsize=8, color='#94a3b8', fontstyle='italic', ha='center', va='center', zorder=4)

    draw_node(nodes_x['User'], 8.5, "User", "End User", "Active Actor")
    draw_node(nodes_x['Browser'], 8.5, "Browser", "User Agent", "SPA / Client App")
    draw_node(nodes_x['IdP'], 8.5, "IdP", "Identity Provider", "OAuth2 / OIDC")
    draw_node(nodes_x['APIGW'], 8.5, "API Gateway", "Policy Enforcement", "Reverse Proxy")
    draw_node(nodes_x['ServiceA'], 8.5, "Service A", "Business Logic", "Token Exchange")
    draw_node(nodes_x['ServiceB'], 8.5, "Service B", "Backend API", "Zero-Trust")

    # 4. メッセージ・トークンフロー (Messages & Token Flows)
    def draw_message(y, from_x, to_x, label, token_types=None, is_response=False):
        color = '#94a3b8' if is_response else '#334155'
        linestyle = '--' if is_response else '-'
        
        # 常に from_x から to_x へ向かう矢印線を描画
        arrowprops = dict(
            arrowstyle="-|>",
            linestyle=linestyle,
            color=color,
            linewidth=1.5 if is_response else 2.0,
            mutation_scale=12,
            zorder=4
        )
        ax.annotate("", xy=(to_x, y), xytext=(from_x, y), arrowprops=arrowprops)
        
        # ラベルテキストの背景付き配置
        mx = (from_x + to_x) / 2
        ax.text(mx, y + 0.13, label, fontsize=8.5, fontweight='semibold', color='#1e293b',
                ha='center', va='center', bbox=dict(boxstyle="round,pad=0.15", fc="#ffffff", ec="#e2e8f0", alpha=0.95), zorder=5)
        
        # トークンインジケータ (色のついた小さな丸)
        if token_types:
            token_colors = {
                'id': '#3b82f6',     # Blue
                'access': '#10b981', # Emerald
                'service': '#8b5cf6' # Purple
            }
            start_offset = -0.18 * (len(token_types) - 1)
            for i, t_type in enumerate(token_types):
                t_color = token_colors.get(t_type, '#cbd5e1')
                tx = mx + start_offset + (i * 0.36)
                ty = y - 0.2
                
                # 丸印
                ax.plot(tx, ty, marker='o', color=t_color, markersize=8, zorder=6)
                # トークン種別テキスト (背景に微小な white bbox を付与して境界線との重なりを保護)
                ax.text(tx, ty - 0.16, t_type.upper(), fontsize=6.5, fontweight='bold', color=t_color, 
                        ha='center', va='center', bbox=dict(boxstyle="round,pad=0.05", fc="#ffffff", ec="none", alpha=0.85), zorder=6)

    # 時系列でのステップ描画 (Y座標を徐々に下げていく)
    # 1. User -> Browser: ログイン開始
    draw_message(7.6, nodes_x['User'], nodes_x['Browser'], "1. Interact (Login)")
    
    # 2. Browser -> IdP: 認証リクエスト (外部からIDP)
    draw_message(7.0, nodes_x['Browser'], nodes_x['IdP'], "2. Authenticate")
    
    # 3. IdP -> Browser: 認証成功、各種トークンの発行
    draw_message(6.4, nodes_x['IdP'], nodes_x['Browser'], "3. Issue Tokens", token_types=['id', 'access'])
    
    # 4. Browser -> API Gateway: Access Tokenを付与してリクエスト送信 (信頼境界をまたぐ)
    draw_message(5.8, nodes_x['Browser'], nodes_x['APIGW'], "4. Call API", token_types=['access'])
    
    # 5. API Gateway -> Service A: ゲートウェイ検証後、トークンを転送して内部呼び出し
    draw_message(5.2, nodes_x['APIGW'], nodes_x['ServiceA'], "5. Forward Request", token_types=['access'])
    
    # 6. Service A -> IdP: Service Bを呼ぶため、受け取ったAccess TokenをService Tokenに交換申請
    draw_message(4.6, nodes_x['ServiceA'], nodes_x['IdP'], "6. Token Exchange Req (RFC 8693)", token_types=['access'])
    
    # 7. IdP -> Service A: 検証後、Service B宛てのService Tokenを発行
    draw_message(4.0, nodes_x['IdP'], nodes_x['ServiceA'], "7. Issue Svc Token", token_types=['service'])
    
    # 8. Service A -> Service B: Service Tokenを付加してバックエンド呼び出し (信頼境界内)
    draw_message(3.4, nodes_x['ServiceA'], nodes_x['ServiceB'], "8. Authorized Service Call", token_types=['service'])
    
    # 9. Service B -> Service A: 応答返却 (右から左へ)
    draw_message(2.8, nodes_x['ServiceB'], nodes_x['ServiceA'], "9. Protected Response", is_response=True)
    
    # 10. Service A -> API Gateway: 応答転送 (右から左へ)
    draw_message(2.2, nodes_x['ServiceA'], nodes_x['APIGW'], "10. Service Response", is_response=True)
    
    # 11. API Gateway -> Browser: 最終レスポンス (右から左へ)
    draw_message(1.6, nodes_x['APIGW'], nodes_x['Browser'], "11. HTTP 200 OK (Data)", is_response=True)

    # 5. 凡例 (Legend - 重なりを防ぐため幅とX座標を調整)
    def draw_legend(x, y):
        # 影
        shadow = patches.FancyBboxPatch(
            (x - 0.1, y - 0.1), 9.6, 0.6, boxstyle="round,pad=0.1",
            edgecolor="none", facecolor="#cbd5e1", alpha=0.3, zorder=2
        )
        ax.add_patch(shadow)
        
        rect = patches.FancyBboxPatch(
            (x, y), 9.4, 0.4, boxstyle="round,pad=0.1",
            edgecolor="#cbd5e1", facecolor="#ffffff", linewidth=1, zorder=3
        )
        ax.add_patch(rect)
        
        # ID Token
        ax.plot(x + 0.6, y + 0.2, marker='o', color='#3b82f6', markersize=10, zorder=4)
        ax.text(x + 0.9, y + 0.2, "ID Token (User Info & Profile)", fontsize=9, fontweight='semibold', color='#475569', va='center', zorder=4)
        
        # Access Token
        ax.plot(x + 3.6, y + 0.2, marker='o', color='#10b981', markersize=10, zorder=4)
        ax.text(x + 3.9, y + 0.2, "Access Token (API Gateway Access)", fontsize=9, fontweight='semibold', color='#475569', va='center', zorder=4)
        
        # Service Token
        ax.plot(x + 6.8, y + 0.2, marker='o', color='#8b5cf6', markersize=10, zorder=4)
        ax.text(x + 7.1, y + 0.2, "Service Token (Svc-to-Svc Auth)", fontsize=9, fontweight='semibold', color='#475569', va='center', zorder=4)

    draw_legend(1.8, 0.8)

    # 6. タイトルとサブタイトル
    ax.text(6.5, 9.9, "Zero Trust Authentication & Token Exchange Flow", 
            fontsize=18, fontweight='bold', color='#0f172a', ha='center', va='center', zorder=4)
    ax.text(6.5, 9.6, "Secure Identity Delegation with OAuth 2.0 / OIDC & Token Exchange (RFC 8693)", 
            fontsize=10.5, color='#475569', ha='center', va='center', zorder=4)

    plt.tight_layout()
    plt.savefig(output_path, dpi=100, facecolor='#f8fafc', bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    main()
