# Agent Guidelines for kazuph.github.io

この repo は `https://kazuph.github.io/` の GitHub Pages source です。

## 目的

- blog を主役にする。
- 既存の `presentation/` 配下の HTML スライドは資産として維持する。
- スライド一覧は `_data/slides.yml` で管理し、サイドバーに表示する。

## 記事作成

- Markdown 記事は `_posts/YYYY-MM-DD-slug.md` に追加する。
- HTML を直接書く記事は `_posts/YYYY-MM-DD-slug.html` に追加する。
- どちらも front matter に `title` と `description` を書く。
- 参照した外部の情報は、本文中の出典リンクで示す。

## 読者に向けたメタ文を書かない（2026-10-02 kazuph 指示）

記事の本文は読者に向けて書く。記事を作る側の事情や、レビュー担当への説明は読者にはノイズなので、次の5種類の文は本文に書かない。

- 制作の裏側の説明: front matter（`full_ai`・`full_ai_model` など）、使った AI・ツール・スクリプト、本人確認の経緯、対象外にした理由、OGP 画像の説明。例「過去記事の`full_ai`と`full_ai_model`は変更していません。」
- 言い訳・先回りの否定: 読者が疑っていないことを否定・弁明する文。例「比較用に新しく作った例文ではありません」「AI 執筆であることを隠す変更ではありません」
- 画面やページの作りの説明: 見れば分かる表示やリンクの説明。例「スマートフォンでも、修正前後を横並びで表示します」「source 欄のリンクから、公開したソースを直接開けます」
- 執筆方式の注記: 「…記事作成までを AI で行いました（Full AI 方式）」のような、誰が書いたかの本文中の注記。AI 執筆は front matter の `full_ai`・`full_ai_model` で示し、記事上部の表示に任せる。
- 制作・検証を再現するための確認日・固定コミット・手順。記事の主題である操作手順やコマンドは対象外。

本人（kazuph）の依頼文・講評・引用、ベンチマークの出題プロンプトや生成作品、題材が本人指定か AI 設計かの説明は、記事の内容なので残す。

## 外部記事のインポート

- Zenn、Qiita、Hatena から移す前に、対象サービスの利用規約と転載条件を確認する。
- kazuph 本人の記事だけを対象にする。
- 元 URL と取得日を記事に残す。
- Zenn は公開済み記事を `scripts/fetch_zenn_articles.rb` で `_posts/zenn/` に生成する。
- 生成先 `_posts/zenn/` は build artifact 扱いなので直接編集しない。
- private な Zenn 原本 repo や下書きはこの site build に使わない。

## 検証

- 変更後はローカルで Jekyll build とブラウザ表示を確認する。
- 既存スライド URL を壊していないことを確認する。
- スクリーンショットを取得して、本文とサイドバーが desktop/mobile で読めることを確認する。
