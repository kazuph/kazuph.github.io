from __future__ import annotations

from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parent
PROMPTS = ROOT / "prompts"
GPT_DIR = ROOT / "gpt54"


CASES = [
    {
        "id": "bear-plush",
        "title": "クマのぬいぐるみ",
        "bullets": [
            "かわいいクマのぬいぐるみを正面向きで描く",
            "頭は丸く、耳は左右対称で少し大きめ",
            "胴体は柔らかい綿入りの感じが出るように少し横幅を持たせる",
            "腕と脚は短めで、ぬいぐるみらしい丸みを付ける",
            "目、鼻、口、足裏、胸のワッペンなどで質感差を出す",
            "暖色寄りでやさしい配色にする",
        ],
    },
    {
        "id": "elderly-living-room-tv",
        "title": "独居おばあちゃんがリビングでテレビを見ている絵",
        "bullets": [
            "リビングでおばあちゃんがテレビを見ている情景を描く",
            "おばあちゃんは一人で、椅子かソファに座っている",
            "テレビ、テーブル、照明、カーテンなどで生活空間を出す",
            "テレビの方へ視線が向いていることが分かるようにする",
            "家庭的で温かい雰囲気にする",
        ],
    },
    {
        "id": "vr-son-watched-by-mother",
        "title": "自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子",
        "bullets": [
            "子ども部屋で息子がVRゴーグルを装着して遊んでいる場面を描く",
            "息子は両手にコントローラーを持ち、楽しそうに動いている",
            "部屋の入口側からお母さんがその様子を見ている",
            "机、棚、ベッドなどで子ども部屋らしさを出す",
            "人物同士の視線関係が分かるようにする",
        ],
    },
    {
        "id": "hydraulic-piston",
        "title": "油圧ピストンの構造解説",
        "bullets": [
            "油圧ピストンの断面構造図を描く",
            "シリンダー、ピストン、ロッド、左右の圧力室を表現する",
            "流体の流れを矢印で示す",
            "主要部品にラベルを付ける",
            "教育用の図として読みやすく整理する",
        ],
    },
    {
        "id": "robot-arm-7axis",
        "title": "7軸ロボットアームとその軸の説明",
        "bullets": [
            "7軸ロボットアームの全体図を描く",
            "各関節を J1 から J7 までラベル付けする",
            "各軸の回転方向を小さな矢印で示す",
            "ベース、リンク、手先の関係が分かるようにする",
            "やや立体感のある構図で描く",
        ],
    },
    {
        "id": "kalman-filter",
        "title": "カルマンフィルターのブロック線図",
        "bullets": [
            "カルマンフィルターのブロック線図を描く",
            "Prediction, Update, Measurement, State estimate を分ける",
            "入力とフィードバックの向きを矢印で示す",
            "Kalman gain や residual など主要な情報流も入れる",
            "制御図として見やすく整理する",
        ],
    },
    {
        "id": "rag-pipeline",
        "title": "RAGパイプライン構成図",
        "bullets": [
            "RAG のパイプライン構成図を描く",
            "User Query, Embed/Retrieve, Vector DB, Retrieved Context, LLM, Answer を入れる",
            "オンライン処理と事前の文書投入を区別する",
            "データフローを矢印で示す",
            "現代的なAIシステム図として整理する",
        ],
    },
    {
        "id": "zero-trust-token-exchange",
        "title": "ゼロトラスト認証とトークン交換",
        "bullets": [
            "ゼロトラスト認証とトークン交換の流れを描く",
            "User, Browser, IdP, API Gateway, Service A, Service B を入れる",
            "ID token, access token, service token の流れを区別する",
            "信頼境界を領域として表現する",
            "複雑でも読めるセキュリティ図にする",
        ],
    },
    {
        "id": "bloch-sphere",
        "title": "ブロッホ球",
        "bullets": [
            "ブロッホ球を2D投影で描く",
            "x, y, z 軸を示す",
            "量子状態ベクトル |psi> を球面上に描く",
            "theta と phi の角度を小さな弧で示す",
            "物理の教科書に出てくる図として整える",
        ],
    },
    {
        "id": "michelson-interferometer",
        "title": "マイケルソン干渉計",
        "bullets": [
            "マイケルソン干渉計の模式図を描く",
            "Laser, Beam Splitter, Mirror A, Mirror B, Screen を入れる",
            "光路を直線矢印で示す",
            "ビームスプリッタで2方向に分岐して戻る流れを見せる",
            "対称性を保って配置する",
        ],
    },
]


def svg_header(width: int = 1200, height: int = 900, bg: str = "#fbfaf6") -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">\n  <rect width="{width}" height="{height}" fill="{bg}"/>'


def svg_footer() -> str:
    return "\n</svg>\n"


def tikz_wrap(body: str) -> str:
    return textwrap.dedent(
        f"""
        \\documentclass[tikz,border=4mm]{{standalone}}
        \\usepackage{{tikz}}
        \\usetikzlibrary{{arrows.meta,positioning,calc,shapes.geometric}}
        \\begin{{document}}
        \\begin{{tikzpicture}}[>=Stealth, line cap=round, line join=round]
        {body}
        \\end{{tikzpicture}}
        \\end{{document}}
        """
    ).strip() + "\n"


def mpl_script(case_id: str, body: str) -> str:
    return (
        "import sys\n"
        "import matplotlib.pyplot as plt\n"
        "import matplotlib.patches as patches\n\n"
        "output_path = sys.argv[1]\n"
        "fig, ax = plt.subplots(figsize=(12, 9), dpi=100)\n"
        "ax.set_xlim(0, 1200)\n"
        "ax.set_ylim(0, 900)\n"
        "ax.set_aspect('equal')\n"
        "ax.axis('off')\n"
        "fig.patch.set_facecolor('#fbfaf6')\n"
        "ax.set_facecolor('#fbfaf6')\n\n"
        f"{body.strip()}\n\n"
        "plt.tight_layout(pad=0)\n"
        "fig.savefig(output_path, bbox_inches='tight', pad_inches=0.05)\n"
    )


def prompt_text(case: dict[str, object], format_id: str) -> str:
    title = case["title"]
    bullets = case["bullets"]
    if format_id == "svg":
        intro = f"{title} を、1200x900 の SVG で描いてください。"
        extra = [
            "出力ルール:",
            "- 説明は不要",
            "- Markdown の code fence も不要",
            "- SVG 本体だけを出力する",
        ]
    elif format_id == "matplotlib":
        intro = f"{title} を matplotlib で描く Python スクリプトを書いてください。"
        extra = [
            "実装ルール:",
            "- matplotlib だけを使う",
            "- 出力ファイルパスは sys.argv[1] から受け取る",
            "- 画像は 1200x900 相当で保存する",
            "- 軸や余計なラベルは出さない",
            "",
            "出力ルール:",
            "- 説明は不要",
            "- Markdown の code fence も不要",
            "- Python コード本体だけを出力する",
        ]
    else:
        intro = f"{title} を TikZ で描いてください。"
        extra = [
            "実装ルール:",
            "- standalone でそのまま xelatex できる完全な .tex ファイルにする",
            "- 余計なパッケージは使わず、tikz の基本図形で描く",
            "- 画像サイズは横長すぎず、1200x900 相当で見やすい構図にする",
            "",
            "出力ルール:",
            "- 説明は不要",
            "- Markdown の code fence も不要",
            "- .tex ファイル本体だけを出力する",
        ]
    lines = [intro, "", "要件:"] + [f"- {b}" for b in bullets] + [""] + extra
    return "\n".join(lines) + "\n"


