/* BUZZ QUIZ client — plain ES modules, no build step. */

const app = document.getElementById("app");
const toastRoot = document.getElementById("toast-root");

const PLAYER_ID_KEY = "bq.playerId";
const NAME_KEY = "bq.name";

let socket = null;
let roomCode = null;
let roomState = null;
let clockOffset = 0;
let connection = "idle";
let fatal = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let tickTimer = null;
let buzzSentAt = 0;

/* ---------- utilities ---------- */

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function getName() {
  return (localStorage.getItem(NAME_KEY) || "").trim();
}

function saveName(name) {
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 12));
}

function toast(message, kind = "info") {
  if (!toastRoot) return;
  const el = document.createElement("div");
  el.className = `toast ${kind === "error" ? "error" : ""}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s";
    setTimeout(() => el.remove(), 260);
  }, 2800);
}

async function copyText(text, successMessage = "コピーしました") {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage);
  } catch {
    toast("コピーできませんでした。手動で選択してください。", "error");
  }
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }
  toast("サーバーに接続中です。少し待ってからもう一度お試しください。", "error");
  return false;
}

function formatTime(ms) {
  const seconds = Math.max(0, ms) / 1000;
  return seconds >= 10 ? `${Math.ceil(seconds)}` : seconds.toFixed(1);
}

function firstChar(name) {
  return Array.from(name.trim())[0] || "?";
}

/* ---------- landing ---------- */

function renderLanding() {
  document.title = "BUZZ QUIZ — 4人対戦早押しクイズ";
  const params = new URLSearchParams(location.search);
  const prefilledRoom = (params.get("room") || "").toUpperCase();
  const savedName = getName();

  app.innerHTML = `
    <main class="landing">
      <header class="brand">
        <div class="brand-bolt" aria-hidden="true">⚡</div>
        <div>
          <p class="eyebrow">4 PLAYER BUZZER QUIZ</p>
          <h1>BUZZ<span>QUIZ</span></h1>
        </div>
      </header>

      <p class="tagline">
        4人でつながる、0.1秒の攻防。<br />
        早押しの速さと知識で、いちばん星をつかめ。
      </p>

      <section class="entry-card">
        <label class="field-label" for="player-name">プレイヤー名</label>
        <input
          id="player-name"
          class="text-input"
          data-testid="name-input"
          maxlength="12"
          autocomplete="nickname"
          placeholder="例: ハヤト"
          value="${escapeHtml(savedName)}"
        />

        <div class="entry-actions">
          <div>
            <button class="btn btn-primary" data-testid="create-room" style="width:100%">
              部屋を作る <span class="arrow">→</span>
            </button>
            <p class="entry-hint">あなたがホスト。2〜4人そろったら開始できます。</p>
          </div>

          <div class="divider"><span>または</span></div>

          <div>
            <div class="code-row">
              <input
                id="room-code"
                class="text-input code-input"
                data-testid="room-code-input"
                maxlength="4"
                inputmode="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="CODE"
                value="${escapeHtml(prefilledRoom)}"
                aria-label="部屋コード"
              />
              <button class="btn btn-pink" data-testid="join-room">参加する</button>
            </div>
            <p class="entry-hint">友だちから共有された4文字の部屋コードを入力。</p>
          </div>
        </div>

        <p class="form-error" data-testid="landing-error" role="alert"></p>
      </section>

      <section class="feature-row">
        <span class="chip"><i></i>4人オンライン対戦</span>
        <span class="chip"><i></i>内蔵10問・4択</span>
        <span class="chip"><i></i>サーバーが早押しを判定</span>
      </section>

      <footer class="landing-footer">
        Cloudflare Workers + Durable Objects / ローカル開発版
      </footer>
    </main>
  `;

  const nameInput = app.querySelector('[data-testid="name-input"]');
  const codeInput = app.querySelector('[data-testid="room-code-input"]');
  const errorEl = app.querySelector('[data-testid="landing-error"]');

  const showError = (message) => {
    errorEl.textContent = message;
  };

  const readName = () => {
    const name = nameInput.value.trim().slice(0, 12);
    if (!name) {
      showError("プレイヤー名を入力してください。");
      nameInput.focus();
      return null;
    }
    saveName(name);
    return name;
  };

  const createButton = app.querySelector('[data-testid="create-room"]');
  createButton.addEventListener("click", async () => {
    if (!readName()) return;
    showError("");
    createButton.disabled = true;
    createButton.textContent = "部屋を作成中…";
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      if (!response.ok) throw new Error("failed");
      const body = await response.json();
      location.assign(`/room/${body.code}`);
    } catch {
      showError("部屋を作成できませんでした。もう一度お試しください。");
      createButton.disabled = false;
      createButton.innerHTML = '部屋を作る <span class="arrow">→</span>';
    }
  });

  const join = async () => {
    if (!readName()) return;
    const code = codeInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) {
      showError("部屋コードは英数字4文字です。");
      codeInput.focus();
      return;
    }
    showError("");
    try {
      const response = await fetch(`/api/rooms/${code}`);
      if (!response.ok) {
        showError("その部屋コードの部屋は見つかりませんでした。");
        return;
      }
      const info = await response.json();
      if (!info.joinable) {
        showError(
          info.phase === "lobby"
            ? "この部屋は満員です（定員4人）。"
            : "この部屋はすでにゲームが始まっています。",
        );
        return;
      }
      location.assign(`/room/${code}`);
    } catch {
      showError("通信に失敗しました。もう一度お試しください。");
    }
  };

  app.querySelector('[data-testid="join-room"]').addEventListener("click", join);
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") join();
  });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && codeInput.value.trim()) join();
  });

  if (prefilledRoom) {
    codeInput.focus();
    codeInput.select();
  } else if (!savedName) {
    nameInput.focus();
  }
}

/* ---------- room connection ---------- */

function renderRoom() {
  document
    .querySelectorAll('[data-testid="reconnecting"]')
    .forEach((element) => element.remove());
  if (fatal) {
    renderFatal();
    return;
  }
  if (!roomState) {
    renderLoading();
    return;
  }
  const state = roomState;
  const me = state.players.find((player) => player.id === getPlayerId());
  const reconnectBar =
    connection === "reconnecting"
      ? `<div class="reconnect-bar" data-testid="reconnecting">
           <span class="spinner" aria-hidden="true"></span>
           再接続しています… 点数と回答権はサーバーに保存されています
         </div>`
      : "";

  if (state.phase === "lobby") {
    renderLobby(state, me);
  } else if (state.phase === "finished") {
    renderResult(state, me);
  } else {
    renderGame(state, me);
  }
  if (reconnectBar) {
    document.body.insertAdjacentHTML("beforeend", reconnectBar);
  }
  tick();
}

function renderLoading() {
  app.innerHTML = `
    <main class="room" data-testid="room" data-phase="connecting">
      <header class="topbar">
        <a class="mini-brand" href="/"><span class="bolt">⚡</span> BUZZ QUIZ</a>
        <div class="topbar-spacer"></div>
        <span class="conn-dot ${connection === "reconnecting" ? "offline" : ""}">
          ${connection === "reconnecting" ? "再接続中" : "接続中"}
        </span>
      </header>
      <section class="loading-screen">
        <div class="spinner" style="width:26px;height:26px;border-width:3px"></div>
        <p>部屋 <strong class="big-code">${escapeHtml(roomCode || "----")}</strong> に接続しています…</p>
      </section>
    </main>
  `;
}

function renderFatal() {
  const message = fatal?.message || "接続できませんでした。";
  app.innerHTML = `
    <main class="fatal-screen" data-testid="fatal">
      <div class="fatal-card">
        <div class="fatal-icon" aria-hidden="true">!</div>
        <h1>入室できませんでした</h1>
        <p data-testid="fatal-message">${escapeHtml(message)}</p>
        <a class="btn btn-primary" href="/">ロビーに戻る</a>
      </div>
    </main>
  `;
}

function connect() {
  const name = getName();
  if (!name) {
    location.replace(`/?room=${roomCode || ""}`);
    return;
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.host}/api/rooms/${roomCode}/ws?playerId=${encodeURIComponent(
    getPlayerId(),
  )}&name=${encodeURIComponent(name)}`;

  connection = roomState ? "reconnecting" : "connecting";
  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    reconnectAttempt = 0;
  });

  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "welcome") {
      connection = "open";
      return;
    }
    if (message.type === "state") {
      connection = "open";
      reconnectAttempt = 0;
      roomState = message.state;
      clockOffset = Date.now() - roomState.serverNow;
      renderRoom();
      return;
    }
    if (message.type === "error") {
      const fatalCodes = new Set([
        "room-full",
        "game-started",
        "room-not-found",
        "name-required",
        "invalid-player",
      ]);
      if (fatalCodes.has(message.code)) {
        fatal = message;
        renderRoom();
      } else {
        toast(message.message || "操作できませんでした。", "error");
      }
    }
  });

  socket.addEventListener("close", (event) => {
    socket = null;
    if (fatal) return;
    if (event.code === 4000) {
      fatal = {
        code: "replaced",
        message:
          "同じプレイヤーが別のタブで接続しました。このタブは切断されました。",
      };
      renderRoom();
      return;
    }
    if (event.code === 4001 && !roomState) {
      fatal = {
        code: "rejected",
        message: "部屋に入れませんでした。コードと定員を確認してください。",
      };
      renderRoom();
      return;
    }
    connection = "reconnecting";
    renderRoom();
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer || fatal) return;
  const delay = Math.min(500 * 2 ** reconnectAttempt, 5000);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function renderLobby(state, me) {
  const players = state.players;
  const connected = players.filter((player) => player.connected).length;
  const isHost = me?.isHost === true;
  const canStart = isHost && connected >= 2 && players.length <= 4;

  const cards = [];
  for (let i = 0; i < 4; i += 1) {
    const player = players[i];
    cards.push(
      player
        ? playerCard(player, i, state, me, { lobby: true })
        : `<div class="empty-seat" data-testid="empty-seat">
             <div class="avatar">+</div>
             <span>空きスロット</span>
           </div>`,
    );
  }

  app.innerHTML = `
    <main class="room" data-testid="room" data-phase="lobby">
      ${topbar(state, "ロビー")}
      <section class="lobby-hero">
        <div class="lobby-title">
          <p class="eyebrow">WAITING ROOM</p>
          <h1>メンバーを待っています</h1>
          <p>2〜4人そろったら、ホストがゲームを開始できます。</p>
        </div>
        <div class="code-card">
          <div>
            <div class="label">ROOM CODE</div>
            <div class="code" data-testid="room-code">${escapeHtml(state.code)}</div>
          </div>
          <button class="copy" data-testid="copy-invite">招待リンクをコピー</button>
        </div>
      </section>

      <div class="lobby-grid">
        <section class="panel">
          <h2 class="panel-title">
            プレイヤー
            <span class="count" data-testid="player-count">${players.length} / 4</span>
          </h2>
          <div class="player-list">${cards.join("")}</div>
        </section>

        <section class="panel lobby-side">
          <h2>${isHost ? "ゲームを始めましょう" : "ホストの開始を待っています"}</h2>
          <p>
            全員に同じ問題が出題されます。早押しに勝った1人だけが10秒以内に回答でき、
            正解なら <strong style="color:var(--green)">+10点</strong>、
            不正解なら <strong style="color:var(--red)">-5点</strong>。
          </p>

          <div class="start-block">
            ${
              isHost
                ? `<button class="btn btn-primary" data-testid="start-button" ${
                    canStart ? "" : "disabled"
                  }>
                    ゲームを開始 <span class="arrow">→</span>
                   </button>
                   <p class="start-note" data-testid="start-note">${
                     connected >= 2
                       ? `現在 ${connected} 人。開始できます！`
                       : `あと ${2 - connected} 人で開始できます。`
                   }</p>`
                : `<div class="waiting-pill">ホストが開始するのを待っています</div>
                   <p class="start-note">接続中 ${connected} 人 / 定員 4 人</p>`
            }
          </div>

          <ul class="rules">
            <li><span class="num">1</span><span>出題されたら、だれよりも早く早押しボタンを押す。</span></li>
            <li><span class="num">2</span><span>回答権を得た人は10秒以内に4択から選ぶ。</span></li>
            <li><span class="num">3</span><span>不正解でも、ほかの人に早押しのチャンスが残る。</span></li>
            <li><span class="num">4</span><span>10問終了時の合計点で最終順位が決まる。</span></li>
          </ul>
        </section>
      </div>
    </main>
  `;

  app.querySelectorAll("[data-copy-invite]").forEach((button) => {
    button.addEventListener("click", () =>
      copyText(`${location.origin}/room/${state.code}`, "招待リンクをコピーしました"),
    );
  });
  app.querySelector('[data-testid="copy-invite"]')?.addEventListener("click", () =>
    copyText(`${location.origin}/room/${state.code}`, "招待リンクをコピーしました"),
  );

  const startButton = app.querySelector('[data-testid="start-button"]');
  startButton?.addEventListener("click", () => {
    if (!send({ type: "start" })) return;
    startButton.disabled = true;
    startButton.textContent = "開始中…";
  });
}

function topbar(state, label) {
  return `
    <header class="topbar">
      <a class="mini-brand" href="/"><span class="bolt">⚡</span> BUZZ QUIZ</a>
      <div class="topbar-spacer"></div>
      <span class="conn-dot ${
        connection === "reconnecting" ? "offline" : ""
      }">${connection === "reconnecting" ? "再接続中" : label}</span>
      <button class="room-code-btn" data-copy-invite title="部屋コードをコピー">
        <small>ROOM</small><strong data-testid="room-code">${escapeHtml(state.code)}</strong>
      </button>
      <button class="exit-btn" data-leave>退出</button>
    </header>
  `;
}

function playerCard(player, index, state, me, options = {}) {
  const isYou = player.id === me?.id;
  const isAnswering =
    state.phase === "question" && state.buzzedBy === player.id;
  const locked = state.phase !== "lobby" && player.lockedOut;
  const offline = !player.connected;
  const classes = [
    "player-card",
    `p${index % 4}`,
    isYou ? "is-you" : "",
    isAnswering ? "is-answering" : "",
    locked ? "is-locked" : "",
    offline ? "is-offline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  let status = options.lobby ? "準備OK" : "待機中";
  let statusClass = "";
  if (options.lobby) {
    if (offline) {
      status = "接続待ち";
      statusClass = "bad";
    }
  } else if (locked) {
    status = "この問題は解答権なし";
    statusClass = "bad";
  } else if (isAnswering) {
    status = "回答中…";
    statusClass = "hot";
  } else if (offline) {
    status = "オフライン（復帰待ち）";
    statusClass = "bad";
  } else if (state.phase === "question") {
    status = "早押し待ち";
  } else if (state.phase === "reveal") {
    status = "結果発表";
  } else if (state.phase === "finished") {
    status = "ゲーム終了";
  }

  return `
    <div class="${classes}" data-testid="player-card" data-player-id="${escapeHtml(
      player.id,
    )}" data-player-name="${escapeHtml(player.name)}">
      <div class="avatar">${escapeHtml(firstChar(player.name))}</div>
      <div class="player-main">
        <div class="player-name">
          ${escapeHtml(player.name)}
          ${player.isHost ? '<span class="crown" title="ホスト">♛</span>' : ""}
          ${isYou ? '<span class="you">YOU</span>' : ""}
        </div>
        <div class="player-status ${statusClass}" data-testid="player-status">${status}</div>
      </div>
      <div class="player-score" data-testid="player-score">
        ${player.score}<small>pt</small>
      </div>
    </div>
  `;
}

/* ---------- game ---------- */

function renderGame(state, me) {
  const question = state.question;
  const isBuzzer = state.buzzedBy === me?.id;
  const locked = me?.lockedOut === true;
  const revealing = state.phase === "reveal";
  const answerWindow = state.buzzedBy ? state.answerDeadline : null;

  const dots = Array.from({ length: state.totalQuestions }, (_, i) => {
    const current = i === state.round - 1;
    const done = i < state.round - 1;
    return `<i class="${done ? "done" : ""} ${current ? "active" : ""}"></i>`;
  }).join("");

  const cards = state.players
    .map((player, index) => playerCard(player, index, state, me))
    .join("");

  const choices = (question?.choices || [])
    .map((choice, index) => {
      const letter = String.fromCharCode(65 + index);
      const classes = ["choice"];
      let disabled = true;
      if (revealing) {
        if (index === state.correctIndex) classes.push("correct");
        else if (state.result && state.result.choice === index)
          classes.push("wrong");
        else classes.push("dim");
      } else if (isBuzzer) {
        classes.push("armed");
        disabled = false;
      }
      return `<button
        class="${classes.join(" ")}"
        data-testid="choice-${index}"
        data-choice="${index}"
        ${disabled ? "disabled" : ""}
      >
        <span class="letter">${letter}</span>
        <span>${escapeHtml(choice)}</span>
      </button>`;
    })
    .join("");

  const timerDeadline = revealing
    ? state.revealDeadline
    : answerWindow || state.questionDeadline;
  const timerDuration = revealing
    ? 4000
    : answerWindow
      ? 10000
      : 20000;

  const timer = timerDeadline
    ? `<span class="timer-chip" data-timer-chip data-testid="timer">
         <span class="dot"></span>
         <span data-countdown data-deadline="${timerDeadline}" data-format="${
           revealing ? "dec" : answerWindow ? "dec" : "int"
         }">–</span><span class="unit">s</span>
       </span>`
    : "";

  const barDeadline = revealing
    ? state.revealDeadline
    : answerWindow || state.questionDeadline;
  const barDuration = revealing ? 4000 : answerWindow ? 10000 : 20000;

  app.innerHTML = `
    <main class="room" data-testid="room" data-phase="${state.phase}" data-round="${
      state.round
    }">
      ${topbar(state, state.phase === "reveal" ? "答え合わせ" : `第${state.round}問`)}
      <div class="game-grid">
        <aside class="panel player-rail">
          <h2 class="panel-title">プレイヤー <span class="count">${state.players.length} / 4</span></h2>
          <div class="player-list">${cards}</div>
        </aside>

        <section class="stage">
          <div class="round-head">
            <div class="round-label">
              <span class="now">第 ${state.round} 問</span>
              <span class="total">/ ${state.totalQuestions}</span>
              <span class="dots" aria-hidden="true">${dots}</span>
            </div>
            ${timer}
          </div>

          <article class="question-card">
            <div class="question-kicker">${
              revealing ? "ANSWER REVEAL" : "QUESTION"
            }</div>
            <h2 class="question-text" data-testid="question-prompt">${escapeHtml(
              question?.prompt || "",
            )}</h2>
            ${
              barDeadline
                ? `<div class="answer-timer" data-timer-bar>
                     <i data-bar data-deadline="${barDeadline}" data-duration="${barDuration}"></i>
                   </div>`
                : ""
            }
            <div class="choices">${choices}</div>
          </article>

          <div class="buzz-zone" data-testid="buzz-zone">
            ${buzzZone(state, me, { isBuzzer, locked, revealing })}
          </div>
          <p class="game-footnote">
            <b>SERVER JUDGED</b> — 最初に届いた1人だけが回答権を得る
          </p>
        </section>
      </div>
    </main>
  `;

  app.querySelectorAll("[data-copy-invite]").forEach((button) => {
    button.addEventListener("click", () =>
      copyText(`${location.origin}/room/${state.code}`, "部屋コードをコピーしました"),
    );
  });

  app.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = Number(button.dataset.choice);
      if (send({ type: "answer", choice })) {
        app
          .querySelectorAll("[data-choice]")
          .forEach((entry) => (entry.disabled = true));
      }
    });
  });

  app.querySelector('[data-testid="buzz-button"]')?.addEventListener("click", (event) => {
    const now = Date.now();
    if (now - buzzSentAt < 250) return;
    buzzSentAt = now;
    event.currentTarget.disabled = true;
    send({ type: "buzz" });
  });
}

