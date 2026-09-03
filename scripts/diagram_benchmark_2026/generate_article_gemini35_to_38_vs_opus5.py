from __future__ import annotations

from pathlib import Path

from generate_article_grok45_opus5_gemini_3way import CASES, FOCUS, USER_MANDATORY_IDS


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
POST = REPO / "_posts" / "2026-09-03-gemini35-to-38-vs-opus5-diagram-benchmark.md"
IMAGE_ROOT = REPO / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
PUBLIC_ROOT = REPO / "benchmark_sources" / "gemini35flash-vs-gpt54-diagram-benchmark"
PUBLIC_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
IMAGE_BASE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark"
OG_IMAGE = f"{IMAGE_BASE}/bear-plush-ogp-gemini35-38-opus5-5way.png"

MODELS = (
    ("gemini35flash", "Gemini 3.5 Flash"),
    ("gemini36flash", "Gemini 3.6 Flash"),
    ("gemini37flash", "Gemini 3.7 Flash"),
    ("gemini38flash", "Gemini 3.8 Flash"),
    ("opus5", "Claude Opus 5"),
)
FORMATS = (("tikz", "TikZ", "tex"), ("matplotlib", "matplotlib", "py"), ("svg", "SVG", "svg"))


def require_artifacts() -> None:
    missing: list[str] = []
    for model, _label in MODELS:
        source_dir = ROOT / model
        public_dir = PUBLIC_ROOT / model
        for case in CASES:
            case_id = str(case["id"])
            for fmt, _fmt_label, ext in FORMATS:
                for path in (
                    source_dir / f"{case_id}.{ext}",
                    public_dir / f"{case_id}.{ext}",
                    IMAGE_ROOT / f"{model}-{case_id}-{fmt}.webp",
                ):
                    if not path.is_file():
                        missing.append(str(path.relative_to(REPO)))
    if missing:
        raise SystemExit("missing benchmark artifacts:\n" + "\n".join(missing))


def comparison_table(case_id: str, case_title: str, fmt: str, fmt_label: str, ext: str) -> str:
    headers = "".join(f"<th>{label}</th>" for _model, label in MODELS)
    sources = "".join(
        f'<td><a href="{PUBLIC_BASE}/{model}/{case_id}.{ext}"><code>{case_id}.{ext}</code></a></td>'
        for model, _label in MODELS
    )
    images = "".join(
        f'<td><span class="diagram-image-cell"><img src="{IMAGE_BASE}/{model}-{case_id}-{fmt}.webp" '
        f'alt="{label}が{fmt_label}で描いた{case_title}" loading="lazy"></span></td>'
        for model, label in MODELS
    )
    return (
        '<div class="diagram-scroll">\n'
        '<table class="diagram-compare-table">\n'
        f"<thead><tr>{headers}</tr></thead>\n"
        f"<tbody><tr class=\"source-row\">{sources}</tr><tr>{images}</tr></tbody>\n"
        "</table>\n"
        "</div>"
    )


def case_section(index: int, case: dict[str, object]) -> str:
    case_id = str(case["id"])
    title = str(case["title"])
    bullets = "\n".join(f"- {bullet}" for bullet in case["bullets"])
    sections = [f"## {index:02d}. {title}", "", "### お題", "", bullets, ""]
    for fmt, fmt_label, ext in FORMATS:
        sections.extend(
            [f"### {fmt_label}", "", comparison_table(case_id, title, fmt, fmt_label, ext), ""]
        )
    return "\n".join(sections)


