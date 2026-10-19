// ブラウザ側。表示だけを担当し、正誤・点数・早押しの順番は一切決めない。
// サーバーから届く状態（state メッセージ）をそのまま画面に反映する。

const SESSION_KEY = 'buzzer-quiz-session';
const QUESTION_TIME_MS = 20_000;
const ANSWER_TIME_MS = 10_000;
const REVEAL_TIME_MS = 3_000;

const el = (id) => document.getElementById(id);

const ui = {
  screens: {
    entry: el('screen-entry'),
    lobby: el('screen-lobby'),
    game: el('screen-game'),
    result: el('screen-result'),
  },
  nameInput: el('name-input'),
  codeInput: el('code-input'),
  createBtn: el('create-btn'),
  joinBtn: el('join-btn'),
  entryError: el('entry-error'),
  lobbyCode: el('lobby-code'),
  lobbyPlayers: el('lobby-players'),
  lobbyCount: el('lobby-count'),
  lobbyMessage: el('lobby-message'),
  startBtn: el('start-btn'),
  lobbyWait: el('lobby-wait'),
  qCounter: el('q-counter'),
  timerText: el('timer-text'),
  timerFill: el('timer-fill'),
  questionText: el('question-text'),
  choices: el('choices'),
  banner: el('banner'),
  buzzBtn: el('buzz-btn'),
  buzzHint: el('buzz-hint'),
  players: el('players'),
  ranking: el('ranking'),
  overlay: el('overlay'),
};

let session = null; // { code, playerId, token, name }
let latest = null; // 最後に受け取った state
let socket = null;
let reconnectTimer = null;
let connectAttempts = 0;
let clockOffset = 0; // serverNow - clientNow
let myChoice = null;
let lastQuestionIndex = -1;
let toastTimer = null;

const choiceButtons = [];

function buildChoices() {
  for (let i = 0; i < 4; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.testid = `choice-${i}`;
    const num = document.createElement('span');
    num.className = 'choice__num';
    num.textContent = String(i + 1);
    const label = document.createElement('span');
    label.className = 'choice__label';
    btn.append(num, label);
    btn.disabled = true;
    btn.addEventListener('click', () => send({ t: 'answer', q: latest?.questionIndex, choice: i }));
    ui.choices.append(btn);
    choiceButtons.push({ btn, label });
  }
}

function send(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function showScreen(name) {
  for (const [key, node] of Object.entries(ui.screens)) {
    node.hidden = key !== name;
  }
}

function setOverlay(text) {
  if (text) {
    ui.overlay.textContent = text;
    ui.overlay.hidden = false;
  } else {
    ui.overlay.hidden = true;
  }
}

function showToast(message) {
  ui.buzzHint.textContent = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (latest) render(latest);
  }, 1600);
}

/* ---------------- 入口 ---------------- */

function readName() {
  return ui.nameInput.value.trim().slice(0, 12);
}

async function createRoom() {
  const name = readName();
  if (!name) return showEntryError('なまえを入力してください');
  await postAndEnter('/api/rooms', { name });
}

async function joinRoom() {
  const name = readName();
  const code = ui.codeInput.value.trim().toUpperCase();
  if (!name) return showEntryError('なまえを入力してください');
  if (code.length !== 6) return showEntryError('部屋コードは6文字です');
  await postAndEnter(`/api/rooms/${code}/join`, { name });
}

function showEntryError(message) {
  ui.entryError.textContent = message;
}

async function postAndEnter(url, body) {
  ui.createBtn.disabled = true;
  ui.joinBtn.disabled = true;
  showEntryError('');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showEntryError(data.error || '入れませんでした');
      return;
    }
    session = { code: data.code, playerId: data.playerId, token: data.token, name: body.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setOverlay('接続しています…');
    connect();
  } catch {
    showEntryError('通信に失敗しました');
  } finally {
    ui.createBtn.disabled = false;
    ui.joinBtn.disabled = false;
  }
}

/* ---------------- 接続 ---------------- */

function forgetSession(message) {
  localStorage.removeItem(SESSION_KEY);
  session = null;
  latest = null;
  lastQuestionIndex = -1;
  socket = null;
  setOverlay(null);
  showScreen('entry');
  if (message) showEntryError(message);
}

