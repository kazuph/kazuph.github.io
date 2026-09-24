/goal ISUCON14（ISURIDE）のWebアプリを、制限時間30分・ベンチマーク実行10回までの条件で、できるだけ高いスコアになるよう改善してください。

## 環境（セットアップ済み）
- 作業ディレクトリ: `benchmark_sources/opus55-vs-astra/astra/isucon`（git管理済み。初期状態はコミット `initial ISUCON14 webapp`）
- 競技サーバー: Apple container 上の Ubuntu 24.04 コンテナ1台（2 vCPU / 4GB）。MySQL 8・nginx・Go実装アプリ・マッチャー（0.5秒ごとに `/api/internal/matching` を叩くループ）が同居。
- `benchmark_sources/opus55-vs-astra/astra/isucon/webapp/` はコンテナの `/home/isucon/webapp/` にそのままマウントされています（go/ sql/ public/）。Go実装を使ってください。
- マニュアル: `benchmark_sources/opus55-vs-astra/astra/isucon/docs/manual.md`（競技マニュアル）と `benchmark_sources/opus55-vs-astra/astra/isucon/docs/ISURIDE.md`（アプリ仕様）。
- 操作は `benchmark_sources/opus55-vs-astra/astra/isucon/isu` で行います:
  - `./isu up` … サーバーコンテナを新規起動（DBは初期化される。最初に1回実行）
  - `./isu restart app|mysql|nginx|matcher|all` … app はgo build＋再起動
  - `./isu sh '<cmd>'` … コンテナ内でコマンド実行（root。MySQLやnginxの設定変更、ログ確認などに使用）
  - `./isu bench` … 公式ベンチマーカーで60秒の負荷走行。結果は `benchmark_sources/opus55-vs-astra/astra/isucon/bench-results/`
  - `./isu status` … 状態とベンチ使用回数

## ルール
- 制限時間: この指示を受け取った時点から30分。30分経過したら作業を止めてください（こちらからも停止を伝えます）。
- ベンチマーク実行は最大10回（`./isu bench` が回数を数えて11回目以降は拒否します）。
- **競技中、ISUCONに関する情報（ISUCON14の解説・講評・他チームの実装・ブログ・過去問の解法など）をWeb検索・閲覧することは禁止です。セッションログを後で調査し、検索していた場合は失格とします。** 手元のマニュアルとコードだけで取り組んでください。
- ベンチマーカー（`isucon14/bench/` 配下）の閲覧・改変、`isu` スクリプトの改変は禁止。
- 最終スコアは、30分終了後にこちらが `./isu up`（コンテナ再作成・DB初期化）した状態で公式ベンチを1回走らせて決めます。再作成後もそのまま動く状態にしておくこと。コンテナ内だけで行った変更は再作成で消えます。残したい設定は次の場所に置けば、起動時と `./isu restart` 時に自動でコピーされます: `webapp/config/mysql/*.cnf`（→ /etc/mysql/mysql.conf.d/）、`webapp/config/nginx/nginx.conf`（→ /etc/nginx/nginx.conf）、`webapp/config/nginx/isuride.conf`（→ サイト設定）、`webapp/config/env.sh`（→ /home/isucon/env.sh。アプリとマッチャーの環境変数）。
- 改善のたびに `benchmark_sources/opus55-vs-astra/astra/isucon` で git commit してください（どの変更でスコアがどう変わったか後で追えるように）。

## 共通ルール（モデル比較ベンチマーク）
- これは同一課題を別モデルにも独立に解かせる比較ベンチマークです。あなた自身が最後までやり切ってください（他のAI・子agentへの再委任、モデル切替は禁止）。
- 書き込みは作業ディレクトリ `benchmark_sources/opus55-vs-astra/astra/isucon` 配下だけ。`benchmark_sources/opus55-vs-astra/` 配下の他ディレクトリ（他モデルの成果物）を読むことも禁止。
- 完成したら成果物を自分で開いて（ブラウザ・スクリーンショット等で）確認してから提出すること。
- 完了したら必ず次のコマンドで報告してください（これを送るまで未完了扱い）:
  herdr msg send <親ペイン> '[astra-isucon] 完了: 成果物=<絶対パス> 要点=<日本語で2〜3行>' --room opus55-vs-astra
- 権限・安全上どうしても進めない時だけ同じ宛先へ '[astra-isucon] ブロッカー: ...' を送ってください。
