---
layout: post
title: "Claude Fable 5 vs Gemini 3.5 Flash vs GPT-5.5 図解生成ベンチマーク"
date: 2026-06-10
description: "図解生成ベンチマークの2026-06-10更新版。新登場の Claude Fable 5 を一番左の列に追加し、右列を GPT-5.5（codex exec で新規生成）に刷新。新題材2つを加えた12題材を、TikZ・matplotlib・SVGの3形式 × 3モデル = 108個で横並び比較します。"
image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-3way.png
social_image: /images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-3way.png
full_ai: true
full_ai_model: claude-fable-5
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/">2026-05-22 の「Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク」</a>および<a href="/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/">2026-05-29 の Claude Opus 4.8 追加版</a>の系譜を継ぐ更新版です。今回は新しく登場した <strong>Claude Fable 5</strong> を一番左の列として追加し、右列は GPT-5.4 に代わって <strong>GPT-5.5</strong>（<code>codex exec</code> で新規生成）に刷新しました。さらに新題材を2つ追加し、<strong>12題材 × 3形式 × 3モデル = 108個</strong>の比較になっています。過去の題材は削除せずすべて残しています。</p>
</div>

## はじめに

このシリーズは、新しいモデルが出るたびに「同じお題・同じプロンプト・同じビルド手順」で図解を描かせて横並び比較する定点観測ベンチマークです。今回の3モデルは左から **Claude Fable 5 / Gemini 3.5 Flash / GPT-5.5** の順で並べています。

- **Claude Fable 5**: この作業セッションの Claude Code（モデルID: `claude-fable-5`）自身が、プロンプトから直接 source を書き起こしました
- **Gemini 3.5 Flash**: `agy` コマンド（Gemini CLI 系のローカルエージェントCLI）の print モード（`agy -p`）で生成。既存10題材は 2026-05-22 生成分をそのまま流用し、新題材2つだけ今回 `agy` で追加生成しました
- **GPT-5.5**: `codex exec`（Codex CLI の非対話モード）で12題材すべてを今回新規生成しました

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
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-fable5-3way.png" alt="クマのぬいぐるみの TikZ 結果を、Claude Fable 5・Gemini 3.5 Flash・GPT-5.5 の3モデルで横並び比較した画像" loading="eager">
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
| 夏祭りの花火大会 | AI設計（今回追加） | 夜の配色、放射状の光、群衆と屋台の構図 |
| Transformerのアーキテクチャ図 | AI設計（今回追加） | ラベル密度、残差接続、Cross-Attentionの正確さ |

## 形式

| 形式 | 見たい点 | ビルド方法 |
|---|---|---|
| TikZ | 数式や工学図の厳密さ、構文の安定性 | `xelatex -> pdftoppm -> cwebp` |
| matplotlib | 手続き的に図を組み立てる力、部品配置の堅さ | `python -> png -> cwebp` |
| SVG | 生の座標設計とレイアウト感覚 | `rsvg-convert -> png -> cwebp` |

## ベンチマークケースについて

- ユーザー指定ケース: クマのぬいぐるみ, 独居おばあちゃんがリビングでテレビを見ている絵, 自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子, 油圧ピストンの構造解説, 7軸ロボットアームとその軸の説明
- AI設計ケース: カルマンフィルターのブロック線図, RAGパイプライン構成図, ゼロトラスト認証とトークン交換, ブロッホ球, マイケルソン干渉計, 夏祭りの花火大会, Transformerのアーキテクチャ図

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
  <img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fireworks-fable5-3way.png" alt="夏祭りの花火大会の TikZ 結果を、Claude Fable 5・Gemini 3.5 Flash・GPT-5.5 の3モデルで横並び比較した画像" loading="lazy">
  <figcaption>今回追加した新題材「夏祭りの花火大会」の TikZ 比較。夜景の配色・放射状の光・屋台と群衆の構図という、これまでの題材にはなかった軸で差が見えます。</figcaption>
