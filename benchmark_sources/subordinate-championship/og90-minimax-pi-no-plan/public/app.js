/**
 * 早押しクイズ クライアント。
 *
 * サーバー（Durable Object）が配信する state スナップショットだけを信じて描画する。
 * 正誤判定や点数はすべてサーバー側で行う（このファイルでは一切計算しない）。
 */

const $ = (id) => document.getElementById(id);

const els = {
  screenHome: $("screen-home"),
  screenRoom: $("screen-room"),
  nameInput: $("name-input"),
  codeInput: $("code-input"),
  createBtn: $("create-btn"),
  joinBtn: $("join-btn"),
  homeError: $("home-error"),
  codeChip: $("code-chip"),
  connStatus: $("conn-status"),
  leaveBtn: $("leave-btn"),
  viewLobby: $("view-lobby"),
  viewGame: $("view-game"),
  viewResult: $("view-result"),
  lobbyCode: $("lobby-code"),
  playerList: $("player-list"),
  startBtn: $("start-btn"),
  startHint: $("start-hint"),
  copyCodeBtn: $("copy-code-btn"),
  copyLinkBtn: $("copy-link-btn"),
  qIndex: $("q-index"),
  phaseLabel: $("phase-label"),
  progressFill: $("progress-fill"),
  timer: $("timer"),
  timerValue: $("timer-value"),
  scoreboard: $("scoreboard"),
  questionText: $("question-text"),
  buzzerWrap: $("buzzer-wrap"),
  buzzerBtn: $("buzzer-btn"),
  buzzerNote: $("buzzer-note"),
  waiting: $("waiting"),
  waitingText: $("waiting-text"),
  options: $("options"),
  reveal: $("reveal"),
  ranking: $("ranking"),
  restartBtn: $("restart-btn"),
  restartHint: $("restart-hint"),
  toast: $("toast"),
};

const SESSION_KEY = "buzzer-quiz.session";
const OPTION_KEYS = ["A", "B", "C", "D"];

let session = loadSession();
let snap = null;
let ws = null;
let clockOffset = 0; // serverTime - Date.now()
let reconnectAttempts = 0;
let reconnectTimer = null;
let toastTimer = null;
let rafId = null;

/* ------------------------------------------------------------------ utils */

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.code || !parsed.playerId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(s) {
  session = s;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("is-error", isError);
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function showHomeError(message) {
  els.homeError.textContent = message;
  els.homeError.hidden = false;
}

function clearHomeError() {
  els.homeError.hidden = true;
}

function setBusy(button, busy) {
  button.disabled = busy;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = "通信中…";
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
}

async function api(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/* ------------------------------------------------------------------- home */

function showHome() {
  els.screenHome.classList.remove("is-hidden");
  els.screenRoom.classList.add("is-hidden");
}

function showRoom() {
  els.screenHome.classList.add("is-hidden");
  els.screenRoom.classList.remove("is-hidden");
}

function setupHome() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".mode-panel").forEach((panel) => {
        panel.classList.toggle(
          "is-hidden",
          panel.dataset.panel !== btn.dataset.mode,
        );
      });
      clearHomeError();
    });
  });

  els.createBtn.addEventListener("click", createRoom);
  els.joinBtn.addEventListener("click", joinRoom);
  els.codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinRoom();
  });
  els.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const mode = document.querySelector(".mode-btn.is-active")?.dataset.mode;
      if (mode === "join") joinRoom();
      else createRoom();
    }
  });
  els.nameInput.addEventListener("input", clearHomeError);
  els.codeInput.addEventListener("input", clearHomeError);
}

async function createRoom() {
  const name = els.nameInput.value.trim();
  if (!name) {
    showHomeError("名前を入力してください。");
    els.nameInput.focus();
    return;
  }
  clearHomeError();
  setBusy(els.createBtn, true);
  try {
    const { data } = await api("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!data || !data.ok) {
      showHomeError(data?.error ?? "部屋を作成できませんでした。");
      return;
    }
    saveSession({
      code: data.code,
      playerId: data.playerId,
      token: data.token,
      name: data.name,
    });
    await enterRoom();
  } catch {
    showHomeError("通信に失敗しました。接続を確認してください。");
  } finally {
    setBusy(els.createBtn, false);
  }
}

