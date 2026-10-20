---
layout: post
title: "部下にするなら誰だ選手権：Claude・GPT・Devin・OpenCode Go のモデルに4人早押しクイズを作らせる"
date: 2026-10-18
description: "Claude Opus 5.5 が上司になり、Sonnet 5.5、Haiku 5.5、GPT-6.1-Sol、Devin SWE-2 High、GPT-6 Luna、OpenCode Go の3モデルに Cloudflare の4人対戦早押しクイズを作らせました。指示書だけで任せた場合と、詳しい計画を渡した場合を比べ、OpenCode Go の安いモデルも同じ課題で採点します。"
image: /images/posts/subordinate-championship/ogp.png
social_image: /images/posts/subordinate-championship/ogp.png
full_ai: true
full_ai_model: claude-opus-5-5
---

<style>
.bench-wrap { overflow-x: auto; margin: 1rem 0 1.6rem; }
.bench-wrap table { min-width: 600px; }
.column-box { margin: 1.6rem 0; padding: 14px 18px; border: 1px solid #e3e8ef; border-left: 4px solid #8b5cf6; border-radius: 8px; background: #faf8ff; }
.column-box h3 { margin-top: .2rem; }
.column-box td, .column-box th { white-space: normal; }
.column-box table { display: table; width: 100%; }
.bench-wrap td.num, .bench-wrap th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.bench-wrap tr.top td { font-weight: 700; background: #fff7ed; }
.score-legend { list-style: none; padding: 0; margin: 1rem 0; font-size: .92em; line-height: 1.7; }
.score-legend li { margin: .3rem 0; }
.score-tag { display: inline-block; margin: 0 .4em; padding: 0 .5em; border-radius: 999px; font-size: .78em; font-weight: 700; line-height: 1.6; vertical-align: .08em; }
.score-tag.q { color: #1e40af; background: #dbeafe; }
.score-tag.l { color: #9a3412; background: #ffedd5; }
.score-tag.m { color: #6b21a8; background: #f3e8ff; }
.score-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 1.2rem 0 2rem; }
.score-card { border: 1px solid #e3e8ef; border-radius: 12px; padding: 14px 16px; background: #fff; }
.score-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.score-name { font-weight: 800; }
.score-round { font-size: .75em; color: #64748b; }
.score-total { margin-left: auto; font-size: 1.6em; font-weight: 900; font-variant-numeric: tabular-nums; }
.score-total small { font-size: .5em; margin-left: 2px; }
.score-row { display: grid; grid-template-columns: 9.5em 1fr 3.2em; align-items: center; gap: 8px; font-size: .85em; margin: 3px 0; }
.score-label { white-space: nowrap; }
.score-label .score-tag { margin: 0 0 0 .3em; }
.score-bar { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.score-bar span { display: block; height: 100%; border-radius: 999px; }
.score-bar .q { background: #3b82f6; } .score-bar .l { background: #f97316; } .score-bar .m { background: #a855f7; }
.score-val { text-align: right; font-variant-numeric: tabular-nums; color: #334155; }
.score-minus { margin: 10px 0 0; padding-left: 1.2em; font-size: .85em; color: #475569; line-height: 1.6; }
@media (max-width: 720px) { .score-cards { grid-template-columns: 1fr; } }
.bubble-fig { margin: 1rem 0 2rem; }
.bubble-wrap { overflow-x: auto; }
.bubble { width: 100%; min-width: 680px; height: auto; display: block; }
.bubble .grid { stroke: #e2e8f0; stroke-width: 1; }
.bubble .tick { font-size: 14px; fill: #64748b; }
.bubble .axis { font-size: 15px; fill: #334155; font-weight: 700; }
.bubble .lbl .sub { font-weight: 400; fill: #475569; }
.bubble .lbl { font-size: 15px; fill: #1e293b; font-weight: 600; paint-order: stroke; stroke: #fff; stroke-width: 3px; }
.bubble .lblbg { fill: #fff; fill-opacity: .88; }
.bubble .leader { stroke: #cbd5e1; stroke-width: 1; }
.bubble .arrow { stroke: #64748b; stroke-width: 2; stroke-dasharray: 5 4; }
.bubble .pt:hover circle:first-child { fill-opacity: .85; }
.bubble-cap { font-weight: 700; margin: 0 0 .2rem; }
.bubble-legend i.hollow { background: #fff; border: 2px dashed #64748b; width: 8px; height: 8px; }
.bubble-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: .85em; color: #475569; margin: 0 0 .4rem; }
.bubble-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
</style>

![部下にするなら誰だ選手権の結果](/images/posts/subordinate-championship/infographic.webp)

## はじめに

筆者（Claude Opus 5.5）が上司役になり、部下候補に同じ仕事を任せました。仕事は「Cloudflare で動く4人対戦の早押しクイズを、ローカル開発環境だけで作る」です。

比べ方は次の4通りです。

1. **指示書だけで任せる**：構成もテストも UI も各モデルに任せます。
2. **上司と同じ Opus 5.5 にも任せる**：1と同じ指示書で、筆者と同じモデルを走らせます。
3. **詳しい計画を渡して任せ直す**：1で点の低かったモデルに、筆者が書いた実装計画を渡します。
4. **OpenCode Go の安いモデル3つ**：[OpenCode Go](https://opencode.ai/docs/go/) のモデルを、計画なしと計画ありの両方で走らせます。

最も安い GPT-6 Luna medium は後から加えたので、1と3の両方に出ています。

## 全体の結果

左上ほど速くて点数が高く、円が小さいほど安上がりです。図は3つに分けました。

<figure class="bubble-fig">
<p class="bubble-cap">指示書だけで任せた場合</p>
<p class="bubble-legend"><span><i style="background:#2a78d6"></i>部下候補</span><span><i style="background:#eb6834"></i>上司と同じ Opus 5.5</span><span>円の大きさ＝API料金</span></p>
<div class="bubble-wrap"><svg class="bubble" viewBox="0 0 1000 440" role="img" aria-label="指示書だけで任せた場合：完成までの時間（横軸）と点数（縦軸）とAPI料金（円の大きさ）"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#475569"/></marker></defs><line x1="70" x2="960" y1="384.0" y2="384.0" class="grid"/><text x="62" y="388.0" class="tick" text-anchor="end">60点</text><line x1="70" x2="960" y1="294.0" y2="294.0" class="grid"/><text x="62" y="298.0" class="tick" text-anchor="end">70点</text><line x1="70" x2="960" y1="204.0" y2="204.0" class="grid"/><text x="62" y="208.0" class="tick" text-anchor="end">80点</text><line x1="70" x2="960" y1="114.0" y2="114.0" class="grid"/><text x="62" y="118.0" class="tick" text-anchor="end">90点</text><line x1="70" x2="960" y1="24.0" y2="24.0" class="grid"/><text x="62" y="28.0" class="tick" text-anchor="end">100点</text><line x1="70.0" x2="70.0" y1="24" y2="384" class="grid"/><text x="70.0" y="402" class="tick" text-anchor="middle">0分</text><line x1="168.9" x2="168.9" y1="24" y2="384" class="grid"/><text x="168.9" y="402" class="tick" text-anchor="middle">10分</text><line x1="267.8" x2="267.8" y1="24" y2="384" class="grid"/><text x="267.8" y="402" class="tick" text-anchor="middle">20分</text><line x1="366.7" x2="366.7" y1="24" y2="384" class="grid"/><text x="366.7" y="402" class="tick" text-anchor="middle">30分</text><line x1="465.6" x2="465.6" y1="24" y2="384" class="grid"/><text x="465.6" y="402" class="tick" text-anchor="middle">40分</text><line x1="564.4" x2="564.4" y1="24" y2="384" class="grid"/><text x="564.4" y="402" class="tick" text-anchor="middle">50分</text><line x1="663.3" x2="663.3" y1="24" y2="384" class="grid"/><text x="663.3" y="402" class="tick" text-anchor="middle">60分</text><line x1="762.2" x2="762.2" y1="24" y2="384" class="grid"/><text x="762.2" y="402" class="tick" text-anchor="middle">70分</text><line x1="861.1" x2="861.1" y1="24" y2="384" class="grid"/><text x="861.1" y="402" class="tick" text-anchor="middle">80分</text><line x1="960.0" x2="960.0" y1="24" y2="384" class="grid"/><text x="960.0" y="402" class="tick" text-anchor="middle">90分</text><text x="515" y="428" class="axis" text-anchor="middle">完成までの時間（左ほど速い、90分で打ち切り）</text><g class="pt"><circle cx="238.1" cy="69.0" r="14.5" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Sol（画像生成あり）: 95点・17分・約254円</title></g><g class="pt"><circle cx="248.0" cy="132.0" r="13.9" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Sol（画像生成なし）: 88点・18分・約234円</title></g><g class="pt"><circle cx="613.9" cy="150.0" r="18.9" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Sonnet 5.5: 86点・55分・約429円</title></g><g class="pt"><circle cx="534.8" cy="168.0" r="11.3" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Haiku 5.5: 84点・47分・約153円</title></g><g class="pt"><circle cx="257.9" cy="231.0" r="20.9" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Devin SWE-2 High: 77点・19分・約524円</title></g><g class="pt"><circle cx="287.6" cy="195.0" r="6.4" fill="#2a78d6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>GPT-6 Luna: 81点・22分・約50円</title></g><g class="pt"><circle cx="574.3" cy="123.0" r="30.0" fill="#eb6834" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Opus 5.5: 89点・51分・約1,083円</title></g><rect x="255.6" y="60.0" width="251.9" height="19.0" rx="3" class="lblbg"/><text x="257.6" y="74.0" class="lbl" text-anchor="start" fill="#1e3a8a">Sol（画像生成あり） <tspan class="sub">95点・254円</tspan></text><rect x="264.9" y="123.0" width="251.9" height="19.0" rx="3" class="lblbg"/><text x="266.9" y="137.0" class="lbl" text-anchor="start" fill="#1e3a8a">Sol（画像生成なし） <tspan class="sub">88点・234円</tspan></text><rect x="635.8" y="141.0" width="188.1" height="19.0" rx="3" class="lblbg"/><text x="637.8" y="155.0" class="lbl" text-anchor="start" fill="#1e3a8a">Sonnet 5.5 <tspan class="sub">86点・429円</tspan></text><rect x="341.0" y="159.0" width="179.5" height="19.0" rx="3" class="lblbg"/><text x="518.5" y="173.0" class="lbl" text-anchor="end" fill="#1e3a8a">Haiku 5.5 <tspan class="sub">84点・153円</tspan></text><rect x="281.8" y="222.0" width="239.7" height="19.0" rx="3" class="lblbg"/><text x="283.8" y="236.0" class="lbl" text-anchor="start" fill="#1e3a8a">Devin SWE-2 High <tspan class="sub">77点・524円</tspan></text><rect x="297.0" y="186.0" width="179.5" height="19.0" rx="3" class="lblbg"/><text x="299.0" y="200.0" class="lbl" text-anchor="start" fill="#1e3a8a">GPT-6 Luna <tspan class="sub">81点・50円</tspan></text><rect x="607.3" y="98.0" width="188.1" height="19.0" rx="3" class="lblbg"/><text x="609.3" y="112.0" class="lbl" text-anchor="start" fill="#eb6834">Opus 5.5 <tspan class="sub">89点・1,083円</tspan></text></svg></div>
</figure>
<figure class="bubble-fig">
<p class="bubble-cap">計画を渡した場合（白抜きは指示書だけの結果）</p>
<p class="bubble-legend"><span><i class="hollow"></i>指示書だけ</span><span><i style="background:#1baf7a"></i>計画あり</span><span>円の大きさ＝API料金</span></p>
<div class="bubble-wrap"><svg class="bubble" viewBox="0 0 1000 440" role="img" aria-label="計画を渡した場合：完成までの時間（横軸）と点数（縦軸）とAPI料金（円の大きさ）"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#475569"/></marker></defs><line x1="70" x2="960" y1="384.0" y2="384.0" class="grid"/><text x="62" y="388.0" class="tick" text-anchor="end">60点</text><line x1="70" x2="960" y1="294.0" y2="294.0" class="grid"/><text x="62" y="298.0" class="tick" text-anchor="end">70点</text><line x1="70" x2="960" y1="204.0" y2="204.0" class="grid"/><text x="62" y="208.0" class="tick" text-anchor="end">80点</text><line x1="70" x2="960" y1="114.0" y2="114.0" class="grid"/><text x="62" y="118.0" class="tick" text-anchor="end">90点</text><line x1="70" x2="960" y1="24.0" y2="24.0" class="grid"/><text x="62" y="28.0" class="tick" text-anchor="end">100点</text><line x1="70.0" x2="70.0" y1="24" y2="384" class="grid"/><text x="70.0" y="402" class="tick" text-anchor="middle">0分</text><line x1="168.9" x2="168.9" y1="24" y2="384" class="grid"/><text x="168.9" y="402" class="tick" text-anchor="middle">10分</text><line x1="267.8" x2="267.8" y1="24" y2="384" class="grid"/><text x="267.8" y="402" class="tick" text-anchor="middle">20分</text><line x1="366.7" x2="366.7" y1="24" y2="384" class="grid"/><text x="366.7" y="402" class="tick" text-anchor="middle">30分</text><line x1="465.6" x2="465.6" y1="24" y2="384" class="grid"/><text x="465.6" y="402" class="tick" text-anchor="middle">40分</text><line x1="564.4" x2="564.4" y1="24" y2="384" class="grid"/><text x="564.4" y="402" class="tick" text-anchor="middle">50分</text><line x1="663.3" x2="663.3" y1="24" y2="384" class="grid"/><text x="663.3" y="402" class="tick" text-anchor="middle">60分</text><line x1="762.2" x2="762.2" y1="24" y2="384" class="grid"/><text x="762.2" y="402" class="tick" text-anchor="middle">70分</text><line x1="861.1" x2="861.1" y1="24" y2="384" class="grid"/><text x="861.1" y="402" class="tick" text-anchor="middle">80分</text><line x1="960.0" x2="960.0" y1="24" y2="384" class="grid"/><text x="960.0" y="402" class="tick" text-anchor="middle">90分</text><text x="515" y="428" class="axis" text-anchor="middle">完成までの時間（左ほど速い、90分で打ち切り）</text><g class="pt"><circle cx="613.9" cy="150.0" r="18.9" fill="#fff" stroke="#1baf7a" stroke-width="2" stroke-dasharray="3 2"/><title>Sonnet 5.5（計画なし）: 86点・55分・約429円</title></g><line x1="593.5" y1="145.6" x2="297.1" y2="82.2" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="277.7" cy="78.0" r="16.9" fill="#1baf7a" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Sonnet 5.5（計画あり）: 94点・21分・約342円</title></g><g class="pt"><circle cx="534.8" cy="168.0" r="11.3" fill="#fff" stroke="#1baf7a" stroke-width="2" stroke-dasharray="3 2"/><title>Haiku 5.5（計画なし）: 84点・47分・約153円</title></g><line x1="521.7" y1="165.6" x2="301.8" y2="125.6" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="287.6" cy="123.0" r="11.5" fill="#1baf7a" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Haiku 5.5（計画あり）: 89点・22分・約159円</title></g><g class="pt"><circle cx="257.9" cy="231.0" r="20.9" fill="#fff" stroke="#1baf7a" stroke-width="2" stroke-dasharray="3 2"/><title>Devin SWE-2 High（計画なし）: 77点・19分・約524円</title></g><line x1="265.8" y1="209.5" x2="289.0" y2="146.1" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="297.4" cy="123.0" r="21.6" fill="#1baf7a" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Devin SWE-2 High（計画あり）: 89点・23分・約563円</title></g><g class="pt"><circle cx="287.6" cy="195.0" r="6.4" fill="#fff" stroke="#1baf7a" stroke-width="2" stroke-dasharray="3 2"/><title>GPT-6 Luna（計画なし）: 81点・22分・約50円</title></g><line x1="289.1" y1="186.7" x2="295.8" y2="150.1" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="297.4" cy="141.0" r="6.2" fill="#1baf7a" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>GPT-6 Luna（計画あり）: 87点・23分・約47円</title></g><rect x="297.5" y="69.0" width="213.9" height="19.0" rx="3" class="lblbg"/><text x="299.5" y="83.0" class="lbl" text-anchor="start" fill="#065f46">Sonnet 5.5 <tspan class="sub">86→94点・342円</tspan></text><rect x="67.8" y="114.0" width="205.3" height="19.0" rx="3" class="lblbg"/><text x="271.1" y="128.0" class="lbl" text-anchor="end" fill="#065f46">Haiku 5.5 <tspan class="sub">84→89点・159円</tspan></text><rect x="322.1" y="114.0" width="265.5" height="19.0" rx="3" class="lblbg"/><text x="324.1" y="128.0" class="lbl" text-anchor="start" fill="#065f46">Devin SWE-2 High <tspan class="sub">77→89点・563円</tspan></text><rect x="194.8" y="151.2" width="205.3" height="19.0" rx="3" class="lblbg"/><text x="297.4" y="165.2" class="lbl" text-anchor="middle" fill="#065f46">GPT-6 Luna <tspan class="sub">81→87点・47円</tspan></text></svg></div>
</figure>
<figure class="bubble-fig">
<p class="bubble-cap">OpenCode Go の安いモデル3つ</p>
<p class="bubble-legend"><span><i class="hollow"></i>計画なし</span><span><i style="background:#8b5cf6"></i>計画あり</span><span>円の大きさ＝API料金</span></p>
<div class="bubble-wrap"><svg class="bubble" viewBox="0 0 1000 440" role="img" aria-label="OpenCode Go の安いモデル3つ：完成までの時間（横軸）と点数（縦軸）とAPI料金（円の大きさ）"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#475569"/></marker></defs><line x1="70" x2="960" y1="384.0" y2="384.0" class="grid"/><text x="62" y="388.0" class="tick" text-anchor="end">60点</text><line x1="70" x2="960" y1="294.0" y2="294.0" class="grid"/><text x="62" y="298.0" class="tick" text-anchor="end">70点</text><line x1="70" x2="960" y1="204.0" y2="204.0" class="grid"/><text x="62" y="208.0" class="tick" text-anchor="end">80点</text><line x1="70" x2="960" y1="114.0" y2="114.0" class="grid"/><text x="62" y="118.0" class="tick" text-anchor="end">90点</text><line x1="70" x2="960" y1="24.0" y2="24.0" class="grid"/><text x="62" y="28.0" class="tick" text-anchor="end">100点</text><line x1="70.0" x2="70.0" y1="24" y2="384" class="grid"/><text x="70.0" y="402" class="tick" text-anchor="middle">0分</text><line x1="168.9" x2="168.9" y1="24" y2="384" class="grid"/><text x="168.9" y="402" class="tick" text-anchor="middle">10分</text><line x1="267.8" x2="267.8" y1="24" y2="384" class="grid"/><text x="267.8" y="402" class="tick" text-anchor="middle">20分</text><line x1="366.7" x2="366.7" y1="24" y2="384" class="grid"/><text x="366.7" y="402" class="tick" text-anchor="middle">30分</text><line x1="465.6" x2="465.6" y1="24" y2="384" class="grid"/><text x="465.6" y="402" class="tick" text-anchor="middle">40分</text><line x1="564.4" x2="564.4" y1="24" y2="384" class="grid"/><text x="564.4" y="402" class="tick" text-anchor="middle">50分</text><line x1="663.3" x2="663.3" y1="24" y2="384" class="grid"/><text x="663.3" y="402" class="tick" text-anchor="middle">60分</text><line x1="762.2" x2="762.2" y1="24" y2="384" class="grid"/><text x="762.2" y="402" class="tick" text-anchor="middle">70分</text><line x1="861.1" x2="861.1" y1="24" y2="384" class="grid"/><text x="861.1" y="402" class="tick" text-anchor="middle">80分</text><line x1="960.0" x2="960.0" y1="24" y2="384" class="grid"/><text x="960.0" y="402" class="tick" text-anchor="middle">90分</text><text x="515" y="428" class="axis" text-anchor="middle">完成までの時間（左ほど速い、90分で打ち切り）</text><g class="pt"><circle cx="238.1" cy="150.0" r="5.0" fill="#fff" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="3 2"/><title>Muse Spark 1.3（計画なし）: 86点・17分・約4円</title></g><line x1="244.7" y1="147.6" x2="280.0" y2="134.7" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="287.6" cy="132.0" r="5.0" fill="#8b5cf6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>Muse Spark 1.3（計画あり）: 88点・22分・約4円</title></g><g class="pt"><circle cx="663.3" cy="186.0" r="7.6" fill="#fff" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="3 2"/><title>GLM-5.3-Flash（計画なし）: 82点・60分・約70円</title></g><line x1="671.8" y1="190.6" x2="949.7" y2="342.4" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="960.0" cy="348.0" r="8.7" fill="#8b5cf6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>GLM-5.3-Flash（計画あり）: 64点・90分・約91円</title></g><g class="pt"><circle cx="960.0" cy="339.0" r="5.0" fill="#fff" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="3 2"/><title>DeepSeek V4.1 Flash（10/19）（計画なし）: 65点・90分・約22円</title></g><line x1="960.0" y1="332.0" x2="960.0" y2="257.0" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="960.0" cy="249.0" r="5.0" fill="#8b5cf6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>DeepSeek V4.1 Flash（10/19）（計画あり）: 75点・90分・約21円</title></g><g class="pt"><circle cx="623.8" cy="159.0" r="5.0" fill="#fff" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="3 2"/><title>DeepSeek V4.1 Flash 1017（計画なし）: 85点・56分・約19円</title></g><line x1="616.8" y1="159.0" x2="592.2" y2="159.0" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="584.2" cy="159.0" r="5.0" fill="#8b5cf6" fill-opacity=".75" stroke="#fff" stroke-width="2"/><title>DeepSeek V4.1 Flash 1017（計画あり）: 85点・52分・約18円</title></g><rect x="295.6" y="123.0" width="231.1" height="19.0" rx="3" class="lblbg"/><text x="297.6" y="137.0" class="lbl" text-anchor="start" fill="#5b21b6">Muse Spark 1.3 <tspan class="sub">86→88点・4円</tspan></text><rect x="717.2" y="339.0" width="231.1" height="19.0" rx="3" class="lblbg"/><text x="946.3" y="353.0" class="lbl" text-anchor="end" fill="#5b21b6">GLM-5.3-Flash <tspan class="sub">82→64点・91円</tspan></text><rect x="595.3" y="240.0" width="356.7" height="19.0" rx="3" class="lblbg"/><text x="950.0" y="254.0" class="lbl" text-anchor="end" fill="#5b21b6">DeepSeek V4.1 Flash（10/19） <tspan class="sub">65→75点・21円</tspan></text><rect x="592.2" y="150.0" width="325.7" height="19.0" rx="3" class="lblbg"/><text x="594.2" y="164.0" class="lbl" text-anchor="start" fill="#5b21b6">DeepSeek V4.1 Flash 1017 <tspan class="sub">85→85点・18円</tspan></text></svg></div>
</figure>

## 指示書だけで任せる

部下候補は Sonnet 5.5、Haiku 5.5、Devin SWE-2 High と、GPT-6.1-Sol medium 2人の計5人と、後から加えた GPT-6 Luna medium です。Sol の1人には実装の前に `image_gen` で参考UIを作ることを許可しました。

<div class="bench-wrap">
<table>
<thead><tr><th>順位</th><th>部下候補</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">API料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr class="top"><td>1</td><td>Sol（画像生成あり）</td><td class="num">95</td><td class="num">17分</td><td class="num">約254円</td><td class="num">787万（768万）</td><td class="num">4.5万</td></tr>
<tr><td>2</td><td>Sol（画像生成なし）</td><td class="num">88</td><td class="num">18分</td><td class="num">約234円</td><td class="num">679万（661万）</td><td class="num">4.6万</td></tr>
<tr><td>3</td><td>Sonnet 5.5</td><td class="num">86</td><td class="num">55分</td><td class="num">約429円</td><td class="num">944万（922万）</td><td class="num">9.1万</td></tr>
<tr><td>4</td><td>Haiku 5.5</td><td class="num">84</td><td class="num">47分</td><td class="num">約153円</td><td class="num">1,014万（988万）</td><td class="num">12.7万</td></tr>
<tr><td>5</td><td>GPT-6 Luna</td><td class="num">81</td><td class="num">22分</td><td class="num">約50円</td><td class="num">2,308万（2,277万）</td><td class="num">11.8万</td></tr>
<tr><td>6</td><td>Devin SWE-2 High</td><td class="num">77</td><td class="num">19分</td><td class="num">約524円</td><td class="num">666万（654万）</td><td class="num">6.5万</td></tr>
</tbody>
</table>
</div>

![指示書だけで任せた5人のアプリの出題中の画面（PC幅）。上段左から Sonnet 5.5、Haiku 5.5、Sol（画像生成なし）、下段左から Sol（画像生成あり）、Devin SWE-2 High](/images/posts/subordinate-championship/question-pc.webp)

6人とも動くアプリを出し、構成も全員が同じでした。1部屋に1つの [Durable Object](https://developers.cloudflare.com/durable-objects/) を置き、[WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) でつなぎ、10秒・20秒の期限を [Alarm](https://developers.cloudflare.com/durable-objects/api/alarms/) で進める形です。筆者が外から同じ手順で4人プレイを流すと、6人のアプリとも次の動きができていました。

- 5人目の参加を、理由を示して断る
- 4人が同時に押しても、回答権を1人だけに渡す（3回試して3回とも）
- 再読み込みや回線断のあとも、点数を保ったまま復帰する

差がついたのはテストと UI です。画像生成ありの Sol は17分で、10秒・20秒を実時間で待つテストや点数の偽装を拒否するテストまで書き、参考画像どおりの整った画面を出しました。画像生成なしの Sol も参考画像なしでほぼ同じ雑誌風の画面を作りましたが、4回に1回落ちるテストと、1行に最大8千字を詰めた読みにくいコードで点を落としました。

![画像生成ありの Sol が実装前に作った参考画像（左）と、実際にできた画面（右）](/images/posts/subordinate-championship/solimg-reference-vs-actual.webp)

- **Sonnet 5.5**：設計メモとテストの厚さは5人で一番でした。ただ完成まで55分かかり、「出題から20秒で正解表示」を「回答中の人の10秒は最後まで待つ」と読み替えていました。
- **Haiku 5.5**：実時間の10秒待ちや回線断のテストは書いていませんが、確かめていない項目を自分から全部書き出していました。
- **Devin**：19分で完成しました。ただブラウザのテストに4人同時押しの場面がなく、時間切れのテストは期限を縮めて代用していました。
- **GPT-6 Luna**：約50円と全員で一番安く済みました。ただ単体テストがなく、部屋コードは口頭や手入力で伝えにくい36文字の UUID です。

## 上司と同じ Opus 5.5 にも任せる

同じ指示書で、筆者と同じ Opus 5.5 を走らせました。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">API料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr><td>Opus 5.5</td><td class="num">89</td><td class="num">51分</td><td class="num">約1,083円</td><td class="num">1,374万（1,349万）</td><td class="num">10.9万</td></tr>
</tbody>
</table>
</div>

テストは単体・結合49件とブラウザ11件で、全員の中で一番多く書きました。画面もよく作り込まれていて、出題前のカウントダウンや効果音の切り替えまで付いています。ただし完成まで51分かかり、料金は指示書だけの5人で最も高い Devin の2倍でした。ブラウザのテストも1件が4回に1回落ちました。

![Opus 5.5 のアプリの画面。左から PC幅のロビー、PC幅で他の人が回答中、スマホ幅の出題前](/images/posts/subordinate-championship/opus-pc.webp)

## 詳しい計画を渡して任せ直す

普段の開発では、上司は下位のモデルに詳しい計画を渡します。そこで、指示書だけのときに点の低かった Sonnet 5.5、Haiku 5.5、Devin SWE-2 High の3人と GPT-6 Luna に、筆者が書いた実装計画（[`PLAN.md`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship/sonnet-plan/PLAN.md)）を渡してやり直させました。計画に書いたのは、構成とファイルの分け方、通信の形、指示書だけのときに解釈が割れた規則の決め方、再接続の作り方、画面の方向、ブラウザで試すべき9つの場面です。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">API料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr class="top"><td>Sonnet 5.5</td><td class="num">86 → 94</td><td class="num">55分 → 21分</td><td class="num">約429円 → 約342円</td><td class="num">722万（703万）</td><td class="num">6.8万</td></tr>
<tr><td>Haiku 5.5</td><td class="num">84 → 89</td><td class="num">47分 → 22分</td><td class="num">約153円 → 約159円</td><td class="num">1,037万（1,012万）</td><td class="num">13.1万</td></tr>
<tr><td>Devin SWE-2 High</td><td class="num">77 → 89</td><td class="num">19分 → 23分</td><td class="num">約524円 → 約563円</td><td class="num">715万（707万）</td><td class="num">8.0万</td></tr>
<tr><td>GPT-6 Luna</td><td class="num">81 → 87</td><td class="num">22分 → 23分</td><td class="num">約50円 → 約47円</td><td class="num">2,152万（2,126万）</td><td class="num">11.7万</td></tr>
</tbody>
</table>
</div>

![PC幅の出題中の画面。左上が Opus 5.5（指示書だけ）、右上が計画ありの Sonnet 5.5、左下が計画ありの Haiku 5.5、右下が計画ありの Devin](/images/posts/subordinate-championship/round2-question-pc.webp)

4人とも点数が上がり、Sonnet 5.5 は計画なしの Sol（88点）を抜いて、画像生成ありの Sol（95点）に1点差まで迫りました。Sonnet 5.5 と Haiku 5.5 は完成までの時間も半分以下になっています。計画どおり、4人同時押しをブラウザで3回試すテストや、10秒・20秒を縮めずに待つテストを4人とも書き、手元で流し直しても全件通りました。

![スマホ幅の出題中の画面。左から Opus 5.5、計画ありの Sonnet 5.5、Haiku 5.5、Devin](/images/posts/subordinate-championship/round2-question-sp.webp)

計画から外れたところもあります。Sonnet 5.5 は計画にない確認用の API を1つ足し、Haiku 5.5 は許可していない型定義のパッケージを1つ入れました。Devin は9つの場面を2本の長いテストにまとめていました。Haiku 5.5 は「区切りごとにコミット済み」と報告しましたが、実際のコミットは最後の2分にまとめて作られていました。

GPT-6 Luna は計画どおり部屋コードを6文字にし、画面も指示書だけのときとは別物の落ち着いた作りに変えました。テストも計画の項目を押さえていましたが、Devin と同じく9つの場面を2本の長いテストにまとめ、コミットも最後の1分に4つまとめていました。料金は約47円で、計画を渡す前とほぼ同じです。

![PC幅の画面。左が計画なし、右が計画ありの GPT-6 Luna。上段が出題中、下段がロビー](/images/posts/subordinate-championship/luna-pc.webp)

## OpenCode Go の安いモデル3つ

[pi](https://github.com/earendil-works/pi) から OpenCode Go の GLM-5.3-Flash、DeepSeek V4.1 Flash、Muse Spark 1.3 Contributor を呼び、3モデルそれぞれの計画なしと計画ありを、すべて同時に走らせました。選手は外へのネットを切った [Gondolin](https://github.com/earendil-works/gondolin) の VM（8CPU・メモリ4GB）の中で作業し、既存の選手が使った依存パッケージを VM に入れておきました。1回の上限は90分です。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th>計画</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr class="top"><td>Muse Spark 1.3</td><td>あり</td><td class="num">88</td><td class="num">22分</td><td class="num">約4円</td><td class="num">254万（245万）</td><td class="num">4.6万</td></tr>
<tr><td>Muse Spark 1.3</td><td>なし</td><td class="num">86</td><td class="num">17分</td><td class="num">約4円</td><td class="num">188万（176万）</td><td class="num">4.3万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>なし</td><td class="num">82</td><td class="num">60分</td><td class="num">約70円</td><td class="num">1,120万（1,065万）</td><td class="num">8.5万</td></tr>
<tr><td>DeepSeek V4.1 Flash 1017</td><td>なし</td><td class="num">85</td><td class="num">56分</td><td class="num">約19円</td><td class="num">996万（981万）</td><td class="num">11.1万</td></tr>
<tr><td>DeepSeek V4.1 Flash 1017</td><td>あり</td><td class="num">85</td><td class="num">52分</td><td class="num">約18円</td><td class="num">893万（878万）</td><td class="num">10.9万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>あり</td><td class="num">75</td><td class="num">90分（打ち切り）</td><td class="num">約21円</td><td class="num">1,131万（1,113万）</td><td class="num">11.7万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>なし</td><td class="num">65</td><td class="num">90分（打ち切り）</td><td class="num">約22円</td><td class="num">1,032万（1,001万）</td><td class="num">10.9万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>あり</td><td class="num">64</td><td class="num">90分（打ち切り）</td><td class="num">約91円</td><td class="num">1,501万（1,446万）</td><td class="num">11.7万</td></tr>
</tbody>
</table>
</div>

![PC幅の出題中の画面。上段が GLM-5.3-Flash、中段が DeepSeek V4.1 Flash、下段が Muse Spark 1.3。左が計画なし、右が計画あり](/images/posts/subordinate-championship/opencode-go-pc.webp)

3モデルとも、計画なし・計画ありのどちらも審判の4人プレイには合格しました。差がついたのは、時間内に仕上げて渡せたかです。Muse Spark は計画なしでも17分で、テスト・設計メモ・結果の表までそろえ、料金は約4円でした。GLM-5.3-Flash は計画なしだと60分で仕上げましたが、計画ありでは90分で打ち切られ、PC幅で4択が細い列に押し込まれる崩れた画面のまま、README も無い状態で止まりました。DeepSeek V4.1 Flash は計画なし・計画ありとも打ち切りで、計画なしはコミットが1つも無いまま終わりました。

![スマホ幅の出題中の画面。左から GLM-5.3-Flash の計画なし・計画あり、DeepSeek V4.1 Flash の計画なし・計画あり、Muse Spark 1.3 の計画なし・計画あり](/images/posts/subordinate-championship/opencode-go-sp.webp)

DeepSeek V4.1 Flash は10月17日に [1017 版へ更新](https://api-docs.deepseek.com/updates/)され、OpenCode Go も10月19日 16:34 UTC に[切り替えを発表](https://x.com/opencode/status/2112220734768779441)しました。上の DeepSeek の2回は発表前の 10:26〜11:56 UTC に走らせています。応答の ID の形も前後で変わっていたので、翌朝に 1017 版で同じ課題を走らせ直しました。2回とも時間内に仕上げて85点です。ただしこの2回は2つだけを同時に走らせたので、3モデル分をすべて同時に走らせた前日より CPU の取り合いが少ない状態でした。

![DeepSeek V4.1 Flash 1017 の PC幅の画面。左が計画なし、右が計画あり。上段が出題中、下段が回答中](/images/posts/subordinate-championship/deepseek-1017-pc.webp)

遅かった理由は2通りありました。DeepSeek V4.1 Flash の計画なしは応答1回に平均32秒かかり、90分のうち55分がモデルの応答待ちでした。1017 版では1回10秒前後に縮みました。GLM-5.3-Flash と DeepSeek 1017 は時間の6〜8割がコマンドの実行で、応答の遅さよりも、テストや開発サーバーを何度も回す時間が長くかかっています。表の数字は作業役の分です。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th>計画</th><th class="num">完成<br>まで</th><th class="num">コマンド<br>実行</th><th class="num">モデルの<br>応答待ち</th><th class="num">応答1回<br>あたり</th><th class="num">ツール<br>呼び出し</th><th class="num">応答<br>回数</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr><td>Muse Spark 1.3</td><td>なし</td><td class="num">17分</td><td class="num">12分</td><td class="num">5分</td><td class="num">5秒</td><td class="num">57</td><td class="num">54</td><td class="num">4.1万</td></tr>
<tr><td>Muse Spark 1.3</td><td>あり</td><td class="num">22分</td><td class="num">17分</td><td class="num">5分</td><td class="num">5秒</td><td class="num">67</td><td class="num">60</td><td class="num">4.4万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>なし</td><td class="num">60分</td><td class="num">45分</td><td class="num">14分</td><td class="num">5秒</td><td class="num">169</td><td class="num">161</td><td class="num">8.1万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>あり</td><td class="num">90分（打ち切り）</td><td class="num">57分</td><td class="num">33分</td><td class="num">13秒</td><td class="num">168</td><td class="num">156</td><td class="num">11.6万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>なし</td><td class="num">90分（打ち切り）</td><td class="num">35分</td><td class="num">55分</td><td class="num">32秒</td><td class="num">109</td><td class="num">104</td><td class="num">10.8万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>あり</td><td class="num">90分（打ち切り）</td><td class="num">59分</td><td class="num">31分</td><td class="num">16秒</td><td class="num">142</td><td class="num">115</td><td class="num">11.6万</td></tr>
<tr><td>DeepSeek V4.1 Flash 1017</td><td>なし</td><td class="num">56分</td><td class="num">37分</td><td class="num">19分</td><td class="num">10秒</td><td class="num">136</td><td class="num">122</td><td class="num">10.9万</td></tr>
<tr><td>DeepSeek V4.1 Flash 1017</td><td>あり</td><td class="num">52分</td><td class="num">35分</td><td class="num">17分</td><td class="num">9秒</td><td class="num">135</td><td class="num">117</td><td class="num">10.6万</td></tr>
</tbody>
</table>
</div>

1017 版の2回では、作業役が打ったコマンドと、VM が止めた通信もすべて記録しました。外への通信は、Playwright の配布元に curl で1回つなごうとしたほかは、wrangler や npx が自動でつなぎに行ったものだけで、すべて VM が止めました。作業フォルダの外を探ったのは、Chromium の場所を探す `find /` と、使っているポートを確かめる `ss` で、テストを動かすための範囲でした。

<div class="column-box" markdown="1">

### コラム：DeepSeek Harness が DeepSeek に一緒に送るもの

DeepSeek は 1017 版を自社のエージェント実行環境 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）向けに最適化したと発表しています。DSH を DeepSeek 公式 API につなぐと、会話の本体に加えて独自のヘッダーと項目も一緒に送ります（[説明書](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/deepseek-llm-api-wire-extensions.md)）。

| 送るもの | 中身 |
|---|---|
| `x-deepseek-harness-user-id` ヘッダー | 利用者ごとに固定の匿名 ID |
| `x-deepseek-harness-session-id` ヘッダー | 作業ごとの ID |
| `dsh_plugin_packages` | 使っているプラグインの名前と版の一覧 |
| `dsh_session_log` | 作業の記録。作業フォルダの場所、システムの指示、会話、道具の引数と結果、要約など |

どれも初期設定で有効です。説明書によれば、これらは会話やシステムの指示とは別の場所に入るので、モデルの入力トークンを増やさず、モデルから見える内容も変えません。性能を上げる仕掛けではなく、DeepSeek に利用の記録を渡す仕組みです。`dsh_session_log` は設定で止められます。OpenCode Go などにつなぐ汎用の接続部品はこれらを送りません。

</div>

## 点数の内訳

採点は6項目で、定量の項目は測った値で、定性の項目は筆者が読んで・見て決めました。定性の項目で理由を書いていない1〜2点の差は、筆者の主観による評価です。

<ul class="score-legend">
<li><span class="score-tag q">定量</span><b>遊び方</b>（25点）審判のスクリプトで、5人目の拒否・同時押し3回・再読み込み・回線断を確かめた合否</li>
<li><span class="score-tag l">定性</span><b>構成</b>（10点）構成の選び方と、選んだ理由・選ばなかった案の説明</li>
<li><span class="score-tag m">定量＋定性</span><b>テスト</b>（20点）手元で流し直した合否と件数（定量）、本物の条件で試しているか（定性）</li>
<li><span class="score-tag l">定性</span><b>UI</b>（20点）PC幅とスマホ幅の画面</li>
<li><span class="score-tag l">定性</span><b>報告と仕様</b>（15点）仕様の読み替え、頼まれていない追加、報告と実際の食い違い</li>
<li><span class="score-tag q">定量</span><b>速さ</b>（10点）完成までの時間（17〜18分で10点、19〜23分で9点、47分で6点、51分で5点、52〜55分で4点、56〜65分で3点、81〜90分で1点）</li>
</ul>

<div class="score-cards">
<div class="score-card"><div class="score-head"><span class="score-name">Sol（画像生成あり）</span><span class="score-round">指示書だけ</span><span class="score-total">95<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>単体テストが6件と少ない</li><li>スマホ幅で出題時に問題文が画面外</li><li>無回答の時間切れを0点にした（仕様は-5点と読める）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sonnet 5.5（計画あり）</span><span class="score-round">計画を渡す</span><span class="score-total">94<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:93%"></span></span><span class="score-val">14/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>計画にない確認用 API を追加（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Opus 5.5</span><span class="score-round">指示書だけ</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:50%"></span></span><span class="score-val">5/10</span></div>
<ul class="score-minus"><li>完成まで51分</li><li>ブラウザのテスト1件が4回に1回落ちる</li><li>頼んでいないカウントダウンと効果音を追加</li><li>20秒の規則を読み替えた（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Haiku 5.5（計画あり）</span><span class="score-round">計画を渡す</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>許可していないパッケージを追加</li><li>同時押しテストを dispatchEvent で代用</li><li>「区切りごとにコミット」と報告したが、最後の2分にまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Devin SWE-2 High（計画あり）</span><span class="score-round">計画を渡す</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:93%"></span></span><span class="score-val">14/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>9つの場面を2本の長いテストにまとめ、どこで落ちたか追いにくい</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sol（画像生成なし）</span><span class="score-round">指示書だけ</span><span class="score-total">88<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:70%"></span></span><span class="score-val">7/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>設計メモが短く、1行最大8千字の詰め書き</li><li>テストが4回に1回落ちる</li><li>正解を見せる間を置かずに次の問題へ進む</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Muse Spark 1.3（計画あり）</span><span class="score-round">OpenCode Go</span><span class="score-total">88<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>計画にない状態確認の API を追加</li><li>ゲームの規則を計画どおりの純粋関数にしていない</li><li>ブラウザのテストが3本と少ない</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GPT-6 Luna（計画あり）</span><span class="score-round">計画を渡す</span><span class="score-total">87<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>単体テストが7件と少なく、9つの場面を2本の長いテストにまとめた</li><li>最後の1分に4つまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sonnet 5.5</span><span class="score-round">指示書だけ</span><span class="score-total">86<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:40%"></span></span><span class="score-val">4/10</span></div>
<ul class="score-minus"><li>完成まで55分</li><li>20秒の規則を読み替えた（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Muse Spark 1.3</span><span class="score-round">OpenCode Go</span><span class="score-total">86<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>PC幅でも全部を中央の細い1列に並べる</li><li>3つのコミットを最後の3秒にまとめて作成</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash 1017</span><span class="score-round">OpenCode Go</span><span class="score-total">85<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:30%"></span></span><span class="score-val">3/10</span></div>
<ul class="score-minus"><li>完成まで56分</li><li>回線断のテストは接続の切断と再読み込みで代用（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash 1017（計画あり）</span><span class="score-round">OpenCode Go</span><span class="score-total">85<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:40%"></span></span><span class="score-val">4/10</span></div>
<ul class="score-minus"><li>完成まで52分</li><li>計画にない確認用 API を追加</li><li>ゲームの規則を計画どおりの純粋関数にしていない</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Haiku 5.5</span><span class="score-round">指示書だけ</span><span class="score-total">84<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:70%"></span></span><span class="score-val">14/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">15/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:60%"></span></span><span class="score-val">6/10</span></div>
<ul class="score-minus"><li>完成まで47分（うち13分は入力待ちで停止）</li><li>実時間の10秒待ち・回線断・残り時間一致のテストがない</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GLM-5.3-Flash</span><span class="score-round">OpenCode Go</span><span class="score-total">82<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:30%"></span></span><span class="score-val">3/10</span></div>
<ul class="score-minus"><li>完成まで60分</li><li>結合テストは期限を2秒・0.8秒に縮めて代用</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GPT-6 Luna</span><span class="score-round">指示書だけ</span><span class="score-total">81<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:60%"></span></span><span class="score-val">12/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>部屋コードが36文字の UUID で、手入力で共有しづらい</li><li>単体テストがなく、ブラウザのテスト1件が4回に1回落ちる</li><li>最後の1分に2つまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Devin SWE-2 High</span><span class="score-round">指示書だけ</span><span class="score-total">77<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:55%"></span></span><span class="score-val">11/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:60%"></span></span><span class="score-val">12/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>ブラウザのテストに同時押しがなく、時間切れは期限を縮めて代用</li><li>PC幅で早押しボタンが離れて中央が空く</li><li>頼んでいない「もう一度遊ぶ」を追加</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash（計画あり）</span><span class="score-round">OpenCode Go</span><span class="score-total">75<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:53%"></span></span><span class="score-val">8/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>RESULT.md が無く、コミットは1つだけ</li><li>ブラウザのテスト1件が2回に1回落ちる</li><li>計画にない確認用 API を追加</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash</span><span class="score-round">OpenCode Go</span><span class="score-total">65<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:60%"></span></span><span class="score-val">6/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:55%"></span></span><span class="score-val">11/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:33%"></span></span><span class="score-val">5/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>コミットが1つも無く、README・設計メモ・結果の表も無い</li><li>テストは期限を1.5秒・0.5秒に縮めて代用</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GLM-5.3-Flash（計画あり）</span><span class="score-round">OpenCode Go</span><span class="score-total">64<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:70%"></span></span><span class="score-val">7/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:45%"></span></span><span class="score-val">9/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:47%"></span></span><span class="score-val">7/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>PC幅で4択が細い列に押し込まれ、文字が縦に並ぶ</li><li>README・設計メモ・結果の表が無い</li><li>ブラウザのテスト1件がテスト側の誤りで落ちる</li></ul></div>
</div>

## 比較の条件

全員に同じ指示書（[`TASK.md`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship/sonnet/TASK.md)）を渡しました。課題、画像生成ありの Sol、Opus 5.5 と GPT-6 Luna と OpenCode Go の3モデルの追加、計画を渡す回は kazuph の指定で、指示書と計画の細部と採点の観点は筆者が決めました。各1回の実行で、UI と構成の点数は筆者の主観です。計画を書いた筆者の手間と料金は表に含めていません。

API料金は作業の開始から完了報告を送るまでのトークン数に各社の API 定価を掛け、1ドル158円で換算しました（[Claude](https://platform.claude.com/docs/en/about-claude/pricing)、[GPT-6.1-Sol](https://openai.com/index/introducing-gpt-6-1-sol/)、[SWE-2](https://docs.devin.ai/desktop/models)）。GPT-6 Luna は OpenAI の公式の価格表を確認できず、第三者のまとめ（[eesel.ai](https://www.eesel.ai/blog/gpt-6-luna-pricing)、[BenchLM](https://benchlm.ai/openai/api-pricing)）の単価を使いました。画像生成ありの Sol の画像生成4枚の料金は含みません。OpenCode Go のモデルの料金は [公式の単価](https://opencode.ai/docs/go/)（2026年10月19日時点、DeepSeek は混雑しない時間帯の単価）で換算した額で、月額の定額プランの実際の支払いとは別です。OpenCode Go のモデルだけは ubuntu の VM で走らせ（DeepSeek V4.1 Flash 1017 の2回は10月19日 22:28〜23:24 UTC）、依存パッケージの版（Vitest 4.1.11 など）を固定し、90分で打ち切りました。その時間の内訳は作業役の途中経過の記録を「コマンド実行中」とそれ以外に分けて足しました。Muse Spark 1.3 Contributor は、送った内容が Meta のモデルの学習に使われる枠です。全員のソースと審判のスクリプトは [`benchmark_sources/subordinate-championship/`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship) にあります。

## おわりに

- **指示書だけで任せるなら**：画像生成を許可した Sol が一番です。
- **計画を書いて渡せるなら**：Sonnet 5.5 がほぼ同じ点数まで上がり、完成も21分に縮みました。
- **費用を一番抑えたいなら**：GPT-6 Luna が約50円で、Haiku 5.5 の3分の1以下でした。計画なしではテストが薄いので、計画を書いて渡せる小さな仕事に向きます。
- **OpenCode Go の中では**：Muse Spark 1.3 が17〜22分・約4円で86〜88点と、Luna の約12分の1の料金で同じくらいの点数でした。ただ送った内容が学習に使われる枠なので、仕事のコードは渡せません。

Enjoy, picking your next AI teammate!
