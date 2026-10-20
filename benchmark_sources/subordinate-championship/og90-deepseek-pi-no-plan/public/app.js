/* =======================================================================
   早押しクイズ クライアント
   - 画面の描画だけを担当する。正誤判定・点数・早押し順はサーバー（Durable Object）が決める。
   - サーバーから届くスナップショット（state メッセージ）をそのまま描画する。
   - playerId / token を localStorage に保存し、再読み込み時は同じプレイヤーとして復帰する。
   ======================================================================= */

const SESSION_KEY = "buzzQuiz.session.v1";
const DEFAULT_LIMITS = {
  minPlayers: 2,
  maxPlayers: 4,
  questionWindowMs: 20000,
  answerWindowMs: 10000,
  revealMs: 3500,
  totalQuestions: 10,
};
const CHOICE_BADGES = ["A", "B", "C", "D"];

const $ = (id) => document.getElementById(id);

const S = {
  session: null,
  snap: null,
  ws: null,
  connected: false,
  offset: 0,
  retry: 0,
  retryTimer: null,
  buzzPending: false,
  answerPending: false,
  screen: null,
  lastMessageAt: 0,
  lastSyncAt: 0,
};

/* ------------------------------------------------------------------ 起動 */

function boot() {
  bindEvents();
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    showScreen("entry");
    return;
  }
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    showScreen("entry");
    return;
  }
  if (!saved || !saved.roomCode || !saved.playerId || !saved.token) {
    localStorage.removeItem(SESSION_KEY);
    showScreen("entry");
    return;
  }
  S.session = saved;
  $("input-name").value = saved.name ?? "";
  showScreen("entry");
  entryInfo("前回の部屋に接続しています…");
  resumeSession();
}

/* --------------------------------------------------------------- イベント */

function bindEvents() {
  $("btn-create").addEventListener("click", () => void createRoom());
  $("btn-join").addEventListener("click", () => void joinRoom());
  $("btn-copy").addEventListener("click", () => void copyCode());
  $("room-badge").addEventListener("click", () => void copyCode());
  $("btn-start").addEventListener("click", () => send({ t: "start" }));
  $("btn-again").addEventListener("click", () => send({ t: "reset" }));
  $("btn-leave").addEventListener("click", () => leaveRoom());
  $("btn-leave-result").addEventListener("click", () => leaveRoom());
  $("btn-buzz").addEventListener("click", () => buzz());
  $("input-code").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  $("input-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") void createRoom();
  });
  $("input-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") void joinRoom();
  });
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.code === "Space") {
      e.preventDefault();
      buzz();
      return;
    }
    if (/^Digit[1-4]$/.test(e.code)) {
      const index = Number(e.code.slice(-1)) - 1;
      if (canChoose()) choose(index);
    }
  });
  window.addEventListener("online", () => connect());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && S.session && !S.connected) connect();
  });
}

/* ------------------------------------------------------------- API 呼び出し */

async function createRoom() {
  const name = $("input-name").value.trim();
  if (!name) return entryError("名前を入力してください");
  setBusy(true);
  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "部屋を作れませんでした");
    saveSession({ roomCode: data.code, playerId: data.playerId, token: data.token, name: data.name });
    entryInfo("");
    connect();
  } catch (err) {
    entryError(err.message || "通信に失敗しました");
  } finally {
    setBusy(false);
  }
}

async function joinRoom() {
  const name = $("input-name").value.trim();
  const code = $("input-code").value.trim().toUpperCase();
  if (!name) return entryError("名前を入力してください");
  if (code.length !== 4) return entryError("部屋コードは4文字です");
  setBusy(true);
  try {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "参加できませんでした");
    saveSession({ roomCode: data.code, playerId: data.playerId, token: data.token, name: data.name });
    entryInfo("");
    connect();
  } catch (err) {
    entryError(err.message || "通信に失敗しました");
  } finally {
    setBusy(false);
  }
}

