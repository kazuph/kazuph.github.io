---
layout: post
title: "tmuxでいいじゃんと思ってた僕がHerdr(fork)を常用しはじめた話"
date: 2026-05-28
description: "tmux歴10年以上の僕が、AI Agentを並列でぶん回すためにHerdr(fork)を育てはじめた記録。"
image: /images/posts/herdr-agent-multiplexer/herdr-overview.png
full_ai: true
hero_video: /images/posts/herdr-agent-multiplexer/herdr-terminal-demo.mp4
hero_video_poster: /images/posts/herdr-agent-multiplexer/herdr-terminal-demo-poster.jpg
hero_video_caption: Herdr(fork) で space を切り替えたり、pane menu からレイアウトを変えたりしているところ。
---

## はじめに

tmux は新卒のころから 10 年以上使っています。

なので、最初に Herdr を見た時も正直こう思っていました。

tmux でいいじゃん！

ペインは割れるし、別ターミナルから attach できるし、SSH 越しでも使える。なんなら手癖も全部 tmux に寄っています。長く使ってきた道具なので、そう簡単には乗り換えません。

ただ、Claude Code、Codex、Copilot CLI みたいな AI Agent を複数常駐させるようになると、tmux だけで全部を見るのが少しつらくなってきました。

どのペインで何が動いているのか。どのワークスペースがどのブランチなのか。どの Agent が止まっていて、どれがまだ走っているのか。ここを毎回思い出すのがだるい。

そこで触りはじめたのが Herdr です。

