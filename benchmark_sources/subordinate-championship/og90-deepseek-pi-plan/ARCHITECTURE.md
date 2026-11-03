# アーキテクチャ

## まとめ

| 役割 | 使うもの |
|---|---|
| 実行環境 | Cloudflare Workers（ローカルは `wrangler dev`） |
| 部屋の状態 | Durable Objects（SQLite 版・1部屋 = 1オブジェクト） |
| リアルタイム通信 | WebSocket（Durable Objects の WebSocket Hibernation API） |
| 締め切り処理 | Durable Object の Alarm |
| 画面の配信 | Workers Static Assets（`public/`） |
| 問題データ | リポジトリに内蔵（`src/questions.ts`）。外部 API は使わない |

外部の有料サービス・外部リアルタイム配信サービスは使っていません。Cloudflare の機能と
静的ファイルだけで完結しています。

## 全体の流れ

```
ブラウザ ──POST /api/rooms────────────► Worker ──/init──► Room(DO)
        ──POST /api/rooms/:code/join──► Worker ──/join──► Room(DO)
        ──GET  /api/rooms/:code/ws?token=… ─────────────► Room(DO)（WebSocket へ切替）
        ◄──────── { t:"state", … } を毎回まるごと配信 ────┘
        ──{ t:"start" } / { t:"buzz" } / { t:"answer" }──►
```

- `wrangler.jsonc` の `assets.run_worker_first: ["/api/*"]` で、`/api/*` だけ Worker が処理し、
  それ以外は Static Assets が返します。
- 部屋コードは紛らわしい文字（0/O・1/I）を除いた32文字から6文字。`env.ROOM.idFromName(code)`
  で部屋ごとの Durable Object を引きます。**1部屋 = 1 Durable Object** なので、部屋をまたいだ
  競合が原理的に起きません。

## なぜこの構成にしたか

### 1. 早押しの「最初の1人」を保証する

要件の核心は「サーバーが最初に受け取った1人だけが回答権を得る」ことです。Durable Object は
1つの部屋に対して**単一のスレッドで入力を直列に処理**するので、4人の `buzz` がほぼ同時に
届いても、到着順に1つずつ処理され、最初の1件だけが `phase` を `question` から `answering`
へ動かします。2件目以降は `phase` が変わっているので何も起きません。

これは「競合をロックで防ぐ」のではなく「競合する場所を1つに集める」設計です。クライアントは
正誤も点数も早押し順も一切決めず、サーバーが決めた結果を表示するだけにしています。

### 2. 状態の保存と復帰

- ゲームの状態は Durable Object の storage（KV API）に `state` という1つの JSON として保存します。
  問題数も参加者も高々数十件なので、正規化したテーブルは不要と判断しました。
- プレイヤーには `playerId` と `token` を渡し、ブラウザは `localStorage` に保存します。再読み込み
  や回線断のあとは、同じ `token` で WebSocket につなぎ直すだけで同じ席・同じ点数に戻ります。
  `token` は他人に配信しません（`toPublicState` は token を入れない）。
- 同じ `token` で新しい接続が来たら、古い接続はサーバー側で閉じます（二重接続の防止）。

### 3. 締め切りは Alarm 1つに集約

出題20秒・回答10秒・正解表示3秒という締め切りは、`nextDeadline()` が「いちばん近い締め切り」
1つを返し、それを Alarm に予約します。Alarm が起きたら `tick(state, now)` で「過ぎた締め切り」
をまとめて進めます。メッセージを受けたときも必ず先に `tick` してから入力を処理するので、
「20秒ちょうどに届いた buzz」も正しく締め切られます。時刻はすべてサーバーの `Date.now()` です。

### 4. 接続が切れた人の見つけ方

WebSocket Hibernation API を使っていると Durable Object はいつでも休止できます。休止しても
接続の情報は残りますが、メモリ上の変数は消えます。そこで「最後にその人から連絡があった時刻」は
**WebSocket の attachment** に持たせました（`serializeAttachment`）。attachment は休止をまたいで
残るので、休止から復帰したときに全員を「生きている」と誤判定することがありません。

- ブラウザは1秒ごとに `{ t:"ping" }` を送ります（画面には出ない内部メッセージ）。
- Alarm は接続がある間は約1秒ごとに起きて、3.5秒以上音沙汰のない接続を「切断」にします。
- ブラウザ側は `offline` / `online` イベントと WebSocket の `close` を見て、1秒後から
  自動でつなぎ直します。

Alarm の予約は「すでにそれより早い予約があれば動かさない」ようにしています。ping のたびに
Alarm を先へ延ばしてしまうと、接続の見張りが永久に動かなくなるためです。

### 5. 画面はビルドなし

`public/` に素の HTML / CSS / JavaScript を置き、Workers Static Assets で配信します。
ビルド手順が無いぶん、`wrangler dev` だけで起動でき、依存も最小になります。4画面（入口・
ロビー・ゲーム・結果）と状態の描画だけなので、フレームワークの必要性は無いと判断しました。

## 選ばなかった案と、その理由

| 案 | 選ばなかった理由 |
|---|---|
| D1 + ポーリング | 早押しは「同時に押したときの勝敗」が本質で、ポーリング間隔（数百 ms〜秒）では到着順を正確に決められない。書き込み競合の調停も自前になる |
| KV | 結果整合で、書き込みの反映が遅れる。リアルタイムの順番決めには使えない |
| Workers だけ（Durable Object なし） | 部屋の状態をどこにも置けず、複数リクエスト間で共有できない。Workers はステートレス |
| 全部屋を1つの Durable Object で扱う | 1部屋=1DO に比べて競合と障害の影響範囲が広がる。`idFromName(code)` で自然に分割できる |
| Cloudflare Queues / Pub-Sub / 外部リアルタイム配信 | 有料・外部サービスに寄るうえ、この規模では WebSocket 直結で足りる。課題の決定済み事項にも反する |
| WebRTC（P2P） | 「サーバー側で順番と点数を決める」という決定済み事項に反する。接続確立も複雑 |
| Vite + フレームワーク（React 等） | ビルド工程が増えるだけで、4画面の状態描画には過剰。`wrangler dev` だけで動く手軽さを優先した |
| WebSocket ではなく Server-Sent Events + POST | 早押しの送信が POST になり、到着順の直列化は DO でできるものの、双方向の再接続処理が二重になる。WebSocket 1本のほうが単純 |
| 出題時刻をクライアントの時計で計算 | 端末の時計ずれで全員の残り時間がずれる。`serverNow` との差分で補正する方式にした |

## ファイルごとの責務

| ファイル | 責務 |
|---|---|
| `src/worker.ts` | `/api/*` の受付、部屋コードの発行、Durable Object への振り分け |
| `src/room.ts` | 状態の保存・読み込み、WebSocket の受け付けと全員への配信、Alarm、接続の見張り |
| `src/game.ts` | ゲーム規則だけの純粋関数（時刻は引数で受け取り、時計を読まない） |
| `src/questions.ts` | 内蔵の日本語4択問題と、10問の抽選 |
| `public/` | 入口・ロビー・ゲーム・結果の4画面 |

`game.ts` が純粋なので、早押しの並び替え24通りや締め切りの境界を、実時間を待たずに
単体テストで網羅できます。
