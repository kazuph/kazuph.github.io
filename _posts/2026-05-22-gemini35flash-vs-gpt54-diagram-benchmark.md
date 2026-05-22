---
layout: post
title: "Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク"
date: 2026-05-22
description: "Gemini 3.5 FlashとGPT-5.4で、10題材をTikZ・matplotlib・SVGの3形式で描かせる新しい比較ベンチマークです。"
image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp.png
social_image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp.png
full_ai: true
full_ai_model: gpt-5.4
---

## はじめに

以前の比較記事では、複数のLLMに対して14題材を4形式で描かせていました。今回はそれをそのまま延長せず、`Gemini 3.5 Flash` と `GPT-5.4` の2モデルに絞って、新しく回し直します。

この記事は、題材設計、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。

<style>
.diagram-hero img,
.diagram-compare-table img {
  width: 100%;
  height: auto;
  display: block;
}

.diagram-hero {
  margin: 2rem 0;
}

.diagram-hero figcaption {
  margin-top: 0.75rem;
  color: #666;
  font-size: 0.95rem;
}

.diagram-compare-table {
  width: 100%;
  table-layout: fixed;
}

.diagram-compare-table th,
.diagram-compare-table td {
  width: 50%;
  vertical-align: top;
  text-align: center;
}

.diagram-compare-table code {
  font-size: 0.85rem;
  word-break: break-all;
}
</style>

<figure class="diagram-hero">
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp.png" alt="クマのぬいぐるみの TikZ 結果を、GPT-5.4 と Gemini 3.5 Flash で左右比較した画像" loading="eager">
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

## 形式

| 形式 | 見たい点 | ビルド方法 |
|---|---|---|
| TikZ | 数式や工学図の厳密さ、構文の安定性 | `xelatex -> pdftoppm -> cwebp` |
| matplotlib | 手続き的に図を組み立てる力、部品配置の堅さ | `python -> png -> cwebp` |
| SVG | 生の座標設計とレイアウト感覚 | `rsvg-convert -> png -> cwebp` |

## ベンチマークケースについて

- ユーザー指定ケース: クマのぬいぐるみ, 独居おばあちゃんがリビングでテレビを見ている絵, 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子, 油圧ピストンの構造解説, 7軸ロボットアームとその軸の説明
- AI設計ケース: カルマンフィルターのブロック線図, RAGパイプライン構成図, ゼロトラスト認証とトークン交換, ブロッホ球, マイケルソン干渉計

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

## 01. クマのぬいぐるみ

### お題

- かわいいクマのぬいぐるみを正面向きで描く
- 頭は丸く、耳は左右対称で少し大きめ
- 胴体は柔らかい綿入りの感じが出るように少し横幅を持たせる
- 腕と脚は短めで、ぬいぐるみらしい丸みを付ける
- 目、鼻、口、足裏、胸のワッペンなどで質感差を出す
- 暖色寄りでやさしい配色にする

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.tex"><code>bear-plush.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bear-plush.tex"><code>bear-plush.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bear-plush-tikz.webp" alt="GPT-5.4がTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.py"><code>bear-plush.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bear-plush.py"><code>bear-plush.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bear-plush-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.svg"><code>bear-plush.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bear-plush.svg"><code>bear-plush.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bear-plush-svg.webp" alt="GPT-5.4がSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 02. 独居おばあちゃんがリビングでテレビを見ている絵

### お題

- リビングでおばあちゃんがテレビを見ている情景を描く
- おばあちゃんは一人で、椅子かソファに座っている
- テレビ、テーブル、照明、カーテンなどで生活空間を出す
- テレビの方へ視線が向いていることが分かるようにする
- 家庭的で温かい雰囲気にする

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-elderly-living-room-tv-tikz.webp" alt="GPT-5.4がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-elderly-living-room-tv-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-elderly-living-room-tv-svg.webp" alt="GPT-5.4がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 03. 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子

### お題

