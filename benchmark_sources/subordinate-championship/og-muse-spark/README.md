# ⚡早押しクイズアリーナ（4人オンライン対戦）

Cloudflare Workers 上で動く、4人オンライン対戦の早押しクイズWebアプリ。
ローカル開発環境（`wrangler dev`）でのみ動かします。デプロイ不要・ログイン不要。

## 遊び方

1. 名前を入れて「部屋を作る」か、部屋コードを入れて「参加する」
2. 1部屋の定員は4人（5人目は「満員です」と表示されて入れない）
3. 部屋を作った人（ホスト）が「開始」（2〜4人のときのみ）
4. 内蔵の日本語4択問題が10問出題される
5. 早押しボタン → サーバーが最初に受け取った1人だけが回答権を得る
6. 回答権を得た人は10秒以内に4択から選ぶ（正解+10点／不正解−5点）
7. 不正解者はその問題ではもう押せない。残りの人で早押し再開
8. 全員が押せなくなるか出題から20秒で正解表示 → 次の問題へ
9. 10問終わったら最終順位を表示
10. 再読み込み・一時的切断でも同じプレイヤーとして点数維持で復帰（自動復帰）
11. 点数・残り時間・回答者名は全員の画面に同時配信される

## 起動方法

```bash
npm install
npm run dev
# → http://localhost:8787 を開く
```

- 必要なものは `node_modules` に同梱済みの `wrangler` のみ。外部サービス・ログイン不要。
- 開発サーバーは `http://localhost:8787` 固定（他のポートで常駐させない）。
- 4人で遊ぶには、同じPCの別ブラウザ／シークレットウィンドウ／スマホ（同一LANなら `http://<PCのIP>:8787`）で同じ部屋コードを入力。

## テスト方法

```bash
npm test          # 単体テスト（早押し・採点・定員・復帰など12件 / vitest）
npm run test:e2e  # ブラウザE2E（4人同時プレイ・同時押し・復帰・満員・10問完走 / Playwright）
npm run screenshots  # .artifacts/ に画面スクリーンショットを保存（PC幅+スマホ幅×4画面）
npm run typecheck # TypeScript 型チェック
```

- E2E・スクリーンショットは内部で一時的に `wrangler dev`（ポート18887／18888）を自動起動します。常駐はしません。
- ブラウザは `/ms-playwright` 配下の Chromium を使います（`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`）。

## 構成

- `src/game.ts` — ゲーム進行の純粋ロジック（早押し・正誤判定・採点・タイマー遷移）。単体テスト対象。
- `src/questions.ts` — 内蔵の日本語4択問題10問。
- `src/room.ts` — Durable Object（部屋ごとの権威サーバー＋WebSocket配信）。
- `src/index.ts` — Workerエントリ（HTML配信＋`/ws`をDurable Objectへ振り分け）。
- `public/index.html` — フロントエンド（単一HTML、PC幅・スマホ幅対応）。
- `test/game.test.ts` — 単体テスト、`test/e2e.spec.ts` — ブラウザE2E。

詳しくは `ARCHITECTURE.md`、検証結果は `RESULT.md` を参照。
