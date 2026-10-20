/* 早押しクイズのブラウザ側。素の JS。 */
"use strict";

const LS_KEY = "buzzer-quiz-session-v1";
const QUESTION_MS = 20000;
const ANSWER_MS = 10000;

const $ = (id) => document.getElementById(id);

const views = {
  entry: $("view-entry"),
  lobby: $("view-lobby"),
  game: $("view-game"),
  result: $("view-result"),
};

let session = loadSession();
let ws = null;
let state = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let wantConnect = false;
let timerTick = null;
let lastServerNow = 0;
let lastRecvPerf = 0;

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (s && s.code && s.playerId && s.token) return s;
  } catch {
    // ignore
  }
  return null;
}

function saveSession(s) {
  session = s;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function clearSession() {
  session = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

function show(name) {
  for (const [k, el] of Object.entries(views)) {
    el.classList.toggle("hidden", k !== name);
  }
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2500);
}

function setConn(online, text) {
  const c = $("conn");
  c.textContent = text;
  c.classList.toggle("online", online);
  c.classList.toggle("offline", !online);
  $("reconnect").classList.toggle("hidden", online);
}

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return (
    `${proto}://${location.host}/api/rooms/${session.code}/ws?token=${session.token}`
  );
}

function connect() {
  if (!session) return;
  wantConnect = true;
  closeSocket();
  setConn(false, "接続中…");
  let sock;
  try {
    sock = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws = sock;
  sock.onopen = () => {
    reconnectDelay = 1000;
    setConn(true, "接続中");
  };
  sock.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.t === "state") {
      lastServerNow = msg.serverNow;
      lastRecvPerf = performance.now();
      state = msg;
      setConn(true, "接続中");
      render(msg);
    } else if (msg.t === "error") {
      toast(msg.message);
      const le = $("lobby-error");
      if (le && !views.lobby.classList.contains("hidden")) le.textContent = msg.message;
    }
  };
  sock.onclose = (ev) => {
    if (ws !== sock) return;
    ws = null;
    setConn(false, "再接続中…");
    if (wantConnect && ev.code !== 4001) scheduleReconnect();
    else if (wantConnect) connectSoon();
  };
  sock.onerror = () => {
    try {
      sock.close();
    } catch {
      // ignore
    }
  };
}

function connectSoon() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (wantConnect) connect();
  }, 0);
}

function scheduleReconnect() {
  if (!wantConnect || reconnectTimer) return;
  setConn(false, "再接続中…");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (wantConnect) connect();
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
  }, reconnectDelay);
}

function closeSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    const s = ws;
    ws = null;
    try {
      s.close();
    } catch {
      // ignore
    }
  }
}

