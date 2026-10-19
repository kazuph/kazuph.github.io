# 早押しクイズ BUZZ!

4人がオンラインで同じ部屋に入って対戦する早押しクイズ。Cloudflare Workers + Durable Objects で動き、
**ローカル開発環境（`wrangler dev`）だけで動かす**（デプロイしない・Cloudflare へのログイン不要）。

## 起動

```sh
npm install
npm run dev        # wrangler dev。http://localhost:8791 で開く
```

遊び方: 名前を入れて「部屋を作る」→ 表示された6文字の部屋コードを友だち（別のブラウザ・別の端末）に伝える →
全員が揃ったらホストが「ゲーム開始」（2〜4人）。早押しボタンは画面のボタンかスペースキー。

## テスト

```sh
npm test               # 型検査 + 単体テスト + ブラウザE2E を全部走らせる
npm run typecheck      # tsc（src と tests）
npm run test:unit      # vitest（ゲーム規則の単体テスト）
npm run test:e2e       # Playwright（wrangler dev を自動で起動して実ブラウザで確認）
```

- E2E は実時間で確かめるテスト（20秒・10秒の時間切れ、10問通し）を含むので、全体で約3〜4分かかる。
- Playwright のブラウザが無い場合は `npx playwright install chromium` を先に実行する。
- E2E が撮るスクリーンショット（ロビー・出題中・回答中・正解表示・結果。PC幅とスマホ幅）は `.artifacts/screenshots/` に保存される（git には入れない）。
- 8791 番ポートで `wrangler dev` がすでに動いていれば、E2E はそれを使い回す。

## 構成

設計の理由は [ARCHITECTURE.md](./ARCHITECTURE.md)、確認結果は [RESULT.md](./RESULT.md)。

| ファイル | 役割 |
|---|---|
| `src/worker.ts` | `/api/*` の受付。部屋コードから Durable Object を引いて渡す |
| `src/room.ts` | Durable Object。状態の保存、WebSocket、Alarm |
| `src/game.ts` | ゲームの規則（純粋関数） |
| `src/questions.ts` | 内蔵の日本語4択問題（16問から毎回10問） |
| `public/` | 画面（ビルドなしの HTML / CSS / JavaScript） |
| `tests/unit/` `tests/e2e/` | 単体テスト / ブラウザテスト |
