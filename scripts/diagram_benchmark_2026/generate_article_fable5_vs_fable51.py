from __future__ import annotations

from pathlib import Path

from generate_article_grok45_opus5_gemini_3way import CASES, FOCUS, USER_MANDATORY_IDS


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
POST = REPO / "_posts" / "2026-09-03-fable5-vs-fable51-diagram-benchmark.md"
IMAGE_ROOT = REPO / "images" / "posts" / "gemini35flash-vs-gpt54-diagram-benchmark"
PUBLIC_ROOT = REPO / "benchmark_sources" / "gemini35flash-vs-gpt54-diagram-benchmark"
PUBLIC_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
IMAGE_BASE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark"
OG_IMAGE = f"{IMAGE_BASE}/bear-plush-ogp-fable5-vs-fable51.png"

MODELS = (
    ("fable5", "Claude Fable 5"),
    ("fable51", "Claude Fable 5.1"),
    ("opus5", "Claude Opus 5"),
)
FORMATS = (("tikz", "TikZ", "tex"), ("matplotlib", "matplotlib", "py"), ("svg", "SVG", "svg"))


def require_artifacts() -> None:
    missing: list[str] = []
    for model, _label in MODELS:
        for case in CASES:
            case_id = str(case["id"])
            for fmt, _fmt_label, ext in FORMATS:
                for path in (
                    ROOT / model / f"{case_id}.{ext}",
                    PUBLIC_ROOT / model / f"{case_id}.{ext}",
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
        f'<td><img src="{IMAGE_BASE}/{model}-{case_id}-{fmt}.webp" '
        f'alt="{label}が{fmt_label}で描いた{case_title}" loading="lazy"></td>'
        for model, label in MODELS
    )
    return (
        '<div class="diagram-scroll">\n'
        '<table class="diagram-compare-table">\n'
        f"<thead><tr>{headers}</tr></thead>\n"
        f'<tbody><tr class="source-row">{sources}</tr><tr>{images}</tr></tbody>\n'
        "</table>\n"
        "</div>"
    )


def case_section(index: int, case: dict[str, object]) -> str:
    case_id = str(case["id"])
    title = str(case["title"])
    bullets = "\n".join(f"- {bullet}" for bullet in case["bullets"])
    sections = [f"## {index:02d}. {title}", "", "### お題", "", bullets, ""]
    for fmt, fmt_label, ext in FORMATS:
        sections.extend([f"### {fmt_label}", "", comparison_table(case_id, title, fmt, fmt_label, ext), ""])
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
title: "Claude Fable 5 vs Fable 5.1 vs Opus 5 図解生成ベンチマーク"
date: 2026-09-03
description: "Claude Fable 5、Fable 5.1、Opus 5を、同じ12題材とTikZ、matplotlib、SVGの108画像で横並び比較します。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: gpt-5.6-sol
---

## はじめに

Claude Fable 5が出たとき、同じ12題材をTikZ、matplotlib、SVGで描かせる図解ベンチマークを実施しました。
今回は、その36件を一つも作り直さず、Fable 5.1が同じ共通プロンプトから新しく生成した36件を隣に置きます。
さらに、同じベンチマークにあるClaude Opus 5の既存36件を一番右へ加えました。

バージョン番号は0.1しか増えていません。
では、出力も小さな差に収まるのでしょうか。

この記事は、Fable 5.1によるソース生成と機械検証、gpt-5.6-solによる記事化までをAIで進めるFull AI方式で作成しています。
見た目の優劣は自動判定せず、108枚のレンダリング結果と実際のソースを掲載します。

<style>
.site-main > .inner:has(.fable-compare-wide) {{
  max-width: 1400px;
  padding-inline: 12px;
}}
.content-layout:has(.fable-compare-wide) {{
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
  max-width: 100%;
  margin: 0;
  table-layout: fixed;
  border-collapse: collapse;
}}
.post-body:has(.fable-compare-wide) table {{
  display: table;
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  overflow: visible;
}}
.post-body:has(.fable-compare-wide) td,
.post-body:has(.fable-compare-wide) th {{
  overflow-wrap: anywhere;
  white-space: normal;
}}
.diagram-compare-table th,
.diagram-compare-table td {{
  padding: clamp(4px, 0.7vw, 10px);
  vertical-align: top;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}}
.diagram-compare-table th {{
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f4f7fb;
  color: #15294b;
}}
.diagram-compare-table img {{
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}}
.diagram-compare-table code,
.source-row a {{
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
  white-space: normal;
}}
.source-row td {{
  background: #fbfcfe;
}}
.fable-hero {{
  margin: 1.5rem 0 2rem;
}}
.fable-hero img {{
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: auto;
}}
.post-body:has(.fable-compare-wide) a {{
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}}
.post-body:has(.fable-compare-wide) a:hover {{
  text-decoration-thickness: 2px;
}}
@media screen and (max-width: 860px) {{
  .site-main > .inner:has(.fable-compare-wide) {{
    padding-inline: 4px;
  }}
  .content-layout:has(.fable-compare-wide) {{
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }}
  .diagram-compare-table th {{
    font-size: clamp(0.68rem, 3vw, 0.86rem);
    line-height: 1.2;
  }}
}}
</style>

