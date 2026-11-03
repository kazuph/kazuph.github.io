/* ==========================================================
   早押しクイズ フロントエンド
   状態は全部サーバーから届くので、このファイルは「描くだけ」。
   ========================================================== */

const STORAGE_KEY = "buzzer-quiz.session";
const RECONNECT_DELAY_MS = 1000;
const CHOICE_LABELS = ["A", "B", "C", "D"];

/** localStorage に保存する自分の情報 */
let session = loadSession();
/** サーバーが送ってきた最新の状態 */
let state = null;
/** サーバーの時計とこの端末の時計の差 (ms) */
let serverOffset = 0;
let socket = null;
let reconnectTimer = null;
let intentionallyClosed = false;
let lastPhase = null;

const el = (id) => document.getElementById(id);

const screens = {
  entry: el("screen-entry"),
  lobby: el("screen-lobby"),
  game: el("screen-game"),
  result: el("screen-result"),
};

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.code && parsed.playerId && parsed.token) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(next) {
  session = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clearSession() {
  session = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------
   画面切り替え
   --------------------------------------------------------- */
function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    if (!node) continue;
    node.classList.toggle("is-active", key === name);
  }
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------
   入場
   --------------------------------------------------------- */
function showEntryError(message) {
  const box = el("entry-error");
  box.textContent = message;
  box.hidden = !message;
}

async function createRoom() {
  const name = el("name-input").value.trim();
  if (!name) {
    showEntryError("名前を入力してください。");
    el("name-input").focus();
    return;
  }
  showEntryError("");
  el("create-room-btn").disabled = true;
  el("join-room-btn").disabled = true;
  try {
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showEntryError(data.error || "部屋を作れませんでした。");
      return;
    }
    saveSession({
      code: data.code,
      playerId: data.playerId,
      token: data.token,
      name,
    });
    connect();
  } catch (error) {
    showEntryError("通信に失敗しました。もう一度お試しください。");
    console.error(error);
  } finally {
    el("create-room-btn").disabled = false;
    el("join-room-btn").disabled = false;
  }
}

async function joinRoom() {
  const name = el("name-input").value.trim();
  const code = el("code-input").value.trim().toUpperCase();
  if (!name) {
    showEntryError("名前を入力してください。");
    el("name-input").focus();
    return;
  }
  if (code.length < 4) {
    showEntryError("部屋コードを入力してください。");
    el("code-input").focus();
    return;
  }
  showEntryError("");
  el("create-room-btn").disabled = true;
  el("join-room-btn").disabled = true;
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showEntryError(data.error || "参加できませんでした。");
      return;
    }
    saveSession({
      code: data.code,
      playerId: data.playerId,
      token: data.token,
      name,
    });
    connect();
  } catch (error) {
    showEntryError("通信に失敗しました。もう一度お試しください。");
    console.error(error);
  } finally {
    el("create-room-btn").disabled = false;
    el("join-room-btn").disabled = false;
  }
}

/* ---------------------------------------------------------
   WebSocket
   --------------------------------------------------------- */
function setConnectionStatus(text) {
  const banner = el("connection");
  const label = el("connection-text");
  if (!text) {
    banner.hidden = true;
    return;
  }
  label.textContent = text;
  banner.hidden = false;
}

