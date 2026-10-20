/**
 * 画面の制御。ビルドなしの素の JavaScript。
 * サーバーから届く state をそのまま描画し、入力（start / buzz / answer）だけを送る。
 * 正誤判定や点数は一切ここでは決めない。
 */
const SESSION_KEY = "buzzerQuizSession";
const NAME_KEY = "buzzerQuizName";
const QUESTION_TIME_MS = 20_000;
const ANSWER_TIME_MS = 10_000;
const REVEAL_TIME_MS = 3_000;

const el = (id) => document.getElementById(id);

const screens = {
  entry: el("screen-entry"),
  lobby: el("screen-lobby"),
  game: el("screen-game"),
  result: el("screen-result"),
};

const nameInput = el("name-input");
const codeInput = el("code-input");
const createButton = el("create-button");
const joinButton = el("join-button");
const entryError = el("entry-error");

const roomCodeEl = el("room-code");
const copyButton = el("copy-button");
const lobbyCount = el("lobby-count");
const lobbyPlayers = el("lobby-players");
const lobbyNote = el("lobby-note");
const startButton = el("start-button");
const leaveButton = el("leave-button");

const roundLabel = el("round-label");
const timerLabel = el("timer-label");
const timerBar = el("timer-bar");
const questionText = el("question-text");
const choicesEl = el("choices");
const buzzButton = el("buzz-button");
const buzzHint = el("buzz-hint");
const gamePlayers = el("game-players");
const messageOverlay = el("message-overlay");

const rankingEl = el("ranking");
const resultLeaveButton = el("result-leave-button");

const connectionBanner = el("connection-banner");
const toast = el("toast");

let session = null;
let socket = null;
let state = null;
let serverOffsetMs = 0;
let reconnectDelay = 1000;
let reconnectTimer = null;
let toastTimer = null;
let leaving = false;

const choiceButtons = [];

/* ---------- 保存 ---------- */

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value && value.code && value.token && value.playerId) return value;
  } catch {
    // 壊れた保存は無視
  }
  return null;
}

function saveSession(value) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // 保存できなくても続行
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/* ---------- 表示の小物 ---------- */

function showScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== name);
  });
}

function setEntryError(message) {
  if (message) {
    entryError.textContent = message;
    entryError.classList.remove("hidden");
  } else {
    entryError.textContent = "";
    entryError.classList.add("hidden");
  }
}

function setBanner(message) {
  if (message) {
    connectionBanner.textContent = message;
    connectionBanner.classList.remove("hidden");
  } else {
    connectionBanner.classList.add("hidden");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function showOverlay(message, kind) {
  messageOverlay.classList.remove("correct", "wrong");
  if (!message) {
    messageOverlay.classList.add("hidden");
    return;
  }
  messageOverlay.textContent = message;
  if (kind) messageOverlay.classList.add(kind);
  messageOverlay.classList.remove("hidden");
}

/* ---------- 通信 ---------- */

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    // 本文なし
  }
  if (!response.ok) {
    throw new Error((data && data.error) || "通信に失敗しました");
  }
  return data;
}

function connect() {
  if (!session) return;
  if (socket) {
    const old = socket;
    socket = null;
    try {
      old.close();
    } catch {
      // ignore
    }
  }
  setBanner("接続中…");

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url =
    `${proto}//${location.host}/api/rooms/${encodeURIComponent(session.code)}` +
    `/ws?token=${encodeURIComponent(session.token)}`;
  const ws = new WebSocket(url);
  socket = ws;

  ws.addEventListener("open", () => {
    reconnectDelay = 1000;
    setBanner(null);
  });

  ws.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.t === "state") {
      state = message;
      serverOffsetMs = message.serverNow - Date.now();
      render();
    } else if (message.t === "error") {
      showToast(message.message || "エラーが発生しました");
    }
  });

  ws.addEventListener("close", () => {
    if (socket !== ws) return;
    socket = null;
    if (leaving) return;
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    try {
      ws.close();
    } catch {
      // ignore
    }
  });
}

