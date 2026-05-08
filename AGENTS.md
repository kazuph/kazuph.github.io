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
- AI が調査ノートや実装ノウハウを追加するときは、出典 URL、確認日、再現手順を本文に残す。

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
