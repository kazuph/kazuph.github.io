# アーキテクチャ

## 構成の全体像

```
ブラウザ(最大4人+観戦なし)
   │  HTTP: POST /api/rooms, POST /api/rooms/:code/join
   │  WebSocket: GET /api/rooms/:code/ws?token=…
   ▼
Worker（src/worker.ts） … /api/* の受付とルーティングだけ
   │  env.ROOM.idFromName(code) で部屋コード→DO を一意に決定
   ▼
Durable Object "Room"（src/room.ts, SQLite版） … 1部屋=1インスタンス
   ├─ ctx.storage: 部屋の全状態（room）と playerId→token の対応（tokens）
   ├─ WebSocket Hibernation API: 4人の接続を受け、状態を全員に配信
   └─ Alarm: 「いちばん近い締め切り」1つだけ予約し、時間切れ処理を進める
```

静的ファイル（`public/`）は Workers Static Assets が配信し、`/api/*` だけ
`run_worker_first` で Worker に渡す。

## 選んだ構成と理由

### Durable Objects（SQLite版）をゲーム状態の唯一の正本にする

早押しクイズの本質は「**同時に届く入力を全員一致の順序でさばく**」ことにある。
DO は1つの名前（ここでは部屋コード）に対して世界中で1インスタンスだけが動き、
リクエスト・WebSocket メッセージ・Alarm がすべて単一スレッドで逐次処理される。
これにより「サーバーが最初に受け取った1人だけが回答権を得る」が
ロックや分散合意なしに自然に実現できる（`buzz` は先着1件だけが `question`→`answering` に遷移する）。

SQLite版 DO（`new_sqlite_classes`）は storage が SQLite ベースで、
状態の読み書きが速く、コンストラクタの `blockConcurrencyWhile` で
起動時に一度だけ読み込めばよい。

### WebSocket Hibernation API

リアルタイムに全員の画面をそろえるには双方向通信が要る。
Hibernation API を使うと、アイドル中は DO が接続を保持したまま眠れて、
`webSocketMessage` / `webSocketClose` が来たときだけ起きる。
接続ごとの対応（どのソケットが誰か）は `serializeAttachment` で
プレイヤーIDをソケットに貼っておき、hibernation からの復帰後もそのまま参照できる。

### Alarm

締め切り（問題20秒・回答10秒・正解表示3秒）は「いちばん近いもの」だけを
`ctx.storage.setAlarm` に予約する。setAlarm は既存のアラームを上書きするので、
「1つだけ予約する」ルールがそのまま実装になる。Alarm 発火時も
メッセージ受信時も、まず `game.tick(state, now)` で
締め切りを過ぎた処理を落ち着くまでまとめて進めてから入力を処理するため、
Alarm が少し遅れても規則がずれない（reveal は処理時点から3秒始まる）。

### 状態は毎回全量を送る

差分配信にすると復帰・途中経過の整合が難しくなる。
部屋の状態は小さい（4人分+問題1件）ので、`{ t:"state", ... }` を全接続に
一斉送信する方式にした。残り時間は `serverNow` を同梱して端末時計のずれを吸収する。
出題中・回答中は正解の添字を送らず、reveal と終了時だけ含める
（ブラウザの申告を信用しない、という決定事項に沿う）。

### ゲーム規則を純粋関数に分離（src/game.ts）

`tick` / `buzz` / `answer` / `startGame` は時刻 `now` を引数に取る
副作用のない純粋関数にした。DO のイベント処理（I/O・配信・永続化）と
規則の判定を分けることで、単体テストで24通りの全順列や
「Alarmが遅れたときの一括進行」などを実時間なしで厳密に確かめられる。

### 認証はトークン + localStorage

参加時に `{ code, playerId, token }` を発行してブラウザの
localStorage に保存する。WebSocket 接続は `?token=` を DO で照合し、
再読み込み・回線切れからは同じトークンで同じプレイヤーとして復帰する。
同じトークンの新しい接続が来たら古い接続を閉じる。
外部アカウントや有料サービスを使わずに要件を満たせる。

## 選ばなかった案

| 案 | 選ばなかった理由 |
|---|---|
| KV / D1 に部屋状態を保存 | どちらも「最終的整合」の読み取りで、同時押しの先着を正確に裁けない。部屋状態は高頻度に書き変わるうえ一貫性が必須。DO storage のほうが速くて強い整合性がある |
| polling / SSE での状態配信 | polling は遅延と無駄なリクエストが出る。SSE はサーバー→ブラウザの一方通行なので早押し入力は別途 POST が要り、到着順と表示の同期が複雑になる。WebSocket 1本のほうが単純 |
| Workers 内のメモリに部屋状態を持つ | Worker インスタンスはリクエストごとに使い回し・散在するため、4人が別インスタンスに割り振られると状態が合わない |
| ブラウザ側で正誤判定・採点 | 決定事項で禁止。採点・先着・締め切りはすべて DO 側（サーバーの時計）で決める |
| 外部のリアルタイム配信サービス | 決定事項で禁止（Cloudflare の機能で完結させる）。DO+WebSocket で同等以上に実現できた |
| フロントのフレームワーク・ビルド | 4画面・1ページの規模では素の HTML/CSS/JS で十分で、依存を増やさず wrangler dev だけで動く（PLAN の方針どおり） |

## データとメッセージ

- HTTP: `POST /api/rooms` → `{code, playerId, token}`、
  `POST /api/rooms/:code/join` → 同上 / 満員409・開始後409・部屋なし404、
  `GET /api/rooms/:code/ws?token=` → 101 か 403
- WebSocket ブラウザ→サーバー: `{t:"start"}`、`{t:"buzz",q}`、`{t:"answer",q,choice}`
- WebSocket サーバー→ブラウザ: `{t:"state", …全体状態, you, serverNow}`、`{t:"error",message}`
- DO storage キー: `room`（RoomState 全量）、`tokens`（playerId→token）

## フェーズ遷移

`lobby` → `question` ⇄ `answering` → `reveal` → （次の `question` または `finished`）

- `question`: 出題から20秒で締め切り。未失格者の先着 buzz 1件で `answering` へ
- `answering`: 「押した時刻+10秒」と「問題の締め切り」の早いほうで締め切り。
  正解 +10 で `reveal`、不正解・時間切れ -5 で失格。未失格者が残れば `question` に戻る（締め切り据え置き）、いなければ `reveal`
- `reveal`: 3秒で次の問題へ。10問目のあとは `finished`
