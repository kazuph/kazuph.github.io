/* 早押しクイズ — フロントエンド。状態はすべてサーバーからの配信で更新する。 */
"use strict";

const STORAGE_KEY = "buzzer-quiz-identity";

const els = {
  screens: {
    entry: document.getElementById("screen-entry"),
    lobby: document.getElementById("screen-lobby"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result"),
  },
  entryError: document.getElementById("entry-error"),
  name: document.getElementById("name"),
  code: document.getElementById("code"),
  createBtn: document.getElementById("create-btn"),
  joinBtn: document.getElementById("join-btn"),
  lobbyCode: document.getElementById("lobby-code"),
  copyCode: document.getElementById("copy-code"),
  lobbyPlayers: document.getElementById("lobby-players"),
  lobbyNote: document.getElementById("lobby-note"),
  startBtn: document.getElementById("start-btn"),
  lobbyStatus: document.getElementById("lobby-status"),
  roundLabel: document.getElementById("round-label"),
  timerFill: document.getElementById("timer-fill"),
  timerSec: document.getElementById("timer-sec"),
  questionText: document.getElementById("question-text"),
  choices: document.getElementById("choices"),
  buzz: document.getElementById("buzz"),
  status: document.getElementById("status"),
  board: document.getElementById("board"),
  gameStatus: document.getElementById("game-status"),
  resultList: document.getElementById("result-list"),
  resultNote: document.getElementById("result-note"),
  toast: document.getElementById("toast"),
};

let identity = loadIdentity(); // { code, playerId, token, name }
let ws = null;
let intentionallyClosed = false;
let reconnectTimer = null;
let connectAttempts = 0;
let serverOffset = 0; // serverNow - Date.now()
let last = null; // 最後に受け取った state
let toastTimer = null;

// ------------------------------------------------------------ 補助

function loadIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.code && data.playerId && data.token && data.name) return data;
  } catch {
    // 壊れていたら捨てる
  }
  return null;
}

function saveIdentity(v) {
  identity = v;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // localStorage が使えなくても遊びは続く
  }
}

function clearIdentity() {
  identity = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

function showScreen(name) {
  for (const [key, el] of Object.entries(els.screens)) {
    el.hidden = key !== name;
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3000);
}

function remainingMs(deadline) {
  return Math.max(0, deadline - (Date.now() + serverOffset));
}

// ------------------------------------------------------------ 通信

function connect() {
  if (!identity) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const url = `${location.origin.replace(/^http/, "ws")}/api/rooms/${identity.code}/ws?token=${encodeURIComponent(identity.token)}`;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.t === "error") {
      showToast(msg.message);
      return;
    }
    if (msg.t === "pong") return;
    if (!msg || typeof msg.phase !== "string") return;
    handleState(msg);
  };
  // 切断検知のため定期的に生存確認（サーバーは ping に pong で返す）
  const pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) sendMessage({ t: "ping" });
  }, 15000);
  ws.onclose = (ev) => {
    clearInterval(pingTimer);
    ws = null;
    if (ev.code === 4000) {
      // 同じ token の新しい接続に交代された
      showToast("同じプレイヤーが別の画面から接続しました");
      return;
    }
    if (!intentionallyClosed && identity) {
      setStatus("再接続中…");
      scheduleReconnect();
    }
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  connectAttempts += 1;
  reconnectTimer = setTimeout(connect, 1000);
}

