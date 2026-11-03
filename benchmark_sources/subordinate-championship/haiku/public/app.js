// 早押しクイズのブラウザ側。判定はすべてサーバーが行い、ここは表示と送信だけを担当する。
const SESSION_KEY = 'buzzer-quiz-session';
const QUESTION_MS = 20000; // サーバーの値と同じ（表示用）
const ANSWER_MS = 10000;
const REVEAL_MS = 5000;

const $ = (sel) => document.querySelector(sel);
const screens = {
  home: $('#screen-home'),
  lobby: $('#screen-lobby'),
  game: $('#screen-game'),
  result: $('#screen-result'),
};

let session = loadSession(); // { code, playerId, name }
let view = null; // サーバーから届いた最新の画面情報
let offsetMs = 0; // サーバー時計 - この端末の時計
let ws = null;
let retryTimer = null;
let retryDelay = 500;

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSession(s) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // 保存できなくても、この画面の間は動く
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 無視
  }
  session = null;
}

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

function showHomeError(message) {
  const el = $('#home-error');
  el.textContent = message;
  el.hidden = !message;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '通信に失敗しました');
  return data;
}

function enterRoom(s) {
  session = s;
  saveSession(s);
  view = null;
  showHomeError('');
  connect();
}

$('#form-create').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get('name').trim();
  try {
    const d = await postJson('/api/rooms', { name });
    enterRoom({ code: d.code, playerId: d.playerId, name });
  } catch (err) {
    showHomeError(err.message);
  }
});

$('#form-join').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const name = form.get('name').trim();
  const code = form.get('code').trim().toUpperCase();
  try {
    const d = await postJson(`/api/rooms/${encodeURIComponent(code)}/join`, { name });
    enterRoom({ code, playerId: d.playerId, name });
  } catch (err) {
    showHomeError(err.message);
  }
});

