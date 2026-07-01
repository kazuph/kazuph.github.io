---
layout: post
title: "Claude Sonnet 5 vs Claude Opus 4.8 vs Gemini 3.5 Flash 図解生成ベンチマーク"
date: 2026-07-01
description: "図解生成ベンチマークの2026-07-01更新版。新登場の Claude Sonnet 5 を一番左の列に追加し、真ん中に Claude Opus 4.8、右に Gemini 3.5 Flash を並べた3列比較。Sonnet 5 の30個(10題材×3形式)は、1図につき1subagentずつ・model固定・Read/Writeのみという強制プロンプトで生成しています。"
image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-sonnet5-3way.png
social_image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-sonnet5-3way.png
full_ai: true
full_ai_model: claude-sonnet-5
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/">2026-05-22 の「Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク」</a>と<a href="/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/">2026-05-29 の Claude Opus 4.8 追加版</a>の系譜を継ぐ更新版です。今回はマスター(ユーザー)から「一番左の列を Claude Sonnet 5(このセッション自身)の新規作図にし、真ん中を Claude Opus 4.8、右を Gemini 3.5 Flash にした3列で作れ」という指示を受け、GPT-5.4 列を Claude Sonnet 5 列に置き換えました。Opus 4.8 と Gemini 3.5 Flash の列は 2026-05-29 版の資産をそのまま流用し、<strong>新規に作図したのは Sonnet 5 の30個(10題材 × 3形式)だけ</strong>です。</p>
</div>

## 依頼内容

この記事は、以下のプロンプトをマスターから受けて作成しました。

> /goal 過去にある各LLMの作図バトルの記事を見つけて、それをコピーして最新の記事として作成してください。日付は7/1です。
> Sonnet 5=君の成果を一番左にセットし、真ん中をOpus 4.8、右をGemini 3.5 flashの3列にしてください。
> 新規の作図は君=Sonnet 5だけです。図の数だけSonnet 5を指定したsubagentを使って一気にすべて作図させてください。すべての図を作成できれば完了ですが、
> - モデルがSonnet 5以外
> - 指定したツールを使わず代替として別のツールを使った
>
> 場合は、NGなので、その図は削除する必要があります。subagentが、必ず指定した行動をするように強制するプロンプトを使ってください。
> 提案に対して代替・劣化した瞬間killしてください。

この指示に沿って、**Sonnet 5 列の30個は「1図につき1subagent」を model 固定(`sonnet`)で30体スポーンし、それぞれに「Read と Write 以外のツールは使うな、Bashで他のCLI(codex/agy/gemini/copilot等)を呼ぶな、他モデルの既存出力を読むな」と明記した強制プロンプトを渡して生成**させました。Opus 4.8 / Gemini 3.5 Flash の列は過去記事で確認済みの資産をそのまま再利用しています(この2列を新規に描き直すことは指示されていないため)。

## はじめに

このシリーズは、新しいモデルが出るたびに「同じお題・同じプロンプト・同じビルド手順」で図解を描かせて横並び比較する定点観測ベンチマークです。今回の3モデルは左から **Claude Sonnet 5 / Claude Opus 4.8 / Gemini 3.5 Flash** の順で並べています。

- **Claude Sonnet 5**: この作業セッションを主導する Claude Code(オーケストレーター)自身が、`Agent` ツールで題材×形式ぶん(30体)の subagent を model 固定で個別にスポーンし、各subagentが担当プロンプトから直接 source を書き起こしました
- **Claude Opus 4.8**: 2026-05-29版で生成済みの10題材 × 3形式 = 30個をそのまま流用
- **Gemini 3.5 Flash**: `agy` コマンド(Gemini CLI 系のローカルエージェントCLI)の print モードで2026-05-22に生成済みの10題材 × 3形式 = 30個をそのまま流用

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
  width: 33.33%;
  vertical-align: top;
  text-align: center;
}

.diagram-compare-table code {
  font-size: 0.8rem;
  word-break: break-all;
}
</style>

