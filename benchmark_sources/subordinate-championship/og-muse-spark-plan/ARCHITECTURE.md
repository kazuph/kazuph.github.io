# アーキテクチャ

## 選んだ構成

**Cloudflare Workers + Durable Objects（SQLite 版）+ WebSocket Hibernation API
+ Alarm + Workers Static Assets**。PLAN.md の指定どおり。

- **1部屋 = 1つの Durable Object**。部屋コードから
  `env.ROOM.idFromName(code)` でスタブを引く。4人の接続とゲーム状態が
  1つの単一スレッド（1インスタンス）に集まるので、早押しの順番・正誤判定・
  点数をサーバー側で一意に決められる。ブラウザの申告は信用しない。
- **WebSocket Hibernation API**（`acceptWebSocket` + `getWebSockets`）。
  待機中は DO をスリープさせたまま全員へ配信できる。状態は毎回全量
  (`publicView`) を送るので、再接続した人も最新状態をそのまま受け取れる。
- **Alarm は「いちばん近い締め切り」1つだけ**を予約する
  （問題20秒・回答10秒・正解表示3秒のうち直近）。Alarm とメッセージ受信の
  両方で、まず `game.tick(state, now)` により期限切れをまとめて進めてから
  入力を処理する。全時刻はサーバーの時計で決める。
- **永続化は DO 内蔵ストレージ**（`ctx.storage.put/get` + Alarm）。
  席・点数・トークンが残るので、再読み込みや一時切断でも同じプレイヤーとして
  復帰できる。トークンは playerId とひも付きで照合する。
- **フロントは Static Assets の素の HTML/CSS/JS**（ビルドなし）。
  `run_worker_first: ["/api/*"]` で API だけ Worker に回し、それ以外は
  静的配信する。

## 選ばなかった案

| 案 | 選ばなかった理由 |
|---|---|
| D1 / KV に状態を置く | 早押しの「最初に受け取った1人」を決めるには強い直列化が必要で、ポーリングや条件書き込みでは競合時の再試行が複雑になる。DO に集めれば単一スレッドで自明に正しくなる |
| Workers のみ（DO なし）+ クライアント間 P2P | 正誤判定・点数・順番をサーバー側で決める要件を満たせない。Workers はステートレスなため、部屋のタイマー管理も別途必要になる |
| 外部のリアルタイム配信サービス | 課題で禁止（有料・外部サービス不可）。Cloudflare の中で完結させる必要がある |
| フロントのフレームワーク（React 等） | ビルド工程が増え、`wrangler dev` だけでの再現手順が重くなる。画面の規模に対して素の JS で十分と判断 |
| Durable SQLite の生 SQL | 状態は1キー（`room-state-v1`）の読み書きで足りるため、KV 的な `put/get` を使った。SQL を書く複雑さを避けた |

## データの流れ

1. `POST /api/rooms` → Worker が部屋コード・playerId・token を発行し、
   DO の `/internal/create` でホストを登録
2. `POST /api/rooms/:code/join` → DO の `/internal/join` で定員・開始済みを検査
3. `GET /api/rooms/:code/ws?token=…` → DO が WebSocket を引き受け、
   以降は `{ t: "start" / "buzz" / "answer" }` と `{ t: "state" }` の往復
4. 締め切り到来 → Alarm → `tick` → 全員へ `state` を再配信
5. ブラウザは `localStorage` の `{ code, playerId, token }` で再接続し、
   切断中は1秒ごとに再接続（`offline`/`online` イベントにも対応）
