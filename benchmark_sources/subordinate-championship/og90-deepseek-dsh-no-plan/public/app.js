/* ============================================================
   早押しクイズ 4人対戦 — クライアント
   サーバー（Durable Object）から届く公開状態を描画するだけ。
   正誤判定・点数・早押し順は一切クライアントで決めない。
   ============================================================ */

const SESSION_KEY = "buzzerQuiz.session.v1";
const NAME_KEY = "buzzerQuiz.name.v1";
const RECONNECT_DELAY_MS = 800;

const $ = (id) => document.getElementById(id);

const el = {
  screens: {
    home: $("screen-home"),
    lobby: $("screen-lobby"),
    game: $("screen-game"),
    result: $("screen-result"),
  },
  banner: $("connection-banner"),
  connectionText: $("connection-text"),
  toast: $("toast"),
  nameInput: $("name-input"),
  codeInput: $("code-input"),
  createBtn: $("create-btn"),
  joinBtn: $("join-btn"),
  homeError: $("home-error"),
  lobbyCode: $("lobby-code"),
  copyBtn: $("copy-btn"),
  leaveBtn: $("leave-btn"),
  lobbyCount: $("lobby-count"),
  lobbyPlayers: $("lobby-players"),
  lobbyHint: $("lobby-hint"),
  startBtn: $("start-btn"),
  qIndex: $("q-index"),
  qTotal: $("q-total"),
  phaseBadge: $("phase-badge"),
  timerFill: $("timer-fill"),
  timerText: $("timer-text"),
  timerLabel: $("timer-label"),
  questionText: $("question-text"),
  choices: $("choices"),
  answerBanner: $("answer-banner"),
  scoreList: $("score-list"),
  buzzBtn: $("buzz-btn"),
  buzzSub: $("buzz-sub"),
  buzzHint: $("buzz-hint"),
  ranking: $("ranking"),
  againBtn: $("again-btn"),
  resultLeaveBtn: $("result-leave-btn"),
};

const app = {
  session: null, // { roomCode, playerId, token, name }
  game: null, // サーバーの公開状態
  offset: 0, // serverNow - clientNow
  ws: null,
  connected: false,
  everOpened: false,
  reconnectTimer: null,
  leaving: false,
  toastTimer: null,
};

/* ------------------------------------------------------------ utilities */

const serverNow = () => Date.now() + app.offset;

function show(screen) {
  for (const [name, node] of Object.entries(el.screens)) {
    node.classList.toggle("hidden", name !== screen);
  }
  document.body.dataset.screen = screen;
}

function toast(message, ms = 2600) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => el.toast.classList.add("hidden"), ms);
}

function setBanner(visible, text) {
  if (text) el.connectionText.textContent = text;
  el.banner.classList.toggle("hidden", !visible);
}

function avatarColor(name) {
  const palette = ["#ffd479", "#8ef2ff", "#c4b5fd", "#86efac", "#fda4af", "#fcd34d"];
  let h = 0;
  for (const ch of name || "") h = (h * 31 + ch.codePointAt(0)) % 997;
  return palette[h % palette.length];
}

/* --------------------------------------------------------------- sounds */

let audioCtx = null;
function beep(freq, duration = 0.09, type = "sine", gain = 0.05, slideTo = null) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* 音は本質ではないので失敗しても無視 */
  }
}

/* ------------------------------------------------------------- session */

function saveSession(session) {
  app.session = session;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.roomCode && s.playerId && s.token) return s;
  } catch {
    /* ignore */
  }
  return null;
}

function goHome(message) {
  app.leaving = true;
  clearTimeout(app.reconnectTimer);
  if (app.ws) {
    try {
      app.ws.close();
    } catch {
      /* ignore */
    }
  }
  app.ws = null;
  app.game = null;
  app.connected = false;
  saveSession(null);
  history.replaceState(null, "", location.pathname);
  setBanner(false);
  show("home");
  if (message) {
    el.homeError.textContent = message;
  }
}

/* ------------------------------------------------------------------ API */

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(body?.error || `エラーが発生しました (${res.status})`);
  return body;
}

/* ------------------------------------------------------------ WebSocket */

function wsUrl(session) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ playerId: session.playerId, token: session.token });
  return `${proto}//${location.host}/api/rooms/${encodeURIComponent(session.roomCode)}/ws?${params}`;
}