/** 再読み込み・一時切断からの復帰。保存済みの playerId + token で入り直す。 */
async function resumeSession() {
  const s = S.session;
  if (!s) return;
  try {
    const res = await fetch(`/api/rooms/${s.roomCode}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: s.name, playerId: s.playerId, token: s.token }),
    });
    if (res.status === 404 || res.status === 409) {
      const data = await res.json().catch(() => ({}));
      clearSession();
      entryError(data.message || "前回の部屋には戻れませんでした");
      return;
    }
    if (!res.ok) throw new Error("resume failed");
    const data = await res.json();
    saveSession({ roomCode: data.code, playerId: data.playerId, token: data.token, name: data.name });
    connect();
  } catch {
    entryError("接続に失敗しました。もう一度お試しください");
  }
}

function saveSession(session) {
  S.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  S.session = null;
  localStorage.removeItem(SESSION_KEY);
}

function leaveRoom() {
  send({ t: "leave" });
  clearSession();
  if (S.ws) {
    try {
      S.ws.close(1000, "leave");
    } catch {
      /* ignore */
    }
    S.ws = null;
  }
  S.snap = null;
  S.connected = false;
  updateNetStatus();
  showScreen("entry");
  entryInfo("部屋を出ました");
}

/* ------------------------------------------------------------- WebSocket */

function connect() {
  const s = S.session;
  if (!s) return;
  if (S.ws && (S.ws.readyState === WebSocket.OPEN || S.ws.readyState === WebSocket.CONNECTING)) return;
  if (S.retryTimer) {
    clearTimeout(S.retryTimer);
    S.retryTimer = null;
  }
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/api/rooms/${encodeURIComponent(s.roomCode)}/ws?playerId=${encodeURIComponent(
    s.playerId,
  )}&token=${encodeURIComponent(s.token)}`;
  let ws;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  S.ws = ws;

  ws.addEventListener("open", () => {
    S.connected = true;
    S.retry = 0;
    S.lastMessageAt = Date.now();
    setConnBanner(false);
    updateNetStatus();
    // 復帰直後に現在の状態を取り直す（切断中に進んだ分もここで追いつく）
    requestSync(true);
  });

  ws.addEventListener("message", (event) => {
    S.lastMessageAt = Date.now();
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    try {
      if (msg.t === "state") {
        S.offset = msg.now - Date.now();
        S.snap = msg;
        S.buzzPending = false;
        S.answerPending = false;
        render();
      } else if (msg.t === "notice") {
        toast(msg.message, msg.kind === "error" ? "error" : "info");
        if (/もう押せません|回答権を持っているのはあなたでは/.test(msg.message || "")) {
          denyBuzzAnimation();
        }
      }
    } catch (err) {
      // 描画で想定外の例外が出ても接続と再接続は続ける
      console.error("render failed", err);
    }
  });

  ws.addEventListener("close", () => {
    if (S.ws !== ws) return;
    S.connected = false;
    updateNetStatus();
    if (S.session) {
      setConnBanner(true, "接続が切れました。再接続しています…");
      scheduleReconnect();
    }
  });

  ws.addEventListener("error", () => {
    /* close 側で処理する */
  });
}

function scheduleReconnect() {
  if (S.retryTimer || !S.session) return;
  const delay = Math.min(4000, 400 * Math.pow(1.6, S.retry));
  S.retry += 1;
  S.retryTimer = setTimeout(() => {
    S.retryTimer = null;
    connect();
  }, delay);
}

function send(obj) {
  if (S.ws && S.ws.readyState === WebSocket.OPEN) {
    S.ws.send(JSON.stringify(obj));
    return true;
  }
  toast("サーバーに接続されていません", "error");
  return false;
}

/* -------------------------------------------------------------- 状態同期 */

/**
 * サーバーは状態が変わるたびに全員へスナップショットを送るが、
 * 万一 1 通取りこぼしても（相手機の一時停止・回線瞬断など）
 * 「締切を過ぎたのに通知が来ない」ことを検知して自分から取り直す。
 */
function requestSync(force = false) {
  if (!S.ws || S.ws.readyState !== WebSocket.OPEN) return;
  const now = Date.now();
  if (!force && now - S.lastSyncAt < 1000) return;
  S.lastSyncAt = now;
  S.ws.send(JSON.stringify({ t: "sync" }));
}

function watchdog() {
  const snap = S.snap;
  if (!S.connected || !snap || snap.phase === "lobby" || snap.phase === "finished") return;
  const deadline = currentDeadline(snap);
  if (deadline !== null && serverNow() > deadline + 700) {
    // フェーズが進んでいるはずなのにスナップショットが届いていない
    requestSync();
    return;
  }
  if (Date.now() - S.lastMessageAt > 4000) requestSync();
}

/* ---------------------------------------------------------------- 操作系 */

function buzz() {
  const snap = S.snap;
  if (!snap || snap.phase !== "question") return;
  const me = myPlayer(snap);
  if (!me || me.lockedOut || me.solved) {
    denyBuzzAnimation();
    return;
  }
  if (S.buzzPending) return;
  S.buzzPending = true;
  if (!send({ t: "buzz" })) {
    S.buzzPending = false;
    return;
  }
  renderBuzzButton(snap);
}

function choose(index) {
  if (!canChoose() || S.answerPending) return;
  S.answerPending = true;
  if (!send({ t: "answer", choice: index })) S.answerPending = false;
  renderGame(S.snap);
}

function canChoose() {
  const snap = S.snap;
  return Boolean(
    snap && snap.phase === "answering" && snap.answeringPlayerId && snap.answeringPlayerId === meId(snap),
  );
}

function myPlayer(snap) {
  if (!S.session) return null;
  return snap.players.find((p) => p.id === S.session.playerId) || null;
}

function meId(snap) {
  return S.session ? S.session.playerId : null;
}

/* ---------------------------------------------------------------- 描画 */

function render() {
  const snap = S.snap;
  if (!snap) {
    showScreen("entry");
    return;
  }
  $("room-badge-code").textContent = snap.code;
  $("room-badge").classList.remove("hidden");

  if (snap.phase === "lobby") {
    showScreen("lobby");
    renderLobby(snap);
  } else if (snap.phase === "finished") {
    showScreen("result");
    renderResult(snap);
  } else {
    showScreen("game");
    renderGame(snap);
  }
  updateTimer();
}

function showScreen(name) {
  if (S.screen !== name) {
    S.screen = name;
    document.body.dataset.screen = name;
  }
  for (const id of ["entry", "lobby", "game", "result"]) {
    $(`screen-${id}`).classList.toggle("hidden", id !== name);
  }
}

function renderLobby(snap) {
  const me = myPlayer(snap);
  const isHost = Boolean(me && snap.hostId === me.id);
  $("lobby-code").textContent = snap.code;
  $("lobby-count").textContent = String(snap.players.length);
  $("lobby-note").textContent = isHost
    ? snap.players.length < DEFAULT_LIMITS.minPlayers
      ? "あと1人以上集まると開始できます。仲間に部屋コードを伝えましょう。"
      : "メンバーがそろったら開始してください。"
    : "ホストが「ゲームを開始する」を押すまで待ちましょう。";

  const seatGrid = $("lobby-seats");
  seatGrid.innerHTML = "";
  for (let i = 0; i < DEFAULT_LIMITS.maxPlayers; i++) {
    const player = snap.players[i];
    const seat = document.createElement("div");
    seat.className = "seat " + (player ? "filled" : "empty");
    seat.dataset.seat = String(i + 1);
    if (player) {
      if (me && player.id === me.id) seat.classList.add("me");
      seat.dataset.playerId = player.id;
      const tags = [];
      if (snap.hostId === player.id) tags.push('<span class="tag host">ホスト</span>');
      if (me && player.id === me.id) tags.push('<span class="tag you">あなた</span>');
      if (!player.connected) tags.push('<span class="tag offline">切断中</span>');
      seat.innerHTML = `
        <div class="seat-avatar">${player.connected ? "🙂" : "💤"}</div>
        <div class="seat-name">${escapeHtml(player.name)}</div>
        <div class="seat-tags">${tags.join("")}</div>`;
      if (isHost && player.id !== me.id && !player.connected) {
        const kick = document.createElement("button");
        kick.className = "seat-kick";
        kick.type = "button";
        kick.textContent = "外す";
        kick.addEventListener("click", () => send({ t: "kick", playerId: player.id }));
        seat.appendChild(kick);
      }
    } else {
      seat.innerHTML = `<div class="seat-avatar">＋</div><div class="seat-name">あき</div>
        <div class="seat-tags"><span class="tag">待機中</span></div>`;
    }
    seatGrid.appendChild(seat);
  }

  const startBtn = $("btn-start");
  const enough = snap.players.length >= DEFAULT_LIMITS.minPlayers;
  startBtn.classList.toggle("hidden", !isHost);
  startBtn.disabled = !enough;
  startBtn.textContent = enough
    ? "ゲームを開始する"
    : `あと${DEFAULT_LIMITS.minPlayers - snap.players.length}人で開始できます`;
}

function renderGame(snap) {
  const me = myPlayer(snap);
  const q = snap.question;
  const total = snap.limits?.totalQuestions ?? DEFAULT_LIMITS.totalQuestions;
  $("q-progress").textContent = q ? `第${q.index + 1}問 / ${total}` : "";

  const phaseLabel = { question: "出題中", answering: "回答中", reveal: "正解発表" }[snap.phase] || "";
  const chip = $("phase-label");
  chip.textContent = phaseLabel;
  chip.className = "phase-chip" + (snap.phase === "answering" ? " answering" : snap.phase === "reveal" ? " reveal" : "");

  document.body.dataset.phase = snap.phase;
  document.body.dataset.answerer = snap.answeringPlayerId || "";
  document.body.dataset.me = me ? me.id : "";

  renderScoreboard(snap, me);
  $("q-text").textContent = q ? q.text : "";
  renderChoices(snap, me);
  renderBuzzButton(snap);
  renderStatusLine(snap, me);
  renderReveal(snap, me);
}

function renderScoreboard(snap, me) {
  const board = $("scoreboard");
  board.innerHTML = "";
  const rankMap = new Map(rankPlayers(snap).map((p, i) => [p.id, i + 1]));
  for (const p of snap.players) {
    const card = document.createElement("div");
    card.className = "score-card";
    card.dataset.playerId = p.id;
    if (me && p.id === me.id) card.classList.add("me");
    if (snap.answeringPlayerId === p.id) card.classList.add("answering");
    if (!p.connected) card.classList.add("offline");
    if (p.lockedOut && snap.phase !== "reveal") card.classList.add("locked");

    let statusText = "";
    let statusClass = "";
    if (!p.connected) {
      statusText = "切断中…";
    } else if (snap.answeringPlayerId === p.id) {
      statusText = "✋ 回答中";
      statusClass = "answering";
    } else if (p.solved) {
      statusText = "⭕ 正解";
      statusClass = "correct";
    } else if (p.lockedOut) {
      statusText = "❌ 不正解（この問題はもう押せません）";
      statusClass = "wrong";
    } else if (snap.phase === "question") {
      statusText = "早押し待ち";
    } else if (snap.phase === "answering") {
      statusText = "待機中（他の人が回答中）";
    } else {
      statusText = "—";
    }
    card.innerHTML = `
      <div class="score-top">
        <span class="score-name">${escapeHtml(p.name)}</span>
        ${me && p.id === me.id ? '<span class="tag you">あなた</span>' : ""}
        <span class="tag">${rankMap.get(p.id)}位</span>
      </div>
      <span class="score-value ${p.score === 0 ? "zero" : ""}">${p.score}<span class="hint"> 点</span></span>
      <span class="score-status ${statusClass}">${statusText}</span>`;
    board.appendChild(card);
  }
}

function renderChoices(snap, me) {
  const box = $("choices");
  const q = snap.question;
  if (!q) {
    box.innerHTML = "";
    return;
  }
  const choosable = canChoose();
  box.innerHTML = "";
  q.choices.forEach((text, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.index = String(index);
    btn.dataset.choiceLabel = CHOICE_BADGES[index];
    let state = "";
    if (snap.phase === "reveal") {
      if (index === snap.revealedIndex) state = "correct";
      else if (snap.lastAnswer && snap.lastAnswer.choice === index && !snap.lastAnswer.correct) state = "wrong";
      else state = "dim";
    } else if (snap.phase === "answering") {
      if (choosable) state = "enabled";
      else state = "dim";
    } else {
      state = "dim";
    }
    btn.classList.add(state);
    if (state === "enabled") btn.addEventListener("click", () => choose(index));
    btn.innerHTML = `<span class="badge">${CHOICE_BADGES[index]}</span><span class="choice-text">${escapeHtml(text)}</span>`;
    box.appendChild(btn);
  });
}

function renderBuzzButton(snap) {
  const me = myPlayer(snap);
  const btn = $("btn-buzz");
  const canBuzzNow = Boolean(
    snap.phase === "question" && me && me.connected !== false && !me.lockedOut && !me.solved && !S.buzzPending,
  );
  const mine = Boolean(snap.answeringPlayerId && me && snap.answeringPlayerId === me.id);
  btn.classList.toggle("active", canBuzzNow);
  btn.classList.toggle("mine", mine);
  btn.classList.toggle("denied", false);
  btn.disabled = !canBuzzNow;
  btn.dataset.state = canBuzzNow ? "ready" : mine ? "mine" : "waiting";
  const label = btn.querySelector(".buzz-label");
  const sub = btn.querySelector(".buzz-sub");
  if (mine) {
    label.textContent = "回答中";
    sub.textContent = "4択をえらぼう";
  } else if (canBuzzNow) {
    label.textContent = "押す";
    sub.textContent = "SPACE / タップ";
  } else if (snap.phase === "answering") {
    label.textContent = "待機";
    sub.textContent = "他の人が回答中";
  } else if (snap.phase === "reveal") {
    label.textContent = "次の問題へ";
    sub.textContent = "まもなく再開";
  } else {
    label.textContent = "押せない";
    sub.textContent = "この問題は終了";
  }
}

function denyBuzzAnimation() {
  const btn = $("btn-buzz");
  btn.classList.add("denied");
  setTimeout(() => btn.classList.remove("denied"), 420);
}

function renderStatusLine(snap, me) {
  const line = $("status-line");
  if (snap.phase === "question") {
    if (me && me.solved) line.textContent = "あなたはこの問題に正解済み！";
    else if (me && me.lockedOut) line.textContent = "この問題ではもう押せません（不正解）";
    else if (me && !me.connected) line.textContent = "接続を復帰しています…";
    else line.textContent = "早押し受付中！いちばん早く押した1人だけが回答できます";
  } else if (snap.phase === "answering") {
    const answerer = snap.players.find((p) => p.id === snap.answeringPlayerId);
    if (me && snap.answeringPlayerId === me.id) line.textContent = "✋ あなたが回答中！10秒以内に選んでください";
    else line.textContent = `✋ ${answerer ? answerer.name : "だれか"} さんが回答中…（10秒）`;
  } else if (snap.phase === "reveal") {
    line.textContent = "正解を発表します";
  }
}

function renderReveal(snap, me) {
  const panel = $("reveal-panel");
  if (snap.phase !== "reveal") {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  const q = snap.question;
  const correctText = q ? q.choices[snap.revealedIndex] : "";
  const last = snap.lastAnswer;
  const answerer = last ? snap.players.find((p) => p.id === last.playerId) : null;
  $("reveal-answer").textContent = correctText ? `正解：${correctText}` : "正解を表示できません";
  if (last && answerer) {
    const you = me && me.id === last.playerId ? "（あなた）" : "";
    $("reveal-headline").textContent = last.correct ? "⭕ 正解！+10点" : "❌ 不正解… -5点";
    $("reveal-sub").textContent = last.correct
      ? `${answerer.name}${you} が正解しました`
      : `${answerer.name}${you} は不正解。残りの人で再開します`;
  } else {
    $("reveal-headline").textContent = "⌛ 時間切れ";
    $("reveal-sub").textContent = "だれも正解できませんでした";
  }
  const nextIn = Math.max(0, (snap.nextEventAt || 0) - serverNow()) / 1000;
  if (snap.phase === "reveal" && snap.nextEventAt) {
    $("reveal-sub").textContent += ` ／ 次の問題まで ${nextIn.toFixed(1)}秒`;
  }
}

function renderResult(snap) {
  const me = myPlayer(snap);
  const list = $("ranking");
  list.innerHTML = "";
  const rows = snap.ranking || [];
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  rows.forEach((row, index) => {
    const li = document.createElement("li");
    li.className = `rank-row rank-${row.rank}` + (me && row.playerId === me.id ? " me" : "");
    li.dataset.rank = String(row.rank);
    li.dataset.playerId = row.playerId;
    li.style.animationDelay = `${index * 70}ms`;
    li.innerHTML = `
      <span class="rank-medal">${medals[row.rank] || "🎖"}</span>
      <span class="rank-no">${row.rank}位</span>
      <span class="rank-name">${escapeHtml(row.name)}${me && row.playerId === me.id ? "（あなた）" : ""}</span>
      <span class="rank-score ${row.score === 0 ? "zero" : ""}">${row.score}点</span>`;
    list.appendChild(li);
  });
  const isHost = Boolean(me && snap.hostId === me.id);
  const again = $("btn-again");
  again.classList.toggle("hidden", !isHost);
  $("result-note").textContent = isHost
    ? "「もう一度あそぶ」を押すと、同じメンバーで点数をリセットしてロビーに戻ります。"
    : "ホストがもう一度はじめると、このメンバーで再戦できます。";
}

/* ---------------------------------------------------------------- タイマー */

function serverNow() {
  return Date.now() + S.offset;
}

function currentDeadline(snap) {
  if (snap.phase === "question") return snap.buzzDeadline;
  if (snap.phase === "answering") return snap.answerDeadline;
  if (snap.phase === "reveal") return snap.nextEventAt;
  return null;
}

function currentWindow(snap) {
  const limits = snap.limits || DEFAULT_LIMITS;
  if (snap.phase === "question") return limits.questionWindowMs;
  if (snap.phase === "answering") return limits.answerWindowMs;
  if (snap.phase === "reveal") return limits.revealMs;
  return 1000;
}

function updateTimer() {
  const snap = S.snap;
  if (!snap || snap.phase === "lobby" || snap.phase === "finished") return;
  const deadline = currentDeadline(snap);
  if (!deadline) return;
  const remaining = Math.max(0, deadline - serverNow());
  const windowMs = currentWindow(snap);
  $("timer-text").textContent = (remaining / 1000).toFixed(1);
  const fill = $("timer-fill");
  fill.style.width = `${Math.min(100, (remaining / windowMs) * 100)}%`;
  fill.className = "timer-fill" + (snap.phase === "answering" ? " answering" : remaining < 5000 ? " danger" : "");
}

setInterval(() => {
  updateTimer();
  if (S.snap && S.snap.phase === "reveal") renderReveal(S.snap, myPlayer(S.snap));
  watchdog();
}, 100);

/* ---------------------------------------------------------------- 小物 */

function updateNetStatus() {
  const el = $("net-status");
  el.classList.toggle("online", S.connected);
  el.classList.toggle("offline", !S.connected && Boolean(S.session));
  el.querySelector(".net-text").textContent = S.connected ? "接続中" : S.session ? "切断" : "未接続";
}

function setConnBanner(show, text) {
  $("conn-banner").classList.toggle("hidden", !show);
  if (text) $("conn-banner-text").textContent = text;
}

function entryError(message) {
  const el = $("entry-error");
  el.textContent = message || "";
  el.classList.toggle("hidden", !message);
  if (message) entryInfo("");
}

function entryInfo(message) {
  const el = $("entry-info");
  el.textContent = message || "";
  el.classList.toggle("hidden", !message);
}

function setBusy(busy) {
  $("btn-create").disabled = busy;
  $("btn-join").disabled = busy;
}

async function copyCode() {
  const code = S.snap ? S.snap.code : S.session ? S.session.roomCode : "";
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast(`部屋コード ${code} をコピーしました`, "good");
  } catch {
    toast(`部屋コードは ${code} です`, "info");
  }
}

let toastSeq = 0;
function toast(message, kind) {
  const layer = $("toast-layer");
  const el = document.createElement("div");
  el.className = `toast ${kind === "error" ? "error" : kind === "good" ? "good" : ""}`;
  el.textContent = message;
  layer.appendChild(el);
  const id = ++toastSeq;
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => {
      if (layer.contains(el)) layer.removeChild(el);
    }, 320);
  }, 2600);
  if (layer.childElementCount > 4) layer.removeChild(layer.firstElementChild);
  return id;
}

function rankPlayers(snap) {
  return snap.players.slice().sort((a, b) => b.score - a.score);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

document.addEventListener("DOMContentLoaded", boot);
