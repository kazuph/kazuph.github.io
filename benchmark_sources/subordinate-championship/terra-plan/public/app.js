const app = document.querySelector('#app');
const connection = document.querySelector('#connection');
let credentials = JSON.parse(localStorage.getItem('quiz-session') || 'null');
let socket, retry, state, offset = 0;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const send = value => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify(value));
function entrance(error = '') {
  app.innerHTML = `<section class="entry"><div class="eyebrow">QUIZ PARTY · 2〜4 PLAYERS</div><h1>ひらめいたら、<br><em>早押し！</em></h1><p>友だちと同じ部屋に集まって、<br>10問のクイズで勝負しよう。</p><form id="entry-form"><label>あなたの名前<input name="name" maxlength="20" required placeholder="名前を入力" autocomplete="nickname"></label><button class="primary" name="action" value="create">部屋を作る <span>→</span></button><div class="divider">または</div><label>部屋コード<input name="code" maxlength="6" placeholder="6文字のコード" autocapitalize="characters"></label><button class="secondary" name="action" value="join">部屋に参加する <span>→</span></button><p class="error" role="alert">${esc(error)}</p></form></section>`;
  app.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget), action = event.submitter.value;
    const code = String(form.get('code')).trim().toUpperCase();
    if (action === 'join' && !/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return entrance('部屋コードを6文字で入力してください');
    try {
      const response = await fetch(action === 'create' ? '/api/rooms' : `/api/rooms/${code}/join`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name') }) });
      const data = await response.json();
      if (!response.ok) return entrance(data.error);
      credentials = data; localStorage.setItem('quiz-session', JSON.stringify(data)); connect();
    } catch { entrance('接続できませんでした。もう一度お試しください'); }
  };
}
function connect() {
  clearTimeout(retry); if (!credentials || !navigator.onLine) return;
  connection.textContent = '再接続中…';
  const current = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/rooms/${credentials.code}/ws?token=${encodeURIComponent(credentials.token)}`);
  socket = current;
  current.onopen = () => { if (socket === current) connection.textContent = ''; };
  current.onmessage = event => {
    if (socket !== current) return;
    const data = JSON.parse(event.data);
    if (data.t === 'error') { const error = document.querySelector('#notice'); if (error) error.textContent = data.message; return; }
    if (data.t === 'state') { state = data; offset = data.serverNow - Date.now(); render(); }
  };
  current.onclose = () => { if (socket !== current) return; connection.textContent = '再接続中…'; retry = setTimeout(connect, 1000); };
}
window.addEventListener('offline', () => { clearTimeout(retry); connection.textContent = '再接続中…'; socket?.close(); });
window.addEventListener('online', () => { socket?.close(); connect(); });
function players() {
  return `<div class="players">${state.players.map(p => `<div class="player ${state.answering === p.id ? 'active' : ''}" data-player="${esc(p.name)}"><span class="avatar">${esc(p.name.slice(0,1))}</span><span class="player-name">${esc(p.name)}${p.id === state.host ? '<small> HOST</small>' : ''}${!p.connected ? '<small class="offline">接続が切れています</small>' : ''}</span><strong>${p.score}<small> pt</small></strong></div>`).join('')}</div>`;
}
function render() {
  if (!state) return;
  if (state.phase === 'lobby') {
    app.innerHTML = `<section class="lobby"><div class="eyebrow">WAITING ROOM</div><h1>みんなを待っています</h1><p>部屋コードを友だちに伝えよう</p><div class="room-code"><small>ROOM CODE</small><strong>${esc(state.code)}</strong></div><div class="section-title">プレイヤー <span>${state.players.length} / 4</span></div>${players()}<p id="notice" class="error"></p>${state.you === state.host ? `<button id="start" class="primary" ${state.players.length < 2 ? 'disabled' : ''}>ゲームを始める →</button><p class="hint">2人以上集まると開始できます</p>` : '<p class="hint">ホストが開始するまでお待ちください</p>'}</section>`;
    document.querySelector('#start')?.addEventListener('click', () => send({ t: 'start' })); return;
  }
  if (state.phase === 'finished') {
    const ordered = [...state.players].sort((a,b) => b.score-a.score);
    app.innerHTML = `<section class="results"><div class="eyebrow">FINAL RESULT</div><h1>結果発表！</h1><p>全10問、おつかれさまでした。</p><div class="ranking">${ordered.map(p => `<div class="rank"><b>${p.rank}<small>位</small></b><span>${esc(p.name)}</span><strong>${p.score}<small> pt</small></strong></div>`).join('')}</div><button class="secondary" id="leave">入口に戻る</button></section>`;
    document.querySelector('#leave').onclick = () => { localStorage.removeItem('quiz-session'); credentials = null; socket?.close(); state = null; connection.textContent = ''; entrance(); }; return;
  }
  const answerer = state.players.find(p => p.id === state.answering);
  const canAnswer = state.phase === 'answering' && state.answering === state.you;
  const locked = state.locked.includes(state.you);
  const canBuzz = state.phase === 'question' && !locked;
  let message = state.phase === 'reveal' ? '正解発表！' : answerer ? `${answerer.name}さんが回答中` : locked ? 'この問題は回答済み' : 'わかったら早押し！';
  app.innerHTML = `<div class="game-layout"><section class="game"><div class="game-top"><div><div class="eyebrow">QUESTION</div><b>第${state.index}問 <span>/ 10</span></b></div><div class="timer"><strong id="seconds">20</strong><small>秒</small></div></div><div class="track"><div id="bar"></div></div><h1 class="question">${esc(state.question.text)}</h1><div class="choices">${state.question.choices.map((choice,i) => `<button class="choice ${state.phase === 'reveal' && state.question.correct === i ? 'correct' : ''}" data-choice="${i}" ${canAnswer ? '' : 'disabled'}><span>${'ABCD'[i]}</span>${esc(choice)}</button>`).join('')}</div><div class="buzz-area"><p class="status">${esc(message)}</p><button id="buzz" class="buzz" ${canBuzz ? '' : 'disabled'} aria-label="早押し">早押し<small>SPACE</small></button></div><p id="notice" class="error"></p></section><aside><div class="section-title">スコア <span>LIVE</span></div>${players()}</aside></div>`;
  document.querySelector('#buzz').onclick = () => send({ t:'buzz', q:state.index });
  document.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => send({ t:'answer', q:state.index, choice:Number(button.dataset.choice) }));
  updateTime();
}
function updateTime() {
  if (!state || !['question','answering','reveal'].includes(state.phase)) return;
  const end = state.phase === 'answering' ? state.answerEnd : state.phase === 'reveal' ? state.revealEnd : state.questionEnd;
  const seconds = Math.max(0, Math.ceil((end - (Date.now()+offset))/1000));
  const el = document.querySelector('#seconds'); if (el) el.textContent = seconds;
  const bar = document.querySelector('#bar'); if (bar) bar.style.width = `${Math.max(0, Math.min(100, (state.questionEnd - Date.now()-offset)/200))}%`;
}
setInterval(updateTime, 100);
window.addEventListener('keydown', event => { if (event.code === 'Space' && !['INPUT','BUTTON'].includes(document.activeElement.tagName) && state?.phase === 'question' && !state.locked.includes(state.you)) { event.preventDefault(); send({ t:'buzz', q:state.index }); } });
if (credentials) { app.innerHTML = '<p class="loading">部屋に接続しています…</p>'; connect(); } else entrance();