function scheduleReconnect() {
  setBanner("接続が切れました。再接続中…");
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(Math.round(reconnectDelay * 1.5), 5000);
    connect();
  }, reconnectDelay);
}

function send(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

/* ---------- 入口 ---------- */

async function handleCreate() {
  const name = nameInput.value.trim();
  if (!name) {
    setEntryError("なまえを入力してください");
    return;
  }
  createButton.disabled = true;
  setEntryError(null);
  try {
    const data = await apiPost("/api/rooms", { name });
    beginSession(name, { code: data.code, playerId: data.playerId, token: data.token });
  } catch (error) {
    setEntryError(error.message);
  } finally {
    createButton.disabled = false;
  }
}

async function handleJoin() {
  const name = nameInput.value.trim();
  const code = codeInput.value.trim().toUpperCase();
  if (!name) {
    setEntryError("なまえを入力してください");
    return;
  }
  if (code.length < 4) {
    setEntryError("部屋コードを入力してください");
    return;
  }
  joinButton.disabled = true;
  setEntryError(null);
  try {
    const data = await apiPost(`/api/rooms/${encodeURIComponent(code)}/join`, { name });
    beginSession(name, { code: data.code, playerId: data.playerId, token: data.token });
  } catch (error) {
    setEntryError(error.message);
  } finally {
    joinButton.disabled = false;
  }
}

function beginSession(name, value) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore
  }
  session = value;
  saveSession(session);
  showScreen(null);
  connect();
}

function leaveRoom() {
  leaving = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    const old = socket;
    socket = null;
    try {
      old.close();
    } catch {
      // ignore
    }
  }
  session = null;
  state = null;
  clearSession();
  setBanner(null);
  showOverlay(null);
  showScreen("entry");
  setEntryError(null);
  leaving = false;
}

