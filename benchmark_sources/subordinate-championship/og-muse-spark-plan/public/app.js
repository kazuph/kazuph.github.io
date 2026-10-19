/* 早押しクイズのブラウザ側。ビルドなしの素の JavaScript。 */
"use strict";

const $ = (id) => document.getElementById(id);

const views = {
  entry: $("view-entry"),
  lobby: $("view-lobby"),
  game: $("view-game"),
  result: $("view-result"),
};

const SESSION_KEY = "bq-session-v1";
const CHOICE_MARKS = ["A", "B", "C", "D"];

/** @type {any|null} 最新の全体状態 */
let lastState = null;
/** @type {{code:string,playerId:string,token:string,name:string}|null} */
let session = null;
let ws = null;
let reconnectTimer = 0;
let clockOffset = 0;
let wantConnection = false;
let errorTimer = 0;

function showOnly(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

function serverNow() {
  return Date.now() + clockOffset;
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.code && s.playerId && s.token) return s;
    return null;
  } catch {
    return null;
  }
}

function saveSession(s) {
  session = s;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // 保存できなくても続ける
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

function setEntryError(msg) {
  $("entry-error").textContent = msg ?? "";
}

function setLobbyError(msg) {
  $("lobby-error").textContent = msg ?? "";
}

function setGameError(msg) {
  $("game-error").textContent = msg ?? "";
  if (errorTimer) clearTimeout(errorTimer);
  if (msg) {
    errorTimer = setTimeout(() => {
      $("game-error").textContent = "";
    }, 3000);
  }
}

function setReconnecting(on) {
  $("reconnect-banner").hidden = !on;
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "通信に失敗しました");
  return data;
}

async function createRoom() {
  const name = $("name-input").value.trim();
  setEntryError("");
  try {
    const data = await postJson("/api/rooms", { name });
    saveSession({ code: data.code, playerId: data.playerId, token: data.token, name });
    connect();
  } catch (e) {
    setEntryError(e instanceof Error ? e.message : "部屋を作れませんでした");
  }
}

async function joinRoom() {
  const name = $("name-input").value.trim();
  const code = $("code-input").value.trim().toUpperCase();
  setEntryError("");
  if (!code) {
    setEntryError("部屋コードを入力してください");
    return;
  }
  try {
    const data = await postJson(`/api/rooms/${encodeURIComponent(code)}/join`, {
      name,
    });
    saveSession({
      code: data.code,
      playerId: data.playerId,
      token: data.token,
      name,
    });
    connect();
  } catch (e) {
    setEntryError(e instanceof Error ? e.message : "参加できませんでした");
  }
}

function wsUrl() {
  if (!session) return null;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return (
    `${proto}://${location.host}/api/rooms/${encodeURIComponent(session.code)}` +
    `/ws?token=${encodeURIComponent(session.token)}`
  );
}

function connect() {
  if (!session) {
    showOnly("entry");
    return;
  }
  wantConnection = true;
  if (ws) {
    try {
      ws.close();
    } catch {
      // 無視
    }
    ws = null;
  }
  const url = wsUrl();
  if (!url) return;
  setReconnecting(true);
  let socket;
  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  ws = socket;
  socket.onopen = () => {
    setReconnecting(false);
  };
  socket.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return;
    }
    if (msg && msg.t === "state") {
      clockOffset = msg.serverNow - Date.now();
      lastState = msg;
      render(msg);
    } else if (msg && msg.t === "error") {
      setGameError(String(msg.message ?? "エラーです"));
      setLobbyError(String(msg.message ?? "エラーです"));
    }
  };
  socket.onclose = () => {
    if (ws === socket) ws = null;
    if (!wantConnection) return;
    setReconnecting(true);
    scheduleReconnect();
  };
  socket.onerror = () => {
    try {
      socket.close();
    } catch {
      // 無視
    }
  };
}

function scheduleReconnect() {
  if (!wantConnection || !session) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = 0;
    if (wantConnection && session) connect();
  }, 1000);
}

function disconnect(showEntry = true) {
  wantConnection = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = 0;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      // 無視
    }
    ws = null;
  }
  setReconnecting(false);
  if (showEntry) {
    lastState = null;
    showOnly("entry");
    $("room-code-label").textContent = "—";
  }
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    setGameError("接続が切れています。再接続中…");
  }
}

