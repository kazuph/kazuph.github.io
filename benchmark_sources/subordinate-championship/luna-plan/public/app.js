const SESSION_KEY = 'quickbell-player';
const LETTERS = ['A', 'B', 'C', 'D'];
const app = document.querySelector('#app');

let identity = readIdentity();
let game = null;
let connected = false;
let connectionStatus = identity ? 'connecting' : 'idle';
let socket = null;
let reconnectTimer = null;
let serverOffset = 0;
let pendingBuzz = false;
let message = '';

render();
if (identity) connect();
window.setInterval(updateTimer, 200);

window.addEventListener('offline', () => {
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  connected = false;
  connectionStatus = 'offline';
  render();
});

window.addEventListener('online', () => {
  window.clearTimeout(reconnectTimer);
  if (identity) connect();
});

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || isTypingTarget(event.target)) return;
  if (!canBuzz()) return;
  event.preventDefault();
  sendBuzz();
});

function render() {
  if (!identity) {
    renderEntry();
    return;
  }
  if (!game) {
    app.innerHTML = `<section class="surface-panel loading-panel" aria-live="polite">
      <p class="eyebrow">ROOM ${escapeHtml(identity.code)}</p>
      <h1 class="page-title">${connectionStatus === 'offline' ? 'オフラインです' : '部屋に接続しています'}</h1>
      <p class="intro-copy">${connectionStatus === 'offline' ? 'ネットワークが戻ると自動で再接続します。' : '参加情報を確認しています。少しお待ちください。'}</p>
    </section>`;
    return;
  }

  if (game.phase === 'lobby') renderLobby();
  else if (game.phase === 'finished') renderResults();
  else renderGame();
  updateTimer();
}