// ユーザーが部屋を出るとき: 再接続も止める
function disconnect() {
  wantConnect = false;
  closeSocket();
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// ---- 残り時間（端末時計でなく serverNow 差分で計算） ----
function serverNow() {
  return lastServerNow + (performance.now() - lastRecvPerf);
}

function updateTimer() {
  if (!state) return;
  let remain = null;
  let total = QUESTION_MS;
  if (state.phase === "answering" && state.answerDeadline != null) {
    remain = state.answerDeadline - serverNow();
    total = ANSWER_MS;
  } else if (
    (state.phase === "question" || state.phase === "answering") &&
    state.qDeadline != null
  ) {
    remain = state.qDeadline - serverNow();
    total = QUESTION_MS;
  }
  const bar = $("timer-bar");
  const text = $("timer-text");
  if (remain == null) {
    bar.style.width = "0%";
    text.textContent = state.phase === "reveal" ? "正解発表" : "--秒";
    return;
  }
  const r = Math.max(0, remain);
  bar.style.width = `${(r / total) * 100}%`;
  bar.classList.toggle("low", r < 5000);
  text.classList.toggle("low", r < 5000);
  text.textContent = `${(r / 1000).toFixed(1)}秒`;
}

// ---- 描画 ----
function playerName(id) {
  const p = state.players.find((x) => x.id === id);
  return p ? p.name : "？";
}

function render(s) {
  if (s.phase === "lobby") renderLobby(s);
  else if (s.phase === "finished") renderResult(s);
  else renderGame(s);
}

function renderLobby(s) {
  show("lobby");
  $("room-code").textContent = s.code;
  const me = s.players.find((p) => p.id === s.you);
  const ul = $("members");
  ul.innerHTML = "";
  for (const p of s.players) {
    const li = document.createElement("li");
    li.className = "member";
    li.textContent = `${p.name}${p.host ? " 👑" : ""}${p.id === s.you ? "（あなた）" : ""}${
      p.connected ? "" : "（接続切れ）"
    }`;
    ul.appendChild(li);
  }
  const startBtn = $("start-btn");
  const wait = $("lobby-wait");
  if (me && me.host) {
    startBtn.classList.remove("hidden");
    wait.classList.add("hidden");
  } else {
    startBtn.classList.add("hidden");
    wait.classList.remove("hidden");
  }
  if (!views.game.classList.contains("hidden")) {
    // 念のため
  }
}

function canBuzz(s) {
  return (
    s.phase === "question" &&
    !s.wrongIds.includes(s.you) &&
    s.players.some((p) => p.id === s.you)
  );
}

function renderGame(s) {
  show("game");
  $("qnum").textContent = `第${s.qIndex + 1}問 / ${s.qTotal}`;
  $("question").textContent = s.question ? s.question.text : "";

  const box = $("choices");
  box.innerHTML = "";
  const labels = ["A", "B", "C", "D"];
  const myTurn = s.phase === "answering" && s.answererId === s.you;
  const reveal = s.phase === "reveal" && s.lastReveal;
  (s.question ? s.question.choices : []).forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.dataset.testid = `choice-${i}`;
    b.setAttribute("data-testid", `choice-${i}`);
    b.textContent = `${labels[i]}. ${text}`;
    if (myTurn) {
      b.classList.add("pickable");
      b.onclick = () => send({ t: "answer", q: s.qIndex, choice: i });
    } else {
      b.disabled = true;
    }
    if (reveal) {
      if (i === s.lastReveal.correctChoice) b.classList.add("correct");
      if (s.lastReveal.choice === i && !s.lastReveal.correct) {
        b.classList.add("wrongpick");
      }
    }
    box.appendChild(b);
  });

  const banner = $("answering-banner");
  const rev = $("reveal");
  banner.classList.add("hidden");
  banner.textContent = "";
  rev.classList.add("hidden");
  rev.textContent = "";
  const buzz = $("buzz-btn");
  const bs = $("buzz-state");

  if (s.phase === "question") {
    if (s.lastWrong) {
      banner.classList.remove("hidden");
      banner.textContent = `❌ ${playerName(s.lastWrong.answererId)}さんが不正解！早押し再開`;
    }
    if (canBuzz(s)) {
      buzz.disabled = false;
      bs.textContent = "押せるのは1人だけ！速く押して回答権を取ろう";
    } else if (s.wrongIds.includes(s.you)) {
      buzz.disabled = true;
      bs.textContent = "この問題は回答済みです（ほかの人の番です）";
    } else {
      buzz.disabled = false;
      bs.textContent = "";
    }
  } else if (s.phase === "answering") {
    if (s.answererId === s.you) {
      banner.classList.remove("hidden");
      banner.textContent = "🙋 あなたが回答中！4択から選んでください（10秒以内）";
      buzz.disabled = true;
      bs.textContent = "回答を選んでください";
    } else {
      banner.classList.remove("hidden");
      banner.textContent = `🙋 ${playerName(s.answererId)}さんが回答中…`;
      buzz.disabled = true;
      bs.textContent = "ほかの人が回答中です";
    }
  } else if (s.phase === "reveal") {
    rev.classList.remove("hidden");
    rev.textContent = revealText(s);
    buzz.disabled = true;
    bs.textContent = "次の問題へ…";
  }

  renderScores(s);
}

function revealText(s) {
  const r = s.lastReveal;
  if (!r) return "正解発表";
  const labels = ["A", "B", "C", "D"];
  const ans = `${labels[r.correctChoice]}. ${s.question.choices[r.correctChoice]}`;
  if (r.reason === "correct") {
    return `⭕ ${playerName(r.answererId)}さん正解！ +10点（答え：${ans}）`;
  }
  if (r.reason === "wrong" || r.reason === "answer-timeout") {
    if (remainingCount(s) === 0) {
      return `❌ 全員不正解…（答え：${ans}）`;
    }
    return `❌ ${playerName(r.answererId)}さん不正解 -5点（答え：${ans}）`;
  }
  return `⏰ 時間切れ！（答え：${ans}）`;
}

function remainingCount(s) {
  return s.players.filter((p) => !s.wrongIds.includes(p.id)).length;
}