function playerName(id) {
  const p = lastState?.players.find((x) => x.id === id);
  return p ? p.name : "誰か";
}

function badgeFor(p, st) {
  if (p.isHost) return { text: "ホスト", cls: "host" };
  if (st.answererId === p.id) return { text: "回答中", cls: "answering" };
  if (st.disqualified.includes(p.id) && (st.phase === "question" || st.phase === "answering")) {
    return { text: "回答済み", cls: "out" };
  }
  if (!p.connected) return { text: "接続が切れています", cls: "offline" };
  return null;
}

function renderPlayerList(ul, st, withScore) {
  ul.textContent = "";
  for (const p of st.players) {
    const li = document.createElement("li");
    if (p.id === st.you) li.classList.add("me");
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = p.name + (p.id === st.you ? "（あなた）" : "");
    li.appendChild(nm);
    const badge = badgeFor(p, st);
    if (badge) {
      const b = document.createElement("span");
      b.className = `badge ${badge.cls}`;
      b.textContent = badge.text;
      li.appendChild(b);
    }
    if (withScore) {
      const sc = document.createElement("span");
      sc.className = "sc";
      sc.textContent = `${p.score}点`;
      li.appendChild(sc);
    }
    ul.appendChild(li);
  }
}

function renderChoices(st) {
  const box = $("choices");
  box.textContent = "";
  if (!st.question) return;
  const canAnswer = st.phase === "answering" && st.answererId === st.you;
  const reveal = st.phase === "reveal";
  st.question.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.i = String(i);
    const mark = document.createElement("span");
    mark.className = "k";
    mark.textContent = CHOICE_MARKS[i] ?? String(i + 1);
    btn.appendChild(mark);
    btn.appendChild(document.createTextNode(text));
    if (reveal) {
      btn.disabled = true;
      if (st.lastCorrect === i) btn.classList.add("correct");
      if (st.lastAnswer && st.lastAnswer.choice === i && !st.lastAnswer.correct) {
        btn.classList.add("wrong");
      }
    } else {
      btn.disabled = !canAnswer;
      btn.addEventListener("click", () => {
        send({ t: "answer", q: st.qIndex, choice: i });
      });
    }
    box.appendChild(btn);
  });
}

function renderStatus(st) {
  const el = $("status-line");
  if (st.phase === "question") {
    if (st.disqualified.includes(st.you)) {
      el.textContent = "この問題は回答済みです。みんなの早押しを見守ろう！";
    } else {
      el.textContent = "早押しボタンを押して回答権をゲット！";
    }
  } else if (st.phase === "answering") {
    if (st.answererId === st.you) {
      el.textContent = "あなたが回答中！4択から選んでね";
    } else {
      el.textContent = `${playerName(st.answererId)}さんが回答中…`;
    }
  } else if (st.phase === "reveal") {
    const corr = st.lastCorrect ?? -1;
    const corrText = st.question?.choices[corr] ?? "";
    if (st.lastAnswer && st.lastAnswer.choice >= 0) {
      const who = playerName(st.lastAnswer.playerId);
      el.textContent = st.lastAnswer.correct
        ? `${who}さん正解！ +10点 🎉 正解は「${corrText}」`
        : `${who}さん不正解… -5点。正解は「${corrText}」`;
    } else if (st.lastAnswer) {
      const who = playerName(st.lastAnswer.playerId);
      el.textContent = `${who}さんは時間切れ… -5点。正解は「${corrText}」`;
    } else {
      el.textContent = `時間切れ！正解は「${corrText}」`;
    }
  } else {
    el.textContent = "";
  }
}

