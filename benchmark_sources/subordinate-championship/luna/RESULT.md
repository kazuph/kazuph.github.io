# 完了結果

実行環境は Cloudflare Workers の `wrangler dev` に限定しました。Cloudflare へのログイン・デプロイ・外部 API 利用はありません。テストはローカルの Wrangler Worker / Durable Object / WebSocket と Chromium の実ブラウザーを使用しています。

## 遊び方の確認

| # | 要件 | 確認方法（テスト・証拠） | 結果 |
|---:|---|---|---|
| 1 | 名前を入力して部屋を作るか、部屋コードで参加する | E2E「4人が同じローカル対戦に参加し、同時押し・誤答・再読み込み後もサーバー状態がそろう」 | 達成 |
| 2 | 5人目を拒否し、理由を画面に表示する | 同テスト。4人参加後の5人目に「満員（定員4人）」を表示 | 達成 |
| 3 | ホストが2〜4人で開始できる | 同テスト。1人では開始無効、ゲストには開始ボタンなし、4人でホストが開始 | 達成 |
| 4 | 内蔵の日本語4択問題を10問出す | E2E「10問に正解すると、全員にサーバー採点の最終順位を表示する」および [src/questions.ts](src/questions.ts) | 達成 |
| 5 | サーバーが最初に受け取った1人だけに回答権を付与する | 4人同時押しE2E。4画面すべてで `ANSWERING` が1人だけ | 達成 |
| 6 | 回答権は10秒。正解+10点、誤答−5点 | E2E「10秒で回答権が切れ、20秒で問題が締め切られて正解が表示される」、全員誤答E2E、10問完走E2E | 達成 |
| 7 | 誤答者は再押下できず、残りの人が続けて押せる | 4人同時押しE2Eと全員誤答E2E。偽の得点 `1000` を含めてもサーバーが `−5` 点を適用 | 達成 |
| 8 | 全員が押せないか20秒で正解を表示し、次へ進む | E2E「全員が誤答すると正解を表示して次の問題へ進み、全員に減点を反映する」とタイマーE2E | 達成 |
| 9 | 10問後に全員へ最終順位を表示する | 10問完走E2E。全員が同じ順位を表示し、正解者100点・相手0点 | 達成 |
| 10 | 再読み込み・一時切断後も同じプレイヤーと得点で復帰する | 4人同時押しE2E。得点後の再読み込みとブラウザー回線の切断・復旧を確認 | 達成 |
| 11 | 点数・残り時間・回答中の人を全員に同期表示する | 4人同時押しE2E。4画面の表示タイマー差が1秒以内、回答権表示と得点更新を確認 | 達成 |

## テストと画面

| 対象 | 確認方法（テスト・証拠） | 結果 |
|---|---|---|
| ローカル実行・全機能 | `npm test`（`wrangler dev` が `127.0.0.1:8787` で起動） | 5件成功 |
| TypeScript | `npm run typecheck` | 成功 |
| 依存監査 | `npm audit --audit-level=high` | 脆弱性0件 |
| 差分形式 | `git diff --check` | 成功 |
| PC画面 | [ロビー](.artifacts/screenshots/lobby-desktop.png)、[出題中](.artifacts/screenshots/question-desktop.png)、[回答中](.artifacts/screenshots/answering-desktop.png)、[結果](.artifacts/screenshots/results-desktop.png) | 達成 |
| スマートフォン画面 | [ロビー](.artifacts/screenshots/lobby-mobile.png)、[出題中](.artifacts/screenshots/question-mobile.png)、[回答中](.artifacts/screenshots/answering-mobile.png)、[結果](.artifacts/screenshots/results-mobile.png) | 達成 |
| UIの数値確認 | 画面幅1440px / 390pxで横はみ出しなし。主要テキストのコントラストを実ブラウザーで計算 | 達成 |

スクリーンショットとテスト用の追加観察画像は `.artifacts/screenshots/` に保存しています。`.gitignore` の除外を `git check-ignore` で確認し、Git には追加していません。

## コミット

作業ブランチ `feat/local-quiz` に、アプリ・テスト・説明書を先にコミットし、この結果表を別コミットにしました。push は行っていません。
