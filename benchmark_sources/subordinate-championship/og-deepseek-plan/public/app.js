const SESSION_KEY = 'buzzer-quiz.session.v1';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

const els = {
  views: {
    entry: document.getElementById('view-entry'),
    lobby: document.getElementById('view-lobby'),
    game: document.getElementById('view-game'),
    result: document.getElementById('view-result'),
  },
  connection: document.getElementById('connection-status'),
  connectionText: document.getElementById('connection-text'),
  name: document.getElementById('player-name'),
  createButton: document.getElementById('create-button'),
  joinForm: document.getElementById('join-form'),
  joinButton: document.getElementById('join-button'),
  roomCode: document.getElementById('room-code'),
  entryMessage: document.getElementById('entry-message'),
  entryNote: document.getElementById('entry-note'),

  lobbyCode: document.getElementById('lobby-code'),
  lobbyCount: document.getElementById('lobby-count'),
  lobbyPlayers: document.getElementById('lobby-players'),
  startButton: document.getElementById('start-button'),
  lobbyHint: document.getElementById('lobby-hint'),
  copyCode: document.getElementById('copy-code'),
  leaveButton: document.getElementById('leave-button'),

  questionNumber: document.getElementById('question-number'),
  questionText: document.getElementById('question-text'),
  choices: document.getElementById('choices'),
  buzzButton: document.getElementById('buzz-button'),
  answerStatus: document.getElementById('answer-status'),
  answeringYou: document.getElementById('answering-you'),
  revealStatus: document.getElementById('reveal-status'),
  scoreList: document.getElementById('score-list'),
  offlineNote: document.getElementById('offline-note'),
  timer: document.getElementById('timer'),
  timerSeconds: document.getElementById('timer-seconds'),
  timerBar: document.getElementById('timer-bar'),

  resultTitle: document.getElementById('result-title'),
  resultSubtitle: document.getElementById('result-subtitle'),
  rankingList: document.getElementById('ranking-list'),
  newRoomButton: document.getElementById('new-room-button'),

  toast: document.getElementById('toast'),
};

let session = null;
let latest = null;
let socket = null;
let reconnectTimer = null;
let pingTimer = null;
let suppressClose = false;
let failedConnects = 0;
let clockOffset = 0;
let toastTimer = null;
let answerLocked = false;

init();

function init() {
  bindEvents();
  session = loadSession();
  if (session) {
    els.name.value = session.name || '';
    showNote('前回の部屋に接続しています…');
    setConnection(true, '再接続中…');
    connect();
  } else {
    showView('entry');
  }
  setInterval(updateTimer, 100);
}

function bindEvents() {
  els.createButton.addEventListener('click', createRoom);
  els.joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    joinRoom();
  });
  els.name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createRoom();
    }
  });
  els.startButton.addEventListener('click', () => {
    send({ t: 'start' });
  });
  els.buzzButton.addEventListener('click', buzz);
  els.copyCode.addEventListener('click', copyRoomCode);
  els.leaveButton.addEventListener('click', leaveToEntry);
  els.newRoomButton.addEventListener('click', leaveToEntry);

  window.addEventListener('offline', () => {
    setConnection(true, '回線が切れました…');
    if (socket) {
      try {
        socket.close();
      } catch {
        // すでに閉じている
      }
    }
  });
  window.addEventListener('online', () => {
    if (!session) return;
    setConnection(true, '再接続中…');
    clearTimeout(reconnectTimer);
    connect();
  });

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;
    const tag = document.activeElement?.tagName;
    if (!els.views.entry.hidden && (tag === 'INPUT' || tag === 'TEXTAREA')) return;
    if (!latest || latest.phase !== 'question' || els.views.game.hidden) return;
    if (els.buzzButton.disabled) return;
    event.preventDefault();
    buzz();
  });
}

/* ---------- session / connection ---------- */

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value?.code || !value?.playerId || !value?.token) return null;
    return value;
  } catch {
    return null;
  }
}

function saveSession(value) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // ストレージが使えなくてもゲームは続けられる
  }
}

function clearSession() {
  session = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 何もしない
  }
}

