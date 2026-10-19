# 早押しクイズ対戦（buzzer-quiz）

4人がオンラインで同じ部屋に入って対戦する早押しクイズの Web アプリ。
Cloudflare Workers + Durable Objects（SQLite 版）+ WebSocket Hibernation + Alarm +
Workers Static Assets で構成し、**ローカル開発環境（`wrangler dev`）だけ**で動かす。
デプロイ・Cloudflare アカウントへのログインは不要。

## 起動方法

```sh
npm install
npm run dev
```

`http://localhost:8793` をブラウザで開く。4人で遊ぶには4つのタブ/ブラウザで開き、
1人が「部屋を作る」→ 表示された6文字の部屋コードをほかの人が入力して「参加する」。

## 遊び方

1. 名前を入れて「部屋を作る」か、部屋コードを入れて「参加する」（定員4人）。
2. ホスト（部屋を作った人）が「ゲーム開始」を押すと開始（2〜4人のときだけ）。
3. 問題は内蔵の日本語4択から10問。問題が出たら全員に早押しボタンが出る。
4. サーバーが最初に受け取った1人だけが回答権を得て、10秒以内に4択から選ぶ。
   正解 +10点 / 不正解 -5点。不正解の人はその問題ではもう押せず、残りの人で早押しを再開する。
5. 全員が押せなくなるか出題から20秒で、正解を3秒間表示して次の問題へ。
6. 10問終わったら最終順位を表示（同点は同じ順位）。
7. 再読み込み・回線切れからは自動で復帰する（点数はそのまま）。
   スペースキーでも早押しできる。

## テスト方法

```sh
npm test
```

以下がすべて順番に走る（E2E は実時間で動かすため数分かかる）:

- `npm run typecheck`: `tsc --noEmit` で src と tests の型検査
- `npm run test:unit`: vitest で `tests/unit/game.test.ts`（ゲーム規則の単体テスト23本）
- `npm run test:e2e`: Playwright で `tests/e2e/game.spec.ts`
  （`wrangler dev` を webServer として自動起動、4つの独立ブラウザで実際に対戦させる）

個別に実行する場合:

```sh
npm run typecheck
npm run test:unit
npm run test:e2e   # 先に npm run dev を起動しておいてもよい（reuseExistingServer）
```

E2E で保存される画面キャプチャは `.artifacts/`（git 管理外）。

## 構成

- `src/worker.ts`: `/api/rooms`（作成）`/api/rooms/:code/join`（参加）`/api/rooms/:code/ws`（WebSocket 切替）
- `src/room.ts`: 1部屋=1つの Durable Object。状態の保存・WebSocket 受付・全員配信・Alarm
- `src/game.ts`: ゲーム規則の純粋関数（時刻 `now` を引数に取り副作用なし）
- `src/questions.ts`: 内蔵4択問題15問（毎回10問をランダム抽出）
- `public/`: ビルドなしの HTML/CSS/JS

設計の詳細は `ARCHITECTURE.md`、課題の各項目をどう確かめたかは `RESULT.md` を参照。
