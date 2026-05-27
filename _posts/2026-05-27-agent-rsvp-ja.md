---
layout: post
title: "agent-rsvpをZig/AppKitで日本語速読アプリにフォークした"
date: 2026-05-27
description: "agent-rsvp を日本語向けにフォークし、Zig/AppKit の小さなネイティブアプリとして作り直した記録です。"
full_ai: true
image: /images/posts/agent-rsvp-ja/minimal.gif
---

<img src="/images/posts/agent-rsvp-ja/minimal.gif" alt="agent-rsvp-jaで青空文庫の坊っちゃんを1行速読表示しているGIF" width="899" height="546" loading="eager" decoding="sync">

## はじめに

これは Full AI で書いた記事です。

[`agent-rsvp`](https://github.com/EvanBacon/agent-rsvp) は、RSVP（Rapid Serial Visual Presentation）方式の速読ツールです。単語や短い塊を画面中央に次々出して、目を動かす距離を減らしながら読むためのものです。

もともとのツールはターミナル上で動く CLI/TUI として作られていて、英語の文章や短いテキストを読むには素直な作りでした。ただ、日本語の文章を読むために使ってみると、いくつか気になるところが出ました。

- 日本語の文字幅と焦点文字の扱いが合わず、表示が右に突き出る
- 赤い代表文字の位置が左右にぶれて、視線を固定できない
- 1文字だけの表示や、不自然な区切りが混ざる
- 行数を増やすと表示速度が落ちる
- ターミナルを起動せず、普通の macOS アプリとして開きたい
- 技術ブログでは英単語や記号が多く、純粋な速読サンプルとしては読みにくい

そこで、フォーク版として [`kazuph/agent-rsvp-ja`](https://github.com/kazuph/agent-rsvp-ja) を作りました。本家へ Pull Request は送っていません。日本語で気持ちよく読むための実験を、別フォークとして公開しています。

## フォークの位置づけ

公開したリポジトリはこちらです。

- Fork: <https://github.com/kazuph/agent-rsvp-ja>
- Upstream: <https://github.com/EvanBacon/agent-rsvp>
- Default branch: `ja`
- 確認日: 2026-05-27

パッケージ名と README は `agent-rsvp-ja` に変えています。CLI の起動コマンドは従来どおり `agent-rsvp` のままです。普段使うコマンド名を変えずに、日本語向けの実装へ差し替えるためです。

```bash
agent-rsvp 坊っちゃん
agent-rsvp 吾輩は猫である
agent-rsvp セロ弾きのゴーシュ
```

ファイルを渡せば従来どおりそのファイルを読みます。存在しない名前を渡した場合は、青空文庫の作品名として解決します。

## 最初に困ったこと

RSVP では、表示される語や句のどこを見るかが大事です。英語向けの RSVP では、単語の左寄りに焦点文字を置く ORP（Optimal Recognition Point）の考え方がよく使われます。

でも日本語の文章でそれをそのまま使うと、赤い代表文字が左寄りに集まりがちでした。さらに表示全体も右方向に突き出ることが多く、視線を固定する速読の意味が薄くなります。

今回のフォークでは、表示する行ごとに次のルールにしました。

- 表示行の空白を除いた中央文字を代表文字にする
- 文字数が偶数なら中央右の文字を代表文字にする
- 赤い代表文字の中心位置は、常に画面中央に固定する
- 長い行はフォントサイズを落として、表示領域に収める

つまり、変な推測アルゴリズムではなく、「今表示している行の中央」を見るようにしました。日本語ではこのほうが読んでいて素直でした。

## ターミナルをやめる

もうひとつ大きかったのが、ターミナル起動をやめたいという点です。

速読アプリは、読む画面そのものが主役です。ターミナルの中で動くより、普通の macOS アプリとして開き、キー操作だけで速度や行数を変えられるほうが使いやすい。

最初は TUI のまま改善していましたが、行数を増やしたときに表示速度が落ちる問題もありました。そこで、TUI の再描画から離れて、Zig で小さなネイティブバイナリを作り、macOS 側は AppKit で直接描画する構成へ変えました。

この方向に踏み切るきっかけになったのが、Vercel Labs の [`zero-native`](https://github.com/vercel-labs/zero-native) です。

`zero-native` は Zig + WebView で小さなネイティブアプリを作るプロジェクトです。公式サイトでも、システム WebView を使うことで sub-megabyte の小さなアプリを作れることが説明されています。

- GitHub: <https://github.com/vercel-labs/zero-native>
- Docs: <https://zero-native.dev/>
- 確認日: 2026-05-27

今回の `agent-rsvp-ja` は `zero-native` フレームワークを直接依存として組み込んだものではありません。ですが、「巨大なランタイムを抱えず、Zig で薄いネイティブ shell を作る」という方向性はかなり近いです。

実際、手元でビルドした `agent-rsvp-native` は次のサイズでした。

```console
$ ls -lh agent-rsvp-native
-rwxr-xr-x  ... 127K agent-rsvp-native
```

127KB。かなり小さいです。

## 実装の構成

構成はシンプルです。

```text
index.ts              Node/Bun 側の薄い CLI ランチャー
native/main.zig       Zig の entry point
native/macos_app.m    AppKit のウィンドウ、描画、キー操作、本文整形
build.zig             Zig/AppKit バイナリのビルド
```

CLI は npm パッケージとして扱いやすいように Node 側に残しています。実際の表示は `agent-rsvp-native` が担当します。

```bash
agent-rsvp sample.md
agent-rsvp -w 450 sample.md
agent-rsvp -o sample.md
agent-rsvp -t sample.md
agent-rsvp --test-layout sample.md
```

`-o` を付けると、ネイティブウィンドウを detached で開きます。ターミナルを新しく起動することはありません。

## 日本語の区切り

日本語の区切りは、最初かなり迷いました。形態素解析を入れる案もありましたが、速読表示では「言語学的に正しい分割」よりも、「読んだときに変なところで止まらないこと」のほうが大事でした。

今回の実装では、句読点、助詞、助動詞、ASCII の技術語、短すぎる chunk の吸収を組み合わせています。

特に避けたかったのはこういう表示です。

```text
ら、
が
「
```

1文字や2文字だけが単独で出ると、読むリズムが崩れます。そこで、短すぎる chunk は前後へ吸収する後処理を入れました。

確認では、青空文庫の `坊っちゃん` で次の状態まで落としています。

```console
$ agent-rsvp -t 坊っちゃん
total=12191 one_or_less=0 short_le2=0
```

冒頭の分割はこうです。

```text
坊っ[ち]ゃん
夏目[漱]石
親譲りの[無]鉄砲で
小供の[時]から
損ばかり[し]ている。
小学校に居る時[分]学校の二階から
飛び降りて一[週]間ほど腰を
抜かし[た]事が
あ[る]。
```

角括弧の中が、固定位置に置く赤い代表文字です。

## 青空文庫を読む

技術ブログで試すと、英単語、パス、記号、コード片が混ざります。RSVP の表示そのものを調整するには、まず純粋な日本語本文で試したほうがわかりやすい。

そこで、青空文庫の作品名を直接指定できるようにしました。

```bash
agent-rsvp 坊っちゃん
agent-rsvp 吾輩は猫である
agent-rsvp セロ弾きのゴーシュ
```

内部では青空文庫の公式 UTF-8 索引を取得し、作品名からテキスト zip を探します。本文は Shift_JIS から UTF-8 に変換し、ルビ、入力注記、底本情報、単独の章番号行を落としてから表示します。

参照した青空文庫の情報です。

- 作品索引: <https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip>
- 坊っちゃん: <https://www.aozora.gr.jp/cards/000148/card752.html>
- 吾輩は猫である: <https://www.aozora.gr.jp/cards/000148/card789.html>
- セロ弾きのゴーシュ: <https://www.aozora.gr.jp/cards/000081/card470.html>
- 確認日: 2026-05-27

なお、`ジュゲム` / `寿限無` は青空文庫の公式索引には見つかりませんでした。別ソースへ勝手にフォールバックすると出典が曖昧になるので、今は未対応としてエラーにしています。

## 操作のこだわり

速読アプリとして、操作はかなり絞りました。

| キー | 動作 |
|---|---|
| `h` / `l` | 減速 / 加速 |
| `j` / `k` | 同時表示行数を減らす / 増やす |
| `m` / `Tab` | minimal / context mode の切り替え |
| `Cmd-` / `Cmd+` | フォントサイズ変更 |
| `f` | フルスクリーン |
| `space` | 一時停止 / 再開 |
| `r` | 最初から |
| `q` / `Esc` | 終了 |

`scrub` という概念は消しました。読んでいる途中に「scrub」と言われても、何をするのか直感的ではなかったためです。

同時表示行数は 1 行から始めます。`k` で 2 行、3 行と増え、`j` で減ります。下限は 1 です。`line:0` のような状態は表示しません。

minimal mode では、現在読んでいる chunk だけを表示します。

<img src="/images/posts/agent-rsvp-ja/minimal.gif" alt="minimal modeで坊っちゃんを1行表示しているGIF" width="899" height="546" loading="lazy" decoding="async">

`m` / `Tab` で context mode に切り替えると、上下に前後の文脈が出ます。

<img src="/images/posts/agent-rsvp-ja/mode.gif" alt="minimal modeからcontext modeへ切り替えるGIF" width="899" height="546" loading="lazy" decoding="async">

`k` で同時表示行数を増やすと、複数行をまとめて流せます。

<img src="/images/posts/agent-rsvp-ja/lines.gif" alt="複数行表示で坊っちゃんを速読しているGIF" width="899" height="546" loading="lazy" decoding="async">

## 確認したこと

今回の記事を書く前に、少なくとも次を確認しました。

```console
$ bun run build
$ agent-rsvp -t 坊っちゃん
total=12191 one_or_less=0 short_le2=0
```

GUI 起動も確認しました。

```console
$ agent-rsvp 坊っちゃん
```

70秒ほど通常起動で流し、stderr なし、新しい crash report なしを確認しています。途中で AppKit の描画属性に nil が混ざってクラッシュする問題も見つけたため、フォント生成が失敗しても `systemFont` に落ちるように修正しました。

公開状態も確認しました。

```console
$ gh repo view kazuph/agent-rsvp-ja --json url,visibility,defaultBranchRef
```

結果は、public repository、default branch は `ja` です。

## おわりに

`agent-rsvp` を、日本語向けの `agent-rsvp-ja` としてフォークしました。

本家のシンプルな RSVP 体験を残しつつ、日本語の中央代表文字、固定焦点、青空文庫取得、Zig/AppKit の小さなネイティブウィンドウへ寄せています。

公開リポジトリはこちらです。

<https://github.com/kazuph/agent-rsvp-ja>

Enjoy, Japanese speed reading!
