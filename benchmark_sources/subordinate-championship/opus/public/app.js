// 早押しクイズの画面。状態はすべてサーバー（部屋の Durable Object）から届き、
// この画面は「届いた状態を描く」「押した・選んだをサーバーへ送る」だけを行う。

const $app = document.getElementById("app");
const $toast = document.getElementById("toast");
const $conn = document.getElementById("conn");
const $mute = document.getElementById("mute");
const $sr = document.getElementById("sr");

const SESSION_KEY = "hq.session";
const LAST_KEY = "hq.last";
const MUTE_KEY = "hq.muted";
const SEAT_COLORS = ["red", "blue", "green", "gold"];
const LETTERS = ["A", "B", "C", "D"];

const store = {
  get(area, key) {
    try {
      return JSON.parse(area.getItem(key) ?? "null");
    } catch {
      return null;
    }
  },
  set(area, key, value) {
    try {
      if (value === null) area.removeItem(key);
      else area.setItem(key, JSON.stringify(value));
    } catch {
      /* 保存できない環境でも遊べるようにする */
    }
  },
};

const app = {
  /** @type {{code:string, playerId:string, token:string, name:string} | null} */
  session: store.get(sessionStorage, SESSION_KEY),
  /** @type {any} サーバーから届いた最新の状態 */
  state: null,
  ws: null,
  /** サーバー時計 - 手元の時計（ミリ秒） */
  offset: 0,
  bestRtt: Infinity,
  retry: 0,
  retryTimer: 0,
  pingTimer: 0,
  screen: "",
  lastRev: 0,
  pendingBuzz: false,
  homeError: "",
  muted: store.get(localStorage, MUTE_KEY) === true,
  prevScores: new Map(),
  prevPhase: "",
  prevAnswering: null,
};

const serverNow = () => Date.now() + app.offset;

// ---------- 効果音（WebAudio で短く鳴らすだけ） ----------
let audioCtx = null;
function beep(freqs, dur = 0.12, type = "sine", gain = 0.08) {
  if (app.muted) return;
  try {
    audioCtx ??= new AudioContext();
    const t0 = audioCtx.currentTime;
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      g.gain.setValueAtTime(gain, t0 + i * dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t0 + i * dur);
      osc.stop(t0 + (i + 1) * dur);
    });
  } catch {
    /* 音が出せなくても続行 */
  }
}
const sfx = {
  buzz: () => beep([880, 1320], 0.09, "square", 0.05),
  correct: () => beep([784, 988, 1319], 0.11, "triangle", 0.09),
  wrong: () => beep([220, 165], 0.18, "sawtooth", 0.05),
  tick: () => beep([660], 0.05, "sine", 0.03),
  fanfare: () => beep([523, 659, 784, 1047], 0.14, "triangle", 0.09),
};
function renderMute() {
  $mute.textContent = app.muted ? "🔇" : "🔊";
  $mute.setAttribute("aria-pressed", String(app.muted));
}
$mute.addEventListener("click", () => {
  app.muted = !app.muted;
  store.set(localStorage, MUTE_KEY, app.muted);
  renderMute();
});
renderMute();

// ---------- 小さな道具 ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
let toastTimer = 0;
function toast(msg, kind = "info") {
  $toast.textContent = msg;
  $toast.dataset.kind = kind;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($toast.hidden = true), 3200);
}
function announce(msg) {
  $sr.textContent = msg;
}
function urlRoom() {
  const code = new URLSearchParams(location.search).get("room");
  return code ? code.toUpperCase().slice(0, 5) : "";
}
function setUrlRoom(code) {
  const url = new URL(location.href);
  if (code) url.searchParams.set("room", code);
  else url.searchParams.delete("room");
  history.replaceState(null, "", url);
}
function me() {
  return app.state?.players.find((p) => p.id === app.session?.playerId) ?? null;
}
function playerName(id) {
  return app.state?.players.find((p) => p.id === id)?.name ?? "？";
}
function seatOf(id) {
  return app.state?.players.find((p) => p.id === id)?.seat ?? 0;
}

// ---------- 通信 ----------
async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 下でまとめて扱う */
  }
  if (!res.ok || !data?.ok) throw new Error(data?.message ?? "通信に失敗しました");
  return data;
}

