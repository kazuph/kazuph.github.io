# 実装計画（上司が決めた設計）

TASK.md の課題を、この計画どおりに作る。ここに書いたことは決定済み事項として扱い、変えたいときは TASK.md の報告手順で上司に報告してから、計画どおりに進める。ここに書いていない細部は自分で決めてよい。

## 1. 構成

- Cloudflare Workers + Durable Objects（SQLite 版）+ WebSocket Hibernation API + Alarm + Workers Static Assets。
- 1部屋 = 1つの Durable Object。部屋コードから `env.ROOM.idFromName(code)` で引く。
- フロントはビルドなしの素の HTML / CSS / JavaScript（`public/`）。フレームワークは使わない。
- 依存は devDependencies の `wrangler`、`typescript`、`@cloudflare/workers-types`、`vitest`、`@playwright/test` だけ。

`wrangler.jsonc` の要点:

```jsonc
{
  "name": "buzzer-quiz",
  "main": "src/worker.ts",
  "compatibility_date": "2026-10-01",
  "assets": { "directory": "public", "run_worker_first": ["/api/*"] },
  "durable_objects": { "bindings": [{ "name": "ROOM", "class_name": "Room" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Room"] }],
  "dev": { "port": 8792, "inspector_port": 0 }
}
```

## 2. ファイル構成

| ファイル | 役割 |
|---|---|
| `src/worker.ts` | `/api/*` の受付。部屋の作成・参加・WebSocket の接続を Durable Object に渡す |
| `src/room.ts` | Durable Object。状態の保存・読み込み、WebSocket の受け付けと全員への配信、Alarm |
| `src/game.ts` | ゲームの規則だけを書いた純粋関数。時刻 `now` を引数で受け取り、副作用を持たない |
| `src/questions.ts` | 内蔵の日本語4択問題（12問以上。毎回そこから10問） |
| `public/index.html` `public/app.js` `public/style.css` | 画面 |
| `tests/unit/game.test.ts` | `game.ts` の単体テスト（vitest） |
| `tests/e2e/*.spec.ts` | 実ブラウザのテスト（Playwright。`wrangler dev` を起動して接続） |

コードは人が読める形で書く。1行は120字程度までにし、関数を短く分ける。

## 3. 通信

HTTP:

| メソッド | パス | 入力 | 出力 |
|---|---|---|---|
| POST | `/api/rooms` | `{ name }` | `{ code, playerId, token }`（作った人がホスト） |
| POST | `/api/rooms/:code/join` | `{ name }` | `{ code, playerId, token }`。満員は 409 `{ error: "満員です（4人まで）" }`、開始後は 409 `{ error: "ゲームはもう始まっています" }`、部屋なしは 404 |
| GET | `/api/rooms/:code/ws?token=…` | WebSocket へ切り替え。token が合わなければ 403 |

部屋コードは紛らわしい文字（0/O、1/I）を除いた英大文字と数字の6文字。

WebSocket（JSON）:

- ブラウザ → サーバー: `{ t: "start" }`、`{ t: "buzz", q: 問題番号 }`、`{ t: "answer", q: 問題番号, choice: 0〜3 }`
- サーバー → ブラウザ: `{ t: "state", ...全体の状態, you: playerId, serverNow }`、`{ t: "error", message }`

状態は毎回全量を送る。問題が出ている間は正解の番号を送らない（正解表示のときだけ送る）。ほかの人の token は送らない。

## 4. 規則（曖昧な点はこう決める）

フェーズ: `lobby` → `question` ⇄ `answering` → `reveal` → 次の `question` … → `finished`

- 開始はホストだけ、参加者2〜4人のとき。開始後の新規参加は拒否。
- `question`: 出題時刻から20秒が問題の締め切り。全員の早押しボタンが有効。
- 早押し: `question` のときに、まだ失格していない人の `buzz` を最初に処理した1人だけが回答権を得て `answering` へ。古い問題番号の `buzz` は無視。
- `answering`: 回答の締め切りは「押した時刻 + 10秒」と「問題の締め切り」の早いほう。
  - 正解: +10点、`reveal` へ。
  - 不正解、または回答の締め切りを過ぎた: -5点、その人はこの問題で失格。失格していない人が残っていれば `question` に戻る（問題の締め切りは変えない）。いなければ `reveal`。
