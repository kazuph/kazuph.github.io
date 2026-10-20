# 早押しクイズ（4人オンライン対戦）

Cloudflare Workers 上で動く、4人までの早押しクイズです。開発は
`wrangler dev` によるローカル実行だけで完結し、デプロイや Cloudflare アカウントへの
ログインは不要です。

- 部屋を作る／部屋コードで参加する
- 出題されたら全員で早押し。**サーバーが最初に受け取った1人だけ**が回答できる
- 正解 +10点、不正解 -5点。不正解の人はその問題ではもう押せない
- 1問20秒・回答10秒・正解表示3秒。全10問で最終順位を表示
- 再読み込みや一時的な回線切断でも、同じプレイヤーとして点数を保って復帰

## 必要なもの

- Node.js 20 以上（動作確認は Node.js 24）
- 依存パッケージ（`npm install`）

```bash
npm install
# Playwright のブラウザが入っていない環境では一度だけ
npx playwright install chromium
```

## 起動方法

```bash
npm run dev
```

ブラウザで <http://localhost:8787> を開きます。
同じPCの別タブ・別ブラウザで開けば、4人まで同時に遊べます。
スマホ幅（390×844）でも、問題文・4択・早押しボタンがスクロールなしで1画面に収まります。

`wrangler.jsonc` で開発サーバーを `127.0.0.1:8787` に固定し、inspector ポートを
0（自動）にしています（`localhost` でも同じ場所につながります）。別のポートで
常駐させないでください。

## テスト方法

型検査・単体テスト・ブラウザテストをまとめて実行します。

```bash
npm test
```

個別に実行する場合:

```bash
npm run typecheck   # TypeScript の型検査
npm run test:unit   # ゲーム規則の単体テスト（vitest）
npm run test:e2e    # 実ブラウザのテスト（Playwright が wrangler dev を起動）
```

- 単体テスト（`tests/unit/game.test.ts`）: 4人の押す順を24通り試して1人だけが
  回答権を得ること、点数、失格、20秒・10秒の締め切り、同順位、出題中に正解を
  送らないことなど。
- ブラウザテスト（`tests/e2e/`）: 4つの独立したブラウザで参加と5人目の拒否、
  4人同時押し、不正解、再読み込み復帰、回線切断からの復帰、実時間の20秒・10秒、
  残り時間の一致、10問完走と最終順位。PC幅とスマホ幅のスクリーンショットも
  `.artifacts/` に保存します。

Playwright はテストの間だけ `wrangler dev` を起動し、終了時に止めます。
テスト内の待ち時間は本物の秒数です（時間を短縮していません）。

## 画面

| 画面 | 内容 |
|---|---|
| 入口 | 名前を入れて「部屋を作る」、または部屋コードで「参加する」 |
| ロビー | 部屋コード、参加者、ホストの「ゲーム開始」 |
| ゲーム | 第N問・残り時間の棒、問題文、4択、早押しボタン、得点一覧 |
| 結果 | 最終順位（同点は同順位） |

## ファイル構成

```
wrangler.jsonc        開発サーバー・Durable Object・静的アセットの設定
src/worker.ts         /api/* の受付
src/room.ts           Durable Object（保存・WebSocket・Alarm）
src/game.ts           ゲーム規則（純粋関数）
src/questions.ts      内蔵の日本語4択問題
public/               画面（HTML / CSS / JavaScript）
tests/unit/           単体テスト
tests/e2e/            ブラウザテスト
```

設計の詳細は [`ARCHITECTURE.md`](./ARCHITECTURE.md)、課題の各項目の達成状況は
[`RESULT.md`](./RESULT.md) を参照してください。
