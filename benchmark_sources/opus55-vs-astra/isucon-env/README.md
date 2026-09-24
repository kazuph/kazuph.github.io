# ISUCON14 on Apple container（Opus 5.5 vs Astra ベンチの競技環境）

記事「Claude Opus 5.5 vs GPT-6-Astra 6番勝負ベンチマーク」の ISUCON 課題で使った環境です。
ISUCON14（[isucon/isucon14](https://github.com/isucon/isucon14)、MIT License）を、Mac の Apple container 上の Ubuntu 24.04 コンテナ1台（2 vCPU／4GB）で動かします。コンテナには MySQL・nginx・Go 実装・マッチャーを同居させ、ベンチマーカーは Mac 側で動かします。

| ファイル | 役割 |
|---|---|
| `server/` | 競技サーバーのコンテナイメージ（Dockerfile、nginx設定、起動・再起動スクリプト） |
| `setup.sh` | ISUCON14 の取得（使用したコミットに固定）、フロントエンドとベンチマーカーのビルド、イメージのビルド、参加者用ディレクトリの作成 |
| `isu` | 参加者が使う操作スクリプト（起動・再起動・コンテナ内コマンド・ベンチ実行。ベンチは10回まで） |
| `judge.sh` | 公式計測。コンテナを作り直して（DBも初期化）ベンチを1回走らせる。参加者の10回には数えない |

## 再現手順

```bash
container system start
cd benchmark_sources/opus55-vs-astra/isucon-env
./setup.sh /tmp/isu-run/me/isucon                 # 初期実装の参加者ディレクトリを作る
export ISUCON_ENV="$PWD"
/tmp/isu-run/me/isucon/isu up                     # サーバー起動（DB初期化）
/tmp/isu-run/me/isucon/isu bench                  # 60秒の負荷走行（初期実装はおよそ6,000点）
```

各モデルの最終実装を再現するには、作ったディレクトリで最終差分を当ててから公式計測します。

```bash
./setup.sh /tmp/isu-run/astra/isucon
git -C /tmp/isu-run/astra/isucon apply "$PWD/../astra/isucon/final.diff"
./judge.sh /tmp/isu-run/astra/isucon
```

## 注意

- ベンチマーカーも同じ Mac で動くため、スコアは Mac の負荷に大きく左右されます。ほかの重い処理を止めてから計測してください（負荷の高い状態で試したときは、初期実装 1,932点・Astra 最終版 33,006点で、本番時の 6,448点・152,416点を大きく下回りました。どちらも合格はしています）。
- `webapp/config/` に置いた設定は、起動時と `isu restart` 時にコンテナへコピーされます（`mysql/*.cnf`、`nginx/nginx.conf`、`nginx/isuride.conf`、`env.sh`）。
- ベンチマーカーは決済サーバーとしても動き、Mac 側の `12345` 番ポートで待ち受けます。コンテナからは Apple container のゲートウェイ（`192.168.64.1` など）経由で到達します。
- 競技の依頼文は `../prompts/sent-*-isucon.md`、ベンチ10回の記録と最終差分は `../opus55/isucon/` と `../astra/isucon/`、公式計測ログは `../isucon-judge/` にあります。
- `docs/` のマニュアルは ISUCON14 リポジトリからの転載です（`LICENSE-isucon14`）。
