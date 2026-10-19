# 早押しクイズ（4人オンライン対戦・Cloudflare ローカル開発）

Cloudflare Workers 上で動く、4人までで遊べる早押しクイズです。
**デプロイはしません。** Cloudflare アカウントへのログインも不要で、ローカルの `wrangler dev` だけで動きます。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:8787> を開きます。
`wrangler dev` はローカル実行（miniflare/workerd）なので、Cloudflare へのログインは求められません。

- ふつうの `wrangler dev` は 8787 番で待ち受けます（`wrangler.jsonc` の `dev.port`）。
- 補助ポート（inspector）は `0`（自動割り当て）にしてあるので、ほかの作業とぶつかりません。

遊び方:

1. 名前を入れて「部屋を作る」。表示された6文字の部屋コードを相手に伝える。
2. 相手は名前と部屋コードを入れて「参加する」。定員は4人。
3. 2〜4人そろったら、部屋を作った人（ホスト）が「ゲーム開始」を押す。
4. 問題が出たら「早押し！」（スペースキーでも可）。サーバーが最初に受け取った1人だけが回答できる。
5. 回答権を得た人は10秒以内に4択を選ぶ。正解 +10点、不正解（時間切れ含む）は -5点でその問題はもう押せない。
6. 全員が押せなくなるか、問題から20秒たつと正解が表示され、次の問題へ。
7. 10問終わると最終順位が出る。

## テスト方法

```bash
npm test
```

`npm test` は次の3つを順に実行します。

| コマンド | 内容 |
|---|---|
| `npm run typecheck` | `tsc --noEmit` による型検査（本体・テスト） |
| `npm run test:unit` | `vitest run`。ゲーム規則の純粋関数の単体テスト |
| `npm run test:e2e` | `playwright test`。`wrangler dev` を自動起動し、実ブラウザ4台で確認 |

個別に走らせる場合:

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npx playwright test --grep "2\. 4人が同時"   # テスト名で絞り込み
```

E2E テストは実時間で動きます（時間を縮めていません）。最後の「20秒で正解表示」「10秒で -5」も本物の待ち時間で確かめています。
そのため `npm test` 全体は3分程度かかります。

スクリーンショットは Playwright が `.artifacts/` に保存します（git には入れません）。
`tests/e2e/screenshots.spec.ts` を実行すると

- `lobby-pc.png` / `lobby-mobile.png`
- `question-pc.png` / `question-mobile.png`
- `answering-pc.png` / `answering-mobile.png`
- `result-pc.png` / `result-mobile.png`

が出力されます。

## ディレクトリ

| パス | 役割 |
|---|---|
| `src/worker.ts` | `/api/*` の入口。部屋コードを作って Durable Object に渡す |
| `src/room.ts` | 1部屋 = 1 Durable Object。保存・WebSocket・Alarm・配信 |
| `src/game.ts` | ゲーム規則だけの純粋関数（時刻は引数で受け取る） |
| `src/questions.ts` | 内蔵の日本語4択問題（16問から10問を出題） |
| `public/` | ビルド不要の素の HTML / CSS / JavaScript |
| `tests/unit/` | vitest の単体テスト |
| `tests/e2e/` | Playwright のブラウザテスト |

設計の理由は [ARCHITECTURE.md](./ARCHITECTURE.md)、課題項目ごとの確認結果は [RESULT.md](./RESULT.md) に書いています。
