# 早押しクイズ｜4人オンライン対戦

Cloudflare Workers + Durable Objects で動く、4人オンライン対戦の早押しクイズ。
**ローカル開発環境（`wrangler dev`）だけで動かす前提**で、デプロイも Cloudflare アカウントへのログインも不要。

- 部屋コードで4人まで同じ部屋に入る
- 出題されたら全員が早押し。**サーバーが最初に受け取った1人だけ**が回答できる
- 正解 +10点、不正解 -5点。10問終わったら最終順位
- 再読み込みや一時的な回線断でも、同じ席・同じ点数のまま復帰できる

設計の考え方は [ARCHITECTURE.md](./ARCHITECTURE.md)、要件ごとの結果は [RESULT.md](./RESULT.md) を参照。

## 必要なもの

- Node.js 20 以上（確認は Node v24 系）と npm
- 依存パッケージ（インストール済みでなければ `npm install`）
- Playwright のブラウザ（E2E テストで使う。未インストールなら `npx playwright install chromium`）

Cloudflare へのログインは不要。`wrangler dev` はローカルモードで動く。

## 起動方法

```bash
npm install       # 初回だけ
npm run dev
```

表示された **http://localhost:8787** をブラウザで開く。
`wrangler dev` は `127.0.0.1:8787` だけを使う。inspector は `wrangler.jsonc` で `inspector_port: 0`（固定ポートを占有しない）にしてある。
環境によって `localhost` が解決できない場合は `http://127.0.0.1:8787` を使う（テストはこちらを使っている）。

動作確認の流れ:

1. 1人目のブラウザで名前を入れて「部屋を作る」。表示された6文字の部屋コードを控える。
2. 2人目以降のブラウザ（または別のウィンドウ）で、同じ名前入力欄に名前を入れて部屋コードを入力し「参加する」。
3. 2〜4人そろったら、ホスト（部屋を作った人）が「ゲーム開始」を押す。
4. 問題が出たら、早押しボタン（またはスペースキー）を押す。最初に押した1人だけが4択に答えられる。

1つのブラウザでも、ウィンドウを分けるか、シークレットウィンドウを使えば複数人として遊べる。

## テスト方法

```bash
npm test          # 型検査 → 単体テスト → ブラウザE2E をまとめて実行
```

個別に実行する場合:

```bash
npm run typecheck    # TypeScript の型検査
npm run test:unit    # Vitest によるルールの単体テスト
npm run test:e2e     # Playwright によるブラウザE2E（wrangler dev を自動起動）
```

E2E テストは `wrangler dev` を `http://127.0.0.1:8787` で自動的に起動してから、実際のブラウザで操作する。
**ゲームの制限時間（20秒・10秒・3秒）はテストでも縮めず実時間で待つ**ため、E2E は数分かかる。
実行中は 8787 番ポートをほかのプロセスが使わないようにする。

### 単体テスト（`tests/unit/game.test.ts`）

実時間を待たずに、サーバー側のルールを確かめる。

- 定員4人・5人目の拒否、開始はホストだけ・2〜4人だけ、開始後の参加拒否
- 4人の早押しを24通りすべての順番で処理しても、回答権を得るのは最初の1人だけ
- 正解 +10、不正解 -5 と失格、回答10秒切れ -5、失格者は押せない、古い問題番号は無視
- 問題の20秒切れで正解発表。回答中でも20秒で締め切る
- 全員失格で正解発表、10問後に終了、同点は同順位
- 出題中・回答中の状態に正解の番号が含まれない
- 問題が12問以上あり、10問が重複なく選ばれる

### ブラウザE2E（`tests/e2e/*.spec.ts`）

| ファイル | 確かめること |
|---|---|
| `capacity.spec.ts` | 4人まで入れて5人目は満員表示。開始はホスト・2人以上。開始後は入れない |
| `buzzer.spec.ts` | 4人が同時に押しても回答権は1人だけ（3問くり返す） |
| `wrong-answer.spec.ts` | 不正解で全員の画面が -5 点になり、その問題ではもう押せない |
| `reconnect.spec.ts` | 再読み込みで同じ名前・点数に復帰。5秒の回線断から自動再接続し、切断表示が消える |
| `timeout.spec.ts` | 誰も押さないと20秒で正解表示。回答者が選ばないと10秒で -5 |
| `timer-sync.spec.ts` | 4つの画面で問題文・残り時間（差1秒以内）・回答中の人がそろう |
| `full-game.spec.ts` | 10問を通して遊び、4つの画面に同じ最終順位。4画面ぶんのスクリーンショットを保存 |

## スクリーンショット

E2E テスト（`full-game.spec.ts` の2つめのテスト）が、ロビー・出題中・回答中・結果の各画面を PC 幅（1280×800）とスマホ幅（390×844）で `.artifacts/` に保存する。

```
.artifacts/
  lobby-pc.png      lobby-mobile.png
  question-pc.png   question-mobile.png
  answering-pc.png  answering-mobile.png
  result-pc.png     result-mobile.png
```

`.artifacts/` は `.gitignore` に入れており、コミットしない。スクリーンショットを取り直したいときは `npm run test:e2e -- full-game.spec.ts` を実行する。

## 画面

- **入口**: 名前を入れて「部屋を作る」か、部屋コードで「参加する」。5人目は「満員です（4人まで）」と出る。
- **ロビー**: 部屋コードと参加者4枠。ホストだけに「ゲーム開始」（2人未満は無効）。
- **ゲーム**: 第N問と残り時間の棒、問題文、4択（2×2）、大きな赤い早押しボタン、参加者の点数一覧。回答中の人はカードを強調し、全員に「○○さんが回答中」と出る。
- **結果**: 最終順位。同点は同じ順位で、金・銀・銅の色分け。

PC幅とスマホ幅の両方で遊べる。スマホ幅（390×844）では、問題文・4択・早押しボタンがスクロールせずに1画面に収まる。

## ファイル構成

```
wrangler.jsonc          Worker / Durable Object / Assets / dev ポートの設定
src/worker.ts           /api/* の受付。部屋コードから Durable Object を引く
src/room.ts             Durable Object。状態の保存・全員への配信・Alarm・切断検知
src/game.ts             ゲームの規則（純粋関数）
src/questions.ts        内蔵の日本語4択問題（18問）
src/env.ts, src/http.ts バインディングの型と JSON ヘルパー
public/index.html       4画面ぶんの HTML
public/style.css        見た目（CSS 変数・レスポンシブ）
public/app.js           WebSocket・描画・再接続
tests/unit/game.test.ts ルールの単体テスト
tests/e2e/*.spec.ts     ブラウザE2Eテスト
```

## 決定済み事項の守り

- 実行環境は Cloudflare Workers。ローカルは `wrangler dev`。
- デプロイしない。Cloudflare アカウントへのログインは不要（`wrangler dev` のローカルモードのみ）。
- アプリの URL は `http://localhost:8787`。開発サーバーはこのポート以外で常駐させない。
- 有料の外部サービスや外部のリアルタイム配信サービスは使わず、Cloudflare の機能（Workers / Durable Objects / Alarm / WebSocket / Static Assets）だけで完結する。
- 正誤判定・点数・早押しの順番はすべてサーバー側（`src/game.ts` と Durable Object）で決める。ブラウザからは点数を送らせない。
