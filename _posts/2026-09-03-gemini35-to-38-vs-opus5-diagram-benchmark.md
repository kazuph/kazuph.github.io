---
layout: post
title: "Gemini 3.5 Flash・3.6 Flash・3.7 Flash・3.8 Flash vs Claude Opus 5 図解生成ベンチマーク"
date: 2026-09-03
description: "Gemini 3.5 Flash、3.6 Flash、3.7 Flash、3.8 FlashとClaude Opus 5を、同じ12題材・TikZ・matplotlib・SVGの180画像で横並び比較します。"
image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-gemini35-38-opus5-5way.png
social_image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-gemini35-38-opus5-5way.png
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
.site-main > .inner:has(.diagram-benchmark-wide) {
  max-width: 1600px;
  padding-inline: 12px;
}
.content-layout:has(.diagram-benchmark-wide) {
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
  max-width: none;
  margin: 0;
  overflow: visible;
  table-layout: fixed;
  border-collapse: collapse;
}
.post-body:has(.diagram-benchmark-wide) table {
  display: table;
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  overflow: visible;
}
.post-body:has(.diagram-benchmark-wide) td,
.post-body:has(.diagram-benchmark-wide) th {
  overflow-wrap: anywhere;
  white-space: normal;
}
.diagram-compare-table th,
.diagram-compare-table td {
  padding: clamp(2px, 0.55vw, 8px);
  vertical-align: top;
  text-align: center;
  white-space: normal;
}
.diagram-compare-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f4f7fb;
  color: #15294b;
}
.diagram-compare-table img {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.diagram-image-cell {
  display: block;
  width: 100%;
  min-width: 0;
}
.diagram-compare-table code {
  display: block;
  min-width: 0;
  font-size: clamp(0.55rem, 0.8vw, 0.75rem);
  overflow-wrap: anywhere;
  word-break: break-all;
  white-space: normal;
}
.source-row a {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-all;
}
.source-row td {
  background: #fbfcfe;
}
.diagram-hero {
  margin: 1.5rem 0 2rem;
}
.diagram-hero img {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: auto;
}
.post-body:has(.diagram-benchmark-wide) a {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}
.post-body:has(.diagram-benchmark-wide) a:hover {
  text-decoration-thickness: 2px;
}
.post-body:has(.diagram-benchmark-wide) .highlighter-rouge:has(> .highlight) {
  margin-block: 1.5rem;
}
.post-body:has(.diagram-benchmark-wide) .highlighter-rouge:has(> .highlight) pre {
  margin-block: 0;
}
@media screen and (max-width: 860px) {
  .site-main > .inner:has(.diagram-benchmark-wide) {
    padding-inline: 4px;
  }
  .content-layout:has(.diagram-benchmark-wide) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .diagram-compare-table th {
    font-size: clamp(0.58rem, 2.5vw, 0.78rem);
    line-height: 1.2;
  }
}
</style>

<div class="diagram-benchmark-wide"></div>

<figure class="diagram-hero">
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-gemini35-38-opus5-5way.png" alt="Gemini 3.5 Flash、Gemini 3.6 Flash、Gemini 3.7 Flash、Gemini 3.8 Flash、Claude Opus 5がTikZで描いたクマのぬいぐるみの横並び比較">
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

最初の5題材はユーザー指定です。
残り7題材は、数式、制御、認証経路、物理装置、夜景、高密度なアーキテクチャ図まで比較範囲を広げるためにAIが設計しました。

## 出力一覧

各表は5列を同時に見渡せるよう、画面幅の中へ収めています。
モデル名の直下にあるファイル名から、実際に使ったTikZ、Python、SVGソースを開けます。

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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bear-plush.tex"><code>bear-plush.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.tex"><code>bear-plush.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bear-plush-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bear-plush-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bear-plush-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-tikz.webp" alt="Claude Opus 5がTikZで描いたクマのぬいぐるみ" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bear-plush.py"><code>bear-plush.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.py"><code>bear-plush.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bear-plush-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bear-plush-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bear-plush-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bear-plush.svg"><code>bear-plush.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bear-plush.svg"><code>bear-plush.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bear-plush-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bear-plush-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bear-plush-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bear-plush-svg.webp" alt="Claude Opus 5がSVGで描いたクマのぬいぐるみ" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-tikz.webp" alt="Claude Opus 5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.6 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.7 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.8 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-elderly-living-room-tv-svg.webp" alt="Claude Opus 5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-tikz.webp" alt="Claude Opus 5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.6 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.7 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.8 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-vr-son-watched-by-mother-svg.webp" alt="Claude Opus 5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-hydraulic-piston-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-hydraulic-piston-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-hydraulic-piston-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-tikz.webp" alt="Claude Opus 5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-hydraulic-piston-svg.webp" alt="Gemini 3.6 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-hydraulic-piston-svg.webp" alt="Gemini 3.7 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-hydraulic-piston-svg.webp" alt="Gemini 3.8 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-hydraulic-piston-svg.webp" alt="Claude Opus 5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-tikz.webp" alt="Claude Opus 5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-robot-arm-7axis-svg.webp" alt="Gemini 3.6 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-robot-arm-7axis-svg.webp" alt="Gemini 3.7 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-robot-arm-7axis-svg.webp" alt="Gemini 3.8 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-robot-arm-7axis-svg.webp" alt="Claude Opus 5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.tex"><code>kalman-filter.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-kalman-filter-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-kalman-filter-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-kalman-filter-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-tikz.webp" alt="Claude Opus 5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/kalman-filter.py"><code>kalman-filter.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.py"><code>kalman-filter.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-kalman-filter-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-kalman-filter-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-kalman-filter-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/kalman-filter.svg"><code>kalman-filter.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-kalman-filter-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-kalman-filter-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-kalman-filter-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-kalman-filter-svg.webp" alt="Claude Opus 5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-rag-pipeline-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-rag-pipeline-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-rag-pipeline-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-tikz.webp" alt="Claude Opus 5がTikZで描いたRAGパイプライン構成図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.py"><code>rag-pipeline.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-rag-pipeline-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-rag-pipeline-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-rag-pipeline-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-rag-pipeline-svg.webp" alt="Claude Opus 5がSVGで描いたRAGパイプライン構成図" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-tikz.webp" alt="Claude Opus 5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-zero-trust-token-exchange-svg.webp" alt="Claude Opus 5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bloch-sphere-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bloch-sphere-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bloch-sphere-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-tikz.webp" alt="Claude Opus 5がTikZで描いたブロッホ球" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.py"><code>bloch-sphere.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたブロッホ球" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-bloch-sphere-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-bloch-sphere-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-bloch-sphere-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたブロッホ球" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-bloch-sphere-svg.webp" alt="Claude Opus 5がSVGで描いたブロッホ球" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-michelson-interferometer-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-michelson-interferometer-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-michelson-interferometer-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-tikz.webp" alt="Claude Opus 5がTikZで描いたマイケルソン干渉計" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-michelson-interferometer-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-michelson-interferometer-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-michelson-interferometer-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-michelson-interferometer-svg.webp" alt="Claude Opus 5がSVGで描いたマイケルソン干渉計" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-summer-fireworks-festival-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-summer-fireworks-festival-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-summer-fireworks-festival-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-tikz.webp" alt="Claude Opus 5がTikZで描いた夏祭りの花火大会" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-summer-fireworks-festival-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-summer-fireworks-festival-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-summer-fireworks-festival-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-summer-fireworks-festival-svg.webp" alt="Gemini 3.6 FlashがSVGで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-summer-fireworks-festival-svg.webp" alt="Gemini 3.7 FlashがSVGで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-summer-fireworks-festival-svg.webp" alt="Gemini 3.8 FlashがSVGで描いた夏祭りの花火大会" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-summer-fireworks-festival-svg.webp" alt="Claude Opus 5がSVGで描いた夏祭りの花火大会" loading="lazy"></span></td></tr></tbody>
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
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-transformer-architecture-tikz.webp" alt="Gemini 3.6 FlashがTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-transformer-architecture-tikz.webp" alt="Gemini 3.7 FlashがTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-transformer-architecture-tikz.webp" alt="Gemini 3.8 FlashがTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-tikz.webp" alt="Claude Opus 5がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### matplotlib

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/transformer-architecture.py"><code>transformer-architecture.py</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.py"><code>transformer-architecture.py</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-transformer-architecture-matplotlib.webp" alt="Gemini 3.6 Flashがmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-transformer-architecture-matplotlib.webp" alt="Gemini 3.7 Flashがmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-transformer-architecture-matplotlib.webp" alt="Gemini 3.8 Flashがmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-matplotlib.webp" alt="Claude Opus 5がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td></tr></tbody>
</table>
</div>

### SVG

<div class="diagram-scroll">
<table class="diagram-compare-table">
<thead><tr><th>Gemini 3.5 Flash</th><th>Gemini 3.6 Flash</th><th>Gemini 3.7 Flash</th><th>Gemini 3.8 Flash</th><th>Claude Opus 5</th></tr></thead>
<tbody><tr class="source-row"><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td><td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus5/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td></tr><tr><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini36flash-transformer-architecture-svg.webp" alt="Gemini 3.6 FlashがSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini37flash-transformer-architecture-svg.webp" alt="Gemini 3.7 FlashがSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini38flash-transformer-architecture-svg.webp" alt="Gemini 3.8 FlashがSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td><td><span class="diagram-image-cell"><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus5-transformer-architecture-svg.webp" alt="Claude Opus 5がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></span></td></tr></tbody>
</table>
</div>


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