</figure>

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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.tex"><code>bear-plush.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.tex"><code>bear-plush.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bear-plush.tex"><code>bear-plush.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-tikz.webp" alt="Claude Fable 5がTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bear-plush-tikz.webp" alt="GPT-5.5がTikZで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.py"><code>bear-plush.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.py"><code>bear-plush.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bear-plush.py"><code>bear-plush.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bear-plush-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたクマのぬいぐるみ" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bear-plush.svg"><code>bear-plush.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bear-plush.svg"><code>bear-plush.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bear-plush.svg"><code>bear-plush.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bear-plush-svg.webp" alt="Claude Fable 5がSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bear-plush-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bear-plush-svg.webp" alt="GPT-5.5がSVGで描いたクマのぬいぐるみ" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/elderly-living-room-tv.tex"><code>elderly-living-room-tv.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-tikz.webp" alt="Claude Fable 5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-elderly-living-room-tv-tikz.webp" alt="GPT-5.5がTikZで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/elderly-living-room-tv.py"><code>elderly-living-room-tv.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-elderly-living-room-tv-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/elderly-living-room-tv.svg"><code>elderly-living-room-tv.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-elderly-living-room-tv-svg.webp" alt="Claude Fable 5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-elderly-living-room-tv-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-elderly-living-room-tv-svg.webp" alt="GPT-5.5がSVGで描いた独居おばあちゃんがリビングでテレビを見ている絵" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/vr-son-watched-by-mother.tex"><code>vr-son-watched-by-mother.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-tikz.webp" alt="Claude Fable 5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-vr-son-watched-by-mother-tikz.webp" alt="GPT-5.5がTikZで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/vr-son-watched-by-mother.py"><code>vr-son-watched-by-mother.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-vr-son-watched-by-mother-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/vr-son-watched-by-mother.svg"><code>vr-son-watched-by-mother.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-vr-son-watched-by-mother-svg.webp" alt="Claude Fable 5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-vr-son-watched-by-mother-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-vr-son-watched-by-mother-svg.webp" alt="GPT-5.5がSVGで描いた自分の部屋でVRゴーグルで遊んでいる様子をお母さんに見られる息子" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/hydraulic-piston.tex"><code>hydraulic-piston.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-tikz.webp" alt="Claude Fable 5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-hydraulic-piston-tikz.webp" alt="GPT-5.5がTikZで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/hydraulic-piston.py"><code>hydraulic-piston.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-hydraulic-piston-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いた油圧ピストンの構造解説" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/hydraulic-piston.svg"><code>hydraulic-piston.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-hydraulic-piston-svg.webp" alt="Claude Fable 5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-hydraulic-piston-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-hydraulic-piston-svg.webp" alt="GPT-5.5がSVGで描いた油圧ピストンの構造解説" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/robot-arm-7axis.tex"><code>robot-arm-7axis.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-tikz.webp" alt="Claude Fable 5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-robot-arm-7axis-tikz.webp" alt="GPT-5.5がTikZで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/robot-arm-7axis.py"><code>robot-arm-7axis.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-robot-arm-7axis-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/robot-arm-7axis.svg"><code>robot-arm-7axis.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-robot-arm-7axis-svg.webp" alt="Claude Fable 5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-robot-arm-7axis-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-robot-arm-7axis-svg.webp" alt="GPT-5.5がSVGで描いた7軸ロボットアームとその軸の説明" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/kalman-filter.tex"><code>kalman-filter.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-tikz.webp" alt="Claude Fable 5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-kalman-filter-tikz.webp" alt="GPT-5.5がTikZで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.py"><code>kalman-filter.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.py"><code>kalman-filter.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/kalman-filter.py"><code>kalman-filter.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-kalman-filter-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/kalman-filter.svg"><code>kalman-filter.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-kalman-filter-svg.webp" alt="Claude Fable 5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-kalman-filter-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-kalman-filter-svg.webp" alt="GPT-5.5がSVGで描いたカルマンフィルターのブロック線図" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/rag-pipeline.tex"><code>rag-pipeline.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-tikz.webp" alt="Claude Fable 5がTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-rag-pipeline-tikz.webp" alt="GPT-5.5がTikZで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/rag-pipeline.py"><code>rag-pipeline.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-rag-pipeline-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたRAGパイプライン構成図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/rag-pipeline.svg"><code>rag-pipeline.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-rag-pipeline-svg.webp" alt="Claude Fable 5がSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-rag-pipeline-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-rag-pipeline-svg.webp" alt="GPT-5.5がSVGで描いたRAGパイプライン構成図" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/zero-trust-token-exchange.tex"><code>zero-trust-token-exchange.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-tikz.webp" alt="Claude Fable 5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-zero-trust-token-exchange-tikz.webp" alt="GPT-5.5がTikZで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/zero-trust-token-exchange.py"><code>zero-trust-token-exchange.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-zero-trust-token-exchange-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/zero-trust-token-exchange.svg"><code>zero-trust-token-exchange.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-zero-trust-token-exchange-svg.webp" alt="Claude Fable 5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-zero-trust-token-exchange-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-zero-trust-token-exchange-svg.webp" alt="GPT-5.5がSVGで描いたゼロトラスト認証とトークン交換" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bloch-sphere.tex"><code>bloch-sphere.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-tikz.webp" alt="Claude Fable 5がTikZで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bloch-sphere-tikz.webp" alt="GPT-5.5がTikZで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bloch-sphere.py"><code>bloch-sphere.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bloch-sphere-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたブロッホ球" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/bloch-sphere.svg"><code>bloch-sphere.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-bloch-sphere-svg.webp" alt="Claude Fable 5がSVGで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-bloch-sphere-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたブロッホ球" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-bloch-sphere-svg.webp" alt="GPT-5.5がSVGで描いたブロッホ球" loading="lazy"></td>
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
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/michelson-interferometer.tex"><code>michelson-interferometer.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-tikz.webp" alt="Claude Fable 5がTikZで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-michelson-interferometer-tikz.webp" alt="GPT-5.5がTikZで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/michelson-interferometer.py"><code>michelson-interferometer.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-michelson-interferometer-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/michelson-interferometer.svg"><code>michelson-interferometer.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-michelson-interferometer-svg.webp" alt="Claude Fable 5がSVGで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-michelson-interferometer-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたマイケルソン干渉計" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-michelson-interferometer-svg.webp" alt="GPT-5.5がSVGで描いたマイケルソン干渉計" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 11. 夏祭りの花火大会（今回追加の新題材）

