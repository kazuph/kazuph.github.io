/**
 * 画面の処理。ビルドなしの素の JavaScript。
 * 正誤判定・点数・早押しの順番は一切決めず、サーバーから届いた状態を表示するだけ。
 */
const SESSION_KEY = "buzzer.session.v1";
const NAME_KEY = "buzzer.name.v1";
const PING_INTERVAL_MS = 1000;

const $ = (selector) => document.querySelector(selector);

const screens = {
  entry: $("#screen-entry"),
  lobby: $("#screen-lobby"),
  game: $("#screen-game"),
  result: $("#screen-result"),
};

const el = {
  nameInput: $("#name-input"),
  createBtn: $("#create-room-btn"),
  codeInput: $("#code-input"),
  joinBtn: $("#join-room-btn"),
  entryError: $("#entry-error"),
  toast: $("#toast"),
  banner: $("#reconnect-banner"),
  lobbyCode: $("#lobby-code"),
  copyBtn: $("#copy-code-btn"),
  slots: $("#lobby-slots"),
  lobbyStatus: $("#lobby-status"),
  startBtn: $("#start-btn"),
  leaveBtn: $("#leave-btn"),
  qNumber: $("#q-number"),
  qTotal: $("#q-total"),
  timerValue: $("#timer-value"),
  timerFill: $("#timer-fill"),
  questionText: $("#question-text"),
  choices: [...document.querySelectorAll(".choice")],
  buzzBtn: $("#buzz-btn"),
  gameStatus: $("#game-status"),
  scoreboard: $("#scoreboard"),
  ranking: $("#result-ranking"),
  againBtn: $("#again-btn"),
};

let session = null;
let socket = null;
let latest = null;
let clockOffset = 0;
let reconnectTimer = null;
let reconnectAttempt = 0;
let pingTimer = null;
let tickTimer = null;
let toastTimer = null;
let intentionallyClosed = false;
let queued = [];

/* ---------- 小物 ---------- */

function now() {
  return Date.now() + clockOffset;
}

function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.hidden = key !== name;
  }
  document.body.dataset.screen = name;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.hidden = true;
  }, 5000);
}

function setEntryError(message) {
  if (message) {
    el.entryError.textContent = message;
    el.entryError.hidden = false;
  } else {
    el.entryError.textContent = "";
    el.entryError.hidden = true;
  }
}

function setBanner(message) {
  if (message) {
    el.banner.textContent = message;
    el.banner.hidden = false;
  } else {
    el.banner.hidden = true;
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.code && parsed.token && parsed.playerId) return parsed;
  } catch {
    // 壊れていたら無視
  }
  return null;
}

function saveSession(value) {
  session = value;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    if (value && value.name) localStorage.setItem(NAME_KEY, value.name);
  } catch {
    // 保存できなくても続行
  }
}

function clearSession() {
  session = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // 無視
  }
}

function playerName(id) {
  if (!latest) return "";
  const p = latest.players.find((x) => x.id === id);
  return p ? p.name : "";
}

/* ---------- 通信 ---------- */

function send(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    queued.push(message);
  }
}

function flushQueue() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const items = queued;
  queued = [];
  for (const item of items) socket.send(JSON.stringify(item));
}

