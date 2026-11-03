# 早押しクイズ ⚡ 4人対戦

最大4人が同じ部屋に入って、内蔵の日本語4択クイズ10問を早押しで競う Web アプリです。
Cloudflare Workers + Durable Objects（WebSocket・Alarm）で動き、ローカルの `wrangler dev` だけで遊べます（デプロイ・Cloudflare へのログインは不要）。

設計の理由は [ARCHITECTURE.md](./ARCHITECTURE.md)、各要件の確認結果は [RESULT.md](./RESULT.md) にあります。

## 必要なもの

- Node.js 22 以上
- （E2E テストと撮影だけ）Playwright の Chromium: `npx playwright install chromium`

## 起動

```sh
npm install
npm run dev        # = wrangler dev → http://localhost:8786
```

`wrangler.jsonc` でポートを `8786`、デバッガ用の inspector を `18786` に固定しています。

## 遊び方

1. 名前を入れて「部屋を作る」。表示された5文字の部屋コード（または「招待リンクをコピー」の URL）を友だちに伝える。
2. 友だちは名前と部屋コードを入れて「参加する」。定員は4人。
3. 2〜4人そろったら、部屋を作った人（👑）が「ゲーム開始」。
4. 問題が出たら早押しボタン（PC はスペースキーでも可）。サーバーが最初に受け取った1人だけが回答できる。
5. 回答権を得たら10秒以内に4択から選ぶ（キー 1〜4 でも可）。正解 +10点、不正解・時間切れ -5点。
6. 外した人はその問題ではもう押せず、残りの人で早押し再開。全員が押せなくなるか出題から20秒で正解発表。
7. 10問終わると最終順位。ホストの「もう一度遊ぶ」で同じメンバーで再戦できる。

ゲーム中に再読み込みしても、回線が一時的に切れても、同じプレイヤーとして点数を保ったまま戻れます。

## テスト

```sh
npm run typecheck   # TypeScript の型検査（サーバー・単体・結合・E2E）
npm test            # 単体 + 結合テスト（Vitest。Workers のランタイム workerd の中で実行）
npm run test:e2e    # ブラウザE2E（Playwright。テスト専用の wrangler dev をポート18796で自動起動・終了）
npm run test:all    # 上の3つを順に全部
```

- 単体テスト `tests/unit/game.test.ts`: ルール（定員、開始条件、早押しの先着、点数、締め切り、順位）。
- 結合テスト `tests/integration/room.test.ts`: 本物の Worker と Durable Object を HTTP と WebSocket で操作。4本の WebSocket から同時に押して回答権が1人だけ、同時に5人参加しても定員まで、Alarm による時間切れ、休止・破棄からの復帰。
- E2E `tests/e2e/game.spec.ts`: 4つの独立したブラウザで実際の画面を操作。同時クリックで回答者1人、再読み込み・回線断からの復帰、4画面の残り時間のずれ、4人で10問完走、スマホ幅。

E2E は開発サーバー（8786）とは別のポートと保存先（`.wrangler/e2e-state`）を使うので、開発サーバーを起動したままでも実行できます。

## 画面の撮影

開発サーバーを起動した状態で:

```sh
npm run screenshots   # .artifacts/screenshots/ に PC 幅（1280×800）とスマホ幅（390×844）の各画面を保存
```

`.artifacts/` は git に入れません。

## ファイル構成

```
src/index.ts      Worker の入口（部屋の作成・参加・WebSocket の転送、静的ファイル配信）
src/room.ts       部屋の Durable Object（WebSocket・保存・Alarm・配信）
src/game.ts       ルール本体（純粋関数）
src/questions.ts  内蔵の問題（20問から毎回10問を選ぶ）
src/code.ts       部屋コードの生成
public/           画面（index.html・style.css・app.js、ビルド不要）
tests/            unit / integration / e2e
scripts/screenshots.mjs  各画面の撮影
```