def build_svg(case_id: str) -> str:
    if case_id == "elderly-living-room-tv":
        body = """
  <rect x="90" y="620" width="1020" height="160" rx="20" fill="#e9dcc9"/>
  <rect x="130" y="160" width="190" height="300" rx="18" fill="#d8ccb8" stroke="#8b7d6b" stroke-width="6"/>
  <rect x="158" y="188" width="134" height="220" rx="12" fill="#2f3540"/>
  <rect x="135" y="470" width="180" height="20" rx="10" fill="#9c8f7f"/>
  <rect x="820" y="410" width="210" height="150" rx="24" fill="#b48162"/>
  <rect x="840" y="350" width="170" height="90" rx="18" fill="#b48162"/>
  <circle cx="890" cy="318" r="52" fill="#f3d8c6"/>
  <path d="M850 318 q40 -82 98 0" fill="#ece7e2"/>
  <circle cx="872" cy="318" r="6" fill="#49362c"/>
  <circle cx="916" cy="318" r="6" fill="#49362c"/>
  <path d="M880 346 q18 10 36 0" fill="none" stroke="#6f4f3d" stroke-width="4"/>
  <path d="M856 400 q32 42 76 0" fill="none" stroke="#7b5747" stroke-width="12" stroke-linecap="round"/>
  <path d="M932 404 q30 40 68 26" fill="none" stroke="#7b5747" stroke-width="12" stroke-linecap="round"/>
  <path d="M858 540 q18 80 54 132" fill="none" stroke="#6b4d3a" stroke-width="20" stroke-linecap="round"/>
  <path d="M972 540 q-8 88 -20 150" fill="none" stroke="#6b4d3a" stroke-width="20" stroke-linecap="round"/>
  <path d="M760 245 q85 85 0 170" fill="none" stroke="#d7c7b4" stroke-width="16" stroke-linecap="round"/>
  <path d="M1050 245 q-85 85 0 170" fill="none" stroke="#d7c7b4" stroke-width="16" stroke-linecap="round"/>
  <circle cx="792" cy="260" r="18" fill="#e8dcca"/>
  <circle cx="1020" cy="260" r="18" fill="#e8dcca"/>
  <circle cx="232" cy="302" r="10" fill="#f5e66a"/>
  <line x1="292" y1="302" x2="856" y2="320" stroke="#8fb3da" stroke-width="4" stroke-dasharray="10 8"/>
  <polygon points="842,312 874,320 842,328" fill="#8fb3da"/>
  <text x="212" y="148" font-size="34" fill="#665749">TV</text>
  <text x="760" y="220" font-size="34" fill="#665749">Curtain</text>
  <text x="806" y="610" font-size="34" fill="#665749">Sofa</text>
"""
    elif case_id == "vr-son-watched-by-mother":
        body = """
  <rect x="120" y="600" width="960" height="180" rx="24" fill="#e7dccc"/>
  <rect x="150" y="170" width="240" height="260" rx="24" fill="#d7c3a7"/>
  <rect x="182" y="208" width="176" height="180" rx="18" fill="#f2eadf"/>
  <rect x="780" y="170" width="190" height="250" rx="18" fill="#c1d2dd"/>
  <rect x="820" y="210" width="110" height="130" rx="12" fill="#edf4fa"/>
  <rect x="520" y="270" width="160" height="90" rx="20" fill="#2a2d39"/>
  <circle cx="600" cy="365" r="60" fill="#f0c9ad"/>
  <path d="M540 360 q60 22 120 0" fill="none" stroke="#6b4e3c" stroke-width="10"/>
  <rect x="545" y="342" width="110" height="44" rx="20" fill="#151a22"/>
  <rect x="526" y="352" width="20" height="26" rx="10" fill="#151a22"/>
  <rect x="654" y="352" width="20" height="26" rx="10" fill="#151a22"/>
  <path d="M600 420 q-48 78 -68 160" fill="none" stroke="#39506b" stroke-width="28" stroke-linecap="round"/>
  <path d="M598 418 q54 78 84 165" fill="none" stroke="#39506b" stroke-width="28" stroke-linecap="round"/>
  <path d="M528 522 q-86 42 -116 118" fill="none" stroke="#39506b" stroke-width="24" stroke-linecap="round"/>
  <path d="M672 530 q98 34 132 108" fill="none" stroke="#39506b" stroke-width="24" stroke-linecap="round"/>
  <circle cx="396" cy="652" r="22" fill="#7dd3fc"/>
  <circle cx="820" cy="646" r="22" fill="#7dd3fc"/>
  <circle cx="910" cy="345" r="52" fill="#f3d8c6"/>
  <path d="M864 334 q46 -78 92 0" fill="#7a5a44"/>
  <path d="M908 396 q-44 62 -48 150" fill="none" stroke="#6b4d3a" stroke-width="20" stroke-linecap="round"/>
  <path d="M908 398 q44 58 58 140" fill="none" stroke="#b38a6f" stroke-width="20" stroke-linecap="round"/>
  <line x1="872" y1="342" x2="644" y2="344" stroke="#d64b4b" stroke-width="4" stroke-dasharray="12 8"/>
  <polygon points="660,336 630,344 660,352" fill="#d64b4b"/>
  <text x="188" y="150" font-size="30" fill="#665749">Bed</text>
  <text x="790" y="150" font-size="30" fill="#665749">Shelf</text>
  <text x="506" y="706" font-size="30" fill="#665749">VR room scene</text>
"""
    elif case_id == "hydraulic-piston":
        body = """
  <rect x="140" y="310" width="820" height="210" rx="36" fill="#e7edf3" stroke="#617587" stroke-width="8"/>
  <rect x="300" y="340" width="220" height="150" fill="#cdd8e3" stroke="#617587" stroke-width="6"/>
  <rect x="500" y="336" width="40" height="158" fill="#617587"/>
  <rect x="540" y="388" width="380" height="54" rx="14" fill="#b8c7d6" stroke="#617587" stroke-width="6"/>
  <rect x="248" y="370" width="28" height="92" rx="10" fill="#d97d5d"/>
  <rect x="564" y="374" width="24" height="84" rx="10" fill="#d97d5d"/>
  <polygon points="120,402 170,376 170,428" fill="#60a5fa"/>
  <line x1="170" y1="402" x2="286" y2="402" stroke="#60a5fa" stroke-width="8"/>
  <polygon points="980,402 930,376 930,428" fill="#f87171"/>
  <line x1="930" y1="402" x2="828" y2="402" stroke="#f87171" stroke-width="8"/>
  <text x="188" y="280" font-size="32" fill="#445566">Cylinder</text>
  <text x="332" y="538" font-size="32" fill="#445566">Pressure chamber A</text>
  <text x="610" y="538" font-size="32" fill="#445566">Pressure chamber B</text>
  <text x="486" y="292" font-size="30" fill="#445566">Piston</text>
  <text x="690" y="372" font-size="30" fill="#445566">Rod</text>
"""
    elif case_id == "robot-arm-7axis":
        body = """
  <rect x="120" y="640" width="220" height="70" rx="18" fill="#3f4c5a"/>
  <circle cx="250" cy="620" r="34" fill="#718096"/>
  <circle cx="340" cy="520" r="28" fill="#718096"/>
  <circle cx="450" cy="430" r="26" fill="#718096"/>
  <circle cx="580" cy="358" r="24" fill="#718096"/>
  <circle cx="712" cy="310" r="22" fill="#718096"/>
  <circle cx="842" cy="282" r="20" fill="#718096"/>
  <circle cx="972" cy="268" r="18" fill="#718096"/>
  <path d="M250 620 L340 520 L450 430 L580 358 L712 310 L842 282 L972 268" fill="none" stroke="#ed8936" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M972 268 L1060 240" fill="none" stroke="#ed8936" stroke-width="16" stroke-linecap="round"/>
  <rect x="1058" y="220" width="44" height="44" rx="10" fill="#2b6cb0"/>
  <path d="M250 576 a32 32 0 1 1 40 40" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M340 478 a28 28 0 1 1 34 36" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M450 390 a26 26 0 1 1 30 34" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M580 322 a24 24 0 1 1 28 30" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M712 280 a22 22 0 1 1 24 26" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M842 254 a20 20 0 1 1 22 24" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <path d="M972 242 a18 18 0 1 1 18 20" fill="none" stroke="#2b6cb0" stroke-width="4"/>
  <g font-size="28" fill="#1f2937">
    <text x="224" y="566">J1</text>
    <text x="312" y="468">J2</text>
    <text x="420" y="380">J3</text>
    <text x="548" y="312">J4</text>
    <text x="680" y="270">J5</text>
    <text x="810" y="244">J6</text>
    <text x="940" y="232">J7</text>
  </g>
"""
    elif case_id == "kalman-filter":
        body = """
  <rect x="120" y="360" width="120" height="70" rx="16" fill="#dbeafe" stroke="#1d4ed8" stroke-width="4"/>
  <rect x="320" y="300" width="210" height="90" rx="18" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <rect x="640" y="300" width="210" height="90" rx="18" fill="#d1fae5" stroke="#047857" stroke-width="4"/>
  <rect x="920" y="300" width="150" height="90" rx="18" fill="#e9d5ff" stroke="#7e22ce" stroke-width="4"/>
  <rect x="650" y="520" width="180" height="78" rx="18" fill="#fee2e2" stroke="#b91c1c" stroke-width="4"/>
  <line x1="240" y1="395" x2="320" y2="345" stroke="#374151" stroke-width="4"/>
  <polygon points="302,338 320,345 309,360" fill="#374151"/>
  <line x1="530" y1="345" x2="640" y2="345" stroke="#374151" stroke-width="4"/>
  <polygon points="622,337 640,345 622,353" fill="#374151"/>
  <line x1="850" y1="345" x2="920" y2="345" stroke="#374151" stroke-width="4"/>
  <polygon points="902,337 920,345 902,353" fill="#374151"/>
  <line x1="994" y1="390" x2="994" y2="530" stroke="#374151" stroke-width="4"/>
  <line x1="994" y1="530" x2="830" y2="560" stroke="#374151" stroke-width="4"/>
  <polygon points="845,546 830,560 849,562" fill="#374151"/>
  <line x1="650" y1="560" x2="430" y2="560" stroke="#374151" stroke-width="4"/>
  <line x1="430" y1="560" x2="430" y2="390" stroke="#374151" stroke-width="4"/>
  <polygon points="422,408 430,390 438,408" fill="#374151"/>
  <line x1="160" y1="520" x2="650" y2="520" stroke="#60a5fa" stroke-width="4" stroke-dasharray="12 8"/>
  <polygon points="632,512 650,520 632,528" fill="#60a5fa"/>
  <g font-size="28" fill="#1f2937">
    <text x="154" y="404">u_k</text>
    <text x="362" y="352">Prediction</text>
    <text x="724" y="352">Update</text>
    <text x="955" y="352">x̂_k</text>
    <text x="694" y="566">Residual / K_k</text>
    <text x="204" y="510">Measurement z_k</text>
  </g>
"""
    elif case_id == "rag-pipeline":
        body = """
  <rect x="80" y="336" width="160" height="82" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <rect x="300" y="336" width="190" height="82" rx="18" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <rect x="560" y="220" width="210" height="82" rx="18" fill="#d1fae5" stroke="#047857" stroke-width="4"/>
  <rect x="560" y="452" width="210" height="82" rx="18" fill="#ccfbf1" stroke="#0f766e" stroke-width="4"/>
  <rect x="840" y="336" width="160" height="82" rx="18" fill="#e9d5ff" stroke="#7e22ce" stroke-width="4"/>
  <rect x="1040" y="336" width="120" height="82" rx="18" fill="#fee2e2" stroke="#b91c1c" stroke-width="4"/>
  <rect x="310" y="120" width="240" height="70" rx="16" fill="#f3f4f6" stroke="#6b7280" stroke-width="4"/>
  <line x1="240" y1="377" x2="300" y2="377" stroke="#374151" stroke-width="4"/>
  <polygon points="282,369 300,377 282,385" fill="#374151"/>
  <line x1="490" y1="377" x2="560" y2="262" stroke="#374151" stroke-width="4"/>
  <polygon points="553,280 560,262 540,271" fill="#374151"/>
  <line x1="770" y1="262" x2="840" y2="377" stroke="#374151" stroke-width="4"/>
  <polygon points="822,369 840,377 829,359" fill="#374151"/>
  <line x1="1000" y1="377" x2="1040" y2="377" stroke="#374151" stroke-width="4"/>
  <polygon points="1022,369 1040,377 1022,385" fill="#374151"/>
  <line x1="430" y1="190" x2="640" y2="220" stroke="#6b7280" stroke-width="4" stroke-dasharray="12 8"/>
  <polygon points="622,210 640,220 620,225" fill="#6b7280"/>
  <line x1="640" y1="302" x2="640" y2="452" stroke="#6b7280" stroke-width="4" stroke-dasharray="12 8"/>
  <polygon points="632,434 640,452 648,434" fill="#6b7280"/>
  <line x1="770" y1="492" x2="900" y2="418" stroke="#047857" stroke-width="4"/>
  <polygon points="884,417 900,418 892,404" fill="#047857"/>
  <g font-size="28" fill="#1f2937">
    <text x="104" y="386">Query</text>
    <text x="332" y="386">Embed/Retrieve</text>
    <text x="612" y="270">Vector DB</text>
    <text x="594" y="496">Retrieved docs</text>
    <text x="892" y="386">LLM</text>
    <text x="1060" y="386">Answer</text>
    <text x="338" y="165">Document ingest / chunking</text>
  </g>
"""
    elif case_id == "zero-trust-token-exchange":
        body = """
  <rect x="80" y="240" width="150" height="90" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <rect x="80" y="430" width="150" height="90" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <rect x="320" y="320" width="180" height="90" rx="18" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <rect x="590" y="240" width="180" height="90" rx="18" fill="#d1fae5" stroke="#047857" stroke-width="4"/>
  <rect x="590" y="430" width="180" height="90" rx="18" fill="#ccfbf1" stroke="#0f766e" stroke-width="4"/>
  <rect x="870" y="320" width="170" height="90" rx="18" fill="#e9d5ff" stroke="#7e22ce" stroke-width="4"/>
  <rect x="280" y="180" width="800" height="400" rx="26" fill="none" stroke="#94a3b8" stroke-width="6" stroke-dasharray="16 10"/>
  <line x1="230" y1="285" x2="320" y2="355" stroke="#374151" stroke-width="4"/>
  <polygon points="302,350 320,355 311,339" fill="#374151"/>
  <line x1="230" y1="475" x2="320" y2="375" stroke="#374151" stroke-width="4"/>
  <polygon points="304,384 320,375 315,395" fill="#374151"/>
  <line x1="500" y1="355" x2="590" y2="285" stroke="#374151" stroke-width="4"/>
  <polygon points="574,293 590,285 584,303" fill="#374151"/>
  <line x1="500" y1="375" x2="590" y2="475" stroke="#374151" stroke-width="4"/>
  <polygon points="574,467 590,475 579,459" fill="#374151"/>
  <line x1="770" y1="285" x2="870" y2="355" stroke="#374151" stroke-width="4"/>
  <polygon points="854,350 870,355 860,340" fill="#374151"/>
  <line x1="770" y1="475" x2="870" y2="375" stroke="#374151" stroke-width="4"/>
  <polygon points="855,386 870,375 850,378" fill="#374151"/>
  <text x="98" y="295" font-size="28" fill="#1f2937">User</text>
  <text x="96" y="485" font-size="28" fill="#1f2937">Browser</text>
  <text x="368" y="376" font-size="28" fill="#1f2937">IdP</text>
  <text x="618" y="296" font-size="28" fill="#1f2937">Service A</text>
  <text x="618" y="486" font-size="28" fill="#1f2937">Service B</text>
  <text x="892" y="376" font-size="28" fill="#1f2937">API Gateway</text>
  <text x="450" y="220" font-size="28" fill="#64748b">Zero-trust boundary</text>
  <text x="278" y="280" font-size="24" fill="#b45309">ID token</text>
  <text x="494" y="260" font-size="24" fill="#047857">Access token</text>
  <text x="792" y="286" font-size="24" fill="#7e22ce">Service token</text>
"""
    elif case_id == "bloch-sphere":
        body = """
  <ellipse cx="600" cy="420" rx="250" ry="250" fill="#f8fbff" stroke="#6b7280" stroke-width="5"/>
  <ellipse cx="600" cy="420" rx="250" ry="90" fill="none" stroke="#cbd5e1" stroke-width="3"/>
  <line x1="350" y1="420" x2="850" y2="420" stroke="#94a3b8" stroke-width="3"/>
  <line x1="600" y1="170" x2="600" y2="670" stroke="#94a3b8" stroke-width="3"/>
  <line x1="600" y1="420" x2="760" y2="280" stroke="#2563eb" stroke-width="8"/>
  <polygon points="748,282 760,280 754,292" fill="#2563eb"/>
  <path d="M600 420 A110 110 0 0 1 658 326" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M670 418 A70 70 0 0 1 730 374" fill="none" stroke="#10b981" stroke-width="4"/>
  <text x="606" y="198" font-size="30" fill="#1f2937">z</text>
  <text x="822" y="408" font-size="30" fill="#1f2937">x</text>
  <text x="724" y="250" font-size="30" fill="#1f2937">|ψ⟩</text>
  <text x="646" y="344" font-size="28" fill="#ef4444">θ</text>
  <text x="720" y="388" font-size="28" fill="#10b981">φ</text>
"""
    else:
        body = """
  <rect x="100" y="390" width="120" height="44" rx="12" fill="#f87171"/>
  <line x1="220" y1="412" x2="480" y2="412" stroke="#f87171" stroke-width="4"/>
  <polygon points="462,404 480,412 462,420" fill="#f87171"/>
  <rect x="480" y="390" width="60" height="44" transform="rotate(45 510 412)" fill="#e5e7eb" stroke="#4b5563" stroke-width="4"/>
  <line x1="510" y1="412" x2="510" y2="170" stroke="#60a5fa" stroke-width="4"/>
  <polygon points="502,188 510,170 518,188" fill="#60a5fa"/>
  <line x1="510" y1="412" x2="810" y2="412" stroke="#60a5fa" stroke-width="4"/>
  <polygon points="792,404 810,412 792,420" fill="#60a5fa"/>
  <line x1="510" y1="170" x2="510" y2="412" stroke="#60a5fa" stroke-width="4" stroke-dasharray="10 8"/>
  <line x1="810" y1="412" x2="510" y2="412" stroke="#60a5fa" stroke-width="4" stroke-dasharray="10 8"/>
  <rect x="452" y="120" width="116" height="44" rx="12" fill="#cbd5e1" stroke="#475569" stroke-width="4"/>
  <rect x="752" y="390" width="116" height="44" rx="12" fill="#cbd5e1" stroke="#475569" stroke-width="4"/>
  <rect x="920" y="360" width="110" height="106" rx="12" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <line x1="868" y1="412" x2="920" y2="412" stroke="#60a5fa" stroke-width="4"/>
  <polygon points="902,404 920,412 902,420" fill="#60a5fa"/>
  <text x="112" y="376" font-size="30" fill="#991b1b">Laser</text>
  <text x="430" y="96" font-size="30" fill="#334155">Mirror A</text>
  <text x="736" y="376" font-size="30" fill="#334155">Mirror B</text>
  <text x="456" y="510" font-size="30" fill="#334155">Beam Splitter</text>
  <text x="938" y="346" font-size="30" fill="#b45309">Screen</text>
"""
    return svg_header() + body + svg_footer()


