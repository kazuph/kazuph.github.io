# 早押しクイズ BUZZ QUIZ（4人オンライン対戦 / Cloudflare ローカル開発限定）

4人が同じ部屋に入って、「早押し」して回答権を決めるクイズアプリです。
**Cloudflare Workers ランタイムで動作し、`wrangler dev` によるローカル開発だけが前提**です（デプロイしません）。

- サーバー（Durable Object）が「早押しの順番」「正誤」「得点」をすべて決定します
- ブラウザの申告（押した時刻・選んだ番号）は一切信用しません
- 再読み込み・回線断でも、同じプレイヤーとして点数を保ったまま復帰できます

---

## 1. 必要なもの

| 項目 | バージョン |
| --- | --- |
| Node.js | 20 以上（開発は 24.20.0 で確認） |
| npm | 10 以上 |
| Cloudflare アカウント | **不要**（`wrangler dev` のローカルモードのみを使用） |

## 2. セットアップ

```bash
npm install                      # 依存関係のインストール
npx playwright install chromium  # E2E テスト用ブラウザ（初回のみ）
```

## 3. 起動方法

```bash
npm run dev
# → http://localhost:8787
```

`npm run dev` は `wrangler dev --port 8787 --inspector-port 9333` を実行します。

- アプリ URL: **http://localhost:8787**
- インスペクタ（デバッグ）ポート: **9333**（8787 とは別の固定値。別の開発サーバーと衝突しないよう指定しています）
- Cloudflare へのログイン・デプロイは行いません（ローカルモードのみ）

> ポート 8787 を他のプロセスが使用中の場合は `npm run dev:alt`
> （8790 番 + インスペクタ 9340 番）で起動してください。

### 遊び方

1. http://localhost:8787 を開く
2. 名前を入力して **「部屋を作る」**（または部屋コードを入れて **「この部屋に参加」**）
3. 画面に出ている 6 文字の部屋コードを他の人に渡す（コピーボタンあり）
4. 2〜4 人がそろったら、**ホストだけ**に表示される「ゲームを開始」を押す
5. 問題が出たら **「早押し！」** を押す。**サーバーが最初に受け取った1人だけ**が回答権を得ます
6. 回答権を得たら 10 秒以内に 4 択から選ぶ（正解 +10 点 / 不正解 -5 点）
7. 不正解だとその問題では押けなくなり、残り的人で早押しが再開します
8. 全員が回答したか 20 秒たったら正解を表示して次の問題へ（10 問で最終順位）

同じ端末で試す場合：通常のウィンドウとシークレットウィンドウなど、
Cookie 領域を分けるブラウザを 4 つ開くと 4 人分を再現できます。

## 4. テスト

```bash
npm test                # 単体 + 結合（高速。ブラウザ不要）
npm run test:unit       # 単体テスト + WebSocket 結合テスト
npm run test:workers    # Durable Object 結合テスト（実 Workers ランタイム）
npm run test:e2e        # ブラウザ E2E（Playwright / PC 幅・スマホ幅の両方）
npm run test:e2e:pc     # E2E の PC 幅のみ
npm run test:e2e:mobile # E2E のスマホ幅のみ
npm run test:all        # 全部（単体 + 結合 + E2E）
npm run typecheck       # TypeScript の型チェック
```

| コマンド | 中身 | 使うもの |
| --- | --- | --- |
| `npm run test:unit` | `test/unit/game.test.ts` … 問題バンク・参加・開始・早押し・回答・自動進行・順位の純粋ロジック（25 テスト） | vitest（Node 環境） |
| `npm run test:unit` | `test/integration/ws.test.ts` … 実サーバーに WebSocket で接続して検証（8 テスト） | vitest（Node 環境）+ `ws` |
| `npm run test:workers` | `test/workers/room.test.ts` … Worker の HTTP API・DO の状態保存・DO のメッセージハンドラ・アラーム（6 テスト） | vitest + `@cloudflare/vitest-pool-workers`（実 Workers ランタイム） |
| `npm run test:e2e` | `test/e2e/quiz.spec.ts` … 4 人同時参加 / 5 人目拒否 / 同時早押し / 再読み込み復帰 / 10 問後の順位（7 テスト × PC・スマホ） | Playwright（Chromium） |

