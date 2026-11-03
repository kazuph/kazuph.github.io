# ピンポン！クイズ

Cloudflare Workers と Durable Objects のローカル実行で遊ぶ、2〜4人用早押しクイズです。Cloudflare アカウントやデプロイは不要です。

## 起動

Node.js と npm が必要です。

```sh
npm ci
npm run dev
```

`http://localhost:8788` を開き、名前を入れて部屋を作ります。別のブラウザまたはプライベートウィンドウで同じ URL を開き、部屋コードを入れて参加します。ホストは2人以上で開始できます。早押し後は選択肢を押します。同じブラウザで再読み込みしても復帰します。

## テスト

Google Chrome がインストール済みの環境で実行します。サーバーが動いていなければ Playwright が起動します。

```sh
npm ci
npm test
```

実ブラウザを4つ以上使い、参加・満員・同時押し・採点・再読み込み・10問・順位を確認します。別のテストで20秒の制限を実時間で確認します。画像は `.artifacts/screenshots/` に保存します。テストはローカルの Wrangler に接続し、Cloudflare へデプロイしません。
