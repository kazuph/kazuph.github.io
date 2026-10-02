---
layout: post
title: "Codex.appのpetに着想を得て、tmux向けの相棒 TmuxPal をつくった"
date: 2026-05-13
description: "Codex.app の /pet を見て、tmux 内の Codex / Claude Code / Copilot / opencode をまとめて見渡せる macOS アプリ TmuxPal を Swift で作った。開発方針と現時点の機能を紹介する。"
social_image: /images/tmuxpal/2026-05-13-tmuxpal-demo-poster-v2.png
---

<img src="/images/tmuxpal/2026-05-13-tmuxpal-demo.gif" alt="TmuxPal demo" width="720" height="437" loading="eager" decoding="sync" onerror="this.onerror=null;this.src='/images/tmuxpal/2026-05-13-tmuxpal-demo-poster.png';">

## なぜ

最初のきっかけは、Codex.app の `/pet` でした。画面の端でキャラクターが動いているだけなのに、いま何かが走っている感じが自然に伝わってくる。これを tmux 上の coding AI にも持ち込みたい、というのが今回の出発点です。

Codex へ渡した依頼文を、そのまま載せます。

<details><summary>最初の依頼文を開く</summary>

```text
tmuxのwindowとpaneリスト見えますよね？
tmuxを起動したら、実行中のcoding aiのtuiを拾って、
それに対して吹き出しで縦積みして表示してくれるpetキャラを作成してください。
codex.appとは別で起動します。
windowsのイルカのようにドラッグで移動しますし、移動中もモーション表示します。
実装は生swiftでいけるかな？
codex以外にもcopilot cli、claude code、opencodeに対応する必要があります。
```

</details>

tmux で複数の AI を並行で動かしていると、どの pane で何が動き、どれが実行中なのかを tmux だけで毎回確認するのは意外と大変です。そこで Codex.app の pet に着想を得て、複数 pane の一覧表示を重視した TmuxPal を作りました。

名前を **pet** ではなく **pal** にしたのは、今回使いたかったのが単なるペット的な存在ではなく、人のキャラクターだったからです。相棒として隣にいる感じを出したかったので、TmuxPal という名前にしています。

## いまの画面

