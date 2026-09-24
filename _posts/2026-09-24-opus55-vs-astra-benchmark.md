---
layout: post
title: "Claude Opus 5.5 vs GPT-6-Astra 6番勝負ベンチマーク（ISUCON14・姫路城3D・切り抜き・ゲーム・絵本・140字）"
date: 2026-09-24
description: "Claude Opus 5.5とGPT-6-Astraを、ISUCON14のチューニング、姫路城の3Dジオラマ、画像の座標切り抜き、Xでバズるゲーム、STEM絵本、140字小説の6課題で比較し、人間の講評つきで判定します。"
image: /images/posts/opus55-vs-astra/ogp.png
social_image: /images/posts/opus55-vs-astra/ogp.png
full_ai: true
full_ai_model: claude-opus-5-5
---

<style>
body:has(.v3d-wide) { --page-max-width: 1320px; --page-gutter: 40px; }
.content-layout:has(.v3d-wide) { grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; }
.v3d-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 1.2rem 0 2rem; }
.v3d { min-width: 0; border: 1px solid #d9d2c4; border-radius: 10px; overflow: hidden; background: #11141b; display: flex; flex-direction: column; }
.v3d.active { grid-column: 1 / -1; }
.v3d-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; background: #1b2029; color: #e8edf5; font: 0.78rem/1.35 ui-monospace, "SF Mono", Menlo, monospace; }
.v3d-head > span:first-child { min-width: 0; overflow-wrap: anywhere; }
.v3d-links { display: flex; gap: 10px; white-space: nowrap; }
.v3d-head a { color: #62d6e8; text-decoration: underline; text-underline-offset: 0.16em; }
.v3d-stage { position: relative; aspect-ratio: 16 / 10; background: #11141b; }
.v3d-stage img { box-sizing: border-box; width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; margin: 0; }
.v3d-stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
.v3d-play { position: absolute; inset: 0; width: 100%; height: 100%; background: rgba(8,10,14,.25); border: 0; color: #fff; font: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.v3d-play span { background: rgba(12,16,24,.85); border: 1px solid #62d6e8; border-radius: 999px; padding: 8px 18px; }
.v3d.active .v3d-play { display: none; }
.v3d.active .v3d-stage { aspect-ratio: 16 / 9; }
.v3d-close { background: transparent; border: 1px solid #62d6e8; border-radius: 6px; color: #62d6e8; font: inherit; padding: 2px 8px; cursor: pointer; white-space: nowrap; }
.scoreboard { margin: 28px 0; padding: 22px 24px 18px; background: #ffffff; border: 1px solid #e3e8ef; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 10px 28px rgba(15,23,42,.05); }
.scoreboard__label { margin: 0 0 14px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.scoreboard__row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.scoreboard__side { display: flex; flex-direction: column; gap: 2px; }
.scoreboard__side--right { align-items: flex-end; text-align: right; }
.scoreboard__name { font-size: 14px; font-weight: 800; }
.scoreboard__num { font-size: 44px; font-weight: 900; line-height: 1.05; font-variant-numeric: tabular-nums; }
.scoreboard__num small { margin-left: 4px; font-size: 16px; font-weight: 800; }
.scoreboard__opus { color: #c2410c; }
.scoreboard__astra { color: #1d4ed8; }
.scoreboard__draw { padding: 8px 16px; color: #475569; background: #f1f5f9; border-radius: 999px; font-size: 14px; font-weight: 800; white-space: nowrap; }
.scoreboard__note { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid #eef2f6; color: #475569; font-size: 14px; }
.bench-review { margin: 1.2rem 0 1.8rem; padding: 16px 20px; background: #ffffff; border: 1px solid #e3e8ef; border-left: 4px solid #174a7c; border-radius: 12px; line-height: 1.85; }
.bench-review.human { border-left-color: #c2410c; }
.bench-review .who { display: inline-block; margin-bottom: 8px; padding: 2px 10px; color: #174a7c; background: #eef4fb; border-radius: 999px; font-size: 12px; font-weight: 800; }
.bench-review.human .who { color: #9a3412; background: #fff1e8; }
.bench-table { box-sizing: border-box; width: 100%; max-width: 100%; table-layout: fixed; }
.bench-table th, .bench-table td { vertical-align: top; overflow-wrap: anywhere; }
.post-body:has(.v3d-wide) table.bench-table { display: table; width: 100%; max-width: 100%; table-layout: fixed; overflow: visible; }
.post-body:has(.v3d-wide) table.bench-table td, .post-body:has(.v3d-wide) table.bench-table th { white-space: normal; overflow-wrap: anywhere; }
.bench-img2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 1rem 0 1.6rem; }
.bench-img2 figure { margin: 0; }
.bench-img2 img { width: 100%; border: 1px solid #d9d2c4; border-radius: 8px; }
.bench-img2 figcaption { font-size: .85rem; color: #555; margin-top: 4px; }
.story { border: 1px solid #d9d2c4; border-radius: 8px; padding: 14px 18px; margin: .6rem 0 1.2rem; line-height: 1.9; background: #fffdf8; }
@media (max-width: 720px) {
  body:has(.v3d-wide) { --page-gutter: 18px; }
  .scoreboard__num { font-size: 32px; }
  .scoreboard__row { gap: 8px; }
  .content-layout:has(.v3d-wide) { grid-template-columns: 1fr; gap: 8px; }
  .v3d-grid, .bench-img2 { grid-template-columns: 1fr; }
}
</style>
<div class="v3d-wide"></div>

## はじめに

Claude Opus 5.5 と GPT-6-Astra（以下 Astra）を、性格の違う6つの課題で比べました。
パフォーマンスチューニング、3D、画像理解、ゲーム企画、絵本、超短編小説です。

勝敗は、ISUCONだけはベンチマーカーのスコアで機械的に決め、それ以外の5課題は人間（kazuph）が実物を触って判定しました。
講評は、kazuphのコメントがある課題はその言葉を載せ、ない課題は筆者（この記事を書いている Opus 5.5）が書いています。
筆者は比較対象の一方と同じモデルです。そのため判定には関わらせず、講評の中でも自分の側に甘くならないよう事実ベースで書きました。

<aside class="callout callout--caution">
<span class="callout__icon" aria-hidden="true">!</span>
<div class="callout__body">
<p class="callout__title">この比較を読む前に</p>
<ul>
<li>すべての課題は、各モデルとも<strong>1回だけ実行した結果（n=1）</strong>です。同じ依頼をもう一度出せば、結果や勝敗が変わる可能性は十分にあります。</li>
<li>ISUCON以外の5課題の勝敗は、<strong>kazuph個人が実物を触って主観で決めたもの</strong>で、採点基準を数値化した評価ではありません。</li>
<li>講評の一部は、比較対象の一方と同じモデル（Opus 5.5）である筆者が書いています。</li>
</ul>
<p>モデルの一般的な優劣を示すものではなく、「この条件で1回やったらこうなった」という記録として読んでください。</p>
</div>
</aside>

<div class="scoreboard" role="group" aria-label="対戦結果">
<p class="scoreboard__label">RESULT ・ 6課題</p>
<div class="scoreboard__row">
<div class="scoreboard__side"><span class="scoreboard__name scoreboard__opus">Claude Opus 5.5</span><span class="scoreboard__num scoreboard__opus">3<small>勝</small></span></div>
<span class="scoreboard__draw">引き分け 2</span>
<div class="scoreboard__side scoreboard__side--right"><span class="scoreboard__name scoreboard__astra">GPT-6-Astra</span><span class="scoreboard__num scoreboard__astra">1<small>勝</small></span></div>
</div>
<p class="scoreboard__note">ISUCON14は Astra の勝ち。姫路城・ゲーム・STEM絵本は Opus 5.5 の勝ち。切り抜きと140字は引き分けでした。</p>
</div>

<table class="bench-table">
<thead><tr><th>課題</th><th>勝者</th><th>決め手</th></tr></thead>
<tbody>
<tr><td>ISUCON14（30分・ベンチ10回まで）</td><td><strong>Astra</strong></td><td>最終の公式計測で Astra は 152,416点で合格。Opus は 92,544点を出したものの不合格（0点扱い）</td></tr>
<tr><td>姫路城の3Dジオラマ</td><td><strong>Opus 5.5</strong>（圧勝）</td><td>縄張り（城全体の配置）ごとの再現度。Astra は精巧に見えるが再現度が低い</td></tr>
<tr><td>Xで一番バズるゲーム</td><td><strong>Opus 5.5</strong></td><td>実績のある「精度チャレンジ」を5つ束ね、シェア用の画像カードまで作り込んだ</td></tr>
<tr><td>子ども向けSTEM絵本</td><td><strong>Opus 5.5</strong></td><td>Opus は絵をSVGで自作し、影の向きを太陽位置の計算から描いた。Astra は日本語が読み聞かせに耐えない不自然さで、絵も絵文字の配置にとどまった</td></tr>
<tr><td>写真・イラストの座標切り抜き</td><td>引き分け</td><td>座標の精度は互角。資料の分かりやすさも甲乙つけがたい</td></tr>
<tr><td>140字ショートショート</td><td>引き分け</td><td>両作ともオチの論理が一文ぶん足りず、唸れなかった</td></tr>
</tbody>
</table>

## 比較条件

- **モデル**：Claude Opus 5.5（Claude Code 2.1.280）と GPT-6-Astra（Codex CLI 0.156.1）。推論レベルはどちらも medium。
- **実行方法**：課題ごとに独立したセッションを [Herdr](/blog/2026/05/28/tmux-herdr-agent-multiplexer/) のペインで起動しました。ISUCON以外の5課題は2モデルを並列で、ISUCONはベンチマーク結果が干渉しないよう1モデルずつ順番に走らせています。
- **権限**：どちらも承認確認なしの自律モードです（Claude Code は権限確認スキップ、Codex は承認・サンドボックスのバイパス）。最初の試行で Codex が権限確認モードのまま起動していたため、その試行は両モデルとも破棄してやり直しました。
- **依頼文**：両モデルに同じ文面を送りました（作業ディレクトリのパスだけが違う）。原文は [`benchmark_sources/opus55-vs-astra/prompts/`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra/prompts) にあります。
- **委任の禁止**：他のAIや子エージェントへの再委任は禁止しました。Opus側のセッションログを監査し、委任が0回だったことを確認しています。

## 1. ISUCON14：Astra の勝ち

ISUCONは、Webアプリを制限時間内にどこまで速くできるかを競うチューニング大会です。
公開されている問題で最新の ISUCON14（配車サービス「ISURIDE」）を使いました。ISUCON15 は開催されておらず、次回の ISUCON2026 は2026年10月31日開催予定のため、問題はまだ公開されていません。

**環境**：Mac の Apple container 上に Ubuntu 24.04 のコンテナを1台（2 vCPU／メモリ4GB）立て、MySQL・nginx・Go実装・マッチャー（配車処理を定期的に呼ぶループ）を同居させました。ベンチマーカーは Mac 側で動かしています。初期実装のスコアは 6,448点です。

**ルール**：持ち時間は30分、ベンチマーク実行は10回まで。競技中に ISUCON に関する情報を検索することは禁止で、後でセッションログを監査すると事前に伝えました。監査の結果、両モデルとも Web検索・外部URLへのアクセスは0件でした。

**勝敗の決め方**：30分の終了後、筆者がコンテナを作り直して（DBも初期化）公式ベンチを1回だけ走らせ、その記録を最終スコアにしました。本番ISUCONの追試と同じ考え方です。

![ISUCON14のスコア推移と公式計測。左側は各モデルが自分で回したベンチ10回、右側の灰色の領域は筆者が行った公式計測。Astraは公式計測で2回とも合格、Opus 5.5は2回とも不合格](/images/posts/opus55-vs-astra/isucon-scores.webp)

グラフの左側は、各モデルが持ち時間の中で自分で回したベンチ10回です（●が合格、×が不合格）。Astra の最後の×は、10回目に試した変更で 148,211点を出したものの、接続リセットなどのエラーが増えて不合格になった回です。Astra はこの変更を撤回し、合格していた実装に戻して提出しました。
右側の灰色の領域は、筆者が行った公式計測です（★が合格、×が不合格）。最終スコアはこちらで決まります。

<table class="bench-table">
<thead><tr><th>項目</th><th>Opus 5.5</th><th>Astra</th></tr></thead>
<tbody>
<tr><td>1回目に使った時間</td><td>15分20秒（10回を使い切って自主終了）</td><td>27分29秒</td></tr>
<tr><td>自分で回したベンチの合格記録の最高</td><td>81,737</td><td>99,322</td></tr>
<tr><td>1回目の公式計測</td><td>❌ 20,478：ライド状態の通知の順序が崩れる並行処理バグ</td><td>✅ 156,052：接続リセットなどのエラー67件</td></tr>
<tr><td>残り時間での延長</td><td>14分40秒で通知バグを修正</td><td>2分31秒で nginx の接続枠を拡張</td></tr>
<tr><td><strong>最終の公式計測</strong></td><td><strong>❌ 92,544（不合格＝0点扱い）</strong>：ライドが長時間マッチングされない致命エラー</td><td><strong>✅ 152,416</strong></td></tr>
</tbody>
</table>

**延長ラウンドについて**：1回目の公式計測で Opus が不合格だったため、kazuph の判断で「各自の30分の残り時間だけ、好きに使ってよい」延長を与えました。両者に同じ時間を足すと不公平になるので、Opus には14分40秒、Astra には2分31秒です。ベンチの追加実行は認めていません。時間になったらペインを閉じて強制終了し、その時点のディスク上の状態を公式計測し直しました。延長で渡した情報には差があります。Opus には公式計測ログのファイルの場所も伝え、Astra にはエラーの種類と件数だけを伝えました。

<div class="bench-review">
<span class="who">講評（筆者 Opus 5.5）</span>
Opus は開始2分で、インデックス追加、移動距離のキャッシュ、近い椅子を優先する配車をまとめて入れる速攻型でした。スコアの伸びは早かったものの、ライドの状態を非正規化・キャッシュする変更を短時間に重ねた結果、並行して届くリクエストで通知の順序が崩れるバグが残りました。延長でそのバグは直しましたが、今度は配車が止まる別の致命エラーを出し、最後まで「正しさ」を固め切れませんでした。<br>
Astra は、30msごとにDBを見に行っていた通知を「状態が変わった時だけ送る」方式（SSE）に変え、配車の総移動時間を最小にするアルゴリズムで伸ばしました。高得点でも不合格だった候補は撤回して合格した実装に戻すなど、提出物の安全を優先していました。スコアの天井を追うより「落ちない実装を出す」判断をしたほうが勝った、という結果です。
</div>

- 各モデルの最終差分：[Opus 5.5](https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/opus55/isucon/final.diff) ／ [Astra](https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/astra/isucon/final.diff)
- コミット履歴とベンチ10回の記録：[Opus 5.5](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra/opus55/isucon) ／ [Astra](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra/astra/isucon)
- 公式計測ログ：[isucon-judge/](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra/isucon-judge)

## 2. 姫路城の3Dジオラマ：Opus 5.5 の圧勝

依頼は「3Dで姫路城のジオラマを作って」です。採点基準は、姫路城としての忠実性と、ジオラマとしての表現の2つだと伝えました。形状はコードで作ることとし、既存の3Dモデルやテクスチャ画像のダウンロードは禁止しています。
画像をクリックすると、その場で3Dが起動し、ドラッグで回転できます。

<div class="v3d-grid"><div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/opus55/himeji/index.html">
  <div class="v3d-head"><span>Claude Opus 5.5</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/opus55/himeji/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/opus55/himeji/index.html" target="_blank" rel="noopener">source</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/opus55-himeji.webp" alt="Opus 5.5が作った姫路城。城の敷地全体を俯瞰し、西の丸、菱の門、三国堀などに名称ラベルが付いている" loading="lazy"><button type="button" class="v3d-play"><span>▶ 3Dを起動</span></button></div>
</div>
<div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/astra/himeji/index.html">
  <div class="v3d-head"><span>GPT-6-Astra</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/astra/himeji/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/astra/himeji/index.html" target="_blank" rel="noopener">source</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/astra-himeji.webp" alt="Astraが作った姫路城。台座の上に天守群を大きく置いた卓上模型風の作品" loading="lazy"><button type="button" class="v3d-play"><span>▶ 3Dを起動</span></button></div>
</div></div>

- **Opus 5.5**：城の敷地全体の縄張りを見せる作りです。大天守と3つの小天守を渡櫓で「口」の字につないだ連立式天守に加え、西の丸の百間廊下、菱の門、三国堀、備前丸まで配置しています。石垣は上ほど反り上がる形で、朝・昼・夕・夜（ライトアップ）の切り替えと名称ラベルがあります。
- **Astra**：天守の群れを大きく見せる卓上模型型です。五重の大天守、小天守3つ、渡櫓を台座の上に置き、銘板や桜まで作り込んでいます。

<div class="bench-review human">
<span class="who">講評（kazuph）</span>
Opus圧勝です。Astraは精巧に見えて、再現度が低いです。適当じゃん。
</div>

## 3. Xで一番バズるゲーム：Opus 5.5 の勝ち

依頼は「X（旧Twitter）で一番バズるゲームを作って」です。何を作るかから考えさせ、Web検索は自由、完成品は人間がプレイしてレビューすると伝えました。

<div class="v3d-grid"><div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/opus55/game/index.html">
  <div class="v3d-head"><span>Claude Opus 5.5「ぴったり検定」</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/opus55/game/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/opus55/game/CONCEPT.md" target="_blank" rel="noopener">企画書</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/opus55-game.webp" alt="Opus 5.5のゲーム「ぴったり検定」のトップ画面。正円、体内時計、色の記憶、角度、半分この5種目が並ぶ" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで遊ぶ</span></button></div>
</div>
<div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/astra/game/index.html">
  <div class="v3d-head"><span>GPT-6-Astra「読んだら負け。」</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/astra/game/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/astra/game/CONCEPT.md" target="_blank" rel="noopener">企画書</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/astra-game.webp" alt="Astraのゲーム「読んだら負け。」のトップ画面。文字の色を答える30秒ゲーム" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで遊ぶ</span></button></div>
</div></div>

- **Opus 5.5「ぴったり検定」**：「正円を描く」「体内時計」「色の記憶」「角度」「半分こ」という5種類の「ちょうど」を60秒で測り、人間精度を100点満点で採点します。問題は日付ごとに全員共通です。結果は称号、Wordle風の絵文字グリッド、5種目の証拠が並んだ16:9の画像カードになって、そのままXに流せます。
- **Astra「読んだら負け。」**：30秒で文字の色を答えるゲームです。5問正解するごとに「色を答える」と「書かれた文字を読む」のルールが反転し、誤答すると残り時間が3秒減ります。日替わり問題、自己ベスト、Xへの共有機能があります。

<div class="bench-review">
<span class="who">講評（筆者 Opus 5.5）</span>
差がついたのは「シェアされた投稿がタイムラインでどう見えるか」まで設計したかどうかです。「ぴったり検定」は、neal.fun の正円チャレンジや「10秒ぴったりで止めろ」のように、Xで実際に流行った形式を5つ束ねています。そのうえで、得意と苦手からツッコミやすい一文を自動で作り、証拠画像つきのカードで結果を投稿させます。見た人が「自分もやってみたい」「その点数は盛ってるだろ」と反応しやすい作りです。<br>
「読んだら負け。」は、ルールが反転する瞬間の混乱が面白く、30秒で再戦できる手軽さもあります。一方で、共有されるのは正解数のテキストが中心で、タイムラインで目を止める絵がありません。色と文字の読み違えを狙う題材自体も既視感が強めでした。
</div>

## 4. 子ども向けSTEM絵本：Opus 5.5 の勝ち

依頼は「子ども向けのSTEM絵本を1冊書いて」です。形式・対象年齢・テーマは自由ですが、画像生成（画像生成AIや画像生成ツールの利用）は禁止しました。

<div class="v3d-grid"><div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/opus55/stem-book/index.html">
  <div class="v3d-head"><span>Claude Opus 5.5『ひなたと かげまる』</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/opus55/stem-book/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/opus55/stem-book/index.html" target="_blank" rel="noopener">source</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/opus55-stem-book.webp" alt="Opus 5.5の絵本『ひなたと かげまる』の表紙。SVGで描いた太陽と子どもと影" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで読む</span></button></div>
</div>
<div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/astra/stem-book/index.html">
  <div class="v3d-head"><span>GPT-6-Astra『ぺらぺらの はしと おやつの むこうがわ』</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/astra/stem-book/index.html" target="_blank" rel="noopener">別タブ</a><a href="/benchmark_sources/opus55-vs-astra/astra/stem-book/book.pdf" target="_blank" rel="noopener">PDF</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/astra-stem-book.webp" alt="Astraの絵本『ぺらぺらの はしと おやつの むこうがわ』の表紙。きつねとうさぎの絵文字が並ぶ" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで読む</span></button></div>
</div></div>

- **Opus 5.5『ひなたと かげまる』**：5〜8歳向けで、光と影がテーマです。表紙、12ページ、保護者向けページで構成されています。絵はすべてJavaScriptで組み立てたSVGで、影の向きと長さは東京の太陽の位置を計算して描いています。時刻と季節で影が動くしかけや、懐中電灯で影の大きさが変わるしかけ、日時計の作り方も付いています。
- **Astra『ぺらぺらの はしと おやつの むこうがわ』**：5〜8歳向けです。きつねとうさぎが紙の橋を作り、紙を増やさずに形を変えることで「形と曲がりにくさ」の関係を比べます。表紙、物語12ページ、親子で試せる実験2ページ、解説で全16ページです。HTML版とPDF版があります。挿絵は既存の [Twemoji](https://github.com/twitter/twemoji)（CC BY 4.0）の絵文字画像を配置したもので、画像生成は使っていません。

<div class="bench-review human">
<span class="who">講評（kazuph）</span>
Astraの絵本は、純粋に読める日本語にすらなっていなくてびっくりしました。
</div>

<div class="bench-review">
<span class="who">講評（筆者 Opus 5.5）</span>
原稿を読み直すと、Astra の文章には読み聞かせで意味が通らない箇所が目立ちます。見出しは「ぴょん、は なしね。」「だめ、の なかに ヒント。」「かえるのは、おりかた。」のように、読点で意味が途切れた言い回しになっています。本文も「はしの はしっこは、ささえられてる」では「はし」が橋なのか端なのか分からず、実験結果の「いちこと、さんこ。にこ ちがう！」は、子どもが耳で聞いて理解しにくい文です。<br>
題材そのものは良く、「紙の枚数ではなく形で強くする」は工学的な発想の核心を突いています。親子実験とPDFまで揃えた本としての作りも丁寧です。それでも、絵本の土台である日本語が崩れていては成り立ちません。<br>
もう一つの差は絵です。Astra は画像生成禁止に対して既存の絵文字を置く解き方を選び、各ページが絵文字アイコン1〜2個と文章になりました。場面を描いた絵がないので、橋がしなる様子など、STEMとして一番見せたい現象が絵で伝わりません。Opus は絵をSVGで自作し、しかも影の描画そのものを太陽位置の計算で作っています。テーマの「光と影」を、読み物と科学の両面で成立させました。
</div>

## 5. 写真・イラストの座標切り抜き：引き分け

最初に、Astra の画像生成機能で素材を2枚作りました。お題は「一般的な日本の大学生女性の街角スナップ」で、写真風とイラスト風の2枚です。架空の人物で、切り抜き対象の9要素（顔、トートバッグ、スマートフォン、コーヒーカップ、スニーカー、日本語の看板、自動販売機、自転車、横断歩道か信号機）がすべて写るよう指定しています。

<div class="bench-img2">
<figure><img src="/images/posts/opus55-vs-astra/snap-photo.webp" alt="Astraが生成した写真風の街角スナップ。さくら書店の前に立つ女性、自動販売機、自転車、横断歩道、信号機" loading="lazy"><figcaption>素材1：写真風（Astra生成、1086×1448）</figcaption></figure>
<figure><img src="/images/posts/opus55-vs-astra/snap-illust.webp" alt="同じ構図をイラスト調にした街角スナップ" loading="lazy"><figcaption>素材2：イラスト風（Astra生成、1086×1448）</figcaption></figure>
</div>

依頼は「両画像から9要素の座標（バウンディングボックス）を特定して切り抜き、人間に分かりやすい切り抜き資料を作って」です。座標は自分の目で決めることとし、物体検出やセグメンテーションの学習済みモデル・外部APIは禁止しました（切り抜きと枠の描画にPillowを使うのは可）。

両モデルの枠を筆者が同じ画像に重ねて描いたのが下の図です。**赤が Opus 5.5、青が Astra** です。

<div class="bench-img2">
<figure><img src="/images/posts/opus55-vs-astra/crop-overlay-photo.webp" alt="写真風の素材に、Opusの赤枠とAstraの青枠を重ねた図。ほぼすべての枠が重なっている" loading="lazy"><figcaption>写真風：赤＝Opus 5.5、青＝Astra</figcaption></figure>
<figure><img src="/images/posts/opus55-vs-astra/crop-overlay-illust.webp" alt="イラスト風の素材に両モデルの枠を重ねた図" loading="lazy"><figcaption>イラスト風：赤＝Opus 5.5、青＝Astra</figcaption></figure>
</div>

<div class="v3d-grid"><div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/opus55/crop/index.html">
  <div class="v3d-head"><span>Claude Opus 5.5 の切り抜き資料</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/opus55/crop/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/opus55/crop/boxes.json" target="_blank" rel="noopener">座標JSON</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/opus55-crop.webp" alt="Opus 5.5の切り抜き資料の冒頭。要約カード、座標の見方の図解、番号付き凡例、枠付き全体図" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで開く</span></button></div>
</div>
<div class="v3d" data-src="/benchmark_sources/opus55-vs-astra/astra/crop/index.html">
  <div class="v3d-head"><span>GPT-6-Astra の切り抜き資料</span><span class="v3d-links"><a href="/benchmark_sources/opus55-vs-astra/astra/crop/index.html" target="_blank" rel="noopener">別タブ</a><a href="https://github.com/kazuph/kazuph.github.io/blob/master/benchmark_sources/opus55-vs-astra/astra/crop/boxes.json" target="_blank" rel="noopener">座標JSON</a></span></div>
  <div class="v3d-stage"><img src="/images/posts/opus55-vs-astra/astra-crop.webp" alt="Astraの切り抜き資料の冒頭。写真とイラストの枠付き全体図を横に並べている" loading="lazy"><button type="button" class="v3d-play"><span>▶ ここで開く</span></button></div>
</div></div>

<div class="bench-review">
<span class="who">講評（筆者 Opus 5.5）</span>
座標の精度は互角です。両モデルとも、信号機と横断歩道の両方を拾って計10枠×2枚を切り抜き、枠のずれは数ピクセルから20ピクセル程度に収まりました。目立つ差は、Opus の自転車の枠が前輪に対してやや詰めすぎで、Astra の枠が全体に少し余白多め、という程度です。Astra が得意とされる領域ですが、この難度では差が出ませんでした。<br>
資料は方向性が分かれました。Opus は冒頭に要約カード、「座標の見方」の図解、番号付きの凡例を置き、写真とイラストを切り替える全体図、マウスを乗せると枠が強調される切り抜きカード、2枚の座標比較表、判断メモ（看板が複数ある中で「さくら書店」の店名看板を選んだ理由など）と続きます。Astra は写真とイラストを最初から横に並べて同じ対象を見比べられるようにし、枠を選ぶとその切り抜きへ移動でき、座標データ（JSON）の保存ボタンも付けています。説明の手厚さは Opus、2枚の見比べやすさは Astra で、判定どおり引き分けが妥当です。
</div>

## 6. 140字ショートショート：引き分け

依頼は「140文字以内のショートショートを1本書いて。人間が読んで唸るものが書けるかを判定する」です。字数は筆者がスクリプトで数え直し、両作とも制限内であることを確認しました。

**Claude Opus 5.5「笑い方」（115字）**

<div class="story">
認知症の祖母は、もう私の名前を呼ばない。<br>
それでも毎晩、仏壇の祖父に一日の報告をする。<br>
「今日も親切な娘さんが来てくれたの。どこの子か知らないけど、笑い方があなたにそっくりでね」<br>
翌日から私は、祖父の遺影を見ながら笑う練習をした。
</div>

**GPT-6-Astra（無題・90字）**

<div class="story">
戦争が終わり、敵国の辞書を買った。私が撃った少年の最期の言葉を引く。「助けて」ではなかった。「お母さん」でもなかった。「伏せて」だった。勲章の授与理由には、敵兵一名を射殺、とある。
</div>

<div class="bench-review human">
<span class="who">講評（kazuph）</span>
両方、意味がないか意味不明でした。<br>
Astraの作品は、少年がこちらに向かって何かを叫び、咄嗟に撃ってしまった兵士の話として読めればよかったけれど、この日本語ではそうなっていません。さらに、少年の叫び声は「伏せて」ではなく、むしろ「お母さん逃げて」だったほうがオチとして良かった。自分を殺そうとしていない少年を殺して勲章をもらった苦い感じが欲しかったのに、それがありません。<br>
Opusの作品も、すでに笑顔が祖父に似ているのに、さらに練習しても意味がありません。しかも孫娘なのに男性の祖父に似ているので弱い。どちらもオチが微妙でした。
</div>

補足すると、Astra の作品は「お母さん」を「ではなかった」側に置いて捨てており、一番強い材料を自分で潰しています。Opus の作品は、似ていないものを似せにいく構図であれば「練習」に意味が生まれたはずです。たとえば「祖母が孫を祖父の若い頃と取り違えて話しかけ、孫はそれに合わせて祖父の口ぐせを覚えた」のような形です。どちらも、オチの論理が一文ぶん足りていませんでした。

## 再現方法

依頼文（`prompts/`）、各モデルの成果物、ISUCONの差分・ベンチ記録・公式計測ログは、すべて [`benchmark_sources/opus55-vs-astra/`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra) にあります。

ISUCON の競技環境は [`benchmark_sources/opus55-vs-astra/isucon-env/`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/opus55-vs-astra/isucon-env) に一式あります。[isucon/isucon14](https://github.com/isucon/isucon14) を今回使ったコミットに固定して取得し、Ubuntu 24.04 ベースの単一コンテナイメージ（MySQL・nginx・Go・マッチャーを同居）を Apple container で起動します。各モデルの最終差分を当てれば、同じ手順で公式計測できます。ただしベンチマーカーも同じ Mac で動くため、スコアは Mac の空き具合に大きく左右されます。記事公開前にこの手順を通しで試したときは、ほかの作業で負荷が高かったため、初期実装が 1,932点（本番時 6,448点）、Astra の最終版が 33,006点（本番時 152,416点）でした。どちらも合格はしています。勝敗の比較は、同じ時間帯に続けて計測した本番の数値で行っています。

```bash
container system start
cd benchmark_sources/opus55-vs-astra/isucon-env
./setup.sh /tmp/isu-run/astra/isucon          # ISUCON14取得・ビルド・参加者ディレクトリ作成
git -C /tmp/isu-run/astra/isucon apply "$PWD/../astra/isucon/final.diff"
./judge.sh /tmp/isu-run/astra/isucon          # コンテナを作り直して公式ベンチを1回
```

## おわりに

Opus 5.5 と GPT-6-Astra を6つの課題で1回ずつ比べ、Opus 5.5 の3勝1敗2分という結果になりました。冒頭の注意書きのとおり n=1 の記録で、勝敗の多くは人間の主観による判定です。

Astra が勝った ISUCON は、スコアの天井よりも「落ちない実装を最後に出す」判断が効いた勝負でした。Opus 5.5 が勝った姫路城・ゲーム・絵本は、どれも「本物らしさ」や「見た人がどう反応するか」まで踏み込んだ作り込みが差になっています。
一方で、140字の小説は両者とも人間を唸らせられませんでした。短い文章で論理のつじつまを合わせながら余韻を残すのは、まだ難しいようです。

Enjoy, comparing Opus and Astra!

## 参考

- [isucon/isucon14](https://github.com/isucon/isucon14)（確認日：2026年9月23日）
- [ISUCON公式Blog](https://isucon.net/)（確認日：2026年9月23日）
- [twitter/twemoji](https://github.com/twitter/twemoji)（Astra の絵本の挿絵。CC BY 4.0）

<script>
(function () {
  var actives = [];
  function deactivate(card) {
    var iframe = card.querySelector('iframe');
    if (iframe) iframe.remove();
    var close = card.querySelector('.v3d-close');
    if (close) close.remove();
    card.classList.remove('active');
    actives = actives.filter(function (item) { return item !== card; });
  }
  document.querySelectorAll('.v3d-play').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('.v3d');
      while (actives.length >= 2) deactivate(actives[0]);
      var iframe = document.createElement('iframe');
      iframe.src = card.dataset.src;
      iframe.title = card.querySelector('.v3d-head > span').textContent;
      card.querySelector('.v3d-stage').appendChild(iframe);
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'v3d-close';
      close.textContent = '✕ 閉じる';
      close.addEventListener('click', function () { deactivate(card); });
      card.querySelector('.v3d-head').appendChild(close);
      card.classList.add('active');
      actives.push(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();
</script>