function connect() {
  if (!session) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${location.host}/api/rooms/${encodeURIComponent(
    session.code,
  )}/ws?token=${encodeURIComponent(session.token)}`;

  let gotState = false;
  const nextSocket = new WebSocket(url);
  socket = nextSocket;
  suppressClose = false;

  nextSocket.addEventListener('open', () => {
    failedConnects = 0;
    setConnection(false);
    startPing(nextSocket);
  });

  nextSocket.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (payload.t === 'state') {
      gotState = true;
      failedConnects = 0;
      clockOffset = Number(payload.serverNow) - Date.now();
      latest = payload;
      hideNote();
      setConnection(false);
      render();
    } else if (payload.t === 'error') {
      showToast(payload.message || 'エラーが起きました');
    }
  });

  nextSocket.addEventListener('close', () => {
    stopPing();
    if (socket === nextSocket) socket = null;
    if (suppressClose) return;

    if (!gotState && navigator.onLine) failedConnects += 1;
    if (failedConnects >= 3) {
      clearSession();
      latest = null;
      setConnection(false);
      showView('entry');
      showMessage('前回の部屋に戻れませんでした。部屋コードを確認して、もう一度入室してください。');
      return;
    }

    setConnection(true, '再接続中…');
    scheduleReconnect();
  });

  nextSocket.addEventListener('error', () => {
    // close イベントでまとめて処理する
  });
}

function scheduleReconnect() {
  if (!session) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connect();
  }, 1000);
}

function startPing(target) {
  stopPing();
  pingTimer = setInterval(() => {
    if (target.readyState === WebSocket.OPEN) {
      target.send(JSON.stringify({ t: 'ping' }));
    }
  }, 2000);
}

function stopPing() {
  clearInterval(pingTimer);
  pingTimer = null;
}

function send(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showToast('接続が切れています。復帰を待っています…');
    return false;
  }
  socket.send(JSON.stringify(payload));
  return true;
}

function setConnection(visible, text) {
  els.connection.hidden = !visible;
  if (text) els.connectionText.textContent = text;
}

/* ---------- entry actions ---------- */

async function createRoom() {
  const name = readName();
  if (!name) return;
  setBusy(els.createButton, true, '部屋を作っています…');
  try {
    const data = await postJson('/api/rooms', { name });
    startSession({ code: data.code, playerId: data.playerId, token: data.token, name });
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(els.createButton, false);
  }
}

async function joinRoom() {
  const name = readName();
  if (!name) return;
  const code = els.roomCode.value.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    showMessage('部屋コードは英数字6文字です（例：ABC234）');
    return;
  }
  setBusy(els.joinButton, true, '参加しています…');
  try {
    const data = await postJson(`/api/rooms/${code}/join`, { name });
    startSession({ code: data.code, playerId: data.playerId, token: data.token, name });
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(els.joinButton, false);
  }
}

function startSession(nextSession) {
  session = nextSession;
  saveSession(session);
  failedConnects = 0;
  hideMessage();
  showNote('部屋に入っています…');
  setConnection(true, '接続中…');
  connect();
}

function readName() {
  const name = els.name.value.trim().replace(/\s+/g, ' ');
  if (!name) {
    showMessage('ニックネームを入力してください');
    els.name.focus();
    return null;
  }
  if (name.length > 12) {
    showMessage('ニックネームは12文字までです');
    return null;
  }
  hideMessage();
  return name;
}

function leaveToEntry() {
  suppressClose = true;
  if (socket) {
    try {
      socket.close();
    } catch {
      // すでに閉じている
    }
  }
  socket = null;
  stopPing();
  clearTimeout(reconnectTimer);
  clearSession();
  latest = null;
  answerLocked = false;
  setConnection(false);
  hideNote();
  hideMessage();
  showView('entry');
  els.name.focus();
}

async function copyRoomCode() {
  const code = els.lobbyCode.textContent || '';
  try {
    await navigator.clipboard.writeText(code);
    showToast('部屋コードをコピーしました');
  } catch {
    showToast(`部屋コード: ${code}`);
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.error || '通信に失敗しました');
  }
  return data;
}

function setBusy(button, busy, label) {
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

/* ---------- rendering ---------- */

function render() {
  if (!latest) return;
  document.body.dataset.phase = latest.phase;
  if (latest.phase === 'lobby') {
    showView('lobby');
    renderLobby();
  } else if (latest.phase === 'finished') {
    showView('result');
    renderResult();
  } else {
    showView('game');
    renderGame();
  }
  updateTimer();
}

function renderLobby() {
  const state = latest;
  const me = state.players.find((player) => player.id === state.you);
  els.lobbyCode.textContent = state.code;
  els.lobbyCount.textContent = String(state.players.length);

  els.lobbyPlayers.replaceChildren();
  for (let index = 0; index < 4; index += 1) {
    const player = state.players[index];
    const seat = document.createElement('div');
    seat.className = 'seat';
    seat.dataset.testid = 'player-seat';
    if (!player) {
      seat.classList.add('is-empty');
      seat.innerHTML = '<span class="seat-avatar">+</span><span class="seat-name">空き席</span>';
      els.lobbyPlayers.append(seat);
      continue;
    }
    if (player.id === state.you) seat.classList.add('is-you');
    if (!player.connected) seat.classList.add('is-offline');

    const avatar = document.createElement('span');
    avatar.className = 'seat-avatar';
    avatar.textContent = (player.name || '?').slice(0, 1);

    const info = document.createElement('div');
    info.className = 'seat-info';
    const name = document.createElement('span');
    name.className = 'seat-name';
    name.textContent = player.name;
    const meta = document.createElement('span');
    meta.className = 'seat-meta';
    if (player.isHost) meta.append(makeTag('ホスト', 'tag-host'));
    if (player.id === state.you) meta.append(makeTag('あなた', 'tag-you'));
    if (!player.connected) meta.append(makeTag('接続が切れています', 'tag-offline'));
    info.append(name, meta);

    seat.append(avatar, info);
    els.lobbyPlayers.append(seat);
  }

  const isHost = state.hostId === state.you;
  els.startButton.hidden = !isHost;
  els.startButton.disabled = state.players.length < 2;
  els.startButton.textContent =
    state.players.length < 2 ? 'ゲーム開始（2人以上）' : 'ゲーム開始';

  if (isHost) {
    els.lobbyHint.textContent =
      state.players.length < 2
        ? 'あと1人以上そろうと開始できます。'
        : '全員そろったら「ゲーム開始」を押してください。';
  } else {
    els.lobbyHint.textContent = `${hostName(state)} さんの開始を待っています…`;
  }
}

function hostName(state) {
  return state.players.find((player) => player.id === state.hostId)?.name ?? 'ホスト';
}

function renderGame() {
  const state = latest;
  els.views.game.dataset.phase = state.phase;
  els.views.game.dataset.answeringId = state.answeringPlayerId ?? '';
  els.views.game.dataset.you = state.you;
  els.questionNumber.textContent = `第${state.questionIndex + 1}問`;
  els.questionText.textContent = state.question?.text ?? '';

  const me = state.players.find((player) => player.id === state.you);
  const answerer = state.players.find((player) => player.id === state.answeringPlayerId);
  const youAreAnswering =
    state.phase === 'answering' && state.answeringPlayerId === state.you;
  if (!youAreAnswering) answerLocked = false;

  renderChoices(state, youAreAnswering);
  renderAction(state, me, answerer, youAreAnswering);
  renderScores(state);
}

function renderChoices(state, youAreAnswering) {
  els.choices.replaceChildren();
  const choices = state.question?.choices ?? [];

  choices.forEach((text, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.testid = 'choice';
    button.dataset.index = String(index);
    button.disabled = !youAreAnswering || answerLocked;
    if (youAreAnswering && !answerLocked) button.classList.add('is-live');

    if (state.phase === 'reveal') {
      if (index === state.correctIndex) button.classList.add('is-correct');
      if (
        state.lastAnswer &&
        state.lastAnswer.playerId === state.you &&
        state.lastAnswer.choice === index &&
        index !== state.correctIndex
      ) {
        button.classList.add('is-wrong');
      }
    }

    if (youAreAnswering) {
      button.addEventListener('click', () => submitAnswer(state, index));
    }

    const key = document.createElement('span');
    key.className = 'choice-key';
    key.textContent = ['A', 'B', 'C', 'D'][index] ?? String(index + 1);
    const label = document.createElement('span');
    label.className = 'choice-text';
    label.textContent = text;
    button.append(key, label);
    els.choices.append(button);
  });
}

function renderAction(state, me, answerer, youAreAnswering) {
  const buzz = els.buzzButton;
  buzz.className = 'buzzer';
  buzz.disabled = true;
  els.answeringYou.hidden = true;
  els.revealStatus.hidden = true;
  els.answerStatus.hidden = false;
  els.answerStatus.classList.remove('is-hot');

  if (state.phase === 'question') {
    if (me?.lockedOut) {
      buzz.querySelector('.buzzer-main').textContent = '回答済み';
      buzz.querySelector('.buzzer-sub').textContent = 'この問題は終了';
      els.answerStatus.textContent = 'ほかのプレイヤーの早押しを待っています…';
    } else {
      buzz.disabled = false;
      buzz.querySelector('.buzzer-main').textContent = '早押し！';
      buzz.querySelector('.buzzer-sub').textContent = 'SPACE';
      els.answerStatus.textContent = '全員の早押しを待っています…';
    }
    return;
  }

  if (state.phase === 'answering') {
    if (youAreAnswering) {
      buzz.classList.add('is-answering');
      buzz.querySelector('.buzzer-main').textContent = '回答中';
      buzz.querySelector('.buzzer-sub').textContent = '10秒以内';
      els.answerStatus.textContent = '';
      els.answeringYou.hidden = false;
    } else {
      buzz.querySelector('.buzzer-main').textContent = '待機中';
      buzz.querySelector('.buzzer-sub').textContent = '回答権は1人だけ';
      els.answerStatus.textContent = `${answerer?.name ?? 'だれか'} さんが回答中…`;
      els.answerStatus.classList.add('is-hot');
    }
    return;
  }

  if (state.phase === 'reveal') {
    buzz.querySelector('.buzzer-main').textContent = '正解発表';
    buzz.querySelector('.buzzer-sub').textContent = '';
    els.answerStatus.hidden = true;
    els.revealStatus.hidden = false;

    const correctText =
      state.correctIndex !== undefined ? state.question?.choices[state.correctIndex] : '';
    const last = state.lastAnswer;
    const who = last ? state.players.find((player) => player.id === last.playerId) : null;
    let message = '時間切れ！';
    if (last?.correct) message = `${who?.name ?? 'だれか'} さん、正解！ +10点`;
    if (last && !last.correct && last.choice >= 0) {
      message = `${who?.name ?? 'だれか'} さん、不正解… -5点`;
    }
    if (last && !last.correct && last.choice < 0) {
      message = `${who?.name ?? 'だれか'} さん、時間切れ… -5点`;
    }

    els.revealStatus.replaceChildren();
    const head = document.createElement('span');
    head.textContent = `${message}　`;
    const correct = document.createElement('span');
    correct.className = 'correct-label';
    correct.textContent = `正解は「${correctText ?? '—'}」`;
    const next = document.createElement('span');
    next.className = 'next-note';
    next.textContent =
      state.questionIndex + 1 >= state.totalQuestions
        ? 'まもなく最終結果を発表します…'
        : 'つぎの問題へ進みます…';
    els.revealStatus.append(head, correct, next);
  }
}

function renderScores(state) {
  els.scoreList.replaceChildren();
  const offline = state.players.filter((player) => !player.connected);
  els.offlineNote.hidden = offline.length === 0;
  els.offlineNote.textContent =
    offline.length > 0
      ? `接続が切れています: ${offline.map((player) => player.name).join('、')}`
      : '';
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  ranked.forEach((player, index) => {
    const row = document.createElement('li');
    row.className = 'score-row';
    row.dataset.testid = 'player-row';
    row.dataset.playerId = player.id;
    if (player.id === state.you) row.classList.add('is-you');
    if (player.answering) row.classList.add('is-answering');
    if (!player.connected) row.classList.add('is-offline');

    const rank = document.createElement('span');
    rank.className = 'score-rank';
    rank.textContent = String(index + 1);

    const name = document.createElement('span');
    name.className = 'score-name';
    name.textContent = player.name;

    const tags = document.createElement('span');
    tags.className = 'score-tags';
    if (player.isHost) tags.append(makeTag('HOST', 'tag-host'));
    if (player.answering) tags.append(makeTag('回答中', 'tag-answering'));
    if (!player.connected) tags.append(makeTag('切断', 'tag-offline'));

    const points = document.createElement('span');
    points.className = 'score-points';
    points.dataset.testid = 'player-score';
    points.textContent = String(player.score);
    if (player.score < 0) points.classList.add('is-minus');

    row.append(rank, name, tags, points);
    els.scoreList.append(row);
  });
}

function renderResult() {
  const state = latest;
  const ranking = state.ranking ?? [];
  const top = ranking.filter((entry) => entry.rank === 1);
  const topNames = top.map((entry) => entry.name);
  const youWon = top.some((entry) => entry.playerId === state.you);

  if (topNames.length > 1) {
    els.resultTitle.textContent = `同点優勝！ ${topNames.join('・')}`;
  } else if (topNames.length === 1) {
    els.resultTitle.textContent = `優勝！ ${topNames[0]}`;
  } else {
    els.resultTitle.textContent = '結果発表';
  }
  els.resultSubtitle.textContent = youWon
    ? 'おめでとう！ 最後までナイスバズでした。'
    : '最後までおつかれさまでした。もう一度遊ぶなら新しい部屋を作ってください。';

  els.rankingList.replaceChildren();
  ranking.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'rank-card';
    item.dataset.testid = 'rank-row';
    item.dataset.playerId = entry.playerId;
    item.dataset.rank = String(entry.rank);
    if (entry.rank <= 3) item.classList.add(`rank-${entry.rank}`);
    if (entry.playerId === state.you) item.classList.add('is-you');

    const number = document.createElement('span');
    number.className = 'rank-number';
    number.textContent = `${entry.rank}`;

    const main = document.createElement('span');
    main.className = 'rank-main';
    const name = document.createElement('span');
    name.className = 'rank-name';
    name.textContent = entry.name;
    const meta = document.createElement('span');
    meta.className = 'rank-meta';
    meta.textContent = entry.playerId === state.you ? 'あなた' : 'プレイヤー';
    main.append(name, meta);

    const score = document.createElement('span');
    score.className = 'rank-score';
    score.dataset.testid = 'rank-score';
    score.textContent = String(entry.score);
    const pt = document.createElement('span');
    pt.className = 'pt';
    pt.textContent = 'pt';
    score.append(pt);

    item.append(number, main, score);
    els.rankingList.append(item);
  });
}

function makeTag(text, className) {
  const tag = document.createElement('span');
  tag.className = `tag ${className}`;
  tag.textContent = text;
  return tag;
}

/* ---------- timer ---------- */

function updateTimer() {
  if (!latest) return;
  const phase = latest.phase;
  let deadline = null;
  let start = null;
  let total = null;

  if (phase === 'question') {
    deadline = latest.questionEndsAt;
    start = latest.questionStartedAt;
    total = 20000;
  } else if (phase === 'answering') {
    deadline = Math.min(latest.answerEndsAt ?? Infinity, latest.questionEndsAt ?? Infinity);
    start = latest.answerStartedAt;
    total = Math.max(1, deadline - (start ?? deadline));
  } else if (phase === 'reveal') {
    deadline = latest.revealEndsAt;
    start = latest.revealStartedAt;
    total = 3000;
  }

  if (deadline === null || !Number.isFinite(deadline)) {
    els.timer.hidden = true;
    return;
  }
  els.timer.hidden = false;

  const serverNow = Date.now() + clockOffset;
  const remaining = Math.max(0, deadline - serverNow);
  els.timerSeconds.textContent = String(Math.ceil(remaining / 1000));

  const ratio = Math.max(0, Math.min(1, remaining / (total || 1)));
  els.timerBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  els.timerBar.classList.toggle('is-warning', remaining <= 10000 && remaining > 5000);
  els.timerBar.classList.toggle('is-urgent', remaining <= 5000);
  els.timer.classList.toggle('is-urgent', remaining <= 5000);
}

/* ---------- game actions ---------- */

function buzz() {
  if (!latest || latest.phase !== 'question') return;
  const me = latest.players.find((player) => player.id === latest.you);
  if (!me || me.lockedOut) return;
  els.buzzButton.disabled = true;
  send({ t: 'buzz', q: latest.questionIndex + 1 });
}

function submitAnswer(state, choice) {
  if (answerLocked) return;
  answerLocked = true;
  for (const button of els.choices.querySelectorAll('button')) {
    button.disabled = true;
    button.classList.remove('is-live');
  }
  send({ t: 'answer', q: state.questionIndex + 1, choice });
}

/* ---------- messages ---------- */

function showView(name) {
  for (const [key, element] of Object.entries(els.views)) {
    element.hidden = key !== name;
  }
  document.body.dataset.view = name;
  if (name !== 'entry' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function showMessage(text) {
  els.entryMessage.textContent = text;
  els.entryMessage.hidden = false;
}

function hideMessage() {
  els.entryMessage.hidden = true;
}

function showNote(text) {
  els.entryNote.textContent = text;
  els.entryNote.hidden = false;
}

function hideNote() {
  els.entryNote.hidden = true;
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
    setTimeout(() => {
      els.toast.hidden = true;
    }, 220);
  }, 3200);
}