function connect() {
  if (!session) return;
  intentionallyClosed = false;
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.host}/api/rooms/${session.code}/ws?token=${encodeURIComponent(
    session.token,
  )}`;
  setConnectionStatus("接続中…");
  try {
    socket = new WebSocket(url);
  } catch (error) {
    console.error(error);
    scheduleReconnect();
    return;
  }
  socket.addEventListener("open", () => {
    setConnectionStatus("");
  });
  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    handleMessage(message);
  });
  socket.addEventListener("close", () => {
    if (intentionallyClosed) return;
    scheduleReconnect();
  });
  socket.addEventListener("error", () => {
    setConnectionStatus("再接続中…");
  });
}

function scheduleReconnect() {
  setConnectionStatus("再接続中…");
  if (reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

function send(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

/* ---------------------------------------------------------
   メッセージの処理
   --------------------------------------------------------- */
function handleMessage(message) {
  if (message.t === "pong") return;
  if (message.t === "error") {
    setGameMessage(message.message || "エラーが発生しました。", "bad");
    return;
  }
  if (message.t !== "state") return;

  if (typeof message.serverNow === "number") {
    serverOffset = message.serverNow - Date.now();
  }
  state = message;
  render();
}

function serverNow() {
  return Date.now() + serverOffset;
}

function me() {
  if (!state || !state.players) return null;
  return state.players.find((p) => p.id === state.you) || null;
}

/* ---------------------------------------------------------
   描画
   --------------------------------------------------------- */
function render() {
  if (!state) return;
  const phase = state.phase;
  if (phase === "lobby") {
    showScreen("lobby");
    renderLobby();
  } else if (phase === "finished") {
    showScreen("result");
    renderResult();
  } else {
    showScreen("game");
    renderGame();
  }
  lastPhase = phase;
}

function renderLobby() {
  el("lobby-code").textContent = state.roomCode;
  el("lobby-count").textContent = `${state.players.length} / 4`;
  const list = el("lobby-list");
  list.innerHTML = "";
  for (const player of state.players) {
    const item = document.createElement("li");
    item.className = "player" + (player.connected ? "" : " player--offline");
    item.innerHTML = `
      <span class="player__name"></span>
      ${player.isHost ? '<span class="player__tag">ホスト</span>' : ""}
      ${player.connected ? "" : '<span class="player__tag player__tag--off">切断中</span>'}
    `;
    item.querySelector(".player__name").textContent = player.name;
    list.appendChild(item);
  }
  const startBtn = el("start-btn");
  const isHost = state.you === state.hostId;
  const enough = state.players.length >= 2 && state.players.length <= 4;
  startBtn.disabled = !(isHost && enough);
  const hint = el("lobby-hint");
  if (!isHost) {
    hint.textContent = "ホストがゲームを開始します。準備してください。";
  } else if (!enough) {
    hint.textContent = "2人以上の参加者がいると開始できます。";
  } else {
    hint.textContent = "準備ができました。ゲームを開始してください。";
  }
}

function renderGame() {
  const question = state.question;
  el("game-code").textContent = state.roomCode;
  el("game-progress").textContent = `第 ${question ? question.index + 1 : 0} 問 / ${state.totalQuestions}`;
  el("question-text").textContent = question ? question.text : "…";

  const mePlayer = me();
  const buzzPlayer = state.buzz;
  const isAnswerer = !!buzzPlayer && buzzPlayer.playerId === state.you;
  const isReveal = state.phase === "reveal";
  const canAnswer = state.phase === "answering" && isAnswerer;

  // 選択肢
  const choices = el("choices");
  choices.innerHTML = "";
  if (question) {
    question.choices.forEach((text, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.dataset.index = String(index);
      button.innerHTML = `<span class="choice__label">${CHOICE_LABELS[index]}</span><span class="choice__text"></span>`;
      button.querySelector(".choice__text").textContent = text;
      button.disabled = !canAnswer;
      if (isReveal && state.correctChoice === index) {
        button.classList.add("choice--revealed");
      }
      if (isReveal && state.lastOutcome && state.lastOutcome.choice === index && !state.lastOutcome.correct) {
        button.classList.add("choice--wrong");
      }
      button.addEventListener("click", () => {
        if (!canAnswer) return;
        send({ t: "answer", q: question.index, choice: index });
      });
      choices.appendChild(button);
    });
  }

  // 早押しボタン
  const buzzBtn = el("buzz-btn");
  const eliminated = !!(mePlayer && mePlayer.eliminated);
  const canBuzz = state.phase === "question" && !eliminated;
  buzzBtn.disabled = !canBuzz;
  buzzBtn.classList.toggle("buzz--mine", isAnswerer);
  const hint = buzzBtn.querySelector(".buzz__hint");
  if (isAnswerer) {
    hint.textContent = "回答する！";
  } else if (eliminated) {
    hint.textContent = "この問題は回答済み";
  } else if (state.phase === "answering") {
    hint.textContent = "決着中…";
  } else {
    hint.textContent = "押す！ / スペースキー";
  }

  // メッセージ
  let message = "";
  let tone = "info";
  if (state.phase === "answering" && buzzPlayer) {
    message = isAnswerer ? "あなたが回答権を得ました！ 10秒以内に選んでください。" : `${buzzPlayer.playerName}さんが回答中…`;
    tone = isAnswerer ? "good" : "info";
  } else if (state.phase === "question") {
    message = "早く押そう！";
    tone = "info";
  }
  const outcome = state.lastOutcome;
  if (outcome && (state.phase === "question" || state.phase === "answering")) {
    if (outcome.timedOut) {
      message = `${outcome.playerName}さんは時間切れで -5 点`;
      tone = "bad";
    } else if (!outcome.correct) {
      message = `${outcome.playerName}さんは不正解（-5点）  ほかの人が早押しできます`;
      tone = "bad";
    }
  }
  if (state.phase === "reveal") {
    if (outcome && outcome.correct) {
      message = `${outcome.playerName}さん正解！ +10点`;
      tone = "good";
    } else {
      message = "正解は…";
      tone = "info";
    }
  }
  setGameMessage(message, tone);

  // スコアボード
  const list = el("score-list");
  list.innerHTML = "";
  const players = state.players.slice().sort((a, b) => b.score - a.score);
  for (const player of players) {
    const item = document.createElement("li");
    const isBuzz = !!buzzPlayer && buzzPlayer.playerId === player.id;
    item.className = "player" + (isBuzz ? " player--buzz" : "") + (player.connected ? "" : " player--offline");
    let tag = "";
    if (!player.connected) {
      tag = '<span class="player__tag player__tag--off">切断中</span>';
    } else if (isBuzz) {
      tag = '<span class="player__tag player__tag--buzz">回答中</span>';
    } else if (player.eliminated && state.phase !== "finished") {
      tag = '<span class="player__tag player__tag--done">回答済み</span>';
    }
    item.innerHTML = `
      <span class="player__name"></span>
      ${player.isHost ? '<span class="player__tag">ホスト</span>' : ""}
      ${tag}
      <span class="player__score">${player.score}</span>
    `;
    item.querySelector(".player__name").textContent = player.name;
    list.appendChild(item);
  }
}

function renderResult() {
  const ranking = el("ranking");
  ranking.innerHTML = "";
  const rows = state.ranking || [];
  for (const row of rows) {
    const item = document.createElement("li");
    item.className = "rank" + (row.rank === 1 ? " rank--1" : row.rank === 2 ? " rank--2" : row.rank === 3 ? " rank--3" : "");
    item.innerHTML = `
      <span class="rank__no">${row.rank}</span>
      <span class="rank__name"></span>
      <span class="rank__score">${row.score}</span>
    `;
    item.querySelector(".rank__name").textContent = row.name;
    ranking.appendChild(item);
  }
}

function setGameMessage(text, tone) {
  const node = el("game-message");
  node.textContent = text || "";
  node.className = "game__message" + (tone ? ` game__message--${tone}` : "");
}

/* ---------------------------------------------------------
   残り時間
   --------------------------------------------------------- */
function updateTimer() {
  const fill = el("timer-fill");
  const text = el("timer-text");
  if (!state || !state.deadline) {
    fill.style.width = "0%";
    text.textContent = "-- 秒";
    return;
  }
  // 問題の長さは不明なので、20秒を100%として計算する
  const total = state.phase === "question" ? 20000 : state.phase === "answering" ? 10000 : 3000;
  const remain = Math.max(0, state.deadline - serverNow());
  const ratio = Math.max(0, Math.min(1, remain / total));
  fill.style.width = `${ratio * 100}%`;
  fill.classList.toggle("is-urgent", remain <= 5000);
  text.textContent = `${Math.ceil(remain / 1000)} 秒`;
}

setInterval(updateTimer, 100);

/* ---------------------------------------------------------
   入力
   --------------------------------------------------------- */
el("create-room-btn").addEventListener("click", createRoom);
el("join-room-btn").addEventListener("click", joinRoom);
el("code-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});
el("name-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createRoom();
});
el("code-input").addEventListener("input", (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

el("buzz-btn").addEventListener("click", () => {
  if (!state || state.phase !== "question") return;
  const mePlayer = me();
  if (mePlayer && mePlayer.eliminated) return;
  send({ t: "buzz", q: state.question ? state.question.index : -1 });
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" && event.key !== " ") return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
  if (!state || state.phase !== "question") return;
  const mePlayer = me();
  if (mePlayer && mePlayer.eliminated) return;
  event.preventDefault();
  send({ t: "buzz", q: state.question ? state.question.index : -1 });
});

el("back-btn").addEventListener("click", () => {
  intentionallyClosed = true;
  if (socket) socket.close();
  clearSession();
  state = null;
  showScreen("entry");
  showEntryError("");
});

window.addEventListener("offline", () => {
  if (socket) {
    intentionallyClosed = true;
    try {
      socket.close();
    } catch {
      /* ignore */
    }
  }
  setConnectionStatus("オフラインです");
});

window.addEventListener("online", () => {
  intentionallyClosed = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  connect();
});

/* ---------------------------------------------------------
   起動
   --------------------------------------------------------- */
if (session) {
  el("name-input").value = session.name || "";
  connect();
} else {
  showScreen("entry");
}