def main() -> None:
    require_artifacts()
    case_rows = []
    for case in CASES:
        source = "ユーザー指定" if case["id"] in USER_MANDATORY_IDS else "AI設計"
        case_rows.append(f"| {case['title']} | {source} | {FOCUS[case['id']]} |")
    output_sections = "\n".join(case_section(index, case) for index, case in enumerate(CASES, start=1))

    article = f'''---
layout: post
title: "Gemini 3.5 Flash・3.6 Flash・3.7 Flash・3.8 Flash vs Claude Opus 5 図解生成ベンチマーク"
date: 2026-09-03
description: "Gemini 3.5 Flash、3.6 Flash、3.7 Flash、3.8 FlashとClaude Opus 5を、同じ12題材・TikZ・matplotlib・SVGの180画像で横並び比較します。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: gpt-5.6-sol
---

## はじめに

Gemini 3.5 Flashを基準にしてきた図解生成ベンチマークへ、Gemini 3.6 Flash、Gemini 3.7 Flash、Gemini 3.8 Flashを一気に追加しました。

比較相手には、2026年7月31日のベンチマークで生成したClaude Opus 5を置いています。
同じお題を同じ形式で描いた結果を並べると、Flashが世代ごとにどう変わったか、そしてOpus 5とどこで差が出るかを画像そのもので確認できます。

この記事は、既存プロンプトの再利用、各モデルによるソース生成、機械検証、記事化までをAIで進めるFull AI方式で作成しています。
見た目の順位は機械検証から捏造せず、180枚のレンダリング結果と公開ソースをそのまま掲載します。

<style>
.site-main > .inner:has(.diagram-benchmark-wide) {{
  max-width: 1600px;
  padding-inline: 12px;
}}
.content-layout:has(.diagram-benchmark-wide) {{
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
}}
.diagram-scroll {{
  box-sizing: border-box;
  width: 100%;
  margin: 1rem 0 2rem;
  border: 1px solid #d8dee9;
  border-radius: 8px;
}}
.post-body .diagram-compare-table {{
  box-sizing: border-box;
  display: table;
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
  overflow: visible;
  table-layout: fixed;
  border-collapse: collapse;
}}
.post-body:has(.diagram-benchmark-wide) table {{
  display: table;
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  overflow: visible;
}}
.post-body:has(.diagram-benchmark-wide) td,
.post-body:has(.diagram-benchmark-wide) th {{
  overflow-wrap: anywhere;
  white-space: normal;
}}
.diagram-compare-table th,
.diagram-compare-table td {{
  padding: clamp(2px, 0.55vw, 8px);
  vertical-align: top;
  text-align: center;
  white-space: normal;
}}
.diagram-compare-table th {{
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f4f7fb;
  color: #15294b;
}}
.diagram-compare-table img {{
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}}
.diagram-image-cell {{
  display: block;
  width: 100%;
  min-width: 0;
}}
.diagram-compare-table code {{
  display: block;
  min-width: 0;
  font-size: clamp(0.55rem, 0.8vw, 0.75rem);
  overflow-wrap: anywhere;
  word-break: break-all;
  white-space: normal;
}}
.source-row a {{
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
}}
.source-row td {{
  background: #fbfcfe;
}}
.diagram-hero {{
  margin: 1.5rem 0 2rem;
}}
.diagram-hero img {{
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: auto;
}}
.post-body:has(.diagram-benchmark-wide) a {{
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}}
.post-body:has(.diagram-benchmark-wide) a:hover {{
  text-decoration-thickness: 2px;
}}
.post-body:has(.diagram-benchmark-wide) .highlighter-rouge:has(> .highlight) {{
  margin-block: 1.5rem;
}}
.post-body:has(.diagram-benchmark-wide) .highlighter-rouge:has(> .highlight) pre {{
  margin-block: 0;
}}
@media screen and (max-width: 860px) {{
  .site-main > .inner:has(.diagram-benchmark-wide) {{
    padding-inline: 4px;
  }}
  .content-layout:has(.diagram-benchmark-wide) {{
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }}
  .diagram-compare-table th {{
    font-size: clamp(0.58rem, 2.5vw, 0.78rem);
    line-height: 1.2;
  }}
}}
</style>

<div class="diagram-benchmark-wide"></div>

<figure class="diagram-hero">
  <img src="{OG_IMAGE}" alt="Gemini 3.5 Flash、Gemini 3.6 Flash、Gemini 3.7 Flash、Gemini 3.8 Flash、Claude Opus 5がTikZで描いたクマのぬいぐるみの横並び比較">
</figure>

## 比較条件

- **比較列**：Gemini 3.5 Flash、Gemini 3.6 Flash High、Gemini 3.7 Flash High、Gemini 3.8 Flash、Claude Opus 5
- **題材**：12題材
- **形式**：TikZ、matplotlib、SVG
- **掲載画像**：12題材 × 3形式 × 5列 = **180枚**
- **今回の新規生成**：Gemini 3.6 Flash、Gemini 3.7 Flash、Gemini 3.8 Flashの各36件、合計**108件**
- **既存資産**：Gemini 3.5 Flash 36件、Claude Opus 5 36件
- **確認日**：2026-09-03 JST

Gemini 3.6 FlashとGemini 3.7 Flashは、Antigravity CLI 1.1.24（`agy`）の`--model`でHigh版を固定しました。
Gemini 3.8 Flashは対話画面にHighと表示されていることを確認しましたが、起動引数にはモデルとeffortを明示していませんでした。
APIキー課金は使っていません。

Claude Opus 5は2026年7月31日の生成物を再利用しています。
新しいモデルが過去結果を参照して描き直すことを避けるため、各Gemini担当には共通プロンプトだけを渡し、既存モデルの成果物をコピーしない条件を付けました。

## 機械検証の結果

| モデル | ソース | WebP | 検証結果 |
|---|---:|---:|---|
| Gemini 3.5 Flash | 36 | 36 | 既存ベンチマークでレンダリング済み |
| Gemini 3.6 Flash High | 36 | 36 | XML、Python構文、XeLaTeX、WebP生成が36/36 PASS |
| Gemini 3.7 Flash High | 36 | 36 | XML、Python構文、XeLaTeX、WebP生成が36/36 PASS |
| Gemini 3.8 Flash | 36 | 36 | UIのHigh表示、XML、Python構文、XeLaTeX、WebP生成が36/36 PASS |
| Claude Opus 5 | 36 | 36 | 既存ベンチマークでレンダリング済み |

ここでのPASSは、SVGをXMLとして読めること、matplotlibのPythonコードを実行できること、TikZをXeLaTeXでコンパイルできること、各出力をWebPへ変換できることを表します。
図の内容が正しいか、読みやすいか、表現として優れているかは別の判定です。

## 題材一覧

| 題材 | 出題元 | 比較する点 |
|---|---|---|
{chr(10).join(case_rows)}

最初の5題材はユーザー指定です。
残り7題材は、数式、制御、認証経路、物理装置、夜景、高密度なアーキテクチャ図まで比較範囲を広げるためにAIが設計しました。

## 出力一覧

各表は5列を同時に見渡せるよう、画面幅の中へ収めています。
モデル名の直下にあるファイル名から、実際に使ったTikZ、Python、SVGソースを開けます。

{output_sections}

## 再現方法

共通プロンプトは[`scripts/diagram_benchmark_2026/prompts/`](https://github.com/kazuph/kazuph.github.io/tree/master/scripts/diagram_benchmark_2026/prompts)にあります。
生成後のソースは、形式ごとに次の処理でWebPへ変換しました。

```bash
# 各モデルの36件をまとめてレンダリング
scripts/diagram_benchmark_2026/render_all.sh gemini36flash
scripts/diagram_benchmark_2026/render_all.sh gemini37flash
scripts/diagram_benchmark_2026/render_all.sh gemini38flash

# 記事から開ける場所へソースをコピー
python3 scripts/diagram_benchmark_2026/publish_sources.py
```

- TikZ：`xelatex → pdftoppm → cwebp`
- matplotlib：`python → PNG → cwebp`
- SVG：`rsvg-convert → PNG → cwebp`

## おわりに

Gemini 3.5 Flash、Gemini 3.6 Flash、Gemini 3.7 Flash、Gemini 3.8 Flash、Claude Opus 5を、12題材、3形式、180枚で同じ画面に並べました。

コンパイル可否だけなら5列とも36件が揃っています。
残る差は、各表に現れる構図、情報量、ラベル、余白、表現の選び方です。

Enjoy, comparing every diagram!

## 参考

- [Cursor Grok 4.5 vs Claude Opus 5 vs Gemini 3.5 Flash 図解生成ベンチマーク](/blog/2026/07/31/grok45-vs-opus5-diagram-benchmark/)（確認日：2026-09-03）
- [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク](/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/)（確認日：2026-09-03）
- [共通manifest](https://github.com/kazuph/kazuph.github.io/blob/master/scripts/diagram_benchmark_2026/manifest.yml)（確認日：2026-09-03）
'''
    POST.write_text(article, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
