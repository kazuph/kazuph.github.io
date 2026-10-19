"use strict";

const STORAGE_KEY = "buzzer-quiz-session";

const $ = (sel) => document.querySelector(sel);
const screens = {
  entry: $("#screen-entry"),
  lobby: $("#screen-lobby"),
  game: $("#screen-game"),
  result: $("#screen-result"),
};

let session = loadSession(); // { code, playerId, token }
let ws = null;
let wsOpen = false;
let state = null; // 最後に受け取ったサーバーの状態
let clockOffset = 0; // serverNow - Date.now()
let reconnectTimer = null;
let intentionalClose = false;

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSession(s) {
  session = s;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

function showError(el, message) {
  el.textContent = message || "";
}

// ---------- 通信 ----------

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "エラーが発生しました");
  return data;
}

function connect() {
  if (!session) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  intentionalClose = false;
  clearTimeout(reconnectTimer);
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/api/rooms/${session.code}/ws?token=${encodeURIComponent(session.token)}`);
  wsOpen = false;

  ws.onopen = () => {
    wsOpen = true;
    $("#reconnecting").classList.add("hidden");
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.t === "state") {
      state = msg;
      clockOffset = msg.serverNow - Date.now();
      render();
    } else if (msg.t === "error") {
      showError($("#lobby-error"), msg.message);
    }
  };
  ws.onclose = (ev) => {
    wsOpen = false;
    if (intentionalClose) return;
    if (ev.code === 4000) return; // 別の接続に切り替わった
    if (ev.code === 1006 || ev.code === 1000) {
      // 403（token 不正）は 1006 で閉じられることがある。その場合は入口へ。
    }
    scheduleReconnect();
  };
  ws.onerror = () => {};
}

function scheduleReconnect() {
  if (!session) return;
  $("#reconnecting").classList.remove("hidden");
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (navigator.onLine) connect();
    else scheduleReconnect();
  }, 1000);
}

function send(msg) {
  if (ws && wsOpen) ws.send(JSON.stringify(msg));
}

// ---------- 入口 ----------

$("#create-btn").addEventListener("click", async () => {
  showError($("#entry-error"), "");
  const name = $("#name-input").value.trim();
  try {
    const data = await postJSON("/api/rooms", { name });
    saveSession(data);
    connect();
  } catch (e) {
    showError($("#entry-error"), e.message);
  }
});

$("#join-btn").addEventListener("click", async () => {
  showError($("#entry-error"), "");
  const name = $("#name-input").value.trim();
  const code = $("#code-input").value.trim().toUpperCase();
  try {
    const data = await postJSON(`/api/rooms/${code}/join`, { name });
    saveSession(data);
    connect();
  } catch (e) {
    showError($("#entry-error"), e.message);
  }
});

// ---------- ロビー ----------

$("#start-btn").addEventListener("click", () => send({ t: "start" }));

// ---------- ゲーム ----------

$("#buzz-btn").addEventListener("click", () => {
  if (!state?.question) return;
  send({ t: "buzz", q: state.question.index - 1 });
});

for (const btn of document.querySelectorAll(".choice")) {
  btn.addEventListener("click", () => {
    if (!state?.question || btn.disabled) return;
    send({ t: "answer", q: state.question.index - 1, choice: Number(btn.dataset.choice) });
  });
}

document.addEventListener("keydown", (ev) => {
  if (ev.code === "Space" && !ev.repeat && state?.phase === "question") {
    const buzz = $("#buzz-btn");
    if (!buzz.disabled) {
      ev.preventDefault();
      buzz.click();
    }
  }
});

$("#back-btn").addEventListener("click", () => {
  intentionalClose = true;
  if (ws) ws.close();
  localStorage.removeItem(STORAGE_KEY);
  session = null;
  state = null;
  showScreen("entry");
});

// ---------- 描画 ----------

function playerCard(p) {
  const li = document.createElement("li");
  li.className = "player-card";
  li.dataset.playerId = p.id;
  if (state && p.id === state.answererId) li.classList.add("answering");
  if (p.id === state?.hostId) li.classList.add("host");
  const badges = [];
  if (p.id === state?.hostId) badges.push("<span class=\"badge\">ホスト</span>");
  if (!p.connected) badges.push("<span class=\"badge off\">接続が切れています</span>");
  if (p.out && state?.phase !== "lobby") badges.push("<span class=\"badge out\">この問題は回答済み</span>");
  const rankText = state && state.phase !== "lobby" ? `${p.rank}位` : "";
  li.innerHTML = `
    <span class="rank">${rankText}</span>
    <span class="pname">${escapeHTML(p.name)}${p.id === state?.you ? "（あなた）" : ""}</span>
    <span class="score">${p.score}点</span>
    <span class="badges">${badges.join("")}</span>`;
  return li;
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function render() {
  if (!state) return;
  if (state.phase === "lobby") {
    renderLobby();
  } else if (state.phase === "finished") {
    renderResult();
  } else {
    renderGame();
  }
}

function renderLobby() {
  showScreen("lobby");
  $("#room-code").textContent = state.code;
  const ul = $("#lobby-players");
  ul.innerHTML = "";
  for (const p of state.players) ul.appendChild(playerCard(p));
  const isHost = state.you === state.hostId;
  const startBtn = $("#start-btn");
  startBtn.classList.toggle("hidden", !isHost);
  startBtn.disabled = state.players.length < 2;
  $("#lobby-wait").textContent = isHost
    ? state.players.length < 2
      ? "もう1人集まると開始できます"
      : "全員そろったら開始しよう！"
    : "ホストが開始するのを待っています…";
}

function renderGame() {
  showScreen("game");
  const q = state.question;
  $("#question-counter").textContent = `第${q.index}問 / ${q.total}`;
  $("#question-text").textContent = q.text;
  q.choices.forEach((text, i) => {
    const btn = document.querySelector(`.choice[data-choice="${i}"]`);
    btn.textContent = text;
    btn.classList.remove("correct", "wrong");
    if (state.phase === "reveal" && q.answer === i) btn.classList.add("correct");
  });

  const me = state.players.find((p) => p.id === state.you);
  const iAmAnswerer = state.answererId === state.you;
  const answerer = state.players.find((p) => p.id === state.answererId);
  const buzz = $("#buzz-btn");

  const canBuzz = state.phase === "question" && me && !me.out;
  buzz.disabled = !canBuzz;

  const choicesEnabled = state.phase === "answering" && iAmAnswerer;
  for (const btn of document.querySelectorAll(".choice")) {
    btn.disabled = !choicesEnabled;
  }

  const status = $("#game-status");
  if (state.phase === "answering" && answerer) {
    status.textContent = iAmAnswerer
      ? "あなたが回答中！10秒以内に選んでね"
      : `${answerer.name}さんが回答中`;
  } else if (state.phase === "reveal") {
    status.textContent = `正解は「${q.choices[q.answer]}」でした！`;
  } else if (me?.out) {
    status.textContent = "この問題は回答済みです";
  } else {
    status.textContent = "早押しボタンを押そう！";
  }

  const ul = $("#game-players");
  ul.innerHTML = "";
  for (const p of state.players) ul.appendChild(playerCard(p));
}

function renderResult() {
  showScreen("result");
  const ol = $("#result-list");
  ol.innerHTML = "";
  const sorted = [...state.players].sort((a, b) => a.rank - b.rank);
  for (const p of sorted) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="rank">${p.rank}位</span><span class="pname">${escapeHTML(p.name)}</span><span class="score">${p.score}点</span>`;
    if (p.id === state.you) li.classList.add("me");
    ol.appendChild(li);
  }
}

// ---------- タイマー ----------

function serverNow() {
  return Date.now() + clockOffset;
}

function updateTimer() {
  if (!state || screens.game.classList.contains("hidden")) return;
  const now = serverNow();
  let remaining = 0;
  let total = 20_000;
  if (state.phase === "answering" && state.answerEndsAt) {
    remaining = Math.max(0, state.answerEndsAt - now);
    total = 10_000;
  } else if (state.phase === "question") {
    remaining = Math.max(0, state.questionEndsAt - now);
    total = 20_000;
  } else if (state.phase === "reveal") {
    remaining = Math.max(0, (state.revealEndsAt ?? now) - now);
    total = 3_000;
  }
  const ratio = Math.min(1, remaining / total);
  $("#timer-bar").style.width = `${ratio * 100}%`;
  $("#timer-bar").classList.toggle("low", ratio < 0.25);
  $("#timer-text").textContent = String(Math.ceil(remaining / 1000));
}
setInterval(updateTimer, 100);

// ---------- オンライン/オフライン ----------

window.addEventListener("offline", () => {
  if (ws) ws.close();
});
window.addEventListener("online", () => {
  if (session) connect();
});

// ---------- 起動 ----------

if (session) {
  connect();
} else {
  showScreen("entry");
}