function sendMessage(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function setStatus(text) {
  els.gameStatus.hidden = !text;
  els.lobbyStatus.hidden = !text;
  if (text) {
    els.gameStatus.textContent = text;
    els.lobbyStatus.textContent = text;
  } else {
    connectAttempts = 0;
  }
}

window.addEventListener("offline", () => {
  intentionallyClosed = true;
  if (ws) ws.close();
  setStatus("回線が切れています…");
});

window.addEventListener("online", () => {
  intentionallyClosed = false;
  clearTimeout(reconnectTimer);
  setStatus("再接続中…");
  connect();
});

// ------------------------------------------------------------ 画面の切替

function goEntry(message) {
  closeWs();
  showScreen("entry");
  if (message) showEntryError(message);
  last = null;
}

function closeWs() {
  clearTimeout(reconnectTimer);
  intentionallyClosed = true;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}

// ------------------------------------------------------------ 状態の描画

function handleState(msg) {
  serverOffset = msg.serverNow - Date.now();
  last = msg;
  render(msg);
}

function render(msg) {
  if (msg.phase === "lobby") {
    showScreen("lobby");
    renderLobby(msg);
    return;
  }
  if (msg.phase === "finished") {
    showScreen("result");
    renderResult(msg);
    return;
  }
  showScreen("game");
  renderGame(msg);
}

// ---- ロビー

function renderLobby(msg) {
  els.lobbyCode.textContent = msg.code;
  els.lobbyPlayers.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const p = msg.players[i];
    const div = document.createElement("div");
    div.className = "lobby-player";
    if (p) {
      if (!p.connected) div.classList.add("off");
      const name = document.createElement("span");
      name.className = "p-name";
      name.textContent = p.name;
      div.appendChild(name);
      if (i === 0) {
        const host = document.createElement("span");
        host.className = "host-mark";
        host.textContent = "ホスト";
        div.appendChild(host);
      }
      if (p.id === msg.you) {
        const you = document.createElement("span");
        you.className = "host-mark you-mark";
        you.textContent = "あなた";
        div.appendChild(you);
      }
    } else {
      div.classList.add("empty");
      div.textContent = "";
    }
    els.lobbyPlayers.appendChild(div);
  }

  const count = msg.players.length;
  els.startBtn.hidden = !msg.isHost; // 開始できるのはホストだけ
  els.startBtn.disabled = !(msg.isHost && count >= 2 && count <= 4);
  els.lobbyNote.textContent = msg.isHost
    ? count < 2 ? "2人以上そろうと「開始」が押せます" : "準備ができたら「開始」を押してください"
    : "ホストが開始を押すと始まります";
}

// ---- ゲーム

function renderGame(msg) {
  const round = Math.min(msg.qIndex + 1, msg.totalQuestions);
  els.roundLabel.textContent = `第${round}問`;

  els.questionText.textContent = msg.question ? msg.question.text : "";
  renderChoices(msg);
  renderBuzz(msg);
  renderStatus(msg);
  renderBoard(msg);
  updateTimer(msg);
}

let choiceKey = ""; // 同じ問題の再描画を避けて、クリック中の DOM 差し替えを防ぐ

function renderChoices(msg) {
  const key = msg.question ? `${msg.qIndex}:${msg.question.text}` : "";
  if (key !== choiceKey || els.choices.children.length !== 4) {
    els.choices.innerHTML = "";
    if (!msg.question) {
      choiceKey = "";
      return;
    }
    msg.question.choices.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.type = "button";
      btn.dataset.index = String(i);
      const maru = document.createElement("span");
      maru.className = "maru";
      maru.textContent = "ABCD"[i];
      const label = document.createElement("span");
      label.textContent = text;
      btn.append(maru, label);
      btn.addEventListener("click", () => pick(i));
      els.choices.appendChild(btn);
    });
    choiceKey = key;
  }
  if (!msg.question) return;

  // 有効/無効と正解表示だけを更新する（DOM は作り直さない）
  const canPick = msg.phase === "answering" && msg.answeringPlayerId === msg.you;
  for (const btn of els.choices.children) {
    const i = Number(btn.dataset.index);
    btn.disabled = !canPick;
    btn.classList.toggle("picked", canPick && lastPick === i);
    if (msg.phase === "reveal") {
      btn.classList.toggle("correct", msg.correct === i);
      btn.classList.toggle("wrong", !!(msg.outcome && msg.outcome.kind !== "correct" && msg.outcome.choice === i));
    } else {
      btn.classList.remove("correct", "wrong");
    }
  }
}

let lastPick = -1;

