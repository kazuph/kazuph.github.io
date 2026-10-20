# 早押しクイズ（4人オンライン対戦 / Cloudflare Workers・ローカル開発限定）

Cloudflare Workers + Durable Objects で動く、4人まで入れる早押しクイズです。
**デプロイはしません。Cloudflare アカウントへのログインも不要です。** 動かすのはローカルの
`wrangler dev`（Cloudflare 公式のローカル実行）だけです。

- 部屋コードで集まって、ホストが開始
- 全10問・4択・内蔵の日本語問題（外部 API は使わない）
- 早押しはサーバーが最初に受け取った1人だけが回答権を得る
- 正解 +10点 / 不正解 −5点、間違えた人はその問題ではもう押せない
- 再読み込みや回線の一時切断から、同じ点数で復帰できる

## 必要なもの

- Node.js 20 以上（確認は v24）
- 依存パッケージ（`wrangler` / `vitest` / `@playwright/test` など）。この環境には `node_modules` が
  すでに入っているので追加の作業は不要です。別のマシンに持っていく場合だけ次を実行してください。

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

- アプリの URL: <http://localhost:8787>
- ポートは `8787` 固定（`wrangler.jsonc` の `dev.port`）。inspector は `dev.inspector_port: 0` で無効にしている。
- ログインもアカウント設定も不要。表示される `Request.cf` の警告は、ローカルでネットワークが無いためのもので動作に影響しない。

ブラウザを4つ（PC幅・スマホ幅どちらでも可）開き、1人が「部屋を作る」、残りが部屋コードで
「参加する」を押すと遊べます。同じ PC で複数のウィンドウを使う場合は、ウィンドウごとに
別の名前を入れてください（`localStorage` はウィンドウ／プロファイル単位で保存されます）。

### ゲームの流れ

1. 名前を入れて「部屋を作る」（ホスト）／部屋コードを入れて「参加する」
2. 2〜4人になったらホストが「ゲームを開始」
3. 問題が出たら「早押し！」ボタン（スペースキーでも可）を押す
4. 回答権を得た人は10秒以内に4択を選ぶ
5. 10問おわったら最終順位が出る

## テスト方法

```bash
npm test            # 型検査 → 単体テスト → ブラウザE2E（これだけ覚えればOK）
```

個別に走らせる場合:

```bash
npm run typecheck   # TypeScript の型検査（tsc --noEmit）
npm run test:unit   # vitest による game.ts（ゲーム規則）の単体テスト
npm run test:e2e    # Playwright によるブラウザE2E（wrangler dev を自動で起動）
```

- `npm run test:e2e` は Playwright の `webServer` が `npx wrangler dev` を起動して
  `http://localhost:8787/api/health` が返るまで待ちます。すでに `npm run dev` が動いていれば
  それを使い回します（`reuseExistingServer: true`）。
- 早押しの20秒・回答の10秒は**短縮していません**。実時間で待って確かめています。
- ブラウザは `PLAYWRIGHT_BROWSERS_PATH` の Chromium を使います。

### テストの構成

| ファイル | 何を確かめるか |
|---|---|
| `tests/unit/game.test.ts` | ゲーム規則（定員・開始条件・早押し・点数・締め切り・順位・配信する状態） |
| `tests/e2e/lobby.spec.ts` | 入口・部屋コード・定員・開始条件 |
| `tests/e2e/gameplay.spec.ts` | 同時押し・不正解・20秒/10秒の締め切り・全画面の同期 |
| `tests/e2e/reconnect.spec.ts` | 再読み込み復帰・回線切断からの自動再接続 |
| `tests/e2e/fullgame.spec.ts` | 4人が10問さいごまで遊び、4画面で同じ順位になる |
| `tests/e2e/ws-concurrency.spec.ts` | WebSocket を直に使った結合テスト（4接続から同時に buzz して1人だけが回答権を得る） |
| `tests/e2e/screenshots.spec.ts` | PC幅/スマホ幅のスクリーンショット保存と、スマホ1画面に収まるかの確認 |

スクリーンショットは `.artifacts/` に保存されます（git には入れません）。

## ディレクトリ構成

```
src/worker.ts      Workers の入口（/api/* を Durable Object に渡す）
src/room.ts        1部屋 = 1 Durable Object（保存・WebSocket・Alarm）
src/game.ts        ゲーム規則だけの純粋なモジュール（時刻は引数で受け取る）
src/questions.ts   内蔵の日本語4択問題
public/            画面（ビルドなしの HTML / CSS / JS）
tests/unit/        vitest
tests/e2e/         Playwright
```

設計の理由と、選ばなかった案は `ARCHITECTURE.md` に、課題の項目ごとの達成状況は
`RESULT.md` にまとめています。