async function resumeSession() {
  setBanner("接続中…");
  let reachable = true;
  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(session.code)}/ws?token=${encodeURIComponent(session.token)}`,
    );
    if (response.status === 403 || response.status === 404) reachable = false;
  } catch {
    // 回線が無いときはそのまま接続を試す
  }
  if (!reachable) {
    clearSession();
    session = null;
    showScreen("entry");
    setBanner(null);
    setEntryError("前回の部屋には戻れませんでした。もう一度入室してください。");
    return;
  }
  connect();
}

/* ---------- 描画 ---------- */

function render() {
  if (!state) return;
  if (state.phase === "lobby") {
    showScreen("lobby");
    renderLobby();
  } else if (state.phase === "finished") {
    showScreen("result");
    renderResult();
  } else {
    showScreen("game");
    renderGame();
  }
}

function renderLobby() {
  roomCodeEl.textContent = state.code;
  lobbyCount.textContent = String(state.players.length);
  lobbyPlayers.innerHTML = "";

  for (let i = 0; i < 4; i += 1) {
    const player = state.players[i];
    const li = document.createElement("li");
    const index = document.createElement("span");
    index.className = "slot-index";
    index.textContent = String(i + 1);
    if (!player) {
      li.className = "player-slot empty";
      const empty = document.createElement("span");
      empty.textContent = "空き";
      li.append(index, empty);
    } else {
      li.className = "player-slot filled";
      const name = document.createElement("span");
      name.textContent = player.name;
      li.append(index, name);
      if (player.id === state.hostId) {
        const tag = document.createElement("span");
        tag.className = "host-tag";
        tag.textContent = "ホスト";
        li.appendChild(tag);
      }
      if (player.id === state.you) {
        const tag = document.createElement("span");
        tag.className = "you-tag";
        tag.textContent = "あなた";
        li.appendChild(tag);
      }
    }
    lobbyPlayers.appendChild(li);
  }

  const isHost = state.you === state.hostId;
  const enough = state.players.length >= 2;
  startButton.classList.toggle("hidden", !isHost);
  startButton.disabled = !enough;
  if (isHost) {
    startButton.textContent = enough ? "ゲーム開始" : "あと1人で開始できます";
    lobbyNote.textContent = enough
      ? "全員そろったら「ゲーム開始」を押そう。"
      : "2人以上で開始できます。友だちを待ちましょう。";
  } else {
    lobbyNote.textContent = "ホストが「ゲーム開始」を押すまで待ちましょう。";
  }
}

function renderGame() {
  const you = state.players.find((p) => p.id === state.you);
  const total = state.totalQuestions || 10;
  roundLabel.textContent = `第${Math.min(state.round + 1, total)}問 / ${total}`;
  questionText.textContent = state.questionText || "";

  choiceButtons.forEach((button, index) => {
    const text = button.querySelector(".choice-text");
    text.textContent = state.choices ? state.choices[index] : "";
    button.classList.remove("correct", "wrong", "answerable", "dim");
    button.disabled = true;

    if (!state.choices) return;
    if (state.phase === "reveal") {
      const isYourWrong =
        state.lastResult &&
        state.lastResult.playerId === state.you &&
        !state.lastResult.correct &&
        state.lastResult.choice === index;
      if (state.correctIndex === index) button.classList.add("correct");
      else if (isYourWrong) button.classList.add("wrong");
      else button.classList.add("dim");
    } else if (state.phase === "answering" && state.answeringId === state.you) {
      button.disabled = false;
      button.classList.add("answerable");
    } else {
      button.classList.add("dim");
    }
  });

  const answeringPlayer = state.players.find((p) => p.id === state.answeringId);
  if (state.phase === "question") {
    if (you && !you.eliminated) {
      buzzButton.disabled = false;
      buzzButton.textContent = "早押し！";
      buzzHint.textContent = "スペースキーでも押せます";
    } else {
      buzzButton.disabled = true;
      buzzButton.textContent = "回答済み";
      buzzHint.textContent = "この問題ではもう押せません";
    }
  } else if (state.phase === "answering") {
    buzzButton.disabled = true;
    buzzButton.textContent = "回答中";
    buzzHint.textContent =
      state.answeringId === state.you
        ? "下の4たくから選んでください"
        : `${answeringPlayer ? answeringPlayer.name : "だれか"}さんが回答中…`;
  } else {
    buzzButton.disabled = true;
    buzzButton.textContent = "正解発表";
    buzzHint.textContent = "次の問題を待っています";
  }

  if (state.phase === "answering") {
    showOverlay(
      state.answeringId === state.you
        ? "あなたが回答中！"
        : `${answeringPlayer ? answeringPlayer.name : "だれか"}さんが回答中`,
    );
  } else if (state.phase === "reveal" && state.lastResult) {
    const resultPlayer = state.players.find((p) => p.id === state.lastResult.playerId);
    const who = resultPlayer ? resultPlayer.name : "だれか";
    if (state.lastResult.correct) {
      showOverlay(`${who}さん 正解！ +${state.lastResult.points}点`, "correct");
    } else {
      showOverlay(`${who}さん 不正解… ${state.lastResult.points}点`, "wrong");
    }
  } else {
    showOverlay(null);
  }

  renderGamePlayers();
}

function renderGamePlayers() {
  gamePlayers.innerHTML = "";
  for (const player of state.players) {
    const li = document.createElement("li");
    li.className = "game-player";
    if (player.id === state.you) li.classList.add("you");
    if (player.id === state.answeringId) li.classList.add("answering");
    if (player.eliminated) li.classList.add("eliminated");
    if (!player.connected) li.classList.add("offline");

    const name = document.createElement("span");
    name.className = "gp-name";
    name.textContent = player.name;
    const score = document.createElement("span");
    score.className = "gp-score";
    score.textContent = `${player.score}点`;
    li.append(name, score);

    if (player.id === state.answeringId) {
      const status = document.createElement("span");
      status.className = "gp-status";
      status.textContent = "回答中";
      li.appendChild(status);
    }
    gamePlayers.appendChild(li);
  }
}

function renderResult() {
  rankingEl.innerHTML = "";
  for (const entry of state.ranking || []) {
    const li = document.createElement("li");
    li.className = "rank-item";
    if (entry.rank === 1) li.classList.add("rank-1");
    if (entry.playerId === state.you) li.classList.add("you");

    const medal = document.createElement("span");
    medal.className = "rank-medal";
    medal.textContent = String(entry.rank);
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = entry.name;
    li.append(medal, name);

    if (entry.playerId === state.you) {
      const tag = document.createElement("span");
      tag.className = "rank-you";
      tag.textContent = "あなた";
      li.appendChild(tag);
    }
    const score = document.createElement("span");
    score.className = "rank-score";
    score.textContent = `${entry.score}点`;
    li.appendChild(score);
    rankingEl.appendChild(li);
  }
}

/* ---------- 時間表示 ---------- */

function updateTimer() {
  if (!state || state.phase === "lobby" || state.phase === "finished") return;
  const now = Date.now() + serverOffsetMs;
  let deadline = null;
  let total = 1;
  if (state.phase === "question") {
    deadline = state.questionDeadline;
    total = QUESTION_TIME_MS;
  } else if (state.phase === "answering") {
    deadline = Math.min(
      state.answerDeadline == null ? Infinity : state.answerDeadline,
      state.questionDeadline == null ? Infinity : state.questionDeadline,
    );
    total = ANSWER_TIME_MS;
  } else if (state.phase === "reveal") {
    deadline = state.revealDeadline;
    total = REVEAL_TIME_MS;
  }
  if (deadline == null || !Number.isFinite(deadline)) return;

  const remaining = Math.max(0, deadline - now);
  timerLabel.textContent = (remaining / 1000).toFixed(1);
  timerBar.style.width = `${Math.max(0, Math.min(100, (remaining / total) * 100))}%`;
  timerBar.classList.toggle("warning", remaining <= total * 0.5 && remaining > total * 0.25);
  timerBar.classList.toggle("danger", remaining <= total * 0.25);
}

/* ---------- 入力 ---------- */

function doBuzz() {
  if (!state || state.phase !== "question") return;
  const you = state.players.find((p) => p.id === state.you);
  if (!you || you.eliminated) return;
  send({ t: "buzz", q: state.round });
}

function onChoice(index) {
  if (!state || state.phase !== "answering" || state.answeringId !== state.you) return;
  send({ t: "answer", q: state.round, choice: index });
}

function setupChoices() {
  const labels = ["A", "B", "C", "D"];
  for (let i = 0; i < 4; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.disabled = true;
    const index = document.createElement("span");
    index.className = "choice-index";
    index.textContent = labels[i];
    const text = document.createElement("span");
    text.className = "choice-text";
    button.append(index, text);
    button.addEventListener("click", () => onChoice(i));
    choicesEl.appendChild(button);
    choiceButtons.push(button);
  }
}

/* ---------- 起動 ---------- */

async function boot() {
  setupChoices();
  try {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nameInput.value = savedName;
  } catch {
    // ignore
  }

  createButton.addEventListener("click", handleCreate);
  joinButton.addEventListener("click", handleJoin);
  leaveButton.addEventListener("click", leaveRoom);
  resultLeaveButton.addEventListener("click", leaveRoom);
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state ? state.code : "");
      showToast("部屋コードをコピーしました");
    } catch {
      showToast("コピーできませんでした");
    }
  });
  startButton.addEventListener("click", () => send({ t: "start" }));
  buzzButton.addEventListener("click", doBuzz);

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleCreate();
  });
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleJoin();
  });
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== " ") return;
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (state && state.phase === "question" && !buzzButton.disabled) {
      event.preventDefault();
      doBuzz();
    }
  });

  window.addEventListener("offline", () => {
    setBanner("オフラインです。再接続を待っています…");
    if (socket) {
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
  });
  window.addEventListener("online", () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectDelay = 1000;
    if (session) connect();
  });

  setInterval(updateTimer, 100);

  const stored = loadSession();
  if (!stored) {
    showScreen("entry");
    return;
  }
  session = stored;
  showScreen(null);
  await resumeSession();
}

boot();
