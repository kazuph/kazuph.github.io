/* =========================================================================
   早押しクイズ クライアント
   - サーバー（Durable Object）が送る状態をそのまま描画する
   - ブラウザ側で正誤や順番を判断しない（すべてサーバー判定）
   ========================================================================= */

const $ = (id) => document.getElementById(id);

const els = {
  screens: {
    home: $('screen-home'),
    lobby: $('screen-lobby'),
    game: $('screen-game'),
    result: $('screen-result'),
    error: $('screen-error'),
  },
  nameInput: $('name-input'),
  codeInput: $('code-input'),
  createRoom: $('create-room'),
  joinRoom: $('join-room'),
  homeError: $('home-error'),
  roomChip: $('room-chip'),
  roomCode: $('room-code'),
  copyCode: $('copy-code'),
  lobbyCode: $('lobby-code'),
  lobbyCopy: $('lobby-copy'),
  lobbyPlayers: $('lobby-players'),
  lobbyActions: $('lobby-actions'),
  playerCount: $('player-count'),
  questionCounter: $('question-counter'),
  phaseNote: $('phase-note'),
  questionTimer: $('question-timer'),
  questionText: $('question-text'),
  options: $('options'),
  explanation: $('question-explanation'),
  buzzer: $('buzzer'),
  buzzerSub: $('buzzer-sub'),
  answerStatus: $('answer-status'),
  scoreList: $('score-list'),
  ranking: $('ranking'),
  resultActions: $('result-actions'),
  conn: $('conn'),
  connText: $('conn-text'),
  toast: $('toast'),
  reconnect: $('reconnect'),
  reconnectText: $('reconnect-text'),
  errorTitle: $('error-title'),
  errorMessage: $('error-message'),
  errorBack: $('error-back'),
};

const app = {
  code: null,
  id: null,
  name: '',
  ws: null,
  data: null,
  offset: 0,
  fatal: false,
  retry: 0,
  reconnectTimer: null,
  toastTimer: null,
  rafTimer: null,
  localChoice: null,
};

const FATAL_ERRORS = new Set(['room_full', 'room_not_found', 'game_in_progress', 'not_found']);
const LETTERS = ['A', 'B', 'C', 'D'];

/* ------------------------------------------------------------------ utils */

