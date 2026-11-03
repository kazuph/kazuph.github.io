/* 早押しバズール — クライアント
 * サーバー（Durable Object）が配る状態スナップショットを描画するだけ。
 * 正誤判定・点数・早押しの権限はすべてサーバー側で決まる。
 */
(() => {
  "use strict";

  const BUZZ_WINDOW_MS = 20_000; // src/shared/types.ts の QUESTION_TIME_MS と一致
  const ANSWER_WINDOW_MS = 10_000; // ANSWER_TIME_MS と一致
  const SESSION_KEY = "buzzool_session_v1";

  const $ = (id) => document.getElementById(id);

  const els = {
    screens: {
      top: $("screen-top"),
      lobby: $("screen-lobby"),
      quiz: $("screen-quiz"),
      result: $("screen-result"),
    },
    inputName: $("input-name"),
    inputCode: $("input-code"),
    btnCreate: $("btn-create"),
    btnJoin: $("btn-join"),
    topError: $("top-error"),
    lobbyCode: $("lobby-code"),
    lobbyCount: $("lobby-count"),
    lobbyPlayers: $("lobby-players"),
    lobbyWaitNote: $("lobby-wait-note"),
    btnStart: $("btn-start"),
    lobbyError: $("lobby-error"),
    lobbyYou: $("lobby-you"),
    btnCopy: $("btn-copy"),
    quizProgress: $("quiz-progress"),
    quizPhaseBadge: $("quiz-phase-badge"),
    timerBar: $("quiz-timer-bar"),
    scoreboard: $("scoreboard"),
    questionText: $("question-text"),
    choices: $("choices"),
    btnBuzz: $("btn-buzz"),
    buzzStatus: $("buzz-status"),
    banner: $("quiz-banner"),
    connectionNote: $("connection-note"),
    resultList: $("result-list"),
    btnAgain: $("btn-again"),
    resultNote: $("result-note"),
  };

  // ---------- 状態 ----------
  let ws = null;
  let wsWanted = false;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let session = loadSession(); // { code, token, playerId }
  let room = null;
  let players = [];
  let me = null;
  let clockOffset = 0; // serverTime - Date.now()
  let lastSnapshot = null;

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (typeof s.code === "string" && typeof s.token === "string") return s;
    } catch { /* noop */ }
    return null;
  }

  function saveSession() {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  const serverNow = () => Date.now() + clockOffset;

  function showScreen(name) {
    for (const [key, el] of Object.entries(els.screens)) el.hidden = key !== name;
  }

  // ---------- WebSocket ----------

  function connect() {
    if (!session) return;
    wsWanted = true;
    clearTimeout(reconnectTimer);
    const url = new URL("/ws", location.origin);
    url.searchParams.set("code", session.code);
    url.searchParams.set("token", session.token);
    try { ws && ws.close(); } catch { /* noop */ }
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      els.connectionNote.hidden = true;
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "state") applyState(msg);
      else if (msg.type === "error") showError(msg.message);
    };
    ws.onclose = (ev) => {
      if (!wsWanted) return;
      if (ev.code === 4001) {
        // 無効なトークン → セッション破棄してトップへ
        session = null;
        saveSession();
        room = null;
        showScreen("top");
        showError("参加情報の有効期限が切れました。もう一度入室してください");
        return;
      }
      els.connectionNote.hidden = false;
      scheduleReconnect();
    };
    ws.onerror = () => { /* onclose が続く */ };
  }

  function scheduleReconnect() {
    reconnectAttempts += 1;
    if (reconnectAttempts > 30) {
      els.connectionNote.textContent = "⚠ 再接続に失敗しました。ページを再読み込みしてください";
      return;
    }
    const delay = Math.min(500 * reconnectAttempts, 3000);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delay);
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function showError(message) {
    if (!els.screens.top.hidden) {
      els.topError.textContent = message;
      els.topError.hidden = false;
      setTimeout(() => { els.topError.hidden = true; }, 6000);
    } else if (!els.screens.lobby.hidden) {
      els.lobbyError.textContent = message;
      els.lobbyError.hidden = false;
      setTimeout(() => { els.lobbyError.hidden = true; }, 6000);
    } else {
      els.buzzStatus.textContent = message;
    }
  }

  // ---------- 状態の適用 ----------

  function applyState(msg) {
    clockOffset = msg.serverTime - Date.now();
    lastSnapshot = msg;
    room = msg.room;
    players = msg.players;
    if (msg.you) {
      me = msg.you;
      if (session) { session.playerId = msg.you; saveSession(); }
    }
    els.connectionNote.hidden = ws && ws.readyState === WebSocket.OPEN;

    if (room.phase === "lobby") renderLobby();
    else if (room.phase === "question") renderQuiz();
    else renderResult();
  }

  // ---------- 描画 ----------

  const AVATARS = ["🦊", "🐱", "🐼", "🐧", "🐨", "🦁"];
  const avatarFor = (id) => AVATARS[(Number(id.replace("p", "")) - 1 + AVATARS.length) % AVATARS.length] ?? "🙂";
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? "?";

  function playerRow(p, extraBadge) {
    const li = document.createElement("li");
    li.className = "player-row" + (p.connected ? "" : " offline");
    const av = document.createElement("span");
    av.className = "avatar";
    av.textContent = avatarFor(p.id);
    const nm = document.createElement("span");
    nm.className = "name";
    nm.textContent = p.name + (p.id === me ? "（あなた）" : "");
    li.append(av, nm);
    if (p.host) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "ホスト";
      li.append(b);
    }
    if (extraBadge) {
      const b = document.createElement("span");
      b.className = "badge";
      b.style.background = "linear-gradient(135deg,#58a6ff,#7c66ff)";
      b.textContent = extraBadge;
      li.append(b);
    }
    if (!p.connected) {
      const m = document.createElement("span");
      m.className = "offline-mark";
      m.textContent = "オフライン";
      li.append(m);
    }
    return li;
  }

  function renderLobby() {
    showScreen("lobby");
    els.lobbyCode.textContent = room.code;
    els.lobbyCount.textContent = `(${players.length}/4人)`;
    els.lobbyPlayers.replaceChildren(...players.map((p) => playerRow(p, null)));
    const mine = players.find((p) => p.id === me);
    const isHost = !!mine?.host;
    els.btnStart.hidden = !isHost;
    els.btnStart.disabled = players.length < 2 || players.length > 4;
    els.lobbyWaitNote.textContent =
      players.length < 2
        ? isHost ? "あと1人参加すると開始できます" : "ホストが開始するのを待っています…"
        : isHost ? "準備ができたら開始！" : "ホストが開始するのを待っています…";
    els.lobbyYou.textContent = `あなたの名前: ${mine?.name ?? "?"}`;
  }

  function renderScoreboard() {
    els.scoreboard.replaceChildren(
      ...players.map((p) => {
        const chip = document.createElement("span");
        chip.className =
          "score-chip" +
          (p.id === me ? " me" : "") +
          (p.answering ? " answering" : "") +
          (p.lockedOut && !p.answering ? " locked" : "") +
          (p.connected ? "" : " offline");
        const nm = document.createElement("span");
        nm.className = "s-name";
        nm.textContent = p.name;
        const sc = document.createElement("span");
        sc.className = "s-score";
        sc.textContent = `${p.score}pt`;
        chip.append(nm, sc);
        return chip;
      })
    );
  }

  function setTimerBar(deadline, windowMs) {
    const remaining = Math.max(0, deadline - serverNow());
    const frac = Math.max(0, Math.min(1, remaining / windowMs));
    els.timerBar.style.width = `${frac * 100}%`;
    els.timerBar.classList.toggle("warning", frac < 0.35);
    return remaining;
  }

  function renderQuiz() {
    showScreen("quiz");
    renderScoreboard();
    els.quizProgress.textContent = `Q${room.questionIndex + 1} / ${room.questionCount}`;
    els.questionText.textContent = room.question?.text ?? "";
    els.banner.hidden = true;

    const sub = room.subPhase;

    // フェーズバッジと選択肢
    if (sub === "reveal") {
      els.quizPhaseBadge.textContent = "正解発表";
      els.quizPhaseBadge.classList.add("pill-accent");
      renderChoicesForReveal();
      renderBanner();
      els.btnBuzz.hidden = true;
      els.buzzStatus.textContent = "";
    } else if (sub === "answering") {
      els.quizPhaseBadge.textContent = "回答中";
      els.quizPhaseBadge.classList.add("pill-accent");
      renderChoicesForAnswering();
      els.btnBuzz.hidden = true;
      const a = nameOf(players.find((p) => p.answering)?.id ?? "");
      els.buzzStatus.textContent = players.find((p) => p.id === me)?.answering
        ? "あなたの回答です！選んでください"
        : `${a} さんが回答中…`;
    } else {
      els.quizPhaseBadge.textContent = "早押し！";
      els.quizPhaseBadge.classList.add("pill-accent");
      renderChoicesDim();
      els.btnBuzz.hidden = false;
      const mine = players.find((p) => p.id === me);
      const locked = !!mine?.lockedOut;
      els.btnBuzz.disabled = locked || !mine?.connected;
      els.btnBuzz.classList.toggle("ready", !els.btnBuzz.disabled);
      els.buzzStatus.textContent = locked
        ? "この問題はもう押せません"
        : mine?.connected ? "最初に押した人が回答権ゲット！" : "再接続中…";
    }
  }

  function choiceButton(i, label, cls, selectable) {
    const b = document.createElement("button");
    b.className = "choice" + (cls ? ` ${cls}` : "") + (selectable ? " selectable" : "");
    b.innerHTML = `<span class="choice-key">${"ABCD"[i]}</span>`;
    b.appendChild(document.createTextNode(label));
    if (selectable) b.addEventListener("click", () => send({ type: "answer", choice: i }));
    return b;
  }

  function renderChoicesDim() {
    els.choices.replaceChildren(
      ...(room.question?.choices ?? []).map((c, i) => choiceButton(i, c, "dim", false))
    );
  }

  function renderChoicesForAnswering() {
    const mine = players.find((p) => p.id === me)?.answering;
    els.choices.replaceChildren(
      ...(room.question?.choices ?? []).map((c, i) =>
        choiceButton(i, c, mine ? "" : "dim", !!mine)
      )
    );
  }

  function renderChoicesForReveal() {
    const correct = room.correctIndex;
    els.choices.replaceChildren(
      ...(room.question?.choices ?? []).map((c, i) => {
        const cls = i === correct ? "correct" : "dim";
        return choiceButton(i, c, cls, false);
      })
    );
  }

  function renderBanner() {
    const lr = room.lastResult;
    if (!lr) {
      els.banner.hidden = true;
      return;
    }
    els.banner.hidden = false;
    const who = nameOf(lr.playerId);
    if (lr.outcome === "correct") {
      els.banner.className = "banner good";
      els.banner.textContent = `🎉 ${who} さん 正解！ +10点`;
    } else if (lr.outcome === "timeout") {
      els.banner.className = "banner bad";
      els.banner.textContent = `⏰ ${who} さん 時間切れ -5点`;
    } else {
      els.banner.className = "banner bad";
      els.banner.textContent = `💨 ${who} さん はずれ -5点`;
    }
  }

  function renderResult() {
    showScreen("result");
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];
    els.resultList.replaceChildren(
      ...sorted.map((p, i) => {
        const li = document.createElement("li");
        li.className = "result-row" + (i === 0 ? " first" : "");
        li.innerHTML = `<span class="rank">${medals[i] ?? i + 1}</span>`;
        const nm = document.createElement("span");
        nm.className = "r-name";
        nm.textContent = p.name + (p.id === me ? "（あなた）" : "");
        const sc = document.createElement("span");
        sc.className = "r-score";
        sc.textContent = `${p.score}pt`;
        li.append(nm, sc);
        return li;
      })
    );
    const mine = players.find((p) => p.id === me);
    els.btnAgain.hidden = !mine?.host;
    els.resultNote.textContent = mine?.host
      ? "ホストは「もう一度遊ぶ」でロビーに戻れます"
      : "おつかれさまでした！";
  }

  // ---------- タイマー描画ループ ----------

  function tick() {
    if (room && room.phase === "question") {
      if (room.subPhase === "buzzing" && room.questionDeadline) {
        setTimerBar(room.questionDeadline, BUZZ_WINDOW_MS);
      } else if (room.subPhase === "answering" && room.answerDeadline) {
        const rem = setTimerBar(room.answerDeadline, ANSWER_WINDOW_MS);
        if (players.find((p) => p.id === me)?.answering) {
          els.buzzStatus.textContent = `残り ${(rem / 1000).toFixed(1)} 秒で選んで！`;
        }
      } else if (room.subPhase === "reveal" && room.revealEndsAt) {
        setTimerBar(room.revealEndsAt, 4000);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- イベント ----------

  els.btnCreate.addEventListener("click", async () => {
    const name = els.inputName.value.trim();
    if (!name) return showError("名前を入力してください");
    els.btnCreate.disabled = true;
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error ?? "部屋を作れませんでした");
      session = { code: data.code, token: data.token, playerId: null };
      saveSession();
      room = null;
      connect();
    } finally {
      els.btnCreate.disabled = false;
    }
  });

  els.btnJoin.addEventListener("click", async () => {
    const name = els.inputName.value.trim();
    const code = els.inputCode.value.trim().toUpperCase();
    if (!name) return showError("名前を入力してください");
    if (!/^[A-Z0-9]{4}$/.test(code)) return showError("部屋コードは4文字の英数字です");
    els.btnJoin.disabled = true;
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error ?? "参加できませんでした"); // 満員などの理由がそのまま出る
      session = { code: data.code, token: data.token, playerId: null };
      saveSession();
      room = null;
      connect();
    } finally {
      els.btnJoin.disabled = false;
    }
  });

  els.btnStart.addEventListener("click", () => send({ type: "start" }));
  els.btnAgain.addEventListener("click", () => send({ type: "restart" }));
  els.btnBuzz.addEventListener("click", () => send({ type: "buzz" }));
  els.btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(room?.code ?? "");
      els.btnCopy.textContent = "コピーしました";
      setTimeout(() => (els.btnCopy.textContent = "コピー"), 1500);
    } catch { /* noop */ }
  });
  els.inputCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.btnJoin.click();
  });
  els.inputName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") (els.inputCode.value ? els.btnJoin : els.btnCreate).click();
  });

  // 復帰: 保存済みセッションがあれば自動で同じプレイヤーとして再接続（失敗したらトップ画面のまま）
  if (session) {
    els.topError.textContent = "前回の部屋に再接続中…";
    els.topError.hidden = false;
    els.topError.classList.remove("error-text");
    els.topError.style.color = "var(--muted)";
    connect();
  }
})();
