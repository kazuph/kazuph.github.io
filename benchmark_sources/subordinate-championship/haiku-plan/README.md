# 早押しクイズ（4人オンライン・Cloudflare ローカル開発）

部屋を作って4人（2〜4人で開始）が同じ問題に早押しで答える、日本語の4択クイズです。
動かすのはローカル開発環境（`wrangler dev`）だけで、デプロイはしません。Cloudflare のアカウントへのログインも不要です。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:8792 を開きます。別の人として4人分遊ぶには、人ごとにシークレットウィンドウか別のブラウザプロファイルを使ってください。同じブラウザの別タブは同じ人として扱われます（参加情報を localStorage で共有するため）。

- 部屋を作る: 名前を入れて「部屋を作る」。表示された部屋コードを友だちに伝えます。
- 参加する: 名前と部屋コードを入れて「参加する」。定員は4人です。
- 開始: 部屋を作った人（ホスト）が、2〜4人そろったら「ゲームを開始」を押します。
- 早押し: 「押す！」ボタンか、スペースキー。最初にサーバーが受け取った1人だけが4択に答えられます。

## テスト方法

| コマンド | 中身 |
|---|---|
| `npm run typecheck` | 型検査（`src`・`tests/unit`・`tests/e2e`） |
| `npm run test:unit` | ゲームの規則の単体テスト（vitest。`tests/unit/game.test.ts`） |
| `npm run test:e2e` | 実ブラウザの E2E（Playwright。`wrangler dev` を 8792 番で自動起動し、実時間で遊ぶ） |
| `npm test` | 上の3つをすべて順番に実行 |

注意:
- `npm run test:e2e` は 8792 番で `wrangler dev` を自動で起動します。先に `npm run dev` を止めてから実行してください（同じポートが使われていると失敗します）。
- E2E は時間を縮めていません（20秒・10秒・3秒の締め切りをそのまま待つ）。全体で約2〜3分かかります。
- 初回は Playwright のブラウザが必要です: `npx playwright install chromium`
- スクリーンショットは `.artifacts/screenshots/` に保存されます（git にはコミットしません）。

## ファイル

- `src/game.ts` … ゲームの規則（純粋関数。時刻は引数で受け取る）
- `src/room.ts` … 部屋の Durable Object（状態の保存、WebSocket、Alarm）
- `src/worker.ts` … `/api/*` の受付
- `src/questions.ts` … 内蔵の問題（16問。1ゲームで10問をランダムに選ぶ）
- `public/` … 画面（HTML・CSS・JavaScript。ビルドなし）
- `ARCHITECTURE.md` … 構成の理由と、選ばなかった案
- `RESULT.md` … 遊び方の項目ごとの確認結果
