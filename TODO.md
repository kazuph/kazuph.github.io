# TODO

このサイトを blog 主体の知識置き場として育てるための TODO です。実装内容だけでなく、検証方法も一緒に残します。

## 1. presentation-slide のスライドを port する

- 実装:
  - `kazuph/presentation-slide` を確認し、既存 `presentation/` と重複しないスライドを `presentation/` 配下へ移植する。
  - `_data/slides.yml` に移植したスライドを追加する。
  - 元 repo の README やライセンス表記が必要なら同梱する。
- 検証:
  - ローカル Jekyll server で各スライド URL が 200 になることを確認する。
  - サイドバーの Slides 一覧から遷移できることをブラウザで確認する。

## 2. Zenn / Qiita / Hatena の記事を徐々にインポートする

- 実装:
  - kazuph 本人の記事だけを対象にする。
  - Zenn は公開済み記事を `scripts/fetch_zenn_articles.rb` で `_posts/zenn/` に生成する。
  - private な Zenn 原本 repo や下書きはこの site build に使わない。
  - 直近記事は Zenn を主にする。
  - インポート前に Zenn、Qiita、Hatena の利用規約とエクスポート/転載条件を確認する。
  - 取り込み元 URL、取得日、ライセンス/規約確認メモを front matter または記事末尾に残す。
  - Markdown で移せるものは `_posts/*.md`、HTML 構造を残したいものは `_posts/*.html` にする。
- 検証:
  - `ruby scripts/fetch_zenn_articles.rb` で公開済みZenn記事だけが生成されることを確認する。
  - 取り込み元と公開ページの本文・画像・リンクが欠落していないことを比較する。
  - 規約上必要な canonical link、出典、転載表示が表示されることを確認する。

## 3. Hatena kazuph1986 のサイドバー埋め込みを追加する

- 実装:
  - `kazuph.hateblo.jp` の人気記事と同じ `Hatena.BookmarkWidget` 方式を使う。
  - 外部 JavaScript の影響をサイドバー内に閉じる。
- 検証:
  - オフラインまたは Hatena 側障害時でもブログ本文が表示されることを確認する。
  - デスクトップとモバイルでサイドバーが本文を押しつぶさないことを確認する。

## 4. kazuph/reviw から mermaid / 画像 / 動画の表示部分を移植する

- 実装:
  - `kazuph/reviw` の Markdown preview、mermaid rendering、画像 fullscreen、動画表示/サムネイルの該当実装を確認する。
  - このサイトでは読むための表示だけを移植し、review UI やコメント機能は持ち込まない。
  - 記事本文内の mermaid code block、画像、動画を自然に表示できるようにする。
- 検証:
  - mermaid diagram、通常画像、横長動画、縦長動画を含むサンプル記事を作る。
  - ローカル server とブラウザ screenshot で表示崩れがないことを確認する。

## 5. ローカル repo を直接編集して push するだけで Pages が更新されるようにする

- 実装:
  - GitHub Pages は GitHub Actions で `_site` artifact を deploy する。
  - ローカル Ruby は `flake.nix` の `nix develop` から入れる。
  - README にローカル確認、記事追加、push の手順を書く。
- 検証:
  - `nix develop` で Ruby/Bundler が Nix 由来になっていることを確認する。
  - GitHub Actions で Zenn 公開ページ取得と Jekyll build が成功することを確認する。
  - `bundle exec jekyll build` が成功することを確認する。
  - push 後に GitHub Pages の deployment が成功し、`https://kazuph.github.io/` が更新されることを確認する。

## 6. Cloudflare API 経由で Hermes Agent / OpenClaw から更新できる方法を設計する

- 提案:
  - Cloudflare Workers に authenticated content API を作る。
  - API は GitHub App または fine-grained token を使い、記事ファイルを Pull Request として作成する。
  - Hermes Agent / OpenClaw は直接 `master` に push せず、API 経由で draft PR を作る。
  - Cloudflare Access、署名付き webhook、または service token で更新元を制限する。
  - 画像や動画は GitHub LFS、R2、または repo 内 assets のどれに置くかを記事種別ごとに決める。
- 検証:
  - ローカル worker test で Markdown 記事 PR が作られることを確認する。
  - 権限がない token では PR が作れないことを確認する。
  - 作成された PR を merge すると GitHub Pages が更新されることを確認する。
