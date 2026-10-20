/* バズクイズ client */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const views = {
    entry: $("#view-entry"),
    lobby: $("#view-lobby"),
    game: $("#view-game"),
    result: $("#view-result"),
  };

  const SESSION_KEY = "bquiz-session";
  const session = {
    get() {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
    },
    set(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); },
    clear() { localStorage.removeItem(SESSION_KEY); },
  };

  let ws = null;
  let state = null;
  let clockOffset = 0; // serverNow - clientNow
  let reconnectTimer = null;
  let buzzSentAt = 0;

  const serverNow = () => Date.now() + clockOffset;

  function show(view) {
    for (const [k, el] of Object.entries(views)) el.classList.toggle("hidden", k !== view);
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function entryError(msg) {
    const el = $("#entry-error");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  // ---------- API ----------

  async function api(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "エラーが発生しました");
    return data;
  }

  async function createRoom() {
    const name = $("#in-name").value.trim();
    if (!name) return entryError("名前を入力してください");
    try {
      const d = await api("/api/rooms", { name });
      session.set({ room: d.roomCode, playerId: d.playerId, token: d.token, name });
      connect();
    } catch (e) { entryError(e.message); }
  }

  async function joinRoom() {
    const name = $("#in-name").value.trim();
    const code = $("#in-code").value.trim().toUpperCase();
    if (!name) return entryError("名前を入力してください");
    if (!code) return entryError("部屋コードを入力してください");
    try {
      const d = await api(`/api/rooms/${code}/join`, { name });
      session.set({ room: d.roomCode, playerId: d.playerId, token: d.token, name });
      connect();
    } catch (e) { entryError(e.message); }
  }

  // ---------- websocket ----------

  async function connect() {
    const s = session.get();
    if (!s) { show("entry"); return; }
    // セッションがまだ有効か確認してから ws を張る
    try {
      const r = await fetch(
        `/api/rooms/${encodeURIComponent(s.room)}/session` +
        `?playerId=${encodeURIComponent(s.playerId)}&token=${encodeURIComponent(s.token)}`
      );
      if (r.status === 403) {
        session.clear();
        state = null;
        show("entry");
        entryError("セッションが切れました。もう一度参加してください。");
        return;
      }
    } catch {
      scheduleReconnect();
      return;
    }
    if (ws) { try { ws.close(); } catch {} }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(
      `${proto}://${location.host}/ws?room=${encodeURIComponent(s.room)}` +
      `&playerId=${encodeURIComponent(s.playerId)}&token=${encodeURIComponent(s.token)}`
    );
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === "error") {
        toast(msg.message);
        return;
      }
      if (msg.t === "state") {
        clockOffset = msg.now - Date.now();
        state = msg;
        render();
      }
    };
    ws.onclose = () => scheduleReconnect();
    ws.onerror = () => {};
  }

  function scheduleReconnect() {
    if (!session.get() || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 800);
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  // ---------- render ----------

  function render() {
    if (!state) return;
    switch (state.phase) {
      case "lobby": renderLobby(); break;
      case "question":
      case "answer": renderGame(); break;
      case "reveal": renderGame(); renderReveal(); break;
      case "finished": renderResult(); break;
    }
  }

  function playerOf(id) { return state.players.find((p) => p.id === id); }
  const me = () => playerOf(state.you);
  const isHost = () => state.you === state.hostId;

  function renderLobby() {
    show("lobby");
    const s = session.get();
    $("#lobby-code").textContent = s ? s.room : "";
    const ul = $("#lobby-players");
    ul.innerHTML = "";
    for (const p of state.players) {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="dot ${p.connected ? "" : "off"}"></span>` +
        `<span>${esc(p.name)}</span>` +
        (p.id === state.hostId ? `<span class="badge">ホスト</span>` : "") +
        (p.id === state.you ? `<span class="me">あなた</span>` : "");
      ul.appendChild(li);
    }
    for (let i = state.players.length; i < 4; i++) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "空席";
      ul.appendChild(li);
    }
    const btn = $("#btn-start");
    const err = $("#lobby-error");
    err.classList.add("hidden");
    if (isHost()) {
      btn.classList.remove("hidden");
      const n = state.players.filter((p) => p.connected).length;
      const ok = n >= 2 && n <= 4;
      btn.disabled = !ok;
      $("#lobby-status").textContent = ok
        ? "開始できます！"
        : "あと1人以上の参加を待っています…";
    } else {
      btn.classList.add("hidden");
      $("#lobby-status").textContent = "ホストが開始するのを待っています…";
    }
  }

  function renderGame() {
    show("game");
    $("#reveal-banner").classList.add("hidden");
    const q = state.question;
    if (q) {
      $("#q-count").textContent = `Q${q.n}/${q.total}`;
      $("#q-text").textContent = q.text;
    }
    renderChoices();
    renderScoreboard();
    renderBuzz();
  }

  function renderChoices() {
    const box = $("#choices");
    box.innerHTML = "";
    const q = state.question;
    if (!q) return;
    const iAmAnswering = state.phase === "answer" && state.answering?.playerId === state.you;
    const reveal = state.phase === "reveal" && state.reveal;
    q.choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.innerHTML = `<span class="key">${"ABCD"[i]}</span>${esc(c)}`;
      if (reveal) {
        if (i === state.reveal.correctIndex) b.classList.add("correct");
        else if (i === state.reveal.chosenIndex) b.classList.add("wrong");
        b.disabled = true;
      } else if (iAmAnswering) {
        b.classList.add("can-answer");
        b.disabled = false;
        b.onclick = () => send({ t: "answer", i });
      } else {
        b.disabled = true;
      }
      box.appendChild(b);
    });
  }

  function renderScoreboard() {
    const sb = $("#scoreboard");
    sb.innerHTML = "";
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    for (const p of sorted) {
      const row = document.createElement("div");
      row.className = "score-row";
      if (p.id === state.you) row.classList.add("me");
      if (state.answering?.playerId === p.id) row.classList.add("answering");
      if (p.locked && state.phase !== "finished") row.classList.add("locked");
      if (!p.connected) row.classList.add("disconnected");
      row.innerHTML =
        `<span class="mark">${state.answering?.playerId === p.id ? "🔔" : p.locked ? "✖" : ""}</span>` +
        `<span class="name">${esc(p.name)}${p.id === state.hostId ? "★" : ""}</span>` +
        `<span class="score">${p.score}</span>`;
      sb.appendChild(row);
    }
  }

  function renderBuzz() {
    const btn = $("#btn-buzz");
    const hint = $("#buzz-hint");
    const st = $("#q-status");
    const p = me();
    const buzzed = state.answering?.playerId;
    const buzzedName = buzzed ? (playerOf(buzzed)?.name ?? "?") : null;

    if (state.phase === "answer") {
      if (buzzed === state.you) {
        st.innerHTML = `<span class="answering">あなたが回答中！ 10秒以内に選んでください</span>`;
        hint.textContent = "";
      } else {
        st.innerHTML = `<span class="answering">${esc(buzzedName)} が回答中…</span>`;
        hint.textContent = "";
      }
      btn.disabled = true;
    } else if (state.phase === "question") {
      const canBuzz = p && !p.locked;
      st.textContent = "早押し！ ボタンを押して回答権を取ろう";
      btn.disabled = !canBuzz;
      hint.textContent = canBuzz
        ? (Date.now() + clockOffset - buzzSentAt < 1500 && buzzSentAt ? "" : "全員が押せます")
        : "この問題ではもう押せません";
    } else {
      btn.disabled = true;
      st.textContent = "";
    }
    btn.classList.toggle("pressed", false);
  }

  function renderReveal() {
    const r = state.reveal;
    if (!r) return;
    const banner = $("#reveal-banner");
    banner.classList.remove("hidden");
    const who = r.answeredBy ? playerOf(r.answeredBy)?.name ?? "?" : null;
    let head, cls;
    if (who && r.chosenIndex === r.correctIndex) { head = `${esc(who)} が正解！ +10点`; cls = "ok"; }
    else if (who) { head = `${esc(who)} は不正解… -5点`; cls = "bad"; }
    else { head = "時間切れ / 全員不正解"; cls = "bad"; }
    const secs = state.revealUntil ? Math.max(0, Math.ceil((state.revealUntil - serverNow()) / 1000)) : 0;
    banner.innerHTML =
      `<div class="reveal-inner">` +
      `<div class="big ${cls}">${head}</div>` +
      `<div>正解: <b>${esc(r.correctText)}</b></div>` +
      `<div class="next">次の問題まで <span id="reveal-count">${secs}</span> 秒</div>` +
      `</div>`;
  }

  function renderResult() {
    show("result");
    const ol = $("#ranking");
    ol.innerHTML = "";
    for (const r of state.ranking ?? []) {
      const li = document.createElement("li");
      if (r.rank === 1) li.classList.add("r1");
      li.innerHTML =
        `<span class="rank">${r.rank}</span>` +
        `<span class="name">${esc(r.name)}${r.playerId === state.you ? "（あなた）" : ""}</span>` +
        `<span class="score">${r.score}点</span>`;
      ol.appendChild(li);
    }
    $("#btn-restart").classList.toggle("hidden", !isHost());
    $("#result-hint").textContent = isHost() ? "" : "ホストの操作を待っています";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- countdown tick ----------

  setInterval(() => {
    if (!state) return;
    const fill = $("#timer-fill");
    if (state.phase === "question" || state.phase === "answer") {
      const q = state.question;
      if (q && q.endsAt) {
        // total window is 20s (server QUESTION_MS); compute fraction from endsAt
        const remain = Math.max(0, q.endsAt - serverNow());
        fill.style.width = `${Math.min(100, (remain / 20000) * 100)}%`;
      }
      if (state.phase === "answer" && state.answering?.playerId === state.you) {
        const remain = Math.max(0, Math.ceil((state.answering.endsAt - serverNow()) / 1000));
        const st = $("#q-status");
        st.innerHTML = `<span class="answering">あなたが回答中！ 残り ${remain} 秒</span>`;
      }
    }
    if (state.phase === "reveal" && state.revealUntil) {
      const el = $("#reveal-count");
      if (el) el.textContent = Math.max(0, Math.ceil((state.revealUntil - serverNow()) / 1000));
    }
  }, 200);

  // ---------- events ----------

  $("#btn-create").onclick = createRoom;
  $("#btn-join").onclick = joinRoom;
  $("#in-code").addEventListener("keydown", (e) => { if (e.key === "Enter") joinRoom(); });
  $("#in-name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#in-code").focus(); });
  $("#btn-start").onclick = () => send({ t: "start" });
  $("#btn-buzz").onclick = () => { buzzSentAt = serverNow(); send({ t: "buzz" }); };
  $("#btn-restart").onclick = () => send({ t: "restart" });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && session.get() && (!ws || ws.readyState > WebSocket.OPEN)) connect();
  });

  // boot: auto-reconnect if session exists
  if (session.get()) connect(); else show("entry");
})();