function saveSession(s) {
  app.session = s;
  store.set(sessionStorage, SESSION_KEY, s);
  if (s) store.set(localStorage, LAST_KEY, s);
}

function connect() {
  const s = app.session;
  if (!s) return;
  clearTimeout(app.retryTimer);
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(
    `${proto}://${location.host}/api/rooms/${encodeURIComponent(s.code)}/ws?pid=${encodeURIComponent(s.playerId)}&token=${encodeURIComponent(s.token)}`,
  );
  app.ws = ws;
  setConn("connecting");
  ws.addEventListener("open", () => {
    app.retry = 0;
    setConn("online");
    ping();
    clearInterval(app.pingTimer);
    app.pingTimer = setInterval(ping, 4000);
  });
  ws.addEventListener("message", (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    onMessage(msg);
  });
  ws.addEventListener("close", (e) => {
    if (app.ws !== ws) return;
    clearInterval(app.pingTimer);
    app.ws = null;
    if (e.code === 4001 || e.code === 4002) {
      // 参加情報が無効（部屋が消えた・退出した）ならトップへ
      if (e.code === 4001) app.homeError = "前の部屋に戻れませんでした。もう一度参加してください";
      leaveLocal();
      return;
    }
    setConn("offline");
    const delay = Math.min(5000, 400 * 2 ** app.retry++);
    app.retryTimer = setTimeout(connect, delay);
  });
}

function ping() {
  if (app.ws?.readyState === WebSocket.OPEN) app.ws.send(JSON.stringify({ t: "ping", c: Date.now() }));
}

function send(msg) {
  if (app.ws?.readyState === WebSocket.OPEN) {
    app.ws.send(JSON.stringify(msg));
    return true;
  }
  toast("接続が切れています。再接続を待っています…", "warn");
  return false;
}

function setConn(kind) {
  $conn.hidden = kind === "online" && !!app.session;
  $conn.dataset.kind = kind;
  $conn.textContent = kind === "online" ? "接続中" : kind === "connecting" ? "接続しています…" : "再接続中…";
  if (!app.session) $conn.hidden = true;
}

function onMessage(msg) {
  if (msg.t === "pong") {
    // 往復時間が一番短かったサンプルで時計のずれを見積もる
    const rtt = Date.now() - msg.c;
    if (rtt <= app.bestRtt * 1.5 || rtt < 60) {
      app.bestRtt = Math.min(app.bestRtt, rtt);
      app.offset = msg.s - (msg.c + rtt / 2);
    }
    return;
  }
  if (msg.t === "state") {
    if (app.bestRtt === Infinity) app.offset = msg.serverNow - Date.now();
    onState(msg.state);
    return;
  }
  if (msg.t === "error") {
    app.pendingBuzz = false;
    if (msg.code !== "invalid_session") toast(msg.message, "warn");
    else app.homeError = msg.message;
    render();
    return;
  }
}

function onState(next) {
  if (next.rev < app.lastRev && next.code === app.state?.code) return;
  const prev = app.state;
  app.lastRev = next.rev;
  app.state = next;
  app.pendingBuzz = false;
  if (!next.players.some((p) => p.id === app.session?.playerId)) {
    leaveLocal();
    return;
  }
  playCues(prev, next);
  render();
}

/** 状態の変化に合わせて効果音とスクリーンリーダー向けの読み上げを出す */
function playCues(prev, next) {
  if (!prev) return;
  if (next.answeringId && next.answeringId !== prev.answeringId) {
    sfx.buzz();
    announce(`${playerName(next.answeringId)}さんが回答中`);
  }
  const prevOutcomes = prev.questionNumber === next.questionNumber ? prev.outcomes.length : 0;
  for (const o of next.outcomes.slice(prevOutcomes)) {
    if (o.kind === "correct") sfx.correct();
    else sfx.wrong();
    announce(`${playerName(o.playerId)}さん ${o.kind === "correct" ? "正解" : o.kind === "wrong" ? "不正解" : "時間切れ"} ${o.delta > 0 ? "+" : ""}${o.delta}点`);
  }
  if (next.phase === "question" && prev.phase !== "question" && prev.phase !== "answering") sfx.tick();
  if (next.phase === "finished" && prev.phase !== "finished") sfx.fanfare();
}

