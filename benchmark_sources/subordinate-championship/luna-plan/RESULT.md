# 実装結果

確認していない項目は未達として記録します。画面証拠は `.artifacts/quickbell/` に保存し、Git には含めません。

| 項目 | 確かめた方法・証拠 | 状態 |
|---|---|---|
| 1. 名前で部屋作成・コード参加 | Playwright `four independent players can race, reconnect, play ten questions, and see matching final ranks`。作成者と3参加者が別々のブラウザーコンテキストで入室 | 達成 |
| 2. 4人定員・5人目の拒否理由 | 同E2Eで5人目に `満員です（4人まで）` が表示されることを確認 | 達成 |
| 3. ホスト開始、2〜4人条件 | 単体 `allows only the host to start with two through four players`。ホスト以外、1人開始、開始後の参加を拒否 | 達成 |
| 4. 内蔵日本語4択から10問 | `src/questions.ts` の12問。10問のブラウザー完走で出題・回答を確認 | 達成 |
| 5. サーバーで先着1人だけ回答権 | 単体 `grants exactly one answer right for every ordering of four simultaneous buzzes`（24通り）と、4画面の同時押しを3問確認 | 達成 |
| 6. 10秒以内の回答、正解＋10・不正解/時間切れ−5 | 単体 `scores correct and incorrect answers and removes a wrong answerer from this question` と `scores an unanswered claim at ten seconds and ends the question at twenty`。E2Eで正解後の＋10、誤答・実時間10秒切れ後の−5を確認 | 達成 |
| 7. 不正解後の再早押しと回答済み無効化 | 4人E2Eで誤答後、誤答者の早押しボタンが無効、残る3人の早押しで同じ問題に正答可能なことを確認 | 達成 |
| 8. 20秒期限・全員失格後の正解表示と次問 | 単体 `reveals when every player is eliminated and finishes after ten questions`。E2E `real deadlines, five-second offline recovery, and shared server time work` で無回答の実時間20秒後に正解表示、次問への進行を確認 | 達成 |
| 9. 10問終了後の同順位を含む最終順位 | 単体で同点順位が同じことを確認。10問完走E2Eで4画面の最終結果一覧の本文を比較 | 達成 |
| 10. 再読み込み・回線断から得点を保って復帰 | 4人E2Eで再読み込み前後の名前と得点を照合。別E2Eで5秒間オフラインにした参加者が自動再接続し、他画面の切断表示が消えることを確認 | 達成 |
| 11. 得点・残り時間・回答者の全画面同期 | 同時押し後に全4画面で同じ回答者表示、誤答後に全4画面で−5点、残り時間表示差1秒以内を比較 | 達成 |
| テスト一式 | README の `npm test`。TypeScript 型検査、単体7件、Playwright 2件（4人10問完走・実時間/オフライン復帰） | 達成 |
| UIとスクリーンショット | PC 1280×900・スマホ390×844でロビー、出題中、回答中、結果を撮影。出題時の問題文・4択・早押しボタンの矩形がスマホの表示領域内にあることをE2Eで測定 | 達成 |

## 実行コマンド

```sh
npm test
```

実行日時は2026-10-19です。画面証拠は `.artifacts/quickbell/` に保存しました。`.gitignore` の `.artifacts/` 規則で除外されることも `git check-ignore` で確認しています。

| 画面 | PC 1280×900 | スマートフォン 390×844 |
|---|---|---|
| ロビー | `.artifacts/quickbell/pc-lobby.png` | `.artifacts/quickbell/mobile-lobby.png` |
| 出題中 | `.artifacts/quickbell/pc-question.png` | `.artifacts/quickbell/mobile-question.png` |
| 回答中 | `.artifacts/quickbell/pc-answering.png` | `.artifacts/quickbell/mobile-answering.png` |
| 結果 | `.artifacts/quickbell/pc-result.png` | `.artifacts/quickbell/mobile-result.png` |
