# 早押しクイズ・アリーナ

4人がオンラインで同じ部屋に入って対戦する、早押しクイズのWebアプリです。
**Cloudflare Workers + Durable Objects + WebSocket** で動き、**ローカル開発（`wrangler dev`）専用**です。
デプロイや Cloudflare アカウントへのログインは不要で、外部API・外部のリアルタイム配信サービスは使いません。

- 問題は4択 × 10問。アプリに内蔵した日本語問題（`src/questions.ts`）から出題します。
- 早押しは **サーバー（Durable Object）が最初に受け取った1人だけ** が回答権を得ます。
- 正解 +10点 / 不正解 -5点。不正解の人はその問題ではもう押せません。
- 再読み込みや一時的な回線断でも、**同じプレイヤーとして点数を保ったまま復帰**できます。

---

## 必要なもの

- Node.js 20 以上（動作確認: Node 24）
- 依存パッケージ（`npm install` 済み。未実行なら実行してください）

```bash
npm install
```

> `wrangler dev` はローカルモードで動くため、Cloudflare へのログインは不要です。

---

## 起動方法

```bash
npm run dev
```

`http://localhost:8787` を開きます。
（環境によって `localhost` が解決できない場合は `http://127.0.0.1:8787` を使ってください。同じサーバーです。）

- アプリ本体は必ず **8787** で待ち受けます。
- inspector などの補助ポートは固定せず、`scripts/dev.mjs` が毎回空いているポートを自動で選びます。
- 停止は `Ctrl+C`。

### 遊び方

1. 名前を入れて「部屋を作る」を押すと、部屋コード（例 `K7Q2`）が発行されます。
2. ほかのプレイヤーは同じ画面で「コードで参加」を選び、部屋コードを入れて参加します。**定員は4人**で、5人目には満員の理由が表示されます。
3. 2〜4人がそろったら、ホストが「ゲーム開始」を押します。
4. 問題が出たら全員の画面に早押しボタンが出ます。一番早く押した1人だけが回答権を得ます。
5. 回答権を得た人は10秒以内に4択から選びます。正解 +10点、不正解 -5点。
6. 不正解の人はその問題ではもう押せず、残りの人で早押しが再開します。
7. 全員が押せなくなるか、問題が出てから20秒たつと正解が全員に表示され、次の問題へ進みます。
8. 10問終わると最終順位が全員に表示されます。
9. ゲーム中に再読み込みしても、同じプレイヤー・同じ点数で復帰します。

---

## テスト方法

3層で確かめています。**すべてローカルで完結**します。

### 1. ユニットテスト（純粋ロジック / Node + Vitest）

```bash
npm run test:unit
```

`src/game.ts` の早押し裁定・採点・時間切れ・順位などを、WebSocket を使わず決定的に検証します。

### 2. 結合テスト（Workers ランタイム + Durable Objects）

```bash
npm run test:integration
```

`@cloudflare/vitest-pool-workers` で実際の workerd 上に Durable Object と WebSocket を立て、
次のような振る舞いを検証します（`wrangler.test.jsonc` で時間設定を短縮しています）。

- 3人が同時に `buzz` を送っても回答権は1人だけ
- トークンを使って点数を保ったまま復帰できる
- 5人目は `ROOM_FULL` で入れない
- 回答権のない人の回答はサーバーが拒否する
- 制限時間でサーバーが正解を公開する
- 4人が同じ部屋で10問を遊びきり、全員が同じ最終順位を見る

### 3. ブラウザE2E（Playwright / 4人同時対戦）

```bash
npm run test:e2e
```

Playwright が `wrangler dev` を **8899番ポート**（テスト専用。8787 とは別）で起動し、
Chromium の複数コンテキストで実際に4人が対戦します。検証内容:

- 4人まで入室でき、5人目は満員の理由が画面に出る
- 4ページからほぼ同時に早押ししても、回答権を得るのは1人だけ
- 回答すると点数が入り、再読み込みしても同じ点数で復帰する
- 4人が10問を遊びきり、全員に最終順位が出る
- スマホ幅（390×844）でも早押し・回答できる

> 初回は Playwright のブラウザが必要です。このリポジトリの環境には同梱済みです。
> 別環境で未インストールの場合は `npx playwright install chromium` を実行してください。

### まとめて実行

```bash
npm test          # ユニット + 結合
npm run test:e2e  # ブラウザE2E
npm run typecheck # TypeScript の型チェック
```

---

## スクリーンショット

`.artifacts/`（git 管理外）に、PC幅とスマホ幅の各画面を保存します。

```bash
npm run screenshots
```

保存される画像（抜粋）:

| 画面 | PC (1280×900) | スマホ (390×844) |
| --- | --- | --- |
| ホーム | `.artifacts/pc-home.png` | `.artifacts/mobile-home.png` |
| ロビー | `.artifacts/pc-lobby.png` | `.artifacts/mobile-lobby.png` |
| 出題中 | `.artifacts/pc-question.png` | `.artifacts/mobile-question.png` |
| 回答中 | `.artifacts/pc-answering.png` | `.artifacts/mobile-answering.png` |
| 正解発表 | `.artifacts/pc-reveal.png` | `.artifacts/mobile-reveal.png` |
| 結果 | `.artifacts/pc-result.png` | `.artifacts/mobile-result.png` |

---

## ディレクトリ構成

```
.
├── src/
│   ├── worker.ts        # Worker エントリ（採番・WebSocket転送・アセット配信）
│   ├── game-room.ts     # 部屋ごとの Durable Object（権威サーバー）
│   ├── game.ts          # ゲームの純粋ロジック
│   ├── questions.ts     # 内蔵の日本語4択問題バンク
│   ├── protocol.ts      # 共有の型・メッセージ定義
│   └── env.ts           # バインディング型
├── public/              # UI（ビルド不要の素の ESM）
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── test/
│   ├── unit/            # ユニットテスト
│   └── integration/     # Durable Object 結合テスト
├── e2e/                 # Playwright E2E
├── scripts/
│   ├── dev.mjs          # wrangler dev ラッパー（8787固定 / inspector自動）
│   └── shots.mjs        # スクリーンショット撮影
├── wrangler.jsonc       # 開発用の Workers 設定（8787）
├── wrangler.test.jsonc  # 結合テスト用（時間設定を短縮）
├── ARCHITECTURE.md      # 設計判断と採用しなかった案
└── RESULT.md            # 要件ごとの達成状況
```

---

## 設定（任意）

時間設定は環境変数で変更できます（既定値）。

| 変数 | 既定値 | 意味 |
| --- | --- | --- |
| `QUESTION_MS` | `20000` | 問題が出てから正解発表までの猶予 |
| `ANSWER_MS` | `10000` | 回答権を得てから選ぶまでの猶予 |
| `REVEAL_MS` | `3000` | 正解発表を見せてから次の問題へ進むまで |

例:

```bash
node scripts/dev.mjs --port 8787 --var QUESTION_MS:5000 --var ANSWER_MS:3000 --var REVEAL_MS:1000
```

---

## 注意

- **デプロイしません。** `wrangler deploy` は使わず、`wrangler dev`（ローカル）だけで動かします。
- アプリの待ち受けポートは `8787` です。それ以外のポートで開発サーバーを常駐させません（テストは一時的に別ポートを使用）。
- 正誤判定・点数・早押しの順番はすべてサーバー側（Durable Object）で決定します。
