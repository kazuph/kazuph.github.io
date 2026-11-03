const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");
const letters = ["A", "B", "C", "D"];
let session = null;
let state = null;
let playerId = null;
let socket = null;
let connected = false;
let pageError = "";
let lastAnnouncement = "";
let serverOffsetMs = 0;

app.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  pageError = "";
  const name = new FormData(form).get("name");
  if (typeof name !== "string") return;
  if (form.id === "create-form") await enterRoom("/api/rooms", { name });
  if (form.id === "join-form") {
    const code = new FormData(form).get("code");
    if (typeof code === "string") await enterRoom(`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/join`, { name });
  }
});

app.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
  if (!(button instanceof HTMLButtonElement)) return;
  switch (button.dataset.action) {
    case "start": send({ type: "start" }); break;
    case "buzz": send({ type: "buzz" }); break;
    case "answer": send({ type: "answer", choice: Number(button.dataset.choice) }); break;
    case "reconnect": connectSocket(); break;
  }
});

window.addEventListener("offline", () => {
  connected = false;
  const previous = socket;
  socket = null;
  previous?.close();
  render();
});

window.addEventListener("online", () => {
  if (session) connectSocket();
});

window.setInterval(updateTimer, 200);
boot();

async function boot() {
  const saved = parseSession(localStorage.getItem("quiz-session"));
  if (saved) {
    session = saved;
    try {
      const data = await api(`/api/rooms/${encodeURIComponent(session.code)}/reconnect`, { token: session.token });
      playerId = data.player.id;
      state = data.state;
      syncServerClock(state);
      connectSocket();
    } catch {
      localStorage.removeItem("quiz-session");
      session = null;
      pageError = "保存された部屋情報から再接続できませんでした。部屋コードから参加してください。";
    }
  }
  render();
}

async function enterRoom(path, body) {
  try {
    const data = await api(path, body);
    session = { code: data.code, token: data.token };
    localStorage.setItem("quiz-session", JSON.stringify(session));
    playerId = data.player.id;
    state = data.state;
    syncServerClock(state);
    pageError = "";
    render();
    connectSocket();
  } catch (error) {
    pageError = error instanceof Error ? error.message : "部屋に接続できませんでした。";
    render();
  }
}

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "リクエストに失敗しました。");
  return result;
}