<figure class="diagram-hero">
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-sonnet5-3way.png" alt="クマのぬいぐるみの TikZ 結果を、Claude Sonnet 5・Claude Opus 4.8・Gemini 3.5 Flash の3モデルで横並び比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、シリーズの顔であるクマのぬいぐるみ題材の TikZ 比較を Sonnet 5 / Opus 4.8 / Gemini 3.5 Flash の3列で並べた画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Claude Sonnet 5 / Claude Opus 4.8 / Gemini 3.5 Flash
- **形式**: TikZ / matplotlib / SVG
- **題材**: 10題材
- **総数**: 10題材 × 3形式 × 3モデル = **90個**
- **今回の新規生成分**: Claude Sonnet 5 の 10題材 × 3形式 = **30個**(1図1subagent、model固定、Read/Writeのみで生成)
- **流用分**: Claude Opus 4.8(2026-05-29生成)30個 + Gemini 3.5 Flash(2026-05-22生成)30個
- **確認日**: 2026-07-01 JST(Opus 4.8 分は2026-05-29、Gemini 3.5 Flash 分は2026-05-22)

題材のうち 5 つはユーザー指定です。残り 5 つは比較差が出やすいように AI で設計しました。過去の題材は1つも削除していません。

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

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。お題のプロンプトは `scripts/diagram_benchmark_2026/prompts/` にあります(3モデル共通)。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法(Sonnet 5 列の強制プロンプト運用)

Sonnet 5 列の30個は、オーケストレーター(この作業セッションのメインエージェント)が `Agent` ツールで題材×形式の組み合わせぶん(10題材 × 3形式 = 30体)の subagent を個別に起動し、それぞれに次を明記したプロンプトを渡して生成させました。

- **モデル固定**: `Agent` 呼び出し側で `model: "sonnet"` を明示指定(subagentの自己申告に頼らず、オーケストレーター側の呼び出しパラメータでモデルを強制)
- **使用ツールの制限**: 「Read でお題プロンプトを読み、Write で source を保存する以外のツールは使うな」と明記
- **代替手段の禁止**: 「Bashは一切使用禁止。`codex exec` / `agy` / `gemini` / `copilot` などの外部CLIやMCPツール(drawio等)、WebFetch/WebSearchで代わりに描かせることを完全禁止。違反が発覚した時点でその成果物は削除する」と明記
- **他モデル出力の参照禁止**: 「既存の opus48 / gemini35flash / gpt54 / gpt55 / fable5 ディレクトリ以下を読んだりコピーしたりするな。ゼロから自分で設計しろ」と明記

```bash
# Sonnet 5 の source を画像へ(1図1subagentで生成した30個)
scripts/diagram_benchmark_2026/render_all.sh sonnet5

# 流用分(Opus 4.8 / Gemini 3.5 Flash)は過去記事の生成物をそのまま使用
scripts/diagram_benchmark_2026/render_all.sh opus48
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
```

### 生成時に起きたこと(記録)

定点観測なので、生成過程でつまずいた点も正直に記録しておきます。