function buzzZone(state, me, { isBuzzer, locked, revealing }) {
  if (revealing) {
    const result = state.result;
    const answerer = result
      ? state.players.find((player) => player.id === result.playerId)
      : null;
    const correctChoice =
      state.correctIndex !== null ? state.question?.choices[state.correctIndex] : "";
    let kind = "timeout";
    let mark = "!";
    let title = "時間切れ";
    let detail = `正解は「${correctChoice}」`;
    if (result?.correct) {
      kind = "";
      mark = "✓";
      title = "正解！ +10pt";
      detail = `${answerer?.name ?? "プレイヤー"} さんが正解しました`;
    } else if (result) {
      kind = "wrong";
      mark = "×";
      title = "不正解… -5pt";
      detail =
        result.reason === "timeout"
          ? `${answerer?.name ?? "プレイヤー"} さんは時間切れ。正解は「${correctChoice}」`
          : `${answerer?.name ?? "プレイヤー"} さんは不正解。正解は「${correctChoice}」`;
    }
    return `
      <div class="reveal-banner ${kind}" data-testid="reveal-banner">
        <div class="reveal-mark">${mark}</div>
        <div class="reveal-text">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </div>
        <div class="reveal-next">
          NEXT
          <b data-countdown data-deadline="${state.revealDeadline ?? 0}" data-format="dec">–</b>
        </div>
      </div>
    `;
  }

  if (isBuzzer) {
    return `
      <div class="answer-banner mine" data-testid="you-are-answering">
        <div class="who">あなたが回答中！</div>
        <div class="sub">10秒以内に正解だと思う選択肢をタップ</div>
        <div class="inline-timer" data-testid="answer-timer">
          <span data-countdown data-deadline="${state.answerDeadline ?? 0}" data-format="dec">–</span>
          <small>秒</small>
        </div>
      </div>
    `;
  }

  if (state.buzzedBy) {
    const answerer = state.players.find((player) => player.id === state.buzzedBy);
    return `
      <div class="answer-banner other" data-testid="other-answering">
        <div class="who" data-testid="answerer-name">${escapeHtml(
          answerer?.name ?? "プレイヤー",
        )} さんが回答中…</div>
        <div class="sub">回答権は1人だけ。次のチャンスに備えよう</div>
        <div class="inline-timer">
          <span data-countdown data-deadline="${state.answerDeadline ?? 0}" data-format="dec">–</span>
          <small>秒</small>
        </div>
      </div>
    `;
  }

  if (locked) {
    return `<div class="locked-note" data-testid="locked-out">
      <span>×</span> この問題はもう押せません（不正解）
    </div>`;
  }

  if (!me?.connected) {
    return `<div class="locked-note" data-testid="offline-note">接続が切れています。復帰を待っています…</div>`;
  }

  return `
    <button class="buzz-button" data-testid="buzz-button" aria-label="早押しする">
      早押し！
      <span>BUZZ</span>
    </button>
  `;
}

