# kazuph.github.io

This repository powers <https://kazuph.github.io/>.

The site is a blog-first GitHub Pages site. Existing HTML slides under `presentation/` are preserved and listed from the sidebar.

## Write a Post

Markdown:

```txt
_posts/YYYY-MM-DD-title.md
```

HTML:

```txt
_posts/YYYY-MM-DD-title.html
```

Every post should include front matter:

```yaml
---
title: Title
description: Short summary
---
```

## Local Preview

```sh
nix-shell
bundle install
ruby scripts/fetch_zenn_articles.rb
bundle exec jekyll serve
```

Flakes are also available:

```sh
nix --extra-experimental-features 'nix-command flakes' develop
```

Open <http://127.0.0.1:4000/>.

## Zenn Articles

Published Zenn articles are fetched from Zenn public pages at build time. The
generated Jekyll posts are intentionally ignored by Git:

```txt
_posts/zenn/
```

Run the fetch script before building:

```sh
ruby scripts/fetch_zenn_articles.rb
bundle exec jekyll build
```

Each generated post keeps the original Zenn URL as `source_url` and
`canonical_url`.

## Slides

Keep existing slide directories under `presentation/`. Add sidebar entries to `_data/slides.yml`.
