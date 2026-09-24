/goal 写真・イラストから指定された物体の座標を特定して切り抜き、人間に分かりやすい切り抜き資料を作ってください。

## 入力画像（読み取り専用。変更しない）
- `benchmark_sources/opus55-vs-astra/shared-images/snap-photo.png`（写真風）
- `benchmark_sources/opus55-vs-astra/shared-images/snap-illust.png`（イラスト風）
作業時はこの2枚を `benchmark_sources/opus55-vs-astra/opus55/crop/input/` にコピーして使ってください。

## 切り抜く対象（各画像ごとに9個）
1. 女性の顔 2. 肩に掛けたトートバッグ 3. 手に持ったスマートフォン 4. テイクアウトのコーヒーカップ 5. スニーカー（左右両足を含む1枠） 6. 背景の日本語の看板 7. 自動販売機 8. 自転車 9. 横断歩道 または 信号機（写っている方。両方あれば両方）

## 求める成果物
- `benchmark_sources/opus55-vs-astra/opus55/crop/boxes.json` — 画像ごと・対象ごとのバウンディングボックス（元画像のピクセル座標 x, y, width, height）
- `benchmark_sources/opus55-vs-astra/opus55/crop/crops/` — 各対象を切り抜いたPNG
- `benchmark_sources/opus55-vs-astra/opus55/crop/index.html` — 人間向けの切り抜き資料。元画像に枠とラベルを重ねた図、切り抜き一覧、座標を、初めて見る人が一目で分かるようにまとめる（見やすさ・分かりやすさも評価対象）

## ルール
- 座標はあなた自身が画像を見て決めること。物体検出・セグメンテーション等の学習済みモデルやAPI（YOLO、SAM、OpenCVのカスケード分類器、外部Vision API等）の使用は禁止。切り抜き処理・枠描画にPillow等の画像処理ライブラリを使うのは可。
- 切り抜き結果を自分で見て、はみ出し・欠けがあれば座標を修正してよい。

## 評価観点
座標の正確さ（対象がきっちり収まり、余白が過大でない）、写真とイラスト両方での安定性、切り抜き資料の分かりやすさ。

## 共通ルール（モデル比較ベンチマーク）
- これは同一課題を別モデルにも独立に解かせる比較ベンチマークです。あなた自身が最後までやり切ってください（他のAI・子agentへの再委任、モデル切替は禁止）。
- 書き込みは作業ディレクトリ `benchmark_sources/opus55-vs-astra/opus55/crop` 配下だけ。`benchmark_sources/opus55-vs-astra/` 配下の他ディレクトリ（他モデルの成果物）を読むことも禁止。
- 完成したら成果物を自分で開いて（ブラウザ・スクリーンショット等で）確認してから提出すること。
- 完了したら必ず次のコマンドで報告してください（これを送るまで未完了扱い）:
  herdr msg send <親ペイン> '[opus55-crop] 完了: 成果物=<絶対パス> 要点=<日本語で2〜3行>' --room opus55-vs-astra
- 権限・安全上どうしても進めない時だけ同じ宛先へ '[opus55-crop] ブロッカー: ...' を送ってください。