### お題

- 夜空に大きな打ち上げ花火が開いている夏祭りの情景を描く
- 花火は放射状の光の筋で2〜3発、色を変えて描く
- 画面下部に提灯の付いた屋台と人々のシルエットを置く
- 夜空は深い紺色のグラデーション風にして星を散らす
- 光の反射や提灯の灯りなど、夜らしい演出を入れる

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/summer-fireworks-festival.tex"><code>summer-fireworks-festival.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-tikz.webp" alt="Claude Fable 5がTikZで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-summer-fireworks-festival-tikz.webp" alt="GPT-5.5がTikZで描いた夏祭りの花火大会" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/summer-fireworks-festival.py"><code>summer-fireworks-festival.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-summer-fireworks-festival-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いた夏祭りの花火大会" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/summer-fireworks-festival.svg"><code>summer-fireworks-festival.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-summer-fireworks-festival-svg.webp" alt="Claude Fable 5がSVGで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-summer-fireworks-festival-svg.webp" alt="Gemini 3.5 FlashがSVGで描いた夏祭りの花火大会" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-summer-fireworks-festival-svg.webp" alt="GPT-5.5がSVGで描いた夏祭りの花火大会" loading="lazy"></td>
    </tr>
  </tbody>
</table>

## 12. Transformerのアーキテクチャ図（今回追加の新題材）

### お題

- Transformer の encoder-decoder アーキテクチャ図を描く
- Input Embedding, Positional Encoding, Multi-Head Attention, Feed Forward, Add & Norm, Linear, Softmax を入れる
- Encoder スタックと Decoder スタックを左右に分けて配置する
- 残差接続が Add & Norm に入る流れを矢印で分かるように描く
- Decoder 側の Masked Multi-Head Attention と、Encoder から渡る Cross-Attention を区別する
- 論文スタイルの読みやすいブロック図として整理する

### TikZ

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/transformer-architecture.tex"><code>transformer-architecture.tex</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-tikz.webp" alt="Claude Fable 5がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-tikz.webp" alt="Gemini 3.5 FlashがTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-transformer-architecture-tikz.webp" alt="GPT-5.5がTikZで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### matplotlib

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.py"><code>transformer-architecture.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.py"><code>transformer-architecture.py</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/transformer-architecture.py"><code>transformer-architecture.py</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-matplotlib.webp" alt="Claude Fable 5がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-matplotlib.webp" alt="Gemini 3.5 Flashがmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-transformer-architecture-matplotlib.webp" alt="GPT-5.5がmatplotlibで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
    </tr>
  </tbody>
</table>

### SVG

<table class="diagram-compare-table">
  <thead>
    <tr>
      <th>Claude Fable 5</th>
      <th>Gemini 3.5 Flash</th>
      <th>GPT-5.5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/fable5/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td>
      <td><a href="/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark/gpt55/transformer-architecture.svg"><code>transformer-architecture.svg</code></a></td>
    </tr>
    <tr>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/fable5-transformer-architecture-svg.webp" alt="Claude Fable 5がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gemini35flash-transformer-architecture-svg.webp" alt="Gemini 3.5 FlashがSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
      <td><img src="/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/gpt55-transformer-architecture-svg.webp" alt="GPT-5.5がSVGで描いたTransformerのアーキテクチャ図" loading="lazy"></td>
    </tr>
  </tbody>
</table>


## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです。Fable 5 がどちらに寄るかも、左列で並べて見られます
- 夜景の花火は、暗背景での発色・光のグラデーション表現・シルエットの説得力に各モデルの個性が出ます
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- Transformer 図は、残差接続と Cross-Attention の結線を正確に描けるかという「知識の正確さ」も同時に試されます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 元記事（2モデル版）: [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク](/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/)（確認日: 2026-05-22）
- 前回記事（Opus 4.8 追加版）: [Claude Opus 4.8 vs Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク](/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/)（確認日: 2026-05-29）
- さらに前の比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison （確認日: 2026-05-22）

## おわりに

新登場の `Claude Fable 5` を一番左の列に迎え、右列を `codex exec` 生成の `GPT-5.5` に刷新し、新題材2つを加えた12題材 × 3形式 × 3モデルの総当たり比較にしました。同じお題でも、モデル差と形式差を1画面で見比べられます。次のモデルが出たら、また同じお題で定点観測を続けます。
