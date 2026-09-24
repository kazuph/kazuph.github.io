---
layout: post
title: "Claude Fable 5 vs Fable 5.1 vs Opus 5 図解生成ベンチマーク"
date: 2026-09-03
description: "Claude Fable 5、Fable 5.1、Opus 5を、同じ12題材とTikZ、matplotlib、SVGの108画像で横並び比較します。"
image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-vs-fable51.png
social_image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-vs-fable51.png
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
body:has(.fable-compare-wide) { --page-max-width: 1400px; --page-gutter: 12px; }
.content-layout:has(.fable-compare-wide) {
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
}
.diagram-scroll {
  box-sizing: border-box;
  width: 100%;
  margin: 1rem 0 2rem;
  border: 1px solid #d8dee9;
  border-radius: 8px;
}
.post-body .diagram-compare-table {
  box-sizing: border-box;
  display: table;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  table-layout: fixed;
  border-collapse: collapse;
}
.post-body:has(.fable-compare-wide) table {
  display: table;
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  overflow: visible;
}
.post-body:has(.fable-compare-wide) td,
.post-body:has(.fable-compare-wide) th {
  overflow-wrap: anywhere;
  white-space: normal;
}
.diagram-compare-table th,
.diagram-compare-table td {
  padding: clamp(4px, 0.7vw, 10px);
  vertical-align: top;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}