function renderScores(s) {
  const ul = $("scores");
  ul.innerHTML = "";
  const sorted = [...s.players].sort((a, b) => b.score - a.score);
  for (const p of sorted) {
    const li = document.createElement("li");
    li.className = "score-row";
    if (p.id === s.you) li.classList.add("me");
    if (p.id === s.answererId) li.classList.add("answering");
    const nm = document.createElement("span");
    nm.textContent = `${p.host ? "👑" : ""}${p.name}${p.id === s.you ? "（あなた）" : ""}`;
    li.appendChild(nm);
    if (p.id === s.answererId) {
      const b = document.createElement("span");
      b.className = "badge live";
      b.textContent = "回答中";
      li.appendChild(b);
    }
    if (!p.connected) {
      const b = document.createElement("span");
      b.className = "badge off";
      b.textContent = "接続が切れています";
      li.appendChild(b);
    }
    if (s.wrongIds.includes(p.id)) {
      const b = document.createElement("span");
      b.className = "badge out";
      b.textContent = "回答済み";
      li.appendChild(b);
    }
    const pts = document.createElement("span");
    pts.className = "pts";
    pts.textContent = `${p.score}点`;
    li.appendChild(pts);
    ul.appendChild(li);
  }
}

function renderResult(s) {
  show("result");
  const ol = $("ranking");
  ol.innerHTML = "";
  for (const r of s.ranking || []) {
    const li = document.createElement("li");
    if (r.id === s.you) li.classList.add("me");
    const crown = r.rank === 1 ? "👑 " : "";
    li.innerHTML =
      `<span class="crown">${crown}</span>` +
      `<span>${r.rank}位 ${escapeHtml(r.name)}${r.id === s.you ? "（あなた）" : ""}</span>` +
      `<span class="pts">${r.score}点</span>`;
    ol.appendChild(li);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ---- 入口 ----
async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "通信エラー");
  return data;
}

$("create-btn").onclick = async () => {
  const name = $("name-input").value.trim();
  if (!name) {
    $("entry-error").textContent = "名前を入力してください";
    return;
  }
  $("entry-error").textContent = "";
  try {
    const r = await api("/api/rooms", { name });
    saveSession({ code: r.code, playerId: r.playerId, token: r.token, name });
    connect();
  } catch (e) {
    $("entry-error").textContent = e.message;
  }
};

$("join-btn").onclick = async () => {
  const name = $("name-input").value.trim();
  const code = $("code-input").value.trim().toUpperCase();
  if (!name) {
    $("entry-error").textContent = "名前を入力してください";
    return;
  }
  if (code.length !== 6) {
    $("entry-error").textContent = "部屋コードは6文字です";
    return;
  }
  $("entry-error").textContent = "";
  try {
    const r = await api(`/api/rooms/${code}/join`, { name });
    saveSession({ code: r.code, playerId: r.playerId, token: r.token, name });
    connect();
  } catch (e) {
    $("entry-error").textContent = e.message;
  }
};

$("start-btn").onclick = () => send({ t: "start" });
$("buzz-btn").onclick = () => {
  if (state) send({ t: "buzz", q: state.qIndex });
};
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  if (views.game.classList.contains("hidden")) return;
  const tag = (document.activeElement || {}).tagName;
  if (tag === "INPUT" || tag === "BUTTON") return;
  e.preventDefault();
  if (state && canBuzz(state)) send({ t: "buzz", q: state.qIndex });
});

$("copy-btn").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("room-code").textContent);
    toast("部屋コードをコピーしました");
  } catch {
    toast($("room-code").textContent);
  }
};

$("leave-btn").onclick = () => {
  disconnect();
  clearSession();
  state = null;
  show("entry");
  updateResume();
};

$("back-btn").onclick = () => {
  disconnect();
  clearSession();
  state = null;
  show("entry");
  updateResume();
};

$("forget-btn").onclick = () => {
  clearSession();
  updateResume();
};

$("resume-btn").onclick = () => {
  if (session) connect();
};

function updateResume() {
  $("resume-box").classList.toggle("hidden", !session);
  if (session) {
    $("resume-btn").textContent = `前回の部屋に戻る（${session.code}）`;
  }
}

window.addEventListener("offline", () => {
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
  setConn(false, "オフライン");
});

window.addEventListener("online", () => {
  if (session && wantConnect) connect();
});

// ---- 起動 ----
updateResume();
if (session) {
  connect();
} else {
  show("entry");
}
setInterval(updateTimer, 100);

// ハートビート: サーバーが切断を検知できるよう定期的に生存を送る
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) send({ t: "ping" });
}, 5000);
timerTick = setInterval(() => {
  if (state && (state.phase === "question" || state.phase === "answering")) {
    updateTimer();
  }
}, 100);