function connect() {
  const session = app.session;
  if (!session) return;
  app.everOpened = false;
  let ws;
  try {
    ws = new WebSocket(wsUrl(session));
  } catch (err) {
    scheduleReconnect();
    return;
  }
  app.ws = ws;

  ws.addEventListener("open", () => {
    app.connected = true;
    app.everOpened = true;
    setBanner(false);
  });

  ws.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    handleMessage(msg);
  });

  ws.addEventListener("close", () => {
    if (app.ws !== ws) return;
    app.connected = false;
    if (app.leaving) return;
    setBanner(true, app.everOpened ? "接続が切れました。再接続しています…" : "接続しています…");
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    /* close が続けて発火する */
  });
}

function scheduleReconnect() {
  if (!app.session) return;
  clearTimeout(app.reconnectTimer);
  app.reconnectTimer = setTimeout(async () => {
    if (!app.session) return;
    // 部屋が消えていたらホームへ戻す
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(app.session.roomCode)}`);
      if (res.status === 404) {
        goHome("部屋が見つかりませんでした。もう一度やり直してください。");
        return;
      }
    } catch {
      /* ネットワーク不調でも再接続を試す */
    }
    connect();
  }, RECONNECT_DELAY_MS);
}

function send(message) {
  if (app.ws && app.ws.readyState === WebSocket.OPEN) {
    app.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

/* ------------------------------------------------------------- messages */

function handleMessage(msg) {
  if (msg.type === "state") {
    if (typeof msg.serverNow === "number") app.offset = msg.serverNow - Date.now();
    app.game = msg.state;
    render();
    updateTimers();
    return;
  }
  if (msg.type === "events") {
    handleEvents(msg.events || []);
    return;
  }
  if (msg.type === "error") {
    toast(msg.message);
    return;
  }
}

function handleEvents(events) {
  const myId = app.session?.playerId;
  for (const ev of events) {
    if (ev.type === "buzz-granted" && ev.playerId === myId) {
      el.buzzBtn.classList.add("granted");
      beep(880, 0.12, "triangle", 0.06, 1320);
    } else if (ev.type === "buzz-granted") {
      beep(440, 0.08, "square", 0.03);
    } else if (ev.type === "buzz-denied" && ev.playerId === myId) {
      el.buzzBtn.classList.remove("granted");
      el.buzzBtn.classList.add("denied");
      setTimeout(() => el.buzzBtn.classList.remove("denied"), 420);
      beep(180, 0.14, "sawtooth", 0.03);
    } else if (ev.type === "answer-correct") {
      beep(660, 0.12, "triangle", 0.06, 990);
      setTimeout(() => beep(990, 0.16, "triangle", 0.06, 1320), 110);
    } else if (ev.type === "answer-wrong") {
      beep(300, 0.18, "sawtooth", 0.04, 150);
    } else if (ev.type === "game-finished") {
      beep(523, 0.15, "triangle", 0.05, 659);
      setTimeout(() => beep(784, 0.28, "triangle", 0.05, 1047), 160);
    }
  }
}

/* --------------------------------------------------------------- render */

function render() {
  const g = app.game;
  if (!app.session) {
    show("home");
    return;
  }
  if (!g) {
    // 最初のスナップショット待ち。ロビー枠だけ見せる
    el.lobbyCode.textContent = app.session.roomCode;
    el.lobbyPlayers.innerHTML = "";
    el.lobbyCount.textContent = "…";
    el.startBtn.disabled = true;
    show("lobby");
    return;
  }
  if (g.phase === "lobby") {
    renderLobby(g);
    show("lobby");
  } else if (g.phase === "finished") {
    renderResult(g);
    show("result");
  } else {
    renderGame(g);
    show("game");
  }
}

function renderLobby(g) {
  const myId = app.session.playerId;
  el.lobbyCode.textContent = g.code;
  el.lobbyCount.textContent = `${g.players.length} / ${g.capacity}`;

  const slots = [];
  g.players.forEach((p) => {
    slots.push(playerSlotHtml(p, myId));
  });
  for (let i = g.players.length; i < g.capacity; i++) {
    slots.push(`<li class="player-slot empty"><div class="avatar" style="background:rgba(255,255,255,.08)">＋</div><div class="p-name">空き</div></li>`);
  }
  el.lobbyPlayers.innerHTML = slots.join("");

  const isHost = g.hostId === myId;
  const enough = g.players.length >= 2;
  el.startBtn.classList.toggle("hidden", !isHost);
  el.startBtn.disabled = !(isHost && enough);
  el.startBtn.textContent = enough ? "ゲーム開始" : "まだ開始できません";
  if (isHost) {
    el.lobbyHint.textContent = enough
      ? "全員そろったら「ゲーム開始」を押してください。"
      : "あと1人以上参加すると開始できます。";
  } else {
    el.lobbyHint.textContent = "ホストが「ゲーム開始」を押すのを待っています…";
  }
}

function playerSlotHtml(p, myId) {
  const tags = [];
  if (p.id === g_hostId()) tags.push('<span class="tag host">ホスト</span>');
  if (p.id === myId) tags.push('<span class="tag you">あなた</span>');
  if (!p.connected) tags.push('<span class="tag off">切断中</span>');
  const initial = (p.name || "?").slice(0, 1);
  return `<li class="player-slot">
    <div class="avatar" style="background:${avatarColor(p.name)}">${escapeHtml(initial)}</div>
    <div class="p-name">${escapeHtml(p.name)}</div>
    <div class="p-tags">${tags.join("")}</div>
  </li>`;
}

function g_hostId() {
  return app.game?.hostId;
}

/** プレイヤー ID から表示名を引く */
function nameOf(g, id) {
  if (!id || !g) return "";
  const player = g.players.find((p) => p.id === id);
  return player ? player.name : "";
}

function renderGame(g) {
  const myId = app.session.playerId;

  el.qIndex.textContent = String(g.qIndex + 1);
  el.qTotal.textContent = String(g.totalQuestions);

  const badgeText = g.phase === "buzzing" ? "早押し受付中" : g.phase === "answering" ? "回答中" : "正解発表";
  el.phaseBadge.textContent = badgeText;
  el.phaseBadge.className = `phase-badge ${g.phase}`;

  el.questionText.textContent = g.question ? g.question.text : "";

  // ---- 選択肢
  const reveal = g.reveal;
  const answererName = nameOf(g, g.answererId);
  const iAmAnswerer = g.answererId === myId;
  el.choices.innerHTML = "";
  (g.question?.choices ?? []).forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.choice = String(index);
    btn.innerHTML = `<span class="key">${"ABCD"[index]}</span><span class="label">${escapeHtml(choice)}</span>`;

    if (g.phase === "reveal" && reveal) {
      btn.disabled = true;
      if (index === reveal.answerIndex) btn.classList.add("correct");
      else if (reveal.chosenIndex === index && reveal.answerIndex !== index) btn.classList.add("wrong");
      else btn.classList.add("dim");
    } else if (g.phase === "answering" && iAmAnswerer) {
      btn.disabled = false;
      btn.classList.add("answerable");
      btn.addEventListener("click", () => answer(index));
    } else {
      btn.disabled = true;
      btn.classList.add("dim");
    }
    el.choices.appendChild(btn);
  });

  // ---- スコア
  el.scoreList.innerHTML = g.players.map((p) => scoreRowHtml(p, g, myId)).join("");

  // ---- バナー
  let banner = { text: "", cls: "" };
  if (g.phase === "buzzing") {
    if (g.buzzedOut.includes(myId)) {
      banner = { text: "あなたはこの問題でもう押せません（不正解）", cls: "" };
    } else {
      banner = { text: "早押しボタンを押そう！", cls: "" };
    }
  } else if (g.phase === "answering") {
    banner = iAmAnswerer
      ? { text: "あなたが回答権を獲得！ 10秒以内に選んでください", cls: "me" }
      : { text: `${answererName} さんが回答中…`, cls: "other" };
  } else if (g.phase === "reveal" && reveal) {
    const correct = g.question?.choices[reveal.answerIndex] ?? "";
    if (reveal.scoredPlayerId) {
      banner = {
        text: `正解は「${correct}」！ ${nameOf(g, reveal.scoredPlayerId)} さんが +10点`,
        cls: "reveal",
      };
    } else {
      banner = { text: `正解は「${correct}」！ 正解者はいませんでした`, cls: "reveal" };
    }
  }
  el.answerBanner.textContent = banner.text;
  el.answerBanner.className = `answer-banner ${banner.cls}`;

  // ---- 早押しボタン
  const canBuzz = g.phase === "buzzing" && !g.answererId && !g.buzzedOut.includes(myId) && g.players.length >= 2;
  el.buzzBtn.disabled = !canBuzz;
  if (!canBuzz) el.buzzBtn.classList.remove("granted");
  el.buzzBtn.classList.toggle("granted", g.phase === "answering" && iAmAnswerer);

  if (g.phase === "buzzing") {
    if (g.buzzedOut.includes(myId)) {
      el.buzzSub.textContent = "押せません";
      el.buzzHint.textContent = "他のプレイヤーの早押しを待っています…";
    } else {
      el.buzzSub.textContent = "早押し";
      el.buzzHint.textContent = "最初に押した人だけが回答できます";
    }
  } else if (g.phase === "answering") {
    el.buzzSub.textContent = iAmAnswerer ? "回答中" : "回答待ち";
    el.buzzHint.textContent = iAmAnswerer ? "" : `${answererName} さんの回答を待っています…`;
  } else {
    el.buzzSub.textContent = "答え合わせ";
    el.buzzHint.textContent = "つぎの問題を準備しています…";
  }
}

function scoreRowHtml(p, g, myId) {
  const cls = ["score-row"];
  if (p.id === myId) cls.push("me");
  if (g.answererId === p.id) cls.push("answering");
  else if (g.buzzedOut.includes(p.id)) cls.push("out");
  if (!p.connected) cls.push("offline");
  const status = g.answererId === p.id ? '<span class="s-status answering">回答中</span>' : "";
  const off = !p.connected ? '<span class="s-status">切断</span>' : "";
  const scoreCls = p.score > 0 ? "positive" : p.score < 0 ? "negative" : "";
  return `<li class="${cls.join(" ")}">
    <span class="avatar" style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;font-weight:800;color:#08101f;background:${avatarColor(p.name)}">${escapeHtml((p.name || "?").slice(0, 1))}</span>
    <span class="s-name">${escapeHtml(p.name)}</span>
    ${status}${off}
    <span class="s-score ${scoreCls}">${p.score}</span>
  </li>`;
}

function renderResult(g) {
  const myId = app.session.playerId;
  const medals = ["🥇", "🥈", "🥉"];
  el.ranking.innerHTML = g.ranking
    .map((r) => {
      const cls = ["rank-row", `rank-${r.rank}`];
      if (r.id === myId) cls.push("me");
      const medal = medals[r.rank - 1] ?? `<span style="opacity:.6">${r.rank}</span>`;
      return `<li class="${cls.join(" ")}">
        <span class="rank-medal">${medal}</span>
        <span>
          <span class="rank-name">${escapeHtml(r.name)}</span>
          ${r.id === myId ? ' <span class="rank-you">あなた</span>' : ""}
        </span>
        <span class="rank-score">${r.score}<span style="font-size:.7rem;opacity:.6"> 点</span></span>
      </li>`;
    })
    .join("");

  const isHost = g.hostId === myId;
  el.againBtn.classList.toggle("hidden", !isHost);
}

/* ---------------------------------------------------------------- timers */

function updateTimers() {
  const g = app.game;
  if (!g || document.body.dataset.screen !== "game") return;

  let deadline = null;
  let total = 1;
  if (g.phase === "buzzing") {
    deadline = g.questionDeadline;
    total = 20000;
    el.timerLabel.textContent = "回答受付の残り";
  } else if (g.phase === "answering") {
    deadline = g.answerDeadline;
    total = 10000;
    el.timerLabel.textContent = "回答の残り";
  } else if (g.phase === "reveal") {
    deadline = g.phaseDeadline;
    total = 4000;
    el.timerLabel.textContent = "つぎの問題まで";
  }

  if (deadline == null) {
    el.timerText.textContent = "–";
    el.timerFill.style.width = "0%";
    el.timerFill.className = "timer-fill";
    return;
  }
  const remain = Math.max(0, deadline - serverNow());
  el.timerText.textContent = (remain / 1000).toFixed(1);
  const ratio = Math.max(0, Math.min(1, remain / total));
  el.timerFill.style.width = `${ratio * 100}%`;
  el.timerFill.className = "timer-fill" + (ratio < 0.2 ? " danger" : ratio < 0.5 ? " warn" : "");
}

setInterval(updateTimers, 100);

/* --------------------------------------------------------------- actions */

async function createRoom() {
  const name = el.nameInput.value.trim();
  if (!name) {
    el.homeError.textContent = "なまえを入力してください";
    el.nameInput.focus();
    return;
  }
  el.homeError.textContent = "";
  el.createBtn.disabled = true;
  try {
    const data = await api("/api/rooms", { method: "POST", body: JSON.stringify({ name }) });
    localStorage.setItem(NAME_KEY, name);
    saveSession({ roomCode: data.roomCode, playerId: data.playerId, token: data.token, name });
    app.leaving = false;
    history.replaceState(null, "", `?room=${data.roomCode}`);
    connect();
  } catch (err) {
    el.homeError.textContent = err.message;
  } finally {
    el.createBtn.disabled = false;
  }
}

async function joinRoom() {
  const name = el.nameInput.value.trim();
  const code = el.codeInput.value.trim().toUpperCase();
  if (!name) {
    el.homeError.textContent = "なまえを入力してください";
    el.nameInput.focus();
    return;
  }
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    el.homeError.textContent = "部屋コードは4文字です";
    el.codeInput.focus();
    return;
  }
  el.homeError.textContent = "";
  el.joinBtn.disabled = true;
  try {
    const data = await api(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    localStorage.setItem(NAME_KEY, name);
    saveSession({ roomCode: data.roomCode, playerId: data.playerId, token: data.token, name });
    app.leaving = false;
    history.replaceState(null, "", `?room=${data.roomCode}`);
    connect();
  } catch (err) {
    el.homeError.textContent = err.message;
  } finally {
    el.joinBtn.disabled = false;
  }
}

function answer(choice) {
  if (!send({ type: "answer", choice })) {
    toast("接続が切れています。少し待ってからもう一度お試しください");
  }
}

function buzz() {
  if (el.buzzBtn.disabled) return;
  // 押した手応えをすぐ返す（回答権の判定はサーバー）
  el.buzzBtn.classList.add("pressed");
  setTimeout(() => el.buzzBtn.classList.remove("pressed"), 130);
  el.buzzBtn.disabled = true;
  if (!send({ type: "buzz" })) {
    toast("接続が切れています。少し待ってからもう一度お試しください");
    setTimeout(render, 300);
  }
}

function leave() {
  if (app.session) send({ type: "leave" });
  goHome();
}

/* ----------------------------------------------------------------- events */

el.createBtn.addEventListener("click", createRoom);
el.joinBtn.addEventListener("click", joinRoom);
el.buzzBtn.addEventListener("click", buzz);
el.startBtn.addEventListener("click", () => send({ type: "start" }));
el.leaveBtn.addEventListener("click", leave);
el.resultLeaveBtn.addEventListener("click", leave);
el.againBtn.addEventListener("click", () => send({ type: "reset" }));
el.copyBtn.addEventListener("click", async () => {
  const code = app.game?.code ?? app.session?.roomCode ?? "";
  try {
    await navigator.clipboard.writeText(code);
    toast("部屋コードをコピーしました", 1500);
  } catch {
    toast(`部屋コード: ${code}`, 3000);
  }
});
el.nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createRoom();
});
el.codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinRoom();
});
el.codeInput.addEventListener("input", () => {
  el.codeInput.value = el.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});
window.addEventListener("beforeunload", () => {
  // ページ離脱時はソケットが切れるだけ（点数はサーバー側に残る）
});

/* ------------------------------------------------------------------ init */

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function init() {
  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) el.nameInput.value = savedName;

  const session = restoreSession();
  if (session) {
    saveSession(session);
    app.leaving = false;
    setBanner(true, "接続しています…");
    connect();
  } else {
    show("home");
  }
}

// E2E テスト用の読み取り専用フック（点数の改ざんには使えない）
window.__quiz = {
  getSession: () => (app.session ? { ...app.session } : null),
  getState: () => app.game,
};

init();
