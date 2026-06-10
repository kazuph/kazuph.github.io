from __future__ import annotations

from pathlib import Path
from generate_benchmark_sources import CASES as BASE_CASES


ROOT = Path(__file__).resolve().parent
POST = ROOT.parent.parent / "_posts" / "2026-06-10-fable5-vs-gemini35flash-vs-gpt55-diagram-benchmark.md"

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
    "fable5": "Claude Fable 5",
    "gemini35flash": "Gemini 3.5 Flash",
    "gpt55": "GPT-5.5",
}

# leftmost first: Fable 5 is the newly added column
MODEL_ORDER = ["fable5", "gemini35flash", "gpt55"]

OG_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-3way.png"
FIREWORKS_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fireworks-fable5-3way.png"
PUBLIC_SOURCE_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
ORIGINAL_URL = "/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/"
PREV_URL = "/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/"

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

NEW_CASE_IDS = {c["id"] for c in NEW_CASES}


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
    cid = case["id"]
    title = str(case["title"])
    if cid in NEW_CASE_IDS:
        title += "（今回追加の新題材）"
    bullets = "\n".join(f"- {b}" for b in case["bullets"])
    parts = [
        f"## {index:02d}. {title}",
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
        cid = case["id"]
        if cid in USER_MANDATORY_IDS:
            source = "ユーザー指定"
        elif cid in NEW_CASE_IDS:
            source = "AI設計（今回追加）"
        else:
            source = "AI設計"
        case_rows.append(f"| {case['title']} | {source} | {FOCUS[cid]} |")

    mandatory_titles = [str(c["title"]) for c in CASES if c["id"] in USER_MANDATORY_IDS]
    ai_titles = [str(c["title"]) for c in CASES if c["id"] not in USER_MANDATORY_IDS]

    body = f"""---
layout: post
title: "Claude Fable 5 vs Gemini 3.5 Flash vs GPT-5.5 図解生成ベンチマーク"
date: 2026-06-10
description: "図解生成ベンチマークの2026-06-10更新版。新登場の Claude Fable 5 を一番左の列に追加し、右列を GPT-5.5（codex exec で新規生成）に刷新。新題材2つを加えた12題材を、TikZ・matplotlib・SVGの3形式 × 3モデル = 108個で横並び比較します。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: claude-fable-5
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="{ORIGINAL_URL}">2026-05-22 の「Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク」</a>および<a href="{PREV_URL}">2026-05-29 の Claude Opus 4.8 追加版</a>の系譜を継ぐ更新版です。今回は新しく登場した <strong>Claude Fable 5</strong> を一番左の列として追加し、右列は GPT-5.4 に代わって <strong>GPT-5.5</strong>（<code>codex exec</code> で新規生成）に刷新しました。さらに新題材を2つ追加し、<strong>12題材 × 3形式 × 3モデル = 108個</strong>の比較になっています。過去の題材は削除せずすべて残しています。</p>
</div>

## はじめに

このシリーズは、新しいモデルが出るたびに「同じお題・同じプロンプト・同じビルド手順」で図解を描かせて横並び比較する定点観測ベンチマークです。今回の3モデルは左から **Claude Fable 5 / Gemini 3.5 Flash / GPT-5.5** の順で並べています。

- **Claude Fable 5**: この作業セッションの Claude Code（モデルID: `claude-fable-5`）自身が、プロンプトから直接 source を書き起こしました
- **Gemini 3.5 Flash**: `agy` コマンド（Gemini CLI 系のローカルエージェントCLI）の print モード（`agy -p`）で生成。既存10題材は 2026-05-22 生成分をそのまま流用し、新題材2つだけ今回 `agy` で追加生成しました
- **GPT-5.5**: `codex exec`（Codex CLI の非対話モード）で12題材すべてを今回新規生成しました

この記事は、題材設計、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。

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
  <img src="{OG_IMAGE}" alt="クマのぬいぐるみの TikZ 結果を、Claude Fable 5・Gemini 3.5 Flash・GPT-5.5 の3モデルで横並び比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、シリーズの顔であるクマのぬいぐるみ題材の TikZ 比較を Fable 5 / Gemini 3.5 Flash / GPT-5.5 の3列で並べた画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Claude Fable 5 / Gemini 3.5 Flash / GPT-5.5
- **形式**: TikZ / matplotlib / SVG
- **題材**: 12題材（従来の10題材 + 今回追加の2題材）
- **総数**: 12題材 × 3形式 × 3モデル = **108個**
- **今回の新規生成分**: Claude Fable 5 が36個、GPT-5.5 が36個、Gemini 3.5 Flash が新題材分の6個（計78個）
- **流用分**: Gemini 3.5 Flash の既存10題材 × 3形式 = 30個（2026-05-22 生成）
- **確認日**: 2026-06-10 JST

題材のうち5つはユーザー指定です。残りは比較差が出やすいようにAIで設計しました。今回追加した2題材（夏祭りの花火大会・Transformerのアーキテクチャ図）もAI設計で、「夜景の配色」と「高密度なラベル配置」という、従来の10題材ではカバーできていなかった軸を狙っています。過去の題材は1つも削除していません。

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

- ユーザー指定ケース: {", ".join(mandatory_titles)}
- AI設計ケース: {", ".join(ai_titles)}

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。お題のプロンプトは `scripts/diagram_benchmark_2026/prompts/` にあります（3モデル共通）。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法

各モデルの生成経路はそれぞれ次のとおりです。

- **Claude Fable 5**: この作業セッションの Claude Code 自身が `prompts/` の各プロンプトから一発で書き起こし（レンダリング結果を見てからの手直しはなし）
- **Gemini 3.5 Flash**: `agy -p <prompt>` の print モードで生成（`run_gemini_batch.py`）
- **GPT-5.5**: `codex exec -m gpt-5.5` の非対話モードで生成（`run_codex_batch.py`）

```bash
# Gemini 3.5 Flash（agy 経由）
python3 scripts/diagram_benchmark_2026/run_gemini_batch.py

# GPT-5.5（codex exec 経由）
python3 scripts/diagram_benchmark_2026/run_codex_batch.py

# 3モデル分の source を画像へ
scripts/diagram_benchmark_2026/render_all.sh fable5
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
scripts/diagram_benchmark_2026/render_all.sh gpt55
```

CLI 経由の2モデル（Gemini / GPT-5.5）には「構文チェック（SVGのXMLパース・Pythonコンパイル・xelatexコンパイル）に通るまで最大3回リトライ」という同条件のバリデーションを掛けています。見た目を確認しての描き直しはどのモデルにもさせていません。

### 生成時に起きたこと（記録）

定点観測なので、生成過程でつまずいた点も正直に記録しておきます。

- **GPT-5.5**: イラスト系のTikZ（おばあちゃん・VR息子・花火）で「未定義の色名を参照する」コンパイルエラーを繰り返し、リトライ複数ラウンドを要しました。特にVR息子のTikZは合計11回目の生成でようやくコンパイルが通りました
- **Gemini 3.5 Flash**: 新題材のTransformer SVG で不正なXMLを3連続で出し、再実行ラウンドで成功しました
- **Claude Fable 5**: ゼロトラストのTikZで、自作スタイル名が TikZ の既存キー `step` と衝突してコンパイルに失敗し、スタイル名の変更（描画内容には無関係）を1回行いました

トークン消費の記録も残しておきます。Fable 5 は1Mコンテクストの31%を消費した時点で、5h limit の95%に到達しました。

<figure class="diagram-hero">
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-context-usage-statusline.png" alt="Fable 5 のステータスライン。1Mコンテクストの31%消費時点で5h limitの95%に到達している" loading="lazy">
  <figcaption>この記事の作業セッションの Fable 5 のステータスライン。ctx 31%/1M の時点で 5h limit 95%（残り3h0m）。</figcaption>
</figure>

## 新題材のハイライト

<figure class="diagram-hero">
  <img src="{FIREWORKS_IMAGE}" alt="夏祭りの花火大会の TikZ 結果を、Claude Fable 5・Gemini 3.5 Flash・GPT-5.5 の3モデルで横並び比較した画像" loading="lazy">
  <figcaption>今回追加した新題材「夏祭りの花火大会」の TikZ 比較。夜景の配色・放射状の光・屋台と群衆の構図という、これまでの題材にはなかった軸で差が見えます。</figcaption>
</figure>

## 出力一覧

{chr(10).join(make_case_section(i + 1, case) for i, case in enumerate(CASES))}

## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです。Fable 5 がどちらに寄るかも、左列で並べて見られます
- 夜景の花火は、暗背景での発色・光のグラデーション表現・シルエットの説得力に各モデルの個性が出ます
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- Transformer 図は、残差接続と Cross-Attention の結線を正確に描けるかという「知識の正確さ」も同時に試されます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 元記事（2モデル版）: [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({ORIGINAL_URL})（確認日: 2026-05-22）
- 前回記事（Opus 4.8 追加版）: [Claude Opus 4.8 vs Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({PREV_URL})（確認日: 2026-05-29）
- さらに前の比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison （確認日: 2026-05-22）

## おわりに

新登場の `Claude Fable 5` を一番左の列に迎え、右列を `codex exec` 生成の `GPT-5.5` に刷新し、新題材2つを加えた12題材 × 3形式 × 3モデルの総当たり比較にしました。同じお題でも、モデル差と形式差を1画面で見比べられます。次のモデルが出たら、また同じお題で定点観測を続けます。
"""
    POST.write_text(body, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
