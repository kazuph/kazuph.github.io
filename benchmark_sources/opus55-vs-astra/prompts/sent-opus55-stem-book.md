/goal 子ども向けのSTEM絵本を1冊書いてください。

- 書き方・形式・対象年齢・テーマはあなたに任せます。
- 画像生成（画像生成AI・画像生成ツールの利用）は禁止です。
- 成果物は `benchmark_sources/opus55-vs-astra/opus55/stem-book/` に置き、人間が読める形にしてください（エントリポイントが分かるよう `benchmark_sources/opus55-vs-astra/opus55/stem-book/README.md` に書くこと）。

## 共通ルール（モデル比較ベンチマーク）
- これは同一課題を別モデルにも独立に解かせる比較ベンチマークです。あなた自身が最後までやり切ってください（他のAI・子agentへの再委任、モデル切替は禁止）。
- 書き込みは作業ディレクトリ `benchmark_sources/opus55-vs-astra/opus55/stem-book` 配下だけ。`benchmark_sources/opus55-vs-astra/` 配下の他ディレクトリ（他モデルの成果物）を読むことも禁止。
- 完成したら成果物を自分で開いて（ブラウザ・スクリーンショット等で）確認してから提出すること。
- 完了したら必ず次のコマンドで報告してください（これを送るまで未完了扱い）:
  herdr msg send <親ペイン> '[opus55-stem-book] 完了: 成果物=<絶対パス> 要点=<日本語で2〜3行>' --room opus55-vs-astra
- 権限・安全上どうしても進めない時だけ同じ宛先へ '[opus55-stem-book] ブロッカー: ...' を送ってください。
