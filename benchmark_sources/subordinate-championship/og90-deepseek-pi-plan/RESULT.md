# RESULT

課題の「遊び方」11項目・テスト・UIについて、確かめた方法と結果をまとめます。

- 確かめたコマンド: `npm test`（型検査 → 単体テスト → ブラウザE2E）
- 結果: 型検査 OK / 単体 27件 すべて成功 / E2E 18件 すべて成功（実行時間 約3分）
- スクリーンショットは `npm run test:e2e`（`tests/e2e/screenshots.spec.ts`）が `.artifacts/` に生成します

## 1. 遊び方（必須の機能）

| # | 項目 | 確かめた方法 | 結果 |
|---|---|---|---|
| 1 | 名前を入れて「部屋を作る」か、部屋コードで「参加する」 | E2E `tests/e2e/lobby.spec.ts`「入口から部屋を作り、コードで3人が参加でき、5人目は満員で断られる」（実際に `#name-input` を入力し `#create-room-btn` / `#code-input` + `#join-room-btn` を押している）／スクリーンショット `.artifacts/entry-pc.png` `.artifacts/entry-mobile.png`（入口）`.artifacts/lobby-pc.png` `.artifacts/lobby-mobile.png`（ロビー） | 達成 |
| 2 | 定員4人。5人目は入れず、理由が画面に出る | E2E `lobby.spec.ts`「入口から部屋を作り…5人目は満員で断られる」（`#entry-error` に「満員です（4人まで）」が出ることを確認）／単体 `game.test.ts`「定員は4人で、5人目は拒否される」 | 達成 |
| 3 | ホストが「開始」を押すと始まる。開始できるのは2〜4人 | E2E `lobby.spec.ts`「開始できるのは2人以上のときだけ」「開始できるのはホストだけ」／単体「開始できるのは2人以上4人以下」「開始できるのはホストだけ」「開始後の参加は拒否される」 | 達成 |
| 4 | 4択・内蔵の日本語問題を10問（外部APIなし） | 単体「内蔵の問題が10問以上あり、すべて4択で正解番号が0〜3」「pickQuestions は重複なく10問えらぶ」／E2E `tests/e2e/fullgame.spec.ts`「4人が10問さいごまで遊ぶと…」が10問を完走（`#q-total` が 10）／問題データは `src/questions.ts` に14問を内蔵。実行時に外部へ通信しない | 達成 |
| 5 | 全員に早押しボタンが出て、サーバーが最初に受け取った1人だけが回答権を得る | E2E `tests/e2e/gameplay.spec.ts`「4人が同時に押しても回答権は1人だけ（3問くり返す）」（4画面が同じ瞬間に buzz を送り、`data-answerer="true"` の画面がちょうど1つ）／E2E `tests/e2e/ws-concurrency.spec.ts`「4つの接続から同時に届いた buzz でも、回答権を得るのは1人だけ」（4本の WebSocket から同時送信。4接続が見ている `buzzedBy` が一致）／単体「4人が同時に押しても、最初に処理された1人だけが回答権を得る（24通りすべて）」 | 達成 |
| 6 | 回答権を得た人は10秒以内に4択から選ぶ。正解+10点、不正解-5点 | 正解+10点: E2E `fullgame.spec.ts`（10問すべて正解で合計100点）／`ws-concurrency.spec.ts`（勝者の点数が10）／`tests/e2e/reconnect.spec.ts`（+10点の表示）／不正解-5点: E2E `gameplay.spec.ts`「不正解の人は-5点になり、その問題ではもう押せない」／単体「正解は+10点で正解表示へ」「不正解は-5点で…」 | 達成 |
| 7 | 不正解の人はその問題ではもう押せない。残りの人で早押しを再開 | E2E `gameplay.spec.ts`「不正解の人は-5点になり、その問題ではもう押せない」（本人のボタンが無効・全画面に「回答済み」、ほかの人は押せる）／単体「不正解は-5点で、その人はこの問題ではもう押せない」（`phase` が `question` に戻ることも確認） | 達成 |
| 8 | 全員が押せなくなるか、出題から20秒で正解を表示して次へ | E2E `gameplay.spec.ts`「誰も押さないと、問題が出てから20秒で正解が表示される」（実時間で 18〜26秒の範囲を確認、正解の選択肢が1つ強調される）／「全員が押せなくなると、20秒を待たずに正解が表示される」／単体「問題の20秒が過ぎると…」「正解表示は3秒で次の問題へ進む」 | 達成 |
| 9 | 10問おわったら最終順位を全員に表示 | E2E `fullgame.spec.ts`「4人が10問さいごまで遊ぶと、4つの画面に同じ最終順位が出る」（4画面の順位表が同じ内容。合計100点。自分の行が `is-me`）／単体「10問すべて正解すると finished になり、同点は同じ順位になる」「順位は点数の高い順で、同点は同順位」 | 達成 |
| 10 | 再読み込み・回線の一時切断から、同じプレイヤーとして点数を保って復帰 | E2E `reconnect.spec.ts`「ゲーム中に再読み込みしても、同じ名前と点数のまま復帰する」（+10点のまま、問題文も同じ、ほかの画面の「接続が切れています」が消える）／「回線が一時的に切れても自動で再接続し、点数を保ったまま戻る」（`context.setOffline(true)` で5秒以上切断。切断中は他の画面に「接続が切れています」が出て、復帰後に消える） | 達成 |
| 11 | 点数・残り時間・誰が回答中かが全員の画面でそろって見える | E2E `gameplay.spec.ts`「点数・残り時間・回答中の人が全員の画面でそろって見える」（4画面の `#timer-value` の差が1秒以内、問題文が同一、回答中の行が4画面で同じ人・ちょうど1行）／スクリーンショット `.artifacts/question-pc.png` `.artifacts/answering-mobile.png` など | 達成 |