- 問題の締め切りを過ぎたら、誰も答えていなくても `reveal`。
- `reveal` は3秒。正解を全員に見せてから次の問題へ。10問目のあとは `finished`。
- 点数はマイナスになってよい。同点は同じ順位。
- 時刻はすべてサーバーの時計で決める。メッセージを受けたときも Alarm のときも、まず締め切りを過ぎた処理をまとめて進めてから入力を処理する（`game.tick(state, now)`）。
- Alarm は「いちばん近い締め切り」1つだけを予約する。

## 5. 再接続

- 参加したときの `{ code, playerId, token }` をブラウザの `localStorage` に保存する。ページを開いたとき保存があれば、その token で WebSocket をつなぎ直す。
- 接続が切れたら1秒後から再接続を繰り返し、画面に「再接続中…」を出す。ブラウザの `offline` イベントで接続を閉じ、`online` イベントですぐつなぎ直す。
- 同じ token の新しい接続が来たら、古い接続を閉じる。
- 切れている人は席と点数をそのまま残し、ほかの人の画面に「接続が切れています」と出す。

## 6. 画面

画面は4つ: 入口（名前と、部屋を作る／部屋コードで参加）、ロビー、ゲーム（出題中・回答中・正解表示）、結果。

- 見た目の方向: 明るいクイズ番組風。白に近い背景、濃い紺の文字、早押しボタンは大きな赤い丸。色は CSS 変数で定義する。
- ゲーム画面の構成: 上に「第N問 / 10」と残り時間の棒、中央に問題文と4択（2×2）、その下に早押しボタン、横（スマホでは下）に参加者の点数一覧。
- 回答中の人のカードを強調し、全員の画面に「○○さんが回答中」と出す。失格した人のボタンは無効にし「この問題は回答済み」と出す。
- スマホ幅（390×844）では、問題文・4択・早押しボタンが**スクロールせずに1画面に収まる**こと。点数一覧はその下でよい。
- スペースキーでも早押しできる。
- 残り時間は `serverNow` との差を使って計算し、端末の時計がずれても全員で同じ値になるようにする。

## 7. テスト

単体テスト（`tests/unit/game.test.ts`）で最低限確かめること:

- 定員4人、5人目の拒否。開始は2〜4人・ホストだけ。
- 4人の `buzz` をどの順で処理しても、回答権を得るのは最初の1人だけ（24通りの並べ替えを全部試す）。
- 正解 +10、不正解 -5、回答10秒切れ -5 と失格、失格者の `buzz` は無視。
- 問題の20秒切れで `reveal`。回答中でも20秒で締め切る。
- 全員失格で `reveal`。10問後に `finished`、同点は同順位。
- 出題中の状態に正解が含まれない。

ブラウザのテスト（Playwright、`wrangler dev` を `webServer` で起動、**時間を縮めない**）で確かめること:

1. 4つの独立したブラウザ（PC幅3つ、スマホ幅1つ）で作成と参加。5人目の画面に「満員」が出る。
2. 4人が**同時に**早押しボタンを押す（`Promise.all` でクリック）。4択が有効になる画面がちょうど1つ。これを3問くり返す。
3. 回答者が不正解を選ぶと、全員の画面でその人が -5 点になり、その人のボタンが無効になる。
4. 回答者がページを再読み込みしても、同じ名前・同じ点数で戻る。
5. 1人の回線を5秒切って（`context.setOffline(true)`）戻すと、自動で再接続し、ほかの人の画面の「接続が切れています」が消える。
6. 誰も答えないと、実時間の20秒で正解が表示される。回答権を得て何も選ばないと、実時間の10秒で -5 点になる。
7. 4つの画面の残り時間の差が1秒以内。
8. 10問を最後まで遊び、4つの画面に同じ最終順位が出る。
9. ロビー・出題中・回答中・結果を PC幅とスマホ幅で撮影し `.artifacts/` に保存する。スマホ幅の出題中の画面で、問題文と早押しボタンが画面内に見えていることを確かめる。

`npm test` で型検査・単体・ブラウザのテストがすべて走るようにする。