async function joinRoom() {
  const name = els.nameInput.value.trim();
  const code = els.codeInput.value.trim().toUpperCase();
  if (!name) {
    showHomeError("名前を入力してください。");
    els.nameInput.focus();
    return;
  }
  if (!code) {
    showHomeError("部屋コードを入力してください。");
    els.codeInput.focus();
    return;
  }
  clearHomeError();
  setBusy(els.joinBtn, true);
  try {
    const { data } = await api(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!data || !data.ok) {
      showHomeError(data?.error ?? "部屋に参加できませんでした。");
      return;
    }
    saveSession({
      code: data.code,
      playerId: data.playerId,
      token: data.token,
      name: data.name,
    });
    await enterRoom();
  } catch {
    showHomeError("通信に失敗しました。接続を確認してください。");
  } finally {
    setBusy(els.joinBtn, false);
  }
}

/* -------------------------------------------------------------- room flow */

async function enterRoom() {
  if (!session) return;
  showRoom();
  const { data } = await api(`/api/rooms/${encodeURIComponent(session.code)}`);
  if (!data || !data.ok) {
    clearSession();
    showHome();
    showHomeError(
      data?.error ?? "その部屋が見つかりません。サーバーが再起動している可能性があります。",
    );
    return;
  }
  connect();
}

function setConn(status) {
  const map = {
    online: ["conn conn-online", "オンライン"],
    connecting: ["conn conn-connecting", "接続中…"],
    offline: ["conn conn-offline", "切断・再接続中"],
  };
  const [cls, label] = map[status] ?? map.connecting;
  els.connStatus.className = cls;
  els.connStatus.textContent = label;
}

