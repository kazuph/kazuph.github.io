/* 早押しクイズ フロントエンド。ビルドなしの素の JavaScript。 */
"use strict";

const STORAGE_KEY = "buzzer-quiz-session";
const QUESTION_MS = 20000;
const ANSWER_MS = 10000;

const $ = (sel) => document.querySelector(sel);

const els = {
  banner: $("#conn-banner"),
  screens: {
    entry: $("#screen-entry"),
    lobby: $("#screen-lobby"),
    game: $("#screen-game"),
    result: $("#screen-result"),
  },
  inputName: $("#input-name"),
  inputCode: $("#input-code"),
  btnCreate: $("#btn-create"),
  btnJoin: $("#btn-join"),
  entryError: $("#entry-error"),
  roomCode: $("#room-code"),
  btnCopy: $("#btn-copy"),
  lobbyPlayers: $("#lobby-players"),
  lobbyCount: $("#lobby-count"),
  btnStart: $("#btn-start"),
  lobbyStartHint: $("#lobby-start-hint"),
  lobbyHost: $("#lobby-host"),
  lobbyGuest: $("#lobby-guest"),
  qNum: $("#q-num"),
  qTotal: $("#q-total"),
  qText: $("#q-text"),
  choices: Array.from(document.querySelectorAll(".choice")),
  gameStatus: $("#game-status"),
  buzzer: $("#buzzer"),
  playersList: $("#players-list"),
  timerBar: $("#timer-bar"),
  timerText: $("#timer-text"),
  rankingList: $("#ranking-list"),
  btnBackHome: $("#btn-back-home"),
  toast: $("#toast"),
};

let session = null; // { code, playerId, token, name }
let latest = null; // 最後に受け取った state
let serverOffset = 0; // serverNow - Date.now()
let ws = null;
let reconnectTimer = null;
let gotState = false;
let toastTimer = null;
let lastReceive = 0;
let pingTimer = null;
let watchdogTimer = null;

/* ---------- セッション ---------- */

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (s && s.code && s.playerId && s.token) return s;
  } catch {
    /* 無視 */
  }
  return null;
}

function saveSession(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  session = null;
}

