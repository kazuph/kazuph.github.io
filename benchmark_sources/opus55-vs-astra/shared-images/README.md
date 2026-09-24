# 物体切り抜きベンチマーク用素材

## 生成方法

組み込み `image_gen.imagegen` で写真を生成し、その写真を参照画像としてイラストを生成。画像をコードで描画・拡大・合成していません。他のAIエージェントへの委任やモデル切替は行っていません。

## 写真のプロンプト（実際に送信した全文）

```text
Use case: photorealistic-natural.
Generate one photorealistic street snapshot for an object-cutout benchmark, ideally 1536x2048 portrait, long edge at least 1500 pixels. A fictional Japanese female university student around age 20, ordinary casual clothing (light cardigan, plain shirt, blue jeans, white low-top sneakers), standing on a Japanese urban sidewalk in daylight. Full body from top of head to soles, ample margin. Natural smartphone or mirrorless camera photograph, realistic anatomy, textures, daylight, deep enough focus for background objects and Japanese sign to be legible.
Composition: woman centered, occupying about 75% of image height. Face unobstructed, looking toward camera. Canvas tote bag hanging from her shoulder and clearly visible to viewer's left of torso. One hand on viewer's left holds a clearly recognizable smartphone away from torso; the opposite hand on viewer's right holds a takeaway coffee cup with a clearly visible fitted lid, away from torso. Keep fingers natural; do not merge phone, bag, cup. Both sneakers entirely visible with space below.
Background layout: upper left a bookstore storefront sign reading exactly「さくら書店」in large sharp Japanese lettering; below the sign, left background, a fully visible red beverage vending machine with rows of drinks and payment panel. Right background a complete parked city bicycle beside the sidewalk with both wheels, frame and handlebars visible, unobscured by the woman. Behind her to the right a clearly visible zebra crossing; a pedestrian traffic signal may also appear.
All nine targets must be recognizable and sizable: face, shoulder tote, smartphone, lidded coffee cup, sneakers, readable Japanese sign, vending machine, parked bicycle, zebra crossing or traffic signal. Avoid cropped targets, background blur, extra people, watermarks, collages, captions or annotations. This is a natural everyday photograph, not an illustration.
Save the generated bitmap if possible directly to benchmark_sources/opus55-vs-astra/shared-images/snap-photo.png.
```

## イラストのプロンプト（実際に送信した全文）

参照画像：`snap-photo.png`

```text
Use case: style-transfer.
Input image: the provided photograph is the exact composition and subject reference.
Create one anime / hand-drawn Japanese editorial illustration rendering of this EXACT photograph for a paired object-cutout benchmark. Preserve the same full-body fictional Japanese university woman aged about 20, pose, camera view, framing, object positions and relative sizes, facial expression, light cardigan, shirt, blue jeans, white sneakers, canvas shoulder tote on viewer's left, smartphone held in viewer-left hand, lidded coffee cup in viewer-right hand. Preserve the bookstore at upper left with clearly readable exact Japanese sign「さくら書店」, red drink vending machine on the left, parked bicycle on the right, zebra crossing and pedestrian traffic signal in background. Keep face unobstructed and both shoes entirely in frame. Keep all nine benchmark targets clearly recognizable and individually separable. Do not change the composition or replace, remove or add principal objects.
Change only the visual rendering to a polished anime illustration: expressive but adult face, clean ink outlines, hand-painted color shapes, subtle cel shading, drawn architectural detail and believable daytime lighting. It must visibly be an illustration rather than a filtered photograph. Background sign lettering must remain legible. No watermark, annotations, inset panels, or collage.
Maintain portrait 3:4 aspect ratio; requested output 1536x2048 pixels or another native resolution with long edge at least 1500 pixels if available. Save if possible directly to benchmark_sources/opus55-vs-astra/shared-images/snap-illust.png.
```

## 確認結果

生成日：2026-09-23。両画像を `open -a Preview <絶対パス>` で開き、生成画像の表示内容と保存ファイルを確認しました。写真を参照したイラスト生成のため、主要9要素の配置・人物のポーズ・服装・画角を共有しています。画素単位で一致するペアや正解マスクではありません。

| 確認対象 | snap-photo.png | snap-illust.png | 確認領域 (x0,y0,x1,y1：画像幅・高さに対する比率) | 領域の画素寸法 |
|---|---|---|---|---|
| 女性の顔 | 確認済み：中央上、目鼻口が見える | 確認済み：中央上、成人女性のアニメ表現 | 0.44,0.13,0.59,0.25 | 163×174 |
| 肩掛けトートバッグ | 確認済み：画面左、肩紐と袋本体 | 確認済み：同位置、肩紐と袋本体 | 0.26,0.37,0.46,0.59 | 217×319 |
| スマートフォン | 確認済み：画面左側の手、背面とカメラ | 確認済み：同じ手、背面とカメラ | 0.25,0.27,0.35,0.34 | 109×101 |
| フタ付きコーヒーカップ | 確認済み：画面右側の手、茶色のカップと黒いフタ | 確認済み：同位置、カップと黒いフタ | 0.59,0.28,0.67,0.36 | 87×116 |
| スニーカー | 確認済み：左右とも全体が画面内 | 確認済み：左右とも全体が画面内 | 0.40,0.85,0.58,0.94 | 195×130 |
| 日本語の看板 | 確認済み：左上の「さくら書店」が読める | 確認済み：同じ「さくら書店」が読める | 0.13,0.03,0.41,0.13 | 304×145 |
| 自動販売機 | 確認済み：左側の赤い機体、商品棚と決済部 | 確認済み：同位置、商品棚と決済部 | 0.00,0.14,0.18,0.51 | 195×536 |
| 停めてある自転車 | 確認済み：右側、車輪・フレーム・ハンドル・かご・スタンドが識別できる | 確認済み：同位置に同じ自転車 | 0.68,0.33,1.00,0.75 | 348×608 |
| 横断歩道または信号機 | 確認済み：右背景の横断歩道、上部の歩行者信号も見える | 確認済み：同じ横断歩道と歩行者信号 | 0.63,0.28,1.00,0.46 | 402×261 |

9/9要素を両画像で確認。人物は頭から両足まで写っています。自転車の右端は画面外に切れていますが、対象物として明確に識別できます。全物体の完全な輪郭を要求する切り抜き評価では、このフレーム端の切れを考慮してください。

### 数値による補助確認と限界

両ファイルのPNGヘッダーをPython標準ライブラリで読み取り、**1086×1448px**、縦横比3:4であることを確認しました。長辺1500px以上をプロンプトで希望しましたが、実出力は1448pxであり、この希望値には未達です。人工的な拡大はしていません。

上表の領域は目視で指定した概略位置であり、切り抜きの正解境界ではありません。Pythonで9領域それぞれについて `0 <= x0 < x1 <= 1` と `0 <= y0 < y1 <= 1` を検証し、`round((x1-x0)*width)` と `round((y1-y0)*height)` で画素寸法を計算しました。数値検査は領域の範囲・サイズを検証するもので、物体の意味や文字認識を自動証明するものではありません。意味と看板の可読性は表示画像で確認しています。

### 再生成・後処理

各スタイル1回の生成で9要素を確認したため、再生成なし。画像の描画・リサイズ・合成・文字の後付けなし。ツールが自動保存した生成PNGをそのまま指定名へコピーしました。
