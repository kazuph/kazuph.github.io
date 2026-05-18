---
layout: post
title: "BunのRustリライト前後をビルドして、どこが速くなったのか？"
date: 2026-05-16
description: "BunのRustリライト直前と直後をローカルでビルドし、同じ条件で比較したベンチマーク記録です。"
full_ai: true
image: /images/posts/bun-rust-rewrite-benchmark/rust-vs-zig-bars.svg
---

<img src="/images/posts/bun-rust-rewrite-benchmark/rust-vs-zig-bars.svg" alt="Before RustとAfter Rustのどちらが何倍速いかを横棒で示した比較図" width="1200" height="760" loading="eager" decoding="sync">

## 何を確かめたかったのか

2026年5月14日、Bunにコア実装をZigからRustへ移す大きな変更がマージされました。対象のコミットは [`23427dbc`](https://github.com/oven-sh/bun/commit/23427dbc12fdcff30c23a96a3d6a66d62fdc091d) で、コミットメッセージは "Rewrite Bun in Rust (#30412)" です。

こういう大きなリライトを見ると、差分の大きさそのものよりも「実際に使う側から見て何が変わるのか」が気になります。そこで、Rust化の直前と直後のBunをそれぞれ手元でビルドし、同じ負荷をかけて比べることにしました。

比較対象はこの2つです。

- **Before Rust**: `b8ecc78b03c998c228be4520bb8d2f888624e4a1`
- **After Rust**: `23427dbc12fdcff30c23a96a3d6a66d62fdc091d`

`.rs` と `.zig` に絞っても、差分は `1747 files changed, 982807 insertions(+), 1322 deletions(-)` でした。かなり大きな移行です。

確認日は2026年5月16日 JST。

## 実行環境

ベンチマークは、次の1台のローカル環境で実行しました。

| 項目 | 内容 |
|---|---|
| OS | macOS 26.4 |
| Kernel | Darwin 25.4.0 / arm64 |
| CPU | Apple M5 |
| CPU core | 10 physical / 10 logical |
| Memory | 32 GB |
| hyperfine | 1.20.0 |

同じマシン上でBefore RustとAfter Rustのrelease binaryをそれぞれビルドし、同じfixtureと同じ `hyperfine` 設定で測っています。

## まず両方をビルドする

リポジトリは `https://github.com/oven-sh/bun.git` からcloneしました。`main` をfetchしたあと、リライト前後のコミットを別々のworktreeに切り出しました。

```bash
git worktree add ../bun-zig-before b8ecc78b03c998c228be4520bb8d2f888624e4a1
git worktree add ../bun-rust-after 23427dbc12fdcff30c23a96a3d6a66d62fdc091d
```

ビルド条件は揃えたかったので、どちらも同じrelease profileを使いました。

```bash
bun install --frozen-lockfile
bun run build:release --build-dir=build/bench-release
```

手元では次のツールが必要でした。

```bash
brew install llvm@21 lld@21 ninja hyperfine
rustup toolchain install nightly --component rust-src
```

LLVM 21とnightly Rustを使うように、環境変数も明示しました。

```bash
export PATH="/opt/homebrew/opt/llvm@21/bin:/opt/homebrew/opt/lld@21/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/llvm@21/lib"
export CPPFLAGS="-I/opt/homebrew/opt/llvm@21/include"
export CMAKE_PREFIX_PATH="/opt/homebrew/opt/llvm@21"
export RUSTUP_TOOLCHAIN="nightly"
```

結果として、どちらのreleaseバイナリもビルドできました。

| Build | Commit | Version output | バイナリサイズ | ビルド時間 |
|---|---:|---:|---:|---:|
| Before Rust | `b8ecc78b` | `1.3.14-canary.1+b8ecc78b0` | 59 MB | 約8分 |
| After Rust | `23427dbc` | `1.3.14-canary.1+23427dbc1` | 55 MB | 約12分26秒 |

バイナリサイズはRust化後のほうが小さくなりました。一方で、まっさらな状態からのrelease buildはRust化後のほうが長くなりました。新しく入ったCargo workspaceがRust側のcoreを `libbun_rust.a` としてビルドするため、ここは素直に重くなっています。

## 何を測ったか

<div class="msg message">
  <div class="msg-symbol">i</div>
  <div class="msg-content">
    <p>ここで実行しているベンチマークケースはAIが考えたものです。</p>
  </div>
</div>

小さすぎるベンチマークだと、Bun本体の差ではなくプロセス起動の差を見てしまいます。かといって大きすぎると何を測っているのか追いにくくなります。そこで、中身を読める程度のfixtureをいくつか用意しました。

ベンチケースの設計はAIが行いました。方針は「Rust化で効きそうなbuild/transpile系を中心にしつつ、runtime寄りの処理も混ぜて、実環境で同じ条件で測る」ことです。実際に使ったfixture、実行スクリプト、hyperfineの出力は [secret gist](https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25) に置いています。

一番見たかったのは `bundle-big-ts` です。大きめのTypeScriptファイルをbundleしてminifyするケースで、parse、TypeScriptの変換、symbol処理、出力、minifyがまとめて通ります。

生成した `big.ts` の中身はだいたいこういうものです。

- `export const seed = 1`
- exportされたTypeScript関数を8,000個
- 各関数は `export function f123(x: number) { return ((x + 123) * 3) ^ 26; }` のような形
- 17個おきに関数を呼んで合計するループ
- 末尾に `console.log(total)` を1つ

このfixtureでは、次のコマンドを測りました。

```bash
bun build fixtures/src/big.ts --outfile=results/big.js --minify
```

ほかにも、Bunをbuild toolとして使うケースとruntimeとして使うケースが混ざるようにしました。

- `transpiler-loop`: `big.ts` に対して `Bun.Transpiler({ loader: "ts" })` を80回実行
- `build-api-loop`: 500個のmoduleからなるグラフに対して `Bun.build({ write: false })` を20回実行
- `bundle-big-tsx`: 2,500個のReact風component exportを含むTSXファイル
- `bundle-many-modules`: 1つのentrypointから500個の小さなmoduleをimportするケース
- `run-big-ts` と `run-big-tsx`: 生成したTypeScript/TSXファイルをそのまま実行
- `run-many-modules`: 500 moduleのグラフをruntimeで読み込むケース
- `test-runner-400`: 1ファイルに400個の `bun:test` を置いたケース
- `json-parse`: 100,000件のJSONを読み込んでparse
- `glob-loop`, `file-read-loop`, `hash-loop`, `package-scripts`, `version`

`install-small-cold` も試しましたが、速すぎて `hyperfine` が片方を0秒として扱ってしまいました。さすがに結論に入れるには怪しいので除外しました。手動で見る限り、小さなinstallはどちらもだいたい `0.01s` で終わっていました。

## 結果

表の `rust_vs_zig` は、After Rustの時間をBefore Rustの時間で割った値です。`1.0` より小さければRust化後のほうが速いです。

グラフでは、中央の `1.0x` を基準にして、速い側へ棒を伸ばしています。数字は速い側が何倍速いかを表し、棒の長さもその倍率に比例しています。

<img src="/images/posts/bun-rust-rewrite-benchmark/rust-vs-zig-bars.svg" alt="Before Rustを1.0として、After Rustが速いか遅いかを横棒で示した比較図" width="1200" height="760" loading="lazy">

| Case | 何を見るか | Code | Before Rust mean | After Rust mean | rust_vs_zig | 読み方 |
|---|---|---|---:|---:|---:|---|
| `hash-loop` | `Bun.hash` で大きめの入力を繰り返しhashするBun API処理です | [code][code-hash] / [result][result-hash] | 1.409s | 0.341s | 0.242 | After Rustが約4.1倍速いです |
| `bundle-big-ts` | 8,000関数の大きなTypeScriptを `bun build --minify` する処理です | [fixture][code-big-ts] / [result][result-bundle-big-ts] | 95.3ms | 34.1ms | 0.358 | After Rustが約2.8倍速いです |
| `transpiler-loop` | `Bun.Transpiler` で大きなTypeScriptを80回変換する処理です | [code][code-transpiler] / [result][result-transpiler] | 1.946s | 0.792s | 0.407 | After Rustが約2.5倍速いです |
| `run-big-tsx` | 2,500 component exportを含むTSXをruntimeで実行する処理です | [fixture][code-big-tsx] / [result][result-run-big-tsx] | 31.9ms | 20.4ms | 0.640 | After Rustが約1.6倍速いです |
| `run-big-ts` | 8,000関数のTypeScriptをruntimeで実行する処理です | [fixture][code-big-ts] / [result][result-run-big-ts] | 30.8ms | 21.8ms | 0.708 | After Rustが約1.4倍速いです |
| `bundle-big-tsx` | 大きめのTSXを `bun build --minify` する処理です | [fixture][code-big-tsx] / [result][result-bundle-big-tsx] | 50.6ms | 37.2ms | 0.736 | After Rustが約1.36倍速いです |
| `bundle-many-modules` | 500個の小さなmodule graphをbundle/minifyする処理です | [fixture][code-many] / [result][result-bundle-many] | 49.3ms | 36.8ms | 0.746 | After Rustが約1.34倍速いです |
| `build-api-loop` | `Bun.build({ write: false })` を20回呼ぶbuild API処理です | [code][code-build-api] / [result][result-build-api] | 255.7ms | 224.1ms | 0.877 | After Rustがやや速いです |
| `version` | `bun --version` の最小CLI起動です | [command][code-version] / [result][result-version] | 4.6ms | 4.2ms | 0.911 | 小さすぎてほぼ起動ノイズです |
| `glob-loop` | `Bun.Glob` でfixture配下を繰り返しscanする処理です | [code][code-glob] / [result][result-glob] | 127.5ms | 124.2ms | 0.974 | ほぼ同等です |
| `run-many-modules` | 500 module graphをruntimeで読み込む処理です | [fixture][code-many] / [result][result-run-many] | 25.8ms | 25.3ms | 0.979 | ほぼ同等です |
| `file-read-loop` | `Bun.file(...).text()` で大きなTypeScriptを繰り返し読む処理です | [code][code-file-read] / [result][result-file-read] | 47.5ms | 47.8ms | 1.006 | ほぼ同等です |
| `package-scripts` | 小さなpackageの `bun run` script chain実行です | [fixture][code-package] / [result][result-package] | 220.6ms | 226.5ms | 1.027 | ほぼ同等です |
| `eval-arithmetic` | `bun -e` で単純なJavaScript加算loopを実行する処理です | [command][code-eval] / [result][result-eval] | 28.2ms | 35.6ms | 1.261 | Before Rustが速いです |
| `test-runner-400` | 400個の `bun:test` caseを実行するtest runner処理です | [fixture][code-test] / [result][result-test] | 13.3ms | 19.0ms | 1.428 | Before Rustが速いです |
| `json-parse` | 100,000件のJSONを読んで `JSON.parse` する処理です | [code][code-json] / [result][result-json] | 28.4ms | 49.0ms | 1.725 | Before Rustが速いです |

[code-hash]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-hash-loop-js
[code-big-ts]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-generate-fixtures-js-L6-L16
[code-transpiler]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-transpiler-loop-js
[code-big-tsx]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-generate-fixtures-js-L18-L24
[code-many]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-generate-fixtures-js-L26-L33
[code-build-api]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-build-api-loop-js
[code-version]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-run-bench-sh-L33
[code-glob]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-glob-loop-js
[code-file-read]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-file-read-loop-js
[code-package]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-generate-fixtures-js-L44-L60
[code-eval]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-run-bench-sh-L34
[code-test]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-generate-fixtures-js-L35-L39
[code-json]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-json-run-js
[result-hash]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-hash-loop-md
[result-bundle-big-ts]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-bundle-big-ts-md
[result-transpiler]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-transpiler-loop-md
[result-run-big-tsx]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-run-big-tsx-md
[result-run-big-ts]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-run-big-ts-md
[result-bundle-big-tsx]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-bundle-big-tsx-md
[result-bundle-many]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-bundle-many-modules-md
[result-build-api]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-build-api-loop-md
[result-version]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-version-md
[result-glob]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-glob-loop-md
[result-run-many]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-run-many-modules-md
[result-file-read]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-file-read-loop-md
[result-package]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-package-scripts-md
[result-eval]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-eval-arithmetic-md
[result-test]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-test-runner-400-md
[result-json]: https://gist.github.com/kazuph/f135de62775238a8b8a2424525846b25#file-json-parse-md

一番大きい収穫は、Rust化の効果が出てほしいところできちんと差が出ていたことです。特に `bundle-big-ts` と `transpiler-loop` は、TypeScriptを扱う日常の作業にかなり近いです。ここで2倍以上の差が出ているのは大きいです。

一方で、全部が速くなったわけではありません。JavaScriptの単純な計算、小さめのtest runner、JSON parseは、今回の測定ではBefore Rustのほうが速かったです。Rust化したから何でも速くなる、という話ではなさそうです。

## どう受け取ればよさそうか

Bunをbuild toolとして使っているなら、今回の結果はかなり前向きに見てよさそうです。

速くなったのは、普段のfrontendやserver-side TypeScript開発でよく出てくる処理だからです。

- 大きなTypeScriptファイルを変換する
- entrypointからbundleする
- 出力を生成してminifyする
- 小さなmoduleをたくさん辿る
- toolchainの中でbuild APIを何度も呼ぶ

`bun build` や `Bun.build`、TypeScript変換、内部のコード生成スクリプトに時間がかかっているプロジェクトなら、Rust化直後の段階でも待ち時間が減る可能性はあります。

逆に、Bunをruntimeとして主に使っている場合は、もう少し慎重に見たほうがよいです。今回の測定ではmodule loadingとfile readはほぼ横ばいでしたし、小さなruntime処理やtest runnerでは遅くなったものもあります。

なので、実用上はこう読むのがよさそうです。

- buildが重いプロジェクトでは、先に恩恵が出やすいです
- runtime中心のserviceでは、自分たちのhot pathを測ったほうがよいです
- 小さすぎるCLI commandは起動時間のノイズが大きいので、読みすぎないほうがよいです
- test runnerやJSONを多く扱う処理は、今後の最適化後にもう一度測りたいです

## 検証メモ

ベンチマークには `hyperfine` を使いました。基本はwarmup 2回、計測10-12回です。生の結果はJSONとMarkdownで出力し、あとでTSVにまとめました。

最低限、次のようにバージョンと計測コマンドを確認しています。

```bash
build/bench-release/bun --version
hyperfine --warmup 2 --runs 12 \
  --command-name "zig-before" "<Before Rust command>" \
  --command-name "rust-after" "<After Rust command>"
```

## まとめ

Before Rustの時点で、Bunはすでにかなり速かったです。今回も、runtime寄りの小さなベンチマークではBefore Rustのほうが速いケースが残っています。

それでも、実プロジェクトでまず効きそうなbuildと変換処理では、After Rustがかなり速いです。ローカルビルドではrelease binaryも小さくなりましたし、TypeScriptのbundleやtranspileではすぐに分かる差が出ていました。

結論としては、Rust化後のBunはまだ「何でも速い」状態ではありません。ただ、build-heavyなBunユーザーにとっては、もう十分に意味のある改善に見えます。

gpt-5.5
