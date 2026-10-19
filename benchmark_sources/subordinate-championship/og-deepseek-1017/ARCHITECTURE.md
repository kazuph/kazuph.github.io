# アーキテクチャ

## 結論（採用した構成）

```
ブラウザ (vanilla JS SPA)
   │  WebSocket  ws://localhost:8787/api/room/:code/ws
   ▼
Cloudflare Worker (src/index.ts)          … ルーティングと静的アセット配信
   │  upgrade をそのまま転送
   ▼
Durable Object「QuizRoom」(src/room.ts)   … 部屋ごとに1インスタンス
   ├─ WebSocket を複数保持（Hibernation API）
   ├─ QuizGame（src/engine.ts）           … 唯一の権威。状態機械と採点
   ├─ Durable Object storage              … 状態の永続化（復帰用）
   └─ Durable Object alarm                … 時間経過の自動遷移（20s / 10s / 4s）
```

- **Worker + Workers Static Assets**: `public/` をそのまま配信。`/api/*` だけ Worker が処理（`run_worker_first = ["/api/*"]`）。
- **Durable Object（1部屋 = 1インスタンス）**: 部屋コードを `idFromName(code)` に写像。
- **WebSocket**: サーバー → 全員への状態プッシュ。`ctx.acceptWebSocket`（Hibernation）で待機コストを抑える。
- **Durable Object storage**: 状態を JSON で保存。DO が再起動しても進行と点数を保つ。
- **Durable Object alarm**: フェーズの締切（早押し20秒・回答10秒・正解発表4秒）を絶対時刻で登録し、時間が来たらサーバー自身が遷移する。

## なぜこの構成か

### 1. 早押しの順番は「直列化された1か所」でしか正しく決まらない
早押しは「同時押しで1人だけ」を保証する必要があります。Durable Object は
1インスタンスのメッセージを**直列に処理**するため、到着順＝サーバーの受信順で
機械的に勝者を決められます。ロックや競合解決を自作する必要がありません。

### 2. 正誤判定・点数・早押し順をすべてサーバーに置く
`src/engine.ts` の `QuizGame` は乱数も I/O も持たない純粋な状態機械で、時刻は
引数 `now` で注入します。ブラウザからの申告（「押した」「当たった」）は信用せず、
サーバーが受信して初めて状態を変えます。**正解の選択肢番号は `reveal` フェーズに
入るまでクライアントへ一切送りません**（`QuizGame.view()` が正解を伏せる）。

### 3. 時間の扱い
- サーバーは各フェーズの締切を**絶対時刻(ms)**で保持し、状態と一緒に配信する。
- クライアントは受信時に `serverNow` との差分（オフセット）を取り、ローカルで残り時間を描画する。→ 全員のカウントダウンが揃う。
- 実際のフェーズ遷移はサーバーの alarm が行う。クライアントのタイマーは表示専用で、進行の権威ではない。

### 4. 復帰（リロード・回線断）
- クライアントは `playerId`（UUID）を localStorage に保存し、再接続時も同じ ID で `join` する。
- サーバーは**ゲーム中は切断してもプレイヤーを消さない**（`connected=false` にするだけ）。同じ ID で戻れば点数・状態を保ったまま復帰する。
- ロビー中に切断した場合は枠を空ける（`leaveLobby`）。定員4の公平性のため。

### 5. UI はビルド不要のバニラ JS
外部フレームワークやCDNを使わず、`public/` の3ファイルだけで完結。ビルド工程が無いぶん
`wrangler dev` がそのまま配信でき、オフラインでも動きます。レスポンシブはCSSのみ。

## 検討して**採用しなかった**案

| 案 | 採用しなかった理由 |
| --- | --- |
| **KV / D1 に状態を持ち、クライアントがポーリング** | プッシュできず遅延が大きい。同時押しの順序を原子的に決められない（読み書きの競合が起きる）。リアルタイム対戦に不向き。 |
| **Cloudflare Queues / Workers 間 Pub-Sub で状態配信** | 順序保証と単一の権威が弱い。結局「部屋ごとの直列化」が必要で、それは Durable Objects の役割。 |
| **外部リアルタイムサービス（Pusher 等）** | 課題の決定済み事項で禁止（有料の外部サービス・外部リアルタイム配信は使わない）。 |
| **クライアント側で正誤・点数を計算** | 「サーバー側で決める」という決定済み事項に反する。チート可能。 |
| **Durable Object で `setTimeout` を使う / 常駐Mapでソケット管理** | DO はアイドルで退避しうるため `setTimeout` は信頼できない。`acceptWebSocket`＋`alarm`＋storage が正攻法。 |
| **React / Vite などのビルド構成** | この規模では過剰。ビルド生成物を挟まずに配信できる素の構成のほうが検証が簡単。 |
| **問題をランダム順・選択肢シャッフル** | 採点・テストの決定性を優先して固定順（10問固定）。乱数は使っていない。 |

## 状態機械

```
lobby ── start(2〜4人, host) ──▶ question ── buzz ──▶ answering
  ▲                                 ▲   ▲                │
  │                                 │   └── 不正解/時間切れ（残りがいれば再開）
  │                                 │                    │
  │                                 └── 残り時間内に他が buzz
  │                                                      ▼
  └── again(host) ── finished ◀── 10問目 ◀── reveal ◀── 全員ロックアウト / 20秒経過
```

- `question`: 早押し受付（締切 = 問題提示 + 20s）
- `answering`: 回答権者を1人だけ保持（締切 = 押下 + 10s）
- `reveal`: 正解を全員に公開（4s 後に次の問題 or 終了）
- `finished`: 最終順位。ホストは `again` でロビーへ戻せる

## メッセージプロトコル（WebSocket, JSON）

クライアント → サーバー: `join` / `start` / `buzz` / `answer` / `again` / `ping`
サーバー → クライアント: `welcome` / `state` / `error` / `pong`

`state` は部屋の全情報（プレイヤー、点数、フェーズ、締切時刻、回答権者、reveal 中のみ正解）を
含み、変更のたびに全員へブロードキャストします。
