# ローカル4人早押しクイズの検証結果

> 依頼：「4人オンライン対戦の早押しクイズ（Cloudflare・ローカル開発限定）」を TASK.md の全条件に従って完成させる。

## 現在の結果

Workers + SQLite Durable Objects + WebSocket のアプリを完成させ、遊び方11項目とPC／スマホの画面を実ブラウザで確認した。納品先のmainでREADMEの `npm ci` と `npm test` を実行し、型検査・単体10件・実ブラウザ4件がすべて成功した（再試行0・スキップ0）。指定8画面のPNGを保存し、各画面の横はみ出し・選択肢の重なりは0だった。デプロイ・Cloudflareログイン・外部API・別AIへの委任・pushは実施していない。

## 項目別の証拠

対戦E2Eの正式名は `four-player full game, concurrent buzz, reload, offline recovery and desktop evidence` と末尾が `mobile evidence` の2件。期限E2Eは `real 10-second answer timeout, all-excluded advance and real 20-second alarm without input`。API E2Eは `real API validation, host authority, identity and answer secrecy`。すべて `tests/e2e/quiz.spec.ts` に実装した。

| 遊び方・品質条件 | 確かめた方法／証拠のパス | 判定 |
|---|---|---|
| 1. 名前で部屋作成・コードで参加 | 対戦E2Eの4独立コンテキストで作成・参加。`.artifacts/desktop-lobby.png` | 達成 |
| 2. 定員4人・5人目の拒否理由 | 対戦E2Eで5人目を通常フォームから参加させ、画面の満員メッセージを照合 | 達成 |
| 3. ホストだけが2〜4人で開始 | 対戦E2Eの4人、期限E2Eの2人・1人開始無効、API E2Eの非ホスト拒否。単体 `host authority and 2–4 player start boundary` は2・3・4人を検査 | 達成 |
| 4. 日本語の内蔵4択10問 | 対戦E2Eで10問を実際に回答。単体 `ten built-in Japanese questions each have four options and valid answer` でデータを検査 | 達成 |
| 5. サーバーが最初に受けた1人だけに回答権 | 対戦E2Eで4人を同時クリック、1人の画面だけ4択が有効。単体 `all 24 receive orders grant exactly one answer right to the first valid buzzer` | 達成 |
| 6. 10秒以内の回答、正解+10・不正解−5 | 対戦E2Eの実回答と得点比較、期限E2Eの無回答10秒失格。`.artifacts/real-deadlines.json`。単体で期限ちょうどの境界も検査 | 達成 |
| 7. 不正解の人の再早押し禁止・他の人が再開 | 対戦E2Eで最初の回答者が誤答→早押し無効→別の人が早押しして正解。単体で再送の拒否・二重減点なしも検査 | 達成 |
| 8. 全員失格か20秒経過で正解表示・自動進行 | 期限E2Eで全員失格による進行と、誰も入力しない20秒のalarm進行。全員の前問正解表示と状態一致を確認。`.artifacts/real-deadlines.json` | 達成 |
| 9. 10問後の最終順位を全員に表示 | 対戦E2Eで全員の順位画面と得点合計95点（正解10回・誤答1回）を照合。`.artifacts/desktop-results.png`、`.artifacts/mobile-results.png`。単体で同点順位 | 達成 |
| 10. 再読み込み・一時通信断で同じ人として得点保持 | 対戦E2Eで10点獲得者をリロードして参加情報一致、オフライン→オンライン復帰、全員の状態一致。API E2Eで同じトークンの再接続・重複回答拒否 | 達成 |
| 11. 得点・残り時間・回答者が全員に同期 | 対戦E2Eの各区切りと期限E2Eで、4人／2人の受信した状態全体（得点・回答者・絶対期限・版番号・サーバー時刻）が一致。表示秒数は共通の絶対期限から計算し、全員の画面に出た得点・回答者メッセージ・出題／回答の残り秒数も照合 | 達成 |
| テストをREADMEのコマンドで再現 | `npm test`（型検査→Node単体→Playwright実Chrome＋wrangler dev）。`.artifacts/test-output.txt`、`.artifacts/e2e-results.json` | 達成 |
| PCとスマホで遊べるUI・指定8画面 | 1440×1000／390×844の対戦E2Eと `layout()`。各PNGと `*-layout.json` で横幅・要素のはみ出し・選択肢の重なりを数値検査 | 達成 |

## 画面証拠

| 状態 | PC | スマホ |
|---|---|---|
| ロビー | ![PCロビー](.artifacts/desktop-lobby.png) | ![スマホロビー](.artifacts/mobile-lobby.png) |
| 出題中 | ![PC出題中](.artifacts/desktop-question.png) | ![スマホ出題中](.artifacts/mobile-question.png) |
| 回答中 | ![PC回答中](.artifacts/desktop-answering.png) | ![スマホ回答中](.artifacts/mobile-answering.png) |
| 最終結果 | ![PC最終結果](.artifacts/desktop-results.png) | ![スマホ最終結果](.artifacts/mobile-results.png) |

