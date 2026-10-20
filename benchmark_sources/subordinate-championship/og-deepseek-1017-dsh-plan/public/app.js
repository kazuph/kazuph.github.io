/**
 * 画面の描画とWebSocketのやり取り。
 *
 * - サーバーから届く `state` をそのまま描画する。点数の計算や正誤判定はしない。
 * - `serverNow` との差から残り時間を出し、端末の時計がずれても全員同じ値にする。
 * - `{ code, playerId, token }` を localStorage に残し、再読み込みで復帰する。
 */

const STORAGE_KEY = "buzzer-quiz-session";
const MAX_JOIN_RETRY_BEFORE_GIVEUP = 8;

const $ = (id) => document.getElementById(id);

const el = {
  screens: {
    loading: $("screen-loading"),
    entry: $("screen-entry"),
    lobby: $("screen-lobby"),
    game: $("screen-game"),
    result: $("screen-result"),
  },
  connectionBadge: $("connection-badge"),
  toast: $("toast"),
  nameInput: $("name-input"),
  codeInput: $("code-input"),
  createBtn: $("create-btn"),
  joinBtn: $("join-btn"),
  entryError: $("entry-error"),
  lobbyCode: $("lobby-code"),
  lobbyPlayers: $("lobby-players"),
  lobbyStatus: $("lobby-status"),
  startBtn: $("start-btn"),
  leaveBtn: $("leave-btn"),
  qNum: $("q-num"),
  qTotal: $("q-total"),
  timerBar: $("timer-bar"),
  timerText: $("timer-text"),
  questionText: $("question-text"),
  choices: $("choices"),
  gameStatus: $("game-status"),
  buzzBtn: $("buzz-btn"),
  buzzLabel: $("buzz-label"),
  buzzSub: $("buzz-sub"),
  scoreList: $("score-list"),
  resultTitle: $("result-title"),
  resultList: $("result-list"),
  resultLeaveBtn: $("result-leave-btn"),
};

const app = {
  ws: null,
  session: null,
  state: null,
  offset: 0,
  connected: false,
  reconnectTimer: null,
  reconnectDelay: 1000,
  failCount: 0,
  pendingBuzz: false,
  lastChoice: null,
};

/* ---------- 小物 ---------- */

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function showScreen(name) {
  for (const [key, node] of Object.entries(el.screens)) {
    node.hidden = key !== name;
  }
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.toast.hidden = true;
  }, 2600);
}

function setEntryError(message) {
  if (message) {
    el.entryError.textContent = message;
    el.entryError.hidden = false;
  } else {
    el.entryError.hidden = true;
  }
}

function setBusy(busy) {
  el.createBtn.disabled = busy;
  el.joinBtn.disabled = busy;
}