- **subagent の同時起動数上限**: 30体を1メッセージで一気に起動しようとしたところ、環境側のpane同時起動数の上限(概ね15体前後)に達し、後半のsubagentが `respawn pane failed` で起動失敗しました。オーケストレーターは、完了済みsubagentへ `shutdown_request` を送ってpaneを解放しながら、失敗分を数体ずつ再送信する形で30体すべての起動と完了を確認しています
- **Claude Sonnet 5**: ブロッホ球のTikZで、独自マクロ名 `\tmpX1` / `\tmpY1`(TeXの制御綴りは英字のみで数字を含められないため `\tmpX` + 文字 `1` に分割される既知の罠)と、`\SphR and \EqMinorR` のようにマクロ直後に `and` キーワードを続けた際にマクロが後続スペースを飲み込んで `3and ...` になる罠の、計2箇所でコンパイルエラーが発生しました。いずれも描画内容には無関係な構文修正(マクロ名の変更、`{}` によるスペース保持)をオーケストレーター側で1回ずつ行い、コンパイルを通しています
- 上記以外の29個は、各subagentがRead→(自身の知識で設計)→Writeの一発生成のみでビルドが通りました

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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bear-plush.tex"><code>bear-plush.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bear-plush.tex"><code>bear-plush.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.tex"><code>bear-plush.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bear-plush-tikz.webp" alt="Claude Sonnet 5がTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bear-plush-tikz.webp" alt="Claude Opus 4.8がTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bear-plush.py"><code>bear-plush.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bear-plush.py"><code>bear-plush.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.py"><code>bear-plush.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bear-plush-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bear-plush-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bear-plush.svg"><code>bear-plush.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bear-plush.svg"><code>bear-plush.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.svg"><code>bear-plush.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bear-plush-svg.webp" alt="Claude Sonnet 5がSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bear-plush-svg.webp" alt="Claude Opus 4.8がSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-elderly-living-room-tv-tikz.webp" alt="Claude Sonnet 5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-elderly-living-room-tv-tikz.webp" alt="Claude Opus 4.8がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-elderly-living-room-tv-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-elderly-living-room-tv-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-elderly-living-room-tv-svg.webp" alt="Claude Sonnet 5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-elderly-living-room-tv-svg.webp" alt="Claude Opus 4.8がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-vr-son-watched-by-mother-tikz.webp" alt="Claude Sonnet 5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-vr-son-watched-by-mother-tikz.webp" alt="Claude Opus 4.8がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-vr-son-watched-by-mother-svg.webp" alt="Claude Sonnet 5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-vr-son-watched-by-mother-svg.webp" alt="Claude Opus 4.8がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-hydraulic-piston-tikz.webp" alt="Claude Sonnet 5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-hydraulic-piston-tikz.webp" alt="Claude Opus 4.8がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-hydraulic-piston-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-hydraulic-piston-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-hydraulic-piston-svg.webp" alt="Claude Sonnet 5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-hydraulic-piston-svg.webp" alt="Claude Opus 4.8がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-robot-arm-7axis-tikz.webp" alt="Claude Sonnet 5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-robot-arm-7axis-tikz.webp" alt="Claude Opus 4.8がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-robot-arm-7axis-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-robot-arm-7axis-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-robot-arm-7axis-svg.webp" alt="Claude Sonnet 5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-robot-arm-7axis-svg.webp" alt="Claude Opus 4.8がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-kalman-filter-tikz.webp" alt="Claude Sonnet 5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-kalman-filter-tikz.webp" alt="Claude Opus 4.8がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/kalman-filter.py"><code>kalman-filter.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/kalman-filter.py"><code>kalman-filter.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.py"><code>kalman-filter.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-kalman-filter-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-kalman-filter-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-kalman-filter-svg.webp" alt="Claude Sonnet 5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-kalman-filter-svg.webp" alt="Claude Opus 4.8がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-rag-pipeline-tikz.webp" alt="Claude Sonnet 5がTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-rag-pipeline-tikz.webp" alt="Claude Opus 4.8がTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-rag-pipeline-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-rag-pipeline-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-rag-pipeline-svg.webp" alt="Claude Sonnet 5がSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-rag-pipeline-svg.webp" alt="Claude Opus 4.8がSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-zero-trust-token-exchange-tikz.webp" alt="Claude Sonnet 5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-zero-trust-token-exchange-tikz.webp" alt="Claude Opus 4.8がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-zero-trust-token-exchange-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-zero-trust-token-exchange-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-zero-trust-token-exchange-svg.webp" alt="Claude Sonnet 5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-zero-trust-token-exchange-svg.webp" alt="Claude Opus 4.8がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bloch-sphere-tikz.webp" alt="Claude Sonnet 5がTikZで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bloch-sphere-tikz.webp" alt="Claude Opus 4.8がTikZで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bloch-sphere-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bloch-sphere-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-bloch-sphere-svg.webp" alt="Claude Sonnet 5がSVGで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-bloch-sphere-svg.webp" alt="Claude Opus 4.8がSVGで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたブロッホ球" loading="lazy"></td>
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
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-michelson-interferometer-tikz.webp" alt="Claude Sonnet 5がTikZで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-michelson-interferometer-tikz.webp" alt="Claude Opus 4.8がTikZで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-michelson-interferometer-matplotlib.webp" alt="Claude Sonnet 5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-michelson-interferometer-matplotlib.webp" alt="Claude Opus 4.8がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Sonnet 5</th>
      <th>Claude Opus 4.8</th>
      <th>Gemini 3.5 Flash</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/opus48/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/sonnet5-michelson-interferometer-svg.webp" alt="Claude Sonnet 5がSVGで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/opus48-michelson-interferometer-svg.webp" alt="Claude Opus 4.8がSVGで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>


## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです。Sonnet 5 がどちらに寄るかも、左列で並べて見られます
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 前回記事(3モデル版): [Claude Opus 4.8 vs Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク](/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/)(確認日: 2026-05-29)
- 元記事(2モデル版): [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク](/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/)(確認日: 2026-05-22)
- さらに前の比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison (確認日: 2026-05-22)

## おわりに(人間コメント)

Gemini 3.5 Flashが最強！ってのはそうなのですが、OpusよりもSonnetさんの方が視覚系タスクが優秀そうだとわかりました。
はぁ、早くOpus 4.9出ないかなぁ・・・。