/* ---------- 通信 ---------- */

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/api/rooms/${session.code}/ws?token=${encodeURIComponent(session.token)}`;
}

function connect() {
  if (!session) return;
  clearTimeout(reconnectTimer);
  clearInterval(pingTimer);
  clearTimeout(watchdogTimer);
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    try {
      ws.close(4000, "client reconnect");
    } catch {
      /* 無視 */
    }
  }
  gotState = false;
  const socket = new WebSocket(wsUrl());
  ws = socket;

  socket.onmessage = (e) => {
    lastReceive = Date.now();
    const msg = JSON.parse(e.data);
    if (msg.t === "state") {
      gotState = true;
      serverOffset = msg.serverNow - Date.now();
      latest = msg;
      els.banner.hidden = true;
      render(msg);
    } else if (msg.t === "error") {
      // 早押しの遅れは状態表示ですでに伝わっているのでトーストには出さない
      if (msg.message !== "今は早押しできません") toast(msg.message);
    }
    // pong は生存確認の返事として、それ以上の表示は不要
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    scheduleReconnect();
  };

  socket.onerror = () => {};

  socket.onopen = () => {
    // サーバーへ生存確認を送り続ける。止まったらサーバーは接続切れとして扱う
    lastReceive = Date.now();
    pingTimer = setInterval(() => {
      if (ws === socket && socket.readyState === WebSocket.OPEN) {
        send({ t: "ping" });
      }
    }, 1200);
    // 応答が長く戻らなければ、この接続は死んだものとして張り直す
    watchdogTimer = setTimeout(function check() {
      if (ws === socket && socket.readyState === WebSocket.OPEN && Date.now() - lastReceive > 8000) {
        try {
          socket.close(4000, "no response");
        } catch {
          /* 無視 */
        }
        return;
      }
      watchdogTimer = setTimeout(check, 1000);
    }, 1000);
  };
}

async function probeSession() {
  // WS が張れなかったとき、token/部屋が無効なら入口画面へ戻す
  try {
    const res = await fetch(`/api/rooms/${session.code}/ws?token=${encodeURIComponent(session.token)}`);
    if (res.status === 403 || res.status === 404) {
      const reason = res.status === 404 ? "部屋が見つかりません" : "セッションが切れました";
      clearSession();
      showScreen("entry");
      showEntryError(reason);
      return;
    }
  } catch {
    /* ネットワーク断なら再試行するだけにする */
  }
}

function scheduleReconnect() {
  if (!session) return;
  els.banner.hidden = false;
  if (!gotState) probeSession();
  reconnectTimer = setTimeout(connect, 1200);
}

window.addEventListener("offline", () => {
  // オフラインでは close の完了（onclose）が来ることが保証されないので、
  // ここで自分で接続を切り離して再接続ループに乗せる
  const dead = ws;
  if (!dead) return;
  ws = null;
  dead.onclose = null;
  dead.onerror = null;
  dead.onmessage = null;
  clearInterval(pingTimer);
  clearTimeout(watchdogTimer);
  try {
    dead.close(4000, "offline");
  } catch {
    /* 無視 */
  }
  scheduleReconnect();
});

window.addEventListener("online", () => {
  if (session) connect();
});

async function apiCreate(name) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "部屋を作れませんでした");
  return data;
}

async function apiJoin(code, name) {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "参加できませんでした");
  return data;
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

/* ---------- 入口の操作 ---------- */

function showScreen(name) {
  for (const [key, el] of Object.entries(els.screens)) el.hidden = key !== name;
}

function showEntryError(message) {
  els.entryError.textContent = message;
  els.entryError.hidden = false;
}

els.btnCreate.addEventListener("click", async () => {
  const name = els.inputName.value.trim();
  if (!name) return showEntryError("名前を入力してください");
  els.entryError.hidden = true;
  try {
    const data = await apiCreate(name);
    session = { code: data.code, playerId: data.playerId, token: data.token, name };
    saveSession(session);
    showScreen("lobby");
    connect();
  } catch (err) {
    showEntryError(err.message);
  }
});

els.btnJoin.addEventListener("click", async () => {
  const name = els.inputName.value.trim();
  const code = els.inputCode.value.trim().toUpperCase();
  if (!name) return showEntryError("名前を入力してください");
  if (!/^[A-Z2-9]{6}$/.test(code)) return showEntryError("部屋コードは6文字です");
  els.entryError.hidden = true;
  try {
    const data = await apiJoin(code, name);
    session = { code: data.code, playerId: data.playerId, token: data.token, name };
    saveSession(session);
    showScreen("lobby");
    connect();
  } catch (err) {
    showEntryError(err.message);
  }
});

els.btnBackHome.addEventListener("click", () => {
  clearSession();
  if (ws) {
    try {
      ws.close(4000, "bye");
    } catch {
      /* 無視 */
    }
    ws = null;
  }
  showScreen("entry");
});

/* ---------- 送信 ---------- */

function sendBuzz() {
  if (!latest || latest.phase !== "question" || !latest.question) return;
  if (latest.eliminated.includes(latest.you)) return;
  send({ t: "buzz", q: latest.questionIndex });
}

els.buzzer.addEventListener("click", sendBuzz);

document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.code !== "Space") return;
  if (els.screens.game.hidden) return;
  if (els.buzzer.disabled) return;
  e.preventDefault();
  sendBuzz();
});

for (const btn of els.choices) {
  btn.addEventListener("click", () => {
    if (!latest || latest.phase !== "answering" || latest.answeringPlayerId !== latest.you) return;
    send({ t: "answer", q: latest.questionIndex, choice: Number(btn.dataset.i) });
  });
}

els.btnStart.addEventListener("click", () => send({ t: "start" }));

els.btnCopy.addEventListener("click", async () => {
  if (!session) return;
  try {
    await navigator.clipboard.writeText(session.code);
    toast("部屋コードをコピーしました");
  } catch {
    toast(`部屋コード: ${session.code}`);
  }
});

/* ---------- 描画 ---------- */

function render(state) {
  if (state.phase === "lobby") renderLobby(state);
  else if (state.phase === "finished") renderResult(state);
  else renderGame(state);
}

function playerTags(state, p) {
  const tags = [];
  if (p.id === state.you) tags.push('<span class="p-tag me">あなた</span>');
  if (p.id === state.answeringPlayerId) tags.push('<span class="p-tag answering-tag">回答中</span>');
  else if (!p.connected) tags.push('<span class="p-tag off-tag">接続が切れています</span>');
  return tags.join("");
}

function renderLobby(state) {
  showScreen("lobby");
  els.roomCode.textContent = state.code;
  els.lobbyCount.textContent = `${state.players.length}/4`;
  els.lobbyPlayers.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const li = document.createElement("li");
    const p = state.players[i];
    if (p) {
      li.innerHTML = `<span class="seat">${p.seat}</span><span class="p-name">${escapeHtml(p.name)}</span>${playerTags(state, p)}`;
    } else {
      li.innerHTML = `<span class="seat">${i + 1}</span><span class="p-name empty">あいた座席</span>`;
      li.style.opacity = "0.6";
    }
    els.lobbyPlayers.appendChild(li);
  }
  const isHost = state.you === state.hostId;
  els.lobbyHost.hidden = !isHost;
  els.lobbyGuest.hidden = isHost;
  if (isHost) {
    const canStart = state.players.length >= 2 && state.players.length <= 4;
    els.btnStart.disabled = !canStart;
    els.lobbyStartHint.textContent = canStart ? "お疲れさま、押せるよ！" : "2人以上そろうと押せます";
  }
}

function renderGame(state) {
  showScreen("game");

  // 出題
  els.qNum.textContent = `第${state.questionIndex + 1}問`;
  els.qTotal.textContent = `/ ${state.questionCount}`;
  els.qText.textContent = state.question ? state.question.text : "";

  // 選択肢
  const answeringByYou = state.phase === "answering" && state.answeringPlayerId === state.you;
  for (const btn of els.choices) {
    const i = Number(btn.dataset.i);
    btn.querySelector(".label").textContent = state.question ? state.question.choices[i] : "";
    btn.classList.toggle("enabled", answeringByYou);
    btn.disabled = !answeringByYou;
    btn.classList.toggle("correct", state.phase === "reveal" && state.correct === i);
    btn.classList.remove("wrong-pick");
  }

  // 早押しボタン
  const canBuzz = state.phase === "question" && !state.eliminated.includes(state.you);
  const eliminatedMe = state.phase === "question" && state.eliminated.includes(state.you);
  els.buzzer.disabled = !canBuzz;
  els.buzzer.classList.toggle("small-label", !canBuzz);
  if (canBuzz) els.buzzer.innerHTML = '<span class="buzzer-inner">押</span>';
  else if (state.phase === "answering" && answeringByYou) els.buzzer.innerHTML = '<span class="buzzer-inner">回答中</span>';
  else if (eliminatedMe) els.buzzer.innerHTML = '<span class="buzzer-inner">この問題は回答済み</span>';
  else if (state.phase === "reveal") els.buzzer.innerHTML = '<span class="buzzer-inner">次へ…</span>';
  else els.buzzer.innerHTML = '<span class="buzzer-inner">押</span>';

  // ステータス文
  const answeringName = state.players.find((p) => p.id === state.answeringPlayerId);
  if (state.phase === "question") {
    els.gameStatus.innerHTML = eliminatedMe
      ? "この問題は回答済みです"
      : '<strong>早押し！</strong>押した人が回答権をゲット';
  } else if (state.phase === "answering") {
    if (answeringByYou) {
      els.gameStatus.innerHTML = "<strong>あなたが回答中！</strong>10秒以内に選んでね";
    } else {
      els.gameStatus.innerHTML = `<strong>${escapeHtml(answeringName?.name ?? "")}</strong>さんが回答中`;
    }
  } else if (state.phase === "reveal") {
    const q = state.question;
    const correctLabel = q ? q.choices[state.correct] : "";
    els.gameStatus.innerHTML = `正解は <strong>${escapeHtml(correctLabel)}</strong>！`;
  }

  // スコア一覧
  els.playersList.innerHTML = "";
  for (const p of state.players) {
    const li = document.createElement("li");
    li.className =
      (p.id === state.answeringPlayerId ? "answering " : "") + (p.connected ? "" : "disconnected");
    const score = p.score > 0 ? `+${p.score}` : `${p.score}`;
    li.innerHTML = `<span class="p-name">${escapeHtml(p.name)}</span>${playerTags(state, p)}<span class="p-score">${score}</span>`;
    els.playersList.appendChild(li);
  }
}

function renderResult(state) {
  showScreen("result");
  const medals = ["🥇", "🥈", "🥉"];
  els.rankingList.innerHTML = "";
  for (const r of state.ranking) {
    const li = document.createElement("li");
    const medal = medals[r.rank - 1] ?? `${r.rank}位`;
    const score = r.score > 0 ? `+${r.score}` : `${r.score}`;
    li.innerHTML = `<span class="r-rank">${medal}</span><span class="r-name">${escapeHtml(r.name)}</span>${
      r.id === state.you ? '<span class="you-tag">あなた</span>' : ""
    }<span class="r-score">${score}点</span>`;
    els.rankingList.appendChild(li);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- タイマー ---------- */

function timerInfo() {
  if (!latest) return null;
  if (latest.phase === "question" && latest.deadline) {
    return { deadline: latest.deadline, total: QUESTION_MS, label: "制限" };
  }
  if (latest.phase === "answering" && latest.answerDeadline) {
    const answererIsYou = latest.answeringPlayerId === latest.you;
    const deadline = Math.min(latest.deadline ?? Infinity, latest.answerDeadline);
    return { deadline, total: ANSWER_MS, label: answererIsYou ? "回答" : "時間" };
  }
  return null;
}

function tickTimer() {
  const info = timerInfo();
  if (info) {
    const now = Date.now() + serverOffset; // サーバーの時計に合わせる
    const remaining = Math.max(0, info.deadline - now);
    const frac = Math.max(0, Math.min(1, remaining / info.total));
    els.timerBar.style.width = `${frac * 100}%`;
    els.timerText.textContent = `${info.label} ${remaining / 1000 < 10 ? (remaining / 1000).toFixed(1) : Math.ceil(remaining / 1000)}`;
    els.timerBar.style.visibility = "visible";
  } else if (latest && latest.phase === "reveal") {
    els.timerBar.style.width = "0%";
    els.timerText.textContent = "発表!";
  } else {
    els.timerText.textContent = "--";
  }
  requestAnimationFrame(tickTimer);
}

/* ---------- 起動 ---------- */

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2500);
}

function boot() {
  session = loadSession();
  if (session) {
    connect();
  } else {
    showScreen("entry");
  }
  requestAnimationFrame(tickTimer);
  // テストとデバッグ用に内部の様子を見られるようにする
  window.__quiz = {
    get wsState() {
      return ws ? ws.readyState : null;
    },
    get pingRunning() {
      return pingTimer !== null;
    },
    get lastReceive() {
      return lastReceive ? Date.now() - lastReceive : null;
    },
    get connected() {
      return ws !== null;
    },
    get state() {
      return latest;
    },
  };
}

boot();