function renderEntry() {
  app.innerHTML = `<div class="entry-layout">
    <section class="intro">
      <p class="eyebrow">REAL-TIME QUIZ BATTLE</p>
      <h1>いちばん早く、<br>答えにたどり着こう。</h1>
      <p class="intro-copy">部屋に集まった仲間と、全10問の早押し勝負。ひらめきと一瞬の判断で、今日のチャンピオンを決めよう。</p>
      <div class="feature-line"><span class="feature-chip">最大4人</span><span class="feature-chip">全10問</span><span class="feature-chip">リアルタイム対戦</span></div>
    </section>
    <section class="entry-panel" aria-labelledby="entry-title">
      <p class="eyebrow">LET'S PLAY</p>
      <h2 id="entry-title">クイズに参加する</h2>
      <label class="field-label" for="player-name">プレイヤー名</label>
      <input id="player-name" class="text-input" autocomplete="nickname" placeholder="名前を入力" />
      <div class="entry-actions">
        <button id="create-room" class="button button-primary" type="button">部屋を作る</button>
        <div class="divider">または</div>
        <div class="join-row">
          <input id="room-code" class="text-input" aria-label="部屋コード" placeholder="部屋コード" autocomplete="off" maxlength="6" />
          <button id="join-room" class="button button-secondary" type="button">参加する</button>
        </div>
      </div>
      <p class="message" id="entry-message" aria-live="polite">${escapeHtml(message)}</p>
    </section>
  </div>`;

  document.querySelector('#create-room').addEventListener('click', () => enterRoom('create'));
  document.querySelector('#join-room').addEventListener('click', () => enterRoom('join'));
  document.querySelector('#room-code').addEventListener('input', (event) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
}

function renderLobby() {
  const players = game.players.map((player) => playerRow(player, true)).join('');
  const emptySeats = Array.from({ length: 4 - game.players.length }, (_, index) => `
    <li class="empty-seat"><span class="avatar">＋</span><span>参加者を待っています</span><span class="connection">空席</span></li>`).join('');
  const host = game.players.find((player) => player.host);
  const canStart = host?.id === game.you && game.players.length >= 2 && game.players.length <= 4 && connected;
  app.innerHTML = `<div class="lobby-header">
    <div><p class="page-kicker">ROOM LOBBY</p><h1 class="page-title">対戦ルーム</h1></div>
    <div class="room-pill"><span class="room-code" data-testid="room-code">${escapeHtml(game.code)}</span><span class="count-pill">${game.players.length} / 4 人</span></div>
  </div>
  ${connectionBanner()}
  ${actionFeedback()}
  <div class="lobby-layout">
    <section class="surface-panel">
      <div class="panel-title-row"><h2>参加プレイヤー</h2><span class="count-pill">${game.players.length}人参加中</span></div>
      <ul class="player-list">${players}${emptySeats}</ul>
    </section>
    <section class="surface-panel">
      <div class="panel-title-row"><h2>ゲームのルール</h2></div>
      <ol class="rules-list">
        <li><span class="rule-number">01</span><span>早押しで回答権を獲得。回答時間は最大10秒です。</span></li>
        <li><span class="rule-number">02</span><span>正解で＋10点、不正解や時間切れは−5点。</span></li>
        <li><span class="rule-number">03</span><span>1問は最大20秒。全10問の合計点で順位が決まります。</span></li>
      </ol>
    </section>
  </div>
  <div class="lobby-footer">
    <p class="lobby-note">${host?.id === game.you ? '<strong>ホストです。</strong> 2〜4人そろったら開始できます。' : `${escapeHtml(host?.name ?? 'ホスト')}さんが開始するのを待っています。`}</p>
    ${host?.id === game.you ? `<button id="start-game" class="button button-primary" ${canStart ? '' : 'disabled'}>クイズを開始</button>` : ''}
  </div>`;
  document.querySelector('#start-game')?.addEventListener('click', () => send({ t: 'start' }));
}

function renderGame() {
  const answering = game.phase === 'answering';
  const revealing = game.phase === 'reveal';
  const answerer = game.players.find((player) => player.id === game.answererId);
  const alreadyOut = game.eliminated.includes(game.you);
  const canAnswer = answering && game.answererId === game.you && connected;
  const choices = game.question?.choices ?? [];
  const options = choices.map((choice, index) => {
    const correct = revealing && index === game.correctChoice;
    const enabled = canAnswer;
    return `<button class="choice-button ${correct ? 'is-correct' : ''}" data-choice="${index}" ${enabled ? '' : 'disabled'}>
      <span class="choice-key">${LETTERS[index]}</span><span>${escapeHtml(choice)}</span>
    </button>`;
  }).join('');
  const callout = answering
    ? `<span><strong>${escapeHtml(answerer?.name ?? 'プレイヤー')}</strong>さんが回答中</span>`
    : revealing
      ? `<span class="answer-callout revealed">正解は「${escapeHtml(choices[game.correctChoice] ?? '')}」</span>`
      : alreadyOut
        ? '<span>この問題は回答済みです</span>'
        : '<span>早押しボタンを押して回答権を獲得しよう</span>';
  const buzzerEnabled = canBuzz() && !pendingBuzz;
  const scoreRows = game.players.map((player) => `
    <li class="score-row ${player.id === game.answererId ? 'active' : ''}" data-player="${escapeHtml(player.id)}">
      <span class="rank-number">${player.rank}</span><span class="score-person"><span class="score-name">${escapeHtml(player.name)}</span><span class="player-meta connection ${player.connected ? '' : 'offline'}" data-testid="connection-status">${player.connected ? '接続中' : '接続が切れています'}</span></span>
      <span class="score-value">${player.score}<span class="score-unit">点</span></span>
    </li>`).join('');
  app.innerHTML = `<div class="game-header">
    <div><p class="page-kicker">ROOM ${escapeHtml(game.code)}</p><h1 class="page-title">クイズ対戦</h1></div>
    <span class="count-pill">${game.players.length}人で対戦中</span>
  </div>
  ${connectionBanner()}
  ${actionFeedback()}
  <div class="game-layout">
    <section class="game-board" aria-label="クイズ" data-phase="${game.phase}" data-question-number="${game.questionNumber}">
      <div class="game-progress-head"><span>QUESTION ${game.questionNumber} <span>/ 10</span></span><span id="timer-value" class="timer-value" data-testid="remaining-time"></span></div>
      <div class="timer-track" role="progressbar" aria-label="残り時間"><div id="timer-fill" class="timer-fill"></div></div>
      <p class="question-number">第 ${game.questionNumber} 問</p>
      <h2 class="question-prompt" data-testid="question-prompt">${escapeHtml(game.question?.prompt ?? '問題を読み込んでいます')}</h2>
      <div class="choices">${options}</div>
      <p class="answer-callout ${revealing ? 'revealed' : ''}" data-testid="answer-status">${callout}</p>
      <div class="buzzer-wrap"><button id="buzzer" class="buzzer" data-testid="buzzer" ${buzzerEnabled ? '' : 'disabled'}>早押し</button></div>
      <p class="buzzer-note">スペースキーでも押せます</p>
    </section>
    <aside class="surface-panel scoreboard" aria-label="得点">
      <div class="panel-title-row"><h2>スコア</h2><span class="count-pill">${game.players.length}人</span></div>
      <ol class="player-list">${scoreRows}</ol>
    </aside>
  </div>`;
  document.querySelector('#buzzer').addEventListener('click', sendBuzz);
  document.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => send({ t: 'answer', q: game.questionNumber, choice: Number(button.dataset.choice) }));
  });
}

function renderResults() {
  const rows = game.players.map((player) => `
    <li class="result-row"><span class="result-rank">${player.rank}<span>位</span></span>
      <span class="result-name">${escapeHtml(player.name)}</span><strong class="result-score">${player.score}<span>点</span></strong>
    </li>`).join('');
  app.innerHTML = `<section class="result-header"><div><p class="page-kicker">FINAL RESULTS</p><h1 class="page-title">全10問、おつかれさま！</h1></div><span class="count-pill">ROOM ${escapeHtml(game.code)}</span></section>
    ${connectionBanner()}
    <section class="surface-panel"><div class="panel-title-row"><h2>最終順位</h2><span class="count-pill">同点は同じ順位</span></div><ol class="result-list" data-testid="final-results">${rows}</ol></section>`;
}