function normalizeCode(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function tokenFor(code) {
  const key = `buzzer.token.${code}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(key, token);
  }
  return token;
}

function serverNow() {
  return Date.now() + app.offset;
}

function showScreen(name) {
  for (const [key, el] of Object.entries(els.screens)) {
    el.classList.toggle('hidden', key !== name);
  }
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('error', isError);
  els.toast.classList.add('show');
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
}

function setConn(state, label) {
  els.conn.dataset.state = state;
  els.connText.textContent = label;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(name) {
  const trimmed = (name || '?').trim();
  // 日本語などの全角文字は 1 文字、ローマ字は 2 文字来表示する
  if (/[^\u0000-\u00ff]/.test(trimmed)) return trimmed.slice(0, 1);
  return trimmed.slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ home */

function init() {
  const storedName = localStorage.getItem('buzzer.name') || '';
  els.nameInput.value = storedName;

  const params = new URLSearchParams(location.search);
  const roomParam = normalizeCode(params.get('room') || '');
  if (roomParam) {
    els.codeInput.value = roomParam;
    if (storedName) {
      enterRoom(roomParam, storedName);
      return;
    }
  }

  els.createRoom.addEventListener('click', onCreateRoom);
  els.joinRoom.addEventListener('click', onJoinRoom);
  els.codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onJoinRoom();
  });
  els.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onCreateRoom();
  });
  showScreen('home');
}

function readName() {
  const name = (els.nameInput.value || '').trim().slice(0, 12);
  if (!name) {
    showHomeError('名前を入力してください。');
    return null;
  }
  localStorage.setItem('buzzer.name', name);
  return name;
}

function showHomeError(message) {
  els.homeError.textContent = message;
  els.homeError.classList.remove('hidden');
}

function clearHomeError() {
  els.homeError.classList.add('hidden');
}

async function onCreateRoom() {
  clearHomeError();
  const name = readName();
  if (!name) return;
  els.createRoom.disabled = true;
  try {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) {
      showHomeError(data.message || '部屋を作成できませんでした。');
      return;
    }
    enterRoom(data.code, name);
  } catch (err) {
    showHomeError('サーバーに接続できませんでした。開発サーバーが起動しているか確認してください。');
  } finally {
    els.createRoom.disabled = false;
  }
}

async function onJoinRoom() {
  clearHomeError();
  const name = readName();
  if (!name) return;
  const code = normalizeCode(els.codeInput.value);
  if (code.length !== 6) {
    showHomeError('部屋コードは6文字です。');
    return;
  }
  els.joinRoom.disabled = true;
  try {
    const res = await fetch(`/api/rooms/${code}`);
    const data = await res.json();
    if (!data.ok) {
      showHomeError(data.message || 'その部屋は見つかりませんでした。');
      return;
    }
    enterRoom(code, name);
  } catch (err) {
    showHomeError('サーバーに接続できませんでした。');
  } finally {
    els.joinRoom.disabled = false;
  }
}

function enterRoom(code, name) {
  app.code = code;
  app.name = name;
  app.id = tokenFor(code);
  app.fatal = false;
  app.retry = 0;
  els.nameInput.value = name;
  els.codeInput.value = code;
  els.roomCode.textContent = code;
  els.lobbyCode.textContent = code;
  els.roomChip.classList.remove('hidden');
  const url = new URL(location.href);
  url.searchParams.set('room', code);
  history.replaceState({ room: code }, '', url);
  showScreen('lobby');
  connect();
}

/* -------------------------------------------------------------- websocket */

function connect() {
  if (!app.code) return;
  clearTimeout(app.reconnectTimer);
  setConn('connecting', '接続中');
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/api/rooms/${app.code}/ws`);
  app.ws = ws;

  ws.onopen = () => {
    app.retry = 0;
    setConn('open', '接続済み');
    els.reconnect.classList.add('hidden');
    ws.send(JSON.stringify({ t: 'join', id: app.id, name: app.name }));
  };

  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleMessage(msg);
  };

  ws.onerror = () => {
    /* onclose で処理 */
  };

  ws.onclose = (ev) => {
    if (app.ws === ws) app.ws = null;
    if (app.fatal) {
      setConn('closed', '接続終了');
      return;
    }
    setConn('closed', '再接続中');
    els.reconnectText.textContent = '接続が切れました。再接続しています…';
    els.reconnect.classList.remove('hidden');
    const delay = Math.min(400 * 2 ** app.retry, 4000);
    app.retry += 1;
    app.reconnectTimer = setTimeout(connect, delay);
  };
}

function handleMessage(msg) {
  switch (msg.t) {
    case 'state': {
      app.data = msg;
      app.offset = msg.serverNow - Date.now();
      render();
      return;
    }
    case 'notice': {
      toast(msg.message);
      return;
    }
    case 'error': {
      toast(msg.message, true);
      if (FATAL_ERRORS.has(msg.code)) {
        app.fatal = true;
        showError(msg.code, msg.message);
      }
      return;
    }
    default:
      return;
  }
}

function showError(code, message) {
  els.errorTitle.textContent =
    code === 'room_full' ? 'この部屋は満員です' : code === 'game_in_progress' ? 'すでにゲームが始まっています' : '参加できません';
  els.errorMessage.textContent = message;
  els.roomChip.classList.add('hidden');
  showScreen('error');
}

/* ---------------------------------------------------------------- render */

function me() {
  if (!app.data || !app.data.you) return null;
  return app.data.players.find((p) => p.id === app.data.you) || null;
}

function render() {
  const data = app.data;
  if (!data) return;
  if (data.phase === 'lobby') {
    showScreen('lobby');
    renderLobby(data);
  } else if (data.phase === 'result') {
    showScreen('result');
    renderResult(data);
  } else {
    showScreen('game');
    renderGame(data);
  }
}

function renderLobby(data) {
  els.playerCount.textContent = `${data.players.length} / 4`;
  els.lobbyPlayers.innerHTML = playerListHtml(data.players, false);

  const you = me();
  const isHost = !!you && you.isHost;
  const enough = data.players.length >= 2;
  els.lobbyActions.innerHTML = '';

  if (isHost) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-lg';
    btn.id = 'start-game';
    btn.textContent = enough ? '▶ ゲームを開始' : '▶ ゲームを開始（参加者を待っています）';
    btn.disabled = !enough;
    btn.addEventListener('click', () => send({ t: 'start' }));
    els.lobbyActions.appendChild(btn);
    const hint = document.createElement('p');
    hint.className = 'lobby-hint';
    hint.textContent = enough ? '全員そろったら開始できます。' : '参加者が2人以上で開始できます。';
    els.lobbyActions.appendChild(hint);
  } else {
    const hint = document.createElement('p');
    hint.className = 'lobby-hint';
    hint.textContent = enough ? 'ホストがゲームを開始するまでお待ちください。' : '参加者が2人になるまでお待ちください。';
    els.lobbyActions.appendChild(hint);
  }
}

