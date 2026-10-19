# 早押しクイズ (4人オンライン対戦)

Cloudflare Workers + Durable Objects 上で動く、4人が同じ部屋で対戦する早押しクイズです。
**ローカル開発専用** (`wrangler dev`)。Cloudflare アカウントへのログインもデプロイも不要です。

## 起動方法

```bash
npm install
npm run dev
# → http://localhost:8787 を開く
```

- 1人目が「なまえ」を入れて **部屋を作る** と部屋コード(4文字)が発行されます。
- URL に `#/room/<コード>` が付くので共有するか、コードを入れて他の人が **参加する**。
- 4人集まったらホストが **ゲーム開始**。全10問の4択クイズで早押し対戦します。

## テスト方法

```bash
# 結合テスト (workerd 上で実行、WebSocket で 4人同時接続などを検証)
npm run test

# ブラウザ E2E (4つのブラウザページで 10問を最後までプレイし、
# .artifacts/screens/{pc,sp}/ に各場面のスクリーンショットを保存)
npm run test:e2e

# 型チェック
npm run typecheck
```

- 結合テスト: `test/room.spec.ts` — vitest + `@cloudflare/vitest-pool-workers`。
  テスト内ではタイマーを短く (`wrangler.jsonc` の `env.test`) しているため実ロジックのまま高速に検証します。
- E2E: `e2e/quiz.spec.ts` — Playwright。テストは `http://localhost:8787` で実行します
  (既に `npm run dev` が動いていればそれを再利用します)。
  Playwright のブラウザは `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx playwright test` のように
  環境変数で指定できる環境を想定しています (通常の `npx playwright install chromium` でも可)。

## 構成

- `src/index.ts` — Worker エントリ。`/api/room/<コード>/ws` を Durable Object へ中継、それ以外は静的アセット。
- `src/room.ts` — Durable Object (`Room`)。部屋の状態管理・早押し判定・得点計算・タイマー (alarm)。
- `src/questions.ts` — 内蔵の日本語4択問題 10問。
- `public/` — フロントエンド (バニラ HTML/CSS/JS)。
- `test/room.spec.ts` — 結合テスト。`e2e/quiz.spec.ts` — ブラウザ E2E。

アーキテクチャの詳細と選定理由は `ARCHITECTURE.md`、項目別の検証結果は `RESULT.md` を参照してください。
