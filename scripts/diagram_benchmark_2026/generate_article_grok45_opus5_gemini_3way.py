from __future__ import annotations

from pathlib import Path
from generate_benchmark_sources import CASES as BASE_CASES


ROOT = Path(__file__).resolve().parent
POST = ROOT.parent.parent / "_posts" / "2026-07-31-grok45-vs-opus5-diagram-benchmark.md"

NEW_CASES = [
    {
        "id": "summer-fireworks-festival",
        "title": "夏祭りの花火大会",
        "bullets": [
            "夜空に大きな打ち上げ花火が開いている夏祭りの情景を描く",
            "花火は放射状の光の筋で2〜3発、色を変えて描く",
            "画面下部に提灯の付いた屋台と人々のシルエットを置く",
            "夜空は深い紺色のグラデーション風にして星を散らす",
            "光の反射や提灯の灯りなど、夜らしい演出を入れる",
        ],
    },
    {
        "id": "transformer-architecture",
        "title": "Transformerのアーキテクチャ図",
        "bullets": [
            "Transformer の encoder-decoder アーキテクチャ図を描く",
            "Input Embedding, Positional Encoding, Multi-Head Attention, Feed Forward, Add & Norm, Linear, Softmax を入れる",
            "Encoder スタックと Decoder スタックを左右に分けて配置する",
            "残差接続が Add & Norm に入る流れを矢印で分かるように描く",
            "Decoder 側の Masked Multi-Head Attention と、Encoder から渡る Cross-Attention を区別する",
            "論文スタイルの読みやすいブロック図として整理する",
        ],
    },
]

CASES = list(BASE_CASES) + NEW_CASES

FORMAT_LABELS = {
    "tikz": "TikZ",
    "matplotlib": "matplotlib",
    "svg": "SVG",
}

MODEL_LABELS = {
    "grok45": "Cursor Grok 4.5",
    "opus5": "Claude Opus 5",
    "gemini35flash": "Gemini 3.5 Flash",
}

MODEL_ORDER = ["grok45", "opus5", "gemini35flash"]

OG_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-grok45-opus5-gemini-3way.png"
PUBLIC_SOURCE_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
PREV_URL = "/blog/2026/07/01/sonnet5-vs-opus48-vs-gemini35flash-diagram-benchmark/"
ORIGINAL_URL = "/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/"

USER_PROMPT = """このブログで伝統の図解ベンチがあります。君とopus 5で一騎打ちして欲しいです。2つの比較でオケー。プレビューはtailscaleのURLをSlackに送ってください。承認するまでプッシュしないでね。

(追記) 直しというか、手抜きじゃん。過去記事と同じお題xツールででお願いします。また、再度生成しなくていいので、Gemini 3.5 Flashの結果を3列目に追加して。Opus 5といい勝負になりそうです。"""

USER_MANDATORY_IDS = {
    "bear-plush",
    "elderly-living-room-tv",
    "vr-son-watched-by-mother",
    "hydraulic-piston",
    "robot-arm-7axis",
}

FOCUS = {
    "bear-plush": "かわいさ、左右対称、部品バランス、質感差",
    "elderly-living-room-tv": "生活空間、人物と家具の関係、構図の自然さ",
    "vr-son-watched-by-mother": "2人物の視線、状況説明力、部屋の整理",
    "hydraulic-piston": "断面、部品ラベル、圧力の流れ",
    "robot-arm-7axis": "多関節、軸番号、回転方向、空間把握",
    "kalman-filter": "フィードバック、数式ラベル、信号線",
    "rag-pipeline": "取得と生成の分離、データフロー整理",
    "zero-trust-token-exchange": "境界越え、認証経路、複雑フロー",
    "bloch-sphere": "空間認識、数式、幾何配置",
    "michelson-interferometer": "光路、対称性、部品配置",
    "summer-fireworks-festival": "夜の配色、放射状の光、群衆と屋台の構図",
    "transformer-architecture": "ラベル密度、残差接続、Cross-Attentionの正確さ",
}


def public_source_path(model: str, case_id: str, fmt: str) -> str:
    ext = {"tikz": "tex", "matplotlib": "py", "svg": "svg"}[fmt]
    return f"{PUBLIC_SOURCE_BASE}/{model}/{case_id}.{ext}"


def source_link(model: str, case_id: str, fmt: str) -> str:
    filename = f"{case_id}.{'tex' if fmt == 'tikz' else 'py' if fmt == 'matplotlib' else 'svg'}"
    return f'<a href="{public_source_path(model, case_id, fmt)}"><code>{filename}</code></a>'


def image_path(model: str, case_id: str, fmt: str) -> str:
    return f"/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/{model}-{case_id}-{fmt}.webp"