function pick(i) {
  if (!last || last.phase !== "answering" || last.answeringPlayerId !== last.you) return;
  lastPick = i;
  for (const b of els.choices.children) {
    b.classList.toggle("picked", Number(b.dataset.index) === i);
  }
  sendMessage({ t: "answer", q: last.qIndex, choice: i });
}

function renderBuzz(msg) {
  const canBuzz = msg.phase === "question" && !msg.eliminations.includes(msg.you);
  const iAmAnswering = msg.phase === "answering" && msg.answeringPlayerId === msg.you;
  els.buzz.disabled = !canBuzz || iAmAnswering;
  els.buzz.classList.toggle("hot", canBuzz);
  if (iAmAnswering) {
    els.buzz.textContent = "回答中";
  } else if (msg.phase === "question" && msg.eliminations.includes(msg.you)) {
    els.buzz.textContent = "済み";
  } else if (canBuzz) {
    els.buzz.textContent = "押！";
  } else {
    els.buzz.textContent = "待機";
  }
}

function renderStatus(msg) {
  const answerer = msg.answeringPlayerId ? msg.players.find((p) => p.id === msg.answeringPlayerId) : null;
  els.status.className = "status";
  if (msg.phase === "reveal") {
    const who = msg.outcome && msg.outcome.playerId
      ? (msg.players.find((p) => p.id === msg.outcome.playerId) || {}).name
      : null;
    if (msg.outcome && msg.outcome.kind === "correct") {
      els.status.textContent = `${who ?? "?"}さんの正解！ +10点`;
      els.status.style.color = "var(--good)";
    } else if (msg.outcome && msg.outcome.kind === "wrong") {
      els.status.textContent = `${who ?? "?"}さんは不正解… -5点`;
      els.status.style.color = "var(--bad)";
    } else if (msg.outcome && msg.outcome.kind === "timeout") {
      els.status.textContent = `${who ?? "?"}さんが答えられず -5点`;
      els.status.style.color = "var(--bad)";
    } else {
      els.status.textContent = "誰も押せませんでした…";
      els.status.style.color = "";
    }
  } else if (msg.phase === "answering" && answerer) {
    els.status.textContent = `${answerer.name}さんが回答中`;
    els.status.classList.add("answering");
  } else if (msg.phase === "question") {
    const left = msg.players.length - msg.eliminations.length;
    els.status.textContent = left === 1 && !msg.eliminations.includes(msg.you) ? "あなたの番です！" : "";
    els.status.style.color = "var(--primary)";
  }
}

function renderBoard(msg) {
  els.board.innerHTML = "";
  for (const [i, p] of msg.players.entries()) {
    const card = document.createElement("div");
    card.className = "player-card";
    if (p.id === msg.answeringPlayerId && msg.phase === "answering") card.classList.add("answering");
    if (msg.eliminations.includes(p.id)) card.classList.add("eliminated");

    const tags = document.createElement("span");
    tags.className = "p-tags";
    if (i === 0) {
      const host = document.createElement("span");
      host.className = "tag tag-host";
      host.textContent = "ホスト";
      tags.appendChild(host);
    }
    if (!p.connected) {
      const off = document.createElement("span");
      off.className = "tag tag-off";
      off.textContent = "接続切れ";
      tags.appendChild(off);
    }
    if (p.id === msg.you) {
      const you = document.createElement("span");
      you.className = "tag tag-you";
      you.textContent = "あなた";
      tags.appendChild(you);
    }
    if (msg.eliminations.includes(p.id) && (msg.phase === "question" || msg.phase === "answering")) {
      const out = document.createElement("span");
      out.className = "tag tag-timesup";
      out.textContent = "回答済み";
      tags.appendChild(out);
    }

    const name = document.createElement("span");
    name.className = "p-name";
    name.textContent = p.name;

    const score = document.createElement("span");
    score.className = "p-score";
    score.textContent = `${p.score}点`;

    card.append(tags, name, score);
    els.board.appendChild(card);
  }
}

// ---- 結果