function connectSocket() {
  if (!session || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  const connection = new WebSocket(`${location.origin.replace(/^http/, "ws")}/ws/${encodeURIComponent(session.code)}?token=${encodeURIComponent(session.token)}`);
  socket = connection;
  connection.addEventListener("open", () => {
    if (socket !== connection) return;
    connected = true;
    pageError = "";
    render();
  });
  connection.addEventListener("message", (event) => {
    if (socket !== connection) return;
    const message = JSON.parse(event.data);
    if (message.type === "state") {
      state = message.state;
      syncServerClock(state);
      if (typeof message.playerId === "string") playerId = message.playerId;
      connected = true;
      pageError = "";
      announceChanges(state);
      render();
    } else if (message.type === "error") {
      pageError = message.error;
      render();
    }
  });
  connection.addEventListener("close", () => {
    if (socket !== connection) return;
    connected = false;
    socket = null;
    render();
  });
  connection.addEventListener("error", () => {
    if (socket !== connection) return;
    connected = false;
    render();
  });
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  else {
    connected = false;
    pageError = "サーバーとの接続が切れました。再接続してから操作してください。";
    render();
  }
}

function render() {
  app.setAttribute("aria-busy", "false");
  if (!state || !session) {
    renderLanding();
    return;
  }
  const currentPlayer = state.players.find((player) => player.id === playerId);
  if (!currentPlayer) {
    localStorage.removeItem("quiz-session");
    session = null;
    state = null;
    renderLanding();
    return;
  }
  const connectionLabel = connected ? "接続中" : "接続が切れました";
  const connectionClass = connected ? "connection" : "connection is-offline";
  const reconnectButton = connected ? "" : '<button class="reconnect-button" data-action="reconnect">再接続</button>';
  const header = `<header class="masthead"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">早押しスタジオ</span></a><div><span class="${connectionClass}">${connectionLabel}</span>${reconnectButton}</div></header>`;
  if (state.phase === "lobby") {
    app.innerHTML = `${header}<div class="page stage"><div class="stage-top"><div><p class="eyebrow">PLAYER LOBBY</p><h1>対戦ロビー</h1></div><div class="room-meta"><span>部屋コード</span><strong class="room-code">${escapeHtml(state.code)}</strong></div></div><section class="lobby-panel"><p class="eyebrow">READY UP</p><h2>メンバーを待っています</h2><p>部屋コードを共有して、最大4人で参加してください。ホストが開始すると第1問が始まります。</p><div class="waiting-list">${waitingPlayers(state.players)}</div><div class="start-row">${state.hostId === playerId ? `<button class="button button-primary" data-action="start" ${state.players.length < 2 || !connected ? "disabled" : ""}>ゲームを開始</button><span class="start-help">${state.players.length < 2 ? "2人そろうと開始できます" : "開始できる人数です"}</span>` : '<span class="start-help">ホストが開始するまでお待ちください。</span>'}</div><p class="error" role="alert">${escapeHtml(pageError)}</p></section></div>${footer()}`;
    return;
  }
  if (state.phase === "finished") {
    app.innerHTML = `${header}<div class="page stage"><div class="stage-top"><div><p class="eyebrow">FINAL SCORE</p><h1>対戦結果</h1></div><div class="room-meta"><span>部屋コード</span><strong class="room-code">${escapeHtml(state.code)}</strong></div></div><section class="lobby-panel"><p class="result-heading">GAME COMPLETE · 10 QUESTIONS</p><h2>最終ランキング</h2><p>最後までナイスファイト！</p>${state.reveal ? `<p class="announcement">第${state.reveal.questionNumber}問の正解：${escapeHtml(state.reveal.answer)}</p>` : ""}<div class="result-list">${ranking(state.players)}</div><p class="error" role="alert">${escapeHtml(pageError)}</p></section></div>${footer()}`;
    return;
  }
  const questionNumber = state.questionIndex + 1;
  const isAnswering = state.phase === "answering";
  const ownsAnswer = isAnswering && state.answeringPlayerId === playerId;
  const lockedOut = state.lockedOutPlayerIds.includes(playerId);
  const timerDeadline = isAnswering ? state.answerDeadline : state.questionDeadline;
  const reveal = state.reveal && state.reveal.questionNumber < questionNumber ? `<p class="announcement">第${state.reveal.questionNumber}問の正解：<strong>${escapeHtml(state.reveal.answer)}</strong></p>` : "";
  const callout = ownsAnswer ? '<p class="turn-callout">あなたの番です。10秒以内に回答してください。</p>' : isAnswering ? `<p class="turn-callout">${escapeHtml(playerName(state, state.answeringPlayerId))} さんが回答中です。判定を待ちましょう。</p>` : lockedOut ? '<p class="turn-callout">この問題では回答済みです。次の問題を待ちましょう。</p>' : "";
  const controls = ownsAnswer
    ? `<div class="answer-grid">${state.question.choices.map((choice, index) => `<button class="answer-choice" data-action="answer" data-choice="${index}" ${!connected ? "disabled" : ""}><span class="choice-letter">${letters[index]}</span><span>${escapeHtml(choice)}</span></button>`).join("")}</div>`
    : `<button class="buzz-button" data-action="buzz" ${isAnswering || lockedOut || !connected ? "disabled" : ""}>${lockedOut ? "回答済み" : isAnswering ? "回答中…" : "早押し！"}</button>`;
  app.innerHTML = `${header}<div class="page stage"><div class="stage-top"><div><p class="eyebrow">LIVE MATCH</p><h1>早押しクイズ</h1></div><div class="room-meta"><span>部屋コード</span><strong class="room-code">${escapeHtml(state.code)}</strong></div></div><div class="game-grid"><section class="play-area"><div class="status-line"><span class="question-counter">QUESTION ${String(questionNumber).padStart(2, "0")} / 10</span><span class="timer" data-deadline="${timerDeadline ?? ""}">--:--</span></div>${reveal}<h2 class="question-title">${escapeHtml(state.question?.prompt ?? "次の問題を準備しています")}</h2>${callout}${controls}<p class="error" role="alert">${escapeHtml(pageError)}</p></section><aside class="scoreboard" aria-label="スコアボード"><div class="scoreboard-head"><h2>PLAYER SCORE</h2><span>${state.players.length} PLAYERS</span></div><div class="scoreboard-list">${scoreboard(state)}</div><div class="host-note">正解は +10 点。誤答は −5 点。回答権はサーバーが受け取った順で決まります。</div></aside></div></div>${footer()}`;
  updateTimer();
}

function renderLanding() {
  app.innerHTML = `<div class="shell"><header class="masthead"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">早押しスタジオ</span></a><span class="local-badge">LOCAL MATCH · 4 MAX</span></header><div class="page landing"><section><p class="eyebrow">FOUR PLAYERS · TEN QUESTIONS</p><h1>ひらめいたら、<br /><span>最初の一秒</span>をつかめ。</h1><p class="intro">同じ部屋に集まって、知識と反射神経で勝負。4人まで参加できる、みんなで遊ぶ早押しクイズです。</p><p class="round-note"><strong>10</strong><span>日本語のオリジナル問題<br />正解 +10点 · 誤答 −5点</span></p></section><section class="entry-panel"><div class="panel-heading"><h2>対戦をはじめる</h2><p>名前を決めて、部屋を作るか参加しよう。</p></div><div class="entry-forms"><form class="entry-form" id="create-form"><p class="form-title">新しい部屋を作る</p><label class="field"><span>プレイヤー名</span><input name="name" autocomplete="nickname" placeholder="例：クイズ王" required /></label><button class="button button-primary" type="submit">部屋を作る</button></form><form class="entry-form" id="join-form"><p class="form-title">部屋に参加する</p><label class="field"><span>プレイヤー名</span><input name="name" autocomplete="nickname" placeholder="例：ひらめきさん" required /></label><label class="field"><span>部屋コード</span><input name="code" maxlength="36" autocapitalize="characters" autocomplete="off" placeholder="UUID形式の部屋コード" required /></label><button class="button button-secondary" type="submit">部屋に参加する</button></form><p class="error" role="alert">${escapeHtml(pageError)}</p></div></section></div>${footer()}</div>`;
}

function waitingPlayers(players) {
  const rows = Array.from({ length: 4 }, (_, index) => players[index]
    ? `<div class="waiting-player"><span class="player-dot" aria-hidden="true"></span><span>${escapeHtml(players[index].name)}${players[index].id === state.hostId ? " <small>HOST</small>" : ""}</span></div>`
    : '<div class="waiting-player"><span class="player-dot" aria-hidden="true" style="background:#c7c5bc"></span><span class="empty-slot">参加待ち</span></div>');
  return rows.join("");
}

function scoreboard(currentState) {
  const locked = new Set(currentState.lockedOutPlayerIds);
  return currentState.players.map((player, index) => `<div class="player-row"><span class="player-rank">${String(index + 1).padStart(2, "0")}</span><span class="player-name">${escapeHtml(player.name)}${player.id === currentState.answeringPlayerId ? '<small>ANSWERING</small>' : locked.has(player.id) ? '<small>ANSWERED</small>' : ""}</span><strong class="player-score">${player.score}</strong></div>`).join("");
}

function ranking(players) {
  const ordered = [...players].sort((left, right) => right.score - left.score);
  let previousScore = null;
  let rank = 0;
  return ordered.map((player, index) => {
    if (player.score !== previousScore) rank = index + 1;
    previousScore = player.score;
    return `<div class="result-row"><strong class="result-rank">${String(rank).padStart(2, "0")}</strong><span class="result-name">${escapeHtml(player.name)}</span><strong class="result-score">${player.score}<small> 点</small></strong></div>`;
  }).join("");
}

function playerName(currentState, id) {
  return currentState.players.find((player) => player.id === id)?.name ?? "プレイヤー";
}

function announceChanges(currentState) {
  if (!currentState) return;
  const text = currentState.phase === "answering"
    ? `${playerName(currentState, currentState.answeringPlayerId)}さんが回答権を獲得しました。`
    : currentState.reveal
      ? `第${currentState.reveal.questionNumber}問の正解は${currentState.reveal.answer}です。`
      : currentState.phase === "finished"
        ? "10問が終了しました。最終ランキングを表示します。"
        : `第${currentState.questionIndex + 1}問です。`;
  if (text !== lastAnnouncement) announcer.textContent = text;
  lastAnnouncement = text;
}

function updateTimer() {
  const timer = document.querySelector(".timer[data-deadline]");
  if (!(timer instanceof HTMLElement)) return;
  const deadline = Number(timer.dataset.deadline);
  if (!Number.isFinite(deadline) || deadline <= 0) return;
  const remaining = Math.max(0, Math.ceil((deadline - Date.now() - serverOffsetMs) / 1000));
  timer.textContent = `00:${String(remaining).padStart(2, "0")}`;
  timer.toggleAttribute("data-expired", remaining === 0);
}

function syncServerClock(snapshot) {
  if (typeof snapshot?.serverNow === "number") serverOffsetMs = snapshot.serverNow - Date.now();
}

function footer() {
  return '<footer class="footer">早押しスタジオ · Cloudflare Workers ローカル開発</footer>';
}

function parseSession(serialized) {
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized);
    return typeof value.code === "string" && typeof value.token === "string" ? value : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
