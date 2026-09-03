import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_zero_trust_token_exchange(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_client_bg = '#FFF5F5'
    c_client_border = '#E53E3E'
    c_idp_bg = '#FAF5FF'
    c_idp_border = '#805AD5'
    c_mesh_bg = '#F0FFF4'
    c_mesh_border = '#38A169'
    c_idtoken = '#DD6B20'
    c_accesstoken = '#3182CE'
    c_servicetoken = '#319795'

    fig.patch.set_facecolor('#FFFFFF')

    # Boundaries
    # Untrusted Client Zone (Left)
    ax.add_patch(patches.Rectangle((-5.5, -3.8), 3.2, 7.8, facecolor=c_client_bg, edgecolor=c_client_border, linestyle='--', linewidth=1.5))
    ax.text(-5.3, 3.7, 'Untrusted Client Zone', fontsize=13, fontweight='bold', color=c_client_border, va='top')

    # IdP Zone (Top Right)
    ax.add_patch(patches.Rectangle((-1.8, 1.8), 7.2, 2.2, facecolor=c_idp_bg, edgecolor=c_idp_border, linestyle='--', linewidth=1.5))
    ax.text(-1.6, 3.7, 'Identity Provider (IdP) Zone', fontsize=13, fontweight='bold', color=c_idp_border, va='top')

    # Zero Trust Mesh Zone (Bottom Right)
    ax.add_patch(patches.Rectangle((-1.8, -3.8), 7.2, 5.2, facecolor=c_mesh_bg, edgecolor=c_mesh_border, linestyle='--', linewidth=1.5))
    ax.text(-1.6, 1.1, 'Zero Trust Internal Mesh', fontsize=13, fontweight='bold', color=c_mesh_border, va='top')

    # Helper function for blocks
    def add_block(x, y, w, h, title, subtitle, bg, border):
        rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle='round,pad=0.08,rounding_size=0.12',
                                      facecolor=bg, edgecolor=border, linewidth=2)
        ax.add_patch(rect)
        ax.text(x, y + 0.15, title, fontsize=11, fontweight='bold', ha='center', va='center', color='#1A202C')
        ax.text(x, y - 0.2, subtitle, fontsize=9, ha='center', va='center', color='#4A5568')

    # Component Nodes
    add_block(-3.9, 2.5, 2.2, 1.0, 'User', 'Credentials', '#FFFFFF', c_client_border)
    add_block(-3.9, -1.2, 2.2, 1.0, 'Browser / App', 'Public Client', '#FFFFFF', c_client_border)

    add_block(1.8, 2.8, 2.6, 1.0, 'Identity Provider', 'OIDC / Token Issuer', '#FFFFFF', c_idp_border)

    add_block(-0.3, -1.2, 2.2, 1.0, 'API Gateway', 'Token Verification', '#FFFFFF', c_mesh_border)
    add_block(2.2, -1.2, 2.2, 1.0, 'Service A', 'OAuth Token Exch.', '#FFFFFF', c_mesh_border)
    add_block(4.2, -2.8, 2.2, 1.0, 'Service B', 'Backend Service', '#FFFFFF', c_mesh_border)

    # Connections & Token Flows
    # User to Browser
    ax.annotate('', xy=(-3.9, -0.7), xytext=(-3.9, 2.0), arrowprops=dict(arrowstyle='->', lw=2, color=c_idtoken))

    # Auth to IdP
    ax.plot([-3.9, -3.9, 1.8], [-0.7, 3.3, 3.3], color=c_idtoken, linewidth=1.8)
    ax.annotate('', xy=(1.8, 3.3), xytext=(1.0, 3.3), arrowprops=dict(arrowstyle='->', lw=1.8, color=c_idtoken))
    ax.text(-0.8, 3.45, '1. Authenticate', fontsize=10, fontweight='bold', color=c_idtoken, ha='center')

    # Return Tokens from IdP
    ax.plot([1.8, -1.0, -3.9], [2.3, 2.3, -0.7], color=c_idtoken, linestyle='--', linewidth=1.5)
    ax.annotate('', xy=(-3.9, -0.7), xytext=(-3.9, 1.0), arrowprops=dict(arrowstyle='->', lw=1.5, color=c_idtoken))
    ax.text(-0.8, 2.45, '2. ID Token + Access Token', fontsize=9, fontweight='bold', color=c_idtoken, ha='center')

    # Browser to Gateway
    ax.annotate('', xy=(-1.4, -1.2), xytext=(-2.8, -1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_accesstoken))
    ax.text(-2.1, -1.05, '3. Req w/ Access Token', fontsize=9, fontweight='bold', color=c_accesstoken, ha='center')

    # Gateway to Service A
    ax.annotate('', xy=(1.1, -1.2), xytext=(0.8, -1.2), arrowprops=dict(arrowstyle='->', lw=2, color=c_accesstoken))
    ax.text(0.95, -1.05, '4. Forward', fontsize=9, fontweight='bold', color=c_accesstoken, ha='center')

    # Service A Token Exchange with IdP (RFC 8693)
    ax.plot([2.2, 2.2], [-0.7, 2.3], color=c_servicetoken, linestyle='--', linewidth=1.5)
    ax.annotate('', xy=(2.2, 2.3), xytext=(2.2, 1.5), arrowprops=dict(arrowstyle='->', lw=1.5, color=c_servicetoken))
    ax.text(2.35, 0.8, '5. Token Exch. (RFC 8693)', fontsize=9, fontweight='bold', color=c_servicetoken, rotation=-90, va='center')

    # Service A to Service B (S2S Token)
    ax.plot([2.2, 4.2, 4.2], [-1.7, -1.7, -2.3], color=c_servicetoken, linewidth=2)
    ax.annotate('', xy=(4.2, -2.3), xytext=(4.2, -2.0), arrowprops=dict(arrowstyle='->', lw=2, color=c_servicetoken))
    ax.text(3.2, -1.55, '6. mTLS + S2S Token', fontsize=9, fontweight='bold', color=c_servicetoken, ha='center')

    # Legend (Bottom Left)
    ax.add_patch(patches.Rectangle((-5.3, -3.6), 2.8, 1.2, facecolor='white', edgecolor='gray', linewidth=1))
    ax.text(-5.2, -2.6, 'Legend:', fontsize=9, fontweight='bold')
    ax.plot([-5.2, -4.6], [-2.9, -2.9], color=c_idtoken, linewidth=2)
    ax.text(-4.5, -2.9, 'ID Token', fontsize=8, va='center')
    ax.plot([-5.2, -4.6], [-3.15, -3.15], color=c_accesstoken, linewidth=2)
    ax.text(-4.5, -3.15, 'Access Token', fontsize=8, va='center')
    ax.plot([-5.2, -4.6], [-3.4, -3.4], color=c_servicetoken, linewidth=2)
    ax.text(-4.5, -3.4, 'S2S Token', fontsize=8, va='center')

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'zero-trust-token-exchange.png'
    draw_zero_trust_token_exchange(output_file)