.diagram-compare-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f4f7fb;
  color: #15294b;
}
.diagram-compare-table img {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.diagram-compare-table code,
.source-row a {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
  white-space: normal;
}
.source-row td {
  background: #fbfcfe;
}
.fable-hero {
  margin: 1.5rem 0 2rem;
}
.fable-hero img {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: auto;
}
.post-body:has(.fable-compare-wide) a {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}
.post-body:has(.fable-compare-wide) a:hover {
  text-decoration-thickness: 2px;
}
@media screen and (max-width: 860px) {
  body:has(.fable-compare-wide) { --page-gutter: 4px; }
  .content-layout:has(.fable-compare-wide) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .diagram-compare-table th {
    font-size: clamp(0.68rem, 3vw, 0.86rem);
    line-height: 1.2;
  }
}
</style>

<div class="fable-compare-wide"></div>

<figure class="fable-hero">
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-vs-fable51.png" alt="Claude Fable 5、Claude Fable 5.1、Claude Opus 5がTikZで描いたクマのぬいぐるみの比較">
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
| クマのぬいぐるみ | ユーザー指定 | かわいさ、左右対称、部品バランス、質感差 |
| 独居おばあちゃんがリビングでテレビを見ている絵 | ユーザー指定 | 生活空間、人物と家具の関係、構図の自然さ |
| 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子 | ユーザー指定 | 2人物の視線、状況説明力、部屋の整理 |
| 油圧ピストンの構造解説 | ユーザー指定 | 断面、部品ラベル、圧力の流れ |
| 7軸ロボットアームとその軸の説明 | ユーザー指定 | 多関節、軸番号、回転方向、空間把握 |
| カルマンフィルターのブロック線図 | AI設計 | フィードバック、数式ラベル、信号線 |
| RAGパイプライン構成図 | AI設計 | 取得と生成の分離、データフロー整理 |
| ゼロトラスト認証とトークン交換 | AI設計 | 境界越え、認証経路、複雑フロー |
| ブロッホ球 | AI設計 | 空間認識、数式、幾何配置 |
| マイケルソン干渉計 | AI設計 | 光路、対称性、部品配置 |
| 夏祭りの花火大会 | AI設計 | 夜の配色、放射状の光、群衆と屋台の構図 |
| Transformerのアーキテクチャ図 | AI設計 | ラベル密度、残差接続、Cross-Attentionの正確さ |

## 01. クマのぬいぐるみ

### お題

- かわいいクマのぬいぐるみを正面向きで描く
- 頭は丸く、耳は左右対称で少し大きめ
- 胴体は柔らかい綿入りの感じが出るように少し横幅を持たせる
- 腕と脚は短めで、ぬいぐるみらしい丸みを付ける
- 目、鼻、口、足裏、胸のワッペンなどで質感差を出す
- 暖色寄りでやさしい配色にする

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.tex"><code>bear-plush.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-tikz.webp" alt="Claude Fable 5がTikZで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bear-plush-tikz.webp" alt="Claude Fable 5.1がTikZで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-tikz.webp" alt="Claude Opus 5がTikZで描いたクマのぬいぐるみ" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.py"><code>bear-plush.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bear-plush-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.svg"><code>bear-plush.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-svg.webp" alt="Claude Fable 5がSVGで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bear-plush-svg.webp" alt="Claude Fable 5.1がSVGで描いたクマのぬいぐるみ" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-svg.webp" alt="Claude Opus 5がSVGで描いたクマのぬいぐるみ" loading="lazy"></td></tr></tbody>
</table>
</div>

## 02. 独居おばあちゃんがリビングでテレビを見ている絵

### お題

- リビングでおばあちゃんがテレビを見ている情景を描く
- おばあちゃんは一人で、椅子かソファに座っている
- テレビ、テーブル、照明、カーテンなどで生活空間を出す
- テレビの方へ視線が向いていることが分かるようにする
- 家庭的で温かい雰囲気にする

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-tikz.webp" alt="Claude Fable 5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-elderly-living-room-tv-tikz.webp" alt="Claude Fable 5.1がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-tikz.webp" alt="Claude Opus 5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-elderly-living-room-tv-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-svg.webp" alt="Claude Fable 5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-elderly-living-room-tv-svg.webp" alt="Claude Fable 5.1がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-svg.webp" alt="Claude Opus 5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td></tr></tbody>
</table>
</div>

## 03. 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子

### お題

- 子ども部屋で息子がVRゴーグルを装着して遊んでいる場面を描く
- 息子は両手にコントローラーを持ち、楽しそうに動いている
- 部屋の入口側からお母さんがその様子を見ている
- 机、棚、ベッドなどで子ども部屋らしさを出す
- 人物同士の視線関係が分かるようにする

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-tikz.webp" alt="Claude Fable 5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-vr-son-watched-by-mother-tikz.webp" alt="Claude Fable 5.1がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-tikz.webp" alt="Claude Opus 5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-svg.webp" alt="Claude Fable 5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-vr-son-watched-by-mother-svg.webp" alt="Claude Fable 5.1がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-svg.webp" alt="Claude Opus 5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td></tr></tbody>
</table>
</div>

## 04. 油圧ピストンの構造解説

### お題

- 油圧ピストンの断面構造図を描く
- シリンダー、ピストン、ロッド、左右の圧力室を表現する
- 流体の流れを矢印で示す
- 主要部品にラベルを付ける
- 教育用の図として読みやすく整理する

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-tikz.webp" alt="Claude Fable 5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-hydraulic-piston-tikz.webp" alt="Claude Fable 5.1がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-tikz.webp" alt="Claude Opus 5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-hydraulic-piston-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-svg.webp" alt="Claude Fable 5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-hydraulic-piston-svg.webp" alt="Claude Fable 5.1がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-svg.webp" alt="Claude Opus 5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td></tr></tbody>
</table>
</div>

## 05. 7軸ロボットアームとその軸の説明

### お題

- 7軸ロボットアームの全体図を描く
- 各関節を J1 から J7 までラベル付けする
- 各軸の回転方向を小さな矢印で示す
- ベース、リンク、手先の関係が分かるようにする
- やや立体感のある構図で描く

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-tikz.webp" alt="Claude Fable 5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-robot-arm-7axis-tikz.webp" alt="Claude Fable 5.1がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-tikz.webp" alt="Claude Opus 5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-robot-arm-7axis-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-svg.webp" alt="Claude Fable 5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-robot-arm-7axis-svg.webp" alt="Claude Fable 5.1がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-svg.webp" alt="Claude Opus 5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td></tr></tbody>
</table>
</div>

## 06. カルマンフィルターのブロック線図

### お題

- カルマンフィルターのブロック線図を描く
- Prediction, Update, Measurement, State estimate を分ける
- 入力とフィードバックの向きを矢印で示す
- Kalman gain や residual など主要な情報流も入れる
- 制御図として見やすく整理する

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.tex"><code>kalman-filter.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-tikz.webp" alt="Claude Fable 5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-kalman-filter-tikz.webp" alt="Claude Fable 5.1がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-tikz.webp" alt="Claude Opus 5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.py"><code>kalman-filter.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-kalman-filter-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.svg"><code>kalman-filter.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-svg.webp" alt="Claude Fable 5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-kalman-filter-svg.webp" alt="Claude Fable 5.1がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-svg.webp" alt="Claude Opus 5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td></tr></tbody>
</table>
</div>

## 07. RAGパイプライン構成図

### お題

- RAG のパイプライン構成図を描く
- User Query, Embed/Retrieve, Vector DB, Retrieved Context, LLM, Answer を入れる
- オンライン処理と事前の文書投入を区別する
- データフローを矢印で示す
- 現代的なAIシステム図として整理する

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-tikz.webp" alt="Claude Fable 5がTikZで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-rag-pipeline-tikz.webp" alt="Claude Fable 5.1がTikZで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-tikz.webp" alt="Claude Opus 5がTikZで描いたRAGパイプライン構成図" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.py"><code>rag-pipeline.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-rag-pipeline-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-svg.webp" alt="Claude Fable 5がSVGで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-rag-pipeline-svg.webp" alt="Claude Fable 5.1がSVGで描いたRAGパイプライン構成図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-svg.webp" alt="Claude Opus 5がSVGで描いたRAGパイプライン構成図" loading="lazy"></td></tr></tbody>
</table>
</div>

## 08. ゼロトラスト認証とトークン交換

### お題

- ゼロトラスト認証とトークン交換の流れを描く
- User, Browser, IdP, API Gateway, Service A, Service B を入れる
- ID token, access token, service token の流れを区別する
- 信頼境界を領域として表現する
- 複雑でも読めるセキュリティ図にする

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-tikz.webp" alt="Claude Fable 5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-zero-trust-token-exchange-tikz.webp" alt="Claude Fable 5.1がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-tikz.webp" alt="Claude Opus 5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-zero-trust-token-exchange-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-svg.webp" alt="Claude Fable 5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-zero-trust-token-exchange-svg.webp" alt="Claude Fable 5.1がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-svg.webp" alt="Claude Opus 5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td></tr></tbody>
</table>
</div>

## 09. ブロッホ球

### お題

- ブロッホ球を2D投影で描く
- x, y, z 軸を示す
- 量子状態ベクトル |psi> を球面上に描く
- theta と phi の角度を小さな弧で示す
- 物理の教科書に出てくる図として整える

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-tikz.webp" alt="Claude Fable 5がTikZで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bloch-sphere-tikz.webp" alt="Claude Fable 5.1がTikZで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-tikz.webp" alt="Claude Opus 5がTikZで描いたブロッホ球" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.py"><code>bloch-sphere.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bloch-sphere-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたブロッホ球" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-svg.webp" alt="Claude Fable 5がSVGで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-bloch-sphere-svg.webp" alt="Claude Fable 5.1がSVGで描いたブロッホ球" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-svg.webp" alt="Claude Opus 5がSVGで描いたブロッホ球" loading="lazy"></td></tr></tbody>
</table>
</div>

## 10. マイケルソン干渉計

### お題

- マイケルソン干渉計の模式図を描く
- Laser, Beam Splitter, Mirror A, Mirror B, Screen を入れる
- 光路を直線矢印で示す
- ビームスプリッタで2方向に分岐して戻る流れを見せる
- 対称性を保って配置する

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-tikz.webp" alt="Claude Fable 5がTikZで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-michelson-interferometer-tikz.webp" alt="Claude Fable 5.1がTikZで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-tikz.webp" alt="Claude Opus 5がTikZで描いたマイケルソン干渉計" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-michelson-interferometer-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-svg.webp" alt="Claude Fable 5がSVGで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-michelson-interferometer-svg.webp" alt="Claude Fable 5.1がSVGで描いたマイケルソン干渉計" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-svg.webp" alt="Claude Opus 5がSVGで描いたマイケルソン干渉計" loading="lazy"></td></tr></tbody>
</table>
</div>

## 11. 夏祭りの花火大会

### お題

- 夜空に大きな打ち上げ花火が開いている夏祭りの情景を描く
- 花火は放射状の光の筋で2〜3発、色を変えて描く
- 画面下部に提灯の付いた屋台と人々のシルエットを置く
- 夜空は深い紺色のグラデーション風にして星を散らす
- 光の反射や提灯の灯りなど、夜らしい演出を入れる

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-tikz.webp" alt="Claude Fable 5がTikZで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-summer-fireworks-festival-tikz.webp" alt="Claude Fable 5.1がTikZで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-tikz.webp" alt="Claude Opus 5がTikZで描いた夏祭りの花火大会" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-summer-fireworks-festival-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-svg.webp" alt="Claude Fable 5がSVGで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-summer-fireworks-festival-svg.webp" alt="Claude Fable 5.1がSVGで描いた夏祭りの花火大会" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-svg.webp" alt="Claude Opus 5がSVGで描いた夏祭りの花火大会" loading="lazy"></td></tr></tbody>
</table>
</div>

## 12. Transformerのアーキテクチャ図

### お題

- Transformer の encoder-decoder アーキテクチャ図を描く
- Input Embedding, Positional Encoding, Multi-Head Attention, Feed Forward, Add & Norm, Linear, Softmax を入れる
- Encoder スタックと Decoder スタックを左右に分けて配置する
- 残差接続が Add & Norm に入る流れを矢印で分かるように描く
- Decoder 側の Masked Multi-Head Attention と、Encoder から渡る Cross-Attention を区別する
- 論文スタイルの読みやすいブロック図として整理する

### TikZ

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-tikz.webp" alt="Claude Fable 5がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-transformer-architecture-tikz.webp" alt="Claude Fable 5.1がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-tikz.webp" alt="Claude Opus 5がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.py"><code>transformer-architecture.py</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-transformer-architecture-matplotlib.webp" alt="Claude Fable 5.1がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Claude Fable 5</th><th>Claude Fable 5.1</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable51/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td></tr><tr><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-svg.webp" alt="Claude Fable 5がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable51-transformer-architecture-svg.webp" alt="Claude Fable 5.1がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td><td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-svg.webp" alt="Claude Opus 5がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td></tr></tbody>
</table>
</div>


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
