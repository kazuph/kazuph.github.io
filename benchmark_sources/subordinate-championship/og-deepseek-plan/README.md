# 早押しクイズ・アリーナ

4人がオンラインで同じ部屋に入り、早押しで答えるクイズゲームです。
Cloudflare Workers のローカル実行（`wrangler dev`）だけで動きます。デプロイも Cloudflare アカウントへのログインも不要です。

- 1部屋の定員は4人
- 内蔵の日本語4択問題から毎回10問
- 問題は20秒、回答権を得たら10秒以内に回答
- 正解は +10点、不正解・時間切れは -5点
- 早押し・正誤判定・点数はすべてサーバー側で決定
- 再読み込み・一時的な回線断から同じ点数で復帰

## 起動方法

必要なもの: Node.js 20 以上、npm。

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:8787> を開きます。ほかのポートで開発サーバーを常駐させません。
部屋を作ったら、表示された6文字の部屋コードを別のブラウザ（別プロファイル／別端末）で入力して参加します。

> 同じブラウザの同じプロファイルでは、最後に参加したプレイヤーとして自動復帰する設計です。
> 4人で試すときは、通常のウィンドウとシークレットウィンドウ、別ブラウザなど、保存領域が分かれた環境を使ってください。

Ctrl+C で停止します。ローカルの部屋データは `.wrangler/state/` に保存されます。消してよければ `rm -rf .wrangler` で初期化できます。

## 操作

- 名前を入れて「部屋を作る」、または部屋コードを入れて「参加する」
- ホストが2人以上そろって「ゲーム開始」
- 問題が出たら大きな赤い丸、または **スペースキー** で早押し
- 回答権を得たら、10秒以内に4択をクリック
- 不正解・時間切れになると、その問題ではもう押せません
- 誰も答えられないまま20秒たつと正解が表示され、次の問題へ進みます

画面は PC 幅とスマホ幅（390×844）の両方に対応しています。スマホ幅では、問題文・4択・早押しボタンがスクロールせずに1画面に収まります。

## テスト

```bash
npm test
```

次の3つを順番に実行します。途中で失敗したらそこで終了します。

```bash
npm run typecheck   # Workers 側とテスト側の TypeScript 型検査
npm run test:unit   # ゲーム規則の単体テスト（vitest）
npm run test:e2e    # 実ブラウザの結合テスト（Playwright）
```

`npm run test:e2e` は `wrangler dev` を自動で起動し、`http://localhost:8787` に接続してから終了時に停止します。先に `npm run dev` を起動しているとポートがぶつかるので、停止してから実行してください。時間短縮はせず、20秒・10秒・3秒の締め切りを実時間で待つテストを含むため、全体で数分かかります。

スクリーンショットだけを作り直す場合:

```bash
npm run screenshots
```

`.artifacts/` に次の8枚が保存されます（`.artifacts/` は git 管理外）。

| 画面 | PC幅 | スマホ幅 |
|---|---|---|
| ロビー | `.artifacts/pc-lobby.png` | `.artifacts/mobile-lobby.png` |
| 出題中 | `.artifacts/pc-question.png` | `.artifacts/mobile-question.png` |
| 回答中 | `.artifacts/pc-answering.png` | `.artifacts/mobile-answering.png` |
| 結果 | `.artifacts/pc-result.png` | `.artifacts/mobile-result.png` |

主なテスト:

- `tests/unit/game.test.ts`: 定員、開始条件、4人の早押し24通りの並べ替え、正解/不正解/時間切れ、20秒締め切り、全員失格、10問終了、同順位、状態に正解が漏れないこと
- `tests/e2e/game.spec.ts`: 4人同時参加、5人目の拒否、同時押しで1人だけ、不正解の失格、再読み込み復帰、回線断からの復帰、実時間20秒/10秒、残り時間の一致、10問の最終順位、スペースキー
- `tests/e2e/screenshots.spec.ts`: 8枚のスクリーンショットと、スマホ幅で問題文・早押しボタンが画面内にあることの確認

## ファイル構成

| パス | 内容 |
|---|---|
| `src/worker.ts` | `/api/*` の受付、部屋コードの発行、静的 assets の配信 |
| `src/room.ts` | 1部屋 = 1 Durable Object。WebSocket・保存・Alarm |
| `src/game.ts` | 時計を引数で受け取る純粋なゲーム規則 |
| `src/questions.ts` | 内蔵の日本語4択問題（16問） |
| `public/` | ビルドなしの HTML / CSS / JavaScript |
| `tests/unit/` | vitest の単体テスト |
| `tests/e2e/` | Playwright のブラウザテスト |
| `ARCHITECTURE.md` | 採用した構成と、採用しなかった案の理由 |
| `RESULT.md` | 要件ごとの確認方法と達成状況 |

## 仕組み（要約）

- 部屋コードから `env.ROOM.idFromName(code)` で Durable Object を1つ決めます。
- ブラウザは `/api/rooms/:code/ws?token=...` で WebSocket に接続します。Durable Object が token を照合します。
- 状態は Durable Object の SQLite ストレージに保存し、接続中の全員に毎回全量を配信します。
- 早押しは Durable Object がメッセージを処理した順で、最初の1人だけを回答者にします。
- 締め切りは Alarm で進めます。クライアントの時計は表示にだけ使い、判定には使いません。
- 再接続は `localStorage` の `{ code, playerId, token }` を使います。同じ token の新しい接続が来たら古い接続を閉じます。

詳しくは [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。