TmuxPal は GitHub で公開している macOS ネイティブアプリです。リポジトリは [kazuph/TmuxPal](https://github.com/kazuph/TmuxPal) で、実装は Swift / AppKit、Codex.app に依存せず tmux 全体を監視して動きます。

まずはスクショモードで書き出した small の bubble ありです。tmux 全体を見渡す感じを、そのまま安全なデモ文面で出せます。

![TmuxPal small bubbles](/images/tmuxpal/2026-05-13-small-bubbles.png)

bubble を出さずに pal だけを書き出すこともできます。記事用の素材や紹介画像を作る時はこの形もかなり使いやすいです。

![TmuxPal medium pal only](/images/tmuxpal/2026-05-13-medium-pal-only.png)

サイズはメニューバーから小・中・大で切り替えられます。並べると差がわかりやすく、large の bubble ありはかなり存在感があります。

![TmuxPal bubble size comparison](/images/tmuxpal/2026-05-13-bubbles-size-comparison.png)

### Swift / AppKit での実装

最初の実装方針として Codex に渡していた plan でも、かなりはっきりこう書いていました。

```text
新規 repo に、Codex.app とは別起動の macOS ネイティブ Swift/AppKit アプリ `TmuxPal` を作る。
LaunchAgent として常駐し、tmux 内の `codex` / `claude` / `copilot` / `opencode` pane を検出して、
Dokochan のキャラクターと縦積み吹き出しで AI TUI の状態と短い要約を表示する。
```

アプリは次のターゲットに分けています。

- `TmuxPal` executable target: AppKit の GUI 常駐アプリ本体
- `TmuxPalCore` library target: tmux 収集、AI pane 判定、bubble 要約、hook event 読み取りなどのコア処理
- `TmuxPalTests`: コア部分のテスト

GUI 側は `NSApplication` を `.accessory` で起動して、メニューバー常駐の軽いアプリにしています。overlay 自体は別 controller で出し、アプリ本体は余計な window を持ちません。これは「tmux の作業を邪魔しない相棒」にしたかったからです。

## TmuxPal でできること

TmuxPal は tmux 上の **Codex / Claude Code / GitHub Copilot CLI / opencode** を検出して、各 pane に対して `tool · repo/window · status · short title` 形式の吹き出しを出します。右上のステータス表示は、実行中の agent ならローディングのスピナーになり、完了しているものはチェックに切り替わります。bubble をクリックするとターミナルが前面に戻り、その bubble に対応した pane にカーソルが当たるように切り替わります。セッションをまたいだ移動にも対応していて、位置は保存されます。

メニューバーからは、表示の再読み込み、ログイン時起動、tmux hooks の再インストール、パル選択、サイズ変更ができます。標準は Dokochan ですが、`pal.json` を持つカスタムパルを置けば差し替えもできます。加えて、Codex.app 系のデフォルト pet dir として使われる `~/.codex/pets` 側も読んでいるので、そこに入っているキャラをそのままメニューから選べます。

bubble click で pane を切り替える部分は、tmux 側では `list-clients -F ...` で今つながっている client を見て、対象 pane が別 session にいる時は `switch-client -c <client> -t <session>:<window>.<pane>` を使います。その後に `select-pane -t <pane_id>` を打つ形です。client が取れない時だけ `select-window -t <session>:<window>` にフォールバックします。アプリ側ではこのあと Ghostty / Terminal / iTerm を再度 active にしているので、吹き出しを押すと「ターミナルが前に出て、そのまま狙った pane に戻る」挙動になります。

### tmux 監視

tmux の監視は 1 つの方法だけに頼らず、polling と hook を併用しています。

- polling では `tmux list-panes -a -F ...` で全 pane を定期的に回収する
- hook では `after-new-window`, `after-split-window`, `after-select-window`, `after-select-pane`, `pane-exited`, `pane-died` を見る
- hook event はアプリ側で保持して UI 更新に使う
- hook がなくても動くが、hook を入れると lifecycle の反映が速くなる

hook だけに頼らないのは、tmux の hook だけでは AI の処理開始や完了を完全には検出できないためです。pane が動いているかどうかに加え、pane title、コマンドライン、直近の transcript を確認するほうが、実際の coding AI TUI の状態を判断しやすくなります。

### AI pane 検出: 「コマンド名だけ」にしない

`AiPaneDetector` では、単純なコマンド名だけではなく、pane title や process argument も使って判定しています。

特に Codex は `node .../bin/codex` のような起動経路もあるので、`codex` という文字列をどこで拾うかが大事でした。README にもある通り、現在は次をサポートしています。

- Codex CLI
- Claude Code
- GitHub Copilot CLI
- opencode

tmux 全体の pane から、AI の TUI と判定したものだけを選ぶ実装です。

### Dokochan

キャラクター素材は新しく描き直したのではなく、先に作っていた Dokochan のパイプラインをそのまま使っています。`pal.json` と spritesheet を読み込む形にしているので、今は Dokochan が標準ですが、カスタムパルを差し替える余地も残しています。

README にも、デフォルト素材に加えてユーザーの characters ディレクトリ以下にある `pal.json` を拾う仕様が書かれています。つまり「まず Dokochan で成立させる。その後でキャラ差し替えもできるようにする」という順番です。

前回は [Codexのpetスキルでキャラがうまくジャンプできない問題を解決する](/2026/05/08/hatch-pet-spritesheet-pipeline.html) で、ジャンプの挙動を直していました。あの修正を入れた後の Dokochan はかなり良くて、跳ねた時の見え方が素直になり、ただ置いてあるだけでもちゃんとかわいいです。TmuxPal に持ち込んだ時も、この「ちゃんと動くとかわいい」はかなり効いています。

## パフォーマンス改善

pane 数が増えた時の動作の遅さも少し改善しました。原因は transcript のキャッシュ期間です。3 秒ごとの polling に対して transcript cache の TTL が 1.5 秒しかなく、pane が増えるとほぼ毎回 `tmux capture-pane` を再実行していました。

そこで `TmuxCollector` の transcript cache の保持期間を、active pane は 4.5 秒、inactive pane は 12 秒に変えました。動いている pane の変化を追いながら、画面外で待機している pane の情報を取り直す回数を減らせています。tmux 全体を表示する UI では、目立たないこうした負荷の削減も役立ちます。

## どう使うか

使い方はかなり単純です。まず [kazuph/TmuxPal](https://github.com/kazuph/TmuxPal) の GitHub Release から `TmuxPal.app` を入れて起動します。起動するとメニューバー常駐になり、tmux 全体を見にいって、対応している AI pane があれば画面上に bubble を出します。

普段の操作はほぼメニューバーからです。

- 表示/非表示の切り替え
- 再読み込み
- パルの選択
- サイズの切り替え
- ログイン時起動
- スクショモードと PNG 書き出し

ログイン時に常駐させたいなら LaunchAgent を入れます。tmux 側の pane 増減をもっと速く反映したいなら hooks を追加します。ここは必須ではなく、まずはアプリを起動するだけでも動きます。

最初はアプリを起動して tmux を使うだけで十分です。気に入ったら、ログイン時の常駐や hooks を追加できます。

## 参考

- [TmuxPal GitHub Repository](https://github.com/kazuph/TmuxPal)
- [Codexのpetスキルでキャラがうまくジャンプできない問題を解決する](/2026/05/08/hatch-pet-spritesheet-pipeline.html)

## おわりに

Codex.app の `/pet` を見て、tmux にもこういう相棒がほしいと思ってつくったのが TmuxPal です。bubble、ドラッグ、アニメーション、pane 復帰、パル差し替え、サイズ変更と、楽しい方向にそのまま伸ばしていったら、tmux 上の coding AI を見渡すための専用 overlay になりました。

まだ作り込みたいところはありますが、こういうものは触るたびに少しずつ良くなっていくのが楽しいです。

Enjoy tmux with your pal.