### 補足（代用した箇所）

- 項目5の「4人が同時に押す」は、ブラウザE2Eでは4つの画面で**クリック相当のイベントを同時に発火**させて確かめています。実際のマウス操作を `Promise.all` で同時に行う方法は、1人が先に回答権を得た瞬間に他のボタンが無効化され、Playwright が「押せるようになるまで待って次の問題で押してしまう」ことがあり不安定でした。そのため、**プロトコルそのものを確かめる結合テスト**（`ws-concurrency.spec.ts`）を別に用意し、4本の WebSocket から同時に `buzz` を送って1人だけが回答権を得ることを確かめています。単体テストでは4人の並び順24通りすべてを試しています。
- 項目6の「10秒以内」は、回答の締め切り（押した時刻+10秒）と問題の締め切り（出題+20秒）の早いほう、としています。出題から15秒で押した場合は残り5秒で締め切られます（単体「回答中でも問題の20秒で締め切られる」）。
- 項目10の切断時間は、E2E では5秒以上（実測を `expect(offlineMs).toBeGreaterThanOrEqual(5000)` で確認）にしています。

## 2. テスト

| 種類 | 何を | 実行コマンド | 結果 |
|---|---|---|---|
| 型検査 | `src/` と `tests/` の TypeScript | `npm run typecheck` | 達成（エラーなし） |
| 単体テスト（27件） | `src/game.ts` のゲーム規則。定員・開始条件・早押しの24通り・点数・締め切り・順位・配信する状態（正解を出題中に送らない／他人の token を送らない） | `npm run test:unit`（vitest） | 達成（27 passed） |
| ブラウザE2E（18件） | 入口・ロビー・ゲーム・再接続・10問完走・スクリーンショット。`wrangler dev` を自動起動し、**時間は短縮せず実時間で待つ** | `npm run test:e2e`（Playwright + Chromium） | 達成（18 passed） |
| 結合（WebSocket） | 4接続から同時に `buzz` して1人だけが回答権を得る／回答権のない `answer` は拒否 | `npx playwright test tests/e2e/ws-concurrency.spec.ts` | 達成（2 passed） |
| すべて | 上記をまとめて | `npm test` | 達成（型検査 + 27 + 18 すべて成功、約3分） |

### 特に指定された3つのテスト

| 指定 | テスト |
|---|---|
| 同時押しで1人だけが回答権を得る | `tests/e2e/ws-concurrency.spec.ts`「4つの接続から同時に届いた buzz でも、回答権を得るのは1人だけ」／`tests/e2e/gameplay.spec.ts`「4人が同時に押しても回答権は1人だけ（3問くり返す）」／`tests/unit/game.test.ts`「4人が同時に押しても、最初に処理された1人だけが回答権を得る（24通りすべて）」 |
| 再読み込みで復帰できる | `tests/e2e/reconnect.spec.ts`「ゲーム中に再読み込みしても、同じ名前と点数のまま復帰する」 |
| 4人が同時に遊べる | `tests/e2e/fullgame.spec.ts`「4人が10問さいごまで遊ぶと、4つの画面に同じ最終順位が出る」（4つの独立したブラウザコンテキストで10問完走）／`tests/e2e/screenshots.spec.ts`（PC幅2つ + スマホ幅2つで10問完走） |