- 子ども部屋で息子がVRゴーグルを装着して遊んでいる場面を描く
- 息子は両手にコントローラーを持ち、楽しそうに動いている
- 部屋の入口側からお母さんがその様子を見ている
- 机、棚、ベッドなどで子ども部屋らしさを出す
- 人物同士の視線関係が分かるようにする

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-vr-son-watched-by-mother-tikz.webp" alt="GPT-5.4がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-vr-son-watched-by-mother-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-vr-son-watched-by-mother-svg.webp" alt="GPT-5.4がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 04. 油圧ピストンの構造解説

### お題

- 油圧ピストンの断面構造図を描く
- シリンダー、ピストン、ロッド、左右の圧力室を表現する
- 流体の流れを矢印で示す
- 主要部品にラベルを付ける
- 教育用の図として読みやすく整理する

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-hydraulic-piston-tikz.webp" alt="GPT-5.4がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-hydraulic-piston-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-hydraulic-piston-svg.webp" alt="GPT-5.4がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 05. 7軸ロボットアームとその軸の説明

### お題

- 7軸ロボットアームの全体図を描く
- 各関節を J1 から J7 までラベル付けする
- 各軸の回転方向を小さな矢印で示す
- ベース、リンク、手先の関係が分かるようにする
- やや立体感のある構図で描く

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-robot-arm-7axis-tikz.webp" alt="GPT-5.4がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-robot-arm-7axis-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-robot-arm-7axis-svg.webp" alt="GPT-5.4がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 06. カルマンフィルターのブロック線図

### お題

- カルマンフィルターのブロック線図を描く
- Prediction, Update, Measurement, State estimate を分ける
- 入力とフィードバックの向きを矢印で示す
- Kalman gain や residual など主要な情報流も入れる
- 制御図として見やすく整理する

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-kalman-filter-tikz.webp" alt="GPT-5.4がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.py"><code>kalman-filter.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/kalman-filter.py"><code>kalman-filter.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-kalman-filter-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-kalman-filter-svg.webp" alt="GPT-5.4がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 07. RAGパイプライン構成図

### お題

- RAG のパイプライン構成図を描く
- User Query, Embed/Retrieve, Vector DB, Retrieved Context, LLM, Answer を入れる
- オンライン処理と事前の文書投入を区別する
- データフローを矢印で示す
- 現代的なAIシステム図として整理する

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-rag-pipeline-tikz.webp" alt="GPT-5.4がTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-rag-pipeline-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-rag-pipeline-svg.webp" alt="GPT-5.4がSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 08. ゼロトラスト認証とトークン交換

### お題

- ゼロトラスト認証とトークン交換の流れを描く
- User, Browser, IdP, API Gateway, Service A, Service B を入れる
- ID token, access token, service token の流れを区別する
- 信頼境界を領域として表現する
- 複雑でも読めるセキュリティ図にする

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-zero-trust-token-exchange-tikz.webp" alt="GPT-5.4がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-zero-trust-token-exchange-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-zero-trust-token-exchange-svg.webp" alt="GPT-5.4がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 09. ブロッホ球

### お題

- ブロッホ球を2D投影で描く
- x, y, z 軸を示す
- 量子状態ベクトル |psi> を球面上に描く
- theta と phi の角度を小さな弧で示す
- 物理の教科書に出てくる図として整える

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bloch-sphere-tikz.webp" alt="GPT-5.4がTikZで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bloch-sphere-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-bloch-sphere-svg.webp" alt="GPT-5.4がSVGで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 10. マイケルソン干渉計

### お題

- マイケルソン干渉計の模式図を描く
- Laser, Beam Splitter, Mirror A, Mirror B, Screen を入れる
- 光路を直線矢印で示す
- ビームスプリッタで2方向に分岐して戻る流れを見せる
- 対称性を保って配置する

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-michelson-interferometer-tikz.webp" alt="GPT-5.4がTikZで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-michelson-interferometer-matplotlib.webp" alt="GPT-5.4がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt54/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt54-michelson-interferometer-svg.webp" alt="GPT-5.4がSVGで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>


## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 既存比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison （確認日: 2026-05-22）

## おわりに

今回は `Gemini 3.5 Flash` と `GPT-5.4` で、10題材を3形式ずつ総当たりで比較できる土台を作りました。これで、同じお題でもモデル差と形式差を並べて見られます。
