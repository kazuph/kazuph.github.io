const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const STORAGE = 'haya-player';
const RECONNECT_MS = 1000;
let session = readSession();
let state = null;
let socket = null;
let offset = 0;
let connected = false;
let retry = null;
let fatal = false;
function readSession() { try { return JSON.parse(sessionStorage.getItem(STORAGE) || 'null'); } catch { return null; } }
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function showError(text) { notice.textContent = text; notice.hidden = false; }
function send(type, extra = {}) { notice.hidden = true; if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, question: state?.question?.number, ...extra })); else showError('再接続を待っています。操作は接続後にできます。'); }
function entry() {
  app.innerHTML = `<section class="entry"><div class="intro"><p class="eyebrow">THE QUICK-THINKING QUIZ CLUB</p><h1>わかった<span>その瞬間、</span><em>押せ！</em></h1><p class="lead">知識だけじゃ、勝てない。<br>友だちと集まる、4人までの早押しクイズ。</p><div class="rule-strip"><div><b>10</b><span>問の勝負</span></div><div><b>+10</b><span>正解の点数</span></div><div><b>−5</b><span>不正解の点数</span></div></div></div><section class="entry-form" aria-labelledby="entry-title"><p class="eyebrow">READY TO PLAY?</p><h2 id="entry-title">さあ、集まろう。</h2><form id="room-form"><label for="name">あなたの名前</label><input id="name" name="name" placeholder="例：ねこマスター" autocomplete="nickname" required><button class="primary" type="submit" name="action" value="create">部屋を作る <span aria-hidden="true">↗</span></button><div class="divider">友だちの部屋に入る</div><label for="code">部屋コード</label><input id="code" name="code" placeholder="8文字のコード" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="secondary" type="submit" name="action" value="join">参加する <span aria-hidden="true">→</span></button></form><p class="fine">登録不要。名前を決めたら、すぐ遊べます。</p></section></section><section class="how"><p class="eyebrow">HOW TO PLAY</p><div><b>01 <span>問題を読む</span></b><p>日本語の4択問題が10問。<br>出題から20秒で次の問題へ。</p></div><div><b>02 <span>早押しでつかむ</span></b><p>いちばん早かった1人に回答権。<br>10秒以内に答えを選ぼう。</p></div><div><b>03 <span>最後まで逆転</span></b><p>不正解なら残りのみんなの番。<br>10問の合計点で勝負！</p></div></section>`;
  document.querySelector('#room-form').addEventListener('submit', async event => {
    event.preventDefault(); notice.hidden = true;
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    const code = form.elements.code.value.trim().toUpperCase();
    const join = event.submitter.value === 'join';
    if (join && !/^[A-F0-9]{8}$/.test(code)) return showError('部屋コードは8文字の英数字です。友だちの画面を確認してください。');
    for (const b of form.querySelectorAll('button')) b.disabled = true;
    try {
      const response = await fetch(join ? `/api/rooms/${code}/join` : '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      session = data; sessionStorage.setItem(STORAGE, JSON.stringify(session)); connect();
    } catch (error) { showError(error.message || '接続できませんでした。もう一度お試しください。'); for (const b of form.querySelectorAll('button')) b.disabled = false; }
  });
}
function connectionLabel() { return connected ? '全員とリアルタイム接続' : '再接続中 · 点数は保存されています'; }
function players() {
  return state.players.map((p, i) => `<li class="player ${p.id === session.id ? 'self' : ''} ${p.id === state.answeringId ? 'answering' : ''}" data-player-id="${p.id}"><span class="avatar tone-${i}">${esc(p.name.slice(0, 1))}</span><div class="player-info"><b>${esc(p.name)}${p.id === session.id ? '<small>あなた</small>' : ''}</b><span>${p.id === state.hostId ? 'HOST · ' : ''}${p.id === state.answeringId ? '回答中' : state.excluded.includes(p.id) && state.phase === 'question' ? 'この問題はお休み' : p.online ? '接続中' : '再接続待ち'}</span></div><strong class="score">${p.score}<small>pt</small></strong></li>`).join('');
}
function previous() { const p = state.previous; return p ? `<section class="previous"><span class="eyebrow">QUESTION ${p.number} · ${esc(p.outcome)}</span><p>${esc(p.text)} <b>正解：${esc(p.answer)}</b></p><small>${esc(p.note)}</small></section>` : ''; }
function render() {
  if (!state) { app.innerHTML = '<section class="connecting"><p class="eyebrow">CONNECTING</p><h1>部屋につないでいます。</h1><p>プレイヤー情報を確認中です。</p><button class="secondary" id="reset">別の部屋で遊ぶ</button></section>'; document.querySelector('#reset').onclick = reset; return; }
  const lobby = state.phase === 'lobby';
  const finished = state.phase === 'finished';
  const mine = state.answeringId === session.id;
  const host = state.hostId === session.id;
  const q = state.question;
  let content;
  if (lobby) content = `<section class="lobby-main"><p class="eyebrow">YOUR QUIZ ROOM</p><h1>準備は、<br>いいですか？</h1><p class="lead">部屋コードを友だちに伝えよう。<br>2人集まったら、ゲームを始められます。</p><div class="room-ticket"><span>部屋コード</span><strong data-testid="room-code">${state.code}</strong><small>同じURLを開いて、このコードで参加</small></div><button id="start" class="primary" ${!host || state.players.length < 2 || !connected ? 'disabled' : ''}>${host ? 'ゲームを開始する' : 'ホストの開始を待っています'} <span aria-hidden="true">→</span></button><p class="fine">${state.players.length < 2 ? 'あと1人参加すると開始できます。' : '全10問。正解 +10点、不正解 −5点。'}</p></section>`;
  else if (finished) {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    content = `<section class="results"><p class="eyebrow">THAT WAS A GOOD GAME!</p><h1>ひらめきの、<br>結果発表。</h1><p class="lead">全10問を走りきりました。</p><ol class="ranking">${sorted.map(p => `<li class="${p.rank === 1 ? 'winner' : ''}"><span class="rank">${p.rank}<small>位</small></span><b>${esc(p.name)}${p.id === session.id ? '<small>あなた</small>' : ''}</b><strong>${p.score}<small>pt</small></strong></li>`).join('')}</ol><button id="reset" class="secondary">新しい部屋で遊ぶ <span aria-hidden="true">↗</span></button></section>`;
  } else content = `<section class="question-panel"><div class="question-meta"><span class="eyebrow">QUESTION <b>${String(q.number).padStart(2, '0')}</b> / 10</span><span class="category">${esc(q.category)}</span></div><h1 class="question-text">${esc(q.text)}</h1><div class="question-timer"><span>出題の残り時間</span><b id="question-seconds"></b></div><div class="choices" aria-label="4択の答え">${q.choices.map((choice, i) => `<button class="choice" data-choice="${i}" ${mine && connected ? '' : 'disabled'}><span>${'ABCD'[i]}</span>${esc(choice)}</button>`).join('')}</div><div class="buzzer-area"><p class="game-message" role="status">${esc(state.message)}</p>${state.answeringId ? `<div class="answer-clock"><span>${mine ? 'あなたの回答時間' : '回答の残り時間'}</span><b id="answer-seconds"></b></div>` : ''}<button id="buzz" class="buzzer" ${state.answeringId || state.excluded.includes(session.id) || !connected ? 'disabled' : ''}>${mine ? '答えを選んで！' : state.answeringId ? '回答を見守ろう' : state.excluded.includes(session.id) ? '次の問題で挑戦！' : '早押し！'}<small>${state.answeringId ? '回答権を持つ人だけが選べます' : 'クリック / スペースキー'}</small></button></div></section>`;
  app.innerHTML = `<div class="room-top"><p class="connection ${connected ? 'online' : ''}" role="status">${connectionLabel()}</p><span class="room-label">ROOM <b>${state.code}</b></span></div><div class="arena">${content}<aside class="scoreboard"><div class="aside-title"><h2>${finished ? 'SCORE BOARD' : 'PLAYERS'}</h2><span>${state.players.length} / 4</span></div><ul>${players()}</ul>${lobby ? `<div class="empty-seats">${4 - state.players.length ? `あと${4 - state.players.length}人 参加できます` : '全員そろいました！'}</div>` : '<p class="fine">正解 +10 pt / 不正解 −5 pt<br>最後の1問まで、勝負は続く。</p>'}<div class="mini-rules"><b>ひらめいたら、迷わず。</b><p>回答権はサーバーに早く届いた1人に。<br>不正解なら、残りのみんなの出番。</p></div></aside></div>${previous()}`;
  document.querySelector('#start')?.addEventListener('click', () => send('start'));
  document.querySelector('#buzz')?.addEventListener('click', () => send('buzz'));
  document.querySelector('#reset')?.addEventListener('click', reset);
  for (const button of document.querySelectorAll('[data-choice]')) button.addEventListener('click', () => send('answer', { choice: Number(button.dataset.choice) }));
  timers();
}
function timers() {
  if (!state || state.phase !== 'question') return;
  const now = Date.now() + offset;
  const q = document.querySelector('#question-seconds');
  const a = document.querySelector('#answer-seconds');
  if (q) q.textContent = `${Math.max(0, Math.ceil((state.questionDeadline - now) / 1000))}秒`;
  if (a) a.textContent = `${Math.max(0, Math.ceil((state.answerDeadline - now) / 1000))}秒`;
}
function connect() {
  fatal = false;
  clearTimeout(retry);
  connected = false; render();
  const ws = socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${session.code}/socket?token=${encodeURIComponent(session.token)}`);
  ws.addEventListener('open', () => { if (socket !== ws) return; notice.hidden = true; });
  ws.addEventListener('message', event => { if (socket !== ws) return;
    const packet = JSON.parse(event.data);
    if (packet.type === 'error') return showError(packet.error);
    if (packet.type === 'state') { connected = true; state = packet.state; offset = state.serverNow - Date.now(); render(); }
  });
  ws.addEventListener('close', () => { if (socket !== ws) return; connected = false; render(); if (!fatal && navigator.onLine) retry = setTimeout(connect, RECONNECT_MS); });
  ws.addEventListener('error', () => { if (socket !== ws) return; showError('部屋への接続を再試行しています。復帰できないときは、別の部屋で遊べます。'); });
}
function reset() { fatal = true; clearTimeout(retry); socket?.close(); socket = null; session = null; state = null; sessionStorage.removeItem(STORAGE); notice.hidden = true; entry(); }
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName)) { const button = document.querySelector('#buzz'); if (button && !button.disabled) { event.preventDefault(); button.click(); } } });
window.addEventListener('online', () => { if (session && !connected) connect(); });
window.addEventListener('offline', () => { if (session) { clearTimeout(retry); connected = false; const oldSocket = socket; socket = null; oldSocket?.close(1000); render(); } });
window.addEventListener('pageshow', event => { if (event.persisted && session) connect(); });
setInterval(timers, 100);
if (session) connect(); else entry();
