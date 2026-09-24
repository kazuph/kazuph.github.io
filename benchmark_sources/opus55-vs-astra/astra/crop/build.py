from PIL import Image, ImageOps, ImageDraw
from pathlib import Path
import json, hashlib, html
root=Path(__file__).parent
labels=['女性の顔','トートバッグ','スマートフォン','コーヒーカップ','スニーカー（両足）','日本語の看板','自動販売機','自転車','横断歩道','信号機']
ids=['face','tote','phone','coffee','sneakers','sign','vending','bicycle','crosswalk','signal']
# Coordinates chosen manually from the original images; right/bottom edges are exclusive.
coords={
'photo':[(487,201,610,337),(292,365,465,843),(279,397,376,483),(643,409,718,510),(442,1235,621,1348),(16,0,468,230),(0,209,180,739),(736,488,1086,1083),(670,445,1086,714),(725,76,780,197)],
'illust':[(483,193,612,333),(288,364,465,845),(279,395,376,485),(649,409,720,510),(442,1256,622,1360),(16,0,466,230),(0,210,178,737),(739,487,1086,1084),(669,444,1086,713),(725,77,780,199)]}
notes={
'face':'額・耳・あごを含む顔の範囲。髪全体と首は対象外。',
'tote':'バッグ本体と肩に掛かった持ち手を同じ枠に含めています。',
'phone':'手で隠れた部分を含む外接枠。見える端を基準にしています。',
'coffee':'ふたとカップ本体を含む枠。指と重なる部分があります。',
'sneakers':'左右両足を1つの枠に収めています。',
'sign':'店舗正面の「さくら書店」の看板を選択。左上は元画像端に接しています。',
'vending':'本体と脚を含む枠。左側は元画像端で切れています。',
'bicycle':'見えている車輪・ハンドル・かご・スタンドを含みます。右側は元画像の外に続きます。',
'crosswalk':'手前の横断歩道の見える範囲。人物・自転車・柱による遮蔽と、白線の間の路面を含みます。',
'signal':'歩行者信号の上下の灯器と筐体。支柱・隣の標識は対象外。'}
data={'coordinate_system':{'origin':'top-left','unit':'pixel','format':'x, y, width, height','right_bottom':'exclusive','method':'manual visual selection; no detection or segmentation models'},'images':[]}
for kind in coords:
 p=root/'input'/f'snap-{kind}.png'; im=Image.open(p)
 rec={'id':kind,'file':str(p.relative_to(root)),'width':im.width,'height':im.height,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'objects':[]}
 for i,(obj,label,box) in enumerate(zip(ids,labels,coords[kind])):
  x,y,r,b=box; name=f'crops/{kind}-{i+1:02d}-{obj}.png'; im.crop(box).save(root/name)
  rec['objects'].append({'id':obj,'item':min(i+1,9),'label':label,'x':x,'y':y,'width':r-x,'height':b-y,'crop':name,'note':notes[obj]})
 data['images'].append(rec)