function leaveLocal() {
  if (app.ws) {
    const ws = app.ws;
    app.ws = null;
    try {
      ws.close();
    } catch {
      /* もう閉じている */
    }
  }
  clearInterval(app.pingTimer);
  clearTimeout(app.retryTimer);
  const code = app.session?.code ?? "";
  saveSession(null);
  store.set(localStorage, LAST_KEY, null);
  app.state = null;
  app.lastRev = 0;
  setConn("online");
  setUrlRoom(code && app.homeError ? code : "");
  render();
}

// ---------- 操作 ----------
function doBuzz() {
  const s = app.state;
  const my = me();
  if (!s || !my || s.phase !== "question" || s.lockedOut.includes(my.id) || app.pendingBuzz) return;
  if (send({ t: "buzz" })) {
    app.pendingBuzz = true;
    const btn = document.querySelector(".buzzer");
    btn?.classList.add("is-pressing");
  }
}
function doAnswer(choice) {
  const s = app.state;
  if (!s || s.phase !== "answering" || s.answeringId !== app.session?.playerId) return;
  send({ t: "answer", choice });
  document.querySelectorAll(".choice").forEach((el) => el.setAttribute("disabled", ""));
  document.querySelector(`.choice[data-choice="${choice}"]`)?.classList.add("is-picked");
}

document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const s = app.state;
  if (!s) return;
  if ((e.code === "Space" || e.key === "Enter") && s.phase === "question") {
    e.preventDefault();
    doBuzz();
  }
  const idx = ["1", "2", "3", "4"].indexOf(e.key) >= 0 ? ["1", "2", "3", "4"].indexOf(e.key) : LETTERS.indexOf(e.key.toUpperCase());
  if (idx >= 0 && s.phase === "answering") doAnswer(idx);
});

$app.addEventListener("click", async (e) => {
  const el = e.target instanceof Element ? e.target.closest("[data-action]") : null;
  if (!el || el.hasAttribute("disabled")) return;
  const action = el.getAttribute("data-action");
  switch (action) {
    case "buzz":
      return doBuzz();
    case "answer":
      return doAnswer(Number(el.getAttribute("data-choice")));
    case "start":
      return send({ t: "start" });
    case "leave":
      if (!app.ws) return leaveLocal();
      return send({ t: "leave" });
    case "lobby":
      return send({ t: "lobby" });
    case "home":
      return leaveLocal();
    case "copy": {
      const url = `${location.origin}/?room=${app.state?.code ?? ""}`;
      try {
        await navigator.clipboard.writeText(url);
        toast("招待リンクをコピーしました");
      } catch {
        toast(url);
      }
      return;
    }
    case "resume": {
      const last = store.get(localStorage, LAST_KEY);
      if (last) {
        saveSession(last);
        setUrlRoom(last.code);
        connect();
        render();
      }
      return;
    }
  }
});

$app.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  const submitter = /** @type {HTMLButtonElement|null} */ (e.submitter);
  // コード欄で Enter を押したときは「参加する」として扱う
  const inCode = document.activeElement instanceof HTMLInputElement && document.activeElement.name === "code";
  const mode = inCode ? "join" : (submitter?.value ?? "create");
  const name = String(new FormData(form).get("name") ?? "").trim();
  const code = String(new FormData(form).get("code") ?? "").trim().toUpperCase();
  if (!name) return showHomeError("名前を入力してください", "name");
  if (mode === "join" && code.length !== 5) return showHomeError("5文字の部屋コードを入力してください", "code");
  form.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    const res = mode === "join" ? await api(`/api/rooms/${encodeURIComponent(code)}/join`, { name }) : await api("/api/rooms", { name });
    try {
      localStorage.setItem("hq.name", name);
    } catch {
      /* 保存できなくてもよい */
    }
    app.homeError = "";
    saveSession({ code: res.code, playerId: res.playerId, token: res.token, name });
    setUrlRoom(res.code);
    app.lastRev = 0;
    connect();
    render();
  } catch (err) {
    showHomeError(err instanceof Error ? err.message : String(err), mode === "join" ? "code" : "name");
    form.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
});

function showHomeError(msg, field) {
  app.homeError = msg;
  const box = document.getElementById("home-error");
  if (box) {
    box.textContent = msg;
    box.hidden = false;
  }
  document.querySelector(`input[name="${field}"]`)?.focus();
}

