# アーキテクチャ

## 採用した構成

Cloudflare Worker が静的画面と HTTP 入口を担当し、部屋コードを名前にした Durable Object が部屋ごとの唯一の状態管理者になります。各部屋は独立したインスタンスとストレージを持つため、部屋をまたぐロックやデータベース問い合わせなしに、参加者4人の入力を一列に処理できます。

```text
Browser ── HTTP create/join/reconnect ──> Worker ──> room Durable Object
Browser <════ WebSocket state/events ══════════════> room Durable Object
                                                    ├─ SQLite-backed DO Storage
                                                    ├─ server-owned scores/answers
                                                    └─ alarms for 10s / 20s deadlines
Worker ── static asset binding ──> public/
```

Durable Object は Cloudflare Workers Runtime 上で動作します。Wrangler の SQLite-backed Durable Object migration を使い、プレイヤー、得点、進行中の問題、締切を Storage API に保存します。WebSocket は Durable Object の hibernation API で受け、接続中プレイヤー ID を socket attachment に記録します。操作イベントはインスタンス内の直列キューで処理し、同時押しでも一人だけに回答権を付与します。E2E ではクライアントから偽の得点も送信し、サーバーの正誤判定と採点が維持されることを確認します。

締切時刻はサーバー時刻で保存し、Durable Object Alarm で処理します。各状態配信には `serverNow` を含め、ブラウザーはサーバーと端末の時計差を補正して締切までの残り時間を表示します。表示タイマーは4画面間で1秒以内の差になることをE2Eで確認します。ブラウザーは得点・締切・回答権を決めません。回答、押下、開始イベントは再接続後も同じ保存済み部屋状態に適用されます。

早押しの結果を受信したとき、正解なら+10点、誤答なら-5点をサーバー側で加算します。誤答者と回答時間切れのプレイヤーはその問題のロックアウト一覧に入り、他のプレイヤーが押せます。回答時間切れは TASK.md が減点を指定していないため、得点を変えずにその問題の回答権だけ終了します。全員がロックアウトされた場合、または出題から20秒経った場合は正解を公開し、次の問題へ進みます。前問の正解は次問画面にも表示し、別途指定されていない表示待ち時間は追加しません。

部屋コードと再読み込み復帰用トークンは Web Crypto の UUID で生成します。プレイヤートークンはブラウザーの localStorage と部屋の Durable Object Storage に保持します。API 応答と WebSocket の公開状態にはトークンも正解番号も含めません。クライアントに送る問題には文面と選択肢だけを含め、正解判定はサーバーの内蔵問題データで行います。

## 他の案を選ばなかった理由

- **Worker だけで状態を持つ**: リクエストごとに実行インスタンスが異なるため、参加者間で同じ回答権・得点を安全に共有できません。
- **D1/KV を共有データベースにする**: クイズの部屋ごとの順序制御や WebSocket 配信を別の調停レイヤーで組む必要があり、この要件の小さな部屋単位状態には Durable Object が直接対応します。
- **外部リアルタイム配信・認証サービス**: Cloudflare 内で完結し、ローカルだけで動かす決定済み条件に反するため使いません。
- **Cloudflare へのデプロイ**: 対象外です。設定にデプロイ用スクリプトや本番 binding はありません。

## ローカル境界

`wrangler.jsonc` の `dev.port` を `8787` に固定します。`npm run dev` は `wrangler dev --ip 127.0.0.1 --port 8787` だけを起動します。Inspector 用の固定ポートや外部 URL は設定していません。Durable Object はローカル Wrangler 内で実行されます。

## 根拠

- [Cloudflare Durable Objects WebSocket ガイド](https://developers.cloudflare.com/durable-objects/best-practices/websockets/): Durable Object が複数接続を調停でき、hibernation API と socket attachment を提供します。
- [Cloudflare Durable Object Storage ガイド](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/): 状態の永続化と SQLite-backed Durable Object の設定方法。
- [Cloudflare ローカル開発の binding 動作](https://developers.cloudflare.com/workers/local-development/bindings-per-env/): `wrangler dev` では Worker と対応する binding がローカルシミュレーションで動作します。
