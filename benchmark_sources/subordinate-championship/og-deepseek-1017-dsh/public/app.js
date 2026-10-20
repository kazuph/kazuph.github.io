/**
 * 早押しクイズ・アリーナ クライアント
 *
 * 役割:
 *  - サーバー (Durable Object) と WebSocket でつながり、`state` をそのまま描画する。
 *  - 点数・正誤・回答権・残り時間は一切自分で決めない（サーバー権威）。
 *  - 再読み込みしても localStorage のトークンで同じプレイヤーとして復帰する。
 */
(() => {
  "use strict";

  const LS_NAME = "buzzer.name";
  const tokenKey = (code) => `buzzer.token.${code}`;
  const $ = (id) => document.getElementById(id);

  const ui = {
    connBanner: $("conn-banner"),
    connBannerText: $("conn-banner-text"),

    home: $("screen-home"),
    lobby: $("screen-lobby"),
    game: $("screen-game"),
    final: $("screen-final"),

    inputName: $("input-name"),
    inputCode: $("input-code"),
    tabCreate: $("tab-create"),
    tabJoin: $("tab-join"),
    panelCreate: $("panel-create"),
    panelJoin: $("panel-join"),
    btnCreate: $("btn-create"),
    btnJoin: $("btn-join"),
    homeError: $("home-error"),

    lobbyCode: $("lobby-code"),
    lobbyCount: $("lobby-count"),
    lobbyNote: $("lobby-note"),
    lobbyPlayers: $("lobby-players"),
    lobbyHostNote: $("lobby-host-note"),
    btnCopy: $("btn-copy"),
    btnStart: $("btn-start"),
    btnLeave: $("btn-leave"),

    gameCode: $("game-code"),
    gameProgress: $("game-progress"),
    gameCategory: $("game-category"),
    timer: $("timer"),
    timerProgress: $("timer-progress"),
    timerSeconds: $("timer-seconds"),
    questionText: $("question-text"),
    choices: $("choices"),
    buzzZone: $("buzz-zone"),
    btnBuzz: $("btn-buzz"),
    buzzStatus: $("buzz-status"),
    scoreboard: $("scoreboard"),
    btnSound: $("btn-sound"),

    finalSub: $("final-sub"),
    finalRanking: $("final-ranking"),
    btnAgain: $("btn-again"),
    btnFinalLeave: $("btn-final-leave"),

    toasts: $("toasts"),
  };

  const app = {
    name: localStorage.getItem(LS_NAME) || "",
    code: null,
    token: null,
    playerId: null,
    ws: null,
    state: null,
    joined: false,
    intentionalClose: false,
    reconnectTimer: null,
    reconnectAttempt: 0,
    clockOffset: 0,
    timerEndsAt: null,
    timerTotal: 0,
    timerKind: null,
    lastQuestionId: null,
    lastRenderedQuestionId: null,
    choiceButtons: [],
    answeredThisQuestion: false,
    soundOn: true,
    audioCtx: null,
    mode: "create",
  };

  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 19;

  /* ------------------------------- screens -------------------------------- */

  function showScreen(name) {
    ui.home.hidden = name !== "home";
    ui.lobby.hidden = name !== "lobby";
    ui.game.hidden = name !== "game";
    ui.final.hidden = name !== "final";
    document.body.dataset.screen = name;
  }

  function showHomeError(message) {
    if (!message) {
      ui.homeError.hidden = true;
      ui.homeError.textContent = "";
      return;
    }
    ui.homeError.hidden = false;
    ui.homeError.textContent = message;
  }

  function setConnBanner(visible, text) {
    ui.connBanner.hidden = !visible;
    if (text) ui.connBannerText.textContent = text;
  }

  let toastSeq = 0;
  function toast(text, kind = "info") {
    const node = document.createElement("div");
    node.className = `toast toast-${kind}`;
    node.dataset.testid = "toast";
    node.dataset.seq = String(++toastSeq);
    node.textContent = text;
    ui.toasts.appendChild(node);
    setTimeout(() => {
      node.classList.add("is-out");
      setTimeout(() => node.remove(), 320);
    }, 1900);
  }

  /* --------------------------------- sound -------------------------------- */

  function ensureAudio() {
    if (!app.soundOn) return null;
    if (!app.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      app.audioCtx = new Ctx();
    }
    if (app.audioCtx.state === "suspended") void app.audioCtx.resume();
    return app.audioCtx;
  }

  function beep(freq, duration = 0.12, type = "sine", volume = 0.06) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  const sfx = {
    buzz: () => beep(880, 0.1, "square", 0.05),
    correct: () => {
      beep(660, 0.1, "sine", 0.07);
      setTimeout(() => beep(990, 0.18, "sine", 0.07), 90);
    },
    wrong: () => {
      beep(220, 0.22, "sawtooth", 0.05);
    },
    tick: () => beep(1400, 0.05, "triangle", 0.03),
  };

  /* ------------------------------ websocket -------------------------------- */

  function wsUrl(code) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/ws/${encodeURIComponent(code)}`;
  }

  function send(message) {
    if (!app.ws || app.ws.readyState !== WebSocket.OPEN) return false;
    app.ws.send(JSON.stringify(message));
    return true;
  }

  function connect(code, name, token) {
    app.code = code;
    app.name = name;
    if (token) app.token = token;
    app.intentionalClose = false;
    clearTimeout(app.reconnectTimer);
    setConnBanner(app.reconnectAttempt > 0, "再接続しています…");

    let ws;
    try {
      ws = new WebSocket(wsUrl(code));
    } catch (err) {
      scheduleReconnect();
      return;
    }
    app.ws = ws;

    ws.addEventListener("open", () => {
      app.reconnectAttempt = 0;
      setConnBanner(false);
      send({ t: "join", name: app.name, token: app.token || null });
    });

    ws.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(msg);
    });

    ws.addEventListener("close", () => {
      app.ws = null;
      if (app.intentionalClose) return;
      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      // close イベントで後始末する
    });
  }

  function scheduleReconnect() {
    if (app.intentionalClose || !app.code) return;
    app.reconnectAttempt += 1;
    const delay = Math.min(400 * app.reconnectAttempt, 2500);
    setConnBanner(true, `接続が切れました。再接続中… (${app.reconnectAttempt}回目)`);
    clearTimeout(app.reconnectTimer);
    app.reconnectTimer = setTimeout(() => {
      if (!app.intentionalClose && app.code) connect(app.code, app.name, app.token);
    }, delay);
  }

  function disconnect(intentional = true) {
    app.intentionalClose = intentional;
    clearTimeout(app.reconnectTimer);
    if (app.ws) {
      try {
        app.ws.close(1000, "client");
      } catch {
        /* ignore */
      }
      app.ws = null;
    }
    setConnBanner(false);
  }

  function leaveToHome(message) {
    disconnect(true);
    app.joined = false;
    app.state = null;
    app.playerId = null;
    app.code = null;
    app.token = null;
    app.answeredThisQuestion = false;
    app.lastQuestionId = null;
    app.timerEndsAt = null;
    if (location.search) history.replaceState(null, "", location.pathname);
    showScreen("home");
    showHomeError(message || "");
  }

  /* --------------------------- message handling ---------------------------- */

  function handleMessage(msg) {
    switch (msg.t) {
      case "joined":
        app.joined = true;
        app.playerId = msg.playerId;
        app.token = msg.token;
        if (app.code) localStorage.setItem(tokenKey(app.code), msg.token);
        localStorage.setItem(LS_NAME, app.name);
        showHomeError("");
        applyState(msg.state);
        break;
      case "state":
        applyState(msg.state);
        break;
      case "feedback":
        handleFeedback(msg);
        break;
      case "error":
        handleError(msg);
        break;
      case "pong":
        break;
      default:
        break;
    }
  }

  function handleError(msg) {
    const fatal = ["ROOM_FULL", "ROOM_NOT_FOUND", "GAME_IN_PROGRESS", "BAD_NAME"];
    if (fatal.includes(msg.code)) {
      if (app.code) localStorage.removeItem(tokenKey(app.code));
      leaveToHome(msg.message);
      toast(msg.message, "wrong");
      return;
    }
    toast(msg.message || "エラーが発生しました", "wrong");
  }

  function handleFeedback(msg) {
    switch (msg.kind) {
      case "buzz":
        toast("回答権を獲得！", "buzz");
        sfx.buzz();
        break;
      case "correct":
        toast(`正解！ ${msg.delta > 0 ? "+" : ""}${msg.delta}点`, "correct");
        sfx.correct();
        break;
      case "wrong":
        toast(`不正解… ${msg.delta}点`, "wrong");
        sfx.wrong();
        break;
      case "locked":
        toast(msg.text || "押せませんでした", "info");
        break;
      default:
        if (msg.text) toast(msg.text, "info");
    }
  }

  /* --------------------------------- render -------------------------------- */

  function applyState(state) {
    app.state = state;
    app.code = state.code;
    app.clockOffset = Date.now() - state.serverNow;
    if (state.timer.deadline !== null) {
      app.timerEndsAt = state.timer.deadline + app.clockOffset;
      app.timerTotal = state.timer.totalMs;
      app.timerKind = state.timer.kind;
    } else {
      app.timerEndsAt = null;
      app.timerKind = null;
    }
    if (state.question && state.question.id !== app.lastQuestionId) {
      app.lastQuestionId = state.question.id;
      app.answeredThisQuestion = false;
    }

    if (!app.joined) {
      showScreen("home");
      return;
    }

    document.body.dataset.phase = state.phase;
    document.body.dataset.answerer = state.answererId || "";
    document.body.dataset.question = String(state.questionIndex);
    document.body.dataset.me = app.playerId || "";

    if (state.phase === "lobby") {
      renderLobby(state);
      showScreen("lobby");
    } else if (state.phase === "final") {
      renderFinal(state);
      showScreen("final");
      app.timerEndsAt = null;
    } else {
      renderGame(state);
      showScreen("game");
    }
  }

  function me() {
    return app.state ? app.state.players.find((p) => p.id === app.playerId) : null;
  }

  function isHost() {
    return app.state && app.state.actingHostId === app.playerId;
  }

  const AVATAR_GRADIENTS = [
    "linear-gradient(140deg,#6366f1,#22d3ee)",
    "linear-gradient(140deg,#f472b6,#8b5cf6)",
    "linear-gradient(140deg,#34d399,#0ea5e9)",
    "linear-gradient(140deg,#fbbf24,#f97316)",
  ];

  function avatarStyle(index) {
    return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  }

  function initial(name) {
    return (name || "?").trim().slice(0, 1) || "?";
  }

  function renderLobby(state) {
    ui.lobbyCode.textContent = state.code;
    ui.lobbyCount.textContent = `${state.players.length} / ${state.capacity} 人`;
    const connected = state.players.filter((p) => p.connected).length;
    if (state.players.length < state.minPlayers) {
      ui.lobbyNote.textContent = `あと${state.minPlayers - state.players.length}人で開始できます`;
    } else {
      ui.lobbyNote.textContent = `${connected}人が接続中。開始できます！`;
    }

    ui.lobbyPlayers.textContent = "";
    for (let i = 0; i < state.capacity; i++) {
      const p = state.players[i];
      const li = document.createElement("li");
      li.className = "player-slot";
      li.dataset.testid = "lobby-slot";
      if (!p) {
        li.classList.add("is-empty");
        li.textContent = "空きスロット";
      } else {
        if (p.id === app.playerId) li.classList.add("is-me");
        li.dataset.playerId = p.id;
        li.dataset.connected = String(p.connected);

        const av = document.createElement("span");
        av.className = "avatar";
        av.style.background = avatarStyle(i);
        av.textContent = initial(p.name);

        const body = document.createElement("div");
        body.className = "slot-body";
        const name = document.createElement("span");
        name.className = "slot-name";
        name.textContent = p.name + (p.id === app.playerId ? "（あなた）" : "");
        const meta = document.createElement("span");
        meta.className = "slot-meta";
        const dot = document.createElement("span");
        dot.className = "presence" + (p.connected ? "" : " is-off");
        meta.appendChild(dot);
        meta.appendChild(document.createTextNode(p.connected ? "接続中" : "切断中"));
        if (p.isHost) {
          const badge = document.createElement("span");
          badge.className = "badge";
          badge.textContent = "ホスト";
          meta.appendChild(badge);
        }
        body.appendChild(name);
        body.appendChild(meta);
        li.appendChild(av);
        li.appendChild(body);
      }
      ui.lobbyPlayers.appendChild(li);
    }

    const host = isHost();
    const canStart = state.canStart && host;
    ui.btnStart.hidden = !host;
    ui.btnStart.disabled = !canStart;
    ui.btnStart.textContent =
      state.players.length < state.minPlayers
        ? `あと${state.minPlayers - state.players.length}人で開始`
        : "ゲーム開始";
    ui.lobbyHostNote.hidden = host;
    ui.lobbyHostNote.textContent = "ホストの開始を待っています…";
  }

  function renderGame(state) {
    ui.gameCode.textContent = state.code;
    ui.gameProgress.textContent = `第 ${Math.min(state.questionIndex + 1, state.questionTotal)} / ${state.questionTotal} 問`;
    ui.gameCategory.textContent = state.question ? state.question.category : "";

    ui.questionText.textContent = state.question ? state.question.text : "問題を準備しています…";

    renderChoices(state);
    renderBuzz(state);
    renderScoreboard(state, false);
  }

  function renderChoices(state) {
    const q = state.question;
    if (!q) {
      ui.choices.textContent = "";
      app.choiceButtons = [];
      return;
    }
    if (app.choiceButtons.length !== 4 || app.lastRenderedQuestionId !== q.id) {
      ui.choices.textContent = "";
      app.choiceButtons = [];
      const keys = ["A", "B", "C", "D"];
      q.choices.forEach((text, index) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice";
        btn.dataset.index = String(index);
        btn.dataset.testid = "choice";
        const key = document.createElement("span");
        key.className = "choice-key";
        key.textContent = keys[index];
        const label = document.createElement("span");
        label.className = "choice-text";
        label.textContent = text;
        btn.appendChild(key);
        btn.appendChild(label);
        btn.addEventListener("click", () => onChoiceClick(index));
        li.appendChild(btn);
        ui.choices.appendChild(li);
        app.choiceButtons.push(btn);
      });
      app.lastRenderedQuestionId = q.id;
    }

    const myTurn = state.phase === "question" && state.answererId === app.playerId;
    const reveal = state.reveal;
    const myPick = reveal ? reveal.answers.find((a) => a.playerId === app.playerId) : null;
    const mePlayer = me();
    const locked = mePlayer ? mePlayer.locked : false;

    app.choiceButtons.forEach((btn, index) => {
      btn.classList.remove("is-clickable", "is-picked", "is-correct", "is-wrong", "is-dim", "is-locked");
      btn.disabled = !myTurn || app.answeredThisQuestion;
      if (myTurn) {
        btn.classList.add("is-clickable");
      } else if (state.phase === "question") {
        btn.classList.add("is-dim");
        if (locked && state.answererId !== app.playerId) btn.classList.add("is-locked");
      }

      if (reveal) {
        if (index === reveal.correct) btn.classList.add("is-correct");
        if (myPick && myPick.choice === index && !myPick.correct) btn.classList.add("is-wrong");
      }
      if (myPick && myPick.choice === index) btn.classList.add("is-picked");
    });
  }

  function onChoiceClick(index) {
    const state = app.state;
    if (!state || state.phase !== "question") return;
    if (state.answererId !== app.playerId) return;
    if (app.answeredThisQuestion) return;
    app.answeredThisQuestion = true;
    send({ t: "answer", choice: index });
    send({ t: "ping" });
  }

  function renderBuzz(state) {
    const mePlayer = me();
    const remaining = app.timerEndsAt ? app.timerEndsAt - Date.now() : 0;
    const locked = mePlayer ? mePlayer.locked : false;
    const answering = state.answererId !== null;
    const isMeAnswering = state.answererId === app.playerId;
    const answerer = state.players.find((p) => p.id === state.answererId);

    let armed = false;
    let status = "";
    let statusActive = false;

    if (state.phase === "reveal") {
      status = "正解を発表！ つぎの問題へ…";
    } else if (state.phase !== "question") {
      status = "問題が出るまで待機中";
    } else if (isMeAnswering) {
      status = "あなたが回答中！ 10秒以内に選んでください";
      statusActive = true;
    } else if (answering && answerer) {
      status = `${answerer.name} さんが回答中…`;
    } else if (locked) {
      status = "この問題ではもう押せません";
    } else if (remaining <= 0) {
      status = "時間切れ！";
    } else {
      armed = true;
      status = "早押しチャンス！ 一番早く押した人が回答権を得ます";
      statusActive = true;
    }

    ui.btnBuzz.disabled = !armed;
    ui.btnBuzz.classList.toggle("is-armed", armed);
    ui.btnBuzz.classList.toggle("is-lost", !armed && state.phase === "question");
    ui.btnBuzz.querySelector(".buzz-label").textContent = armed ? "早押し！" : isMeAnswering ? "回答中" : "待機";
    ui.buzzStatus.textContent = status;
    ui.buzzStatus.classList.toggle("is-active", statusActive);
  }

  function renderScoreboard(state, isFinal) {
    ui.scoreboard.textContent = "";
    const sorted = state.players.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    sorted.forEach((p, index) => {
      const li = document.createElement("li");
      li.className = "score-row";
      li.dataset.testid = "score-row";
      li.dataset.playerId = p.id;
      li.dataset.name = p.name;
      li.dataset.score = String(p.score);
      if (p.id === app.playerId) li.classList.add("is-me");
      if (p.isAnswerer) li.classList.add("is-answerer");
      if (p.locked && state.phase === "question") li.classList.add("is-locked");
      if (!p.connected) li.classList.add("is-offline");

      const rank = document.createElement("span");
      rank.className = "score-rank";
      rank.textContent = String(index + 1);

      const name = document.createElement("span");
      name.className = "score-name";
      name.textContent = p.name + (p.id === app.playerId ? "（あなた）" : "");

      const tags = document.createElement("span");
      tags.className = "score-tags";
      if (p.isAnswerer) tags.textContent = "回答中";
      else if (p.locked) tags.textContent = "解答済み";
      else if (!p.connected) tags.textContent = "切断中";

      const value = document.createElement("span");
      value.className = "score-value";
      value.textContent = `${p.score}`;

      li.appendChild(rank);
      li.appendChild(name);
      if (tags.textContent) li.appendChild(tags);
      li.appendChild(value);
      ui.scoreboard.appendChild(li);
    });
    if (isFinal) ui.scoreboard.hidden = true;
    else ui.scoreboard.hidden = false;
  }

  function renderFinal(state) {
    const results = state.results || [];
    ui.finalSub.textContent = `全${state.questionTotal}問おつかれさまでした！`;
    ui.finalRanking.textContent = "";
    const sorted = results.slice().sort((a, b) => a.rank - b.rank);
    sorted.forEach((r, index) => {
      const li = document.createElement("li");
      li.className = `rank-row rank-${r.rank}`;
      li.dataset.testid = "rank-row";
      li.dataset.playerId = r.playerId;
      li.dataset.rank = String(r.rank);
      li.dataset.score = String(r.score);
      if (r.playerId === app.playerId) li.classList.add("is-me");

      const num = document.createElement("span");
      num.className = "rank-number";
      num.textContent = `${r.rank}`;

      const body = document.createElement("div");
      body.style.flex = "1";
      body.style.minWidth = "0";
      const name = document.createElement("div");
      name.className = "rank-name";
      const medals = ["🥇", "🥈", "🥉"];
      const prefix = r.rank <= 3 ? `${medals[r.rank - 1]} ` : "";
      name.textContent = prefix + r.name + (r.playerId === app.playerId ? "（あなた）" : "");
      const meta = document.createElement("div");
      meta.className = "rank-meta";
      meta.textContent = `正解 ${r.correctCount} 問`;
      body.appendChild(name);
      body.appendChild(meta);

      const score = document.createElement("span");
      score.className = "rank-score";
      score.textContent = `${r.score}`;
      score.dataset.testid = "rank-score";

      li.appendChild(num);
      li.appendChild(body);
      li.appendChild(score);
      li.style.animationDelay = `${index * 70}ms`;
      ui.finalRanking.appendChild(li);
    });

    ui.btnAgain.hidden = !isHost();
    ui.btnAgain.disabled = state.players.filter((p) => p.connected).length < state.minPlayers;
  }

  /* ------------------------------- timer loop ------------------------------ */

  let lastTickSecond = null;
  function tick() {
    const remaining = app.timerEndsAt ? Math.max(0, app.timerEndsAt - Date.now()) : 0;
    const total = app.timerTotal || 1;
    const ratio = app.timerEndsAt ? Math.max(0, Math.min(1, remaining / total)) : 0;
    ui.timerProgress.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - ratio));
    const seconds = Math.ceil(remaining / 1000);
    ui.timerSeconds.textContent = app.timerEndsAt ? String(seconds) : "--";
    ui.timer.classList.toggle("is-urgent", app.timerEndsAt !== null && remaining <= 5000 && remaining > 0);
    ui.timer.classList.toggle("is-answer", app.timerKind === "answer");

    if (app.timerEndsAt && seconds !== lastTickSecond && seconds <= 3 && seconds > 0) {
      lastTickSecond = seconds;
      if (app.soundOn) sfx.tick();
    }
    if (!app.timerEndsAt) lastTickSecond = null;

    // 残り時間が0になったら早押しボタンを即座に無効化（サーバーの発表を待つ）
    if (app.state && app.state.phase === "question" && app.timerEndsAt && remaining <= 0) {
      if (!ui.btnBuzz.disabled) {
        ui.btnBuzz.disabled = true;
        ui.btnBuzz.classList.remove("is-armed");
        ui.buzzStatus.textContent = "時間切れ！";
      }
    }
    requestAnimationFrame(tick);
  }

  /* --------------------------------- events -------------------------------- */

  function setMode(mode) {
    app.mode = mode;
    const create = mode === "create";
    ui.tabCreate.classList.toggle("is-active", create);
    ui.tabJoin.classList.toggle("is-active", !create);
    ui.tabCreate.setAttribute("aria-selected", String(create));
    ui.tabJoin.setAttribute("aria-selected", String(!create));
    ui.panelCreate.hidden = !create;
    ui.panelJoin.hidden = create;
    showHomeError("");
  }

  async function createRoom() {
    const name = ui.inputName.value.trim();
    if (!name) {
      showHomeError("名前を入力してください。");
      ui.inputName.focus();
      return;
    }
    showHomeError("");
    ui.btnCreate.disabled = true;
    ui.btnCreate.textContent = "作成中…";
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const code = String(data.code || "").toUpperCase();
      if (!code) throw new Error("no code");
      localStorage.setItem(LS_NAME, name);
      history.replaceState(null, "", `?room=${code}`);
      app.token = null;
      app.joined = false;
      showScreen("lobby");
      ui.lobbyCode.textContent = code;
      ui.lobbyPlayers.textContent = "";
      connect(code, name, null);
    } catch (err) {
      showHomeError("部屋を作成できませんでした。サーバーが起動しているか確認してください。");
    } finally {
      ui.btnCreate.disabled = false;
      ui.btnCreate.textContent = "部屋を作る";
    }
  }

  function joinRoom() {
    const name = ui.inputName.value.trim();
    const code = ui.inputCode.value.trim().toUpperCase();
    if (!name) {
      showHomeError("名前を入力してください。");
      ui.inputName.focus();
      return;
    }
    if (!code) {
      showHomeError("部屋コードを入力してください。");
      ui.inputCode.focus();
      return;
    }
    showHomeError("");
    localStorage.setItem(LS_NAME, name);
    history.replaceState(null, "", `?room=${code}`);
    app.token = localStorage.getItem(tokenKey(code)) || null;
    app.joined = false;
    showScreen("lobby");
    ui.lobbyCode.textContent = code;
    ui.lobbyPlayers.textContent = "";
    connect(code, name, app.token);
  }

  function bindEvents() {
    ui.tabCreate.addEventListener("click", () => setMode("create"));
    ui.tabJoin.addEventListener("click", () => setMode("join"));
    ui.btnCreate.addEventListener("click", createRoom);
    ui.btnJoin.addEventListener("click", joinRoom);

    ui.inputCode.addEventListener("input", () => {
      ui.inputCode.value = ui.inputCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    });
    ui.inputName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") (app.mode === "create" ? createRoom() : joinRoom());
    });
    ui.inputCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinRoom();
    });

    ui.btnCopy.addEventListener("click", async () => {
      const code = app.state ? app.state.code : ui.lobbyCode.textContent;
      try {
        await navigator.clipboard.writeText(code);
        ui.btnCopy.textContent = "コピーしました";
        toast("部屋コードをコピーしました", "info");
      } catch {
        toast(`部屋コード: ${code}`, "info");
      }
      setTimeout(() => (ui.btnCopy.textContent = "コピー"), 1400);
    });

    ui.btnStart.addEventListener("click", () => {
      ensureAudio();
      send({ t: "start" });
    });
    ui.btnAgain.addEventListener("click", () => send({ t: "again" }));
    ui.btnLeave.addEventListener("click", () => {
      send({ t: "leave" });
      leaveToHome("");
    });
    ui.btnFinalLeave.addEventListener("click", () => {
      send({ t: "leave" });
      leaveToHome("");
    });

    ui.btnBuzz.addEventListener("click", () => {
      ensureAudio();
      send({ t: "buzz" });
    });

    ui.btnSound.addEventListener("click", () => {
      app.soundOn = !app.soundOn;
      ui.btnSound.textContent = app.soundOn ? "♪ サウンド ON" : "♪ サウンド OFF";
      ui.btnSound.setAttribute("aria-pressed", String(app.soundOn));
      if (app.soundOn) ensureAudio();
    });

    document.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!ui.btnBuzz.disabled && app.state && app.state.phase === "question") {
          ensureAudio();
          send({ t: "buzz" });
        }
        return;
      }
      const digit = ["1", "2", "3", "4"].indexOf(e.key);
      if (digit >= 0 && app.state && app.state.answererId === app.playerId && !app.answeredThisQuestion) {
        onChoiceClick(digit);
      }
    });

    // ハートビート（回線が切れたことを早めに検知する）
    setInterval(() => {
      if (app.ws && app.ws.readyState === WebSocket.OPEN) send({ t: "ping" });
    }, 15000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && (!app.ws || app.ws.readyState > 1) && app.code && !app.intentionalClose) {
        connect(app.code, app.name, app.token);
      }
    });

    window.addEventListener("beforeunload", () => {
      app.intentionalClose = true;
    });
  }

  /* ------------------------------- bootstrap ------------------------------- */

  function bootstrap() {
    bindEvents();
    const savedName = localStorage.getItem(LS_NAME) || "";
    ui.inputName.value = savedName;
    app.name = savedName;

    const params = new URLSearchParams(location.search);
    const code = (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code) {
      setMode("join");
      ui.inputCode.value = code;
      const token = localStorage.getItem(tokenKey(code));
      if (token && savedName) {
        // 再読み込み・共有リンクからの自動復帰
        app.joined = false;
        showScreen("lobby");
        ui.lobbyCode.textContent = code;
        ui.lobbyPlayers.textContent = "";
        const connecting = document.createElement("li");
        connecting.className = "player-slot is-empty";
        connecting.textContent = "接続中…";
        ui.lobbyPlayers.appendChild(connecting);
        connect(code, savedName, token);
      } else {
        showScreen("home");
        if (!savedName) ui.inputName.focus();
        else ui.inputCode.focus();
      }
    } else {
      showScreen("home");
      ui.inputName.focus();
    }

    requestAnimationFrame(tick);
  }

  bootstrap();
})();
