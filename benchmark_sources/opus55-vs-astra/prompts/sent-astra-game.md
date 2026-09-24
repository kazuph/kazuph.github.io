/goal X（旧Twitter）で一番バズるゲームを作ってください。

- 何を作るかから、あなたが考えてください。Web検索は自由に使って構いません。
- 完成品は人間がプレイしてレビューします。
- 成果物は `benchmark_sources/opus55-vs-astra/astra/game/` に置き、ブラウザで遊べる形にしてください（エントリポイントは `benchmark_sources/opus55-vs-astra/astra/game/index.html`）。
- `benchmark_sources/opus55-vs-astra/astra/game/CONCEPT.md` に「なぜこれがXでバズると考えたか」と遊び方を書いてください。

## 共通ルール（モデル比較ベンチマーク）
- これは同一課題を別モデルにも独立に解かせる比較ベンチマークです。あなた自身が最後までやり切ってください（他のAI・子agentへの再委任、モデル切替は禁止）。
- 書き込みは作業ディレクトリ `benchmark_sources/opus55-vs-astra/astra/game` 配下だけ。`benchmark_sources/opus55-vs-astra/` 配下の他ディレクトリ（他モデルの成果物）を読むことも禁止。
- 完成したら成果物を自分で開いて（ブラウザ・スクリーンショット等で）確認してから提出すること。
- 完了したら必ず次のコマンドで報告してください（これを送るまで未完了扱い）:
  herdr msg send <親ペイン> '[astra-game] 完了: 成果物=<絶対パス> 要点=<日本語で2〜3行>' --room opus55-vs-astra
- 権限・安全上どうしても進めない時だけ同じ宛先へ '[astra-game] ブロッカー: ...' を送ってください。