/* ---------- result ---------- */

function renderResult(state, me) {
  const ranking = state.ranking || [];
  const winners = ranking.filter((row) => row.rank === 1);
  const winnerNames = winners.map((row) => row.name).join(" & ");
  const isHost = me?.isHost === true;

  const podiumOrder = ranking.slice(0, 3);
  const podiumClasses = ["first", "second", "third"];
  const podium = podiumOrder
    .map((row, index) => {
      const cls = podiumClasses[index] || "third";
      return `
        <div class="podium-col ${cls}">
          <div class="podium-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
          <div class="podium-score">${row.score} pt</div>
          <div class="podium-block">${row.rank}</div>
        </div>
      `;
    })
    .join("");

  const rows = ranking
    .map(
      (row) => `
        <div class="rank-row rank-${row.rank}" data-testid="rank-row" data-rank="${row.rank}" data-player-name="${escapeHtml(row.name)}" data-score="${row.score}">
          <div class="rank-num">${row.rank}</div>
          <div class="rank-name">
            ${escapeHtml(row.name)}
            ${
              row.playerId === me?.id
                ? '<span class="you" style="margin-left:6px">YOU</span>'
                : ""
            }
          </div>
          <div class="rank-score">${row.score}<small>pt</small></div>
        </div>
      `,
    )
    .join("");

  app.innerHTML = `
    <main class="room result-screen" data-testid="result" data-phase="finished">
      ${topbar(state, "最終結果")}
      <div class="result-hero">
        <div class="trophy" aria-hidden="true">🏆</div>
        <p class="eyebrow">FINAL RESULT</p>
        <h1>優勝 <span data-testid="winner-name">${escapeHtml(winnerNames)}</span></h1>
        <p>10問の早押しバトル、おつかれさまでした。</p>
      </div>

      <div class="podium" data-testid="podium">${podium}</div>

      <section class="panel" style="max-width:680px;width:100%;margin:0 auto">
        <h2 class="panel-title">最終順位 <span class="count">${ranking.length} PLAYERS</span></h2>
        <div class="ranking-list">${rows}</div>
      </section>

      <div class="result-actions">
        ${
          isHost
            ? `<button class="btn btn-primary" data-testid="play-again">もう一度遊ぶ</button>`
            : `<span class="waiting-pill">ホストの再戦を待っています</span>`
        }
        <button class="btn btn-ghost" data-testid="share-result">結果の部屋リンクをコピー</button>
      </div>
    </main>
  `;

  app.querySelectorAll("[data-copy-invite]").forEach((button) => {
    button.addEventListener("click", () =>
      copyText(`${location.origin}/room/${state.code}`, "部屋リンクをコピーしました"),
    );
  });

  app.querySelector('[data-testid="play-again"]')?.addEventListener("click", () => {
    send({ type: "play-again" });
  });

  app.querySelector('[data-testid="share-result"]')?.addEventListener("click", () =>
    copyText(`${location.origin}/room/${state.code}`, "部屋リンクをコピーしました"),
  );
}

