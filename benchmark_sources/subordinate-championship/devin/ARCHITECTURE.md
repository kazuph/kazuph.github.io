# アーキテクチャ

## 構成図

```
ブラウザ (index.html + app.js)
   │  HTTP: POST /api/rooms, /api/rooms/:code/join, GET /api/rooms/:code/session
   │  WebSocket: GET /ws?room&playerId&token
   ▼
Worker (src/worker.ts)
   │  /api/*・/ws をルーティングし、部屋コードから Durable Object id を引いて転送
   │  それ以外のパスは Static Assets (public/) にフォールスルー
   ▼
Durable Object "Room" (src/room.ts)  ← 部屋コード1つ = DOインスタンス1つ
   │  状態: プレイヤー・スコア・フェーズ・問題番号・早押し者・各種締切
   │  ctx.storage（SQLite）に都度永続化
   │  alarm() + setTimeout で締切遷移、WebSocket hibernation 対応
   ▼
接続中の全クライアントへ state をブロードキャスト
```

## 選んだ技術と理由

### Durable Objects（採用）

部屋ごとの「強い一貫性を持つ単一の状態機械」が必要な課題で、DO はこれに最も適合する。

- **早押しの一意決定**: DO は単一スレッドでメッセージを順次処理するため、
  「サーバーが最初に受け取った1人だけ」をロックフリーに実現できる。
  `buzz` メッセージを処理する際、既に `buzzedBy` が立っていれば拒否するだけでよい。
- **ルームスコープのブロードキャスト**: DO がその部屋の WebSocket 全部を持つので、
  Pub/Sub なしに全員へ同一 state を即時配信できる。
- **永続化**: `ctx.storage.put` で遷移ごとに保存するため、DO が退避・再起動しても
  ゲームが継続する（回線断復帰の要件とも相性が良い）。

### WebSocket + hibernation API（採用）

- `ctx.acceptWebSocket` + `serializeAttachment` でプレイヤーIDをソケットに紐付ける。
  DO がメモリから退避しても接続は維持され、受信時に DO が起きて処理を継続する。
- WebSocket を選んだ理由: 早押しは「押した瞬間に全員の画面が変わる」双方向・
  低遅延が要件の核心であり、ポーリングや SSE では片方向／遅延の点で劣る。

### タイマー: alarm + setTimeout の二重化（採用）

- `storage.setAlarm` は DO が退避しても発火する耐久タイマー。
- `setTimeout` による `tick()` も併用し、DO が生きている間は高精度に遷移する。
- `tick()` は冪等（締切を過ぎた遷移だけを適用する）なので両方が発火しても安全。
- 全メッセージハンドラでも先に `tick()` を呼び、「遅延した alarm」による
  状態のズレを防ぐ。

### Workers Static Assets（採用）

`wrangler.jsonc` の `assets.directory = public/` で静的ファイルを配信。
fetch ハンドラを持つ Worker と併用すると、アセットに一致しないリクエストだけ
Worker に来るため、`/api/*` `/ws` だけをコードで処理して残りは静的配信に任せられる。
別途フロントのビルド工程やフレームワークが要らない。

## 検討して却下した案

| 案 | 却下理由 |
|---|---|
| D1 / KV に部屋状態を保存 | 書き込み単位でトランザクション管理が必要になり、早押しの「最初の1人」判定が複雑化・低速化する。DO の単一スレッド＋SQLite storage の方が単純かつ強い一貫性。 |
| Workers 上の単純なメモリ状態（DO なし） | Worker はリクエストごとにインスタンスが違い得るため、部屋状態と WS を一箇所に集約できない。本番では機能しない設計になる。 |
| SSE / ロングポーリング | クライアント→サーバーの押下を別途 HTTP POST にする必要があり、早押し競争の公平性（WS の順序性）と遅延の点で劣る。 |
| WebRTC / 外部リアルタイムサービス | 課題の条件「Cloudflare の機能の中で完結」に反する。またサーバー権威の正誤判定が前提なので P2P は向かない。 |
| フロントを Vite+React 等でビルド | 機能要件に対して過剰。素の HTML/CSS/JS でレスポンシブを満たせる規模であり、ビルド工程を増やすと検証コストだけが上がる。 |

## 通信プロトコル

### HTTP

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/api/rooms` `{name}` | 部屋作成＋ホスト参加。`{roomCode, playerId, token}` を返す |
| POST | `/api/rooms/:code/join` `{name}` | 参加。満員/ゲーム中/存在しない部屋は理由つき 4xx |
| GET | `/api/rooms/:code/session?playerId&token` | 再接続前のセッション有効性確認 |
| GET | `/ws?room&playerId&token` | WebSocket upgrade（無効なら 403） |

### WebSocket

- クライアント→サーバー: `{t:"start"}`, `{t:"buzz"}`, `{t:"answer", i}`, `{t:"restart"}`
- サーバー→クライアント: `{t:"state", ...}`（全状態を都度全量配信）, `{t:"error", message}`

全量 state 配信にした理由: 状態は小さい（4人＋1問分）ので差分管理の複雑さより
「いつでも最新スナップショットで画面を描き直せる」単純さを取った。
再接続時も同じメッセージ1個で完全復帰できる。

## サーバー権威のポイント（決定済み事項への対応）

- **正誤判定**: 正解インデックスは `src/questions.ts` にのみ存在し、クライアントには
  選択肢と正誤結果（reveal フェーズ）だけが配られる。
- **点数**: `onAnswer` / タイムアウト処理でのみ `score` を更新。クライアントの申告値は使わない。
- **早押し順**: DO のメッセージ到着順がそのまま順序。`buzzedBy` が null の最初の
  `buzz` だけが `answer` フェーズへ遷移させ、以後の `buzz` は無視される。
- **開始権限**: `hostId` と「接続中が2〜4人」をサーバー側で検査。
- **タイマー**: 出題20秒・回答10秒・リビール5秒はサーバー側の時計で管理し、
  クライアントは表示用にサーバー時刻とのオフセットを使うだけ。

## 復帰（リロード・回線断）の設計

- 参加成功時に `{roomCode, playerId, token}` をブラウザの localStorage に保存。
- 起動時・ws 切断時に `/session` でセッション有効性を確認してから ws を張り直す。
- DO 側は「同じ playerId の新しいソケット」を検出したら古いソケットを閉じるので、
  二重タブ・高速リロードでも最後の接続が生きる。
- 点数・フェーズ・ロック状態はすべて DO 側にあるため、復帰直後の state 配信で
  画面が完全に復元される。
