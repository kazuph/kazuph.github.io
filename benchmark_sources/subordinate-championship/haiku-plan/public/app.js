// 画面の制御。サーバーの状態（state）を受けて描き直すだけで、正誤・点数・順番は決めない。
(() => {
  const KEY = "buzzer-quiz-session";
  const TOTAL = 10;
  const PHASE_MS = { question: 20000, answering: 10000, reveal: 3000 };
  const MARKS = ["①", "②", "③", "④"];
  const OFFLINE_TEXT = "オフラインです。回線が戻ると自動でつなぎ直します";
  const $ = (id) => document.getElementById(id);

  const app = {
    session: null, // { code, token }
    ws: null,
    view: null, // 直近のサーバーの状態
    offset: 0, // サーバー時計 - 端末の時計（ms）
    gotState: false,
    stopped: false,
    reconnectTimer: 0,
  };

  // ---- 保存・通信 ----
  function loadSession() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return s && s.token && s.code ? s : null;
    } catch {
      return null;
    }
  }
  function saveSession(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // 保存できなくても遊べる（再読み込みで戻れないだけ）
    }
  }
  function forgetSession() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // 何もしない
    }
  }

  async function post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `通信に失敗しました（${res.status}）`);
    return data;
  }

  function send(message) {
    const ws = app.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      toast("接続中です。少し待ってください");
    }
  }

  // ---- 表示の切り替え ----
  const SCREENS = ["entry", "lobby", "game", "result"];
  function show(name) {
    for (const s of SCREENS) $(s).hidden = s !== name;
    $("room-chip").hidden = name === "entry" || !app.view;
  }
  function setBanner(text) {
    $("banner").hidden = !text;
    $("banner").textContent = text || "";
  }
  let toastTimer = 0;
  function toast(text) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").hidden = true), 3000);
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function nameOf(view, id) {
    const p = view.players.find((x) => x.id === id);
    return p ? p.name : "（退出した人）";
  }

  // ---- 入口 ----
  async function run(action) {
    $("entry-error").textContent = "";
    try {
      await action();
    } catch (e) {
      $("entry-error").textContent = e instanceof TypeError ? "通信できません。回線を確かめてください" : e.message;
    }
  }
  function enter(session) {
    app.session = session;
    app.view = null;
    saveSession(session);
    setBanner("接続中…");
    connect();
  }
  function myName() {
    const name = $("name").value.trim();
    if (!name) throw new Error("名前を入力してください");
    return name;
  }
  $("create").onclick = () => run(async () => {
    const data = await post("/api/rooms", { name: myName() });
    enter({ code: data.code, token: data.token });
  });
  $("join").onclick = () => run(async () => {
    const name = myName();
    const code = $("code").value.trim().toUpperCase();
    if (!code) throw new Error("部屋コードを入力してください");
    const data = await post(`/api/rooms/${encodeURIComponent(code)}/join`, { name });
    enter({ code: data.code, token: data.token });
  });
  $("start").onclick = () => send({ t: "start" });
  $("back").onclick = () => {
    forgetSession();
    dropSocket();
    app.stopped = false;
    app.session = null;
    app.view = null;
    setBanner(null);
    show("entry");
  };

  // ---- 接続 ----
  function dropSocket() {
    clearTimeout(app.reconnectTimer);
    const ws = app.ws;
    app.ws = null;
    if (ws) {
      ws.onmessage = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // 既に閉じていれば何もしない
      }
    }
  }

  function connect() {
    const s = app.session;
    if (!s || app.stopped) return;
    dropSocket();
    app.gotState = false;
    setBanner(app.view ? "再接続中…" : "接続中…");
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/api/rooms/${encodeURIComponent(s.code)}/ws?token=${encodeURIComponent(s.token)}`;
    const ws = new WebSocket(url);
    app.ws = ws;
    ws.onmessage = (ev) => {
      if (app.ws === ws) onMessage(JSON.parse(ev.data));
    };
    ws.onclose = (ev) => {
      if (app.ws !== ws) return;
      app.ws = null;
      onClosed(ev.code);
    };
  }

  function onMessage(msg) {
    if (msg.t === "error") {
      toast(msg.message);
      return;
    }
    if (msg.t !== "state") return;
    app.gotState = true;
    app.offset = msg.serverNow - Date.now();
    app.view = msg;
    setBanner(null);
    render();
  }

  function onClosed(code) {
    if (app.stopped || !app.session) return;
    if (code === 4000) {
      app.stopped = true;
      setBanner("別の画面でこの部屋に入ったため、この画面は切断されました。再読み込みすると戻れます");
      return;
    }
    if (!navigator.onLine) {
      setBanner(OFFLINE_TEXT);
      return;
    }
    if (!app.gotState) {
      probeThenRetry();
      return;
    }
    setBanner("再接続中…");
    app.reconnectTimer = setTimeout(connect, 1000);
  }

  // 一度もつながらなかった時、参加情報が無効（部屋なし・別人扱い）なら入口へ戻す
  async function probeThenRetry() {
    const s = app.session;
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(s.code)}/me?token=${encodeURIComponent(s.token)}`);
      if (res.status === 403 || res.status === 404) {
        forgetSession();
        app.session = null;
        setBanner(null);
        show("entry");
        $("entry-error").textContent = "部屋に入れませんでした。部屋が無くなったか、参加情報が古くなっています";
        return;
      }
    } catch {
      // 回線が無いなどで確認できない時は、少し待ってから再試行する
    }
    app.reconnectTimer = setTimeout(connect, 1000);
  }

  window.addEventListener("offline", () => {
    if (!app.session || app.stopped) return;
    dropSocket();
    setBanner(OFFLINE_TEXT);
  });
  window.addEventListener("online", () => {
    if (!app.session || app.stopped) return;
    connect();
  });

  // ---- 描画 ----
  function render() {
    const v = app.view;
    $("room-chip").hidden = false;
    $("room-chip").textContent = `部屋 ${v.code}`;
    if (v.phase === "lobby") {
      show("lobby");
      renderLobby(v);
    } else if (v.phase === "finished") {
      show("result");
      renderResult(v);
    } else {
      show("game");
      renderGame(v);
    }
  }

  function renderPlayers(list, v, withScore) {
    list.replaceChildren(
      ...v.players.map((p) => {
        const li = el("li");
        li.classList.toggle("me", p.id === v.you);
        li.classList.toggle("answering", v.phase === "answering" && v.answerer === p.id);
        li.classList.toggle("offline", !p.connected);
        li.append(el("span", "pname", p.name));
        if (p.id === v.hostId) li.append(el("span", "badge", "ホスト"));
        if (p.id === v.you) li.append(el("span", "badge", "あなた"));
        if (v.phase === "answering" && v.answerer === p.id) li.append(el("span", "badge", "回答中"));
        if (v.failed.includes(p.id)) li.append(el("span", "badge", "回答済み"));
        if (!p.connected) li.append(el("span", "badge off", "接続が切れています"));
        if (withScore) {
          const cls = p.score < 0 ? "score neg" : "score pos";
          li.append(el("span", cls, p.score > 0 ? `+${p.score}` : `${p.score}`));
        }
        return li;
      }),
    );
  }

  function renderLobby(v) {
    $("lobby-code").textContent = v.code;
    renderPlayers($("lobby-players"), v, false);
    const n = v.players.length;
    const isHost = v.hostId === v.you;
    $("start").hidden = !isHost;
    $("start").disabled = n < 2;
    if (isHost) {
      $("lobby-hint").textContent =
        n < 2 ? `参加 ${n} / 4人。2人以上そろうと開始できます` : `参加 ${n} / 4人。開始できます`;
    } else {
      $("lobby-hint").textContent = `参加 ${n} / 4人。ホストが開始するのを待っています`;
    }
  }

  function renderGame(v) {
    const isAnswerer = v.answerer === v.you;
    const failed = v.failed.includes(v.you);
    const res = v.result;
    $("round").textContent = `第${v.qIndex + 1}問 / ${TOTAL}`;
    $("question").textContent = v.question.q;
    document.querySelectorAll(".choice").forEach((btn, i) => {
      btn.textContent = `${MARKS[i]} ${v.question.choices[i]}`;
      btn.disabled = !(v.phase === "answering" && isAnswerer);
      btn.classList.toggle("correct", Boolean(res) && res.answer === i);
      btn.classList.toggle("wrong", Boolean(res) && res.choice === i && !res.correct);
    });
    const canBuzz = v.phase === "question" && !failed;
    $("buzz").disabled = !canBuzz;
    $("status").textContent = statusText(v, isAnswerer, failed);
    renderPlayers($("game-players"), v, true);
    tickTimer();
  }

  function statusText(v, isAnswerer, failed) {
    if (v.phase === "question") {
      if (failed) return "この問題は回答済みです。次の問題を待っています";
      if (v.lastMiss) {
        const kind = v.lastMiss.timeout ? "時間切れ" : "不正解";
        return `${nameOf(v, v.lastMiss.by)}さんは${kind} -5点。早押しを再開しています`;
      }
      return "早押し！ 最初に押した人が回答権を得ます";
    }
    if (v.phase === "answering") {
      return isAnswerer ? "あなたが回答中！ 10秒以内に選んでください" : `${nameOf(v, v.answerer)}さんが回答中`;
    }
    if (v.phase === "reveal") return revealText(v);
    return "";
  }

  function revealText(v) {
    const r = v.result;
    const correct = v.question.choices[r.answer];
    if (r.correct) return `${nameOf(v, r.by)}さんが正解！ +10点（正解は「${correct}」）`;
    if (r.by === null) return `誰も押しませんでした。正解は「${correct}」`;
    if (r.choice === null) return `${nameOf(v, r.by)}さんは時間切れ -5点（正解は「${correct}」）`;
    return `${nameOf(v, r.by)}さんは不正解 -5点（正解は「${correct}」）`;
  }

  // 残り時間はサーバー時計の推定値で計算する（端末の時計のずれを使わない）
  function tickTimer() {
    const v = app.view;
    const timer = $("timer");
    if (!v || !(v.phase in PHASE_MS)) {
      timer.dataset.remainingMs = "";
      $("timer-text").textContent = "";
      return;
    }
    const target = { question: v.questionDeadline, answering: v.answerDeadline, reveal: v.revealUntil }[v.phase];
    const remaining = Math.max(0, target - (Date.now() + app.offset));
    timer.dataset.remainingMs = String(Math.round(remaining));
    timer.classList.toggle("answering", v.phase === "answering");
    timer.classList.toggle("reveal", v.phase === "reveal");
    $("timer-bar").style.width = `${Math.min(100, (remaining / PHASE_MS[v.phase]) * 100)}%`;
    const sec = Math.ceil(remaining / 1000);
    $("timer-text").textContent = v.phase === "reveal" ? `次の問題まで ${sec}秒` : `残り ${sec}秒`;
  }
  setInterval(tickTimer, 100);

  function renderResult(v) {
    $("ranking").replaceChildren(
      ...v.ranking.map((r, i) => {
        const li = el("li", i === 0 ? "first" : "");
        li.append(el("span", "rank", `${r.rank}位`), el("span", "pname", r.name));
        li.append(el("span", r.score < 0 ? "score neg" : "score pos", r.score > 0 ? `+${r.score}` : `${r.score}`));
        return li;
      }),
    );
  }

  // ---- 操作 ----
  function buzz() {
    if (!app.view) return;
    send({ t: "buzz", q: app.view.qIndex });
  }
  $("buzz").onclick = buzz;
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.onclick = () => {
      const v = app.view;
      if (!v) return;
      send({ t: "answer", q: v.qIndex, choice: Number(btn.dataset.index) });
    };
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat) return;
    const target = e.target;
    if (target instanceof HTMLInputElement) return;
    if ($("game").hidden || $("buzz").disabled) return;
    e.preventDefault();
    buzz();
  });

  // ---- 起動 ----
  const saved = loadSession();
  if (saved) {
    app.session = saved;
    connect();
  } else {
    show("entry");
  }
})();
