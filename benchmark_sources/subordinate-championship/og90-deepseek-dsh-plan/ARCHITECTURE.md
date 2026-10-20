# アーキテクチャ

4人オンライン早押しクイズを、Cloudflare Workers のローカル実行（`wrangler dev`）だけで
動かすための設計。デプロイや Cloudflare アカウントへのログインは前提にしない。

## 1. 全体像

```
ブラウザ (public/index.html + app.js + style.css)
   │  POST /api/rooms            （部屋を作る）
   │  POST /api/rooms/:code/join （部屋に入る）
   │  GET  /api/rooms/:code/ws   （WebSocket へ切り替え）
   ▼
Workers Static Assets ──（/api/* 以外）──▶ public/ のファイル
   │
   │  main = src/worker.ts
   ▼
Durable Object binding ROOM
   │  env.ROOM.idFromName(code)   ※ 1部屋 = 1オブジェクト
   ▼
Room (src/room.ts)
   ├─ SQLite storage : GameState を JSON で保存
   ├─ WebSocket Hibernation API : 全員への state 配信／入力の受け取り
   └─ Alarm : 締め切り（20秒・10秒・3秒）で tick を進める
```

ゲームの規則そのものは `src/game.ts` の純粋関数に閉じ込めてある。`Room` は
「保存・配信・時刻の供給」だけを担当し、正誤判定や点数計算は一切しない。

## 2. 選んだ構成と理由

### Workers + Durable Objects（SQLite 版）

早押しは「複数の参加者の入力を1か所で直列化して、最初の1人を決める」処理が本質になる。
Durable Object は1つの部屋に対して単一のインスタンスが入力イベントを直列に処理するため、
**同時押しでもサーバー側で自然に順番が決まる**。ロックや排他制御を自前で書かずに
「サーバーが最初に受け取った1人だけ」を保証できるのが最大の理由。

保存先は Durable Object の SQLite ストレージ（`new_sqlite_classes` で作成）にした。
状態は `game` テーブル1行に JSON で丸ごと持つ。1部屋の状態は最大4人ぶんで小さく、
毎回全量を書き換えても十分速い。マイグレーションで SQLite 版クラスを指定しているため、
`storage.sql` を使って保存していることが設定からも読み取れる。

### WebSocket Hibernation API

`ctx.acceptWebSocket()` を使うことで、接続が無い間は Durable Object を休ませられる。
無料枠・ローカル実行のどちらでも無駄が少ない。切断されても席と点数を残す仕様なので、
`webSocketClose` / `webSocketError` で `connected` フラグだけを落とし、状態は捨てない。

### Alarm

「20秒で問題締め切り」「回答は10秒」「正解表示は3秒」という時間遷移は、
ブラウザからの再描画に頼らずサーバーの Alarm で進める。予約する Alarm は
`nextDeadline(state)` が返す「いちばん近い締め切り1つ」だけ。Alarm が鳴ったら
`tick(state, now)` で期限切れをまとめて進め、全員に配信してから次の Alarm を予約し直す。
ブラウザを閉じていてもゲームが進み、戻ってきたときには正しい局面になっている。

### Workers Static Assets

`public/` をそのまま静的配信する。`run_worker_first: ["/api/*"]` を指定して、
API だけ Worker を通し、HTML/CSS/JS はアセット配信に任せる。ビルド不要。

### 素の HTML / CSS / JavaScript

フレームワークを使わない。ローカルで `wrangler dev` を叩くだけで動き、
依存やビルド手順が増えないことを優先した。画面は4つ（入口・ロビー・ゲーム・結果）で、
状態はサーバーから届く `state` を描画するだけにしている。

## 3. 選ばなかった案と理由

| 案 | 選ばなかった理由 |
|---|---|
| **D1** | D1 は Worker から共有できる SQL だが、行ロックや読み書きの直列化をゲームの進行に使うには向かない。1部屋ごとの状態は Durable Object の方が自然で、WebSocket の接続も同じ場所に置ける。 |
| **KV** | 結果整合で書き込みの反映が遅く、「同時押しの勝者」を即時に1人へ確定できない。 |
| **外部リアルタイムサービス（Firebase 等）** | 有料・外部サービスは使わない方針。正誤判定をサーバー側に置く要件とも噛み合わない。 |
| **Cloudflare Queues / Workflows** | 数十ミリ秒単位の早押し判定には遅延が大きい。1部屋のイベントは Durable Object 内で足りる。 |
| **Vite + React など** | UI は4画面で状態も小さい。ビルド工程を増やす利点が薄い。 |
| **クライアントで正誤判定** | 要件で禁止（ブラウザの申告を信用しない）。正解は `reveal` まで一切配信しない。 |
| **1つの Durable Object に全部屋** | 1部屋の遅い処理が他部屋に影響する。`idFromName(code)` で部屋ごとに分けるのが素直。 |

## 4. サーバー権威の設計