function send(payload) {
  if (app.ws && app.ws.readyState === WebSocket.OPEN) {
    app.ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

/* ---------- セッション ---------- */

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* 保存できなくても続行する */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- 接続 ---------- */

function startSession(session) {
  app.session = session;
  app.state = null;
  app.offset = 0;
  app.failCount = 0;
  saveSession(session);
  showScreen("loading");
  connect();
}

function connect() {
  if (!app.session) return;
  clearTimeout(app.reconnectTimer);
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url =
    `${protocol}//${location.host}/api/rooms/${encodeURIComponent(app.session.code)}` +
    `/ws?token=${encodeURIComponent(app.session.token)}`;

  let ws;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  app.ws = ws;

  ws.addEventListener("open", () => {
    if (app.ws !== ws) return;
    app.connected = true;
    app.reconnectDelay = 1000;
    updateConnectionBadge();
  });

  ws.addEventListener("message", (event) => {
    if (app.ws !== ws) return;
    handleMessage(event.data);
  });

  ws.addEventListener("close", () => {
    if (app.ws !== ws) return;
    app.ws = null;
    app.connected = false;
    updateConnectionBadge();
    if (!app.session) return;
    if (!app.state && app.failCount >= MAX_JOIN_RETRY_BEFORE_GIVEUP) {
      giveUp();
      return;
    }
    app.failCount += 1;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  clearTimeout(app.reconnectTimer);
  app.reconnectTimer = setTimeout(connect, app.reconnectDelay);
  app.reconnectDelay = Math.min(Math.round(app.reconnectDelay * 1.5), 5000);
}

function giveUp() {
  clearSession();
  app.session = null;
  app.state = null;
  app.connected = false;
  updateConnectionBadge();
  showScreen("entry");
  setEntryError("部屋に接続できませんでした。もう一度入り直してください。");
}

function updateConnectionBadge() {
  const show = Boolean(app.session) && !app.connected;
  el.connectionBadge.hidden = !show;
  document.body.dataset.connected = app.connected ? "1" : "0";
}

function handleMessage(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }
  if (message.t === "state") {
    app.failCount = 0;
    app.state = message;
    app.offset = message.serverNow - Date.now();
    app.pendingBuzz = false;
    render();
  } else if (message.t === "error") {
    showToast(message.message);
  }
}

/* ---------- 描画 ---------- */

function render() {
  const state = app.state;
  if (!state) return;
  document.body.dataset.phase = state.phase;
  document.body.dataset.you = state.you;
  document.body.dataset.answering = state.answeringPlayerId ?? "";
  if (state.phase === "lobby") {
    renderLobby(state);
    showScreen("lobby");
  } else if (state.phase === "finished") {
    renderResult(state);
    showScreen("result");
  } else {
    renderGame(state);
    showScreen("game");
  }
}

function renderLobby(state) {
  el.lobbyCode.textContent = state.code;
  el.lobbyPlayers.innerHTML = "";
  for (let index = 0; index < state.maxPlayers; index += 1) {
    const player = state.players[index];
    const item = document.createElement("li");
    item.className = "lobby-player";
    if (!player) {
      item.classList.add("is-empty");
      item.innerHTML = '<span class="avatar">+</span><span class="player-name">空き</span>';
      el.lobbyPlayers.appendChild(item);
      continue;
    }
    if (player.id === state.you) item.classList.add("is-me");
    const tags = [];
    if (player.isHost) tags.push('<span class="tag host">ホスト</span>');
    if (player.id === state.you) tags.push('<span class="tag">あなた</span>');
    if (!player.connected) tags.push('<span class="tag offline">接続が切れています</span>');
    item.innerHTML =
      `<span class="avatar">${escapeHtml(player.name.slice(0, 1))}</span>` +
      `<span class="player-name">${escapeHtml(player.name)}</span>${tags.join("")}`;
    el.lobbyPlayers.appendChild(item);
  }

  const isHost = state.you === state.hostId;
  el.startBtn.hidden = !isHost;
  el.startBtn.disabled = state.players.length < state.minPlayers;
  el.startBtn.textContent =
    state.players.length < state.minPlayers
      ? `あと${state.minPlayers - state.players.length}人で開始`
      : "ゲーム開始";
  el.lobbyStatus.textContent = isHost
    ? state.players.length < state.minPlayers
      ? "2人以上でゲームを開始できます"
      : "みんなそろったら開始しよう！"
    : "ホストが開始するのを待っています…";
}

function renderGame(state) {
  const me = state.players.find((player) => player.id === state.you);
  const isAnswering = state.answeringPlayerId === state.you;
  const canAnswer = state.phase === "answering" && isAnswering;
  const answeringPlayer = state.players.find((player) => player.id === state.answeringPlayerId);

  document.body.dataset.mineAnswering = isAnswering ? "1" : "0";
  el.qNum.textContent = String(state.questionIndex + 1);
  el.qTotal.textContent = String(state.totalQuestions);
  el.questionText.textContent = state.question ? state.question.text : "";

  el.choices.querySelectorAll(".choice").forEach((button) => {
    const index = Number(button.dataset.index);
    button.querySelector(".choice-text").textContent = state.question
      ? state.question.choices[index]
      : "";
    button.classList.toggle("correct", state.correctIndex === index);
    button.classList.toggle(
      "wrong",
      state.correctIndex !== null && app.lastChoice === index && state.correctIndex !== index,
    );
    button.disabled = !canAnswer;
  });

  renderScoreList(state);

  let status = "";
  let statusClass = "";
  let buzzEnabled = false;
  let buzzLabel = "早押し！";
  let buzzSub = "スペースキー";

  if (state.phase === "question") {
    if (me && me.lockedOut) {
      buzzLabel = "この問題は回答済み";
      status = "この問題ではもう押せません";
    } else if (app.pendingBuzz) {
      buzzLabel = "判定中…";
      status = "早押しを判定しています…";
    } else {
      buzzEnabled = app.connected;
      status = "問題が表示されました。早押しボタンを押そう！";
    }
  } else if (state.phase === "answering") {
    statusClass = "answering";
    if (isAnswering) {
      status = "あなたが回答中！10秒以内に選ぼう";
      buzzLabel = "回答してください";
    } else {
      status = `${answeringPlayer ? answeringPlayer.name : "だれか"}さんが回答中…`;
      buzzLabel = "ほかの人が回答中";
    }
  } else if (state.phase === "reveal") {
    statusClass = "correct";
    const correctText =
      state.correctIndex !== null && state.question
        ? state.question.choices[state.correctIndex]
        : "";
    status = `正解は「${correctText}」`;
    buzzLabel = "正解発表";
  }

  el.gameStatus.textContent = status;
  el.gameStatus.className = statusClass ? `game-status ${statusClass}` : "game-status";
  el.buzzBtn.disabled = !buzzEnabled;
  el.buzzLabel.textContent = buzzLabel;
  el.buzzSub.textContent = buzzSub;
  updateTimer();
}

function renderScoreList(state) {
  el.scoreList.innerHTML = "";
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  for (const player of sorted) {
    const item = document.createElement("li");
    item.className = "score-item";
    if (player.id === state.you) item.classList.add("is-me");
    if (player.id === state.answeringPlayerId) item.classList.add("answering");
    if (!player.connected) item.classList.add("offline");
    const chips = [];
    if (player.isHost) chips.push('<span class="chip host">ホスト</span>');
    if (player.id === state.answeringPlayerId) chips.push('<span class="chip answering">回答中</span>');
    if (player.lockedOut) chips.push('<span class="chip locked">回答済み</span>');
    if (!player.connected) chips.push('<span class="chip offline">接続が切れています</span>');
    item.innerHTML =
      `<span class="score-name">${escapeHtml(player.name)}` +
      `${player.id === state.you ? " (あなた)" : ""}</span>` +
      `<span class="score-points">${player.score}<small>点</small></span>` +
      `<span class="score-meta">${chips.join("")}</span>`;
    el.scoreList.appendChild(item);
  }
}

function renderResult(state) {
  el.resultList.innerHTML = "";
  const ranking = state.ranking ?? [];
  for (const entry of ranking) {
    const item = document.createElement("li");
    item.className = "result-item";
    if (entry.rank === 1) item.classList.add("first");
    else if (entry.rank === 2) item.classList.add("second");
    else if (entry.rank === 3) item.classList.add("third");
    if (entry.id === state.you) item.classList.add("is-me");
    item.innerHTML =
      `<span class="rank-badge">${entry.rank}</span>` +
      `<span class="result-name">${escapeHtml(entry.name)}` +
      `${entry.id === state.you ? " (あなた)" : ""}</span>` +
      `<span class="result-score">${entry.score}<small>点</small></span>`;
    el.resultList.appendChild(item);
  }
  const winner = ranking[0];
  el.resultTitle.textContent = winner ? `${winner.name} さんの優勝！` : "結果発表";
}

/* ---------- 残り時間 ---------- */

function currentDeadline() {
  const state = app.state;
  if (!state) return null;
  if (state.phase === "question") return state.questionDeadline;
  if (state.phase === "answering") return state.answeringDeadline;
  if (state.phase === "reveal") return state.revealDeadline;
  return null;
}

function phaseDuration() {
  const state = app.state;
  if (!state) return 1;
  if (state.phase === "reveal") return 3000;
  if (state.phase === "answering") return 10000;
  return 20000;
}

function updateTimer() {
  const state = app.state;
  const deadline = currentDeadline();
  if (!state || deadline === null) return;
  const remaining = Math.max(0, deadline - (Date.now() + app.offset));
  const ratio = Math.max(0, Math.min(1, remaining / phaseDuration()));
  el.timerBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  el.timerBar.classList.toggle("low", remaining <= 5000);
  el.timerText.textContent = (remaining / 1000).toFixed(1);
}

/* ---------- 操作 ---------- */

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "エラーが発生しました");
  }
  return data;
}

