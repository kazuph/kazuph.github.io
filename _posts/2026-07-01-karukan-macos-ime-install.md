---
layout: post
title: "KarukanをmacOSに入れたらGoogle日本語入力より軽快だった"
date: 2026-07-01
description: "Rust製IME KarukanをmacOSに導入し、辞書・モデル取得から実際の変換確認まで行ったFull AI導入メモ。"
permalink: /2026/07/01/karukan-macos-ime-install.html
full_ai: true
full_ai_model: gpt-5.5
---

## はじめに

この記事は、Rust製の日本語入力システム [Karukan](https://github.com/togatoga/karukan) を macOS に導入した記録です。導入作業、ビルド、辞書とモデルの取得、インストール済みサーバーの実動作確認までを AI が実環境で実行し、その結果を Full AI 記事として整理しています。

最初に触った感想はかなり強烈でした。

> Google IMEよりも高速です。こんなに使いやすいなんて。しかもGoogleよりも誤字が少ないです。漢字がちゃんと変換されます。ヤバいです。

macOS の入力メニューにも `ひらがな (Karukan)` として追加できています。

<figure>
  <img src="/images/posts/karukan-macos-ime-install/input-source-menu.png" alt="macOSの入力メニューで、ひらがな (Karukan) が選択されているスクリーンショット" width="448" height="224" loading="eager">
  <figcaption>入力ソースに追加された Karukan。Google 日本語入力とは別の IME として選択できる。</figcaption>
</figure>

Karukan は Linux と macOS 向けの日本語入力システムです。macOS 版は Swift の InputMethodKit フロントエンドと、Rust の `karukan-imserver` が JSON-RPC で通信する構成です。かな漢字変換の中核は `karukan-engine` で、GPT-2 ベースの軽量モデルを `llama.cpp` 経由でローカル推論します。

## 軽い理由

Karukan の標準モデルは、いわゆる 7B や 8B の Llama 系モデルとはサイズ感がまったく違います。

| モデル | パラメータ数 | 用途 |
| --- | ---: | --- |
| `jinen-v1-xsmall-q5` | 26M | 軽量モデル |
| `jinen-v1-small-q5` | 90M | 標準モデル |

標準設定では `jinen-v1-small-q5` と `jinen-v1-xsmall-q5` を組み合わせて使います。設定は `adaptive` で、短い入力やライブ変換の状況に応じて軽量モデルも使える構成です。

実装上は GPT-2 の Metal まわりの問題を避けるため CPU 推論に寄せています。GPU で巨大モデルを回すのではなく、小さいモデルを CPU で低レイテンシに回す設計です。今回の環境では `ka` を入力して候補が返るまで、推論部分が `18ms`、キー処理全体が `58ms` でした。

## 導入手順

前提として Rust と Swift が必要です。今回の確認環境では次のバージョンでした。

```text
rustc 1.92.0
cargo 1.92.0
Apple Swift version 6.2.1
macOS 26.5.1 arm64
```

まずリポジトリを取得します。

```sh
mkdir -p ~/src/github.com/togatoga
git clone https://github.com/togatoga/karukan.git ~/src/github.com/togatoga/karukan
cd ~/src/github.com/togatoga/karukan/karukan-macos
```

インストール前にテストを回します。

```sh
make test
```

今回の結果は、Rust 側の IME ロジックが `219 passed`、Swift 側の Transport 統合テストがあとで `5 passed` でした。初回の Swift テストでは Rust サーバー未ビルドのため一部が skip されますが、release ビルド後に TransportTests だけ再実行して通しています。

インストールは `make install` です。

```sh
make install
```

このコマンドで次の処理がまとまって走ります。

- Swift フロントエンド `KarukanIME` の release build
- Rust サーバー `karukan-imserver` の release build
- `Karukan.app` バンドルの組み立て
- ad-hoc codesign
- システム辞書 `dict.bin` の取得
- `jinen-v1-xsmall-q5` と `jinen-v1-small-q5` の事前取得
- `~/Library/Input Methods/Karukan.app` への配置

モデルは Hugging Face から取得されます。今回のログでは、`jinen-v1-xsmall-Q5_K_M.gguf` と `jinen-v1-small-Q5_K_M.gguf`、それぞれの `tokenizer.json` がキャッシュに入りました。

## macOSで有効化する

インストール後、初回だけ macOS に新しい入力メソッドを認識させます。

1. ログアウトして再ログインする
2. システム設定を開く
3. キーボード → 入力ソースを開く
4. `+` から日本語を選ぶ
5. `Karukan` を追加する
6. メニューバーの入力メニューから `ひらがな (Karukan)` を選ぶ

開発版を更新するだけなら、次回以降はログアウトなしで反映できます。

```sh
cd ~/src/github.com/togatoga/karukan/karukan-macos
make install
killall KarukanIME
```

入力メニュー上の名前やアイコンが古いままなら、macOS 側の入力メニューキャッシュを更新します。

```sh
killall TextInputMenuAgent
```

## インストール後の実動作確認

アプリが配置されているだけではなく、同梱された Rust サーバーが実際に変換できることも確認しました。インストール済みの `karukan-imserver` に JSON-RPC を流します。

```sh
printf '%s\n%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"init","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"process_key","params":{"keysym":107}}' \
  '{"jsonrpc":"2.0","id":3,"method":"process_key","params":{"keysym":97}}' \
  '{"jsonrpc":"2.0","id":4,"method":"commit","params":{}}' \
  | "$HOME/Library/Input Methods/Karukan.app/Contents/MacOS/karukan-imserver"
```

`107` は `k`、`97` は `a` です。`ka` を入力した状態として処理されます。

返ってきた候補は次のような内容でした。

```text
カ
か
課
火
化
禍
か〜
柯
戈
```

このときの計測値は次の通りです。

```text
conversion_ms: 18
process_key_ms: 58
model_name: jinen-v1-small-q5+jinen-v1-xsmall-q5
```

IME としての体感が軽いのは、このあたりの数字にも出ています。もちろん入力内容やマシンの状態で変わりますが、少なくとも今回の環境では、ライブ変換を普段使いできる速さで動きました。

## 入力学習

Karukan には入力学習もあります。ここでいう学習は、GPT-2モデルを再学習するという意味ではありません。ユーザーが選んだ変換結果をローカルに記録し、次回以降の候補順位に反映するタイプの学習です。

macOS では学習データは次のTSVファイルに保存されます。

```text
~/Library/Application Support/com.karukan.karukan-im/learning.tsv
```

保存形式は、読み、変換結果、選択回数、最終アクセス時刻を持つシンプルなキャッシュです。実装上は `reading → surface` の組を記録し、同じ変換を選ぶたびに頻度が増えます。候補を出すときは頻度と最近使った時刻からスコアを計算し、よく使う変換を上に出します。

デフォルト設定では入力学習は有効で、最大エントリ数は `10000` です。

```toml
[learning]
enabled = true
max_entries = 10000
```

学習候補は完全一致だけでなく、前方一致の予測変換にも使われます。つまり `わせだだいがく → 早稲田大学` を覚えたあと、途中の `わせだ` でも学習済み候補を出せます。

通常の Space / Down 変換では学習候補を含みます。一方で Tab 変換では学習候補をスキップする実装になっています。古い学習結果が邪魔になったときに、学習を消さずにその場だけ回避できるのがよいです。

## 辞書登録

入力学習と辞書登録は別物です。入力学習は「選んだ変換を次回から上に出す」履歴で、辞書登録は「この読みならこの単語を候補に出す」と明示的に追加する仕組みです。

Karukan にはユーザー辞書があります。macOS では次のディレクトリに Mozc / Google 日本語入力形式のTSVファイルを置くと、ユーザー辞書として読み込まれます。

```text
~/Library/Application Support/com.karukan.karukan-im/user_dicts/
```

今回、自分用の辞書ファイルとして `kazuph_user_dict.tsv` を作り、次の1行を登録しました。

```text
はっぽう	発報	名詞	
```

形式はタブ区切りで、基本は `読み	表層形	品詞	コメント` です。Google 日本語入力や Mozc のユーザー辞書をエクスポートしたTSVも、そのまま置ける設計になっています。

登録後、Karukan の辞書ツールで読み込めることも確認しました。

```text
$ cargo run --release --bin karukan-dict -- view -q はっぽう \
  "~/Library/Application Support/com.karukan.karukan-im/user_dicts/kazuph_user_dict.tsv"

はっぽう	発報	0
```

ユーザー辞書はIMEエンジンの起動時に読み込まれます。ファイルを追加した直後に候補へ出ない場合は、Karukanを一度終了してから再度入力ソースとして選び直すと反映されます。

## 人間からの質問コーナー

### モデルは何でgpt2なの？学習ソースはなに？

Karukan が使っている `jinen-v1-small` は、かな漢字変換のための GPT-2 アーキテクチャの言語モデルです。Hugging Face の model card では、BPE tokenizer を使い、文脈を考慮したかな漢字変換ができるモデルとして説明されています。

学習ソースは、model card 上では `Miwa-Keita/zenz-v2.5-dataset` に独自の前処理を施したデータとされています。

なぜ GPT-2 なのかは、IME という用途にかなり合っています。かな漢字変換は巨大な汎用会話モデルである必要はなく、短い入力と左文脈から次の漢字列を低レイテンシで出せることが重要です。26M/90M クラスの GPT-2 系なら、CPU 推論でもキー入力ごとに回せる現実的なサイズになります。

### このGPT2をMetalに最適化することはできそう？lmstudioをバックエンドにすることに対しては？

可能性はあります。ただし、現行の Karukan では GPT-2 モデルの Metal 問題を避けるため、`llama.cpp` の読み込み時に GPU layer を 0 にして CPU 推論へ寄せています。つまり、いまの実装は「Metal を使っていない」のではなく、「GPT-2 では Metal を使わない方に倒している」状態です。

Metal 最適化を本気でやるなら、まず `llama.cpp` 側でこの GPT-2 GGUF が Metal backend で正しく動くかを検証する必要があります。変換品質、EOS、tokenizer、beam search の結果が CPU 版と一致するかを見る必要があります。

LM Studio をバックエンドにする案は、単純な速度改善としては扱いにくいです。LM Studio は OpenAI 互換APIを提供しているので、文章生成サーバーとしては使いやすいです。一方で Karukan は、外部 tokenizer、EOS、候補生成、beam search、候補スコアまで `llama.cpp` 統合に寄っています。HTTP でテキストを投げて1候補を返すだけだと、IME の候補リストとして必要な情報が足りなくなる可能性があります。

やるなら、LM Studio 置き換えではなく、Karukan に OpenAI互換API backend を追加する別実装として比較するのがよさそうです。

### 具体的にはなにをinputにしているの？アルファベット？ひらがな？

ユーザーが打つ最初の入力はローマ字です。Karukan の IME エンジンがまずローマ字をひらがなへ変換します。

かな漢字変換モデルへ渡す直前には、その読みをカタカナへ変換します。実装では、ひらがなの reading を `hiragana_to_katakana` でカタカナにしてから、jinen 形式のプロンプトを作ります。

形式はこうです。

```text
{CONTEXT}<左文脈>{INPUT_START}<カタカナ入力>{OUTPUT_START}
```

特殊トークンは Private Use Area の文字で、`CONTEXT`、`INPUT_START`、`OUTPUT_START` を区切りとして使います。たとえば `kanji` と打つと、まず `かんじ` 相当になり、モデル入力では `カンジ` 側に寄せて処理されます。

### このエンジンだけ取り出して、音声入力ソフトを改善できる可能性はある？Appleスピーチアナライザーを入力にできないかな？

可能性はかなりあります。Karukan のかな漢字変換は、IME フロントエンドから切り離して `karukan-engine` / `karukan-imserver` 側だけでも使える構成です。音声認識の結果を「読み」または「かな」に寄せて渡せるなら、音声入力後の後処理として使えます。

Apple の Speech Analyzer / Speech framework から得られる出力が、最初から漢字かな混じり文の場合は、そのまま Karukan に渡すよりも、読みへ戻す処理が必要になります。一方で、音声認識からひらがな・カタカナ・読み候補を取れる、または別のかな化ステップを挟めるなら、Karukan の入力形式にかなり近づきます。

実用案としては、音声認識結果をいったん文節ごとにかなへ寄せ、左文脈つきで Karukan に再変換させる形です。音声入力でよくある「同音異義語が文脈に合わない」問題には効く可能性があります。

ただし、音声入力では句読点、文節境界、話し言葉のゆれ、認識誤りが入るので、IME のキー入力より前処理が難しくなります。Karukan をそのまま貼るより、音声認識結果をチャンク化して `context + reading` に整える小さな adapter を作るのが現実的です。

## 参照した情報

- [togatoga/karukan](https://github.com/togatoga/karukan)
- [karukan-macos README](https://github.com/togatoga/karukan/tree/main/karukan-macos)
- [karukan-engine README](https://github.com/togatoga/karukan/tree/main/karukan-engine)
- [togatogah/jinen-v1-small - Hugging Face](https://huggingface.co/togatogah/jinen-v1-small)
- [Linuxの日本語入力を改善するIME「Karukan」 - 点と接線。](https://riq0h.jp/2026/03/27/165542/)
- [KarukanというLinux向け日本語入力システムがすごい - Qiita](https://qiita.com/spumoni/items/54ceaba33110618baa45)
- [ニューラルかな漢字変換エンジンkarukanで使用するモデルの追加で詰まった話 - Qiita](https://qiita.com/Nishizacky/items/0bb9706c336d3fc08bc6)
- [Setup karukan on openSUSE - Zenn Scrap](https://zenn.dev/uliboooo/scraps/6403f0810f40b3)
- [IME News: February 2026 - Zenn](https://zenn.dev/komatsuh/articles/komatsuh_ime_news_2026_02)
- [LM Studio OpenAI Compatibility Endpoints](https://lmstudio.ai/docs/developer/openai-compat)

## おわりに

Karukan は、ローカルで動く軽量なニューラルかな漢字変換 IME として、そのまま導入してすぐ試せる状態でした。`llama.cpp` を使う構成に最初は少し身構えましたが、実際には GPT-2 系の小さなモデルを CPU で回す設計なので、今回の macOS 環境ではかなり軽快に動きました。

入力メニューに `ひらがな (Karukan)` が並んだら、あとは普段の IME と同じように選ぶだけです。

Enjoy, Karukan on macOS!