def build_tikz(case_id: str) -> str:
    if case_id == "elderly-living-room-tv":
        body = r"""
  \fill[fill=gray!10] (0,0) rectangle (12,9);
  \fill[fill=orange!15] (0.8,1.2) rectangle (11.2,2.6);
  \draw[fill=gray!20, draw=gray!60, line width=0.08cm] (1.2,4.5) rectangle (3.1,7.3);
  \draw[fill=black!80] (1.45,4.9) rectangle (2.85,6.95);
  \node[above] at (2.15,7.3) {TV};
  \draw[fill=brown!50] (8.4,3.2) rectangle (10.2,4.1);
  \draw[fill=brown!55] (8.2,2.2) rectangle (10.4,3.4);
  \fill[fill=orange!30] (9.3,5) circle (0.55);
  \draw[line width=0.12cm, brown!70!black] (9.25,4.45) -- (8.8,3.7) -- (8.7,2.4);
  \draw[line width=0.12cm, brown!70!black] (9.45,4.45) -- (10.0,3.7) -- (9.95,2.45);
  \draw[line width=0.12cm, brown!70!black] (9.0,3.75) -- (8.5,3.2);
  \draw[line width=0.12cm, brown!70!black] (9.6,3.8) -- (10.2,3.55);
  \fill (9.13,5.02) circle (0.04);
  \fill (9.47,5.02) circle (0.04);
  \draw[line width=0.04cm] (9.16,4.7) .. controls (9.3,4.62) and (9.4,4.62) .. (9.52,4.7);
  \draw[fill=gray!40] (7.7,6.2) arc[start angle=180, end angle=0, x radius=1.1, y radius=1.1];
  \draw[fill=gray!40] (10.3,6.2) arc[start angle=180, end angle=0, x radius=1.1, y radius=1.1];
  \draw[blue!60, dashed, line width=0.05cm, ->] (2.85,5.9) -- (8.75,5.2);
"""
    elif case_id == "vr-son-watched-by-mother":
        body = r"""
  \fill[fill=gray!8] (0,0) rectangle (12,9);
  \fill[fill=orange!15] (0.8,1.2) rectangle (11.2,2.8);
  \draw[fill=orange!30] (1.4,4.8) rectangle (3.8,7.2);
  \draw[fill=white] (1.7,5.2) rectangle (3.5,6.9);
  \node[above] at (2.6,7.2) {Bed};
  \draw[fill=blue!15] (8.2,4.8) rectangle (10.1,7.1);
  \node[above] at (9.15,7.1) {Shelf};
  \fill[fill=orange!30] (6,5.1) circle (0.62);
  \draw[fill=black!85] (5.46,5.0) rectangle (6.54,5.33);
  \draw[line width=0.15cm, blue!60!black] (6,4.45) -- (5.3,3.15) -- (4.1,2.1);
  \draw[line width=0.15cm, blue!60!black] (6,4.45) -- (6.8,3.2) -- (8.0,2.1);
  \draw[line width=0.15cm, blue!60!black] (5.35,3.2) -- (4.0,2.6);
  \draw[line width=0.15cm, blue!60!black] (6.75,3.25) -- (8.25,2.7);
  \fill[fill=cyan!35] (3.85,2.05) circle (0.2);
  \fill[fill=cyan!35] (8.35,2.7) circle (0.2);
  \fill[fill=orange!25] (9.5,5.2) circle (0.5);
  \draw[line width=0.12cm, brown!70!black] (9.5,4.7) -- (9.1,3.55);
  \draw[line width=0.12cm, brown!40!black] (9.5,4.7) -- (9.95,3.55);
  \draw[red!65, dashed, line width=0.05cm, ->] (9.1,5.2) -- (6.5,5.15);
"""
    elif case_id == "hydraulic-piston":
        body = r"""
  \draw[fill=blue!5, draw=blue!50!black, line width=0.08cm, rounded corners=0.35cm] (1.2,3.2) rectangle (10.4,5.5);
  \draw[fill=blue!12, draw=blue!50!black, line width=0.06cm] (3.0,3.5) rectangle (5.4,5.2);
  \draw[fill=blue!50!black] (5.4,3.42) rectangle (5.8,5.28);
  \draw[fill=blue!18, draw=blue!50!black, line width=0.06cm, rounded corners=0.15cm] (5.8,4.02) rectangle (9.8,4.68);
  \draw[fill=red!55] (2.45,3.85) rectangle (2.7,4.85);
  \draw[fill=red!55] (6.08,3.95) rectangle (6.28,4.75);
  \draw[->, very thick, blue!65] (0.8,4.35) -- (2.85,4.35) node[midway, above] {Fluid in};
  \draw[->, very thick, red!65] (9.2,4.35) -- (10.9,4.35) node[midway, above] {Fluid out};
  \node[above] at (5.6,5.45) {Piston};
  \node[above] at (7.9,4.7) {Rod};
  \node[below] at (4.2,3.3) {Chamber A};
  \node[below] at (7.7,3.3) {Chamber B};
"""
    elif case_id == "robot-arm-7axis":
        body = r"""
  \draw[fill=black!70] (1.0,1.3) rectangle (3.1,2.1);
  \fill[fill=gray!55] (2.2,2.5) circle (0.28);
  \fill[fill=gray!55] (3.2,3.6) circle (0.24);
  \fill[fill=gray!55] (4.4,4.6) circle (0.22);
  \fill[fill=gray!55] (5.8,5.35) circle (0.2);
  \fill[fill=gray!55] (7.2,5.9) circle (0.18);
  \fill[fill=gray!55] (8.6,6.2) circle (0.17);
  \fill[fill=gray!55] (10.0,6.35) circle (0.16);
  \draw[line width=0.2cm, orange!80!black] (2.2,2.5) -- (3.2,3.6) -- (4.4,4.6) -- (5.8,5.35) -- (7.2,5.9) -- (8.6,6.2) -- (10.0,6.35);
  \draw[line width=0.15cm, orange!80!black] (10.0,6.35) -- (10.9,6.6);
  \draw[fill=blue!70] (10.85,6.45) rectangle (11.2,6.8);
  \foreach \x/\y/\label in {2.2/2.5/J1,3.2/3.6/J2,4.4/4.6/J3,5.8/5.35/J4,7.2/5.9/J5,8.6/6.2/J6,10.0/6.35/J7}{
    \node[above left] at (\x,\y) {\label};
    \draw[->, blue!70, line width=0.04cm] (\x+0.15,\y+0.15) arc[start angle=10,end angle=320,radius=0.28];
  }
"""
    elif case_id == "kalman-filter":
        body = r"""
  \node[draw, rounded corners, fill=blue!10, minimum width=1.5cm, minimum height=0.8cm] (u) at (1.4,4.5) {$u_k$};
  \node[draw, rounded corners, fill=orange!15, minimum width=2.5cm, minimum height=1cm] (pred) at (4.2,5.1) {Prediction};
  \node[draw, rounded corners, fill=green!15, minimum width=2.5cm, minimum height=1cm] (upd) at (7.6,5.1) {Update};
  \node[draw, rounded corners, fill=purple!15, minimum width=1.8cm, minimum height=1cm] (state) at (10.2,5.1) {$\hat{x}_k$};
  \node[draw, rounded corners, fill=red!12, minimum width=2.2cm, minimum height=0.9cm] (gain) at (7.5,2.2) {Residual / $K_k$};
  \draw[->, line width=0.05cm] (u) -- (pred);
  \draw[->, line width=0.05cm] (pred) -- (upd);
  \draw[->, line width=0.05cm] (upd) -- (state);
  \draw[->, line width=0.05cm] (state.south) |- (gain.east);
  \draw[->, line width=0.05cm] (gain.west) -| (pred.south);
  \draw[->, line width=0.05cm, dashed, blue!70] (1.6,2.8) -- node[above] {$z_k$} (gain.west);
"""
    elif case_id == "rag-pipeline":
        body = r"""
  \node[draw, rounded corners, fill=blue!10, minimum width=1.7cm, minimum height=0.9cm] (q) at (1.4,4.5) {Query};
  \node[draw, rounded corners, fill=orange!15, minimum width=2.4cm, minimum height=0.9cm] (ret) at (4.0,4.5) {Embed / Retrieve};
  \node[draw, rounded corners, fill=green!12, minimum width=2.3cm, minimum height=0.9cm] (vdb) at (6.9,6.0) {Vector DB};
  \node[draw, rounded corners, fill=teal!12, minimum width=2.3cm, minimum height=0.9cm] (ctx) at (6.9,3.0) {Retrieved docs};
  \node[draw, rounded corners, fill=purple!15, minimum width=1.8cm, minimum height=0.9cm] (llm) at (9.8,4.5) {LLM};
  \node[draw, rounded corners, fill=red!12, minimum width=1.4cm, minimum height=0.9cm] (ans) at (11.6,4.5) {Answer};
  \node[draw, rounded corners, fill=gray!10, minimum width=3.0cm, minimum height=0.8cm] (ing) at (4.0,7.4) {Document ingest / chunking};
  \draw[->, line width=0.05cm] (q) -- (ret);
  \draw[->, line width=0.05cm] (ret) -- (vdb);
  \draw[->, line width=0.05cm] (vdb) -- (llm);
  \draw[->, line width=0.05cm] (llm) -- (ans);
  \draw[->, line width=0.05cm, dashed] (ing) -- (vdb);
  \draw[->, line width=0.05cm, dashed] (vdb) -- (ctx);
  \draw[->, line width=0.05cm] (ctx) -- (llm);
"""
    elif case_id == "zero-trust-token-exchange":
        body = r"""
  \draw[rounded corners, dashed, gray!70, line width=0.08cm] (3.0,2.2) rectangle (11.5,7.2);
  \node[draw, rounded corners, fill=blue!10, minimum width=1.6cm, minimum height=0.9cm] (user) at (1.4,5.9) {User};
  \node[draw, rounded corners, fill=blue!10, minimum width=1.6cm, minimum height=0.9cm] (browser) at (1.4,3.3) {Browser};
  \node[draw, rounded corners, fill=orange!15, minimum width=1.9cm, minimum height=0.9cm] (idp) at (4.2,4.6) {IdP};
  \node[draw, rounded corners, fill=green!15, minimum width=2.0cm, minimum height=0.9cm] (svcA) at (7.2,5.9) {Service A};
  \node[draw, rounded corners, fill=teal!12, minimum width=2.0cm, minimum height=0.9cm] (svcB) at (7.2,3.3) {Service B};
  \node[draw, rounded corners, fill=purple!15, minimum width=2.1cm, minimum height=0.9cm] (gw) at (10.4,4.6) {API Gateway};
  \node[gray!70] at (6.9,7.4) {Zero-trust boundary};
  \draw[->, line width=0.05cm] (user) -- node[above] {ID token} (idp);
  \draw[->, line width=0.05cm] (browser) -- (idp);
  \draw[->, line width=0.05cm] (idp) -- node[above, sloped] {Access token} (svcA);
  \draw[->, line width=0.05cm] (idp) -- node[below, sloped] {Access token} (svcB);
  \draw[->, line width=0.05cm] (svcA) -- node[above, sloped] {Service token} (gw);
  \draw[->, line width=0.05cm] (svcB) -- node[below, sloped] {Service token} (gw);
"""
    elif case_id == "bloch-sphere":
        body = r"""
  \draw[fill=blue!2, line width=0.06cm] (6,4.5) circle (2.4);
  \draw[gray!40, line width=0.04cm] (6,4.5) ellipse (2.4 and 0.8);
  \draw[gray!55, line width=0.04cm] (3.6,4.5) -- (8.4,4.5);
  \draw[gray!55, line width=0.04cm] (6,2.1) -- (6,6.9);
  \draw[->, line width=0.09cm, blue!70] (6,4.5) -- (7.6,6.0) node[above] {$|\psi\rangle$};
  \draw[->, line width=0.04cm, gray!60] (6,4.5) -- (8.6,4.5) node[right] {$x$};
  \draw[->, line width=0.04cm, gray!60] (6,4.5) -- (6,7.2) node[above] {$z$};
  \draw[red!70, line width=0.05cm] (6.0,5.45) arc[start angle=90,end angle=43,radius=0.95];
  \node[red!70] at (6.85,5.7) {$\theta$};
  \draw[green!60!black, line width=0.05cm] (6.8,4.55) arc[start angle=0,end angle=40,radius=0.8];
  \node[green!60!black] at (7.35,4.95) {$\phi$};
"""
    else:
        body = r"""
  \draw[fill=red!35] (1.0,4.3) rectangle (2.2,4.8);
  \node[above] at (1.6,4.8) {Laser};
  \draw[fill=gray!10, rotate around={45:(5,4.55)}] (4.7,4.25) rectangle (5.3,4.85);
  \node[below] at (5,3.9) {Beam Splitter};
  \draw[->, line width=0.05cm, red!65] (2.2,4.55) -- (4.68,4.55);
  \draw[->, line width=0.05cm, blue!60] (5,4.55) -- (5,7.0);
  \draw[->, line width=0.05cm, blue!60] (5,4.55) -- (8.2,4.55);
  \draw[fill=gray!20] (4.4,7.0) rectangle (5.6,7.35);
  \draw[fill=gray!20] (8.2,4.0) rectangle (9.4,4.35);
  \node[above] at (5.0,7.35) {Mirror A};
  \node[above] at (8.8,4.35) {Mirror B};
  \draw[red!55, dashed, line width=0.05cm] (5,7.0) -- (5,4.55);
  \draw[red!55, dashed, line width=0.05cm] (8.2,4.55) -- (5,4.55);
  \draw[->, line width=0.05cm, blue!60] (9.4,4.55) -- (10.6,4.55);
  \draw[fill=yellow!18] (10.6,3.9) rectangle (11.6,5.2);
  \node[above] at (11.1,5.2) {Screen};
"""
    return tikz_wrap(body)


