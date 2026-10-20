const app=document.querySelector('#app'),error=document.querySelector('#error'),connection=document.querySelector('#connection');
let state=null, you=null, socket=null, connected=false, offset=0, retry, abandoned=false;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function home(){
 app.innerHTML=`<div class="welcome"><section class="intro"><p class="eyebrow">REAL TIME QUIZ GAME</p><h1>ひらめきを、<br>いちばんに。</h1><p class="lead">同じ問題。ひとつの回答権。<br>友だちと競う、10問の早押しクイズ。</p><div class="facts"><div><b>10</b>問</div><div><b>4</b>人まで</div><div><b>20</b>秒</div></div></section><section class="entry"><p class="eyebrow">LET'S PLAY</p><h2>みんなで、はじめよう。</h2><form id="entry"><label>プレイヤー名<input name="name" required autocomplete="nickname" placeholder="あなたの名前"></label><button class="primary" name="create" type="submit">部屋を作る <span>→</span></button><div class="divider">部屋に招待された方</div><label>部屋コード<input name="code" autocomplete="off" placeholder="8桁の部屋コード" spellcheck="false"></label><button class="secondary" name="join" type="submit">参加する <span>→</span></button></form><p class="small">開始には2人以上必要です。参加後、コードを友だちに共有してください。</p></section></div><section class="rules"><h2>遊び方</h2><p><b>早押し</b>で回答権を獲得 → <b>10秒以内</b>に4択から回答。正解 <b>+10点</b> ／ 不正解 <b>−5点</b>。不正解・回答時間切れの人は、その問題では再び押せません。20秒で正解を公開します。</p></section>`;
 document.querySelector('#entry').onsubmit=async e=>{
  e.preventDefault();error.textContent='';const form=e.currentTarget;const data=new FormData(form);const joining=e.submitter.name==='join';
  const code=String(data.get('code')).trim().toUpperCase();
  if(joining&&!/^[A-F0-9]{8}$/.test(code)){error.textContent='8桁の部屋コードを確認してください。';return;}
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{const response=await fetch(joining?`/api/rooms/${code}/join`:'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name')})});const result=await response.json();if(!response.ok)throw new Error(result.error);location.hash=result.code;connect(result.code);}catch(e){error.textContent=e.message;buttons.forEach(b=>b.disabled=false);}
 };
}
function connect(code){
 clearTimeout(retry);connected=false;connection.textContent='接続中…';
 if(!navigator.onLine){connection.textContent='オフライン · 接続の回復を待っています';return;}
 socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rooms/${code}/socket`);
 socket.onmessage=e=>{const data=JSON.parse(e.data);if(data.type==='error'){error.textContent=data.error;return;} state=data.state;you=data.you;offset=state.serverNow-Date.now();connected=true;connection.textContent='● 接続済み';render();};
 socket.onclose=e=>{connected=false;connection.textContent='再接続中…';if(state)render();if(abandoned)return;if(e.code===1000){connection.textContent='別のタブで接続中';error.textContent='同じ部屋を別のタブで開いています。戻るときは再読み込みしてください。';return;}retry=setTimeout(()=>connect(code),1000);};
 socket.onerror=()=>{error.textContent='接続できません。再接続を試しています。部屋がない場合はホームへ戻って参加してください。';};
}
function send(type,choice){if(!connected)return;error.textContent='';socket.send(JSON.stringify({type,question:state.index,...(choice===undefined?{}:{choice})}));}
function players(){return `<aside class="scoreboard"><div class="section-label"><h2>参加者</h2><span>${state.players.length} / 4</span></div><div data-testid="scores">${state.players.map((p,i)=>`<div class="player ${p.id===state.holder?'active':''}"><span class="avatar color-${i}">${escape([...p.name][0])}</span><div class="player-name"><b>${escape(p.name)}</b><small>${p.id===you?'あなた · ':''}${i===0?'ホスト · ':''}${p.id===state.holder?'回答中':state.locked.includes(p.id)?'回答終了':p.online?'接続済み':'再接続待ち'}</small></div><strong>${p.score}<small>点</small></strong></div>`).join('')}</div><div class="sidebar-rules"><p class="eyebrow">HOW TO PLAY</p><p>正解 <b>+10</b> ／ 不正解 <b>−5</b></p><p>早押しで回答権を獲得。<br>回答は10秒、問題は20秒。</p><p class="small">再読み込みしても同じ部屋・同じ点数で復帰できます。</p></div></aside>`;}
function render(){
 if(!state)return;
 if(state.phase==='lobby'){
 app.innerHTML=`<div class="room-grid"><section class="lobby"><p class="eyebrow">YOUR QUIZ ROOM</p><h1>準備は、いい？</h1><p class="lead">コードを友だちに伝えて、<br>みんながそろったらスタート。</p><p class="small">部屋コード</p><strong class="room-code" data-testid="room-code">${escape(state.code)}</strong><p class="small">コードを選択して共有してください。</p>${state.players[0].id===you?`<button id="start" class="primary" ${state.players.length<2||!connected?'disabled':''}>クイズをはじめる <span>→</span></button>`:'<p class="waiting">ホストの開始を待っています。</p>'}<p class="small">2〜4人で開始できます。全10問。</p></section>${players()}</div>`;
 document.querySelector('#start')?.addEventListener('click',()=>send('start'));
 }else if(state.phase==='results'){
 const ranked=[...state.players].sort((a,b)=>b.score-a.score),winners=ranked.filter(p=>p.rank===1);
 app.innerHTML=`<section class="results"><p class="eyebrow">ALL 10 QUESTIONS COMPLETE</p><h1>最終結果</h1><div class="winner"><span>WINNER${winners.length>1?'S':''}</span><h2>${winners.map(p=>escape(p.name)).join(' / ')}</h2><strong>${ranked[0].score}<small>点</small></strong></div><div class="ranking" data-testid="ranking">${ranked.map(p=>`<div class="rank-row ${p.rank===1?'first':''}"><b>${p.rank}<small>位</small></b><span>${escape(p.name)}${p.id===you?' <small>あなた</small>':''}</span><strong>${p.score}<small>点</small></strong></div>`).join('')}</div><a class="primary home" href="/">ホームへ <span>→</span></a><p class="small">おつかれさまでした。また一緒に遊ぼう。</p></section>`;
 }else{
 const mine=state.holder===you,canBuzz=state.phase==='question'&&!state.locked.includes(you)&&connected;
 const status=state.phase==='answering'?(mine?'あなたの回答です':`${escape(state.players.find(p=>p.id===state.holder)?.name)}さんが回答中`):state.phase==='reveal'?'正解を公開':'早押し受付中';
 app.innerHTML=`<div class="room-grid"><section class="quiz" data-phase="${state.phase}"><div class="question-meta"><div>問題 <b>${String(state.index+1).padStart(2,'0')}</b> / ${state.total}</div><span class="category">${escape(state.question.category)}</span></div><div class="status ${state.phase==='answering'?'answering':''}" data-testid="status"><span>${status}</span><div class="timer"><b id="seconds">—</b><small>秒</small></div></div><h1 class="question-text">${escape(state.question.text)}</h1><div class="choices">${state.question.choices.map((text,i)=>`<button class="choice ${state.question.answer===i?'correct':''}" data-choice="${i}" ${!(mine&&state.phase==='answering'&&connected)?'disabled':''}><span>${'ABCD'[i]}</span>${escape(text)}${state.question.answer===i?'<small>正解</small>':''}</button>`).join('')}</div>${state.phase==='reveal'?`<div class="reveal" role="status"><b>${escape(state.notice)}</b><p>正解：${escape(state.question.choices[state.question.answer])}</p><small>まもなく${state.index===9?'最終結果へ':'次の問題へ'}進みます。</small></div>`:`<button id="buzz" class="buzz" ${!canBuzz?'disabled':''}>${state.locked.includes(you)?'この問題の回答は終了':state.phase==='answering'?(mine?'選択肢を選んでください':'回答を待っています'):'早押し！'}<small>${canBuzz?'クリック・タップ、またはスペースキー':''}</small></button><p class="notice" role="status">${escape(state.notice)}</p>`}<div class="progress" aria-label="問題の進行">${Array.from({length:10},(_,i)=>`<span class="${i<=state.index?'filled':''}">${i+1}</span>`).join('')}</div></section>${players()}</div>`;
 document.querySelector('#buzz')?.addEventListener('click',()=>send('buzz'));
 for(const b of app.querySelectorAll('[data-choice]'))b.addEventListener('click',()=>send('answer',Number(b.dataset.choice)));
 }
 tick();
}
function tick(){if(!state)return;const el=document.querySelector('#seconds');if(!el)return;const end=state.phase==='answering'?state.answerEnd:state.phase==='reveal'?state.revealEnd:state.questionEnd;el.textContent=Math.max(0,Math.ceil((end-Date.now()-offset)/1000));}
setInterval(tick,100);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)){const button=document.querySelector('#buzz');if(button&&!button.disabled){e.preventDefault();button.click();}}});
window.addEventListener('pagehide',()=>{abandoned=true;clearTimeout(retry);socket?.close();});
window.addEventListener('offline',()=>{connected=false;connection.textContent='オフライン · 接続の回復を待っています';socket?.close(4000,'offline');if(state)render();});
window.addEventListener('online',()=>{const code=location.hash.slice(1);if(code&&!connected)connect(code);});
home();const code=location.hash.slice(1).toUpperCase();if(/^[A-F0-9]{8}$/.test(code))connect(code);