// ---------- 描画 ----------
function render() {
  const s = app.state;
  let screen;
  if (!app.session) screen = "home";
  else if (!s) screen = "connecting";
  else if (s.phase === "lobby") screen = "lobby";
  else if (s.phase === "finished") screen = "result";
  else screen = "game";
  document.body.dataset.screen = screen;
  if (screen === "home") {
    // 入力中の文字を消さないよう、ホーム画面は作り直さない
    if (app.screen !== "home") $app.innerHTML = homeView();
    const box = document.getElementById("home-error");
    if (box) {
      box.textContent = app.homeError;
      box.hidden = !app.homeError;
    }
  } else if (screen === "connecting") {
    $app.innerHTML = `<section class="panel center connecting"><div class="spinner" aria-hidden="true"></div><p>部屋 <b>${esc(app.session.code)}</b> に接続しています…</p><button class="btn ghost" data-action="home">トップへ戻る</button></section>`;
  } else if (screen === "lobby") {
    $app.innerHTML = lobbyView(s);
  } else if (screen === "result") {
    $app.innerHTML = resultView(s);
  } else {
    $app.innerHTML = gameView(s);
  }
  app.screen = screen;
  updateTimers();
  floatScoreDeltas();
}

function homeView() {
  const room = urlRoom();
  let savedName = "";
  try {
    savedName = localStorage.getItem("hq.name") ?? "";
  } catch {
    /* なし */
  }
  const last = store.get(localStorage, LAST_KEY);
  return `
  <section class="home">
    <div class="hero">
      <div class="hero-buzzer" aria-hidden="true"><span></span></div>
      <h1>早押し<span class="spark">⚡</span>クイズ</h1>
      <p class="lead">最大4人・全10問の4択勝負。<br>いちばん早く押した人だけが答えられる！</p>
    </div>
    <form class="panel home-form" novalidate>
      <label class="field">
        <span class="field-label">あなたの名前</span>
        <input name="name" maxlength="12" autocomplete="nickname" placeholder="例: たろう" value="${esc(savedName)}" required>
      </label>
      <div class="home-actions">
        <div class="home-col">
          <p class="col-title">新しく遊ぶ</p>
          <button class="btn primary big" type="submit" name="mode" value="create">部屋を作る</button>
        </div>
        <div class="home-or" aria-hidden="true">または</div>
        <div class="home-col">
          <p class="col-title">友だちの部屋へ</p>
          <div class="join-row">
            <input name="code" class="code-input" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="部屋コード" value="${esc(room)}" aria-label="部屋コード（5文字）">
            <button class="btn secondary big" type="submit" name="mode" value="join">参加する</button>
          </div>
        </div>
      </div>
      <p id="home-error" class="form-error" role="alert" hidden></p>
      ${last ? `<button type="button" class="btn link" data-action="resume">前回の部屋（${esc(last.code)}・${esc(last.name)}）に戻る</button>` : ""}
    </form>
    <ul class="rules">
      <li><b>+10</b>正解</li>
      <li><b>−5</b>不正解・時間切れ</li>
      <li><b>10秒</b>回答の制限時間</li>
      <li><b>20秒</b>1問の早押し時間</li>
    </ul>
  </section>`;
}

function seatCard(p, s, { showStatus }) {
  const isMe = p.id === app.session?.playerId;
  const isHost = p.id === s.hostId;
  let status = "";
  if (!p.connected) status = `<span class="chip offline">切断中</span>`;
  else if (showStatus && s.answeringId === p.id) status = `<span class="chip answering">回答中</span>`;
  else if (showStatus && s.lockedOut.includes(p.id)) status = `<span class="chip locked">× 押せない</span>`;
  return `
  <li class="seat seat-${SEAT_COLORS[p.seat]}${isMe ? " is-me" : ""}${s.answeringId === p.id ? " is-answering" : ""}${!p.connected ? " is-offline" : ""}" data-player="${esc(p.id)}">
    <div class="seat-top">
      <span class="seat-name">${esc(p.name)}</span>
      ${isHost ? `<span class="badge host" title="ホスト">👑</span>` : ""}
      ${isMe ? `<span class="badge you">あなた</span>` : ""}
    </div>
    <div class="seat-bottom">
      <span class="seat-score" data-score-for="${esc(p.id)}">${p.score}<small>点</small></span>
      ${status}
    </div>
  </li>`;
}

