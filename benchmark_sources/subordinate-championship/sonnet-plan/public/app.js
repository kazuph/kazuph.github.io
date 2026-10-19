// 画面の制御。正誤判定や点数はすべてサーバー側で決まり、ここでは受け取った状態を描くだけ。
(() => {
  "use strict";

  const SESSION_KEY = "buzzer-quiz.session";
  const RECONNECT_MS = 1000;
  const QUESTION_MS = 20000;
  const CLOSE_REPLACED = 4000;
  const $ = (id) => document.getElementById(id);

  const app = {
    session: null, // { code, playerId, token }
    ws: null,
    state: null, // 最後に受け取った state
    sync: null, // { serverNow, perf }  サーバー時刻と受信時の performance.now()
    retryTimer: null,
    replaced: false,
    toastTimer: null,
  };

  // ---------- 保存 ----------
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const s = raw && JSON.parse(raw);
      return s && s.code && s.token && s.playerId ? s : null;
    } catch {
      return null;
    }
  }
  function saveSession(s) {
    app.session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* 保存できなくても遊べる */ }
  }

  // ---------- 入口 ----------
  function showEntryError(message) {
    const el = $("entry-error");
    el.textContent = message;
    el.hidden = !message;
  }

  async function enter(path, body) {
    showEntryError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return showEntryError(data.error || "入室できませんでした");
      saveSession({ code: data.code, playerId: data.playerId, token: data.token });
      connect();
    } catch {
      showEntryError("サーバーにつながりません。ネットワークを確認してください");
    }
  }

  function currentName() {
    return $("name").value.trim();
  }

  $("create").addEventListener("click", () => {
    if (!currentName()) return showEntryError("ニックネームを入れてください");
    enter("/api/rooms", { name: currentName() });
  });
  $("join").addEventListener("click", () => {
    const code = $("code").value.trim().toUpperCase();
    if (!currentName()) return showEntryError("ニックネームを入れてください");
    if (code.length !== 6) return showEntryError("部屋コードは6文字です");
    enter(`/api/rooms/${encodeURIComponent(code)}/join`, { name: currentName() });
  });
  $("code").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase(); });
  $("again").addEventListener("click", leaveRoom);

  function leaveRoom() {
    closeSocket();
    saveSession(null);
    app.state = null;
    $("conn").hidden = true;
    show("entry");
  }

  // ---------- 接続 ----------
  function closeSocket() {
    clearTimeout(app.retryTimer);
    if (app.ws) {
      app.ws.onclose = null;
      app.ws.onmessage = null;
      app.ws.close();
      app.ws = null;
    }
  }

  function connect() {
    closeSocket();
    if (!app.session) return;
    app.replaced = false;
    const { code, token } = app.session;
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${scheme}://${location.host}/api/rooms/${code}/ws?token=${encodeURIComponent(token)}`);
    app.ws = ws;
    ws.onopen = () => { $("conn").hidden = true; };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = (e) => onClosed(ws, e);
  }

  function onMessage(msg) {
    if (msg.t === "error") return toast(msg.message);
    if (msg.t !== "state") return;
    app.sync = { serverNow: msg.serverNow, perf: performance.now() };
    app.state = msg;
    render();
  }

  function onClosed(ws, e) {
    if (ws !== app.ws) return;
    app.ws = null;
    if (e.code === CLOSE_REPLACED) {
      app.replaced = true;
      $("conn").textContent = "別の画面で開かれました。この画面で続けるには再読み込みしてください";
      $("conn").hidden = false;
      return;
    }
    $("conn").textContent = "再接続中…";
    $("conn").hidden = false;
    scheduleReconnect(RECONNECT_MS);
  }

  function scheduleReconnect(delay) {
    clearTimeout(app.retryTimer);
    app.retryTimer = setTimeout(reconnect, delay);
  }

  /** 保存した token がまだ有効かを確かめてからつなぎ直す。無効なら入口へ戻す */
  async function reconnect() {
    if (!app.session || app.replaced) return;
    try {
      const { code, token } = app.session;
      const res = await fetch(`/api/rooms/${code}/me?token=${encodeURIComponent(token)}`);
      if (res.status === 403 || res.status === 404) {
        leaveRoom();
        showEntryError("前回の部屋にはもどれませんでした");
        return;
      }
    } catch {
      return scheduleReconnect(RECONNECT_MS); // まだ回線がない
    }
    connect();
  }

  window.addEventListener("offline", () => {
    if (!app.ws) return;
    const ws = app.ws;
    ws.close();
    onClosed(ws, { code: 1006 });
  });
  window.addEventListener("online", () => {
    if (app.session && !app.replaced) reconnect();
  });

  // ---------- 時計 ----------
  function serverTime() {
    return app.sync.serverNow + (performance.now() - app.sync.perf);
  }
  const secondsLeft = (ms) => Math.max(0, Math.ceil(ms / 1000));

  // ---------- 描画 ----------
  function show(screen) {
    document.body.dataset.screen = screen;
    for (const name of ["entry", "lobby", "game", "result"]) $(`screen-${name}`).hidden = name !== screen;
  }

  function me() {
    return app.state.players.find((p) => p.id === app.state.you);
  }
  const nameOf = (id) => (app.state.players.find((p) => p.id === id) || {}).name || "?";

  function render() {
    const st = app.state;
    document.body.dataset.phase = st.phase;
    if (st.phase === "lobby") {
      show("lobby");
      renderLobby();
    } else if (st.phase === "finished") {
      show("result");
      renderResult();
    } else {
      show("game");
      renderGame();
    }
    tickClock();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderLobby() {
    const st = app.state;
    $("lobby-code").textContent = st.code;
    const list = $("lobby-players");
    list.replaceChildren();
    for (let i = 0; i < 4; i++) {
      const p = st.players[i];
      const li = el("li", p ? "slot" : "slot empty");
      if (p) {
        li.dataset.testid = "lobby-player";
        li.append(el("span", `avatar c${i}`, p.name.slice(0, 1)), el("span", "", p.name));
        if (p.id === st.hostId) li.append(el("span", "tag", "ホスト"));
        if (p.id === st.you) li.append(el("span", "tag", "あなた"));
        if (!p.connected) li.append(el("span", "tag off", "接続が切れています"));
      } else {
        li.append(el("span", "", "待機中…"));
      }
      list.append(li);
    }
    const isHost = st.you === st.hostId;
    const enough = st.players.length >= 2;
    $("start").hidden = !isHost;
    $("start").disabled = !enough;
    $("lobby-hint").textContent = !isHost
      ? "ホストが開始するのを待っています"
      : enough ? "みんな揃ったら開始！" : "開始には2人以上が必要です";
  }

  function renderGame() {
    const st = app.state;
    const you = me();
    $("qnum").textContent = st.qNum;
    $("qtotal").textContent = st.total;
    $("question").textContent = st.question ? st.question.text : "";
    renderChoices(st, you);
    renderBuzz(st, you);
    renderScores(st);
  }

  function renderChoices(st, you) {
    const canAnswer = st.phase === "answering" && st.answerer === you.id;
    const mine = st.attempts.find((a) => a.playerId === you.id);
    document.querySelectorAll(".choice").forEach((btn, i) => {
      btn.querySelector("span").textContent = st.question ? st.question.choices[i] : "";
      btn.disabled = !canAnswer;
      btn.classList.toggle("correct", st.correct === i);
      const pickedWrong = st.phase === "reveal" && st.attempts.some((a) => a.choice === i && a.delta < 0);
      btn.classList.toggle("picked-wrong", pickedWrong);
      btn.setAttribute("aria-label", mine && mine.choice === i ? "あなたの回答" : "");
    });
  }

  function renderBuzz(st, you) {
    const buzz = $("buzz");
    const status = $("status");
    status.classList.remove("mine");
    $("answer-timer").hidden = st.phase !== "answering";
    if (st.phase === "question") {
      buzz.disabled = you.disqualified;
      status.textContent = you.disqualified ? "この問題は回答済み" : "わかったら早押し！（スペースキーでもOK）";
    } else if (st.phase === "answering") {
      buzz.disabled = true;
      const mineNow = st.answerer === you.id;
      status.classList.toggle("mine", mineNow);
      status.textContent = mineNow ? "あなたが回答中！ 選択肢を選んでください" : `${nameOf(st.answerer)}さんが回答中`;
    } else {
      buzz.disabled = true;
      status.textContent = revealText(st);
    }
  }

  function revealText(st) {
    const right = st.attempts.find((a) => a.delta > 0);
    const head = right ? `${nameOf(right.playerId)}さん正解！ +10` : "正解者なし";
    return `${head}　正解は「${st.question.choices[st.correct]}」`;
  }

  function renderScores(st) {
    const list = $("scores");
    list.replaceChildren();
    for (const p of st.players) {
      const li = el("li", "pcard");
      li.dataset.testid = "player-card";
      li.dataset.name = p.name;
      li.classList.toggle("answering", st.phase === "answering" && st.answerer === p.id);
      li.classList.toggle("you", p.id === st.you);
      li.classList.toggle("offline", !p.connected);
      const idx = st.players.indexOf(p);
      const score = el("span", p.score < 0 ? "score neg" : "score", String(p.score));
      score.dataset.testid = "score";
      const notes = el("span", "notes");
      if (p.id === st.you) notes.append(el("span", "tag", "あなた"));
      if (st.phase === "answering" && st.answerer === p.id) notes.append(el("span", "tag", "回答中"));
      if (p.disqualified && st.phase !== "reveal") notes.append(el("span", "tag off", "回答済み"));
      if (!p.connected) notes.append(el("span", "tag off", "接続が切れています"));
      const attempt = st.phase === "reveal" ? st.attempts.find((a) => a.playerId === p.id) : null;
      if (attempt) notes.append(el("span", `delta ${attempt.delta > 0 ? "plus" : "minus"}`, attempt.delta > 0 ? "+10" : "-5"));
      li.append(el("span", `avatar c${idx}`, p.name.slice(0, 1)), el("span", "pname", p.name), score, notes);
      list.append(li);
    }
  }

  function renderResult() {
    const st = app.state;
    const sorted = [...st.players].sort((a, b) => a.rank - b.rank || b.score - a.score);
    const top = sorted.filter((p) => p.rank === 1).map((p) => p.name).join("・");
    $("result-title").textContent = `${top}さんの優勝！`;
    const list = $("ranking");
    list.replaceChildren();
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    for (const p of sorted) {
      const li = el("li", `rank-row${p.rank === 1 ? " first" : ""}${p.id === st.you ? " you" : ""}`);
      li.dataset.testid = "rank-row";
      li.dataset.rank = String(p.rank);
      li.dataset.name = p.name;
      li.append(el("span", "medal", medals[p.rank] || `${p.rank}位`), el("span", "", p.name), el("span", "pts", `${p.score}点`));
      list.append(li);
    }
  }

  // ---------- 残り時間 ----------
  function tickClock() {
    if (!app.state || !app.sync) return;
    const st = app.state;
    const now = serverTime();
    const timer = $("timer-text");
    let remaining = 0;
    if (st.phase === "question" || st.phase === "answering") {
      remaining = Math.max(0, st.questionDeadline - now);
      timer.textContent = `残り ${secondsLeft(remaining)} 秒`;
      $("bar-fill").style.width = `${Math.min(100, (remaining / QUESTION_MS) * 100)}%`;
    } else if (st.phase === "reveal") {
      remaining = Math.max(0, st.revealUntil - now);
      timer.textContent = `次の問題まで ${secondsLeft(remaining)} 秒`;
      $("bar-fill").style.width = "0%";
    }
    timer.dataset.remainingMs = String(Math.round(remaining));
    const urgent = (st.phase === "question" || st.phase === "answering") && remaining <= 5000;
    timer.classList.toggle("urgent", urgent);
    document.querySelector(".bar").classList.toggle("urgent", urgent);
    if (st.phase === "answering") {
      const left = Math.max(0, st.answerDeadline - now);
      $("answer-timer").textContent = `回答まで ${secondsLeft(left)} 秒`;
      $("answer-timer").dataset.remainingMs = String(Math.round(left));
    }
  }
  setInterval(tickClock, 100);

  // ---------- 操作 ----------
  $("start").addEventListener("click", () => send({ t: "start" }));

  function send(msg) {
    if (app.ws && app.ws.readyState === WebSocket.OPEN) app.ws.send(JSON.stringify(msg));
    else toast("接続していません");
  }

  function canBuzz() {
    const st = app.state;
    return !!st && st.phase === "question" && !me().disqualified;
  }
  function buzz() {
    if (!canBuzz()) return;
    send({ t: "buzz", q: app.state.qNum - 1 });
  }
  $("buzz").addEventListener("pointerdown", (e) => {
    if (e.button === 0 || e.pointerType !== "mouse") buzz();
  });
  $("buzz").addEventListener("click", (e) => { if (e.detail === 0) buzz(); }); // キーボードの Enter
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (document.body.dataset.screen !== "game") return;
    e.preventDefault();
    buzz();
  });
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const st = app.state;
      if (st && st.phase === "answering" && st.answerer === st.you) {
        send({ t: "answer", q: st.qNum - 1, choice: Number(btn.dataset.i) });
      }
    });
  });

  function toast(message) {
    const t = $("toast");
    t.textContent = message;
    t.hidden = false;
    clearTimeout(app.toastTimer);
    app.toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- 起動 ----------
  const saved = loadSession();
  if (saved) {
    app.session = saved;
    $("conn").textContent = "再接続中…";
    $("conn").hidden = false;
    reconnect();
  }
  show("entry");
})();