def comparison_table(case_id: str, case_title: str, fmt: str) -> str:
    headers = "".join(f"      <th>{MODEL_LABELS[m]}</th>\n" for m in MODEL_ORDER)
    links = "".join(f"      <td>{source_link(m, case_id, fmt)}</td>\n" for m in MODEL_ORDER)
    images = "".join(
        f'      <td><img src="{image_path(m, case_id, fmt)}" '
        f'alt="{MODEL_LABELS[m]}が{FORMAT_LABELS[fmt]}で描いた{case_title}" loading="lazy"></td>\n'
        for m in MODEL_ORDER
    )
    return (
        '<table class="diagram-compare-table">\n'
        "  <thead>\n    <tr>\n" + headers + "    </tr>\n  </thead>\n"
        "  <tbody>\n"
        "    <tr>\n" + links + "    </tr>\n"
        "    <tr>\n" + images + "    </tr>\n"
        "  </tbody>\n"
        "</table>"
    )


def make_case_section(index: int, case: dict[str, object]) -> str:
    cid = str(case["id"])
    bullets = "\n".join(f"- {b}" for b in case["bullets"])
    parts = [
        f"## {index:02d}. {case['title']}",
        "",
        "### お題",
        "",
        bullets,
        "",
    ]
    for fmt in ("tikz", "matplotlib", "svg"):
        parts.extend(
            [
                f"### {FORMAT_LABELS[fmt]}",
                "",
                comparison_table(cid, str(case["title"]), fmt),
                "",
            ]
        )
    return "\n".join(parts)