本家の [Herdr](https://github.com/ogulcancelik/herdr) は、ターミナル上でワークスペースとペインを扱う multiplexer です。Claude Code や Codex などの coding agent を並べて使う前提の UI が入っています。

今はその Herdr をそのまま使うだけではなく、[kazuph/herdr](https://github.com/kazuph/herdr) という fork で、自分たちが AI Agent を並列にぶん回すために欲しかった機能を足しています。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-overview.png" alt="Herdr(fork) の全体表示" loading="lazy">
  <figcaption>Herdr(fork) の全体表示。左にワークスペースと Agent、右に複数のペインが並びます。</figcaption>
</figure>

## tmuxでいいじゃん、ではなくなったポイント

tmux から移る候補として見るなら、まず attach できることが大前提です。

僕は Tailscale + SSH で Mac に入って、別ターミナルやスマホから作業の続きを見ることがあります。なので、ローカルでしか使えないツールや、別端末から戻る体験が弱いツールは、その時点で選択肢から外れます。

Herdr はここがちゃんとしていました。

- 別ターミナルから attach できる
- 左側にワークスペースと Agent の一覧が出る
- マウスでも操作できる
- 狭いターミナルでも表示が破綻しにくい

最初の記事を書いた時点では、このあたりの印象が中心でした。tmux の attach 感を残したまま、AI Agent の一覧が横に出る。それだけでもかなり良い。

ただ、実際に常用しようとすると、すぐに「ここも欲しい」「これも見たい」が出てきました。

## 作業を切り替えるたびに「あれ、これ何のブランチだっけ？」で止まる

AI Agent を複数走らせると、とにかく一瞬でワークスペースが増えます。

同じ repo でも、Codex にレイアウト修正を任せるブランチ、Claude に review してもらうブランチ、手元で確認するブランチ、という感じで分けたくなる。さらに Git worktree も増える。

tmux 時代も window 名を工夫して延命していましたが、数が増えると「あれ、この Claude が入ってるのどのブランチだっけ？」で数秒止まる。これが一日に何回もある。さすがに無理。

そこで fork 側では、ワークスペース一覧にブランチ名や差分の状態を出すようにしました。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-workspaces.png" alt="Herdr(fork) のワークスペース一覧" loading="lazy">
  <figcaption>ワークスペース一覧。ワークスペース名の下にブランチ名が出ます。</figcaption>
</figure>

やりたいことは単純で、「今どの repo の、どのブランチ / worktree を開いているか」を Herdr の中で一発で見たい、というだけです。ターミナルから出たくないし、記憶にも頼りたくない。

ワークスペースまわりは context menu からも触れます。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-workspace-menu.png" alt="Herdr(fork) のワークスペース context menu" loading="lazy">
  <figcaption>ワークスペースの menu。worktree 操作、複製、rename、close、section 移動を同じ場所から選べます。</figcaption>
</figure>

ここには `New worktree`、`Open worktree`、`Remove worktree` を入れています。Herdr から worktree を作って、そのままワークスペースとして開けるようにしたかったからです。

`Duplicate` は、同じ cwd や設定でワークスペースを増やしたい時に使います。

## favorite / work / personal にspaceを分ける

同じ context menu から、space を `favorite`、`work`、`personal`、`No section` に振り分けることもできます。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-sections.png" alt="Herdr(fork) の favorites section" loading="lazy">
  <figcaption><code>agent-lab</code> を <code>favorites</code> section に移した状態。よく戻るワークスペースを上に置けます。</figcaption>
</figure>

全部を同じ一覧に置くと、結局また探すことになります。よく戻るものは `favorites`、仕事用は `work`、個人用は `personal`。このくらい雑に分けられるだけでも、常用するとかなり違います。

## Agent同士に指示するなら`%pane_id`が見えていると楽

次に欲しくなったのが、ペインと Agent の対応をすぐ分かるようにすることです。

Codex、Claude、Copilot を同時に置くと、「どの Agent がどのペインにいるのか」を毎回目で追うことになります。tmux の window 名や terminal title でもある程度はできますが、AI Agent を会話させるなら、もっと直接 pane ID が見えていてほしい。

fork では sidebar とペインタイトルの両方に `%1`、`%2` のような短い ID を出しています。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-agents.png" alt="Herdr(fork) の Agent 一覧" loading="lazy">
  <figcaption><code>%1</code> が Codex、<code>%2</code> が Claude、<code>%3</code> が Copilot。状態と pane ID を一緒に見られます。</figcaption>
</figure>

これがあると、人間が見る時にも便利ですが、Agent 同士に指示を出す時にも便利です。

たとえば、Codex に「`%2` の Claude に review 結果を投げて」と言う。Claude に「`%1` の変更を読んで」と言う。こういう時に、右上のペインとか、Claude がいるペイン、みたいな曖昧な説明をしなくて済みます。

この発想自体は、以前 Zenn に書いた [Claude Codeを並列組織化してClaude Code "Company"にするtmuxコマンド集](https://zenn.dev/kazuph/articles/beb87d102bd4f5) と同じです。

その記事では、tmux の pane ID を使って複数の Claude Code を起動し、各 pane にタスクを投げたり、メイン pane に報告させたりしていました。たとえば、`tmux send-keys -t %27 ...` のように pane ID を宛先にして、Claude 同士が同じ tmux session の中で作業を分担する形です。

Herdr でも同じことができます。違いは、その `%pane_id` が sidebar とペインタイトルに最初から見えていることです。tmux でやっていた「pane ID を使って AI 同士を会話させる」運用が、Herdr では画面に出っぱなしになっている。これがかなり良いです。

Agent の状態も、`working`、`blocked`、`idle` のように一覧できます。`blocked` の Claude を見に行く、`working` の Codex はまだ待つ、`idle` の Copilot は結果を見る、という判断がしやすくなります。

## tmux の Ctrl-b + Space 的にペイン配置を正規化したい

tmux には `Ctrl-b` + `Space` でペインレイアウトを切り替える機能があります。

Herdr(fork) でも、同じように既存ペインを残したまま配置を直したくなりました。

AI Agent をいくつも置いていると、ペインの形がだんだん見づらくなります。

最初は左右に割っていたけど、途中で上下に積みたくなる。3 つ、4 つ、5 つと増えてきて、幅を揃えたくなる。こういう時に、ペインを全部閉じて作り直すのはだるい。というかやりたくない。

fork では pane menu に、既存ペインを残したままレイアウトを変える操作を追加しました。

- `Move to split / vertical`
- `Move to split / horizontal`
- `Equalize pane sizes`

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-pane-menu.png" alt="Herdr(fork) の pane menu" loading="lazy">
  <figcaption>pane menu。rename、split、レイアウト変更、均等化、zoom、close をここから選べます。</figcaption>
</figure>

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-panes.png" alt="Herdr(fork) のペイン表示" loading="lazy">
  <figcaption>既存ペインを残したまま、縦/横の並び替えや均等化を menu から行えます。</figcaption>
</figure>

ポイントは、ペインが 2 つの時だけではないことです。

3 つ、4 つ、5 つある状態でも、今あるペイン群をまとめて縦 split / 横 split に寄せられるようにしています。

あと、ペインが 1 つしかない時は `Move to split` 系の menu を出さないようにしました。押しても意味がない操作は出さない。こういう小さい違和感を放置すると、毎日使う道具としてだんだん嫌になってきます。

## スマホからでもspace切り替えがやりやすい

Herdr は、スマホから SSH して使う時にも相性が良いです。

PC では横長のターミナルを使っていますが、スマホから入ると縦長になります。tmux でも使えますが、status line の細い window を指で狙うのはつらい。散歩中にやりたい操作ではない。

Herdr は狭いターミナルだと表示が切り替わります。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-narrow.png" alt="Herdr(fork) を狭いターミナル幅で表示しているスクリーンショット" loading="lazy">
  <figcaption>狭いターミナルでの表示。スマホ SSH でもワークスペースやペインに戻りやすくしたい。</figcaption>
</figure>

この用途では、派手な UI よりも「今どこにいるか」「どのペインに戻るか」が分かることの方が大事です。

狭い画面では switcher も使います。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-switcher.png" alt="Herdr(fork) の switcher" loading="lazy">
  <figcaption>switcher。狭いターミナルではワークスペース、タブ、Agent、menu を縦に並べて選びます。</figcaption>
</figure>

switcher では、`spaces`、`tabs`、`agents`、`menu` を同じ画面に並べています。スマホ SSH で使う時は、細い status line を狙うより、この一覧から選ぶ方がずっと楽です。

## forkで特に効いているところ

ここまでいろいろ書きましたが、効いているのは大きく 3 つです。

<figure>
  <img src="/images/posts/herdr-agent-multiplexer/herdr-overview.png" alt="Herdr(fork) の全体表示" loading="lazy">
  <figcaption>ワークスペース、Agent、ペインの対応を 1 画面で確認できます。</figcaption>
</figure>

まず、ワークスペースと Git worktree が Herdr の中で見えるようになったこと。AI Agent に別ブランチを触らせるたびに、どの worktree だったかを人間が覚えなくてよくなりました。

次に、`%pane_id` が見えること。これは単なる表示ではなく、Agent 同士に指示を飛ばすための宛先です。tmux で Claude Code Company をやっていた時の発想を、そのまま Herdr の UI に持ち込んだ形です。

最後に、レイアウトやスマホ SSH まわりの QOL です。ペインの並びをあとから直せる、幅を揃えられる、狭い画面では switcher で戻れる。どれも単体では地味ですが、毎日使うと効きます。

本家 Herdr は出発点として良いです。

そのうえで、AI Agent を複数常設するなら、[kazuph/herdr](https://github.com/kazuph/herdr) 側に入っている変更が効いてきます。ワークスペース、ブランチ、Agent の状態、pane ID が見えているだけで、複数 Agent を並列に動かす時の迷子感がかなり減ります。

## おわりに

tmux は今でも強いです。

ただ、AI Agent を複数常設して、pane ID で指示し、ワークスペースとブランチを見ながら進めるなら、Herdr(fork) の方が扱いやすい場面があります。

tmux で Claude Code を pane ID に送って並列に動かしていた運用は、Herdr でも同じようにできます。さらに Herdr では、その `%pane_id` が sidebar とペインタイトルに出ているので、どの Agent に何を渡すかを画面上で確認しながら進められます。

Enjoy, Herdr with agents!