function lobbyView(s) {
  const my = me();
  const isHost = my?.id === s.hostId;
  const n = s.players.length;
  const canStart = n >= s.rules.minPlayers && n <= s.rules.maxPlayers;
  const seats = [];
  for (let i = 0; i < s.rules.maxPlayers; i++) {
    const p = s.players.find((x) => x.seat === i);
    seats.push(
      p
        ? seatCard(p, s, { showStatus: false })
        : `<li class="seat seat-empty seat-${SEAT_COLORS[i]}"><div class="seat-top"><span class="seat-name">空席</span></div><div class="seat-bottom"><span class="waiting-dots">参加を待っています</span></div></li>`,
    );
  }
  return `
  <section class="lobby">
    <div class="panel room-code-panel">
      <p class="eyebrow">部屋コード</p>
      <div class="room-code" aria-label="部屋コード ${esc(s.code.split("").join(" "))}" data-testid="room-code">${s.code
        .split("")
        .map((c) => `<span>${esc(c)}</span>`)
        .join("")}</div>
      <p class="muted">このコードを友だちに伝えるか、招待リンクを送ってください</p>
      <button class="btn ghost" data-action="copy">🔗 招待リンクをコピー</button>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h2>参加者 <span class="count">${n} / ${s.rules.maxPlayers}</span></h2>
      </div>
      <ul class="seats seats-lobby">${seats.join("")}</ul>
      <div class="lobby-actions">
        ${
          isHost
            ? `<button class="btn primary big start-btn" data-action="start" ${canStart ? "" : "disabled"}>▶ ゲーム開始</button>
               <p class="hint">${canStart ? `${n}人で開始できます` : `あと${s.rules.minPlayers - n}人以上集まると開始できます（2〜4人）`}</p>`
            : `<p class="hint waiting">ホスト（${esc(playerName(s.hostId))}さん）が開始するのを待っています…</p>`
        }
        <button class="btn link" data-action="leave">部屋を出る</button>
      </div>
    </div>
  </section>`;
}