## 解釈と検証の限界

- 未指定の正解表示時間を追加せず、直前の正解・解説を次の出題画面に残して自動進行する。結果画面には最終問題の正解を残す。別の挙動への代用ではなく、正解表示と次問進行を同時配信する設計。
- 10秒の無回答は誤答と同じ−5点・その問題の失格として扱う。回答を始めても出題から20秒の上限は延びない。
- ブラウザは実Chromeだが、スマホは390×844・タッチ設定のエミュレーション。実スマートフォンの実機や別の物理端末からのLAN接続は未検証。
- 回線断はPlaywrightの実ブラウザネットワークをオフラインにして検査。外部回線の物理切断は未検証。
- タイマー・得点の判定はサーバー。テストでサーバー時計や期限を短縮せず、10秒／20秒を実時間で検査している。
- 人間の採点・見た目の好みの承認は上司担当。数値検査やスクリーンショット取得を人間の承認とは扱わない。

## 修正履歴と納品手順

初回の対戦E2Eでは、Chromeをオフラインにしても既存のWebSocketが直ちに閉じず、画面が接続中のまま残ることを検出した。ブラウザのofflineイベントで古い接続を切り離し、onlineイベントで同じ参加情報から再接続するよう修正した。切断通知の1005／1006は送信禁止の予約コードなので、サーバーの終了応答は標準の1000にした。スマホ側の初回の完走後チェックは、見出しの改行由来の空白を照合できなかったため、空白を許容して同じ文言を検査するよう修正した。

開発は元チェックアウト配下の `.worktree/quiz-local` で行い、区切りごとにコミット。元のmainへfast-forwardして納品した。スクリーンショットとテスト証拠は `.artifacts/` のローカルファイルで、git追跡対象外。報告は `gtx send p39` と直後の `gtx pane read p39 --lines 15` で到達確認する。

## 依存パッケージ

Wrangler 4.149.0（2026-10-08公開）と整合するWorkers型定義5.20261006.1を固定した。直接依存とプラットフォーム別バイナリ以外の間接依存39件について、公開日が2026-10-11より前であることをnpm registryで照合した。`.artifacts/dependency-ages.json` に記録。`npm audit` の既知の脆弱性は0件（`.artifacts/npm-audit.json`）。この監査は将来の脆弱性が無いことを保証するものではない。

## 最終実行結果

2026-10-18、納品先 `sol` のmainで実行。コード・設定・テストの入力ハッシュは `.artifacts/tested-inputs.json`（検証時コミット `1960e21`）。以後はRESULT.mdの報告文だけを追加する。

| コマンド／検査 | 結果 | 証拠 |
|---|---|---|
| `npm ci` | 成功・既知の脆弱性0件 | `.artifacts/test-output.txt` |
| `npm run typecheck` | 成功 | 同上、`npm test` の先頭段階 |
| `npm run test:unit` | 10件成功・失敗0・スキップ0 | 同上 |
| `npm run test:e2e` | 4件成功・失敗0・スキップ0・再試行0、90.66秒 | `.artifacts/e2e-results.json` |
| 10秒の回答期限 | 期限を4ms過ぎたサーバー配信で失格・減点を確認 | `.artifacts/real-deadlines.json` |
| 20秒の出題期限 | 期限を7ms過ぎたサーバー配信で次問へ進行 | 同上 |
| 8画面のPNG・画面幅 | 全ファイル有効、PC幅1440／スマホ幅390、横はみ出し0・選択肢重なり0 | `.artifacts/screen-evidence.json`、各 `*-layout.json` |
| 開発環境 | ローカル公式workerd／SQLite、URLはlocalhost:8783、inspectorは空きポート | `wrangler.jsonc`、`.artifacts/dev-server.txt` |

必要条件について未達の項目はなし。実スマホ・物理回線の切断・人間の好みによるUI評価は未検証で、ブラウザのスマホ幅・オフライン操作と混同していない。Windows、デプロイ、外部サービスでの動作は依頼の対象外。画像生成ツールは使っていない。追加の実装判断を求める事項はなし。最終採点は上司が行う。

## 上司への報告

`gtx send p39` による完了報告はメッセージ70として1件送信され、サーバーが `nudged: p39` を返した。直後に指定どおり `gtx pane read p39 --lines 15` を1回実行した。こちらの文は未送信の入力欄に残っていなかったため、Enterは送っていない。送信応答と確認内容は `.artifacts/report-delivery.json` に記録した。これは上司による採点・既読の確認とは区別する。