function playerListHtml(players, inGame) {
  const youId = app.data ? app.data.you : null;
  const items = players.map((p) => {
    const tags = [];
    if (p.isHost) tags.push('<span class="tag tag-host">ホスト</span>');
    if (inGame && p.isAnswerer) tags.push('<span class="tag tag-answerer">回答中</span>');
    if (inGame && p.queued) tags.push('<span class="tag tag-queued">順番待ち</span>');
    if (inGame && p.answered && !p.isAnswerer) {
      tags.push(p.lastCorrect ? '<span class="tag tag-done">正解</span>' : '<span class="tag tag-wrong">不正解</span>');
    }
    if (!p.connected) tags.push('<span class="tag tag-offline">切断中</span>');
    if (p.id === youId) tags.push('<span class="tag">あなた</span>');
    const classes = ['player-row'];
    if (p.isAnswerer) classes.push('is-answerer');
    if (p.queued) classes.push('is-queued');
    if (!p.connected) classes.push('is-offline');
    if (p.id === youId) classes.push('is-you');
    return `<li class="${classes.join(' ')}">
      <span class="avatar">${escapeHtml(initials(p.name))}</span>
      <span class="player-main">
        <span class="player-name">${escapeHtml(p.name)}</span>
        <span class="player-tags">${tags.join('')}</span>
      </span>
      <span class="player-score">${p.score}</span>
    </li>`;
  });
  for (let i = players.length; i < 4; i++) {
    items.push(`<li class="player-row empty-slot"><span class="muted small">空き枠（あと ${4 - players.length} 人）</span></li>`);
  }
  return items.join('');
}

function renderGame(data) {
  const q = data.question;
  const you = me();
  els.questionCounter.textContent = `第 ${q ? q.index + 1 : 1} 問 / ${q ? q.total : 10}`;

  const answerer = data.players.find((p) => p.id === data.answererId) || null;
  const isAnswerer = !!(you && data.answererId === you.id);

  // フェーズ説明
  let note = '';
  if (data.phase === 'feedback') note = '不正解… 次の人に回答権が移ります';
  else if (data.phase === 'reveal') note = '正解を表示しています';
  else if (isAnswerer) note = 'あなたの番です！10秒以内に選んでください';
  else if (answerer) note = `${answerer.name} が回答中…`;
  else if (you && you.answered) note = 'この問題では回答できません（正解を待ってください）';
  else if (you && you.queued) note = '順番待ちです…';
  else note = '準備 되면早押し！';
  els.phaseNote.textContent = note;

  // 問題文と選択肢
  els.questionText.textContent = q ? q.text : '…';
  const revealed = data.phase === 'reveal' || data.phase === 'feedback';
  const correctIndex = data.revealCorrectIndex != null ? data.revealCorrectIndex : -1;
  const lastChoice = data.lastChoice != null ? data.lastChoice : -1;
  els.options.innerHTML = '';
  if (q) {
    q.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.dataset.index = String(i);
      if (isAnswerer && data.phase === 'question') btn.classList.add('is-answerable');
      if (revealed && i === correctIndex) btn.classList.add('is-correct');
      if (revealed && lastChoice === i && i !== correctIndex) btn.classList.add('is-wrong');
      btn.disabled = !(isAnswerer && data.phase === 'question');
      btn.innerHTML = `<span class="option-letter">${LETTERS[i]}</span><span class="option-text">${escapeHtml(text)}</span>`;
      btn.addEventListener('click', () => {
        if (!isAnswerer) return;
        send({ t: 'answer', choice: i });
      });
      els.options.appendChild(btn);
    });
  }

  // 解説（reveal のとき）
  if (data.phase === 'reveal') {
    els.explanation.textContent = `💡 ${q ? q.explanation : ''}`;
    els.explanation.classList.remove('hidden');
  } else {
    els.explanation.classList.add('hidden');
  }

  // 早押しボタン
  const canBuzz = data.phase === 'question' && !data.answererId && you && !you.answered && !you.queued;
  els.buzzer.disabled = !canBuzz;
  els.buzzer.classList.toggle('hidden', isAnswerer);
  if (canBuzz) {
    els.buzzerSub.textContent = '最初の1人に回答権';
  } else if (you && you.answered) {
    els.buzzerSub.textContent = 'この問題は回答済み';
  } else if (you && you.queued) {
    els.buzzerSub.textContent = '順番待ち';
  } else {
    els.buzzerSub.textContent = '回答中の人は回答できません';
  }

  // 回答状況
  if (data.answererId) {
    els.answerStatus.classList.remove('hidden');
    els.answerStatus.classList.toggle('is-you', isAnswerer);
    const remain = isAnswerer ? remainingMs(data.answerDeadline) : null;
    els.answerStatus.innerHTML = isAnswerer
      ? `<span class="as-title">🔥 あなたの回答権！</span><span class="as-sub">選択肢を押してください（残り ${remain != null ? (remain / 1000).toFixed(1) : '—'} 秒）</span>`
      : `<span class="as-title">${escapeHtml(answerer ? answerer.name : 'プレイヤー')} が回答中</span><span class="as-sub">回答権は1人だけ</span>`;
  } else {
    els.answerStatus.classList.add('hidden');
    els.answerStatus.classList.remove('is-you');
  }

  els.scoreList.innerHTML = playerListHtml(data.players, true);
  startTimerLoop();
}