function gameView(s) {
  const my = me();
  const q = s.question;
  const amAnswering = s.answeringId === my?.id;
  const locked = my ? s.lockedOut.includes(my.id) : true;
  const seats = s.players.map((p) => seatCard(p, s, { showStatus: true })).join("");

  let center = "";
  if (s.phase === "countdown") {
    center = `
    <div class="panel countdown-panel">
      <p class="eyebrow">まもなく出題</p>
      <div class="countdown-num" data-countdown="${s.phaseEndsAt}">3</div>
      <p class="muted">全${s.questionCount}問・早押し4択</p>
    </div>`;
  } else if (q) {
    const wrongBy = new Map();
    for (const o of s.outcomes) if (o.kind === "wrong") wrongBy.set(o.choice, [...(wrongBy.get(o.choice) ?? []), o.playerId]);
    const choices = q.choices
      .map((c, i) => {
        const isAnswer = q.answer === i;
        const wrong = wrongBy.get(i);
        const cls = [
          "choice",
          isAnswer ? "is-correct" : "",
          wrong ? "is-wrong" : "",
          s.phase === "reveal" && !isAnswer ? "is-dim" : "",
        ].join(" ");
        const enabled = s.phase === "answering" && amAnswering;
        return `
        <button class="${cls}" data-action="answer" data-choice="${i}" ${enabled ? "" : "disabled"}>
          <span class="choice-letter">${LETTERS[i]}</span>
          <span class="choice-text">${esc(c)}</span>
          ${isAnswer ? `<span class="choice-mark">⭕ 正解</span>` : ""}
          ${wrong ? `<span class="choice-mark wrong">✕ ${wrong.map((id) => esc(playerName(id))).join("・")}</span>` : ""}
        </button>`;
      })
      .join("");

    let banner = "";
    if (s.phase === "answering") {
      banner = amAnswering
        ? `<div class="banner banner-me seat-${SEAT_COLORS[seatOf(s.answeringId)]}"><span class="ring" data-ring="${s.answerEndsAt}" data-ring-total="${s.rules.answerMs}"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.5"/><circle class="ring-fg" cx="18" cy="18" r="15.5"/></svg><b data-sec="${s.answerEndsAt}"></b></span><div><strong>あなたの回答です！</strong><span>10秒以内に選んでください（キー 1〜4 でも選べます）</span></div></div>`
        : `<div class="banner seat-${SEAT_COLORS[seatOf(s.answeringId)]}"><span class="ring" data-ring="${s.answerEndsAt}" data-ring-total="${s.rules.answerMs}"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.5"/><circle class="ring-fg" cx="18" cy="18" r="15.5"/></svg><b data-sec="${s.answerEndsAt}"></b></span><div><strong data-testid="answering-name">${esc(playerName(s.answeringId))}さんが回答中</strong><span>回答を待っています…</span></div></div>`;
    } else if (s.phase === "reveal") {
      const winner = s.outcomes.find((o) => o.kind === "correct");
      const isLast = s.questionNumber >= s.questionCount;
      banner = `<div class="banner banner-reveal ${winner ? "has-winner" : ""}">
        <div><strong>${winner ? `🎉 ${esc(playerName(winner.playerId))}さん 正解！ +${winner.delta}点` : "正解者なし"}</strong>
        <span>正解は「${LETTERS[q.answer]}. ${esc(q.choices[q.answer])}」${q.note ? `（${esc(q.note)}）` : ""}</span></div>
        <span class="next-in">${isLast ? "結果発表まで" : "次の問題まで"} <b data-sec="${s.phaseEndsAt}"></b>秒</span>
      </div>`;
    } else {
      const lastMiss = [...s.outcomes].reverse()[0];
      banner = lastMiss
        ? `<div class="banner banner-miss"><div><strong>${esc(playerName(lastMiss.playerId))}さん ${lastMiss.kind === "timeout" ? "時間切れ" : "不正解"}（${lastMiss.delta}点）</strong><span>残りの人で早押し再開！</span></div></div>`
        : `<div class="banner banner-open"><div><strong>早押し受付中！</strong><span>わかったら押してください（スペースキーでも押せます）</span></div></div>`;
    }

    center = `
    <div class="panel question-panel phase-${s.phase}">
      <div class="q-head">
        <span class="q-num">第<b>${s.questionNumber}</b>問<small> / ${s.questionCount}</small></span>
        <span class="q-time">残り <b data-sec="${s.questionEndsAt}" data-testid="question-seconds"></b>秒</span>
      </div>
      <div class="timebar" aria-hidden="true"><span data-bar="${s.questionEndsAt}" data-bar-total="${s.rules.questionMs}"></span></div>
      <h2 class="q-text" data-testid="question-text">${esc(q.text)}</h2>
      <div class="choices">${choices}</div>
      ${banner}
    </div>`;
  }

  let buzzLabel = "押す！";
  let buzzSub = "スペースキーでも押せます";
  let buzzDisabled = true;
  if (s.phase === "question" && !locked) {
    buzzDisabled = app.pendingBuzz;
  } else if (s.phase === "question" && locked) {
    buzzLabel = "押せません";
    buzzSub = "この問題ではもう押せません";
  } else if (s.phase === "answering") {
    buzzLabel = amAnswering ? "回答中" : "待機";
    buzzSub = amAnswering ? "上の選択肢から選んでください" : `${playerName(s.answeringId)}さんが回答中`;
  } else if (s.phase === "reveal") {
    buzzLabel = "次へ";
    buzzSub = "まもなく次の問題";
  } else if (s.phase === "countdown") {
    buzzLabel = "準備";
    buzzSub = "まもなく出題";
  }

  return `
  <section class="game phase-${s.phase}">
    <ul class="seats seats-game" data-testid="scoreboard">${seats}</ul>
    <div class="game-main">${center}</div>
    <div class="buzz-zone">
      <button class="buzzer ${buzzDisabled ? "" : "is-live"} ${amAnswering ? "is-mine" : ""}" data-action="buzz" ${buzzDisabled ? "disabled" : ""} aria-label="早押しボタン: ${buzzLabel}">
        <span class="buzzer-cap"><span class="buzzer-label">${buzzLabel}</span></span>
      </button>
      <p class="buzz-sub">${esc(buzzSub)}</p>
    </div>
  </section>`;
}

