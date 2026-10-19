# アーキテクチャ

## 選んだ構成：Workers + Durable Objects + WebSocket

```
ブラウザ ×4 ── WebSocket (/ws?room=CODE) ──▶ Worker (src/index.ts)
                                                    │ 部屋コードで振り分け
                                                    ▼
                                          Durable Object: RoomObject (src/room.ts)
                                            - 1部屋 = 1 DOインスタンス（`idFromName("room-"+code)`）
                                            - ゲームの唯一の権威状態を保持（QuizRoom）
                                            - 全接続者に同一stateをブロードキャスト（500ms tick + 変化時即時）
フロント: public/index.html（単一ファイル、Workerがそのまま配信）
問題: src/questions.ts に10問内蔵（外部API不使用）
```

### 各機能の置き場所

| 関心事 | 置き場所 | 備考 |
|---|---|---|
| 早押しの順番 | `QuizRoom.buzz()`（サーバー） | 到着順＝関数呼び出し順。最初だけ `answering` に遷移し、残りは拒否 |
| 正誤判定・加減点 | `QuizRoom.answer()`（サーバー） | 正解+10／不正解−5。選択肢の正当性も検証 |
| タイマー | サーバー (`deadlineQ/A` + `tick` + `setTimeout` 再スケジュール) | 出題20秒・回答10秒・正解表示3秒。クライアントのバーは表示専用 |
| 点数・残り時間・回答者 | サーバーが `publicState` を全員に配信 | 正解インデックスは `reveal`/`finished` 時のみ含める |
| 復帰 | `playerId`（localStorage）+ サーバー側の `players` 維持 + DO Storage スナップショット | 再読み込み時は同一IDで `join` → 点数維持・自動復帰 |
| 定員・開始条件 | サーバー (`MAX_PLAYERS=4`、開始はホスト＋2〜4人) | 違反時は理由文字列を `error` メッセージで返す |

## 選んだ理由

- **Durable Objects**：部屋ごとの単一ライター（single-threaded）になるため、早押しの「最初の一人」をロックや競合なしに決定的に決められる。Workers 単体（ステートレス）では外部ストアへの往復が必要になり、同時押しの順序保証が複雑になる。
- **WebSocket**：「全員の画面でそろって見える」をポーリングなしで実現。DO との相性が良く、ローカル（miniflare/workerd）でも追加設定なしで動く。
- **外部DBなし（D1/KV不使用）**：ゲーム中の状態は一時的で、DO のメモリ＋Storage スナップショットで足りる。ローカル開発限定・ログイン不要という条件では、永続DBは設定・運用コストに見合わない。
- **フロント単一HTML**：Workers Static Assets を使わず Worker が文字列配信するため、`wrangler dev` だけで完結し、ビルド手順も不要。

## 選ばなかった案

| 案 | 見送り理由 |
|---|---|
| Workers + KV/D1 ポーリング | 書き込み競合で同時押しの順序が非決定的になりがち。遅延も大きい |
| 外部のリアルタイム配信サービス（Pusher/Ably等） | 課題条件で禁止。有料・外部依存になる |
| Hibernatable WebSocket（`acceptWebSocket` + `webSocketMessage`） | 実装当初に試したが、ハンドラ形式の違いで取り違えやすい。ローカル限定・同時接続少数なので通常 `ws.accept()` で十分と判断 |
| DO Alarm による厳密タイマー | 永続化に強いが、ローカル限定・短時間ゲームでは `setTimeout`＋500ms tick の二重化で実用上十分。コードも短い |
| シャッフル出題・問題プール制 | テストの決定性を優先し、10問固定順にした |

## 既知の制限

- `wrangler dev` を再起動すると部屋のメモリ状態は消える（DO Storage のスナップショットは同一セッション内の退避用）。
- 回答タイムアウト（10秒無回答）は不正解（−5点）扱いとして再開する。仕様に明記がないためこの解釈を採用し、UIとテストで明示した。
- 残り時間バーはクライアント表示用であり、遷移の権威はサーバーの `tick` が持つ（数百msの表示ずれはあり得るが判定はサーバー）。