<div class="fable-compare-wide"></div>

<figure class="fable-hero">
  <img src="{OG_IMAGE}" alt="Claude Fable 5、Claude Fable 5.1、Claude Opus 5がTikZで描いたクマのぬいぐるみの比較">
</figure>

## 比較条件

- **比較列**：Claude Fable 5、Claude Fable 5.1、Claude Opus 5
- **題材**：12題材
- **形式**：TikZ、matplotlib、SVG
- **掲載画像**：12題材 × 3形式 × 3列 = **108枚**
- **Fable 5**：2026年6月10日の生成物36件を再利用
- **Fable 5.1**：共通プロンプトだけを入力し、既存Fable 5の成果物を参照せずに36件を新規生成
- **Opus 5**：2026年7月31日の生成物36件を再利用
- **確認日**：2026年9月3日 JST

Fable 5.1の生成には、個人環境で起動したClaude Codeを使用しました。
外部の共有APIキーや他モデルは使っていません。

## 機械検証の結果

| モデル | ソース | WebP | 検証結果 |
|---|---:|---:|---|
| Claude Fable 5 | 36 | 36 | 既存ベンチマークでレンダリング済み |
| Claude Fable 5.1 | 36 | 36 | Python構文、XML、XeLaTeX、WebP生成が36/36 PASS |
| Claude Opus 5 | 36 | 36 | 既存ベンチマークでレンダリング済み |

ここでのPASSは、SVGをXMLとして読めること、matplotlibのPythonコードをコンパイルできること、TikZをXeLaTeXでコンパイルできること、各出力をWebPへ変換できることを表します。
図の内容、読みやすさ、表現の好みは各画像を見て判断してください。

## ソース量の比較

| 形式 | Claude Fable 5 | Claude Fable 5.1 | Claude Opus 5 |
|---|---:|---:|---:|
| TikZ | 43,048 bytes、1,022行 | 74,965 bytes、1,340行 | 105,703 bytes、2,329行 |
| matplotlib | 61,115 bytes、1,497行 | 86,528 bytes、1,645行 | 145,126 bytes、4,105行 |
| SVG | 63,724 bytes、1,096行 | 100,561 bytes、1,387行 | 180,089 bytes、3,150行 |
| 合計 | 167,887 bytes、3,615行 | 262,054 bytes、4,372行 | 430,918 bytes、9,584行 |

Fable 5.1は3形式の合計で94,167 bytes、757行増えています。
コード量の増加は品質の高さを意味しませんが、比較画像に現れる部品、ラベル、装飾を追うときの補助情報になります。

ラベルの言語も変わりました。
Fable 5の36ソースには日本語文字がなく、Fable 5.1はmatplotlibとSVGで日本語ラベルを使っています。

## 題材一覧

| 題材 | 出題元 | 比較する点 |
|---|---|---|
{chr(10).join(case_rows)}

{output_sections}

## 再現方法

共通プロンプトは[`scripts/diagram_benchmark_2026/prompts/`](https://github.com/kazuph/kazuph.github.io/tree/master/scripts/diagram_benchmark_2026/prompts)にあります。
生成後のソースは、同じレンダリングスクリプトでWebPへ変換しました。

```bash
scripts/diagram_benchmark_2026/render_all.sh fable5
scripts/diagram_benchmark_2026/render_all.sh fable51
scripts/diagram_benchmark_2026/render_all.sh opus5
python3 scripts/diagram_benchmark_2026/publish_sources.py
```

- TikZ：`xelatex → pdftoppm → cwebp`
- matplotlib：`python → PNG → cwebp`
- SVG：`rsvg-convert → PNG → cwebp`

## おわりに

Fable 5、Fable 5.1、Opus 5を、同じ12題材、3形式、108枚で並べました。
0.1という番号の差が各形式でどのような出力差になるかは、ソースと画像を行き来しながら確認できます。

3D生成の比較結果は、インタラクティブに操作できる別記事として扱います。

Enjoy, comparing Fable generations!

## 参考

- [Claude Fable 5 vs Gemini 3.5 Flash vs GPT-5.5 図解生成ベンチマーク](/blog/2026/06/10/fable5-vs-gemini35flash-vs-gpt55-diagram-benchmark/)（確認日：2026年9月3日）
- [Gemini 3.5 Flashから3.8 Flash vs Claude Opus 5 図解生成ベンチマーク](/blog/2026/09/03/gemini35-to-38-vs-opus5-diagram-benchmark/)（確認日：2026年9月3日）
'''
    POST.write_text(article, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