/* ---------- countdown rendering ---------- */

function tick() {
  const now = Date.now() - clockOffset;
  document.querySelectorAll("[data-countdown]").forEach((element) => {
    const deadline = Number(element.dataset.deadline);
    if (!Number.isFinite(deadline) || deadline <= 0) {
      element.textContent = "–";
      return;
    }
    const remaining = Math.max(0, deadline - now);
    const seconds = remaining / 1000;
    element.textContent =
      element.dataset.format === "int"
        ? `${Math.ceil(seconds)}`
        : seconds.toFixed(1);
  });

  document.querySelectorAll("[data-bar]").forEach((element) => {
    const deadline = Number(element.dataset.deadline);
    const duration = Number(element.dataset.duration) || 1;
    const remaining = Math.max(0, deadline - now);
    const percent = Math.min(100, (remaining / duration) * 100);
    element.style.width = `${percent}%`;
    const wrapper = element.closest(".answer-timer");
    if (wrapper) wrapper.classList.toggle("urgent", remaining < 4000);
  });

  document.querySelectorAll("[data-timer-chip]").forEach((chip) => {
    const deadline = Number(
      chip.querySelector("[data-countdown]")?.dataset.deadline,
    );
    chip.classList.toggle(
      "urgent",
      Number.isFinite(deadline) && deadline - now < 5000,
    );
  });
}

/* ---------- boot ---------- */

function boot() {
  const match = location.pathname.match(/^\/room\/([A-Za-z0-9]{4,8})\/?$/);
  if (!match) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    renderLanding();
    return;
  }
  roomCode = match[1].toUpperCase();
  const name = getName();
  if (!name) {
    location.replace(`/?room=${roomCode}`);
    return;
  }

  document.title = `部屋 ${roomCode} — BUZZ QUIZ`;
  connection = "connecting";
  renderRoom();

  app.addEventListener("click", (event) => {
    if (event.target.closest("[data-leave]")) {
      socket?.close();
      location.assign("/");
    }
  });

  connect();
  if (!tickTimer) tickTimer = setInterval(tick, 100);

  window.addEventListener("beforeunload", () => {
    socket?.close();
  });
}

boot();