function render(st) {
  $("room-code-label").textContent = st.code;
  if (st.phase === "lobby") {
    showOnly("lobby");
    $("lobby-code").textContent = st.code;
    renderPlayerList($("player-list"), st, false);
    const me = st.players.find((p) => p.id === st.you);
    const startBtn = $("start-btn");
    if (me?.isHost) {
      startBtn.hidden = false;
      const n = st.players.length;
      startBtn.disabled = n < 2 || n > 4;
      $("lobby-status").textContent =
        n < 2
          ? `あと${2 - n}人で開始できます（友だちを待っています…）`
          : `${n}人そろっています！ホストが開始できます`;
    } else {
      startBtn.hidden = true;
      $("lobby-status").textContent =
        "ホストの開始を待っています…（2人以上で開始できます）";
    }
  } else if (st.phase === "finished") {
    showOnly("result");
    const ol = $("result-list");
    ol.textContent = "";
    for (const r of st.ranking ?? []) {
      const li = document.createElement("li");
      if (r.rank === 1) li.classList.add("first");
      const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `${r.rank}位`;
      const rk = document.createElement("span");
      rk.className = "rk";
      rk.textContent = medal;
      const nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = r.name + (r.id === st.you ? "（あなた）" : "");
      const sc = document.createElement("span");
      sc.className = "sc";
      sc.textContent = `${r.score}点`;
      li.append(rk, nm, sc);
      ol.appendChild(li);
    }
  } else {
    showOnly("game");
    const total = st.totalQuestions;
    $("q-counter").textContent = `第${st.qIndex + 1}問 / ${total}`;
    $("question-text").textContent = st.question?.text ?? "";
    renderChoices(st);
    renderStatus(st);
    renderPlayerList($("score-list"), st, true);
    const buzzBtn = $("buzz-btn");
    const canBuzz =
      st.phase === "question" && !st.disqualified.includes(st.you);
    buzzBtn.disabled = !canBuzz;
    if (st.disqualified.includes(st.you) && st.phase !== "reveal") {
      buzzBtn.textContent = "回答済み";
    } else if (st.phase === "answering" && st.answererId === st.you) {
      buzzBtn.textContent = "回答中…";
    } else {
      buzzBtn.textContent = "早押し！";
    }
    setLobbyError("");
  }
  updateTimer();
}

function updateTimer() {
  const st = lastState;
  if (!st) return;
  const fill = $("timer-fill");
  const text = $("timer-text");
  const now = serverNow();
  let remain = null;
  let total = 1;
  let label = "";
  if (st.phase === "question" && st.questionDeadline != null) {
    remain = Math.max(0, st.questionDeadline - now);
    total = 20000;
    label = "早押し受付中";
  } else if (st.phase === "answering" && st.answerDeadline != null) {
    remain = Math.max(0, st.answerDeadline - now);
    total = 10000;
    label = st.answererId === st.you ? "あなたの回答" : "回答中";
  } else if (st.phase === "reveal" && st.revealAt != null) {
    remain = Math.max(0, st.revealAt - now);
    total = 3000;
    label = "次の問題まで";
  }
  if (remain === null) {
    fill.style.width = "0%";
    text.textContent = "";
    return;
  }
  const sec = remain / 1000;
  fill.style.width = `${Math.min(100, (remain / total) * 100)}%`;
  fill.classList.toggle("low", sec <= 5);
  text.textContent = `${label} 残り ${sec.toFixed(1)} 秒`;
}

function tickTimer() {
  if (lastState && !views.game.hidden) updateTimer();
  requestAnimationFrame(tickTimer);
}

function init() {
  $("create-btn").addEventListener("click", createRoom);
  $("join-btn").addEventListener("click", joinRoom);
  $("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") createRoom();
  });
  $("code-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinRoom();
  });
  $("start-btn").addEventListener("click", () => {
    setLobbyError("");
    send({ t: "start" });
  });
  $("buzz-btn").addEventListener("click", () => {
    if (lastState) send({ t: "buzz", q: lastState.qIndex });
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    const tag = document.activeElement?.tagName ?? "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (views.game.hidden) return;
    const btn = $("buzz-btn");
    if (!btn.disabled) {
      e.preventDefault();
      btn.click();
    }
  });
  $("leave-btn").addEventListener("click", () => {
    clearSession();
    disconnect(true);
  });
  $("back-btn").addEventListener("click", () => {
    clearSession();
    disconnect(true);
  });
  window.addEventListener("offline", () => {
    if (ws) {
      try {
        ws.close();
      } catch {
        // 無視
      }
    }
    setReconnecting(true);
  });
  window.addEventListener("online", () => {
    if (wantConnection && session) connect();
  });

  const saved = loadSession();
  if (saved) {
    saveSession(saved);
    if ($("name-input") && saved.name) $("name-input").value = saved.name;
    connect();
  } else {
    showOnly("entry");
  }
  requestAnimationFrame(tickTimer);
}

document.addEventListener("DOMContentLoaded", init);

// E2E テスト用の読み取りフック（表示に影響しない）
window.__bq = {
  get state() {
    return lastState;
  },
  get session() {
    return session;
  },
};