function connect() {
  if (!session) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/api/rooms/${session.code}/ws?token=${session.token}`;
  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => setOverlay(null);
  ws.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.t === 'state') applyState(message);
    else if (message.t === 'error') showToast(message.message);
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    // 一度も state を受け取れないまま何度も失敗したら、古いセッションとみなして入り直す。
    connectAttempts += 1;
    if (!latest && connectAttempts >= 5) {
      forgetSession('部屋に入れませんでした。もう一度入り直してください。');
      return;
    }
    setOverlay('再接続中…');
    scheduleReconnect();
  };
  ws.onerror = () => ws.close();
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 1000);
}

window.addEventListener('offline', () => {
  if (socket) socket.close();
});
window.addEventListener('online', () => {
  if (socket && socket.readyState === WebSocket.CLOSED) connect();
});

/* ---------------- 状態の反映 ---------------- */

function applyState(state) {
  connectAttempts = 0;
  clockOffset = state.serverNow - Date.now();
  if (state.questionIndex !== lastQuestionIndex) {
    lastQuestionIndex = state.questionIndex;
    myChoice = null;
  }
  latest = state;
  render(state);
}

function render(state) {
  if (state.phase === 'lobby') {
    showScreen('lobby');
    renderLobby(state);
  } else if (state.phase === 'finished') {
    showScreen('result');
    renderResult(state);
  } else {
    showScreen('game');
    renderGame(state);
  }
}

function playerById(state, id) {
  return state.players.find((p) => p.id === id);
}

function renderLobby(state) {
  ui.lobbyCode.textContent = state.code;
  ui.lobbyCount.textContent = String(state.players.length);
  ui.lobbyPlayers.replaceChildren(
    ...state.players.map((p) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = p.name + (p.host ? '（ホスト）' : '') + (p.id === state.you ? '（あなた）' : '');
      li.append(name);
      if (!p.connected) {
        const tag = document.createElement('span');
        tag.className = 'p-tag';
        tag.textContent = '接続が切れています';
        li.append(tag);
      }
      return li;
    }),
  );

  const isHost = state.you === state.hostId;
  const canStart = state.players.length >= 2;
  ui.startBtn.hidden = !isHost;
  ui.startBtn.disabled = !canStart;
  ui.lobbyWait.hidden = isHost;
  ui.lobbyMessage.textContent = canStart ? '開始できます！' : 'あと1人で開始できます';
}

function renderGame(state) {
  const q = state.question;
  ui.qCounter.textContent = `第${state.questionIndex + 1}問 / ${state.total}`;
  ui.questionText.textContent = q ? q.text : '';

  renderChoices(state);
  renderBanner(state);
  renderBuzz(state);
  renderPlayers(state);
  updateTimer();
}

function renderChoices(state) {
  const answering = state.phase === 'answering';
  const revealing = state.phase === 'reveal';
  const iAmAnswering = answering && state.you === state.answeringPlayerId;
  for (let i = 0; i < 4; i++) {
    const { btn, label } = choiceButtons[i];
    label.textContent = state.question ? state.question.choices[i] : '';
    btn.classList.toggle('is-active', iAmAnswering);
    btn.classList.toggle('is-correct', revealing && state.reveal?.choice === i);
    btn.classList.toggle('is-wrong', revealing && myChoice === i && state.reveal?.choice !== i);
    btn.disabled = !iAmAnswering;
  }
}

function renderBanner(state) {
  const banner = ui.banner;
  if (state.phase === 'answering') {
    const p = playerById(state, state.answeringPlayerId);
    banner.textContent = `${p ? p.name : 'だれか'}さんが回答中…`;
    banner.className = 'banner';
    banner.hidden = false;
    return;
  }
  if (state.phase === 'reveal' && state.reveal) {
    const p = state.reveal.playerId ? playerById(state, state.reveal.playerId) : null;
    const who = p ? p.name : 'だれか';
    let text = '時間切れ！';
    let cls = 'banner is-wrong';
    if (state.reveal.reason === 'correct') {
      text = `${who}さん 正解！ +10`;
      cls = 'banner is-correct';
    } else if (state.reveal.reason === 'wrong') {
      text = `${who}さん 不正解… -5`;
    } else if (state.reveal.reason === 'timeout') {
      text = `${who}さん 時間切れ… -5`;
    }
    banner.textContent = text;
    banner.className = cls;
    banner.hidden = false;
    return;
  }
  banner.hidden = true;
}

function renderBuzz(state) {
  const me = playerById(state, state.you);
  const canBuzz = state.phase === 'question' && me && !me.locked;
  ui.buzzBtn.disabled = !canBuzz;
  if (state.phase === 'question') {
    ui.buzzHint.textContent = me && me.locked ? 'この問題はもう押せません（回答済み）' : 'スペースキーでも押せます';
  } else if (state.phase === 'answering') {
    ui.buzzHint.textContent = '回答を待っています…';
  } else {
    ui.buzzHint.textContent = '';
  }
}

function renderPlayers(state) {
  const scoreByName = new Map(state.players.map((p) => [p.id, p.score]));
  const items = [...state.players].sort((a, b) => (scoreByName.get(b.id) ?? 0) - (scoreByName.get(a.id) ?? 0));
  ui.players.replaceChildren(
    ...items.map((p) => {
      const li = document.createElement('li');
      li.classList.toggle('is-answering', state.answeringPlayerId === p.id);
      li.classList.toggle('is-you', p.id === state.you);
      li.classList.toggle('is-offline', !p.connected);
      const name = document.createElement('span');
      name.className = 'p-name';
      name.textContent = p.name + (p.id === state.you ? '（あなた）' : '') + (p.host ? ' 👑' : '');
      const score = document.createElement('span');
      score.className = 'p-score';
      score.textContent = String(p.score);
      li.append(name, score);
      const tags = [];
      if (!p.connected) tags.push('接続が切れています');
      if (state.answeringPlayerId === p.id) tags.push('回答中');
      if (p.locked && state.phase === 'question') tags.push('この問題は回答済み');
      if (tags.length) {
        const tag = document.createElement('span');
        tag.className = 'p-tag';
        tag.textContent = tags.join(' / ');
        li.append(tag);
      }
      return li;
    }),
  );
}

function renderResult(state) {
  const ranking = state.ranking ?? [];
  ui.ranking.replaceChildren(
    ...ranking.map((r) => {
      const li = document.createElement('li');
      li.classList.toggle('rank-1', r.rank === 1);
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = `${r.rank}位`;
      const name = document.createElement('span');
      name.textContent = r.name + (r.id === state.you ? '（あなた）' : '');
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = `${r.score}点`;
      li.append(rank, name, score);
      return li;
    }),
  );
}

/* ---------------- 残り時間 ---------------- */

function updateTimer() {
  if (!latest) return;
  const now = Date.now() + clockOffset;
  let deadline = null;
  let total = QUESTION_TIME_MS;
  if (latest.phase === 'question') {
    deadline = latest.questionDeadline;
    total = QUESTION_TIME_MS;
  } else if (latest.phase === 'answering') {
    deadline = latest.answerDeadline;
    total = ANSWER_TIME_MS;
  } else if (latest.phase === 'reveal') {
    deadline = latest.revealDeadline;
    total = REVEAL_TIME_MS;
  }
  if (deadline === null) {
    ui.timerText.textContent = '--';
    ui.timerFill.style.width = '0%';
    return;
  }
  const remaining = Math.max(0, deadline - now);
  ui.timerText.textContent = (remaining / 1000).toFixed(1);
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  ui.timerFill.style.width = `${pct}%`;
  ui.timerFill.classList.toggle('is-low', remaining <= 5000);
}

/* ---------------- 起動 ---------------- */

function start() {
  buildChoices();
  ui.createBtn.addEventListener('click', createRoom);
  ui.joinBtn.addEventListener('click', joinRoom);
  ui.codeInput.addEventListener('input', () => {
    ui.codeInput.value = ui.codeInput.value.toUpperCase();
  });
  ui.startBtn.addEventListener('click', () => send({ t: 'start' }));
  ui.buzzBtn.addEventListener('click', () => send({ t: 'buzz', q: latest?.questionIndex }));
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !ui.buzzBtn.disabled) {
      event.preventDefault();
      ui.buzzBtn.click();
    }
  });
  setInterval(updateTimer, 100);

  const saved = localStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      session = JSON.parse(saved);
      setOverlay('接続しています…');
      connect();
      return;
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  showScreen('entry');
  setOverlay(null);
}

start();
