# バズクイズ — 4人オンライン対戦 早押しクイズ

Cloudflare Workers + Durable Objects + WebSocket で動く、4人対戦の早押しクイズ。
ローカル開発環境（`wrangler dev`）でのみ動かす前提です。デプロイ・Cloudflare ログインは不要。

## 必要なもの

- Node.js 20+（開発は Node 22 で確認）
- `npm install` 済みであること

## 起動

```bash
npm install
npm run dev
```

`http://localhost:8785` をブラウザで開く。複数人で試す場合は複数のブラウザ／タブ／端末（同一 LAN）から開く。

`npm run dev` は `wrangler dev --port 8785 --inspector-port 0` を実行します
（inspector はポート 0 = ランダム割当で、他プロセスと衝突しません）。

## 遊び方

1. 名前を入力して「部屋を作る」→ 6桁の部屋コードが表示される。
2. 他のプレイヤーは名前と部屋コードを入力して「参加する」。定員4人。
3. ホスト（部屋を作った人）の「ゲーム開始」で開始。2〜4人が必要。
4. 内蔵の日本語4択問題が10問出る。問題が出たら全員に PUSH! ボタンが表示され、
   **サーバーが最初に受け取った1人だけ**が回答権を得る。
5. 回答権を得た人は10秒以内に4択を選ぶ。正解 +10点、不正解 −5点・タイムアウトも −5点。
6. 不正解の人はその問題では押せなくなり、残りの人で早押しを再開する。
7. 全員が押せなくなるか、出題から20秒で正解が全員に表示され、次の問題へ進む。
8. 10問終了で最終順位が表示される。ホストは「もう一度遊ぶ」でロビーに戻せる。
9. 再読み込み・一時的な切断でも、ブラウザに保存されたセッションで同じプレイヤーとして復帰する。

## テスト

```bash
# 単体・結合テスト（workerd 上で Worker + Durable Object を実際に動かす）
npm test

# ブラウザ E2E（4クライアントを実際に操作して完走 + .artifacts/ にスクリーンショット）
npm run test:e2e

# 両方
npm run test:all

# 型チェック
npm run typecheck
```

`npm test` は `@cloudflare/vitest-pool-workers` で実際の workerd ランタイム上に
Worker と Durable Object を起動し、HTTP と WebSocket 経由で検証します。
時間系ルール（回答10秒・出題20秒・リビール5秒）はテストでは `vitest.config.ts` の
bindings で短縮しています（仕様値は `wrangler.jsonc` の vars）。

`npm run test:e2e` は Playwright が `wrangler dev` を自動起動（既に起動していれば再利用）
して、PC幅3人+モバイル幅1人の計4クライアントで1ゲームを完走させます。

## 構成

```
wrangler.jsonc        # Workers + Durable Object (Room) + Static Assets 設定
src/worker.ts         # Worker エントリ（HTTP ルーティング → DO へ転送）
src/room.ts           # Room Durable Object（部屋の全ロジック・WebSocket・タイマー）
src/questions.ts      # 内蔵の日本語4択問題 10問
src/protocol.ts       # クライアント/サーバー間メッセージ型
public/               # 静的フロントエンド（index.html / app.js / style.css）
test/quiz.spec.ts     # vitest 結合テスト 16件
e2e/game.spec.ts      # Playwright E2E（完走 + スクリーンショット）
ARCHITECTURE.md       # 設計の説明と選択理由
RESULT.md             # 遊び方11項目の検証結果表
```