## 3. UI

| 項目 | 確かめた方法 | 結果 |
|---|---|---|
| PC幅で遊べる | すべての E2E は 1280×800 のビューポートで実行。スクリーンショット `.artifacts/entry-pc.png` `.artifacts/lobby-pc.png` `.artifacts/question-pc.png` `.artifacts/answering-pc.png` `.artifacts/reveal-pc.png` `.artifacts/result-pc.png` | 達成 |
| スマホ幅で遊べる | `tests/e2e/screenshots.spec.ts` は 390×844 のビューポートの2人を含む4人で10問完走（スマホ幅の人が実際に早押し・回答している）。スクリーンショット `.artifacts/entry-mobile.png` `.artifacts/lobby-mobile.png` `.artifacts/question-mobile.png` `.artifacts/answering-mobile.png` `.artifacts/reveal-mobile.png` `.artifacts/result-mobile.png` | 達成 |
| スマホ幅で問題文・4択・早押しボタンがスクロールせず1画面に収まる | `screenshots.spec.ts` が 390×844 の画面で `#question-text`・4つの `.choice`・`#buzz-btn`・`#game-status`・`#timer-fill` の位置を測り、すべて 0〜844px の内側にあることを確認（`expect(box.y + box.height).toBeLessThanOrEqual(844)`） | 達成 |
| 見た目・操作感 | 明るいクイズ番組風（白背景 + 濃紺の文字 + 大きな赤い早押しボタン）。残り時間の棒は出題中=青／回答中=黄／正解表示=緑／残り5秒以下=赤。回答中の人のカードを金色で強調、切断中の人は「接続が切れています」を表示。スペースキーでも早押しできる | 達成（スクリーンショット参照） |
| スクリーンショットの保存先 | `.artifacts/`（`.gitignore` に入れているので git にはコミットされない） | 達成 |

## 4. 決定済み事項の遵守

| 項目 | 状態 |
|---|---|
| Cloudflare Workers のランタイム。ローカルは `wrangler dev` | 達成（`wrangler.jsonc` の `main: src/worker.ts`。`npm run dev` で起動） |
| デプロイしない・Cloudflare へのログイン不要 | 達成（`wrangler dev` はローカルモードのみ。`wrangler deploy` は使わない。アカウント設定なしで起動できることを確認） |
| URL は `http://localhost:8787`。ほかのポートを使う開発サーバーを常駐させない | 達成（`wrangler.jsonc` の `dev.port: 8787`、`dev.inspector_port: 0` で inspector も無効。常駐するサーバーはこの1つだけ） |
| 有料の外部サービス・外部リアルタイム配信サービスを使わない | 達成（Workers / Durable Objects / WebSocket / Alarm / Static Assets のみ。依存は wrangler・typescript・vitest・Playwright だけ） |
| 正誤判定・点数・早押しの順番はサーバー側で決める | 達成（`src/game.ts` の純粋関数が唯一の判定元。ブラウザに正解は出題中に送らない＝単体「出題中と回答中は正解の番号を含まない」、`ws-concurrency.spec.ts` でも確認。クライアントは表示するだけ） |
| 画像生成ツールを使わない | 達成（CSS と HTML だけで作っている） |
| PLAN.md に従う | 達成（構成・ファイル分割・API・規則・画面・テストの項目をそのまま実装。PLAN の「時刻は `now` を引数で受け取る純粋関数」も `src/game.ts` で守っている） |

## 5. 既知の制限

- ローカル開発専用です。`wrangler deploy` は想定していません。
- 部屋は誰もつながなくなると Alarm が止まり、次に誰かがつながった時点で締め切りの処理が再開します（最大1秒ほど遅れて反映）。
- 同じブラウザの同じプロファイルで複数タブを開くと、`localStorage` が共有されるため同じプレイヤーとして扱われます（別のウィンドウ／プロファイルを使えば別人として参加できます）。
