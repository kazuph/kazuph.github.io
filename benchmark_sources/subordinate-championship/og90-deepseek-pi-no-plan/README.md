# 早押しクイズ（4人オンライン対戦）— BUZZ QUIZ

Cloudflare Workers + Durable Objects で動く、4人オンライン早押しクイズです。
**ローカル開発（`wrangler dev`）専用**で、Cloudflare へのデプロイやアカウントログインは不要です。

- アプリURL: <http://localhost:8787>
- 1部屋4人まで / 全10問 / 4択 / サーバーが早押し順と点数を判定
- 再読み込み・一時的な回線切断でも、同じ名前・同じ点数のまま復帰できます

---

## 1. 必要なもの

- Node.js 20 以上（動作確認は Node.js 24.20.0）
- 依存パッケージ（このリポジトリに同梱済み。`node_modules/` がある状態で届いています）

```bash
# 未インストールの場合のみ
npm install
```

## 2. 起動方法

```bash
npm run dev
# （中身は wrangler dev --port 8787）
```

- ブラウザで <http://localhost:8787> を開く
- 4人で遊ぶ場合は、同じPCのウィンドウを4つ開く（シークレットウィンドウ推奨：`localStorage` が別になるため）
  か、同じLAN内の端末から `http://<PCのIP>:8787` を開いてください
  （LAN内の別端末から使う場合は `npx wrangler dev --ip 0.0.0.0 --port 8787`）
- ヘルスチェック: <http://localhost:8787/api/health>

### 遊び方

1. 名前を入れて「部屋を作る」（ホスト）か、4文字の部屋コードを入れて「参加する」。
2. ホストの画面に「ゲームを開始する」が出ます（**2〜4人**で開始可、開始できるのはホストだけ）。
3. 問題が出たら全員に早押しボタンが出ます。**サーバーが最初に受け取った1人だけ**が回答権を得ます。
4. 回答権を得た人は10秒以内に4択を選ぶ。正解 **+10点** / 不正解 **-5点**。
5. 不正解の人はその問題ではもう押せません。残りの人で早押しが再開します。
6. 全員が押せなくなるか、問題が出てから20秒たつと正解を全員に表示して次の問題へ。
7. 10問終わると最終順位が全員に表示されます。
8. 途中で再読み込みしても、同じプレイヤー（同じ点数）として復帰します。

PC幅・スマホ幅のどちらでも、早押しボタンがスクロールなしで押せます。

### ポートについて

- アプリ本体: `8787`（固定。`wrangler.jsonc` の `dev.port`）
- inspector: `8788`（`8787` の隣。他プロセスと衝突したら `wrangler.jsonc` の `dev.inspector_port` を変えてください）
- テスト中も `8787` のみを使用します（別ポートで常駐するものはありません）

## 3. テスト方法

```bash
# 型チェック
npm run typecheck

# 単体テスト（ゲーム進行の状態機械）＋結合テスト（Worker + Durable Object + WebSocket）
# = 24 テスト。Cloudflare Workers ランタイム（workerd）上で実行されます。
npm test

# ブラウザE2E（Playwright / Chromium）。PC幅とスマホ幅の2プロジェクト = 8 テスト
# wrangler dev（localhost:8787）を自動起動します（起動済みならそれを再利用）
npm run test:e2e

# 全部まとめて
npm run test:all
```

- テスト内訳:
  - `test/game-logic.test.ts` … 19テスト（純粋なゲーム進行。時刻を注入するので待ち時間ゼロで20秒/10秒/3.5秒を検証）
  - `test/room-do.test.ts` … 5テスト（実際の Worker に HTTP + WebSocket で接続する結合テスト）
  - `e2e/quiz.spec.ts` … 4テスト × PC/スマホの2プロジェクト（実際のブラウザを4つ同時に動かす）
- E2E はスクリーンショットを `.artifacts/` に保存します（`.gitignore` 済み）。
  - `entry-*.png` / `lobby-*.png` / `question-*.png` / `answering-*.png` / `result-*.png` / `room-full-*.png`

ポート `8787` が既に使われている場合は、そのプロセスを止めてから実行してください
（`wrangler dev` が自分で起動するため）。

## 4. ディレクトリ構成

```
wrangler.jsonc           Workers / Durable Objects / Assets の設定（dev.port = 8787）
src/
  index.ts               Worker のエントリ（ルーティング。静的配信と /api/* の振り分け）
  room-do.ts             部屋 = Durable Object（WebSocket / Alarms / 永続化 / 配信）
  game-logic.ts          ゲーム進行の純粋な状態機械（サーバー権威。ここだけが正誤と点数を決める）
  questions.ts           内蔵の日本語4択クイズ10問（外部APIは使わない）
public/
  index.html             UI（控えめなDOM。すべて app.js が描画）
  app.js                 状態描画・WebSocket・再接続・カウントダウン
  styles.css             ダークテーマ + ネオンのUI（PC/スマホ対応）
test/                    vitest-pool-workers による単体・結合テスト
e2e/                     Playwright によるブラウザE2E
ARCHITECTURE.md          アーキテクチャの選択理由と、選ばなかった案
RESULT.md                課題の11項目ごとの達成状況とその確認方法
```

## 5. API（参考）

| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/rooms` | 部屋を作る。`{name}` → `{code, playerId, token}` |
| POST | `/api/rooms/:code/join` | 参加 / 復帰。`{name}` または `{name, playerId, token}` |
| GET | `/api/rooms/:code/ws?playerId=&token=` | WebSocket（ゲーム本体） |
| GET | `/api/rooms/:code/snapshot` | 現在の状態（デバッグ用） |
| GET | `/api/health` | ヘルスチェック |

WebSocket メッセージ（クライアント→サーバー）: `{t:"start"}` / `{t:"buzz"}` / `{t:"answer",choice:0-3}` /
`{t:"reset"}` / `{t:"leave"}` / `{t:"kick",playerId}` / `{t:"sync"}`