(root/'boxes.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Inspection sheet only: unchanged crop pixels, resized to fit each tile.
sheet=Image.new('RGB',(1200,5*300),'#e9edf1'); d=ImageDraw.Draw(sheet)
for j,rec in enumerate(data['images']):
 for i,obj in enumerate(rec['objects']):
  col=(i%2)+j*2; row=i//2; x=col*300; y=row*300
  crop=Image.open(root/obj['crop']); crop.thumbnail((280,265))
  sheet.paste(crop,(x+(300-crop.width)//2,y+25+(265-crop.height)//2)); d.text((x+10,y+6),f'{rec["id"]} {i+1:02d} {obj["id"]}',fill='black')
sheet.save(root/'crop-review.jpg')
palette=['#ae2857','#006d77','#2954bf','#995100','#6441a5','#007850','#ab3030','#465c7a','#765d00','#8e388c']
sections=[]
for rec in data['images']:
 boxes=''.join(f'<a class="box" href="#{o["id"]}" data-id="{o["id"]}" aria-label="{o["label"]}の切り抜きへ" style="--c:{palette[i]};left:{o["x"]/rec["width"]*100}%;top:{o["y"]/rec["height"]*100}%;width:{o["width"]/rec["width"]*100}%;height:{o["height"]/rec["height"]*100}%"><span>{i+1:02d} {o["label"].replace("（両足）", "")}</span></a>' for i,o in enumerate(rec['objects']))
 sections.append(f'<section><h3>{"写真風" if rec["id"]=="photo" else "イラスト風"}<small>1086 × 1448 px</small></h3><div class="source"><img src="{rec["file"]}" alt="{rec["id"]} 元画像">{boxes}</div><a class="original" href="{rec["file"]}" target="_blank">元画像を原寸で開く ↗</a></section>')
rows=[]
for i,objid in enumerate(ids):
 cards=[]
 for rec in data['images']:
  o=rec['objects'][i]
  cards.append(f'<div class="crop"><h4>{"写真風" if rec["id"]=="photo" else "イラスト風"}</h4><a class="crop-image" href="{o["crop"]}" target="_blank"><img src="{o["crop"]}" alt="{o["label"]}・{rec["id"]}の切り抜き" loading="lazy"></a><dl><div><dt>x</dt><dd>{o["x"]}</dd></div><div><dt>y</dt><dd>{o["y"]}</dd></div><div><dt>幅</dt><dd>{o["width"]}</dd></div><div><dt>高さ</dt><dd>{o["height"]}</dd></div></dl><a href="{o["crop"]}" download>PNGを保存 ↓</a></div>')
 rows.append(f'<article id="{objid}"><div class="row-title"><h3><b style="color:{palette[i]}">{i+1:02d}</b> {labels[i]}</h3><p>{notes[objid]}</p></div><div class="pair">{"".join(cards)}</div></article>')
nav=''.join(f'<a href="#{v}">{i+1:02d} {labels[i]}</a>' for i,v in enumerate(ids))
page='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>写真とイラストの切り抜き資料</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f5f1;color:#202a31;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;line-height:1.7}main{max-width:1220px;margin:auto;padding:48px 28px}header{border-top:5px solid #223f50;padding-top:20px;margin-bottom:32px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700;color:#4f6670}h1{font-size:32px;line-height:1.4;margin:10px 0}h2{font-size:23px;margin:0 0 16px}h3{margin:0 0 14px;font-size:19px}h4{margin:0 0 10px;color:#4b5d68;font-size:14px}p{margin:8px 0;color:#53616a}a{color:#245774;text-underline-offset:4px}nav{display:flex;flex-wrap:wrap;gap:6px 20px;padding:16px 0;border-block:1px solid #cdd3d6;margin:24px 0}nav a{font-size:13px}.pair,.overview{display:grid;grid-template-columns:1fr 1fr;gap:28px}.overview h3{display:flex;justify-content:space-between;align-items:center}small{font-size:12px;color:#697780;font-weight:400}.source{position:relative;line-height:0;background:#ddd}.source>img{width:100%;display:block}.box{position:absolute;border:2px solid var(--c);color:white;transition:opacity .15s}.box span{position:absolute;left:-2px;top:-2px;background:var(--c);padding:3px 5px;font-size:11px;line-height:1.2;white-space:nowrap;font-weight:700}.box:hover,.box:focus-visible{z-index:10;outline:3px solid white}.source:has(.box:hover) .box:not(:hover){opacity:.2}.hide-boxes .box{display:none}.original{display:block;margin-top:8px;font-size:13px}.tools{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:20px}button{font:inherit;font-size:14px;background:white;border:1px solid #72828b;padding:7px 14px;border-radius:4px;cursor:pointer}article{padding:30px 0;border-top:1px solid #c6ced1;scroll-margin-top:16px}.row-title{display:flex;gap:30px;justify-content:space-between;align-items:baseline}.row-title h3{min-width:260px}.row-title p{max-width:660px;font-size:14px;margin-top:0}.row-title b{font-size:16px;margin-right:8px}.crop{min-width:0}.crop-image{display:flex;align-items:center;justify-content:center;height:300px;background:#e8ebeb;padding:18px}.crop-image img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 3px 12px #0001}dl{display:flex;margin:12px 0 6px;border-bottom:1px solid #d1d8da;padding-bottom:10px;gap:24px}dl div{display:flex;gap:6px;align-items:baseline}dt{font-size:12px;color:#63717a}dd{margin:0;font-family:ui-monospace,monospace;font-size:15px}.crop>a:last-child{font-size:12px}.detail-heading{margin-top:50px}footer{border-top:2px solid #243f50;margin-top:20px;padding-top:20px;font-size:13px}article:target{background:#fffdf5}@media(max-width:700px){main{padding:24px 16px}h1{font-size:25px}.overview,.pair{gap:18px}.overview{grid-template-columns:1fr}.row-title{display:block}.row-title h3{min-width:0}dl{gap:9px;flex-wrap:wrap}dl div{gap:4px}.crop-image{height:230px;padding:8px}.box span{font-size:10px}}@media(max-width:420px){.pair{grid-template-columns:1fr}.crop-image{height:260px}}@media print{button,nav{display:none}article{break-inside:avoid}.box span{font-size:8px}main{padding:0}}
</style></head><body><main><header><div class="eyebrow">MANUAL CROP STUDY / 02 SOURCES · 20 CROPS</div><h1>写真とイラスト、対象ごとに見比べる。</h1><p>目視で決めた範囲を、元画像・切り抜き・ピクセル座標で確認できる資料です。</p><p>各画像9項目。最後の項目は横断歩道と信号機の両方が写っているため、それぞれ分けて計10枠にしました。</p></header><h2>01 / 元画像と切り抜き範囲</h2><div class="tools"><button id="toggle" aria-pressed="true">枠とラベルを隠す</button><a href="boxes.json" download>座標データ（JSON）を保存 ↓</a><small>枠を選ぶと対象の切り抜きへ移動します。</small></div><div class="overview">OVERVIEW</div><nav aria-label="切り抜き対象">NAV</nav><h2 class="detail-heading">02 / 対象別の切り抜きと座標</h2><p>左上を原点 (0, 0) とし、x は右方向、y は下方向。幅・高さを含め、すべて元画像のピクセル単位です。画像を押すと切り抜きを原寸で開きます。</p>ROWS<footer><strong>切り抜きについて</strong><p>矩形の切り抜きなので、背景や遮蔽物も含まれます。元画像の外や遮蔽物の裏側は補完していません。学習済み検出モデル・セグメンテーション・外部Vision APIは使用せず、目視で座標を決定しました。</p><p>入力画像はコピーを使用し、元ファイルは変更していません。範囲は [x, x + 幅) × [y, y + 高さ) です。</p></footer></main><script>document.querySelector('#toggle').addEventListener('click',function(){const hidden=document.body.classList.toggle('hide-boxes');this.setAttribute('aria-pressed',String(!hidden));this.textContent=hidden?'枠とラベルを表示':'枠とラベルを隠す';});</script></body></html>'''
(root/'index.html').write_text(page.replace('OVERVIEW',''.join(sections)).replace('NAV',nav).replace('ROWS',''.join(rows)))
print('Created boxes.json, 20 crop PNGs, index.html, crop-review.jpg')