async function onCreate() {
  const name = el.nameInput.value.trim();
  setEntryError(null);
  if (!name) {
    setEntryError("名前を入力してください");
    return;
  }
  setBusy(true);
  try {
    const data = await postJson("/api/rooms", { name });
    startSession({ code: data.code, playerId: data.playerId, token: data.token, name });
  } catch (error) {
    setEntryError(error.message);
  } finally {
    setBusy(false);
  }
}

async function onJoin() {
  const name = el.nameInput.value.trim();
  const code = el.codeInput.value.trim().toUpperCase();
  setEntryError(null);
  if (!name) {
    setEntryError("名前を入力してください");
    return;
  }
  if (code.length !== 6) {
    setEntryError("部屋コードは6文字です");
    return;
  }
  setBusy(true);
  try {
    const data = await postJson(`/api/rooms/${encodeURIComponent(code)}/join`, { name });
    startSession({ code: data.code, playerId: data.playerId, token: data.token, name });
  } catch (error) {
    setEntryError(error.message);
  } finally {
    setBusy(false);
  }
}

function onStart() {
  send({ t: "start" });
}

function onBuzz() {
  const state = app.state;
  if (!state || state.phase !== "question" || app.pendingBuzz) return;
  const me = state.players.find((player) => player.id === state.you);
  if (!me || me.lockedOut || !app.connected) return;
  app.pendingBuzz = true;
  el.buzzBtn.disabled = true;
  el.buzzBtn.classList.add("buzzed");
  el.buzzLabel.textContent = "判定中…";
  el.buzzSub.textContent = "サーバーに送信中";
  const sent = send({ t: "buzz", q: state.questionIndex });
  if (!sent) {
    app.pendingBuzz = false;
    el.buzzBtn.disabled = false;
    el.buzzLabel.textContent = "早押し！";
    el.buzzSub.textContent = "スペースキー";
    showToast("接続中です。少し待ってからもう一度押してください。");
  }
  setTimeout(() => el.buzzBtn.classList.remove("buzzed"), 300);
}