function remainingMs(deadline) {
  if (!deadline) return null;
  return Math.max(0, deadline - serverNow());
}

function renderResult(data) {
  els.ranking.innerHTML = data.ranking
    .map(
      (r) => `<li class="rank-${r.rank}">
        <span class="rank-no">${r.rank}</span>
        <span class="rank-name">${escapeHtml(r.name)}${r.id === data.you ? ' <span class="tag">あなた</span>' : ''}</span>
        <span class="rank-score">${r.score} 点</span>
      </li>`,
    )
    .join('');

  els.resultActions.innerHTML = '';
  const you = me();
  if (you && you.isHost) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-lg';
    btn.textContent = '🔄 もう一度プレイ（スコアをリセット）';
    btn.addEventListener('click', () => send({ t: 'restart' }));
    els.resultActions.appendChild(btn);
  }
  const hint = document.createElement('p');
  hint.className = 'lobby-hint';
  hint.textContent = 'ホストは「もう一度プレイ」でスコアをリセットできます。';
  els.resultActions.appendChild(hint);
}

function send(message) {
  if (app.ws && app.ws.readyState === WebSocket.OPEN) {
    app.ws.send(JSON.stringify(message));
  }
}

/* ----------------------------------------------------------------- timer */

function startTimerLoop() {
  if (app.rafTimer) return;
  const loop = () => {
    updateTimers();
    app.rafTimer = requestAnimationFrame(loop);
  };
  app.rafTimer = requestAnimationFrame(loop);
}

function updateTimers() {
  const data = app.data;
  if (!data || data.phase === 'lobby' || data.phase === 'result') {
    els.questionTimer.style.width = '0%';
    return;
  }
  const remain = remainingMs(data.questionDeadline);
  const total = 20000;
  const pct = Math.max(0, Math.min(100, ((remain != null ? remain : 0) / total) * 100));
  els.questionTimer.style.width = `${pct}%`;
  els.questionTimer.classList.toggle('warn', pct <= 50 && pct > 25);
  els.questionTimer.classList.toggle('danger', pct <= 25);

  // 回答権の残り秒数を表示
  const you = me();
  if (you && data.answererId === you.id && data.answerDeadline) {
    const remainAnswer = remainingMs(data.answerDeadline);
    const sub = els.answerStatus.querySelector('.as-sub');
    if (sub) sub.textContent = `選択肢を押してください（残り ${(remainAnswer / 1000).toFixed(1)} 秒）`;
    els.questionTimer.classList.add('answer');
  } else {
    els.questionTimer.classList.remove('answer');
  }
}

/* ----------------------------------------------------------------- setup */

els.buzzer.addEventListener('click', () => {
  send({ t: 'buzz' });
});

els.copyCode.addEventListener('click', () => copyCode(app.code));
els.lobbyCopy.addEventListener('click', () => copyCode(app.code));
els.errorBack.addEventListener('click', () => {
  app.fatal = true;
  app.code = null;
  els.roomChip.classList.add('hidden');
  showScreen('home');
  els.homeError.classList.add('hidden');
  location.search = '';
});

function copyCode(code) {
  if (!code) return;
  const done = () => toast(`部屋コード ${code} をコピーしました`);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
  } else {
    fallbackCopy(code, done);
  }
}

function fallbackCopy(code, done) {
  const input = document.createElement('textarea');
  input.value = code;
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    toast(`部屋コード: ${code}`);
  }
  document.body.removeChild(input);
}

init();