function connect() {
  if (!session) return;
  if (socket) {
    intentionallyClosed = true;
    try {
      socket.close();
    } catch {
      // 無視
    }
    socket = null;
  }
  intentionallyClosed = false;

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/api/rooms/${encodeURIComponent(
    session.code,
  )}/ws?token=${encodeURIComponent(session.token)}`;
  const ws = new WebSocket(url);
  socket = ws;
  setBanner(reconnectAttempt > 0 ? "再接続中…" : "接続中…");

  ws.addEventListener("open", () => {
    reconnectAttempt = 0;
    setBanner("");
    flushQueue();
    startPing();
  });

  ws.addEventListener("message", (event) => {
    handleMessage(event.data);
  });

  ws.addEventListener("close", () => {
    if (socket !== ws) return;
    socket = null;
    stopPing();
    if (intentionallyClosed) return;
    if (session) {
      setBanner("再接続中…");
      scheduleReconnect();
    }
  });

  ws.addEventListener("error", () => {
    // close 側でまとめて扱う
  });

  startTick();
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempt, 5000);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ t: "ping" }));
    }
  }, PING_INTERVAL_MS);
}

function stopPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function handleMessage(text) {
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }
  if (message.t === "error") {
    if (message.message) showToast(message.message);
    return;
  }
  if (message.t !== "state") return;
  clockOffset = message.serverNow - Date.now();
  latest = message;

  // サーバーに席がなくなっていたら入口へ戻す
  if (message.you === null && message.phase !== "lobby") {
    clearSession();
    setEntryError("この部屋には入れませんでした");
    showScreen("entry");
    return;
  }
  render();
}

/* ---------- 描画 ---------- */

function render() {
  if (!latest) return;
  const s = latest;
  document.body.dataset.phase = s.phase;
  const me = s.players.find((p) => p.id === s.you);
  document.body.dataset.answerer = s.buzzedBy && s.buzzedBy === s.you ? "true" : "false";

  if (s.phase === "lobby") {
    showScreen("lobby");
    renderLobby(s, me);
  } else if (s.phase === "finished") {
    showScreen("result");
    renderResult(s);
  } else {
    showScreen("game");
    renderGame(s, me);
  }
  updateTimer();
}

function renderLobby(s, me) {
  el.lobbyCode.textContent = s.code;
  el.slots.textContent = "";
  for (let i = 0; i < 4; i += 1) {
    const player = s.players[i];
    const li = document.createElement("li");
    li.className = `slot ${player ? "is-filled" : "is-empty"}`;
    if (player) li.dataset.playerId = player.id;
    const avatar = document.createElement("span");
    avatar.className = "slot-avatar";
    avatar.textContent = player ? player.name.slice(0, 1) : "＋";
    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = player ? player.name : "空き";
    li.append(avatar, name);
    if (player) {
      if (player.isHost) {
        const tag = document.createElement("span");
        tag.className = "slot-tag";
        tag.textContent = "ホスト";
        li.append(tag);
      }
      if (player.id === s.you) {
        const tag = document.createElement("span");
        tag.className = "slot-tag is-self";
        tag.textContent = "あなた";
        li.append(tag);
      }
      if (!player.connected) {
        const tag = document.createElement("span");
        tag.className = "slot-tag is-offline";
        tag.textContent = "切断";
        li.append(tag);
      }
    }
    el.slots.append(li);
  }

  const isHost = s.hostId === s.you;
  el.startBtn.disabled = !s.canStart;
  if (isHost) {
    el.startBtn.textContent = s.canStart ? "ゲームを開始" : `${Math.max(0, 2 - s.players.length)}人以上で開始できます`;
  } else {
    el.startBtn.textContent = "ホストの開始を待っています";
  }

  const names = s.players.map((p) => p.name).join("・");
  el.lobbyStatus.textContent =
    s.players.length < 2
      ? "あと1人以上集まると開始できます（定員4人）"
      : `いま ${s.players.length}人：${names}`;
}

function renderGame(s, me) {
  el.qNumber.textContent = s.questionNumber ?? "-";
  el.qTotal.textContent = s.totalQuestions;
  el.questionText.textContent = s.question ? s.question.text : "……";

  const reveal = s.reveal;
  el.choices.forEach((button, index) => {
    const label = s.question ? s.question.choices[index] : "";
    button.querySelector(".choice-label").textContent = label;
    button.classList.remove("is-correct", "is-wrong", "is-live");
    const canChoose = s.phase === "answering" && s.buzzedBy === s.you;
    button.disabled = !canChoose;
    button.classList.toggle("is-live", canChoose);
    if (reveal && s.question) {
      if (index === reveal.answerIndex) button.classList.add("is-correct");
      if (
        reveal.lastAnswer &&
        reveal.lastAnswer.choice === index &&
        !reveal.lastAnswer.correct
      ) {
        button.classList.add("is-wrong");
      }
    }
  });

  const lockedOut = Boolean(me && me.lockedOut);
  const canBuzz = s.phase === "question" && Boolean(me) && !lockedOut && me.connected;
  el.buzzBtn.disabled = !canBuzz;
  el.buzzBtn.classList.toggle("is-live", canBuzz);

  let status = "";
  let statusClass = "";
  if (s.phase === "question") {
    if (lockedOut) {
      status = "この問題はもう押せません";
    } else {
      status = "早押しボタンを押そう！（スペースキーでもOK）";
    }
  } else if (s.phase === "answering") {
    if (s.buzzedBy === s.you) {
      status = "あなたが回答中！10秒以内に選んでください";
      statusClass = "is-hot";
    } else {
      status = `${playerName(s.buzzedBy)}さんが回答中…`;
    }
  } else if (s.phase === "reveal") {
    const answer = s.question && reveal ? s.question.choices[reveal.answerIndex] : "";
    const who = reveal && reveal.lastAnswer ? playerName(reveal.lastAnswer.playerId) : "";
    if (reveal && reveal.reason === "correct") {
      status = `${who}さん 正解！ +10点（正解：${answer}）`;
      statusClass = "is-correct";
    } else if (reveal && reveal.reason === "all-locked") {
      status = `全員が回答できなくなったので正解を表示（正解：${answer}）`;
    } else if (reveal && reveal.lastAnswer && !reveal.lastAnswer.correct) {
      status = `${who}さんは時間切れ… -5点（正解：${answer}）`;
    } else {
      status = `時間切れ！ 正解は「${answer}」`;
    }
  }
  el.gameStatus.textContent = status;
  el.gameStatus.className = `game-status ${statusClass}`.trim();

  el.scoreboard.textContent = "";
  for (const player of s.players) {
    const li = document.createElement("li");
    li.className = "player-row";
    li.dataset.playerName = player.name;
    li.dataset.playerId = player.id;
    if (player.id === s.you) li.classList.add("is-me");
    if (player.hasAnswerRights) li.classList.add("is-answering");
    if (!player.connected) li.classList.add("is-offline");

    const name = document.createElement("span");
    name.className = "player-name";
    const nameText = document.createElement("span");
    nameText.className = "player-name-text";
    nameText.textContent = player.name;
    name.append(nameText);
    if (player.id === s.you) {
      const you = document.createElement("span");
      you.className = "player-you";
      you.textContent = "あなた";
      name.append(you);
    }

    const score = document.createElement("span");
    score.className = "player-score";
    score.textContent = `${player.score >= 0 ? "+" : ""}${player.score}`;

    li.append(name, score);

    let note = "";
    if (!player.connected) note = "接続が切れています";
    else if (player.hasAnswerRights) note = "回答中";
    else if (lockedOutCheck(s, player.id) && s.phase === "question") note = "この問題は回答済み";
    if (note) {
      const noteEl = document.createElement("span");
      noteEl.className = "player-note";
      noteEl.textContent = note;
      li.append(noteEl);
    }
    el.scoreboard.append(li);
  }
}

function lockedOutCheck(s, playerId) {
  const p = s.players.find((x) => x.id === playerId);
  return Boolean(p && p.lockedOut);
}

function renderResult(s) {
  el.ranking.textContent = "";
  for (const entry of s.ranking ?? []) {
    const li = document.createElement("li");
    li.className = "rank-row";
    li.dataset.rank = String(entry.rank);
    li.dataset.playerName = entry.name;
    if (entry.playerId === s.you) li.classList.add("is-me");

    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.textContent = `${entry.rank}`;

    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = entry.name + (entry.playerId === s.you ? "（あなた）" : "");

    const score = document.createElement("span");
    score.className = "rank-score";
    score.textContent = `${entry.score >= 0 ? "+" : ""}${entry.score}点`;

    li.append(badge, name, score);
    el.ranking.append(li);
  }
}

function updateTimer() {
  if (!latest) return;
  if (document.body.dataset.screen !== "game") return;
  const phase = latest.phase;
  const windowMs = phase === "reveal" ? 3000 : phase === "answering" ? 10000 : 20000;
  const deadline = latest.deadline;
  const remaining = deadline === null ? windowMs : Math.max(0, deadline - now());
  el.timerValue.textContent = (remaining / 1000).toFixed(1);
  const ratio = Math.max(0, Math.min(1, remaining / windowMs));
  el.timerFill.style.width = `${(ratio * 100).toFixed(1)}%`;
  el.timerFill.classList.toggle("is-urgent", remaining <= 5000 && phase !== "reveal");
  el.timerFill.classList.toggle("is-answer", phase === "answering");
  el.timerFill.classList.toggle("is-reveal", phase === "reveal");
}

function startTick() {
  if (tickTimer) return;
  tickTimer = setInterval(updateTimer, 100);
}

/* ---------- 操作 ---------- */

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error((data && data.error) || "サーバーに接続できませんでした");
  }
  return data;
}

async function createRoom() {
  const name = el.nameInput.value.trim();
  setEntryError("");
  if (!name) {
    setEntryError("名前を入れてください");
    return;
  }
  el.createBtn.disabled = true;
  try {
    const data = await api("/api/rooms", { name });
    saveSession({ code: data.code, playerId: data.playerId, token: data.token, name: data.name });
    connect();
  } catch (error) {
    setEntryError(error.message);
  } finally {
    el.createBtn.disabled = false;
  }
}

async function joinRoom() {
  const name = el.nameInput.value.trim();
  const code = el.codeInput.value.trim().toUpperCase();
  setEntryError("");
  if (!name) {
    setEntryError("名前を入れてください");
    return;
  }
  if (code.length !== 6) {
    setEntryError("部屋コードは6文字です");
    return;
  }
  el.joinBtn.disabled = true;
  try {
    const data = await api(`/api/rooms/${encodeURIComponent(code)}/join`, { name });
    saveSession({ code: data.code, playerId: data.playerId, token: data.token, name: data.name });
    connect();
  } catch (error) {
    setEntryError(error.message);
    showToast(error.message);
  } finally {
    el.joinBtn.disabled = false;
  }
}

function leaveRoom() {
  intentionallyClosed = true;
  if (socket) {
    try {
      socket.close();
    } catch {
      // 無視
    }
  }
  socket = null;
  latest = null;
  stopPing();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  clearSession();
  showScreen("entry");
}

function buzz() {
  if (!latest || latest.phase !== "question") return;
  const me = latest.players.find((p) => p.id === latest.you);
  if (!me || me.lockedOut || !me.connected) return;
  send({ t: "buzz", q: latest.questionIndex });
  el.buzzBtn.disabled = true;
  el.buzzBtn.classList.remove("is-live");
}

function answer(choice) {
  if (!latest || latest.phase !== "answering" || latest.buzzedBy !== latest.you) return;
  send({ t: "answer", q: latest.questionIndex, choice });
  el.choices.forEach((button) => {
    button.disabled = true;
    button.classList.remove("is-live");
  });
}

el.createBtn.addEventListener("click", createRoom);
el.joinBtn.addEventListener("click", joinRoom);
el.nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createRoom();
});
el.codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});
el.codeInput.addEventListener("input", () => {
  el.codeInput.value = el.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});
el.copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(el.lobbyCode.textContent ?? "");
    showToast("部屋コードをコピーしました");
  } catch {
    showToast("コピーできませんでした");
  }
});
el.startBtn.addEventListener("click", () => send({ t: "start" }));
el.leaveBtn.addEventListener("click", leaveRoom);
el.buzzBtn.addEventListener("click", buzz);
el.againBtn.addEventListener("click", leaveRoom);
el.choices.forEach((button) => {
  button.addEventListener("click", () => answer(Number(button.dataset.choice)));
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && document.body.dataset.screen === "game") {
    event.preventDefault();
    buzz();
  }
});
window.addEventListener("offline", () => {
  setBanner("オフラインです（再接続中…）");
  if (socket) {
    try {
      socket.close();
    } catch {
      // 無視
    }
  }
});
window.addEventListener("online", () => {
  if (!session) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
  connect();
});

/* ---------- 起動 ---------- */

function boot() {
  el.nameInput.value = localStorage.getItem(NAME_KEY) ?? "";
  const saved = loadSession();
  if (saved) {
    session = saved;
    showScreen("lobby");
    connect();
  } else {
    showScreen("entry");
  }
  startTick();
}

boot();