補足:

- `test/integration/ws.test.ts` は **テスト用の開発サーバーを 8799 番で一時起動**して検証します
  （`wrangler dev --port 8799`）。手動で起動済みのサーバーを使う場合は
  `QUIZ_TEST_BASE_URL=http://localhost:8787 npm run test:unit` と指定できます。
- E2E も **8790 番**に一時サーバーを起動します（`webServer` 設定）。
- スクリーンショットは `test/e2e/screenshots.spec.ts` が `.artifacts/{pc,mobile}/` に出力します
  （`.artifacts/` は git 管理外）。

### どのテストで何を確かめているか

| 確かめたいこと | テスト |
| --- | --- |
| 同時押しで 1 人だけが回答権を得る | `test/e2e/quiz.spec.ts`「同時に早押ししても 1 人だけが回答権を得る」/ `test/integration/ws.test.ts`「同時に早押ししても回答権はサーバーが最初に受け取った1人だけ」 |
| 4 人が同時に遊べる | `test/e2e/quiz.spec.ts`「4 人全員が同じ部屋に入り、全員に同じ画面が見える」 |
| 再読み込みで復帰できる | `test/e2e/quiz.spec.ts`「再読み込みしても同じプレイヤーとして点数を保ったまま復帰する」/ `test/integration/ws.test.ts`「切断・再接続しても同じプレイヤーとして点数を保ったまま復帰する」 |
| 5 人目は入れない | `test/e2e/quiz.spec.ts`「5 人目は入れず、理由が画面に出る」/ `test/unit/game.test.ts`「5 人目は入れず、理由が返る」 |
| 20 秒で自動進行 | `test/integration/ws.test.ts`「問題から20秒たったら正解を表示して次の問題へ進む」 |
| DO の永続化 / アラーム | `test/workers/room.test.ts` |

## 5. ルール（実装上の数値）

| 項目 | 値 |
| --- | --- |
| 1 部屋の定員 | 4 人 |
| 出題数 | 10 問（アプリ内蔵・外部 API なし） |
| 1 問の制限時間 | 20 秒（出題から） |
| 回答権の保持時間 | 10 秒（時間切れは不正解扱いで -5 点） |
| 正解 | +10 点 |
| 不正解 | -5 点 |
| 不正解後の流れ | 1.5 秒のフィードバック → 順番待ちの人に回答権 → いない場合は早押しを再開 |
| 正解表示後の待ち時間 | 2.5 秒 → 次の問題 |
| 開始できる条件 | 参加者が 2〜4 人、かつホストのみ |

## 6. ディレクトリ構成

```
src/
  worker.ts     Worker（ルーティング / 部屋コード発行 / 静的ファイル配信）
  room.ts       Durable Object（1 部屋 = 1 DO。WebSocket と状態管理）
  game.ts       ゲームロジック（純粋関数。サーバー権威の判定）
  questions.ts  内蔵の問題バンク（10 問）
  types.ts      共有型定義
public/         静的ファイル（index.html / styles.css / app.js）… Workers Assets で配信
test/
  unit/         単体テスト（vitest / Node）
  integration/  WebSocket 結合テスト（実サーバーに対して）
  workers/      Durable Object 結合テスト（実 Workers ランタイム）
  e2e/          Playwright のブラウザ E2E とスクリーンショット取得
```

設計の詳細は [ARCHITECTURE.md](./ARCHITECTURE.md)、検証結果は [RESULT.md](./RESULT.md) を参照してください。

## 7. トラブルシューティング

- **`localhost` が名前解決できない** … コンテナ環境などで `/etc/hosts` に `127.0.0.1 localhost` がない場合は
  追加してください（`wrangler dev` の実行時、workerd が `localhost` を解決できませんでした）。
- **`SQLITE_BUSY`（database is locked）** … ローカル開発では複数の部屋が同じ SQLite ファイルを共有するため
  まれに発生します。保存処理はリトライするようにしてあり、ゲームの進行は止まりません。
- **ポート 8787 が使用中** … `npm run dev:alt`（8790 番）を使ってください。
