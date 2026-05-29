from __future__ import annotations

from pathlib import Path
from generate_benchmark_sources import CASES


ROOT = Path(__file__).resolve().parent
POST = ROOT.parent.parent / "_posts" / "2026-05-29-opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark.md"

FORMAT_LABELS = {
    "tikz": "TikZ",
    "matplotlib": "matplotlib",
    "svg": "SVG",
}

MODEL_LABELS = {
    "opus48": "Claude Opus 4.8",
    "gemini35flash": "Gemini 3.5 Flash",
    "gpt54": "GPT-5.4",
}

# leftmost first: Opus 4.8 is the newly added column
MODEL_ORDER = ["opus48", "gemini35flash", "gpt54"]

OG_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-3way.png"
PUBLIC_SOURCE_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
ORIGINAL_URL = "/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/"


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
    mandatory = [case for case in CASES if case["id"] in {
        "bear-plush",
        "elderly-living-room-tv",
        "vr-son-watched-by-mother",
        "hydraulic-piston",
        "robot-arm-7axis",
    }]
    ai_designed = [case for case in CASES if case not in mandatory]
    case_rows = []
    for case in CASES:
        source = "ユーザー指定" if case in mandatory else "AI設計"
        focus = {
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
        }[case["id"]]
        case_rows.append(f"| {case['title']} | {source} | {focus} |")

    body = f"""---
layout: post
title: "Claude Opus 4.8 vs Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク"
date: 2026-05-29
description: "2026-05-22 の図解生成ベンチマークに Claude Opus 4.8 列を追加した更新版。10題材をTikZ・matplotlib・SVGの3形式で、3モデル横並びで比較します。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: claude-opus-4-8
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="{ORIGINAL_URL}">2026-05-22 の「Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク」</a>を fork し、新しく登場した <strong>Claude Opus 4.8</strong> を一番左の列として追加して更新したものです。お題・形式・プロンプト・レンダリング手順は元記事とまったく同じで、Opus 4.8 にも同じ10題材を全形式で描かせ、既存の Gemini 3.5 Flash / GPT-5.4 と横並びで比較できるようにしました。各比較表はこれまで2列でしたが、Opus 4.8 を加えて<strong>3列</strong>になっています。</p>
</div>

## はじめに

元記事では `Gemini 3.5 Flash` と `GPT-5.4` の2モデルで、10題材を TikZ・matplotlib・SVG の3形式ずつ描かせていました。本記事はそこに `Claude Opus 4.8` を加えた更新版です。同じお題・同じプロンプト・同じビルド手順で Opus 4.8 にも描かせ、3モデルを左から **Claude Opus 4.8 / Gemini 3.5 Flash / GPT-5.4** の順で並べています。

この記事は、題材設計、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。Opus 4.8 列の source（`.tex` / `.py` / `.svg`）は、この作業セッションで Claude Opus 4.8 が元記事と同じプロンプトから一発生成したものです。

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
  <img src="{OG_IMAGE}" alt="クマのぬいぐるみの TikZ 結果を、Claude Opus 4.8・Gemini 3.5 Flash・GPT-5.4 の3モデルで横並び比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、クマのぬいぐるみ題材の TikZ 比較を Opus 4.8 / Gemini 3.5 Flash / GPT-5.4 の3列で並べた画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Claude Opus 4.8 / Gemini 3.5 Flash / GPT-5.4
- **形式**: TikZ / matplotlib / SVG
- **題材**: 10題材
- **総数**: 10題材 × 3形式 × 3モデル = **90個**
- **追加分**: Claude Opus 4.8 の 10題材 × 3形式 = **30個**（今回の更新で追加）
- **確認日**: 2026-05-29 JST（元記事の Gemini / GPT 分は 2026-05-22）

題材のうち 5 つはユーザー指定です。残り 5 つは比較差が出やすいように AI で設計しました。Opus 4.8 にも「全部の題材を全部の形式で描かせる」前提で、元記事と同じお題を渡しています。

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

- ユーザー指定ケース: {", ".join(case["title"] for case in mandatory)}
- AI設計ケース: {", ".join(case["title"] for case in ai_designed)}

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。お題のプロンプトは `scripts/diagram_benchmark_2026/prompts/` にあります（3モデル共通）。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法

Claude Opus 4.8 側の source は、この作業セッションで `prompts/` の各プロンプト（元記事と同一）から直接生成しました。Gemini 3.5 Flash 側は `agy`、GPT-5.4 側は元記事の作業セッションで生成したものをそのまま使っています。

```bash
# 3モデル分の source を画像へ
scripts/diagram_benchmark_2026/render_all.sh opus48
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
scripts/diagram_benchmark_2026/render_all.sh gpt54
```

## 出力一覧

{chr(10).join(make_case_section(i + 1, case) for i, case in enumerate(CASES))}

## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです。Opus 4.8 がどちらに寄るかも、左列で並べて見られます
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 元記事（2モデル版）: [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({ORIGINAL_URL})（確認日: 2026-05-22）
- さらに前の比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison （確認日: 2026-05-22）

## おわりに

元記事の `Gemini 3.5 Flash` / `GPT-5.4` の比較に `Claude Opus 4.8` を一番左の列として加え、10題材を3形式ずつ・3モデル総当たりで並べられるようにしました。同じお題でも、モデル差と形式差を1画面で見比べられます。
"""
    POST.write_text(body, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