function playerRow(player, lobby) {
  const meta = player.host ? 'ホスト' : 'プレイヤー';
  const status = player.connected ? '接続中' : '接続が切れています';
  return `<li class="player-row" data-player="${escapeHtml(player.id)}">
    <span class="avatar">${escapeHtml(firstCharacter(player.name))}</span>
    <span class="player-info"><span class="player-name">${escapeHtml(player.name)}${player.id === game.you ? '（あなた）' : ''}</span>
      <span class="player-meta">${meta}${lobby && player.id === game.you && player.host ? ' · 開始できます' : ''}</span></span>
    <span class="connection ${player.connected ? '' : 'offline'}">${status}</span>
  </li>`;
}

function connectionBanner() {
  if (connected) return '';
  const label = connectionStatus === 'offline' ? 'オフラインです' : '再接続中…';
  return `<p class="connection-banner" role="status">${label} 点数と席は保存されています。</p>`;
}

function actionFeedback() {
  return message ? `<p class="connection-banner" role="alert">${escapeHtml(message)}</p>` : '';
}

async function enterRoom(action) {
  const name = document.querySelector('#player-name').value.trim();
  if (!name) return showEntryMessage('プレイヤー名を入力してください。');
  const code = document.querySelector('#room-code').value.trim().toUpperCase();
  if (action === 'join' && !code) return showEntryMessage('部屋コードを入力してください。');
  setEntryBusy(true);
  showEntryMessage('部屋に接続しています…');
  try {
    const endpoint = action === 'create' ? '/api/rooms' : `/api/rooms/${encodeURIComponent(code)}/join`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? '部屋に参加できませんでした。');
    identity = { code: result.code, id: result.id, token: result.token };
    localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
    connectionStatus = 'connecting';
    message = '';
    render();
    connect();
  } catch (error) {
    setEntryBusy(false);
    showEntryMessage(error instanceof Error ? error.message : '通信できませんでした。もう一度お試しください。');
  }
}

function connect() {
  if (!identity || navigator.onLine === false) {
    connectionStatus = 'offline';
    connected = false;
    render();
    return;
  }
  window.clearTimeout(reconnectTimer);
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  connectionStatus = 'connecting';
  const url = new URL(`/api/rooms/${identity.code}/ws`, location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', identity.token);
  const currentSocket = new WebSocket(url);
  socket = currentSocket;
  currentSocket.addEventListener('open', () => {
    connected = true;
    connectionStatus = 'connected';
    render();
  });
  currentSocket.addEventListener('message', (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.t === 'error') {
      pendingBuzz = false;
      message = data.message;
      if (game) render();
      return;
    }
    if (data.t !== 'state' || data.you !== identity.id) return;
    game = data;
    serverOffset = data.serverNow - Date.now();
    pendingBuzz = false;
    connected = true;
    connectionStatus = 'connected';
    message = '';
    render();
  });
  currentSocket.addEventListener('close', () => {
    if (socket !== currentSocket) return;
    connected = false;
    pendingBuzz = false;
    connectionStatus = navigator.onLine === false ? 'offline' : 'reconnecting';
    render();
    if (navigator.onLine !== false) reconnectTimer = window.setTimeout(connect, 1000);
  });
  currentSocket.addEventListener('error', () => currentSocket.close());
}

function send(event) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(event));
}

function sendBuzz() {
  if (!canBuzz() || pendingBuzz) return;
  pendingBuzz = true;
  send({ t: 'buzz', q: game.questionNumber });
  const buzzer = document.querySelector('#buzzer');
  if (buzzer) buzzer.disabled = true;
}

function canBuzz() {
  return Boolean(game && game.phase === 'question' && connected && !game.eliminated.includes(game.you));
}

function updateTimer() {
  if (!game) return;
  const value = document.querySelector('#timer-value');
  const fill = document.querySelector('#timer-fill');
  if (!value || !fill) return;
  const target = game.phase === 'answering' ? game.answerDeadline
    : game.phase === 'reveal' ? game.revealUntil : game.questionDeadline;
  if (target === null || target === undefined) {
    value.textContent = '';
    fill.style.width = '0%';
    return;
  }
  const serverNow = Date.now() + serverOffset;
  const remaining = Math.max(0, target - serverNow);
  value.textContent = `${Math.ceil(remaining / 1000)}秒`;
  const duration = game.phase === 'answering' ? 10_000 : game.phase === 'reveal' ? 3_000 : 20_000;
  fill.style.width = `${Math.min(100, remaining / duration * 100)}%`;
  value.dataset.seconds = String(Math.ceil(remaining / 1000));
}

function setEntryBusy(busy) {
  document.querySelector('#create-room').disabled = busy;
  document.querySelector('#join-room').disabled = busy;
}

function showEntryMessage(text) {
  message = text;
  const target = document.querySelector('#entry-message');
  if (target) target.textContent = text;
}

function readIdentity() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (typeof saved?.code === 'string' && typeof saved?.id === 'string' && typeof saved?.token === 'string') return saved;
  } catch {}
  return null;
}

function firstCharacter(value) {
  return [...value][0] ?? '？';
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
