# アーキテクチャ

4人オンライン早押しクイズを、Cloudflare のローカル実行環境（`wrangler dev`）だけで動かすための設計をまとめる。デプロイや Cloudflare アカウントへのログインは前提にしていない。

## 1. 全体像

```
ブラウザ (public/ : 素の HTML / CSS / JS)
   │
   │  HTTP  POST /api/rooms            … 部屋を作る
   │  HTTP  POST /api/rooms/:code/join … 部屋に入る
   │  WebSocket /api/rooms/:code/ws    … 状態の受信・操作の送信
   ▼
Worker (src/worker.ts)  … /api/* の受付だけを担当
   │  env.ROOM.idFromName(code) で部屋ごとの DO を引く
   ▼
Durable Object「Room」(src/room.ts)  … 1部屋 = 1インスタンス
   │  ├─ SQLite ストレージに state を保存
   │  ├─ WebSocket Hibernation API で全員に配信
   │  ├─ Alarm で時間切れを進める
   │  └─ src/game.ts（純粋関数）でルールを判定
   ▼
Workers Static Assets  … public/ の配信
```

採用したもの:

| 要素 | 役割 |
|---|---|
| Cloudflare Workers | HTTP と WebSocket の入口。静的配信 |
| Durable Objects（SQLite 版） | 部屋ごとの権威ある状態と、処理の直列化 |
| WebSocket Hibernation API | 接続中の全員への配信。DO が眠っても接続を維持 |
| Durable Object Alarm | 20秒・10秒・3秒の締め切りをサーバー側で進める |
| Workers Static Assets | `public/` をビルドなしで配信 |
| 素の HTML / CSS / JS | フロント。フレームワークもビルドも使わない |
| Vitest | `src/game.ts` のルールの単体テスト |
| Playwright | 実ブラウザでの E2E テストとスクリーンショット |

## 2. なぜこの構成にしたか

### 部屋ごとに Durable Object を分ける

早押しは「最初に届いた1人だけが回答権を得る」ことが本質で、複数の入力を**到着順に直列化**して、最初の1つだけを採用する必要がある。

Durable Object は1インスタンスが単一スレッドでイベントを1つずつ処理し、ストレージ操作のあいだは入力ゲートでほかのイベントを止める。そのため「4人同時押し」でも、DO に届いた順に `buzz` を処理し、最初の1人だけを回答者にすればよく、ロックや排他制御を自前で書かなくてよい。これは採点対象の「同時押しで1人だけが回答権を得る」を、仕組みとして保証する。

部屋コードから `env.ROOM.idFromName(code)` でインスタンスを引くので、部屋ごとに独立した状態・Alarm・接続を持てる。1つの DO に全員を入れる方式にしなかったのは、部屋が増えても干渉せず、部屋ごとのライフサイクル（Alarm・切断・Hibernation）を閉じられるからである。

「SQLite 版」(`new_sqlite_classes`) を選んだのは、無料枠でも使えて、DO のストレージ API（`storage.get/put/setAlarm`）がそのまま動くため。1部屋の状態は JSON 1件（数 KB）で、SQL を直接書く必要はない。

### ゲームの規則を純粋関数に分ける

`src/game.ts` は副作用を持たず、`now`（サーバーの時刻）を引数で受け取り、新しい状態を返すだけにした。

- サーバー側で正誤判定・点数・早押しの順番がすべて決まる。ブラウザから来るのは「押した」「この番号を選んだ」だけで、点数は送らせない。
- 時刻を引数にしたので、単体テストで 19.999秒 / 20秒 / 20.001秒 のような境界を実時間を待たずに確かめられる。
- DO 側のコード（`room.ts`）は「保存する」「配信する」「Alarm を張る」だけにし、ルールの見通しをよくした。

### 時間切れは Alarm で進める

問題の20秒、回答の10秒、正解発表の3秒は、誰かの操作がなくても進む必要がある。クライアントにタイマーを持たせて進めると、全員の画面で進行がずれたり、ずるができたりする。

そこで「いちばん近い締め切り」を `nextDeadline(state)` で1つだけ計算し、`storage.setAlarm(deadline)` を予約する。Alarm が起きたら `tick(state, now)` で締め切りを過ぎた処理をまとめて進め、全員に配信してから次の Alarm を張り直す。Alarm は常に1つだけなので、予約の取り消し漏れや二重進行が起きない。

### 再接続はトークンと Hibernation API で

参加時にサーバーが発行した `{ code, playerId, token }` をブラウザの `localStorage` に保存する。再読み込み時は同じ `token` で `/ws` につなぎ直すので、同じ席・同じ点数に戻る。

WebSocket は Hibernation API（`acceptWebSocket`）で受け付け、`serializeAttachment({ playerId })` に持ち主を書いておく。DO がメモリから追い出されても、接続とプレイヤーの対応が復元できる。同じ `token` で新しい接続が来たら古い接続を閉じ、`webSocketClose` では「同じ人の別の接続が残っているか」を確認してから切断扱いにするので、再接続の途中で「接続が切れています」がちらつかない。

### 状態は毎回全部送る

`publicState()` は1人ぶんの見え方をまとめて作り、`{ t: "state", ... }` として毎回全量を送る。差分同期にしないのは、状態が小さく（4人×数フィールド＋問題1問）、「全員の画面がそろう」ことが要件の中心だからである。点数・締め切り・回答者・接続状態を同じ状態から描くので、画面どうしのずれが起きにくい。

正解の番号は `phase === "reveal"` のときだけ含め、出題中・回答中には含めない。ブラウザの開発者ツールを見ても答えは分からない。

### 残り時間はサーバー時計に合わせる