def main() -> None:
    case_rows = []
    for case in CASES:
        source = "ユーザー指定" if case["id"] in USER_MANDATORY_IDS else "AI設計"
        case_rows.append(f"| {case['title']} | {source} | {FOCUS[case['id']]} |")

    sections = "\n".join(make_case_section(i, case) for i, case in enumerate(CASES, start=1))

    body = f"""---
layout: post
title: "Cursor Grok 4.5 vs Claude Opus 5 vs Gemini 3.5 Flash 図解生成ベンチマーク"
date: 2026-07-31
description: "図解生成ベンチマークの2026-07-31更新版。Cursor Grok 4.5 と Claude Opus 5 を新規作図し、3列目に既存の Gemini 3.5 Flash を並べた12題材×3形式の横並び比較。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: cursor-grok-4.5
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="{ORIGINAL_URL}">2026-05-22 の図解生成ベンチマーク</a>から続く定点観測シリーズです。マスターから Cursor Grok 4.5 と Claude Opus 5 の一騎打ち、さらに既存の Gemini 3.5 Flash を3列目に足す指示を受け、左から <strong>Cursor Grok 4.5 / Claude Opus 5 / Gemini 3.5 Flash</strong> の3列にしました。新規作図は Grok 4.5 と Opus 5 の 12題材 × 3形式 = 72個で、Gemini 3.5 Flash 列は過去記事の資産をそのまま流用しています。</p>
</div>

## 依頼内容

この記事は、以下の指示をマスターから受けて作成しました。

> {USER_PROMPT}

この指示に沿って、シリーズ従来どおりの **12題材 × 3形式** で比較しています。

- **Cursor Grok 4.5**: この作業セッション自身および同モデルの subagent が、お題プロンプトから source を書き起こした
- **Claude Opus 5**: 1図につき1 subagent(model 固定)をスポーンし、Read/Write のみ・他モデル出力参照禁止・外部CLI禁止の強制プロンプトで生成させた
- **Gemini 3.5 Flash**: 過去記事で生成済みの資産を再生成せず流用

## はじめに

このシリーズは、新しいモデルが出るたびに「同じお題・同じプロンプト・同じビルド手順」で図解を描かせて横並び比較する定点観測ベンチマークです。今回の3モデルは左から **Cursor Grok 4.5 / Claude Opus 5 / Gemini 3.5 Flash** の順です。

この記事は題材選定、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。

<style>
.diagram-hero img,
.diagram-compare-table img {{
  width: 100%;
  height: auto;
  display: block;
}}

.diagram-hero {{
  margin: 2rem 0;
}}

.diagram-hero figcaption {{
  margin-top: 0.75rem;
  color: #666;
  font-size: 0.95rem;
}}

.diagram-compare-table {{
  width: 100%;
  table-layout: fixed;
}}

.diagram-compare-table th,
.diagram-compare-table td {{
  width: 33.33%;
  vertical-align: top;
  text-align: center;
}}

.diagram-compare-table code {{
  font-size: 0.8rem;
  word-break: break-all;
}}
</style>

<figure class="diagram-hero">
  <img src="{OG_IMAGE}" alt="クマのぬいぐるみの TikZ 結果を、Cursor Grok 4.5・Claude Opus 5・Gemini 3.5 Flash の3モデルで横並び比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、シリーズの顔であるクマのぬいぐるみ題材の TikZ 比較を Cursor Grok 4.5 / Claude Opus 5 / Gemini 3.5 Flash の3列で並べた画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Cursor Grok 4.5 / Claude Opus 5 / Gemini 3.5 Flash
- **形式**: TikZ / matplotlib / SVG
- **題材**: 12題材
- **総数**: 12題材 × 3形式 × 3モデル = **108個**
- **今回の新規生成分**: Cursor Grok 4.5 36個 + Claude Opus 5 36個 = **72個**
- **流用分**: Gemini 3.5 Flash 36個
- **確認日**: 2026-07-31 JST(Gemini 3.5 Flash 分は過去記事生成分)

題材のうち 5 つはユーザー指定です。残りは比較差が出やすいように AI で設計したシリーズ定番です。過去の題材は削除していません。

## 題材一覧

| 題材 | 出題元 | 見たい点 |
|---|---|---|
{chr(10).join(case_rows)}

## 形式

| 形式 | 見たい点 | ビルド方法 |
|---|---|---|
| TikZ | 数式や工学図の厳密さ、構文の安定性 | `xelatex -> pdftoppm -> cwebp` |
| matplotlib | 手続き的に図を組み立てる力、部品配置の堅さ | `python -> png -> cwebp` |
| SVG | 生の座標設計とレイアウト感覚 | `rsvg-convert -> png -> cwebp` |

## ベンチマークケースについて

- ユーザー指定ケース: クマのぬいぐるみ, 独居おばあちゃんがリビングでテレビを見ている絵, 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子, 油圧ピストンの構造解説, 7軸ロボットアームとその軸の説明
- AI設計ケース: カルマンフィルターのブロック線図, RAGパイプライン構成図, ゼロトラスト認証とトークン交換, ブロッホ球, マイケルソン干渉計, 夏祭りの花火大会, Transformerのアーキテクチャ図

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。お題のプロンプトは `scripts/diagram_benchmark_2026/prompts/` にあります(3モデル共通)。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法

```bash
# Cursor Grok 4.5 列
scripts/diagram_benchmark_2026/render_all.sh grok45

# Claude Opus 5 列
scripts/diagram_benchmark_2026/render_all.sh opus5

# Gemini 3.5 Flash 列は過去記事の生成物をそのまま使用
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
```

### 生成時に起きたこと(記録)

- **Claude Opus 5 / Cursor Grok 4.5**: SVG で Unicode 記号が制御文字へ崩れるケースがあり、ASCII 表記へ直して再レンダリングした
- **Cursor Grok 4.5**: TikZ の `RGB={{...}}` キー未定義エラーを `\\\\definecolor` に直して通した
- Gemini 3.5 Flash 列は再生成せず、既存 webp / source を流用した

## 出力一覧

{sections}
## 所見

結論から言うと、今回の並びでは **Claude Opus 5 が明らかに圧勝** でした。

イラストでも技術図でも、部品の密度、視線や矢印の整理、余白の取り方まで一段上に仕上がっている題材が多く、横並びで見ると差はかなりはっきりします。

ただ、それだけだと「強いモデルが強い」で終わってしまうので、今回の比較が面白かった点は別のところにあります。

- **Gemini 3.5 Flash**: 最高峰ではないが、軽い側のモデルとして十分な図を出し続けるコスパの良さが、シリーズを通じて改めて見える
- **Cursor Grok 4.5**: Opus 5 には届かない場面が多い一方で、お題の要点は外さず、形式を跨いでも破綻しにくい追従力がある

圧勝とコスパと追従が同じ表に並ぶと、用途の話もしやすいです。品質最優先なら Opus 5、速度やコストを見るなら Flash、そのあいだでどこまで迫れるかを見るなら Grok、という読み方ができます。

## おわりに

Cursor Grok 4.5 と Claude Opus 5 を新規作図し、Gemini 3.5 Flash を3列目に据えた 12題材 × 3形式の定点観測でした。

勝者は Opus 5 で疑いない一方、Flash のコスパと Grok の追従が見えたので、ただの実力差の確認以上に残る比較になったと思います。

Enjoy, diagram duel!

Cursor Grok 4.5

## 参考

- 前回記事(Sonnet 5 3列版): [Claude Sonnet 5 vs Claude Opus 4.8 vs Gemini 3.5 Flash 図解生成ベンチマーク]({PREV_URL})(確認日: 2026-07-01)
- 元記事(2モデル版): [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({ORIGINAL_URL})(確認日: 2026-05-22)
- 共通 manifest: `scripts/diagram_benchmark_2026/manifest.yml`
- お題プロンプト: `scripts/diagram_benchmark_2026/prompts/`
"""
    POST.write_text(body, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