- 早押しの勝者は、Durable Object が `buzz` メッセージを処理した順で決まる。
  2人目以降の `buzz` は `phase === "answering"` になっているため無視される。
- 正解の番号は `src/questions.ts` にあり、`publicState()` が `phase === "reveal"`
  のときだけ `correctIndex` を入れる。出題中・回答中は必ず `null` になる。
- 点数は `answer()` と `eliminateAnswerer()` の中でだけ加減算する。
  クライアントは `{ t: "buzz" }` と `{ t: "answer", choice }` を送るだけで、
  点や正誤を送ることはない。
- 問題番号（`round`）をメッセージに含め、古い問題への `buzz` / `answer` は無視する。

## 5. 状態

`GameState`（`src/game.ts`）がすべて。

```
code, hostId, phase (lobby|question|answering|reveal|finished)
players[]        : id, name, score, connected, eliminated
tokens{}         : playerId -> 再接続トークン（クライアントには送らない）
order[]          : 出題する問題の添字（毎回シャッフルした10問）
round            : 現在の問題番号（0始まり）
questionStartedAt / questionDeadline
answeringId / answerDeadline
revealDeadline
lastResult       : 直前の正解・不正解（得点表示用）
```

状態は毎回 `clone()` してから変更し、戻り値を保存する。`tick()` は
「問題の20秒切れ → reveal」「回答の締め切り → 失格」「reveal の3秒切れ → 次の問題」
を、変化がなくなるまで繰り返し適用する。だからメッセージ処理の前に必ず `tick()` を
呼んでおけば、Alarm が遅れても局面がずれない。

## 6. 通信

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/api/rooms` | `{ name }` → `{ code, playerId, token }`。作った人がホスト |
| POST | `/api/rooms/:code/join` | `{ name }` → `{ code, playerId, token }`。満員・開始後は 409、部屋なしは 404 |
| GET | `/api/rooms/:code/ws?token=...` | WebSocket へ切り替え。token 不一致は 403 |

WebSocket のメッセージ:

- ブラウザ → サーバー: `{ t: "start" }` / `{ t: "buzz", q }` / `{ t: "answer", q, choice }`
- サーバー → ブラウザ: `{ t: "state", ... }` / `{ t: "error", message }`

`state` は毎回全量を送る。`you`（自分の playerId）と `serverNow`（サーバーの時刻）を含み、
`tokens` は含まない。

## 7. 時刻のそろえ方

各 `state` の `serverNow` と受け取った時刻の差を `serverOffsetMs` として保持し、
残り時間は `deadline - (Date.now() + serverOffsetMs)` で計算する。端末の時計が
ずれていても、4画面の残り時間はサーバーの同じ締め切りを指す。

## 8. 再接続

参加時に受け取った `{ code, playerId, token }` を `localStorage` に保存する。
ページを開くとまず `/ws` に Upgrade なしで `fetch` して、`403/404` なら保存を捨てて
入口に戻る（`426 Upgrade Required` なら token は有効）。有効なら WebSocket をつなぎ直す。
接続が切れたら1秒後から間隔を広げながら再接続し、`offline` / `online` イベントでも
つなぎ直す。同じ token の新しい接続が来たら古い接続を閉じるので、再読み込みで
二重接続にならない。切れている間も席と点数は残り、ほかの人には「接続切れ」が出る。

## 9. テスト方略

- `tests/unit/game.test.ts`（vitest）: `game.ts` の規則。24通りの押す順、
  点数、失格、締め切り、同順位、正解を漏らさないこと。
- `tests/e2e/*.spec.ts`（Playwright + `wrangler dev`）: 実ブラウザ4台で
  作成・参加・5人目の拒否、同時押し、不正解、再読み込み復帰、回線切断からの復帰、
  実時間の20秒・10秒、残り時間の一致、10問完走と最終順位、スクリーンショット。

テストは実時間を短縮しない。だから「20秒で正解が出る」「10秒で-5点」も
本物の待ち時間で確かめている。

## 10. ファイル構成

| ファイル | 役割 |
|---|---|
| `src/worker.ts` | `/api/*` の受付、部屋コードの発行、Durable Object への委譲 |
| `src/room.ts` | Durable Object。保存・WebSocket・Alarm |
| `src/game.ts` | 純粋なゲーム規則 |
| `src/questions.ts` | 内蔵の日本語4択問題（14問から10問） |
| `src/env.ts` | バインディングの型 |
| `public/` | 画面（素の HTML / CSS / JS） |
| `tests/unit/` | 単体テスト |
| `tests/e2e/` | ブラウザテスト |

## 11. 前提と制約

- デプロイしない。`wrangler dev`（既定ポート 8787）だけで動く。
- 有料・外部のリアルタイム配信サービスは使わない。
- 状態はローカルの `.wrangler/state` に保存される。プロセスを止めても部屋は残る。
- Windows は対象外。ブラウザは Chromium 系を想定（Playwright の chromium で検証）。