function connect() {
  clearTimeout(retryTimer);
  if (!session) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/api/rooms/${session.code}/ws?playerId=${encodeURIComponent(session.playerId)}`;
  const sock = new WebSocket(url);
  ws = sock;
  sock.onopen = () => {
    retryDelay = 500;
  };
  sock.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'state') {
      view = msg.state;
      offsetMs = view.serverNow - Date.now();
      render();
    } else if (msg.type === 'error') {
      toast(msg.message);
    }
  };
  sock.onclose = (ev) => {
    if (ws !== sock) return;
    ws = null;
    if (!session) return;
    if (ev.code === 4000) {
      toast('別のタブでこの部屋を開いたため、この画面は切断しました');
      return;
    }
    retryTimer = setTimeout(reconnect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 5000);
  };
}

// 回線が切れたときの復帰。部屋と参加者がまだあれば同じ席へ戻る（点数は保持される）。
async function reconnect() {
  if (!session) return;
  try {
    const res = await fetch(`/api/rooms/${session.code}/check?playerId=${encodeURIComponent(session.playerId)}`);
    if (res.ok) return connect();
    if (res.status === 403 || res.status === 404) {
      clearSession();
      view = null;
      showScreen('home');
      showHomeError('この部屋に戻れなかったため、トップへ戻りました');
      return;
    }
  } catch {
    // 回線がまだ不安定なので、少し待って再試行する
  }
  retryTimer = setTimeout(reconnect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 5000);
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } else {
    toast('接続が切れています。つながるまでお待ちください');
  }
}

function leaveRoom() {
  if (view && view.phase === 'lobby') send({ type: 'leave' });
  const sock = ws;
  ws = null;
  clearTimeout(retryTimer);
  clearSession();
  view = null;
  if (sock) sock.close(1000, 'left');
  showScreen('home');
}

function badge(text, cls) {
  const b = document.createElement('span');
  b.className = `badge ${cls}`;
  b.textContent = text;
  return b;
}

function playerRow(p, extraClass = '') {
  const li = document.createElement('li');
  if (extraClass) li.className = extraClass;
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = p.name;
  li.append(name);
  if (p.id === view.you) li.append(badge('あなた', 'you'));
  if (p.isHost) li.append(badge('ホスト', 'host'));
  if (!p.connected) li.append(badge('切断中', 'off'));
  return li;
}

function renderLobby() {
  $('[data-testid="room-code"]').textContent = view.code;
  $('[data-testid="lobby-count"]').textContent = String(view.players.length);
  const list = $('#lobby-players');
  list.replaceChildren(...view.players.map((p) => playerRow(p)));
  const btn = $('#btn-start');
  btn.disabled = !view.canStart;
  const n = view.players.length;
  let hint = '';
  if (view.you === view.hostId) {
    hint = n < 2 ? '2人以上そろうと開始できます' : `${n}人で開始できます`;
  } else {
    hint = 'ホストが開始するまで待ってください';
  }
  $('#lobby-hint').textContent = hint;
}

function renderScoreboard() {
  const sorted = [...view.players].sort((a, b) => b.score - a.score);
  const items = sorted.map((p) => {
    const cls = [];
    if (p.id === view.buzzerId) cls.push('is-buzzer');
    if (p.eliminated) cls.push('is-out');
    if (!p.connected) cls.push('is-off');
    const li = playerRow(p, cls.join(' '));
    const score = document.createElement('span');
    score.className = `score${p.score < 0 ? ' minus' : ''}`;
    score.textContent = String(p.score);
    li.append(score);
    return li;
  });
  $('#scoreboard').replaceChildren(...items);
}

function renderGame() {
  const shown = Math.min(view.qNo + 1, view.total);
  $('[data-testid="progress"]').textContent = `${shown} / ${view.total}`;
  $('[data-testid="room-chip"]').textContent = `部屋 ${view.code}`;
  renderScoreboard();

  const q = view.question;
  $('#question-text').textContent = q ? q.text : '';
  const choiceEls = document.querySelectorAll('.choice');
  choiceEls.forEach((el, i) => {
    el.querySelector('b').textContent = q ? q.choices[i] : '';
    el.className = 'choice';
    el.disabled = !view.canAnswer;
    if (view.reveal && view.reveal.answer === i) el.classList.add('is-correct');
  });

  const buzzer = $('#buzzer');
  const label = $('#buzzer-label');
  const me = view.players.find((p) => p.id === view.you);
  const buzzerName = view.players.find((p) => p.id === view.buzzerId)?.name ?? '';
  buzzer.classList.toggle('is-mine', view.canAnswer);
  buzzer.disabled = !view.canBuzz;
  if (view.phase === 'reveal') {
    label.textContent = '次へ…';
  } else if (view.canAnswer) {
    label.textContent = 'あなたが回答中';
  } else if (view.buzzerId) {
    label.textContent = `${buzzerName}が回答中`;
  } else if (me && me.eliminated) {
    label.textContent = 'お休み';
  } else if (view.canBuzz) {
    label.textContent = '押す！';
  } else {
    label.textContent = '準備中';
  }

  const status = $('#status');
  if (view.phase === 'reveal') {
    status.textContent = view.reveal.headline;
  } else if (view.canAnswer) {
    status.textContent = 'あなたが回答権を取りました！ 10秒以内に選んでください';
  } else if (view.buzzerId) {
    status.textContent = `${buzzerName}さんが回答中`;
  } else if (view.canBuzz) {
    status.textContent = '押せる人は今すぐ押して！';
  } else {
    status.textContent = 'この問題はお休み中です';
  }
  $('#notice').textContent = view.notice || '';
  tick();
}

function renderResult() {
  const items = view.ranking.map((p, i) => {
    const li = playerRow(p);
    li.prepend(Object.assign(document.createElement('span'), { className: 'rank', textContent: String(i + 1) }));
    const score = document.createElement('span');
    score.className = `score${p.score < 0 ? ' minus' : ''}`;
    score.textContent = `${p.score}点`;
    li.append(score);
    return li;
  });
  $('#ranking').replaceChildren(...items);
}

function render() {
  if (!view) return;
  if (view.phase === 'lobby') {
    showScreen('lobby');
    renderLobby();
  } else if (view.phase === 'finished') {
    showScreen('result');
    renderResult();
  } else {
    showScreen('game');
    renderGame();
  }
}

// 残り時間の表示（サーバー時刻に合わせて毎秒より細かく更新）
function tick() {
  if (!view) return;
  const now = Date.now() + offsetMs;
  const timer = $('#timer');
  const bar = $('#bar-fill');
  let left = null;
  let total = 1;
  if (view.phase === 'question') {
    if (view.answerEndMs != null) {
      left = view.answerEndMs - now;
      total = ANSWER_MS;
    } else if (view.questionEndMs != null) {
      left = view.questionEndMs - now;
      total = QUESTION_MS;
    }
  } else if (view.phase === 'reveal' && view.reveal) {
    left = view.reveal.untilMs - now;
    total = REVEAL_MS;
  }
  if (left === null) {
    timer.textContent = '--';
    timer.classList.remove('urgent');
    bar.style.width = '0%';
    return;
  }
  const sec = Math.max(0, Math.ceil(left / 1000));
  timer.textContent = `${sec}秒`;
  timer.classList.toggle('urgent', view.phase === 'question' && left <= 3000);
  bar.style.width = `${Math.max(0, Math.min(100, (left / total) * 100))}%`;
}
setInterval(tick, 100);

$('#buzzer').addEventListener('click', () => send({ type: 'buzz' }));
document.querySelectorAll('.choice').forEach((el) => {
  el.addEventListener('click', () => send({ type: 'answer', choice: Number(el.dataset.choice) }));
});
$('#btn-start').addEventListener('click', () => send({ type: 'start' }));
$('#btn-leave-lobby').addEventListener('click', leaveRoom);
$('#btn-leave-game').addEventListener('click', leaveRoom);
$('#btn-home').addEventListener('click', leaveRoom);

// 起動時：前回の部屋に入っていたら同じ席へ戻る
if (session) {
  showScreen('lobby');
  reconnect();
} else {
  showScreen('home');
}
