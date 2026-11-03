# ARCHITECTURE

## 選んだ構成：Workers ＋ Durable Objects（WebSocket ハイバネーション＋alarm）＋ 静的アセット

```
ブラウザ ×4 ──HTTPS/WSS──▶ Worker（src/worker.ts：REST振り分け・静的配信）
                              │ idFromName(roomCode)
                              ▼
                        RoomObject（src/room.ts：1部屋＝1 Durable Object）
                          - 状態：RoomEngine（src/engine.ts、純粋ロジック）
                          - 通信：WebSocket（hibernation）で全員へ state 配信
                          - 時刻：Durable Object alarm で 20秒/10秒/3秒を裁定
                          - 永続：ctx.storage にスナップショット保存
```

- **フロント**は `public/` の素朴な HTML/CSS/JS（ビルド不要）。`wrangler.json` の
  `assets.directory: ./public` で Worker と同一オリジン配信し、追加のデプロイも不要。
- **問題**は `src/questions.ts` に日本語4択×10問を内蔵（外部API不使用）。
- **正誤判定・点数・早押しの順番**はすべてサーバー（`RoomEngine`＋`RoomObject`）が決める。
  クライアントは「押した」「何番を選んだ」だけを送り、点数や正解を自己申告しない。
  公開ステート（`toPublic`）は出題・回答フェーズ中は正解番号を含まない。
- **早押しの先着1人**は、Durable Object が WebSocket メッセージを受け付けた順に
  `engine.buzz()` で判定する。DO は単一スレッドでメッセージを直列処理するため、
  「同時押し」でも必ず1人だけが `answering` に遷移し、残りは `NOT_QUESTION_PHASE` ではじかれる。
- **再接続復帰**は発行済みトークン（`makeToken`、localStorage 保存）で本人確認する。
  切断してもスコアは保持し、同一トークンの再参加は `isRejoin` として点数・所属を維持する。
  `webSocketClose` では `connected` フラグのみ落とし、再接続で戻す。
- **タイマー**はサーバー時刻基準（`questionEndsAt` / `answerEndsAt` / `revealEndsAt`）。
  クライアントは `serverNow` との差分で残り時間を描画するだけ。期限到来は
  `storage.setAlarm()` で起こし（`save()` ごとに次期限を再設定）、`alarm()`→`tick()` で
  回答タイムアウト／出題タイムアウト／次問進行を確定する。alarm が届かない環境でも
  各アクション受信時に `tick(now)` するので進行が止まらない。

## 選ばなかった案

| 案 | 不採用の理由 |
|---|---|
| Workers＋D1/SQLite ポーリング | 早押しの同時性をポーリング周期でしか裁定できず、レイテンシと公平性が劣る。書込直列化もDOより複雑。 |
| Workers＋KV | 結果整合・読み書き遅延があり、早押しの先着判定や残り時間の厳密管理に向かない。 |
| 外部リアルタイム配信（Pusher/Ably等） | 課題で禁止（有料の外部サービス・外部配信は使わない）。 |
| Queue / Workflows による進行管理 | 10秒・20秒単位の即時性と双方向通信が必要で、非同期ジョブ基盤は過剰かつ不向き。 |
| フロントビルド（Vite等） | ローカル実行の単純さを優先し、依存ゼロの静的ファイル配信にした。 |

## データフロー

1. `POST /api/rooms`（作成）／`POST /api/rooms/:code/join`（参加・復帰）→ DO で参加者を確定し `{roomCode, playerId, token}` を返す。
2. `WS /api/rooms/:code/ws?token=...` → DO が本人確認して `acceptWebSocket`。以後 `state` を全員へ配信。
3. クライアント送信は `start` / `buzz` / `answer` / `reset` の4種。すべて `tick(now)` 後に
   `RoomEngine` が検証・反映し、結果を全員へ配信＋alarm再設定＋storage保存する。