function connect() {
  if (!session) return;
  setConn("connecting");
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${proto}//${location.host}/ws?code=${encodeURIComponent(
    session.code,
  )}&player=${encodeURIComponent(session.playerId)}&token=${encodeURIComponent(
    session.token,
  )}`;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    reconnectAttempts = 0;
    setConn("online");
  };
  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === "state") {
      clockOffset = msg.serverTime - Date.now();
      snap = msg;
      render();
    } else if (msg.type === "error") {
      toast(msg.message, true);
    }
  };
  ws.onclose = () => {
    setConn("offline");
    scheduleReconnect();
  };
  ws.onerror = () => {
    /* onclose が必ず続く */
  };
}

async function scheduleReconnect() {
  if (!session) return;
  reconnectAttempts += 1;
  if (reconnectAttempts > 15) {
    toast("接続が復旧しません。ページを再読み込みしてください。", true);
    return;
  }
  clearTimeout(reconnectTimer);
  // セッションが有効か確認してから再接続する
  const { data } = await api(
    `/api/session?code=${encodeURIComponent(session.code)}&player=${encodeURIComponent(
      session.playerId,
    )}&token=${encodeURIComponent(session.token)}`,
  ).catch(() => ({ data: null }));
  if (!data || !data.ok || !data.valid) {
    clearSession();
    showHome();
    showHomeError(
      data?.reason ?? "部屋から切断されました（サーバーが再起動した可能性があります）。",
    );
    return;
  }
  const delay = Math.min(600 * reconnectAttempts, 4000);
  reconnectTimer = setTimeout(connect, delay);
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/* ---------------------------------------------------------------- render */

function render() {
  if (!snap) return;
  els.codeChip.textContent = snap.code;
  els.viewLobby.classList.toggle("is-hidden", snap.phase !== "lobby");
  els.viewGame.classList.toggle("is-hidden", snap.phase !== "playing");
  els.viewResult.classList.toggle("is-hidden", snap.phase !== "result");
  if (snap.phase === "lobby") renderLobby();
  else if (snap.phase === "playing") renderGame();
  else renderResult();
}

function renderLobby() {
  els.lobbyCode.textContent = snap.code;
  els.playerList.replaceChildren(
    ...snap.players.map((p) => {
      const li = document.createElement("li");
      li.className = "player-chip" + (p.connected ? "" : " is-offline");
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.textContent = (p.name || "?").trim().slice(0, 1).toUpperCase();
      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = p.name;
      li.append(avatar, name);
      if (p.isHost) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = "HOST";
        li.append(tag);
      }
      return li;
    }),
  );

  const isHost = Boolean(snap.you?.isHost);
  els.startBtn.disabled = !isHost || !snap.canStart;
  els.startBtn.textContent = isHost ? "ゲームを開始" : "ホストがゲームを開始します";
  els.startHint.textContent = isHost
    ? snap.canStart
      ? `参加 ${snap.players.length}人 — 準備ができたら開始してください`
      : (snap.startReason ?? "")
    : `参加 ${snap.players.length}人 — ホストの開始を待っています…`;
}

function renderGame() {
  const q = snap.question;
  els.qIndex.textContent = q
    ? `問題 ${q.index + 1} / ${q.total}`
    : "問題準備中…";
  els.questionText.textContent = q ? q.text : "";

  const me = snap.you?.id;
  const answeringId = snap.answeringPlayerId;
  const iAmAnswering = Boolean(me) && answeringId === me;
  const myPlayer = snap.players.find((p) => p.id === me);

  els.phaseLabel.textContent =
    snap.status === "reveal"
      ? "解答発表"
      : answeringId
        ? `${snap.answeringPlayerName ?? "?"} さんが回答中`
        : "早押し待受中";

  // スコアボード
  els.scoreboard.replaceChildren(
    ...snap.players.map((p) => {
      const li = document.createElement("li");
      li.className =
        "score-chip" +
        (p.id === me ? " is-me" : "") +
        (p.id === answeringId ? " is-answering" : "") +
        (p.connected ? "" : " is-offline");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = p.id === me ? `${p.name}（自分）` : p.name;
      const pts = document.createElement("span");
      pts.className = "pts";
      pts.textContent = `${p.score}点`;
      li.append(name, pts);
      return li;
    }),
  );

  // 早押しボタン
  const showBuzzer =
    snap.status === "question" && !answeringId;
  els.buzzerWrap.classList.toggle("is-hidden", !showBuzzer);
  if (showBuzzer) {
    const alreadyBuzzed = Boolean(myPlayer?.hasBuzzed);
    els.buzzerBtn.disabled = alreadyBuzzed;
    els.buzzerNote.classList.toggle("is-hidden", !alreadyBuzzed);
    els.buzzerNote.textContent = alreadyBuzzed
      ? "この問題ではすでに押しています。次の問題で再び押してください。"
      : "";
  }

  // 回答中（自分の場合）
  const showOptions = iAmAnswering && snap.status === "question" && q;
  els.options.classList.toggle("is-hidden", !showOptions);
  if (showOptions) {
    els.options.replaceChildren(
      ...q.options.map((text, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.type = "button";
        const key = document.createElement("span");
        key.className = "option-key";
        key.textContent = OPTION_KEYS[index];
        const label = document.createElement("span");
        label.textContent = text;
        btn.append(key, label);
        btn.addEventListener("click", () => {
          btn.disabled = true;
          send({ type: "answer", choice: index });
        });
        return btn;
      }),
    );
  }

  // 他人が回答中
  const showWaiting = Boolean(answeringId) && !iAmAnswering && snap.status === "question";
  els.waiting.classList.toggle("is-hidden", !showWaiting);
  if (showWaiting) {
    els.waitingText.textContent = `${snap.answeringPlayerName ?? "?"} さんが回答中…`;
  }

  // 正解表示
  const showReveal = snap.status === "reveal";
  els.reveal.classList.toggle("is-hidden", !showReveal);
  if (showReveal) {
    els.reveal.replaceChildren();
    const title = document.createElement("p");
    title.className = "reveal-title " + (snap.lastAnswer ? (snap.lastAnswer.correct ? "ok" : "ng") : "");
    if (snap.lastAnswer) {
      title.textContent = snap.lastAnswer.correct
        ? `⭕ ${snap.lastAnswer.playerName} さんは正解！`
        : `❌ ${snap.lastAnswer.playerName} さんは不正解`;
    } else {
      title.textContent = "⏰ 時間切れ！";
    }
    const detail = document.createElement("p");
    detail.className = "reveal-detail";
    const correctText = q ? q.options[snap.correctChoice] : "";
    if (snap.lastAnswer) {
      const delta = snap.lastAnswer.correct ? "+10" : "-5";
      detail.innerHTML = "";
      detail.append(document.createTextNode(`正解: ${correctText} `));
      const span = document.createElement("span");
      span.className = "score-delta";
      span.textContent = delta;
      detail.append(span);
    } else {
      detail.textContent = `正解: ${correctText}`;
    }
    els.reveal.append(title, detail);

    // 選択肢を正解表示用に表示
    if (q) {
      els.options.classList.remove("is-hidden");
      els.options.replaceChildren(
        ...q.options.map((text, index) => {
          const btn = document.createElement("button");
          btn.className = "option-btn";
          btn.type = "button";
          btn.disabled = true;
          if (index === snap.correctChoice) btn.classList.add("is-correct");
          if (snap.lastAnswer && index === snap.lastAnswer.choice && !snap.lastAnswer.correct)
            btn.classList.add("is-wrong");
          const key = document.createElement("span");
          key.className = "option-key";
          key.textContent = OPTION_KEYS[index];
          const label = document.createElement("span");
          label.textContent = text;
          btn.append(key, label);
          return btn;
        }),
      );
    }
  }
}

function renderResult() {
  const sorted = [...snap.players].sort((a, b) => b.score - a.score);
  els.ranking.replaceChildren(
    ...sorted.map((p, index) => {
      const li = document.createElement("li");
      li.className = "rank-row" + (p.id === snap.you?.id ? " is-me" : "");
      li.dataset.rank = String(index + 1);
      const no = document.createElement("span");
      no.className = "rank-no";
      no.textContent = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : String(index + 1);
      const name = document.createElement("span");
      name.className = "rank-name";
      name.textContent = p.name + (p.id === snap.you?.id ? "（自分）" : "");
      const score = document.createElement("span");
      score.className = "rank-score";
      score.textContent = `${p.score}点`;
      li.append(no, name, score);
      return li;
    }),
  );
  const isHost = Boolean(snap.you?.isHost);
  els.restartBtn.classList.toggle("is-hidden", !isHost);
  els.restartHint.textContent = isHost
    ? "もう一度プレイするとスコアがリセットされます。"
    : "ホストが次のゲームを開始します…";
}

/* ----------------------------------------------------------------- timer */

function serverNow() {
  return Date.now() + clockOffset;
}

function updateTimer() {
  if (snap && snap.phase === "playing") {
    let deadline = null;
    let total = 1;
    const me = snap.you?.id;
    if (snap.status === "reveal") {
      deadline = snap.nextQuestionAt;
      total = 3500;
    } else if (snap.answeringPlayerId && snap.answeringPlayerId === me) {
      deadline = snap.answerDeadline;
      total = 10000;
    } else {
      deadline = snap.questionDeadline;
      total = 20000;
    }
    if (deadline) {
      const remain = Math.max(0, deadline - serverNow());
      els.timerValue.textContent = String(Math.ceil(remain / 1000));
      const pct = Math.max(0, Math.min(100, (remain / total) * 100));
      els.progressFill.style.width = `${pct}%`;
      const urgent = remain <= 5000;
      els.progressFill.classList.toggle("is-warning", urgent);
      els.timer.classList.toggle("is-urgent", urgent);
      if (snap.status === "question" && snap.answeringPlayerId && snap.answeringPlayerId !== me) {
        const remain2 = Math.max(0, (snap.answerDeadline ?? 0) - serverNow());
        els.waitingText.textContent = `${snap.answeringPlayerName ?? "?"} さんが回答中…（残り ${Math.ceil(
          remain2 / 1000,
        )}秒）`;
      }
    }
  }
  rafId = requestAnimationFrame(updateTimer);
}

/* ----------------------------------------------------------------- setup */

function setupRoom() {
  els.startBtn.addEventListener("click", () => send({ type: "start" }));
  els.restartBtn.addEventListener("click", () => send({ type: "restart" }));
  els.buzzerBtn.addEventListener("click", () => {
    els.buzzerBtn.disabled = true;
    send({ type: "buzz" });
  });
  els.leaveBtn.addEventListener("click", () => {
    if (ws) ws.close();
    clearSession();
    snap = null;
    showHome();
  });
  els.codeChip.addEventListener("click", () => copyText(snap?.code ?? ""));
  els.copyCodeBtn.addEventListener("click", () => copyText(snap?.code ?? ""));
  els.copyLinkBtn.addEventListener("click", () => copyText(location.origin));

  document.addEventListener("keydown", (e) => {
    if (!snap || snap.phase !== "playing") return;
    const me = snap.you?.id;
    if (snap.answeringPlayerId && snap.answeringPlayerId === me && snap.status === "question") {
      const idx = "1234".indexOf(e.key);
      const alt = "abcd".indexOf(e.key.toLowerCase());
      const choice = idx >= 0 ? idx : alt >= 0 ? alt : -1;
      if (choice >= 0 && snap.question) {
        const buttons = els.options.querySelectorAll(".option-btn");
        buttons[choice]?.click();
      }
    } else if (e.key === " " && !snap.answeringPlayerId && snap.status === "question") {
      e.preventDefault();
      els.buzzerBtn.click();
    }
  });

  window.addEventListener("online", () => {
    if (session && (!ws || ws.readyState > WebSocket.OPEN)) connect();
  });
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast(`コピーしました: ${text}`);
  } catch {
    toast("コピーに失敗しました", true);
  }
}

function init() {
  setupHome();
  setupRoom();
  rafId = requestAnimationFrame(updateTimer);
  if (session) {
    els.nameInput.value = session.name ?? "";
    enterRoom();
  } else {
    showHome();
  }
}

init();
