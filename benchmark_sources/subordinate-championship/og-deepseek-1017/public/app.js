/* 早押しクイズ クライアント。描画に徹し、判定はすべてサーバーに任せる。 */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const els = {
    views: {
      home: $("#view-home"),
      room: $("#view-room"),
      game: $("#view-game"),
      result: $("#view-result"),
    },
    nameInput: $("#name-input"),
    codeInput: $("#code-input"),
    createBtn: $("#create-btn"),
    joinBtn: $("#join-btn"),
    homeError: $("#home-error"),
    roomCode: $("#room-code"),
    copyBtn: $("#copy-btn"),
    leaveBtn: $("#leave-btn"),
    leaveBtn2: $("#leave-btn-2"),
    playerList: $("#player-list"),
    playerCount: $("#player-count"),
    lobbyStatus: $("#lobby-status"),
    startBtn: $("#start-btn"),
    hostHint: $("#host-hint"),
    qIndex: $("#q-index"),
    qTotal: $("#q-total"),
    timerRing: $("#timer-ring"),
    timerNum: $("#timer-num"),
    scoreboard: $("#scoreboard"),
    phasePill: $("#phase-pill"),
    questionText: $("#question-text"),
    choices: $("#choices"),
    buzzBtn: $("#buzz-btn"),
    actionHint: $("#action-hint"),
    answerCountdown: $("#answer-countdown"),
    rankList: $("#rank-list"),
    againBtn: $("#again-btn"),
    againHint: $("#again-hint"),
    toast: $("#toast"),
  };

  const LETTERS = ["A", "B", "C", "D"];
  const STORE_PID = "bq.playerId";
  const STORE_ROOM = "bq.room";
  const STORE_NAME = "bq.name";

  /** @type {WebSocket|null} */
  let ws = null;
  let playerId = null;
  let roomCode = null;
  let myName = "";
  let state = null;
  let serverOffset = 0; // serverNow - Date.now()
  let reconnectTimer = null;
  let intentionalClose = false;
  let joined = false;

  // ---------------------------------------------------------------- utilities
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* ignore */
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function randomRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  function show(view) {
    for (const [key, el] of Object.entries(els.views)) el.classList.toggle("active", key === view);
  }

  let toastTimer = null;
  function toast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
      setTimeout(() => (els.toast.hidden = true), 300);
    }, 3200);
  }

  function homeError(message) {
    if (!message) {
      els.homeError.hidden = true;
      els.homeError.textContent = "";
      return;
    }
    els.homeError.hidden = false;
    els.homeError.textContent = message;
  }

  function serverNow() {
    return Date.now() + serverOffset;
  }

  function remainingMs(deadline) {
    if (deadline === null || deadline === undefined) return null;
    return Math.max(0, deadline - serverNow());
  }

  // ---------------------------------------------------------------- networking
  function connect(code, name, pid) {
    closeSocket();
    roomCode = code;
    myName = name;
    playerId = pid || null;
    joined = false;
    store.set(STORE_ROOM, code);
    store.set(STORE_NAME, name);
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/api/room/${encodeURIComponent(code)}/ws`;
    intentionalClose = false;
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      toast("接続に失敗しました");
      return;
    }
    ws = socket;
    socket.addEventListener("open", () => {
      const id = pid || store.get(STORE_PID) || uuid();
      socket.send(JSON.stringify({ t: "join", playerId: id, name }));
    });
    socket.addEventListener("message", (ev) => onMessage(String(ev.data)));
    socket.addEventListener("close", () => {
      if (intentionalClose || !roomCode) return;
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      /* close が続けて発火する */
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    toast("接続が切れました。再接続します…");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (roomCode) connect(roomCode, myName, playerId || store.get(STORE_PID));
    }, 900);
  }

  function closeSocket() {
    if (ws) {
      intentionalClose = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      ws = null;
    }
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function onMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.t === "welcome") {
      playerId = msg.playerId;
      store.set(STORE_PID, playerId);
      return;
    }
    if (msg.t === "state") {
      serverOffset = msg.serverNow - Date.now();
      state = msg.state;
      if (!playerId && state.hostId) playerId = null;
      joined = true;
      render();
      return;
    }
    if (msg.t === "error") {
      if (!joined) {
        // 入室失敗（満員・開始済みなど）
        toast(msg.message);
        homeError(msg.message);
        leave(true);
      } else {
        toast(msg.message);
      }
    }
  }

  // ---------------------------------------------------------------- lifecycle
  function leave(silent) {
    closeSocket();
    roomCode = null;
    state = null;
    joined = false;
    store.del(STORE_ROOM);
    if (!silent) store.del(STORE_PID);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    els.nameInput.value = myName || els.nameInput.value;
    els.codeInput.value = "";
    show("home");
  }

  function createRoom() {
    const name = readName();
    if (!name) return;
    homeError(null);
    const code = randomRoomCode();
    const pid = uuid();
    store.set(STORE_PID, pid);
    store.set(STORE_NAME, name);
    connect(code, name, pid);
  }

  function joinRoom() {
    const name = readName();
    if (!name) return;
    const code = els.codeInput.value.trim().toUpperCase();
    if (!/^[A-Za-z0-9]{2,16}$/.test(code)) {
      homeError("部屋コードを正しく入力してください。");
      return;
    }
    homeError(null);
    const pid = store.get(STORE_PID) || uuid();
    store.set(STORE_PID, pid);
    store.set(STORE_NAME, name);
    connect(code, name, pid);
  }

  function readName() {
    const name = els.nameInput.value.trim();
    if (!name) {
      homeError("ニックネームを入力してください。");
      els.nameInput.focus();
      return "";
    }
    return name.slice(0, 16);
  }

  // ---------------------------------------------------------------- rendering
  function render() {
    if (!state) return;
    const phase = state.phase;
    if (phase === "lobby") {
      show("room");
      renderLobby();
    } else if (phase === "finished") {
      show("result");
      renderResult();
    } else {
      show("game");
      renderGame();
    }
  }

  function me() {
    return state ? state.players.find((p) => p.id === playerId) : null;
  }

  function renderLobby() {
    els.roomCode.textContent = state.code;
    const players = state.players;
    els.playerCount.textContent = `${players.length} / 4`;
    els.playerList.innerHTML = "";
    const slots = Math.max(4, players.length);
    for (let i = 0; i < slots; i++) {
      const li = document.createElement("li");
      const p = players[i];
      li.className = "player-slot" + (p ? " filled" : "");
      if (p) {
        const isHost = p.id === state.hostId;
        const isYou = p.id === playerId;
        li.innerHTML =
          `<span class="avatar">${escapeHtml(initial(p.name))}</span>` +
          `<span class="slot-name">${escapeHtml(p.name)}</span>` +
          (isHost ? '<span class="badge host">ホスト</span>' : "") +
          (isYou ? '<span class="badge you">あなた</span>' : "");
      } else {
        li.innerHTML = '<span class="avatar empty">＋</span><span class="slot-name muted">空き</span>';
      }
      els.playerList.appendChild(li);
    }
    const isHost = state.hostId === playerId;
    const enough = players.length >= 2;
    els.startBtn.disabled = !(isHost && enough);
    els.startBtn.hidden = !isHost;
    if (isHost) {
      els.lobbyStatus.textContent = enough
        ? "準備OK！「ゲーム開始」を押してください。"
        : "あと1人以上でスタートできます。友だちに部屋コードを共有しよう。";
      els.hostHint.textContent = "";
    } else {
      els.lobbyStatus.textContent = "ホストがゲームを開始するのを待っています…";
      els.hostHint.textContent = "あなたは参加者です。";
    }
  }

  function renderGame() {
    const q = state.questionIndex + 1;
    els.qIndex.textContent = String(q);
    els.qTotal.textContent = String(state.totalQuestions);
    renderScoreboard();

    const question =
      state.question || (state.phase === "reveal" ? lastQuestionCache : null) || null;
    // サーバーは問題文を state.question に含める
    if (state.question) {
      els.questionText.textContent = state.question.text;
      lastQuestionCache = state.question;
    }
    renderChoices(state.question || lastQuestionCache);

    const phase = state.phase;
    if (phase === "question") {
      els.phasePill.textContent = "早押し受付中！";
      els.phasePill.className = "phase-pill live";
    } else if (phase === "answering") {
      const p = state.players.find((x) => x.id === state.answeringPlayerId);
      const isMe = state.answeringPlayerId === playerId;
      els.phasePill.textContent = isMe ? "あなたが回答中！" : `${p ? p.name : "だれか"}さんが回答中…`;
      els.phasePill.className = "phase-pill answer" + (isMe ? " me" : "");
    } else if (phase === "reveal") {
      els.phasePill.textContent = "正解は…";
      els.phasePill.className = "phase-pill reveal";
    }

    const meNow = me();
    const myLocked = meNow ? meNow.lockedOut : false;
    const canBuzz = phase === "question" && !!meNow && !myLocked;
    els.buzzBtn.hidden = !canBuzz;
    els.buzzBtn.disabled = myLocked;

    // 回答ボタンの有効/無効とヒント
    const answeringMe = phase === "answering" && state.answeringPlayerId === playerId;
    for (let i = 0; i < 4; i++) {
      const btn = els.choices.querySelector(`[data-choice="${i}"]`);
      if (!btn) continue;
      btn.disabled = !answeringMe;
      btn.classList.toggle("clickable", answeringMe);
    }

    if (phase === "question") {
      if (myLocked) els.actionHint.textContent = "この問題ではもう押せません。他の人の早押しを待っています…";
      else els.actionHint.textContent = "わかったら「押す！」をタップ！";
    } else if (answeringMe) {
      els.actionHint.textContent = "10秒以内に答えを選んでください。";
    } else if (phase === "answering") {
      els.actionHint.textContent = "回答権を持っている人が答えています。";
    } else if (phase === "reveal") {
      els.actionHint.textContent = "";
    }

    els.answerCountdown.hidden = phase !== "answering";
    renderTimer();
  }

  function renderScoreboard() {
    els.scoreboard.innerHTML = "";
    for (const p of state.players) {
      const li = document.createElement("li");
      li.className = "score-chip";
      if (p.id === state.answeringPlayerId) li.classList.add("answering");
      if (p.lockedOut) li.classList.add("locked");
      if (!p.connected) li.classList.add("offline");
      li.innerHTML =
        `<span class="sc-name">${escapeHtml(p.name)}${p.id === playerId ? "（あなた）" : ""}</span>` +
        `<span class="sc-score ">${p.score}<small>点</small></span>` +
        (p.id === state.answeringPlayerId ? '<span class="sc-state">回答中</span>' : "") +
        (p.lockedOut ? '<span class="sc-state muted">×</span>' : "") +
        (!p.connected ? '<span class="sc-state muted">オフライン</span>' : "");
      els.scoreboard.appendChild(li);
    }
  }

  let lastQuestionCache = null;

  function renderChoices(question) {
    if (!question) {
      els.choices.innerHTML = "";
      return;
    }
    if (els.choices.dataset.qid !== String(state.questionIndex)) {
      els.choices.dataset.qid = String(state.questionIndex);
      els.choices.innerHTML = "";
      question.choices.forEach((text, i) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.dataset.choice = String(i);
        btn.dataset.testid = "choice-" + i;
        btn.innerHTML = `<span class="choice-letter">${LETTERS[i]}</span><span class="choice-text">${escapeHtml(text)}</span>`;
        btn.addEventListener("click", () => {
          if (state && state.phase === "answering" && state.answeringPlayerId === playerId) {
            send({ t: "answer", choice: i });
          }
        });
        els.choices.appendChild(btn);
      });
    }
    // 状態に応じた見た目
    const reveal = state.phase === "reveal";
    const revealIndex = state.correctChoice;
    const my = me();
    for (let i = 0; i < 4; i++) {
      const btn = els.choices.querySelector(`[data-choice="${i}"]`);
      if (!btn) continue;
      btn.classList.remove("correct", "wrong", "picked");
      if (reveal) {
        if (i === revealIndex) btn.classList.add("correct");
        if (my && my.choice === i && i !== revealIndex) btn.classList.add("wrong");
      } else if (my && my.choice === i) {
        btn.classList.add("picked");
      }
    }
  }

  function renderResult() {
    els.rankList.innerHTML = "";
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    ranked.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "rank-row" + (i === 0 ? " first" : "");
      const medal = ["🥇", "🥈", "🥉", "4️⃣"][i] || `${i + 1}`;
      li.innerHTML =
        `<span class="rank-medal">${medal}</span>` +
        `<span class="rank-name">${escapeHtml(p.name)}${p.id === playerId ? "（あなた）" : ""}</span>` +
        `<span class="rank-score">${p.score}<small>点</small></span>`;
      els.rankList.appendChild(li);
    });
    const isHost = state.hostId === playerId;
    els.againBtn.hidden = !isHost;
    els.againHint.textContent = isHost ? "" : "ホストがもう一度始めるまで待ちましょう。";
  }

  // ---------------------------------------------------------------- timer
  function renderTimer() {
    const phase = state ? state.phase : "lobby";
    let deadline = null;
    let total = 1;
    if (phase === "question") {
      deadline = state.buzzDeadline;
      total = 20000;
    } else if (phase === "answering") {
      deadline = state.answerDeadline;
      total = 10000;
    } else if (phase === "reveal") {
      deadline = state.revealDeadline;
      total = 4000;
    }
    if (deadline === null) {
      els.timerRing.style.setProperty("--progress", "0deg");
      els.timerNum.textContent = "--";
      return;
    }
    const remain = remainingMs(deadline);
    const secs = Math.ceil(remain / 1000);
    els.timerNum.textContent = String(secs);
    const ratio = Math.max(0, Math.min(1, remain / total));
    const deg = ratio * 360;
    els.timerRing.style.setProperty("--progress", `${deg}deg`);
    els.timerRing.classList.toggle("urgent", remain <= 3000);

    if (phase === "answering") {
      const who = state.players.find((p) => p.id === state.answeringPlayerId);
      const mine = state.answeringPlayerId === playerId;
      els.answerCountdown.textContent = `${mine ? "あなた" : who ? who.name : "回答者"}の残り ${secs} 秒`;
    }
  }

  function tick() {
    if (state && (state.phase === "question" || state.phase === "answering" || state.phase === "reveal")) {
      renderTimer();
    }
    if (ws && ws.readyState === WebSocket.OPEN) send({ t: "ping" });
  }

  // ---------------------------------------------------------------- helpers
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function initial(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  // ---------------------------------------------------------------- events
  els.createBtn.addEventListener("click", createRoom);
  els.joinBtn.addEventListener("click", joinRoom);
  els.nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createRoom();
  });
  els.codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinRoom();
  });
  els.startBtn.addEventListener("click", () => send({ t: "start" }));
  els.buzzBtn.addEventListener("click", () => send({ t: "buzz" }));
  els.againBtn.addEventListener("click", () => send({ t: "again" }));
  els.copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state ? state.code : "");
      toast("部屋コードをコピーしました");
    } catch {
      toast("コピーできませんでした");
    }
  });
  els.leaveBtn.addEventListener("click", () => leave(false));
  els.leaveBtn2.addEventListener("click", () => leave(false));

  // キーボードショートカット: スペースで早押し
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state && state.phase === "question" && !els.buzzBtn.hidden) {
      e.preventDefault();
      send({ t: "buzz" });
    }
  });

  // ---------------------------------------------------------------- boot
  setInterval(tick, 250);

  (function boot() {
    const savedName = store.get(STORE_NAME);
    if (savedName) els.nameInput.value = savedName;
    const savedRoom = store.get(STORE_ROOM);
    const savedPid = store.get(STORE_PID);
    if (savedRoom && savedName) {
      // リロードからの復帰: 同じ playerId で自動再接続する
      toast("前回の部屋に再接続しています…");
      connect(savedRoom.toUpperCase(), savedName, savedPid || undefined);
    } else {
      show("home");
    }
  })();
})();