def build_matplotlib(case_id: str) -> str:
    if case_id == "elderly-living-room-tv":
        body = """
ax.add_patch(patches.Rectangle((90, 620), 1020, 160, facecolor='#e9dcc9', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((130, 160), 190, 300, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#d8ccb8', edgecolor='#8b7d6b', linewidth=3))
ax.add_patch(patches.FancyBboxPatch((158, 188), 134, 220, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#2f3540', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((820, 410), 210, 150, boxstyle='round,pad=0.02,rounding_size=24', facecolor='#b48162', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((840, 350), 170, 90, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#b48162', edgecolor='none'))
ax.add_patch(patches.Circle((890, 318), 52, facecolor='#f3d8c6', edgecolor='none'))
ax.plot([852, 890, 946], [320, 244, 320], color='#ece7e2', linewidth=10)
ax.plot([858, 892, 930], [400, 358, 400], color='#7b5747', linewidth=10)
ax.plot([934, 970, 1002], [404, 436, 430], color='#7b5747', linewidth=10)
ax.plot([875, 905], [346, 352], color='#6f4f3d', linewidth=3)
ax.plot([858, 892], [540, 670], color='#6b4d3a', linewidth=12)
ax.plot([972, 952], [540, 690], color='#6b4d3a', linewidth=12)
ax.add_patch(patches.Arc((760, 330), 150, 170, theta1=260, theta2=100, edgecolor='#d7c7b4', linewidth=10))
ax.add_patch(patches.Arc((1050, 330), 150, 170, theta1=80, theta2=280, edgecolor='#d7c7b4', linewidth=10))
ax.scatter([872, 916], [318, 318], s=25, color='#49362c')
ax.annotate('', xy=(856, 320), xytext=(292, 302), arrowprops=dict(arrowstyle='->', lw=2.5, color='#8fb3da', linestyle='--'))
ax.add_patch(patches.Circle((232, 302), 10, facecolor='#f5e66a', edgecolor='none'))
ax.text(212, 148, 'TV', fontsize=22, color='#665749')
ax.text(760, 220, 'Curtain', fontsize=22, color='#665749')
ax.text(806, 610, 'Sofa', fontsize=22, color='#665749')
"""
    elif case_id == "vr-son-watched-by-mother":
        body = """
ax.add_patch(patches.Rectangle((120, 600), 960, 180, facecolor='#e7dccc', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((150, 170), 240, 260, boxstyle='round,pad=0.02,rounding_size=24', facecolor='#d7c3a7', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((182, 208), 176, 180, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#f2eadf', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((780, 170), 190, 250, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#c1d2dd', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((820, 210), 110, 130, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#edf4fa', edgecolor='none'))
ax.add_patch(patches.Circle((600, 365), 60, facecolor='#f0c9ad', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((545, 342), 110, 44, boxstyle='round,pad=0.02,rounding_size=20', facecolor='#151a22', edgecolor='none'))
ax.plot([600, 532, 412], [420, 580, 640], color='#39506b', linewidth=18)
ax.plot([598, 682, 804], [418, 585, 638], color='#39506b', linewidth=18)
ax.plot([528, 412], [522, 640], color='#39506b', linewidth=16)
ax.plot([672, 804], [530, 638], color='#39506b', linewidth=16)
ax.add_patch(patches.Circle((396, 652), 22, facecolor='#7dd3fc', edgecolor='none'))
ax.add_patch(patches.Circle((820, 646), 22, facecolor='#7dd3fc', edgecolor='none'))
ax.add_patch(patches.Circle((910, 345), 52, facecolor='#f3d8c6', edgecolor='none'))
ax.plot([864, 910, 956], [334, 256, 334], color='#7a5a44', linewidth=9)
ax.plot([908, 860], [396, 546], color='#6b4d3a', linewidth=12)
ax.plot([908, 966], [398, 538], color='#b38a6f', linewidth=12)
ax.annotate('', xy=(644, 344), xytext=(872, 342), arrowprops=dict(arrowstyle='->', lw=2.5, color='#d64b4b', linestyle='--'))
ax.text(188, 150, 'Bed', fontsize=22, color='#665749')
ax.text(790, 150, 'Shelf', fontsize=22, color='#665749')
"""
    elif case_id == "hydraulic-piston":
        body = """
ax.add_patch(patches.FancyBboxPatch((140, 310), 820, 210, boxstyle='round,pad=0.02,rounding_size=36', facecolor='#e7edf3', edgecolor='#617587', linewidth=5))
ax.add_patch(patches.Rectangle((300, 340), 220, 150, facecolor='#cdd8e3', edgecolor='#617587', linewidth=4))
ax.add_patch(patches.Rectangle((500, 336), 40, 158, facecolor='#617587', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((540, 388), 380, 54, boxstyle='round,pad=0.02,rounding_size=14', facecolor='#b8c7d6', edgecolor='#617587', linewidth=4))
ax.add_patch(patches.FancyBboxPatch((248, 370), 28, 92, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#d97d5d', edgecolor='none'))
ax.add_patch(patches.FancyBboxPatch((564, 374), 24, 84, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#d97d5d', edgecolor='none'))
ax.annotate('', xy=(286, 402), xytext=(120, 402), arrowprops=dict(arrowstyle='->', lw=4, color='#60a5fa'))
ax.annotate('', xy=(828, 402), xytext=(980, 402), arrowprops=dict(arrowstyle='->', lw=4, color='#f87171'))
ax.text(188, 280, 'Cylinder', fontsize=22, color='#445566')
ax.text(332, 538, 'Pressure chamber A', fontsize=22, color='#445566')
ax.text(610, 538, 'Pressure chamber B', fontsize=22, color='#445566')
ax.text(486, 292, 'Piston', fontsize=20, color='#445566')
ax.text(690, 372, 'Rod', fontsize=20, color='#445566')
"""
    elif case_id == "robot-arm-7axis":
        body = """
ax.add_patch(patches.FancyBboxPatch((120, 640), 220, 70, boxstyle='round,pad=0.02,rounding_size=18', facecolor='#3f4c5a', edgecolor='none'))
joints = [(250, 620), (340, 520), (450, 430), (580, 358), (712, 310), (842, 282), (972, 268)]
xs = [p[0] for p in joints]
ys = [p[1] for p in joints]
ax.plot(xs, ys, color='#ed8936', linewidth=14, solid_capstyle='round')
ax.plot([972, 1060], [268, 240], color='#ed8936', linewidth=12, solid_capstyle='round')
ax.add_patch(patches.FancyBboxPatch((1058, 220), 44, 44, boxstyle='round,pad=0.02,rounding_size=10', facecolor='#2b6cb0', edgecolor='none'))
for idx, (x, y) in enumerate(joints, start=1):
    ax.add_patch(patches.Circle((x, y), max(16, 36 - idx*2), facecolor='#718096', edgecolor='none'))
    ax.text(x - 32, y - 48, f'J{idx}', fontsize=18, color='#1f2937')
    ax.add_patch(patches.Arc((x + 8, y + 8), 52, 52, theta1=10, theta2=320, edgecolor='#2b6cb0', linewidth=2.2))
"""
    elif case_id == "kalman-filter":
        body = """
def box(x, y, w, h, fc, ec, label):
    ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.02,rounding_size=18', facecolor=fc, edgecolor=ec, linewidth=3))
    ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=20, color='#1f2937')

box(120, 360, 120, 70, '#dbeafe', '#1d4ed8', 'u_k')
box(320, 300, 210, 90, '#fef3c7', '#b45309', 'Prediction')
box(640, 300, 210, 90, '#d1fae5', '#047857', 'Update')
box(920, 300, 150, 90, '#e9d5ff', '#7e22ce', 'x̂_k')
box(650, 520, 180, 78, '#fee2e2', '#b91c1c', 'Residual / K_k')
ax.annotate('', xy=(320, 345), xytext=(240, 395), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(640, 345), xytext=(530, 345), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(920, 345), xytext=(850, 345), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.plot([994, 994, 830], [390, 530, 560], color='#374151', linewidth=2.5)
ax.annotate('', xy=(830, 560), xytext=(994, 530), arrowprops=dict(arrowstyle='->', lw=0, color='#374151'))
ax.plot([650, 430, 430], [560, 560, 390], color='#374151', linewidth=2.5)
ax.annotate('', xy=(430, 390), xytext=(430, 560), arrowprops=dict(arrowstyle='->', lw=0, color='#374151'))
ax.annotate('', xy=(650, 520), xytext=(160, 520), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa', linestyle='--'))
ax.text(210, 505, 'Measurement z_k', fontsize=18, color='#1f2937')
"""
    elif case_id == "rag-pipeline":
        body = """
def box(x, y, w, h, fc, ec, label):
    ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.02,rounding_size=18', facecolor=fc, edgecolor=ec, linewidth=3))
    ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=20, color='#1f2937')

box(80, 336, 160, 82, '#dbeafe', '#2563eb', 'Query')
box(300, 336, 190, 82, '#fef3c7', '#b45309', 'Embed / Retrieve')
box(560, 220, 210, 82, '#d1fae5', '#047857', 'Vector DB')
box(560, 452, 210, 82, '#ccfbf1', '#0f766e', 'Retrieved docs')
box(840, 336, 160, 82, '#e9d5ff', '#7e22ce', 'LLM')
box(1040, 336, 120, 82, '#fee2e2', '#b91c1c', 'Answer')
box(310, 120, 240, 70, '#f3f4f6', '#6b7280', 'Document ingest / chunking')
ax.annotate('', xy=(300, 377), xytext=(240, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(560, 262), xytext=(490, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(840, 377), xytext=(770, 262), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(1040, 377), xytext=(1000, 377), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(640, 220), xytext=(430, 190), arrowprops=dict(arrowstyle='->', lw=2.0, color='#6b7280', linestyle='--'))
ax.annotate('', xy=(640, 452), xytext=(640, 302), arrowprops=dict(arrowstyle='->', lw=2.0, color='#6b7280', linestyle='--'))
ax.annotate('', xy=(900, 418), xytext=(770, 492), arrowprops=dict(arrowstyle='->', lw=2.5, color='#047857'))
"""
    elif case_id == "zero-trust-token-exchange":
        body = """
def box(x, y, w, h, fc, ec, label):
    ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.02,rounding_size=18', facecolor=fc, edgecolor=ec, linewidth=3))
    ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=20, color='#1f2937')

ax.add_patch(patches.FancyBboxPatch((280, 180), 800, 400, boxstyle='round,pad=0.02,rounding_size=26', facecolor='none', edgecolor='#94a3b8', linewidth=4, linestyle='--'))
box(80, 240, 150, 90, '#dbeafe', '#2563eb', 'User')
box(80, 430, 150, 90, '#dbeafe', '#2563eb', 'Browser')
box(320, 320, 180, 90, '#fef3c7', '#b45309', 'IdP')
box(590, 240, 180, 90, '#d1fae5', '#047857', 'Service A')
box(590, 430, 180, 90, '#ccfbf1', '#0f766e', 'Service B')
box(870, 320, 170, 90, '#e9d5ff', '#7e22ce', 'API Gateway')
ax.annotate('', xy=(320, 355), xytext=(230, 285), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(320, 375), xytext=(230, 475), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(590, 285), xytext=(500, 355), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(590, 475), xytext=(500, 375), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(870, 355), xytext=(770, 285), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.annotate('', xy=(870, 375), xytext=(770, 475), arrowprops=dict(arrowstyle='->', lw=2.5, color='#374151'))
ax.text(450, 220, 'Zero-trust boundary', fontsize=20, color='#64748b')
ax.text(278, 280, 'ID token', fontsize=16, color='#b45309')
ax.text(494, 260, 'Access token', fontsize=16, color='#047857')
ax.text(792, 286, 'Service token', fontsize=16, color='#7e22ce')
"""
    elif case_id == "bloch-sphere":
        body = """
ax.add_patch(patches.Circle((600, 420), 250, facecolor='#f8fbff', edgecolor='#6b7280', linewidth=3))
ax.add_patch(patches.Ellipse((600, 420), 500, 180, facecolor='none', edgecolor='#cbd5e1', linewidth=2))
ax.plot([350, 850], [420, 420], color='#94a3b8', linewidth=2)
ax.plot([600, 600], [170, 670], color='#94a3b8', linewidth=2)
ax.annotate('', xy=(760, 280), xytext=(600, 420), arrowprops=dict(arrowstyle='->', lw=4, color='#2563eb'))
ax.add_patch(patches.Arc((600, 420), 220, 220, theta1=43, theta2=90, edgecolor='#ef4444', linewidth=3))
ax.add_patch(patches.Arc((670, 418), 140, 140, theta1=0, theta2=40, edgecolor='#10b981', linewidth=3))
ax.text(606, 198, 'z', fontsize=22, color='#1f2937')
ax.text(822, 408, 'x', fontsize=22, color='#1f2937')
ax.text(724, 250, '|ψ⟩', fontsize=22, color='#1f2937')
ax.text(646, 344, 'θ', fontsize=20, color='#ef4444')
ax.text(720, 388, 'φ', fontsize=20, color='#10b981')
"""
    else:
        body = """
ax.add_patch(patches.FancyBboxPatch((100, 390), 120, 44, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#f87171', edgecolor='none'))
ax.text(112, 376, 'Laser', fontsize=22, color='#991b1b')
ax.annotate('', xy=(480, 412), xytext=(220, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#f87171'))
ax.add_patch(patches.Rectangle((480, 390), 60, 44, angle=45, facecolor='#e5e7eb', edgecolor='#4b5563', linewidth=3))
ax.text(456, 510, 'Beam Splitter', fontsize=20, color='#334155')
ax.annotate('', xy=(510, 170), xytext=(510, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.annotate('', xy=(810, 412), xytext=(510, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.add_patch(patches.Rectangle((452, 120), 116, 44, facecolor='#cbd5e1', edgecolor='#475569', linewidth=3))
ax.add_patch(patches.Rectangle((752, 390), 116, 44, facecolor='#cbd5e1', edgecolor='#475569', linewidth=3))
ax.text(430, 96, 'Mirror A', fontsize=22, color='#334155')
ax.text(736, 376, 'Mirror B', fontsize=22, color='#334155')
ax.plot([510, 510], [170, 412], color='#60a5fa', linewidth=2.5, linestyle='--')
ax.plot([810, 510], [412, 412], color='#60a5fa', linewidth=2.5, linestyle='--')
ax.annotate('', xy=(920, 412), xytext=(868, 412), arrowprops=dict(arrowstyle='->', lw=2.5, color='#60a5fa'))
ax.add_patch(patches.FancyBboxPatch((920, 360), 110, 106, boxstyle='round,pad=0.02,rounding_size=12', facecolor='#fef3c7', edgecolor='#b45309', linewidth=3))
ax.text(938, 346, 'Screen', fontsize=22, color='#b45309')
"""
    return mpl_script(case_id, body)


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    for case in CASES:
        cid = case["id"]
        for fmt in ("svg", "matplotlib", "tikz"):
            prompt_path = PROMPTS / f"{cid}-{fmt}.txt"
            write_file(prompt_path, prompt_text(case, fmt))
        if cid == "bear-plush":
            continue
        write_file(GPT_DIR / f"{cid}.svg", build_svg(cid))
        write_file(GPT_DIR / f"{cid}.py", build_matplotlib(cid))
        write_file(GPT_DIR / f"{cid}.tex", build_tikz(cid))


if __name__ == "__main__":
    main()