function renderResult(msg) {
  els.resultList.innerHTML = "";
  const sorted = [...msg.players].sort((a, b) => b.score - a.score);
  let lastScore = null;
  let lastRank = 0;
  sorted.forEach((p, i) => {
    const rank = lastScore === p.score ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    const li = document.createElement("li");
    li.className = "result-row";
    li.innerHTML = `<span class="r-rank">${rank}位</span><span class="r-name"></span><span class="r-crown">${
      rank === 1 ? "👑" : ""
    }</span><span class="r-score"></span>`;
    li.querySelector(".r-name").textContent = p.name;
    li.querySelector(".r-score").textContent = `${p.score}点`;
    els.resultList.appendChild(li);
  });
  els.resultNote.textContent = "おつかれさまでした！";
}

// ------------------------------------------------------------ タイマー

setInterval(() => {
  if (last && (last.phase === "question" || last.phase === "answering")) {
    updateTimer(last);
  } else if (last && last.phase === "reveal") {
    // reveal は固定表示
  }
}, 120);

function updateTimer(msg) {
  if (!msg || msg.phase === "lobby" || msg.phase === "reveal" || msg.phase === "finished") {
    els.timerFill.style.width = "0%";
    els.timerSec.textContent = "";
    return;
  }
  const left = remainingMs(msg.deadline);
  const total = Math.max(1, msg.deadline - msg.shownAt);
  const frac = Math.max(0, Math.min(1, left / total));
  els.timerFill.style.width = `${frac * 100}%`;
  els.timerFill.classList.toggle("low", left < 5000);
  els.timerSec.textContent = left > 0 ? `${Math.ceil(left / 1000)}秒` : "";
}

// ------------------------------------------------------------ 入口・参加

function showEntryError(message) {
  els.entryError.textContent = message;
  els.entryError.hidden = false;
}

async function createRoom() {
  const name = els.name.value.trim();
  if (!name) return showEntryError("名前を入れてください");
  els.createBtn.disabled = true;
  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      showEntryError(data.error || "部屋を作れませんでした");
      return;
    }
    saveIdentity({ code: data.code, playerId: data.playerId, token: data.token, name });
    connect();
  } catch {
    showEntryError("通信エラーです。もう一度お試しください。");
  } finally {
    els.createBtn.disabled = false;
  }
}

async function joinRoom() {
  const name = els.name.value.trim();
  const code = els.code.value.trim().toUpperCase();
  if (!name) return showEntryError("名前を入れてください");
  if (!code) return showEntryError("部屋コードを入れてください");
  els.joinBtn.disabled = true;
  try {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      showEntryError(data.error || "参加できませんでした");
      return;
    }
    saveIdentity({ code: data.code, playerId: data.playerId, token: data.token, name });
    connect();
  } catch {
    showEntryError("通信エラーです。もう一度お試しください。");
  } finally {
    els.joinBtn.disabled = false;
  }
}

els.createBtn.addEventListener("click", () => void createRoom());
els.joinBtn.addEventListener("click", () => void joinRoom());
els.code.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void joinRoom();
});
els.name.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (els.code.value.trim()) void joinRoom();
    else void createRoom();
  }
});
els.name.addEventListener("input", () => {
  els.entryError.hidden = true;
});
els.code.addEventListener("input", () => {
  els.entryError.hidden = true;
  els.code.value = els.code.value.toUpperCase();
});

els.copyCode.addEventListener("click", () => {
  const code = els.lobbyCode.textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
  showToast(`部屋コード ${code} をコピーしました`);
});

els.startBtn.addEventListener("click", () => sendMessage({ t: "start" }));

// スペースキーで早押し
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) {
    const active = document.activeElement;
    if (active && active.tagName === "INPUT") return;
    e.preventDefault();
    doBuzz();
  }
});

els.buzz.addEventListener("click", doBuzz);

function doBuzz() {
  if (els.buzz.disabled || !last) return;
  if (last.phase !== "question") return;
  sendMessage({ t: "buzz", q: last.qIndex });
}

// ------------------------------------------------------------ 起動

function boot() {
  if (identity) {
    connect();
  } else {
    goEntry();
  }
}

boot();
