# 早押しクイズ（4人オンライン対戦）

Cloudflare Workers 上で動く、4人対戦の早押しクイズWebアプリ。
ローカル開発環境（`wrangler dev`）だけで動かす構成です。デプロイ不要、
Cloudflare アカウントへのログイン不要です。

## 起動方法

```sh
npm install
npm run dev
```

`http://localhost:8787` を開きます。4人で遊ぶときは、
別のブラウザ（シークレットウィンドウやスマホ幅など）で同じ URL を開き、
表示された部屋コードを入力して参加します。

## 遊び方

1. 名前を入れて「部屋を作る」か、部屋コードを入れて「参加する」
2. ホストが「ゲーム開始」（2〜4人で開始可）
3. 問題が出たら「早押し！」ボタン（またはスペースキー）
4. 回答権を得たら10秒以内に4択から選ぶ（正解 +10、不正解 -5）
5. 10問終わると最終順位を表示

## テスト方法

```sh
npm test
```

`npm test` は型検査・単体テスト・ブラウザE2Eテストをすべて走らせます。
個別に走らせる場合:

```sh
npm run typecheck   # TypeScript の型検査
npm run test:unit    # game.ts の単体テスト（vitest）
npm run test:e2e     # 実ブラウザのE2Eテスト（Playwright + wrangler dev）
```

E2Eテストは一時的に `http://127.0.0.1:18787` で `wrangler dev` を起動します
（Playwright の `webServer` 設定）。普段の開発サーバー `8787` とは別ポートで、
テスト内の一時利用だけです。

## 構成

- `src/worker.ts` — `/api/*` の受付（作成・参加・WebSocket転送）
- `src/room.ts` — Durable Object（1部屋=1オブジェクト、状態保存・配信・Alarm）
- `src/game.ts` — ゲーム規則の純粋関数（サーバー側の判定の中核）
- `src/questions.ts` — 内蔵の日本語4択問題（14問、毎回10問を出題）
- `public/` — ビルドなしの素の HTML / CSS / JavaScript
- `tests/unit/game.test.ts` — 単体テスト（15件）
- `tests/e2e/game.spec.ts` — ブラウザE2Eテスト（3件、実時間で計測）

詳しくは `ARCHITECTURE.md`、確認結果は `RESULT.md` を見てください。