function onAnswer(choice) {
  const state = app.state;
  if (!state || state.phase !== "answering" || state.answeringPlayerId !== state.you) return;
  app.lastChoice = choice;
  const sent = send({ t: "answer", q: state.questionIndex, choice });
  el.choices.querySelectorAll(".choice").forEach((button) => {
    button.disabled = true;
  });
  if (!sent) {
    showToast("接続中です。少し待ってからもう一度選んでください。");
    el.choices.querySelectorAll(".choice").forEach((button) => {
      button.disabled = false;
    });
  }
}

function leave() {
  const ws = app.ws;
  app.ws = null;
  app.session = null;
  app.state = null;
  app.connected = false;
  clearTimeout(app.reconnectTimer);
  clearSession();
  updateConnectionBadge();
  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }
  el.nameInput.value = "";
  el.codeInput.value = "";
  setEntryError(null);
  showScreen("entry");
}

/* ---------- 初期化 ---------- */

el.createBtn.addEventListener("click", onCreate);
el.joinBtn.addEventListener("click", onJoin);
el.startBtn.addEventListener("click", onStart);
el.buzzBtn.addEventListener("click", onBuzz);
el.leaveBtn.addEventListener("click", leave);
el.resultLeaveBtn.addEventListener("click", leave);

el.codeInput.addEventListener("input", () => {
  el.codeInput.value = el.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

el.nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    el.codeInput.focus();
  }
});

el.codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    onJoin();
  }
});

el.choices.addEventListener("click", (event) => {
  const button = event.target.closest(".choice");
  if (!button) return;
  onAnswer(Number(button.dataset.index));
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  const tag = document.activeElement ? document.activeElement.tagName : "";
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (document.body.dataset.phase !== "question") return;
  event.preventDefault();
  onBuzz();
});

window.addEventListener("online", () => {
  app.reconnectDelay = 1000;
  if (app.session && !app.ws) connect();
});

window.addEventListener("offline", () => {
  if (app.ws) {
    try {
      app.ws.close();
    } catch {
      /* ignore */
    }
  }
});

setInterval(() => {
  if (app.state && (app.state.phase === "question" || app.state.phase === "answering" || app.state.phase === "reveal")) {
    updateTimer();
  }
}, 80);

app.session = loadSession();
if (app.session) {
  updateConnectionBadge();
  showScreen("loading");
  connect();
} else {
  showScreen("entry");
}
