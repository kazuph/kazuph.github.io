# 実施結果

対象: TASK.md の4人オンライン対戦クイズ。実行はローカルの Wrangler のみ。デプロイはしていません。

| 遊び方 | 確かめた方法 | 結果 |
|---|---|---|
| 1 名前を入れて作成・コードで参加 | `tests/e2e/game.spec.ts` の4人作成・参加、`.artifacts/lobby-pc.png` | 達成 |
| 2 定員4人、5人目に理由を表示 | 同 E2E の5人目、`tests/unit/game.test.ts`「定員と開始条件を守る」 | 達成 |
| 3 ホストが2〜4人で開始 | 同 E2E の開始、同単体テストの人数・ホスト | 達成 |
| 4 内蔵日本語4択を10問 | 同 E2E の全10問、`src/questions.ts` の12問 | 達成 |
| 5 最初に受け取った1人が回答権 | 同 E2E の4画面同時押し3問、単体テストの全24順序 | 達成 |
| 6 10秒以内の回答、正解+10・不正解-5 | 同 E2E の正誤と実時間の回答切れ、単体テスト「正解・不正解・回答期限と失格を処理する」 | 達成 |
| 7 不正解者を失格にし残りで再開 | 同 E2E の-5点・ボタン無効・別の人の回答、同単体テスト | 達成 |
| 8 全員失格または20秒で正解を表示 | 同 E2E の実時間20秒、単体テスト「20秒の締切と全員失格で正解を表示する」 | 達成 |
| 9 10問後に全員へ順位 | 同 E2E の4画面の順位一致、単体テストの同順位 | 達成 |
| 10 再読み込み・回線復帰で同じ人と得点 | 同 E2E の再読み込みと5秒オフラインからの復帰 | 達成 |
| 11 得点・残り時間・回答者を共有 | 同 E2E の4画面の得点、回答者の画面、残り秒数の差1秒以内 | 達成 |
| テスト | `npm test`（型検査、Vitest、Playwright / Wrangler） | 達成 |
| PC幅 UI | `.artifacts/lobby-pc.png`、`.artifacts/question-pc.png`、`.artifacts/answering-pc.png`、`.artifacts/results-pc.png` | 達成 |
| スマホ幅 UI | `.artifacts/lobby-mobile.png`、`.artifacts/question-mobile.png`、`.artifacts/answering-mobile.png`、`.artifacts/results-mobile.png`。E2E が390×844の問題・4択・早押しの画面内座標と横はみ出しを検査 | 達成 |

スクリーンショットは `.artifacts/` に保存し、Git に含めていません。実際の4端末やインターネット経由の接続は対象外で、独立した4つのブラウザコンテキストを使用しました。
