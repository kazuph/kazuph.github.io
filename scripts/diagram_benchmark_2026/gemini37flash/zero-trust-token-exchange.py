import sys
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

def draw_zero_trust(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0b1120')
    ax.set_facecolor('#0b1120')

    # Header
    ax.text(600, 865, 'Zero Trust OAuth 2.0 / RFC 8693 Token Exchange', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 835, 'Workload Identity Propagation, Policy Decision (PDP/PEP) & Least-Privilege Scoping',
            color='#94a3b8', fontsize=12, ha='center', va='center')

    # Columns:
    # 1: Client Workload (x=140)
    # 2: PEP Gateway (x=380)
    # 3: STS / IdP (x=620)
    # 4: PDP OPA Engine (x=850)
    # 5: Downstream Target Resource (x=1070)

    cols = [
        (140, 'Client Workload\n(Frontend)', '#172554', '#38bdf8'),
        (380, 'Gateway (PEP)\n(Enforcement)', '#075985', '#0ea5e9'),
        (620, 'STS / IdP Server\n(RFC 8693 Exchange)', '#4c1d95', '#c084fc'),
        (850, 'Engine (PDP)\n(OPA / Decision)', '#78350f', '#fbbf24'),
        (1070, 'Target Resource\n(Microservice)', '#064e3b', '#34d399')
    ]

    for cx, title, bg, border in cols:
        # Header box
        ax.add_patch(FancyBboxPatch((cx - 85, 710), 170, 80, boxstyle='round,pad=0.02,rounding_size=8',
                                    facecolor=bg, edgecolor=border, lw=2))
        ax.text(cx, 750, title, color='#f8fafc', fontsize=11, fontweight='bold', ha='center', va='center')
        # Vertical Lifeline
        ax.plot([cx, cx], [150, 710], color='#334155', ls='--', lw=1.8)

    # SEQUENCE FLOWS
    # Step 1: Client -> PEP (y=640)
    ax.annotate('', xy=(380, 640), xytext=(140, 640),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5, mutation_scale=15))
    ax.text(260, 655, '1. Request + Subject Token (User JWT)', color='#7dd3fc', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#38bdf8', lw=1))

    # Step 2: PEP -> STS (y=560)
    ax.annotate('', xy=(620, 560), xytext=(380, 560),
                arrowprops=dict(arrowstyle='-|>', color='#c084fc', lw=2.5, mutation_scale=15))
    ax.text(500, 575, '2. POST /token (grant_type=token-exchange)', color='#f3e8ff', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#c084fc', lw=1))
    ax.text(500, 540, 'subject_token=JWT, aud=api://payments', color='#94a3b8', fontsize=9, ha='center')

    # Step 3: STS -> PDP (y=470)
    ax.annotate('', xy=(850, 470), xytext=(620, 470),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', lw=2.5, mutation_scale=15))
    ax.text(735, 485, '3. Evaluate AuthZ Policy (OPA Query)', color='#fef3c7', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#fbbf24', lw=1))

    # Step 4: PDP -> STS (y=410)
    ax.annotate('', xy=(620, 410), xytext=(850, 410),
                arrowprops=dict(arrowstyle='-|>', color='#fbbf24', ls='--', lw=2.5, mutation_scale=15))
    ax.text(735, 425, '4. Permit [scope: read, pay]', color='#fef3c7', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#fbbf24', lw=1))

    # Step 5: STS -> PEP (y=340)
    ax.annotate('', xy=(380, 340), xytext=(620, 340),
                arrowprops=dict(arrowstyle='-|>', color='#c084fc', ls='--', lw=2.5, mutation_scale=15))
    ax.text(500, 355, '5. 200 OK: Issued Target Token (aud=payments)', color='#f3e8ff', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#c084fc', lw=1))

    # Step 6: PEP -> Downstream Target (y=260)
    ax.annotate('', xy=(1070, 260), xytext=(380, 260),
                arrowprops=dict(arrowstyle='-|>', color='#34d399', lw=3, mutation_scale=16))
    ax.text(725, 275, '6. mTLS Forward + Scoped Target Token', color='#a7f3d0', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#34d399', lw=1))

    # Step 7: Target -> PEP -> Client Response (y=190)
    ax.annotate('', xy=(380, 190), xytext=(1070, 190),
                arrowprops=dict(arrowstyle='-|>', color='#34d399', ls='--', lw=2.5, mutation_scale=15))
    ax.annotate('', xy=(140, 190), xytext=(380, 190),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', ls='--', lw=2.5, mutation_scale=15))
    ax.text(600, 205, '7. Authorized Data Response (JSON 200 OK)', color='#34d399', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#0f172a', edgecolor='#34d399', lw=1))

    # Footer Zero Trust Card
    info_text = "Zero Trust Principles: 1. Cryptographic Workload Identity (SPIFFE mTLS)  2. RFC 8693 Token Exchange (Downstream Aud Scoping)  3. Decoupled PDP/PEP Policy"
    ax.text(600, 60, info_text, color='#f8fafc', fontsize=11, ha='center', va='center',
            bbox=dict(boxstyle='round,pad=0.6', facecolor='#1e293b', edgecolor='#334155', lw=1.5))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_zero_trust(sys.argv[1])
    else:
        draw_zero_trust('zero-trust-token-exchange.png')
