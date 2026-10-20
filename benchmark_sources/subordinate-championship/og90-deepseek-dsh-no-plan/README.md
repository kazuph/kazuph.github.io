# 早押しクイズ — 4人オンライン対戦（Cloudflare / ローカル開発限定）

Cloudflare Workers 上で動く、4人が同じ部屋に入って遊ぶ早押しクイズです。
**ローカル開発環境（`wrangler dev`）専用**で、デプロイや Cloudflare アカウントへのログインは不要です。

- 4択・内蔵の日本語問題を全 10 問
- 早押しは **サーバー（Durable Object）が最初に受け取った 1 人だけ**に回答権を与える
- 出題 20 秒 / 回答 10 秒 / 正解発表 4 秒、すべてサーバー側の締切で進行
- 正解 **+10 点** / 不正解 **−5 点**、不正解者はその問題ではもう押せない
- 再読み込み・一時的な切断でも同じプレイヤーとして点数を保って復帰
- 点数・残り時間・回答中の人が全員の画面でそろう
- PC 幅・スマホ幅の両対応

## 必要なもの

- Node.js 20 以上（動作確認は Node 24）
- 依存パッケージ（`npm install` 済みのはず）:
  `wrangler`, `vitest`, `@playwright/test`, `typescript`

```bash
npm install
# ブラウザ E2E を動かす場合のみ（初回だけ）
npx playwright install chromium
```

> この作業環境では Playwright のブラウザが `/ms-playwright` にあるため、
> `playwright.config.ts` が自動で `PLAYWRIGHT_BROWSERS_PATH` を設定します。

## 起動方法

```bash
npm run dev
```

- ブラウザで **http://localhost:8787** を開きます（`wrangler dev` のローカルモード）。
- ポートは `wrangler.jsonc` の `dev.port: 8787` に固定。inspector は `0`（自動割り当て）にして
  他の開発サーバーと衝突しないようにしています。
- 停止は `Ctrl + C`。

## 遊び方

1. 名前を入れて「**部屋を作る**」を押すと部屋コード（例: `FDE8`）が出ます。
2. 他の人は名前と部屋コードを入れて「**参加する**」を押します（定員 4 人）。
3. 5 人目は入れず、画面に「この部屋は満員です（定員4人）」と理由が出ます。
4. 部屋を作った人（ホスト）が「**ゲーム開始**」を押すと開始します（2〜4 人で開始可能）。
5. 問題が出たら全員の画面に大きな早押しボタンが出ます。最初に押した 1 人だけが回答権を得ます。
6. 回答権を得た人は 10 秒以内に 4 択から選びます。正解 +10 点、不正解 −5 点。
7. 不正解だった人はその問題ではもう押せません。残りの人で早押しが再開します。
8. 全員が押せなくなるか、出題から 20 秒たつと正解が全員に表示され、次の問題へ進みます。
9. 10 問終わると最終順位が全員に表示されます。
10. ゲーム中に再読み込みしても、同じ名前・同じ点数で復帰します。

## テスト方法

| コマンド | 内容 |
| --- | --- |
| `npm run test:unit` | ゲームロジックの単体テスト（vitest, Node） |
| `npm run test:integration` | 実際の `wrangler dev` を一時ポートで起動して行う結合テスト（4 WebSocket クライアント） |
| `npm run test:e2e` | Playwright によるブラウザ E2E（PC 幅・スマホ幅の 4 人フルゲーム、再読み込み復帰、5 人目拒否） |
| `npm test` | 上 3 つをまとめて実行 |
| `npm run screenshots` | スクリーンショット（`.artifacts/`）だけを再生成 |

```bash
npm run test:unit        # 22 tests
npm run test:integration # 5 tests（1件は 20 秒タイマー検証のため約 25 秒）
npm run test:e2e         # 4 tests（フルゲーム 2 本を含むため数分）
```

- 結合テスト・E2E はテスト中だけ別ポートで `wrangler dev` を起動します（常駐させません）。
- E2E は `http://127.0.0.1:8787` を使い、起動中の開発サーバーがあれば再利用します。
- スクリーンショットは `.artifacts/` に出力され、git にはコミットされません（`.gitignore` 済み）。

### スクリーンショット

| 画面 | PC 幅 | スマホ幅 |
| --- | --- | --- |
| ロビー | `.artifacts/lobby-desktop.png` | `.artifacts/lobby-mobile.png` |
| 出題中 | `.artifacts/question-desktop.png` | `.artifacts/question-mobile.png` |
| 回答中 | `.artifacts/answering-desktop.png` | `.artifacts/answering-mobile.png` |
| 結果 | `.artifacts/result-desktop.png` | `.artifacts/result-mobile.png` |

## ディレクトリ構成

```
wrangler.jsonc             Cloudflare Workers / Durable Objects / Static Assets 設定
public/                    フロントエンド（静的アセット）
  index.html  styles.css  app.js
src/
  worker.ts                Worker の入口。API ルーティングと部屋コード発行
  room.ts                  QuizRoom Durable Object（WebSocket / alarm / 永続化）
  game.ts                  ゲーム進行の純粋ロジック（正誤・点数・早押し・締切）
  questions.ts             内蔵の日本語 4 択 10 問
  env.ts / 型定義
tests/
  unit/game.test.ts        vitest（ゲームロジック）
  integration/             wrangler dev を起動する結合テスト
  e2e/quiz.spec.ts         Playwright（ブラウザ E2E + スクリーンショット）
```

設計の詳細と選定理由は [`ARCHITECTURE.md`](./ARCHITECTURE.md)、
課題項目ごとの達成状況は [`RESULT.md`](./RESULT.md) を参照してください。

## 決定済み事項の遵守

- 実行環境は Cloudflare Workers ランタイム。ローカルは `wrangler dev`。
- **デプロイしない / Cloudflare にログインしない**（`wrangler dev` のローカルモードのみ）。
- アプリ URL は `http://localhost:8787`。開発サーバーを 8787 以外のポートで常駐させない。
- 有料・外部のリアルタイム配信サービスは使わず、Cloudflare の機能（Workers / Durable Objects / WebSocket / DO Storage / Alarms）だけで完結。
- 正誤判定・点数・早押しの順番はすべてサーバー側で決定（ブラウザの申告は使わない）。