各メッセージに `serverNow` を入れ、ブラウザは受信時に `offset = serverNow - Date.now()` を求める。残り時間は締め切り（絶対時刻）と `Date.now() + offset` の差で描くので、端末の時計がずれていても全員が同じ値を見る。

## 3. 通信の仕様

### HTTP

| メソッド | パス | 入力 | 出力 |
|---|---|---|---|
| POST | `/api/rooms` | `{ name }` | `{ code, playerId, token }`（作った人がホスト） |
| POST | `/api/rooms/:code/join` | `{ name }` | `{ code, playerId, token }` |
| GET | `/api/rooms/:code/ws?token=…` | — | WebSocket へ切り替え |

エラー:

- 5人目: 409 `{ "error": "満員です（4人まで）" }`
- 開始後: 409 `{ "error": "ゲームはもう始まっています" }`
- 部屋なし: 404 `{ "error": "部屋が見つかりません" }`
- トークン不一致: 403

部屋コードは紛らわしい `0/O`・`1/I` を除いた英大文字＋数字の6文字。

### WebSocket（JSON）

ブラウザ → サーバー:

- `{ t: "start" }`
- `{ t: "buzz", q: 問題番号 }`
- `{ t: "answer", q: 問題番号, choice: 0〜3 }`

サーバー → ブラウザ:

- `{ t: "state", ...全体の状態, you: playerId, serverNow }`
- `{ t: "error", message }`

`q` は問題番号（0始まり）。サーバーは現在の問題と一致しない `buzz` を無視し、フェーズが合わない入力をエラーにする。これで古いメッセージが次の問題に影響しない。

## 4. 状態遷移

```
lobby ──(ホストが開始, 2〜4人)──▶ question
question ──(最初の buzz)──▶ answering
question ──(20秒経過)──▶ reveal
answering ──(正解 +10)──▶ reveal
answering ──(不正解 -5 / 10秒経過 -5, 残りあり)──▶ question
answering ──(不正解 / 時間切れ で全員失格)──▶ reveal
answering ──(問題の20秒に到達)──▶ reveal
reveal ──(3秒)──▶ question（次の問題）
reveal ──(3秒, 10問目)──▶ finished
```

- 回答の締め切りは `min(押した時刻 + 10秒, 問題の締め切り)`。
- 不正解・時間切れの人は `lockedOut` になり、その問題ではもう押せない。
- 点数はマイナスになってよい。同点は同じ順位。

## 5. ファイル構成

| ファイル | 役割 |
|---|---|
| `wrangler.jsonc` | Worker・DO・Assets・`dev` ポートの設定 |
| `src/worker.ts` | `/api/*` の受付。部屋コードから DO を引く |
| `src/room.ts` | Durable Object。保存・配信・Alarm・切断検知 |
| `src/game.ts` | ルールの純粋関数（副作用なし） |
| `src/questions.ts` | 内蔵の日本語4択問題（18問から10問） |
| `src/env.ts` / `src/http.ts` | バインディングの型と JSON レスポンス |
| `public/index.html` `style.css` `app.js` | 画面 |
| `tests/unit/game.test.ts` | ルールの単体テスト（Vitest） |
| `tests/e2e/*.spec.ts` | 実ブラウザのテスト（Playwright） |

## 6. 選ばなかった案と理由

| 案 | 採用しなかった理由 |
|---|---|
| 通常の Worker だけで状態を持つ | Worker はリクエストごとに別インスタンスになりうる。到着順の直列化が保証できず、「最初の1人」を決められない |
| Cloudflare KV | 結果整合で書き込みの順序を保証しない。早押しの判定に使えない |
| Workers + D1 | 単一の共有 DB。行ロックやトランザクションで競合は防げても、WebSocket の配信元と時間切れの起点を持てない。読み書きも毎回 DB 経由になり、部屋ごとの独立した Alarm もない |
| WebSocket を1つの DO に集約 | 部屋をまたいだ状態と Alarm が混ざる。部屋ごとの独立性が失われる |
| クライアント側でタイマーを進める | 全員の画面でずれる。時計を進めて不正もできる。要件の「全員そろって見える」を満たしにくい |
| 外部のリアルタイム配信サービス（Pusher / Ably / Firebase など） | 有料・外部依存。課題の「Cloudflare の機能の中で完結」「デプロイしない」に反する |
| WebRTC / P2P | ホストのブラウザを権威にしてしまい「サーバー側で決める」に反する。接続の確立も複雑 |
| PartyKit などのフレームワーク | DO の薄いラッパーで、依存を増やす利点がない。ローカル実行の前提も複雑になる |
| SQLite 版でなく KV 版の DO | どちらでも動くが、Alarm と接続を持ちながら将来の問題追加を考えると SQLite 版が無難。`new_sqlite_classes` を選んだ |
| React / Vite などのビルド構成 | 画面数が4つで状態も小さい。ビルドなしのほうが依存が少なく、`wrangler dev` だけで確かめられる |

## 7. テストの方針

- **単体（Vitest）**: `src/game.ts` の規則。定員、開始条件、24通りの同時押し、正解・不正解・時間切れ、全員失格、10問後の終了、同点、正解の隠蔽など。時刻を引数で渡すので実時間を待たない。
- **E2E（Playwright）**: 実際に `wrangler dev` を起動し、独立したブラウザを4つ使って遊ぶ。時間は縮めず、20秒・10秒・3秒を実時間で確かめる。同時押しで回答権が1人だけであること、再読み込みでの復帰、回線断からの再接続、残り時間の同期、通しプレイとスクリーンショットを含む。

詳しい実行方法と一覧は `README.md`、要件ごとの結果は `RESULT.md` を参照。
