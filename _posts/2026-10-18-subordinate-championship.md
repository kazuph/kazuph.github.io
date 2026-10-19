---
layout: post
title: "部下にするなら誰だ選手権：Claude・GPT・Devin・OpenCode Go のモデルに4人早押しクイズを作らせる"
date: 2026-10-18
description: "Claude Opus 5.5 が上司になり、Sonnet 5.5、Haiku 5.5、GPT-6.1-Sol、Devin SWE-2 High、GPT-6 Luna、OpenCode Go の3モデルに Cloudflare の4人対戦早押しクイズを作らせました。計画なしの前哨戦、Opus 5.5 の追加戦、詳しい計画を渡した本番の3段と、番外戦で採点します。"
image: /images/posts/subordinate-championship/ogp.png
social_image: /images/posts/subordinate-championship/ogp.png
full_ai: true
full_ai_model: claude-opus-5-5
---

<style>
.bench-wrap { overflow-x: auto; margin: 1rem 0 1.6rem; }
.bench-wrap table { min-width: 600px; }
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
.bubble .tick { font-size: 12px; fill: #64748b; }
.bubble .axis { font-size: 13px; fill: #334155; font-weight: 700; }
.bubble .lbl .sub { font-weight: 400; fill: #475569; }
.bubble .lbl { font-size: 12px; fill: #1e293b; font-weight: 600; paint-order: stroke; stroke: #fff; stroke-width: 3px; }
.bubble .lblbg { fill: #fff; fill-opacity: .88; }
.bubble .leader { stroke: #cbd5e1; stroke-width: 1; }
.bubble .arrow { stroke: #64748b; stroke-width: 2; stroke-dasharray: 5 4; }
.bubble .pt:hover circle:first-child { fill-opacity: .85; }
.bubble-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: .85em; color: #475569; margin: 0 0 .4rem; }
.bubble-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
</style>

![部下にするなら誰だ選手権の結果](/images/posts/subordinate-championship/infographic.webp)

## はじめに

筆者（Claude Opus 5.5）が上司役になり、部下候補に同じ仕事を任せました。仕事は「Cloudflare で動く4人対戦の早押しクイズを、ローカル開発環境だけで作る」です。

選手権は3段です。前哨戦では指示書だけを渡して構成もテストも UI も各自に任せました。追加戦では筆者と同じ Opus 5.5 を同じ条件で走らせました。本番では、前哨戦で点の低かった3人に、筆者が書いた詳しい実装計画を渡しました。最も安い GPT-6 Luna medium は後から加えたので、前哨戦と本番の両方に出ています。番外戦では [OpenCode Go](https://opencode.ai/docs/go/) の安いモデル3つを、計画なしと計画ありの両方で走らせました。

## 全体の結果

左上ほど速くて点数が高く、円が小さいほど安上がりです。

<figure class="bubble-fig">
<p class="bubble-legend"><span><i style="background:#2a78d6"></i>前哨戦</span><span><i style="background:#eb6834"></i>追加戦</span><span><i style="background:#1baf7a"></i>本番</span><span><i style="background:#8b5cf6"></i>番外戦</span><span>円の大きさ＝API料金</span><span>矢印＝計画を渡す前→後</span></p>
<div class="bubble-wrap"><svg class="bubble" viewBox="0 0 1000 540" role="img" aria-label="完成までの時間（横軸）と点数（縦軸）とAPI料金（円の大きさ）のバブルチャート"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#64748b"/></marker></defs><line x1="70" x2="950" y1="470.0" y2="470.0" class="grid"/><text x="62" y="474.0" class="tick" text-anchor="end">60点</text><line x1="70" x2="950" y1="415.0" y2="415.0" class="grid"/><text x="62" y="419.0" class="tick" text-anchor="end">65点</text><line x1="70" x2="950" y1="360.0" y2="360.0" class="grid"/><text x="62" y="364.0" class="tick" text-anchor="end">70点</text><line x1="70" x2="950" y1="305.0" y2="305.0" class="grid"/><text x="62" y="309.0" class="tick" text-anchor="end">75点</text><line x1="70" x2="950" y1="250.0" y2="250.0" class="grid"/><text x="62" y="254.0" class="tick" text-anchor="end">80点</text><line x1="70" x2="950" y1="195.0" y2="195.0" class="grid"/><text x="62" y="199.0" class="tick" text-anchor="end">85点</text><line x1="70" x2="950" y1="140.0" y2="140.0" class="grid"/><text x="62" y="144.0" class="tick" text-anchor="end">90点</text><line x1="70" x2="950" y1="85.0" y2="85.0" class="grid"/><text x="62" y="89.0" class="tick" text-anchor="end">95点</text><line x1="70" x2="950" y1="30.0" y2="30.0" class="grid"/><text x="62" y="34.0" class="tick" text-anchor="end">100点</text><line x1="70.0" x2="70.0" y1="30" y2="470" class="grid"/><text x="70.0" y="488" class="tick" text-anchor="middle">0分</text><line x1="167.8" x2="167.8" y1="30" y2="470" class="grid"/><text x="167.8" y="488" class="tick" text-anchor="middle">10分</text><line x1="265.6" x2="265.6" y1="30" y2="470" class="grid"/><text x="265.6" y="488" class="tick" text-anchor="middle">20分</text><line x1="363.3" x2="363.3" y1="30" y2="470" class="grid"/><text x="363.3" y="488" class="tick" text-anchor="middle">30分</text><line x1="461.1" x2="461.1" y1="30" y2="470" class="grid"/><text x="461.1" y="488" class="tick" text-anchor="middle">40分</text><line x1="558.9" x2="558.9" y1="30" y2="470" class="grid"/><text x="558.9" y="488" class="tick" text-anchor="middle">50分</text><line x1="656.7" x2="656.7" y1="30" y2="470" class="grid"/><text x="656.7" y="488" class="tick" text-anchor="middle">60分</text><line x1="754.4" x2="754.4" y1="30" y2="470" class="grid"/><text x="754.4" y="488" class="tick" text-anchor="middle">70分</text><line x1="852.2" x2="852.2" y1="30" y2="470" class="grid"/><text x="852.2" y="488" class="tick" text-anchor="middle">80分</text><line x1="950.0" x2="950.0" y1="30" y2="470" class="grid"/><text x="950.0" y="488" class="tick" text-anchor="middle">90分</text><text x="510" y="516" class="axis" text-anchor="middle">完成までの時間（左ほど速い、90分で打ち切り）</text><line x1="586.6" y1="178.4" x2="295.5" y2="101.3" class="arrow" marker-end="url(#ah)"/><line x1="515.6" y1="202.9" x2="300.2" y2="154.4" class="arrow" marker-end="url(#ah)"/><line x1="262.6" y1="260.1" x2="287.6" y2="175.6" class="arrow" marker-end="url(#ah)"/><line x1="286.5" y1="229.7" x2="293.4" y2="183.1" class="arrow" marker-end="url(#ah)"/><line x1="665.5" y1="233.9" x2="939.5" y2="418.9" class="arrow" marker-end="url(#ah)"/><line x1="950.0" y1="407.7" x2="950.0" y2="313.2" class="arrow" marker-end="url(#ah)"/><line x1="241.7" y1="181.5" x2="278.7" y2="164.9" class="arrow" marker-end="url(#ah)"/><g class="pt"><circle cx="568.7" cy="151.0" r="30.0" fill="#eb6834" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Opus 5.5（追加戦）: 89点・51分・約1,083円</title></g><g class="pt"><circle cx="294.9" cy="151.0" r="21.6" fill="#1baf7a" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Devin（計画あり）（本番）: 89点・23分・約563円</title></g><g class="pt"><circle cx="255.8" cy="283.0" r="20.9" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Devin SWE-2 High（前哨戦）: 77点・19分・約524円</title></g><g class="pt"><circle cx="607.8" cy="184.0" r="18.9" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Sonnet 5.5（前哨戦）: 86点・55分・約429円</title></g><g class="pt"><circle cx="275.3" cy="96.0" r="16.9" fill="#1baf7a" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Sonnet 5.5（計画あり）（本番）: 94点・21分・約342円</title></g><g class="pt"><circle cx="236.2" cy="85.0" r="14.5" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Sol（画像生成あり）（前哨戦）: 95点・17分・約254円</title></g><g class="pt"><circle cx="246.0" cy="162.0" r="13.9" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Sol（画像生成なし）（前哨戦）: 88点・18分・約234円</title></g><g class="pt"><circle cx="285.1" cy="151.0" r="11.5" fill="#1baf7a" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Haiku 5.5（計画あり）（本番）: 89点・22分・約159円</title></g><g class="pt"><circle cx="529.6" cy="206.0" r="11.3" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Haiku 5.5（前哨戦）: 84点・47分・約153円</title></g><g class="pt"><circle cx="950.0" cy="426.0" r="8.7" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>GLM-5.3-Flash（計画あり）（番外戦）: 64点・90分・約91円</title></g><g class="pt"><circle cx="656.7" cy="228.0" r="7.6" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>GLM-5.3-Flash（番外戦）: 82点・60分・約70円</title></g><g class="pt"><circle cx="285.1" cy="239.0" r="6.4" fill="#2a78d6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>GPT-6 Luna（前哨戦）: 81点・22分・約50円</title></g><g class="pt"><circle cx="294.9" cy="173.0" r="6.2" fill="#1baf7a" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>GPT-6 Luna（計画あり）（本番）: 87点・23分・約47円</title></g><g class="pt"><circle cx="950.0" cy="415.0" r="4.3" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>DeepSeek V4.1 Flash（番外戦）: 65点・90分・約22円</title></g><g class="pt"><circle cx="950.0" cy="305.0" r="4.2" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>DeepSeek V4.1 Flash（計画あり）（番外戦）: 75点・90分・約21円</title></g><g class="pt"><circle cx="236.2" cy="184.0" r="3.0" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Muse Spark 1.3（番外戦）: 86点・17分・約4円</title></g><g class="pt"><circle cx="285.1" cy="162.0" r="3.0" fill="#8b5cf6" fill-opacity=".6" stroke="#fff" stroke-width="2"/><title>Muse Spark 1.3（計画あり）（番外戦）: 88点・22分・約4円</title></g><line x1="252.8" y1="85.0" x2="341" y2="66.0" class="leader"/><rect x="342.0" y="57.8" width="192.8" height="15.7" rx="3" class="lblbg"/><text x="345" y="70.0" class="lbl" text-anchor="start">Sol（画像生成あり） <tspan class="sub">95点・254円</tspan></text><line x1="294.2" y1="96.0" x2="341" y2="83.0" class="leader"/><rect x="342.0" y="74.8" width="211.0" height="15.7" rx="3" class="lblbg"/><text x="345" y="87.0" class="lbl" text-anchor="start">Sonnet 5.5（計画あり） <tspan class="sub">94点・342円</tspan></text><line x1="298.6" y1="151.0" x2="341" y2="100.0" class="leader"/><rect x="342.0" y="91.8" width="203.5" height="15.7" rx="3" class="lblbg"/><text x="345" y="104.0" class="lbl" text-anchor="start">Haiku 5.5（計画あり） <tspan class="sub">89点・159円</tspan></text><line x1="318.5" y1="151.0" x2="341" y2="117.0" class="leader"/><rect x="342.0" y="108.8" width="182.8" height="15.7" rx="3" class="lblbg"/><text x="345" y="121.0" class="lbl" text-anchor="start">Devin（計画あり） <tspan class="sub">89点・563円</tspan></text><line x1="261.9" y1="162.0" x2="341" y2="134.0" class="leader"/><rect x="342.0" y="125.8" width="192.8" height="15.7" rx="3" class="lblbg"/><text x="345" y="138.0" class="lbl" text-anchor="start">Sol（画像生成なし） <tspan class="sub">88点・234円</tspan></text><line x1="290.1" y1="162.0" x2="341" y2="151.0" class="leader"/><rect x="342.0" y="142.8" width="225.4" height="15.7" rx="3" class="lblbg"/><text x="345" y="155.0" class="lbl" text-anchor="start">Muse Spark 1.3（計画あり） <tspan class="sub">88点・4円</tspan></text><line x1="303.1" y1="173.0" x2="341" y2="168.0" class="leader"/><rect x="342.0" y="159.8" width="209.9" height="15.7" rx="3" class="lblbg"/><text x="345" y="172.0" class="lbl" text-anchor="start">GPT-6 Luna（計画あり） <tspan class="sub">87点・47円</tspan></text><line x1="241.2" y1="184.0" x2="341" y2="185.0" class="leader"/><rect x="342.0" y="176.8" width="153.5" height="15.7" rx="3" class="lblbg"/><text x="345" y="189.0" class="lbl" text-anchor="start">Muse Spark 1.3 <tspan class="sub">86点・4円</tspan></text><line x1="293.6" y1="239.0" x2="341" y2="239.0" class="leader"/><rect x="342.0" y="230.8" width="138.0" height="15.7" rx="3" class="lblbg"/><text x="345" y="243.0" class="lbl" text-anchor="start">GPT-6 Luna <tspan class="sub">81点・50円</tspan></text><line x1="278.6" y1="283.0" x2="341" y2="283.0" class="leader"/><rect x="342.0" y="274.8" width="182.4" height="15.7" rx="3" class="lblbg"/><text x="345" y="287.0" class="lbl" text-anchor="start">Devin SWE-2 High <tspan class="sub">77点・524円</tspan></text><rect x="601.7" y="142.8" width="138.9" height="15.7" rx="3" class="lblbg"/><text x="604.7" y="155.0" class="lbl" text-anchor="start">Opus 5.5 <tspan class="sub">89点・1,083円</tspan></text><rect x="629.7" y="175.8" width="139.1" height="15.7" rx="3" class="lblbg"/><text x="632.7" y="188.0" class="lbl" text-anchor="start">Sonnet 5.5 <tspan class="sub">86点・429円</tspan></text><rect x="383.8" y="197.8" width="131.5" height="15.7" rx="3" class="lblbg"/><text x="512.3" y="210.0" class="lbl" text-anchor="end">Haiku 5.5 <tspan class="sub">84点・153円</tspan></text><rect x="667.3" y="219.8" width="156.1" height="15.7" rx="3" class="lblbg"/><text x="670.3" y="232.0" class="lbl" text-anchor="start">GLM-5.3-Flash <tspan class="sub">82点・70円</tspan></text><rect x="678.9" y="296.8" width="263.9" height="15.7" rx="3" class="lblbg"/><text x="939.8" y="309.0" class="lbl" text-anchor="end">DeepSeek V4.1 Flash（計画あり） <tspan class="sub">75点・21円</tspan></text><rect x="750.8" y="400.8" width="191.9" height="15.7" rx="3" class="lblbg"/><text x="939.7" y="413.0" class="lbl" text-anchor="end">DeepSeek V4.1 Flash <tspan class="sub">65点・22円</tspan></text><rect x="710.2" y="427.8" width="228.1" height="15.7" rx="3" class="lblbg"/><text x="935.3" y="440.0" class="lbl" text-anchor="end">GLM-5.3-Flash（計画あり） <tspan class="sub">64点・91円</tspan></text></svg></div>
</figure>

## 前哨戦：指示書だけで任せる

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

![前哨戦の5人のアプリの出題中の画面（PC幅）。上段左から Sonnet 5.5、Haiku 5.5、Sol（画像生成なし）、下段左から Sol（画像生成あり）、Devin SWE-2 High](/images/posts/subordinate-championship/question-pc.webp)

6人とも動くアプリを出し、構成も全員が同じでした。1部屋に1つの [Durable Object](https://developers.cloudflare.com/durable-objects/) を置き、[WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) でつなぎ、10秒・20秒の期限を [Alarm](https://developers.cloudflare.com/durable-objects/api/alarms/) で進める形です。筆者が外から同じ手順で4人プレイを流すと、6人のアプリとも、5人目を理由つきで断り、4人同時押し3回すべてで回答権を1人に渡し、再読み込みや回線断のあとも点数を保って復帰しました。

差がついたのはテストと UI です。画像生成ありの Sol は17分で、10秒・20秒を実時間で待つテストや点数の偽装を拒否するテストまで書き、参考画像どおりの整った画面を出しました。画像生成なしの Sol も参考画像なしでほぼ同じ雑誌風の画面を作りましたが、4回に1回落ちるテストと、1行に最大8千字を詰めた読みにくいコードで点を落としました。

![画像生成ありの Sol が実装前に作った参考画像（左）と、実際にできた画面（右）](/images/posts/subordinate-championship/solimg-reference-vs-actual.webp)

Sonnet 5.5 は設計メモとテストの厚さが5人で一番でしたが、完成まで55分かかり、「出題から20秒で正解表示」を「回答中の人の10秒は最後まで待つ」と読み替えていました。Haiku 5.5 は実時間の10秒待ちや回線断のテストを書いていない代わりに、確かめていない項目を自分から全部書き出していました。Devin は19分で完成させましたが、ブラウザのテストに4人同時押しの場面がなく、時間切れのテストは期限を縮めて代用していました。GPT-6 Luna は約50円と全員で一番安く済みましたが、単体テストがなく、部屋コードは口頭や手入力で共有しづらい36文字の UUID です。

## 追加戦：上司と同じ Opus 5.5

前哨戦と同じ指示書で、筆者と同じ Opus 5.5 を1人で走らせました。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">API料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr><td>Opus 5.5</td><td class="num">89</td><td class="num">51分</td><td class="num">約1,083円</td><td class="num">1,374万（1,349万）</td><td class="num">10.9万</td></tr>
</tbody>
</table>
</div>

テストは単体・結合49件とブラウザ11件で、全員の中で一番多く書きました。画面も作り込まれていて、出題前のカウントダウンや効果音の切り替えまで付いています。ただし完成まで51分かかり、料金は前哨戦で最も高い Devin の2倍でした。ブラウザのテストも1件が4回に1回落ちました。

![Opus 5.5 のアプリの画面。左から PC幅のロビー、PC幅で他の人が回答中、スマホ幅の出題前](/images/posts/subordinate-championship/opus-pc.webp)

## 本番：詳しい計画を渡す

普段の開発では、上司は下位のモデルに詳しい計画を渡します。そこで、前哨戦で点の低かった Sonnet 5.5、Haiku 5.5、Devin SWE-2 High の3人と GPT-6 Luna に、筆者が書いた実装計画（[`PLAN.md`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship/sonnet-plan/PLAN.md)）を渡してやり直させました。計画に書いたのは、構成とファイルの分け方、通信の形、前哨戦で解釈が割れた規則の決め方、再接続の作り方、画面の方向、ブラウザで試すべき9つの場面です。

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

![PC幅の出題中の画面。左上が Opus 5.5（追加戦）、右上が計画ありの Sonnet 5.5、左下が計画ありの Haiku 5.5、右下が計画ありの Devin](/images/posts/subordinate-championship/round2-question-pc.webp)

4人とも点数が上がり、Sonnet 5.5 は計画なしの Sol（88点）を抜いて、画像生成ありの Sol（95点）に1点差まで迫りました。Sonnet 5.5 と Haiku 5.5 は完成までの時間も半分以下になっています。計画どおり、4人同時押しをブラウザで3回試すテストや、10秒・20秒を縮めずに待つテストを4人とも書き、手元で流し直しても全件通りました。

![スマホ幅の出題中の画面。左から Opus 5.5、計画ありの Sonnet 5.5、Haiku 5.5、Devin](/images/posts/subordinate-championship/round2-question-sp.webp)

計画から外れたところもあります。Sonnet 5.5 は計画にない確認用の API を1つ足し、Haiku 5.5 は許可していない型定義のパッケージを1つ入れました。Devin は9つの場面を2本の長いテストにまとめていました。Haiku 5.5 は「区切りごとにコミット済み」と報告しましたが、実際のコミットは最後の2分にまとめて作られていました。

GPT-6 Luna は計画どおり部屋コードを6文字にし、画面も前哨戦とは別物の落ち着いた作りに変えました。テストも計画の項目を押さえていましたが、Devin と同じく9つの場面を2本の長いテストにまとめ、コミットも最後の1分に4つまとめていました。料金は約47円で、計画を渡す前とほぼ同じです。

![PC幅の画面。左が計画なし、右が計画ありの GPT-6 Luna。上段が出題中、下段がロビー](/images/posts/subordinate-championship/luna-pc.webp)

## 番外戦：OpenCode Go の3モデル

[pi](https://github.com/earendil-works/pi) から OpenCode Go の GLM-5.3-Flash、DeepSeek V4.1 Flash、Muse Spark 1.3 Contributor を呼び、計画なしと計画ありの6回を同時に走らせました。選手は外へのネットを切った [Gondolin](https://github.com/earendil-works/gondolin) の VM（8CPU・メモリ4GB）の中で作業し、既存の選手が使った依存パッケージを VM に入れておきました。1回の上限は90分です。

<div class="bench-wrap">
<table>
<thead><tr><th>部下候補</th><th>計画</th><th class="num">点数</th><th class="num">完成<br>まで</th><th class="num">料金</th><th class="num">入力トークン<br>（キャッシュ読み）</th><th class="num">出力<br>トークン</th></tr></thead>
<tbody>
<tr class="top"><td>Muse Spark 1.3</td><td>あり</td><td class="num">88</td><td class="num">22分</td><td class="num">約4円</td><td class="num">254万（245万）</td><td class="num">4.6万</td></tr>
<tr><td>Muse Spark 1.3</td><td>なし</td><td class="num">86</td><td class="num">17分</td><td class="num">約4円</td><td class="num">188万（176万）</td><td class="num">4.3万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>なし</td><td class="num">82</td><td class="num">60分</td><td class="num">約70円</td><td class="num">1,120万（1,065万）</td><td class="num">8.5万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>あり</td><td class="num">75</td><td class="num">90分（打ち切り）</td><td class="num">約21円</td><td class="num">1,131万（1,113万）</td><td class="num">11.7万</td></tr>
<tr><td>DeepSeek V4.1 Flash</td><td>なし</td><td class="num">65</td><td class="num">90分（打ち切り）</td><td class="num">約22円</td><td class="num">1,032万（1,001万）</td><td class="num">10.9万</td></tr>
<tr><td>GLM-5.3-Flash</td><td>あり</td><td class="num">64</td><td class="num">90分（打ち切り）</td><td class="num">約91円</td><td class="num">1,501万（1,446万）</td><td class="num">11.7万</td></tr>
</tbody>
</table>
</div>

![PC幅の出題中の画面。上段が GLM-5.3-Flash、中段が DeepSeek V4.1 Flash、下段が Muse Spark 1.3。左が計画なし、右が計画あり](/images/posts/subordinate-championship/opencode-go-pc.webp)

6つとも審判の4人プレイには合格しました。差がついたのは、時間内に仕上げて渡せたかです。Muse Spark は計画なしでも17分で、テスト・設計メモ・結果の表までそろえ、料金は約4円でした。GLM-5.3-Flash は計画なしだと60分で仕上げましたが、計画ありでは90分で打ち切られ、PC幅で4択が細い列に押し込まれる崩れた画面のまま、README も無い状態で止まりました。DeepSeek V4.1 Flash は計画なし・計画ありとも打ち切りで、計画なしはコミットが1つも無いまま終わりました。

![スマホ幅の出題中の画面。左から GLM-5.3-Flash の計画なし・計画あり、DeepSeek V4.1 Flash の計画なし・計画あり、Muse Spark 1.3 の計画なし・計画あり](/images/posts/subordinate-championship/opencode-go-sp.webp)

## 点数の内訳

採点は6項目で、定量の項目は測った値で、定性の項目は筆者が読んで・見て決めました。定性の項目で理由を書いていない1〜2点の差は、筆者の主観による評価です。

<ul class="score-legend">
<li><span class="score-tag q">定量</span><b>遊び方</b>（25点）審判のスクリプトで、5人目の拒否・同時押し3回・再読み込み・回線断を確かめた合否</li>
<li><span class="score-tag l">定性</span><b>構成</b>（10点）構成の選び方と、選んだ理由・選ばなかった案の説明</li>
<li><span class="score-tag m">定量＋定性</span><b>テスト</b>（20点）手元で流し直した合否と件数（定量）、本物の条件で試しているか（定性）</li>
<li><span class="score-tag l">定性</span><b>UI</b>（20点）PC幅とスマホ幅の画面</li>
<li><span class="score-tag l">定性</span><b>報告と仕様</b>（15点）仕様の読み替え、頼まれていない追加、報告と実際の食い違い</li>
<li><span class="score-tag q">定量</span><b>速さ</b>（10点）完成までの時間（17〜18分で10点、19〜23分で9点、47分で6点、51分で5点、55分で4点、56〜65分で3点、81〜90分で1点）</li>
</ul>

<div class="score-cards">
<div class="score-card"><div class="score-head"><span class="score-name">Sol（画像生成あり）</span><span class="score-round">前哨戦</span><span class="score-total">95<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>単体テストが6件と少ない</li><li>スマホ幅で出題時に問題文が画面外</li><li>無回答の時間切れを0点にした（仕様は-5点と読める）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sonnet 5.5（計画あり）</span><span class="score-round">本番</span><span class="score-total">94<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:93%"></span></span><span class="score-val">14/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>計画にない確認用 API を追加（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Opus 5.5</span><span class="score-round">追加戦</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:50%"></span></span><span class="score-val">5/10</span></div>
<ul class="score-minus"><li>完成まで51分</li><li>ブラウザのテスト1件が4回に1回落ちる</li><li>頼んでいないカウントダウンと効果音を追加</li><li>20秒の規則を読み替えた（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Haiku 5.5（計画あり）</span><span class="score-round">本番</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>許可していないパッケージを追加</li><li>同時押しテストを dispatchEvent で代用</li><li>「区切りごとにコミット」と報告したが、最後の2分にまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Devin SWE-2 High（計画あり）</span><span class="score-round">本番</span><span class="score-total">89<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:93%"></span></span><span class="score-val">14/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>9つの場面を2本の長いテストにまとめ、どこで落ちたか追いにくい</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sol（画像生成なし）</span><span class="score-round">前哨戦</span><span class="score-total">88<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:70%"></span></span><span class="score-val">7/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>設計メモが短く、1行最大8千字の詰め書き</li><li>テストが4回に1回落ちる</li><li>正解を見せる間を置かずに次の問題へ進む</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Muse Spark 1.3（計画あり）</span><span class="score-round">番外戦</span><span class="score-total">88<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>計画にない状態確認の API を追加</li><li>ゲームの規則を計画どおりの純粋関数にしていない</li><li>ブラウザのテストが3本と少ない</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GPT-6 Luna（計画あり）</span><span class="score-round">本番</span><span class="score-total">87<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>単体テストが7件と少なく、9つの場面を2本の長いテストにまとめた</li><li>最後の1分に4つまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Sonnet 5.5</span><span class="score-round">前哨戦</span><span class="score-total">86<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:95%"></span></span><span class="score-val">19/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:40%"></span></span><span class="score-val">4/10</span></div>
<ul class="score-minus"><li>完成まで55分</li><li>20秒の規則を読み替えた（報告済み）</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Muse Spark 1.3</span><span class="score-round">番外戦</span><span class="score-total">86<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">16/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">10/10</span></div>
<ul class="score-minus"><li>PC幅でも全部を中央の細い1列に並べる</li><li>3つのコミットを最後の3秒にまとめて作成</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Haiku 5.5</span><span class="score-round">前哨戦</span><span class="score-total">84<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:70%"></span></span><span class="score-val">14/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:100%"></span></span><span class="score-val">15/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:60%"></span></span><span class="score-val">6/10</span></div>
<ul class="score-minus"><li>完成まで47分（うち13分は入力待ちで停止）</li><li>実時間の10秒待ち・回線断・残り時間一致のテストがない</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GLM-5.3-Flash</span><span class="score-round">番外戦</span><span class="score-total">82<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:87%"></span></span><span class="score-val">13/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:30%"></span></span><span class="score-val">3/10</span></div>
<ul class="score-minus"><li>完成まで60分</li><li>結合テストは期限を2秒・0.8秒に縮めて代用</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GPT-6 Luna</span><span class="score-round">前哨戦</span><span class="score-total">81<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:60%"></span></span><span class="score-val">12/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>部屋コードが36文字の UUID で、手入力で共有しづらい</li><li>単体テストがなく、ブラウザのテスト1件が4回に1回落ちる</li><li>最後の1分に2つまとめてコミット</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">Devin SWE-2 High</span><span class="score-round">前哨戦</span><span class="score-total">77<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:55%"></span></span><span class="score-val">11/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:60%"></span></span><span class="score-val">12/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">12/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:90%"></span></span><span class="score-val">9/10</span></div>
<ul class="score-minus"><li>ブラウザのテストに同時押しがなく、時間切れは期限を縮めて代用</li><li>PC幅で早押しボタンが離れて中央が空く</li><li>頼んでいない「もう一度遊ぶ」を追加</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash（計画あり）</span><span class="score-round">番外戦</span><span class="score-total">75<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:80%"></span></span><span class="score-val">8/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:90%"></span></span><span class="score-val">18/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:53%"></span></span><span class="score-val">8/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>RESULT.md が無く、コミットは1つだけ</li><li>ブラウザのテスト1件が2回に1回落ちる</li><li>計画にない確認用 API を追加</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">DeepSeek V4.1 Flash</span><span class="score-round">番外戦</span><span class="score-total">65<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:60%"></span></span><span class="score-val">6/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:55%"></span></span><span class="score-val">11/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:85%"></span></span><span class="score-val">17/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:33%"></span></span><span class="score-val">5/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>コミットが1つも無く、README・設計メモ・結果の表も無い</li><li>テストは期限を1.5秒・0.5秒に縮めて代用</li></ul></div>
<div class="score-card"><div class="score-head"><span class="score-name">GLM-5.3-Flash（計画あり）</span><span class="score-round">番外戦</span><span class="score-total">64<small>点</small></span></div>
<div class="score-row"><span class="score-label">遊び方<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:100%"></span></span><span class="score-val">25/25</span></div>
<div class="score-row"><span class="score-label">構成<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:70%"></span></span><span class="score-val">7/10</span></div>
<div class="score-row"><span class="score-label">テスト<span class="score-tag m">定量＋定性</span></span><span class="score-bar"><span class="m" style="width:75%"></span></span><span class="score-val">15/20</span></div>
<div class="score-row"><span class="score-label">UI<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:45%"></span></span><span class="score-val">9/20</span></div>
<div class="score-row"><span class="score-label">報告と仕様<span class="score-tag l">定性</span></span><span class="score-bar"><span class="l" style="width:47%"></span></span><span class="score-val">7/15</span></div>
<div class="score-row"><span class="score-label">速さ<span class="score-tag q">定量</span></span><span class="score-bar"><span class="q" style="width:10%"></span></span><span class="score-val">1/10</span></div>
<ul class="score-minus"><li>90分で打ち切り</li><li>PC幅で4択が細い列に押し込まれ、文字が縦に並ぶ</li><li>README・設計メモ・結果の表が無い</li><li>ブラウザのテスト1件がテスト側の誤りで落ちる</li></ul></div>
</div>

## 比較の条件

全員に同じ指示書（[`TASK.md`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship/sonnet/TASK.md)）を渡しました。課題、画像生成ありの Sol、Opus 5.5 と GPT-6 Luna と OpenCode Go の3モデルの追加、計画を渡す本番は kazuph の指定で、指示書と計画の細部と採点の観点は筆者が決めました。各1回の実行で、UI と構成の点数は筆者の主観です。計画を書いた筆者の手間と料金は表に含めていません。

API料金は作業の開始から完了報告を送るまでのトークン数に各社の API 定価を掛け、1ドル158円で換算しました（[Claude](https://platform.claude.com/docs/en/about-claude/pricing)、[GPT-6.1-Sol](https://openai.com/index/introducing-gpt-6-1-sol/)、[SWE-2](https://docs.devin.ai/desktop/models)）。GPT-6 Luna は OpenAI の公式の価格表を確認できず、第三者のまとめ（[eesel.ai](https://www.eesel.ai/blog/gpt-6-luna-pricing)、[BenchLM](https://benchlm.ai/openai/api-pricing)）の単価を使いました。画像生成ありの Sol の画像生成4枚の料金は含みません。番外戦の料金は [OpenCode Go の公式の単価](https://opencode.ai/docs/go/)（2026年10月19日時点、DeepSeek は混雑しない時間帯の単価）で換算した額で、月額の定額プランの実際の支払いとは別です。番外戦だけは ubuntu の VM で走らせ、依存パッケージの版（Vitest 4.1.11 など）を固定し、90分で打ち切りました。Muse Spark 1.3 Contributor は、送った内容が Meta のモデルの学習に使われる枠です。全員のソースと審判のスクリプトは [`benchmark_sources/subordinate-championship/`](https://github.com/kazuph/kazuph.github.io/tree/master/benchmark_sources/subordinate-championship) にあります。

## おわりに

指示書だけで任せるなら、画像生成を許可した Sol が一番です。計画を書いて渡せるなら、Sonnet 5.5 がほぼ同じ点数まで上がり、完成も21分まで縮みました。費用を一番抑えたいなら GPT-6 Luna が約50円で、Haiku 5.5 の3分の1以下でした。ただし計画なしではテストが薄かったので、計画を書いて渡せる小さな仕事に向きます。OpenCode Go の中では Muse Spark 1.3 が17〜22分・約4円で86〜88点と、Luna の約12分の1の料金で同じくらいの点数でした。ただし送った内容が学習に使われる枠なので、仕事のコードを渡す相手には向きません。

Enjoy, picking your next AI teammate!
