import json
from PIL import Image, ImageDraw, ImageFont
# 座標は目視（拡大グリッド）で決定した値。検出モデルは不使用。
OBJ = [
 ("face","女性の顔","Face"),("tote","肩に掛けたトートバッグ","Tote bag"),
 ("phone","手に持ったスマートフォン","Smartphone"),("coffee","テイクアウトのコーヒーカップ","Coffee cup"),
 ("sneakers","スニーカー（左右両足）","Sneakers"),("sign","背景の日本語の看板（さくら書店）","Japanese sign"),
 ("vending","自動販売機","Vending machine"),("bicycle","自転車","Bicycle"),
 ("crosswalk","横断歩道","Crosswalk"),("signal","信号機（歩行者用）","Traffic signal"),
]
BOX = {
 "photo": {"face":(486,198,118,136),"tote":(294,362,166,480),"phone":(279,396,99,74),
   "coffee":(645,409,68,99),"sneakers":(443,1238,177,108),"sign":(18,0,446,223),
   "vending":(0,209,181,527),"bicycle":(756,486,330,596),"crosswalk":(688,445,398,260),
   "signal":(728,76,51,108)},
 "illust": {"face":(482,192,126,139),"tote":(288,361,172,483),"phone":(279,393,100,77),
   "coffee":(648,409,66,101),"sneakers":(444,1256,177,101),"sign":(18,0,446,223),
   "vending":(0,209,178,526),"bicycle":(738,486,348,596),"crosswalk":(686,447,400,245),
   "signal":(728,74,51,113)},
}
COL = ["#e6194b","#f58231","#ffe119","#3cb44b","#42d4f4","#4363d8","#911eb4","#f032e6","#bfef45","#00a86b"]
IMG = {"photo":"input/snap-photo.png","illust":"input/snap-illust.png"}
out = {"coordinate_system":"元画像のピクセル座標。原点=左上、x右向き・y下向き。width/heightはピクセル。","images":{}}
fnt = ImageFont.truetype('/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', 22)
for k, path in IMG.items():
    im = Image.open(path).convert("RGB")
    W,H = im.size
    objs = []
    ov = im.copy(); d = ImageDraw.Draw(ov)
    for i,(key,ja,en) in enumerate(OBJ):
        x,y,w,h = BOX[k][key]
        assert 0<=x and 0<=y and x+w<=W and y+h<=H, (k,key)
        fn = f"crops/{k}_{i+1:02d}_{key}.png"
        im.crop((x,y,x+w,y+h)).save(fn)
        objs.append({"no":i+1,"id":key,"label_ja":ja,"label_en":en,"x":x,"y":y,"width":w,"height":h,"crop":fn})
        d.rectangle([x,y,x+w-1,y+h-1], outline=COL[i], width=4)
        t=f"{i+1}"; tb=d.textbbox((0,0),t,font=fnt); tw,th=tb[2]-tb[0]+12,tb[3]-tb[1]+10
        ty = y
        if key=='crosswalk': x=x+w-tw
        d.rectangle([x,ty,x+tw,ty+th], fill=COL[i]); d.text((x+6,ty+3-tb[1]),t,fill="black" if i in (2,4,8) else "white",font=fnt)
    ov.save(f"crops/{k}_overlay.png")
    out["images"][k] = {"file":path,"source":f"shared/images/snap-{k}.png","width":W,"height":H,"objects":objs}
json.dump(out, open("boxes.json","w"), ensure_ascii=False, indent=2)
print("ok")
