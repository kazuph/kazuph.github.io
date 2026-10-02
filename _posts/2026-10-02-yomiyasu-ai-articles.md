---
layout: post
title: "過去のAI記事に読みやすを適用してみた"
date: 2026-10-02
description: "過去22記事の111箇所をyomiyasuの方針で推敲しました。実際の修正前後を横並びで比較し、本人コメントや検証データを残した理由も説明します。"
full_ai: true
full_ai_model: "GPT-6 Astra Pro"
---

<style>
.yomiyasu-article { max-width: 1040px; margin-inline: auto; }
.yomiyasu-article .yms-scroll { max-width: 100%; overflow-x: auto; margin: 1rem 0; border: 1px solid #d7dfe8; border-radius: 8px; }
.post-body .yomiyasu-article table.yms-compare { display: table; table-layout: fixed; width: 100%; min-width: 0; margin: 0; border-collapse: collapse; }
.yomiyasu-article .yms-compare th, .yomiyasu-article .yms-compare td { width: 50%; padding: 16px 20px; vertical-align: top; white-space: normal; overflow-wrap: anywhere; line-height: 1.9; text-align: left; }
.yomiyasu-article .yms-compare th:first-child { background: #aa2646; color: #fff; }
.yomiyasu-article .yms-compare th:last-child { background: #204774; color: #fff; }
.yomiyasu-article .yms-compare td:first-child { background: #fff7f8; }
.yomiyasu-article .yms-compare td:last-child { background: #f4f8fd; }
.yomiyasu-article .yms-compare td p { margin: 0; }
.yomiyasu-article .yms-compare mark { color: inherit; background: transparent; font-weight: 700; text-decoration: underline; text-underline-offset: .2em; }
.yomiyasu-article .yms-source { font-size: .9rem; }
.yomiyasu-article h2 { margin-top: 2.4rem; }
@media (max-width: 680px) {
  .yomiyasu-article .yms-compare th, .yomiyasu-article .yms-compare td { padding: 10px; font-size: 14px; line-height: 1.8; }
}
</style>

<div class="yomiyasu-article" markdown="1">

このブログの過去記事に、[yomiyasu（よみやす）](https://github.com/nanaism/yomiyasu)を適用しました。対象を調べると、記事の意味は通じても、「比較相手にモデルを置く」「Metalを使わない方に倒す」など、読者が意味を補う必要のある言い回しが残っていました。

既存22記事の111箇所を修正しました。技術的な内容を再調査して更新したのではなく、元の記事に書かれた内容を保って、日本語の説明を直しています。

推敲と本記事の執筆はChatGPTで行いました。過去記事の`full_ai`と`full_ai_model`は変更していません。そこに表示されるのは、今回推敲したAIではなく、元の原稿を書いたモデルです。

## yomiyasuは何をするものか

[yomiyasuのSKILL.md](https://github.com/nanaism/yomiyasu/blob/f03aecd9c4c4a69e229f3848ecba66c3871f734c/SKILL.md)には、主語と述語の対応、曖昧な比喩、重複した説明、文同士のつながりを見直す手順が書かれています。単語を一括置換するツールではなく、AIが文章を推敲するときに使うAgent Skillです。同梱のPythonスクリプトは、見直し候補を検出するためのものです。

今回参照した版では、主張、評価の比重、言い切りの強さ、文の働きを変えないことが最優先になっています。「重要なのは」を見つけたら必ず削る、といった使い方ではありません。何が重要かを述べている文なら、その評価は残します。

用途別には`tech`、`business`、`essay`があります。今回は[技術記事向けの仕様](https://github.com/nanaism/yomiyasu/blob/f03aecd9c4c4a69e229f3848ecba66c3871f734c/references/domains/tech.md)を中心に、AIが書いた技術説明を推敲しました。本人の体験談を`essay`で書き直す作業はしていません。

## 何を直し、何を残したか

このブログでは、記事の指示はkazuph本人が出し、執筆はAIが担当しています。本人からの確認に基づき、`full_ai`の有無にかかわらず既存22記事を対象にしました。TmuxPal、scrcpy、Finderも含みます。Zennから取り込む記事と、過去の発表スライドは対象外です。

記事をAIが執筆していても、全ての文章を変更してよいとは限りません。対象記事の中にも本人の依頼文や講評があります。また、ベンチマークで生成された小説や、他のAIの回答を原文として掲載した部分は、比較の資料です。これらも推敲しませんでした。

コード、コマンド、ログ、数値表、出題プロンプト、生成作品、画像やデモの参照先も保持しています。文章を読みやすくするために、過去の実験条件や結果まで変えてしまわないためです。

## 実際の修正前後

以下は今回の変更に含まれる原文と修正文です。比較用に新しく作った例文ではありません。スマートフォンでも、修正前後を横並びで表示します。

### 1. モデルと生成結果を区別する

<p class="yms-source">出典 <a href="{% post_url 2026-09-03-gemini35-to-38-vs-opus5-diagram-benchmark %}">Gemini 3.5〜3.8 FlashとOpus 5の図解比較</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="モデルと生成結果の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>比較相手には、2026年7月31日のベンチマークで<mark>生成したClaude Opus 5を置いています</mark>。</p></td><td><p>比較には、2026年7月31日のベンチマークで<mark>Claude Opus 5が生成した結果を使っています</mark>。</p></td></tr></tbody>
</table>
</div>

元の文をそのまま読むと、ベンチマークで「Claude Opus 5を生成した」ようにも読めます。比較に使ったのはモデルそのものではなく、そのモデルの生成結果です。誰が何を生成したのかを直し、過去の結果を再利用したことも残しました。

### 2. AIの作業説明を短くする

<p class="yms-source">出典 <a href="{% post_url 2026-09-03-gemini35-to-38-vs-opus5-diagram-benchmark %}">同記事のFull AIの説明</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="AIの作業説明の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>この記事は、既存プロンプトの再利用、各モデルによるソース生成、機械検証、記事化までを<mark>AIで進めるFull AI方式で作成しています</mark>。</p></td><td><p>既存プロンプトの再利用、各モデルによるソース生成、機械検証、記事作成までを<mark>AIで行いました</mark>。</p></td></tr></tbody>
</table>
</div>

AIが担当した工程は全て残しました。「記事化」「方式で作成」と説明を重ねず、実際に行った作業を一度だけ書いています。AI執筆であることを隠す変更ではありません。

### 3. 性格付けを、実装した内容に戻す

<p class="yms-source">出典 <a href="{% post_url 2026-09-24-opus55-vs-astra-benchmark %}">Opus 5.5とAstraのISUCON講評</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="ISUCON講評の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>Opus は開始2分で、インデックス追加、移動距離のキャッシュ、近い椅子を優先する配車を<mark>まとめて入れる速攻型でした</mark>。</p></td><td><p>Opusは開始2分で、インデックス追加、移動距離のキャッシュ、近い椅子を優先する配車を<mark>まとめて実装しました</mark>。</p></td></tr></tbody>
</table>
</div>

「速攻型」という性格付けを外しても、開始2分で複数の変更を入れたことから、作業の速さは伝わります。時間と実装内容は変えていません。

### 4. 障害の状態を具体的にする

<p class="yms-source">出典 <a href="{% post_url 2026-06-30-macos-clock-dns-ntp-recovery %}">macOSの時計とDNSの復旧記事</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="DNSの説明の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p><mark>DNS が壊れている時は、</mark></p></td><td><p><mark>DNSで名前解決できない時は、</mark></p></td></tr></tbody>
</table>
</div>

この箇所は文頭の抜粋です。前後には名前解決の失敗を示すログがあるため、「壊れている」が何を指すのかを具体的に書けます。ログにない原因を追加したり、NTP通信全体の失敗と決めつけたりはしていません。

### 5. 不要な否定対比を整理する

<p class="yms-source">出典 <a href="{% post_url 2026-07-01-karukan-macos-ime-install %}">KarukanのMetalに関する説明</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="Metalの説明の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>つまり、いまの実装は「Metal を使っていない」のではなく、<mark>「GPT-2 では Metal を使わない方に倒している」</mark>状態です。</p></td><td><p>つまり、現行の実装ではGPT-2の問題を避けるため、<mark>意図的にMetalを使わないようにしています</mark>。</p></td></tr></tbody>
</table>
</div>

元の文が伝えたかったのは、単なる未対応ではなく、問題を避けるための意図的な選択だという点です。その理由は直前にも書かれているので、比喩を使わずに説明しました。

### 6. 「重要」を消さず、文の形を直す

<p class="yms-source">出典 <a href="{% post_url 2026-06-30-macos-clock-dns-ntp-recovery %}">macOS復旧記事の切り分け方</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="重要性を残した修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p><mark>ここで重要なのは、</mark>NTP 通信そのものが失敗しているのか、NTP サーバー名の DNS 解決だけが失敗しているのかを分けることです。</p></td><td><p>NTP通信そのものの失敗と、NTPサーバー名のDNS解決の失敗を<mark>切り分けることが重要です</mark>。</p></td></tr></tbody>
</table>
</div>

「重要なのは」を単に削ると、著者が強調した判断まで消えます。重要性は述語に残し、比較する二つの失敗を短く書きました。

### 7. 評価の強さは変えない

<p class="yms-source">出典 <a href="{% post_url 2026-07-31-grok45-vs-opus5-diagram-benchmark %}">Grok 4.5、Opus 5、Gemini 3.5 Flashの図解比較</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="評価を残した修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p><mark>結論から言うと、今回の並びでは</mark> <strong>Claude Opus 5 が明らかに圧勝</strong> でした。</p></td><td><p><mark>今回の比較では、</mark>Claude Opus 5が明らかに圧勝でした。</p></td></tr></tbody>
</table>
</div>

前置きと太字を削り、元の記事の「明らかに圧勝」という評価は残しています。今回の推敲でベンチマークを採点し直したわけではありません。「圧勝」を機械的に弱い評価へ置き換えるのも、意味の変更になります。

### 8. 本人のコメントはそのまま残す

<p class="yms-source">出典 <a href="{% post_url 2026-09-24-opus55-vs-astra-benchmark %}">姫路城の講評（kazuph）</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="変更しなかった本人コメント">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（本人コメント）</th><th scope="col">修正後（変更なし）</th></tr></thead>
<tbody><tr><td><p>Opus圧勝です。Astraは精巧に見えて、再現度が低いです。適当じゃん。</p></td><td><p>Opus圧勝です。Astraは精巧に見えて、再現度が低いです。適当じゃん。</p></td></tr></tbody>
</table>
</div>

この文章は`講評（kazuph）`と明示されています。同じ記事にあるAIの講評は直しましたが、本人の言葉は触っていません。Karukanの記事にある感想の引用や、Sonnet 5の記事末尾の人間コメントも保持しました。

### 9. TmuxPalの検出対象を明記する

<p class="yms-source">出典 <a href="{% post_url 2026-05-13-tmuxpal-from-codex-pet %}">TmuxPalのAI pane検出</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="TmuxPalの検出対象の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>tmux 全体の pane を見渡しながら、<mark>AI っぽいものだけを抜く</mark>、という実装です。</p></td><td><p>tmux全体のpaneから、<mark>AIのTUIと判定したものだけを選ぶ</mark>実装です。</p></td></tr></tbody>
</table>
</div>

直前には、コマンド名、pane title、process argumentを使って判定する説明があります。その結果として何を選ぶのかを明記しました。TmuxPalの記事では、このほか監視方法とキャッシュ期間など、計9箇所を直しています。最初の依頼文と実装方針の引用は変更していません。

### 10. scrcpyのランチャーが行うことを書く

<p class="yms-source">出典 <a href="{% post_url 2026-05-14-scrcpy-macos-app-launcher %}">scrcpyをmacOSアプリにする説明</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="scrcpyのランチャーの修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>今回は Homebrew で入っている <code>scrcpy</code> を、<mark>薄い AppleScript アプリで包んで</mark> <code>/Applications/scrcpy.app</code> にしました。</p></td><td><p>今回はHomebrewで入っている <code>scrcpy</code> を<mark>起動するAppleScriptアプリを作り</mark>、<code>/Applications/scrcpy.app</code> にしました。</p></td></tr></tbody>
</table>
</div>

「薄い」「包む」ではなく、既存のscrcpyを起動するアプリだと書きました。scrcpyの記事では、実行ファイルの検索やログの説明など計6箇所を修正しています。コマンドと実行ログはそのまま残しました。

### 11. Finder連携の役割分担を書く

<p class="yms-source">出典 <a href="{% post_url 2026-05-15-finder-paste-clipboard-image %}">Finderの画像貼り付けとKarabinerの役割</a></p>

<div class="yms-scroll" tabindex="0" role="region" aria-label="Finder連携の役割分担の修正前後">
<table class="yms-compare">
<thead><tr><th scope="col">修正前（原文）</th><th scope="col">修正後</th></tr></thead>
<tbody><tr><td><p>Karabiner 側は <code>Cmd+V</code> を Finder 前面のときだけ<mark>このスクリプトへ渡す係です</mark>。</p></td><td><p>Karabinerは、Finderが前面のときだけ <code>Cmd+V</code> に応じて<mark>スクリプトを呼び出します</mark>。</p></td></tr></tbody>
</table>
</div>

Karabinerがショートカットに反応してスクリプトを呼び出し、スクリプト側が貼り付ける内容を判定する、と役割を分けて説明しました。Finderの記事は計7箇所の修正です。通常のファイル貼り付けに影響する可能性と、別のショートカットを使う場合の注意は削っていません。

## 今回、どこで役立ったか

比較記事の導入では、何を比較に使ったのかを明記できました。実装や障害対応の説明では、比喩を具体的な動作や状態に置き換えられました。AIが作業工程を説明する段落では、同じ内容を重ねずに書けています。

一方、条件が整理された表、再現コマンド、すでに自然な説明まで作り直す必要はありませんでした。Liquid DOMの記事では、一つの言い回しだけを直しています。全記事を均一な文体に変えるよりも、引っかかる箇所を直す方針です。

リンターは「解像度」など、技術用語として必要な言葉にも反応します。また、出題文や引用にある表現まで検出する場合があります。警告を全て消すことは目標にせず、文章の意味と掲載目的を確認しました。

読み速度や理解度の読者テストは行っていません。そのため、「可読性が何％向上した」といった効果は示していません。今回確認できるのは、実際にどの文章をどう変え、何を保持したかです。

## 作業方法と確認方法

参照したyomiyasuはコミット`f03aecd9c4c4a69e229f3848ecba66c3871f734c`、元記事はコミット`5751b3916a0dc3ae61b43b62d598dade8c385a38`に固定しました。確認日は2026年10月2日です。

SKILL.mdと技術記事向けの仕様を読み、各記事の文脈に合わせて修正文を作りました。その変更を[検証用スクリプト](https://github.com/kazuph/kazuph.github.io/blob/b16be041ea9c57df6ef7265ecb66238f5ea93e69/scripts/yomiyasu/edit_posts.py)に記録しています。このスクリプトは汎用の自動リライターではなく、今回確認した111箇所の変更を適用・検証するものです。

検証では、既存22記事について変更前後のfront matter、コード、ログ、数値、表、引用、本人講評、出題文、生成作品を照合します。

```bash
# この変更を含むリポジトリで実行する。通常は検証のみ。
python3 scripts/yomiyasu/edit_posts.py --report-dir /tmp/yomiyasu-audit

# 固定した元記事に戻して再適用する場合だけ --apply を付ける。
# 作業中の別の変更があれば中断し、上書きしない。
python3 scripts/yomiyasu/edit_posts.py --apply --report-dir /tmp/yomiyasu-audit
```

同梱の`yomiyasu_lint.py`と`yomiyasu_diff.py`も、固定した版で変更前後に実行しています。警告や差分は見直し候補として扱い、意味の保持は別に確認します。

```bash
git clone https://github.com/nanaism/yomiyasu.git /tmp/yomiyasu-skill
git -C /tmp/yomiyasu-skill checkout f03aecd9c4c4a69e229f3848ecba66c3871f734c
python3 /tmp/yomiyasu-skill/scripts/yomiyasu_lint.py 対象記事.md --json
python3 /tmp/yomiyasu-skill/scripts/yomiyasu_diff.py 修正前.md 修正後.md
```

新しい記事に使うときも、最初に本人の文章や引用を除きます。そのうえでAIが書いた技術説明を推敲し、原文との差分を確認する。この順序なら、言い回しを整える作業と、著者の判断や実験記録の保持を両立できます。

</div>
