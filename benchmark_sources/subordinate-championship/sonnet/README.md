# 早押しクイズバトル

最大4人がオンラインで同じ部屋に入り、日本語の4択クイズ10問を早押しで競うWebアプリ。
Cloudflare Workers + Durable Objects（WebSocket）で動き、**ローカル開発（`wrangler dev`）だけ**で完結します。デプロイも Cloudflare アカウントへのログインも不要です。

## 起動

```bash
npm install
npm run dev        # wrangler dev → http://localhost:8781
```

ブラウザで `http://localhost:8781` を開く → 名前を入れて「部屋を作る」。ほかの人（別タブ・別ブラウザ・別端末）は「部屋コード」を入れて「参加する」（`?room=ABCD` 付きのリンクからも入れます）。

制限時間は既定で「出題から20秒・回答10秒・正解表示5秒」です。テスト用に `--var QUESTION_MS:4000 --var ANSWER_MS:1500 --var REVEAL_MS:500 --var LOBBY_GRACE_MS:1500` のように上書きできます。

## テスト

| コマンド | 内容 | 目安 |
|---|---|---|
| `npm run typecheck` | 型検査 | 数秒 |
| `npm run test:unit` | 進行ロジックの単体テスト（vitest。Cloudflare 不要） | 1秒 |
| `npm run test:integration` | 結合テスト。実物の `wrangler dev`（workerd）を**空いているポートで一時起動**し、WebSocket で4人分を同時に操作。既定の20秒/10秒で動く確認も含む | 約1分 |
| `npm run test:e2e` | ブラウザE2E（Playwright / Chromium）。同じく空きポートで一時起動し、PC幅・スマホ幅で4人が10問を遊び切る。スクリーンショットを `.artifacts/screenshots/` に保存 | 約1分 |
| `npm test` | 上の全部 | 約3分 |

- 初回だけ `npx playwright install chromium` が必要な場合があります。
- テストは `8781` を使いません（空きポートを自動選択）。`npm run dev` を起動したままでも実行できます。
- 「同時押しで1人だけが回答権を得る」＝ 単体 `同時に押しても最初に処理された1人だけ…` / 結合 `4人が同時に押しても、毎回ちょうど1人だけ…` / E2E `PC幅: 4人が同時に遊び切る`
- 「再読み込みで復帰」＝ 結合 `再接続（項目10）` 4件 / E2E 同上（再読み込み）と `接続が一時的に切れても自動で再接続…`
- 「4人が同時に遊べる」＝ 結合 `4人で10問を最後まで遊び…` / E2E PC幅・スマホ幅

## 構成

`src/game.ts`（進行ロジック・純粋関数）/ `src/index.ts`（Worker と Durable Object）/ `src/questions.ts`（内蔵の問題20問から毎回10問）/ `public/`（画面）。詳しくは `ARCHITECTURE.md`、検証結果は `RESULT.md`。
