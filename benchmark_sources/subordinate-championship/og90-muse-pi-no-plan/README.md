# 早押しクイズバトル（4人オンライン対戦）

Cloudflare Workers + Durable Objects + WebSocket で動く、4人対戦の早押しクイズWebアプリ。
**ローカル開発環境（`wrangler dev`）でのみ動かします。デプロイ不要・ログイン不要です。**

## 起動方法

```bash
npm install
npm run dev
```

→ http://localhost:8787 を開く（4人で遊ぶ場合は別ブラウザ／別プロファイル／シークレットウィンドウ等で同URL＋部屋コードを使う）。

- 開発サーバーは `http://localhost:8787` のみ常駐させること（他ポート常駐禁止）。
- テスト内では一時的に別ポート（18787等）を使う。

## 遊び方

1. 名前を入れて「部屋を作る」／部屋コードを入れて「参加する」（1部屋4人まで）。
2. ホストが「ゲーム開始」（2〜4人で押せる）。
3. 問題（4択・全10問）が出たら早押しボタン。サーバーに先に届いた1人だけ回答権。
4. 回答者は10秒以内に選択肢を選ぶ。正解 +10点／不正解 −5点。
5. 不正解者はその問題で押せなくなり、残りで早押し再開。全員押せなくなるか20秒で正解発表→次問。
6. 10問終了で最終順位。回線切断・再読み込みはトークンで同じプレイヤーに復帰（点数保持）。

## テスト

| コマンド | 内容 |
|---|---|
| `npm run typecheck` | TypeScript 型検査 |
| `npm run test:unit` | 単体テスト（`tests/engine.test.ts`：参加・定員・開始条件・同時押し・正誤判定・点数・タイマー・10問完走・復帰） |
| `npm run test:integration` | 結合テスト（`tests/integration.test.ts`：実サーバー＋4本のWebSocketで入室→定員拒否→開始→同時押し→正誤→再読み込み復帰→全10問完走、回答10秒タイムアウトのalarm動作）。一時的に別ポート18787の `wrangler dev` を自動起動 |
| `npm run test:e2e` | ブラウザE2E（`tests/e2e.spec.ts`：PC幅・スマホ幅で実ブラウザ4人同時プレイ、定員エラー表示、同時押しで回答権1人、リロード復帰、全10問→最終順位一致） |
| `npm test` | 上記をすべて実行 |
| `npm run shots` | スクリーンショット撮影（ロビー・出題中・回答中・正解発表・結果 × PC/モバイル幅を `.artifacts/` に保存） |

E2E・shots は Playwright のブラウザを使います（`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`）。

## 構成

- `src/worker.ts` … Worker エントリ（REST API＋DOへの振り分け）
- `src/room.ts` … Durable Object（部屋の状態管理・WebSocket・alarm）
- `src/engine.ts` … 純粋なゲームロジック（サーバー裁定・単体テスト対象）
- `src/questions.ts` … 内蔵の日本語4択問題10問
- `public/` … フロントエンド（`index.html` / `style.css` / `app.js`、ビルド不要）
- `wrangler.json` … ローカル開発設定（`dev.port: 8787`、D1/KV等は不使用）
- `tests/` … unit / integration / e2e
- `scripts/shots.mjs` … スクリーンショット撮影

詳しくは `ARCHITECTURE.md`、検証結果は `RESULT.md` を参照。
