import json
data=json.load(open('boxes.json'))
COL = ["#e6194b","#f58231","#ffe119","#3cb44b","#42d4f4","#4363d8","#911eb4","#f032e6","#bfef45","#00a86b"]
html = r'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>切り抜き資料 — 街角スナップ 写真／イラスト</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#1d1d1f;--sub:#6b6b70;--line:#e3e1dc;--accent:#2f5bd3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "Hiragino Sans","Noto Sans JP",system-ui,sans-serif}
.wrap{max-width:1280px;margin:0 auto;padding:24px 20px 60px}
h1{font-size:26px;margin:0 0 6px}
h2{font-size:20px;margin:40px 0 12px;padding-left:10px;border-left:5px solid var(--accent)}
.lead{color:var(--sub);margin:0 0 16px}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0}
.summary div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.summary b{display:block;font-size:22px}
.summary span{color:var(--sub);font-size:13px}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
.legend span{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:3px 10px 3px 4px;font-size:13px}
.num{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:6px;font-weight:700;font-size:13px;padding:0 5px}
.tabs{display:flex;gap:8px;margin:18px 0 12px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:5}
.tabs button{font:inherit;border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 14px;cursor:pointer}
.tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.tabs label{margin-left:auto;display:flex;align-items:center;gap:6px;color:var(--sub);font-size:13px}
.view{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:20px;align-items:start}
@media(max-width:900px){.view{grid-template-columns:1fr}}
.stage{max-width:640px;width:100%;justify-self:center;position:relative;border-radius:10px;overflow:hidden;background:#000;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.stage img{display:block;width:100%;height:auto}
.box{position:absolute;border:3px solid;border-radius:2px;transition:.15s;pointer-events:auto;cursor:pointer}
.box .tag{position:absolute;left:-3px;top:-3px;font:700 12px/1 system-ui;padding:4px 6px;border-radius:0 0 4px 0;white-space:nowrap}
.box.right .tag{left:auto;right:-3px;border-radius:0 0 0 4px}
.stage.dim .box{opacity:.25}
.stage .box.hl{opacity:1;box-shadow:0 0 0 9999px rgba(0,0,0,.45);z-index:3}
.stage.hide .box{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;cursor:pointer;transition:.15s;display:flex;flex-direction:column}
.card:hover,.card.hl{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.thumb{height:150px;display:grid;place-items:center;background:repeating-conic-gradient(#eee 0 25%,#fafafa 0 50%) 0 0/16px 16px;padding:6px}
.thumb{overflow:hidden}.thumb img{width:auto;height:auto;max-width:100%;max-height:138px;object-fit:contain;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.meta{padding:8px 10px 10px;border-top:1px solid var(--line)}
.meta .t{display:flex;align-items:center;gap:6px;font-weight:600;font-size:14px;line-height:1.3}
.meta code{display:block;margin-top:6px;font:12px/1.5 ui-monospace,Menlo,monospace;color:var(--sub)}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:14px}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:10px}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{background:#faf9f6;font-size:13px;color:var(--sub);font-weight:600}
td.c{font:13px ui-monospace,Menlo,monospace;white-space:nowrap}
td img{height:64px;max-width:120px;object-fit:contain;display:block}
.notes{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 18px}
.notes li{margin:4px 0}
.coord-help{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 16px}
.coord-help svg{flex:none}
</style></head><body><div class="wrap">
<h1>切り抜き資料：街角スナップ（写真風／イラスト風）</h1>
<p class="lead">同じ構図の2枚の画像から、指定された9種類の物体の位置（バウンディングボックス）を目視で特定し、切り抜いた結果です。枠の座標はすべて<strong>元画像（1086×1448 px）のピクセル座標</strong>です。</p>
<div class="summary">
<div><b>2 枚</b><span>写真風 / イラスト風（同じ構図）</span></div>
<div><b>9 種類 → 10 枠</b><span>9番は「横断歩道」と「信号機」が両方写っているため両方を切り抜き</span></div>
<div><b>20 個</b><span>切り抜きPNG（crops/ フォルダ）</span></div>
<div><b>目視で決定</b><span>検出モデル・外部APIは不使用。拡大グリッドで境界を確認</span></div>
</div>
<div class="coord-help">
<svg width="170" height="110" viewBox="0 0 170 110" aria-label="座標の見方">
<rect x="1" y="1" width="168" height="108" fill="#fafaf8" stroke="#bbb"/>
<text x="4" y="12" font-size="10" fill="#888">(0,0)</text>
<rect x="55" y="35" width="80" height="50" fill="rgba(47,91,211,.12)" stroke="#2f5bd3" stroke-width="2"/>
<circle cx="55" cy="35" r="3" fill="#2f5bd3"/><text x="30" y="30" font-size="11" fill="#2f5bd3">(x, y)</text>
<line x1="55" y1="93" x2="135" y2="93" stroke="#555"/><text x="80" y="105" font-size="11">width</text>
<line x1="145" y1="35" x2="145" y2="85" stroke="#555"/><text x="148" y="64" font-size="11">h</text>
</svg>
<div><b>座標の見方</b><br>左上が原点 (0,0)。<code>x</code>は右方向、<code>y</code>は下方向。<code>(x, y)</code> が枠の左上角、<code>width × height</code> が枠の大きさです。<br>切り抜きは <code>image.crop((x, y, x+width, y+height))</code> と同じ範囲です。</div>
</div>
<div class="legend" id="legend"></div>

<h2>1. 元画像に枠を重ねた図と切り抜き一覧</h2>
<p class="lead">枠または右側のカードにマウスを乗せると、対応する物体が強調されます。カードをクリックすると画像側の枠へスクロールします。</p>
<div class="tabs"><button data-k="photo" class="on">写真風 (snap-photo.png)</button><button data-k="illust">イラスト風 (snap-illust.png)</button>
<label><input type="checkbox" id="showbox" checked> 枠を表示</label></div>
<div class="view"><div class="stage" id="stage"><img id="mainimg" alt=""></div><div class="grid" id="cards"></div></div>

<h2>2. 写真風とイラスト風の比較（座標一覧）</h2>
<p class="lead">同じ物体の切り抜きを横に並べています。座標は <code>x, y, width × height</code>（px）。</p>
<div class="tw"><table id="cmp"><thead><tr><th>#</th><th>対象</th><th>写真風 切り抜き</th><th>写真風 座標</th><th>イラスト風 切り抜き</th><th>イラスト風 座標</th></tr></thead><tbody></tbody></table></div>

<h2>3. 判断メモ</h2>
<div class="notes"><ul>
<li><b>6. 日本語の看板</b>：画面内には「さくら書店」の店名看板のほか、「読書で広がる新しい世界」の立て看板、「やさしい街 やさしい未来」の縦バナー、「歩行者自転車専用」「桜通り」の標識もあります。「背景の看板」として最も主要な<b>さくら書店の店名看板</b>を対象にしました。看板は斜めに写っているため、四角い枠では左下に店内が少し入ります。</li>
<li><b>9. 横断歩道／信号機</b>：両方写っているため両方切り抜きました（9 = 横断歩道、10 = 歩行者用信号機）。横断歩道は手前の大きいもの（女性の右奥〜自転車の後ろ）を対象とし、遠くの別の横断歩道は含めていません。</li>
<li><b>2. トートバッグ</b>：肩ひも（肩の位置から）とバッグ本体を含めています。<b>3. スマートフォン</b>・<b>4. コーヒーカップ</b>は本体のみで、持っている手の大部分は含めていません。</li>
<li><b>5. スニーカー</b>：左右両足を1枠にし、ジーンズの裾に隠れていない見えている部分の上端から靴底までです。</li>
<li><b>8. 自転車</b>：後輪は画像の右端で切れているため、枠の右端は画像の端（x=1086）です。</li>
<li>データ本体：<a href="boxes.json">boxes.json</a>／切り抜きPNG：<code>crops/</code>（例 <code>crops/photo_01_face.png</code>）</li>
</ul></div>
</div>
<script>
const DATA = __DATA__;
const COL = __COL__;
const SHORT={face:'顔',tote:'トート',phone:'スマホ',coffee:'コーヒー',sneakers:'スニーカー',sign:'看板',vending:'自販機',bicycle:'自転車',crosswalk:'横断歩道',signal:'信号機'};
const TXT = i => [2,4,8].includes(i) ? '#111' : '#fff';
let cur='photo';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function badge(i){return `<span class="num" style="background:${COL[i]};color:${TXT(i)}">${i+1}</span>`}
$('#legend').innerHTML = DATA.images.photo.objects.map((o,i)=>`<span>${badge(i)}${esc(o.label_ja)}</span>`).join('');
function render(){
  const im=DATA.images[cur], W=im.width, H=im.height;
  $('#mainimg').src=im.file; $('#mainimg').alt=cur;
  const st=$('#stage'); st.querySelectorAll('.box').forEach(e=>e.remove());
  im.objects.forEach((o,i)=>{
    const b=document.createElement('div'); b.className='box'+(o.id==='crosswalk'?' right':''); b.dataset.i=i;
    Object.assign(b.style,{left:o.x/W*100+'%',top:o.y/H*100+'%',width:o.width/W*100+'%',height:o.height/H*100+'%',borderColor:COL[i]});
    b.innerHTML=`<span class="tag" style="background:${COL[i]};color:${TXT(i)}">${i+1} ${SHORT[o.id]}</span>`;
    b.title=`${o.label_ja}  x=${o.x}, y=${o.y}, ${o.width}×${o.height}`;
    st.appendChild(b);
  });
  $('#cards').innerHTML=im.objects.map((o,i)=>`<div class="card" data-i="${i}"><div class="thumb"><img src="${o.crop}" alt="${esc(o.label_ja)}"></div>
   <div class="meta"><div class="t">${badge(i)}${esc(o.label_ja)}</div><code>x=${o.x}, y=${o.y}<br>${o.width} × ${o.height} px</code></div></div>`).join('');
  bind();
}
function hl(i,on){
  const st=$('#stage'); st.classList.toggle('dim',on);
  document.querySelectorAll(`.box[data-i="${i}"],.card[data-i="${i}"]`).forEach(e=>e.classList.toggle('hl',on));
}
function bind(){
  document.querySelectorAll('.box,.card').forEach(e=>{
    e.onmouseenter=()=>hl(e.dataset.i,true); e.onmouseleave=()=>hl(e.dataset.i,false);
  });
  document.querySelectorAll('.card').forEach(e=>e.onclick=()=>$('#stage').scrollIntoView({behavior:'smooth',block:'center'}));
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{cur=b.dataset.k;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));render()});
$('#showbox').onchange=e=>$('#stage').classList.toggle('hide',!e.target.checked);
const P=DATA.images.photo.objects, I=DATA.images.illust.objects;
$('#cmp tbody').innerHTML=P.map((o,i)=>`<tr><td>${badge(i)}</td><td>${esc(o.label_ja)}</td>
 <td><img src="${o.crop}" alt=""></td><td class="c">${o.x}, ${o.y}<br>${o.width} × ${o.height}</td>
 <td><img src="${I[i].crop}" alt=""></td><td class="c">${I[i].x}, ${I[i].y}<br>${I[i].width} × ${I[i].height}</td></tr>`).join('');
render();
</script></body></html>'''
html=html.replace('__DATA__',json.dumps(data,ensure_ascii=False)).replace('__COL__',json.dumps(COL))
open('index.html','w').write(html)
print('ok')
