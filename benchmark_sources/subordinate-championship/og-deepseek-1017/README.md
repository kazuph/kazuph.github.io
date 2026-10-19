# 早押しクイズ（4人オンライン対戦）

Cloudflare Workers のランタイム上で動く、4人オンライン対戦の早押しクイズです。
**ローカル開発（`wrangler dev`）専用**で、デプロイや Cloudflare アカウントのログインは不要です。

- 部屋を作る／部屋コードで参加する
- 1部屋 4人まで（5人目は理由つきで拒否）
- ホストが開始（2〜4人）
- 内蔵の日本語4択を10問
- 早押しは**サーバーが最初に受け取った1人だけ**が回答権を得る
- 正解 +10 / 不正解 -5、不正解者はその問題で再押不可
- 全員押せない or 問題提示から20秒で正解発表 → 次の問題
- リロード・一時的な回線断でも同じプレイヤーとして復帰（点数保持）
- 点数・残り時間・誰が回答中かが全員の画面で同期

---

## 必要なもの

- Node.js 20 以上（確認は v24 で実施）
- 依存はすでにインストール済み（`node_modules/`）。再取得する場合:

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

`http://localhost:8787` をブラウザで開きます（`wrangler dev` のローカル実行。ログイン不要）。
複数タブ／複数ブラウザで開くと 4人対戦を確認できます。

- 1人目:「ニックネーム」を入れて「部屋を作る」→ 表示された部屋コードを共有
- 2人目以降:「ニックネーム」と「部屋コード」を入れて「部屋に参加する」
- ホストが「ゲーム開始」を押すとスタート（2〜4人）

補助ポート（inspector）は `wrangler.toml` の `[dev]` で `39217` に固定し、`8787` と衝突しないようにしています。

## テスト方法

```bash
npm test            # 単体 → 結合 → ブラウザE2E をまとめて実行
npm run test:unit         # Vitest（ゲームロジックの単体テスト）
npm run test:integration  # 実サーバー + WebSocket の結合テスト（Node）
npm run test:e2e          # Playwright によるブラウザE2E（4人同時対戦・復帰）
```

- 単体: `test/unit/engine.test.ts`
- 結合: `test/integration/ws.test.mjs`（`wrangler dev` を一時ポート `38741` で自動起動し、終了時に停止）
- E2E: `e2e/quiz.spec.ts`（Playwright が `wrangler dev` を `8787` で自動起動。`reuseExistingServer`）

> この VM にはブラウザが `/ms-playwright` に同梱されています。`playwright.config.ts` と
> スクリーンショットスクリプトは、環境変数 `PLAYWRIGHT_BROWSERS_PATH` が未設定なら
> 自動で `/ms-playwright` を参照します。

## スクリーンショット

```bash
npm run screenshots   # .artifacts/ に lobby / question / answering / result を PC・スマホ幅で保存
```

`.artifacts/` は `.gitignore` 済みです。

## 構成

```
src/
  index.ts      Worker エントリ（ルーティング、静的アセット配信）
  room.ts       Durable Object「部屋」（WebSocket 保持・状態の永続化・アラーム）
  engine.ts     サーバー権威のゲームエンジン（純粋・時刻は引数で注入）
  questions.ts  内蔵の日本語4択クイズ10問
  protocol.ts   クライアント／サーバー間メッセージ型
public/         UI（index.html / app.js / styles.css。ビルド不要のバニラJS）
test/unit       単体テスト
test/integration 実サーバー結合テスト
e2e/            ブラウザE2E
scripts/        スクリーンショット取得
```

設計の詳細と採用理由は [`ARCHITECTURE.md`](./ARCHITECTURE.md)、
要件ごとの検証結果は [`RESULT.md`](./RESULT.md) を参照してください。
