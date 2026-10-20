# アーキテクチャ

4人オンライン対戦の早押しクイズを **Cloudflare Workers + Durable Objects + WebSocket** で実装している。
ローカル開発（`wrangler dev`）だけで完結し、外部サービス・外部API・有料サービスは一切使わない。

---

## 1. 全体像

```
ブラウザA ─┐
ブラウザB ─┤  WebSocket (wss://.../ws/<部屋コード>)
ブラウザC ─┼──────────────┐
ブラウザD ─┘              │
                          ▼
             ┌──────────────────────────────┐
             │ Worker (src/worker.ts)       │
             │ ・POST /api/rooms → 部屋コード採番
             │ ・/ws/:code → 部屋DOへ転送    │
             │ ・それ以外 → 静的アセット     │
             └──────────────┬───────────────┘
                            │ Durable Object binding (ROOMS)
                            ▼
             ┌──────────────────────────────┐
             │ GameRoom DO (部屋ごとに1つ)   │
             │ ・全プレイヤーのWebSocketを保持│
             │ ・早押しの直列裁定            │
             │ ・採点 / 正誤 / フェーズ遷移   │
             │ ・Storage Alarm で時間切れ処理 │
             │ ・状態を DO ストレージに永続化 │
             └──────────────────────────────┘
                            │
                            ▼
             public/ (index.html, app.js, styles.css)
             Workers Assets として配信（ビルド不要）
```

- **1部屋 = 1 Durable Object**。部屋コード（例 `K7Q2`）から `idFromName(code)` で DO を決める。
- 全プレイヤーは Worker 経由でその DO に WebSocket 接続する。**サーバー権威**のゲーム進行は DO の中で完結する。

---

## 2. なぜこの構成か

### 採用: Durable Object + WebSocket Hibernation API + Storage Alarm

- **早押しの「最初の1人」を一意に決められる。**
  Durable Object は 1 インスタンスが単一スレッドでイベントを直列処理する。`answererId` が `null` のときだけ代入する
  という単純なルールで、複数人が同時に押しても勝者は必ず1人になる。ロックもトランザクションも不要。
  （アプリ全体で最後まで保証したい性質なので、ここが最大の決め手。）
- **リアルタイム配信が同じ場所で完結する。**
  接続中の全 WebSocket は DO が保持しているので、状態変化のたびに `getWebSockets()` へそのまま同報できる。
  別の Pub/Sub や外部配信サービスを挟まない。
- **時間切れ処理がアイドル退避に耐える。**
  `setTimeout` は DO が evict されると消えるが、**Storage Alarm はストレージに永続化**されるため、
  出題中に誰も操作しなくても「20秒で正解発表」「10秒で解答権タイムアウト」「3秒で次の問題」が必ず発火する。
- **接続数が多くてもアイドルコストが小さい。**
  WebSocket Hibernation API（`state.acceptWebSocket`）を使うと、無通信時に DO を休ませられる。
  クイズは「問題を見ているだけ」の時間が長いので相性が良い。
- **復帰が自然に作れる。**
  プレイヤーには秘密トークンを発行し、`localStorage` に保存する。再読み込み・回線断後は同じトークンで
  再接続するだけで、DO 側の記録（点数・正解数）をそのまま引き継げる。

### 採用しなかった案と理由

| 案 | なぜ選ばなかったか |
| --- | --- |
| **KV** に状態を置く | 結果整合（eventual consistent）で、同一部屋の同時更新を直列化できない。プッシュ配信もできず、早押しの裁定に使えない。 |
| **D1** に状態を置く | リクエスト/レスポンス型のDBでリアルタイム配信ができない。早押しの順序保証もポーリング頼みになり要件に合わない。 |
| **Cloudflare Queues / Workflows** | 遅延処理はできるが、双方向の即時配信と「その場での裁定」には不向き。DO の Alarm で十分。 |
| **外部リアルタイムサービス（Ably / Pusher / Socket.IO 等）** | 課題の決定済み事項で禁止（有料・外部サービスを使わない）。 |
| **WebRTC（P2P）** | 決定済み事項「正誤判定・点数・早押しの順番はサーバー側で決める」に反する。P2P ではクライアントを信用することになる。 |
| **Cloudflare Realtime / SFU** | 音声・映像向けの大掛かりな仕組みで、ローカル再現性も下がる。4人のテキスト状態同期には過剰。 |
| **Vite プラグインで React 等をビルド** | 画面数が少なく素の ESM で足りるため、ビルド工程を増やさない方を選んだ（`wrangler dev` 一発で起動）。 |
| **1つの Worker が全接続を保持** | Workers のリクエスト処理モデルではプロセスをまたいだ全接続の保持が保証されない。部屋ごとの DO が必要。 |

---

## 3. 状態モデルと権威

`RoomState`（`src/protocol.ts`）が唯一の真実。主なフィールド:

| フィールド | 意味 |
| --- | --- |
| `phase` | `lobby` / `question` / `reveal` / `final` |
| `players[]` | `id`(公開)・`token`(秘密)・`name`・`score`・`correctCount`・`connected` |
| `questionOrder[]` / `questionIndex` | 1ゲーム分（10問）の出題順 |
| `answererId` | 現在の回答権保持者。`null` なら早押し受付中 |
| `locked[]` | この問題で既に押せない人（不正解・解答タイムアウト） |
| `currentAnswers` / `lastReveal` | 回答記録と正解発表用 |
| `questionDeadline` / `answerDeadline` / `revealDeadline` | 各フェーズの絶対時刻（epoch ms） |

### サーバー権威の徹底

クライアントが送れるのは「join / start / buzz / answer / again / leave」という**意図だけ**。
以下はすべてサーバーが決める。

- **回答権**: `buzz()`（`src/game.ts`）が `phase==='question' && answererId===null && !locked && now<=questionDeadline` を確認して初めて代入する。
- **採点**: `submitAnswer()` だけが `score` を変更する。正解 +10 / 不正解 -5。
- **正誤**: 正解インデックスは `lastReveal` を作るまで **クライアントに一切送らない**。`publicState()` はフェーズに応じてサニタイズする。
- **順位**: `rankPlayers()`（得点 → 正解数 → 入室順、同順位あり）。

クライアントから `playerId` や `score` を受け取る口は存在しない。送っても無視される。

### 時間の扱い

- 締め切りは絶対時刻（epoch ms）で保存し、状態と一緒に `serverNow` を配る。
- クライアントは `deadline - serverNow` から残り時間を計算するので、全員のカウントダウンがそろう。
- DO は状態変化のたびに **次に必要な締め切り** を `nextDeadline()` で求め、`storage.setAlarm()` を1本だけ張る。
- Alarm 発火時は `handleTimeout()` が期限切れイベントを順に処理する（解答タイムアウト → 正解発表 → 次の問題）。
- メッセージ受信時にも `handleTimeout()` を呼ぶので、Alarm が遅延しても判定は壊れない。

### ルールの解釈（明確化した点）

- 回答権を得た人は必ず10秒もらえるよう、**問題全体の締め切りを回答締め切りまで延長**する（20秒ちょうどに押しても10秒使える）。
- 10秒以内に選ばなかった場合は**減点なしでロック**し、残りの人で早押しを再開する。
- 「全員が押せなくなる」の判定は**接続中のプレイヤー**を対象にする。切断中の人は待たずに正解発表へ進む。
- ゲーム中の新規入室は拒否する（トークンによる復帰のみ許可）。

---

## 4. 復帰（再読み込み・回線断）

1. 参加時にサーバーが `playerId` と秘密 `token` を発行し、`joined` メッセージで返す。
2. クライアントは `localStorage["buzzer.token.<コード>"]` と URL の `?room=<コード>` を保存。
3. 再読み込み時は URL の部屋コードとトークンで自動接続し、`join` にトークンを添える。
4. サーバーはトークン一致で「新規」ではなく「復帰」と判定し、`score` などを保ったまま `connected=true` に戻す。
5. 同じプレイヤーの古いソケットが残っていたら、attachment を無効化してから閉じる（誤って切断扱いしない）。
6. 再接続に失敗した場合は指数バックオフで自動再接続し、画面上部に「再接続中」を表示する。

---

## 5. ファイル構成

| パス | 役割 |
| --- | --- |
| `src/worker.ts` | Worker エントリ。`/api/rooms` の採番、`/ws/:code` の DO 転送、静的アセット配信。 |
| `src/game-room.ts` | Durable Object。WebSocket 管理・永続化・Alarm・メッセージ分配。 |
| `src/game.ts` | ゲームの純粋ロジック（早押し裁定・採点・フェーズ遷移・公開状態）。ユニットテスト対象。 |
| `src/questions.ts` | 内蔵の日本語4択問題バンク（18問から毎回10問を抽選）。 |
| `src/protocol.ts` | クライアント/サーバー共有の型・定数・メッセージ解析。 |
| `src/env.ts` | バインディングの型。 |
| `public/` | UI（HTML/CSS/素のESM）。Workers Assets として配信。 |
| `scripts/dev.mjs` | `wrangler dev` ラッパー。8787 固定、inspector は空きポートを自動選択。 |
| `scripts/shots.mjs` | スクリーンショット撮影。 |
| `test/unit` | 純粋ロジックのユニットテスト（Node + Vitest）。 |
| `test/integration` | Workers ランタイム上の結合テスト（`@cloudflare/vitest-pool-workers`）。 |
| `e2e` | ブラウザE2E（Playwright、4人同時対戦）。 |

---

## 6. 限界・今後の余地

- 状態は DO ストレージに `room` オブジェクトとして丸ごと保存している。部屋が遊び終わったあとの掃除（TTL）は未実装で、
  ローカル開発では問題ないが、本番運用するなら Alarm で期限切れ部屋を削除するなどの対応が要る。
- 観戦モード、途中参加、ホストの明示的な交代は対象外（ホスト切断時は最古参の接続者が開始操作を代行できる）。
- 問題はアプリ内蔵のみ。問題の追加は `src/questions.ts` に追記する。
- ローカル専用のため、認証・レート制限・不正対策（同一人物の複数参加など）は最小限。