function resultView(s) {
  const my = me();
  const isHost = my?.id === s.hostId;
  const ranking = s.ranking ?? [];
  const top = ranking[0];
  const medals = ["🥇", "🥈", "🥉"];
  const rows = ranking
    .map(
      (r) => `
    <li class="rank-row seat-${SEAT_COLORS[r.seat]} rank-${r.rank}${r.id === my?.id ? " is-me" : ""}" data-testid="rank-row">
      <span class="rank-medal" aria-hidden="true">${r.rank <= 3 ? medals[r.rank - 1] : ""}</span>
      <span class="rank-pos">${r.rank}位</span>
      <span class="rank-name">${esc(r.name)}${r.id === my?.id ? ` <span class="badge you">あなた</span>` : ""}</span>
      <span class="rank-score">${r.score}<small>点</small></span>
    </li>`,
    )
    .join("");
  const ties = ranking.filter((r) => r.rank === 1).length;
  return `
  <section class="result">
    <div class="confetti" aria-hidden="true">${Array.from(
      { length: 36 },
      (_, i) =>
        `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 1.2).toFixed(2)}s;--t:${(2.2 + Math.random() * 1.6).toFixed(2)}s;--h:${(i * 47) % 360}"></i>`,
    ).join("")}</div>
    <div class="panel result-panel">
      <p class="eyebrow">最終結果</p>
      <h2 class="winner">${top ? (ties > 1 ? "同点優勝！" : `🏆 ${esc(top.name)}さんの優勝！`) : "結果"}</h2>
      <ol class="ranking" data-testid="ranking">${rows}</ol>
      <div class="result-actions">
        ${isHost ? `<button class="btn primary big" data-action="lobby">もう一度遊ぶ</button>` : `<p class="hint">ホストが「もう一度遊ぶ」を押すと同じメンバーで再戦できます</p>`}
        <button class="btn link" data-action="leave">部屋を出る</button>
      </div>
    </div>
  </section>`;
}

// ---------- タイマー（サーバー時計で全員そろえる） ----------
let lastTickSec = -1;
function updateTimers() {
  const now = serverNow();
  document.querySelectorAll("[data-sec]").forEach((el) => {
    const end = Number(el.getAttribute("data-sec"));
    el.textContent = String(Math.max(0, Math.ceil((end - now) / 1000)));
  });
  document.querySelectorAll("[data-bar]").forEach((el) => {
    const end = Number(el.getAttribute("data-bar"));
    const total = Number(el.getAttribute("data-bar-total"));
    const ratio = Math.max(0, Math.min(1, (end - now) / total));
    el.style.transform = `scaleX(${ratio})`;
    el.parentElement?.classList.toggle("is-low", ratio < 0.25);
  });
  document.querySelectorAll("[data-ring]").forEach((el) => {
    const end = Number(el.getAttribute("data-ring"));
    const total = Number(el.getAttribute("data-ring-total"));
    const ratio = Math.max(0, Math.min(1, (end - now) / total));
    el.style.setProperty("--p", String(ratio));
  });
  const cd = document.querySelector("[data-countdown]");
  if (cd) {
    const sec = Math.max(1, Math.ceil((Number(cd.getAttribute("data-countdown")) - now) / 1000));
    if (cd.textContent !== String(sec)) {
      cd.textContent = String(sec);
      cd.classList.remove("pop");
      void cd.clientWidth;
      cd.classList.add("pop");
      if (sec !== lastTickSec) sfx.tick();
      lastTickSec = sec;
    }
  }
}
function loop() {
  updateTimers();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/** 点数が変わったプレイヤーの札に「+10」などを浮かべる */
function floatScoreDeltas() {
  const s = app.state;
  if (!s) {
    app.prevScores.clear();
    return;
  }
  for (const p of s.players) {
    const before = app.prevScores.get(p.id);
    if (before !== undefined && before !== p.score && s.phase !== "lobby") {
      const el = document.querySelector(`[data-score-for="${CSS.escape(p.id)}"]`);
      if (el) {
        const d = p.score - before;
        const f = document.createElement("span");
        f.className = `delta ${d > 0 ? "up" : "down"}`;
        f.textContent = `${d > 0 ? "+" : ""}${d}`;
        el.appendChild(f);
      }
    }
    app.prevScores.set(p.id, p.score);
  }
}

// ---------- 起動 ----------
window.addEventListener("online", () => {
  if (app.session && !app.ws) connect();
});
if (app.session) {
  setUrlRoom(app.session.code);
  connect();
}
render();
