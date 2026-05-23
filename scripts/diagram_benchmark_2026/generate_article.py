from __future__ import annotations

from pathlib import Path
from generate_benchmark_sources import CASES


ROOT = Path(__file__).resolve().parent
POST = ROOT.parent.parent / "_posts" / "2026-05-22-gemini35flash-vs-gpt54-diagram-benchmark.md"

FORMAT_LABELS = {
    "tikz": "TikZ",
    "matplotlib": "matplotlib",
    "svg": "SVG",
}

MODEL_LABELS = {
    "gpt54": "GPT-5.4",
    "gemini35flash": "Gemini 3.5 Flash",
}

OG_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp.png"
PUBLIC_SOURCE_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"


def source_repo_path(model: str, case_id: str, fmt: str) -> str:
    ext = {"tikz": "tex", "matplotlib": "py", "svg": "svg"}[fmt]
    return f"scripts/diagram_benchmark_2026/{model}/{case_id}.{ext}"


def public_source_path(model: str, case_id: str, fmt: str) -> str:
    ext = {"tikz": "tex", "matplotlib": "py", "svg": "svg"}[fmt]
    return f"{PUBLIC_SOURCE_BASE}/{model}/{case_id}.{ext}"


def source_link(model: str, case_id: str, fmt: str) -> str:
    filename = f"{case_id}.{'tex' if fmt == 'tikz' else 'py' if fmt == 'matplotlib' else 'svg'}"
    return f'<a href="{public_source_path(model, case_id, fmt)}"><code>{filename}</code></a>'


def image_path(model: str, case_id: str, fmt: str) -> str:
    return f"/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/{model}-{case_id}-{fmt}.webp"


def comparison_table(case_id: str, case_title: str, fmt: str) -> str:
    return "\n".join(
        [
            '<table class="diagram-compare-table">',
            "  <thead>",
            "    <tr>",
            f"      <th>{MODEL_LABELS['gemini35flash']}</th>",
            f"      <th>{MODEL_LABELS['gpt54']}</th>",
            "    </tr>",
            "  </thead>",
            "  <tbody>",
            "    <tr>",
            f"      <td>{source_link('gemini35flash', case_id, fmt)}</td>",
            f"      <td>{source_link('gpt54', case_id, fmt)}</td>",
            "    </tr>",
            "    <tr>",
            f'      <td><img src="{image_path("gemini35flash", case_id, fmt)}" alt="Gemini 3.5 Flashが{FORMAT_LABELS[fmt]}で描いた{case_title}" loading="lazy"></td>',
            f'      <td><img src="{image_path("gpt54", case_id, fmt)}" alt="GPT-5.4が{FORMAT_LABELS[fmt]}で描いた{case_title}" loading="lazy"></td>',
            "    </tr>",
            "  </tbody>",
            "</table>",
        ]
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
title: "Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク"
date: 2026-05-22
description: "Gemini 3.5 FlashとGPT-5.4で、10題材をTikZ・matplotlib・SVGの3形式で描かせる新しい比較ベンチマークです。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: gpt-5.4
---

## はじめに

以前の比較記事では、複数のLLMに対して14題材を4形式で描かせていました。今回はそれをそのまま延長せず、`Gemini 3.5 Flash` と `GPT-5.4` の2モデルに絞って、新しく回し直します。

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
  width: 50%;
  vertical-align: top;
  text-align: center;
}}

.diagram-compare-table code {{
  font-size: 0.85rem;
  word-break: break-all;
}}
</style>

<figure class="diagram-hero">
  <img src="{OG_IMAGE}" alt="クマのぬいぐるみの TikZ 結果を、GPT-5.4 と Gemini 3.5 Flash で左右比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、クマのぬいぐるみ題材の TikZ 比較を左右並びにした画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Gemini 3.5 Flash / GPT-5.4
- **形式**: TikZ / matplotlib / SVG
- **題材**: 10題材
- **総数**: 10題材 × 3形式 × 2モデル = **60個**
- **確認日**: 2026-05-22 JST

題材のうち 5 つはユーザー指定です。残り 5 つは比較差が出やすいように AI で設計しました。今回は「全部の題材を全部の形式で描かせる」前提で進めています。

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

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。Gemini 側の prompt は `scripts/diagram_benchmark_2026/prompts/` にあります。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法

Gemini 3.5 Flash 側は `agy` を使っています。サインイン済みセッションで、対話画面に `Gemini 3.5 Flash (Medium)` と表示されていることを確認しています。

```bash
~/.local/bin/agy -p "<prompt>"
```

GPT-5.4 側の source は、この作業セッションで直接生成しました。残りの source と prompt は、次のスクリプトでまとめて作っています。

```bash
python3 scripts/diagram_benchmark_2026/generate_benchmark_sources.py
python3 scripts/diagram_benchmark_2026/run_gemini_batch.py
scripts/diagram_benchmark_2026/render_all.sh gpt54
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
```

## 出力一覧

{chr(10).join(make_case_section(i + 1, case) for i, case in enumerate(CASES))}

## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 既存比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison （確認日: 2026-05-22）

## おわりに

今回は `Gemini 3.5 Flash` と `GPT-5.4` で、10題材を3形式ずつ総当たりで比較できる土台を作りました。これで、同じお題でもモデル差と形式差を並べて見られます。
"""
    POST.write_text(body, encoding="utf-8")


if __name__ == "__main__":
    main()
