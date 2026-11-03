"use strict";
// 早押しクイズのブラウザ側。表示とボタン操作だけを担当し、判定はすべてサーバーが行う。
(() => {
  const $app = document.getElementById("app");
  const $conn = document.getElementById("conn");
  const $toast = document.getElementById("toast");
  const COLORS = ["var(--c0)", "var(--c1)", "var(--c2)", "var(--c3)"];
  const LS_SESSION = "buzzer:session";
  const LS_NAME = "buzzer:name";

  let ws = null;
  let session = loadSession(); // { code, token, name }
  let snap = null;
  let offset = 0; // サーバー時刻 - ブラウザ時刻
  let view = "";
  let entryError = "";
  let pendingBuzz = false;
  let reconnectTimer = null;
  let attempt = 0;
  let intentionalClose = false;
  let prevScores = new Map();
  let delta = new Map();
  let toastTimer = null;

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || "null"); } catch { return null; }
  }
  function saveSession(s) {
    session = s;
    try { s ? localStorage.setItem(LS_SESSION, JSON.stringify(s)) : localStorage.removeItem(LS_SESSION); } catch {}
  }
  function savedName() { try { return localStorage.getItem(LS_NAME) || ""; } catch { return ""; } }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const serverNow = () => Date.now() + offset;

  function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($toast.hidden = true), 2600);
  }

  // ---------- 通信 ----------
  function connect() {
    if (!session) return;
    clearTimeout(reconnectTimer);
    intentionalClose = false;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const sock = new WebSocket(`${proto}://${location.host}/ws/${session.code}`);
    ws = sock;
    sock.onopen = () => {
      sock.send(JSON.stringify({ t: "hello", name: session.name, token: session.token }));
    };
    sock.onmessage = (ev) => {
      if (sock !== ws) return;
      const m = JSON.parse(ev.data);
      if (m.t === "welcome") {
        attempt = 0;
        $conn.hidden = true;
        saveSession({ ...session, token: m.token });
      } else if (m.t === "state") {
        onState(m);
      } else if (m.t === "error") {
        onError(m);
      }
    };
    sock.onclose = (ev) => {
      if (sock !== ws) return;
      if (intentionalClose || ev.code === 4001 || ev.code === 4004) return;
      if (ev.code === 4000) {
        snap = null;
        entryError = "別のタブ（または別の画面）でこの部屋が開かれたため、こちらは切断しました。";
        // 保存済みのトークンは、いま部屋を開いている側のタブが使うので消さない
        render();
        return;
      }
      $conn.hidden = false;
      attempt++;
      reconnectTimer = setTimeout(connect, Math.min(400 * attempt, 3000));
    };
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function leave() {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    if (ws) ws.close();
    ws = null;
    snap = null;
    saveSession(null);
    $conn.hidden = true;
    history.replaceState(null, "", "/");
    render();
  }

  function onError(m) {
    if (m.fatal) {
      intentionalClose = true;
      if (ws) ws.close();
      ws = null;
      snap = null;
      saveSession(null);
      $conn.hidden = true;
      entryError = m.message;
      render();
    } else {
      pendingBuzz = false;
      toast(m.message);
      render();
    }
  }

  function onState(m) {
    offset = m.now - Date.now();
    delta = new Map();
    for (const p of m.players) {
      const before = prevScores.get(p.id);
      if (before !== undefined && before !== p.score) delta.set(p.id, p.score - before);
    }
    prevScores = new Map(m.players.map((p) => [p.id, p.score]));
    pendingBuzz = false;
    snap = m;
    render();
  }

  // ---------- 描画 ----------
  function render() {
    document.body.dataset.phase = snap ? snap.phase : "entry";
    if (!snap) return renderEntry();
    if (snap.phase === "lobby") return renderLobby();
    if (snap.phase === "final") return renderFinal();
    return renderGame();
  }

  function renderEntry() {
    if (view === "entry") {
      const e = document.getElementById("entry-error");
      if (e) { e.textContent = entryError; e.hidden = !entryError; }
      return;
    }
    view = "entry";
    const urlCode = (new URLSearchParams(location.search).get("room") || "").toUpperCase().slice(0, 4);
    $app.innerHTML = `
      <section class="hero">
        <h1 class="logo">早押し<span>クイズ</span>バトル</h1>
        <p class="tagline">最大4人でオンライン対戦。先に押した人だけが答えられる！</p>
      </section>
      <section class="entry">
        <div id="entry-error" class="error" data-testid="entry-error" role="alert" ${entryError ? "" : "hidden"}>${esc(entryError)}</div>
        <div class="panel">
          <label class="field" for="name">あなたの名前（1〜12文字）</label>
          <input id="name" class="input" data-testid="name-input" maxlength="12" autocomplete="off" value="${esc(savedName())}" placeholder="例：たろう">
        </div>
        <div class="panel row">
          <h2>部屋を作る</h2>
          <button id="create" class="btn block" data-testid="create-btn">部屋を作る</button>
        </div>
        <div class="panel row">
          <h2>部屋コードで参加する</h2>
          <input id="code" class="input code-input" data-testid="code-input" maxlength="4" autocomplete="off" inputmode="latin" placeholder="ABCD" value="${esc(urlCode)}">
          <button id="join" class="btn secondary block" data-testid="join-btn">参加する</button>
        </div>
      </section>`;
    const $name = document.getElementById("name");
    const $code = document.getElementById("code");
    const getName = () => $name.value.trim();
    const setErr = (msg) => {
      entryError = msg;
      const e = document.getElementById("entry-error");
      e.textContent = msg;
      e.hidden = !msg;
    };
    const begin = (code) => {
      try { localStorage.setItem(LS_NAME, getName()); } catch {}
      saveSession({ code, token: "", name: getName() });
      entryError = "";
      connect();
    };
    document.getElementById("create").onclick = async () => {
      if (!getName()) return setErr("名前を入力してください");
      setErr("");
      try {
        const r = await fetch("/api/rooms", { method: "POST" });
        if (!r.ok) throw new Error((await r.json()).error || "部屋を作れませんでした");
        begin((await r.json()).code);
      } catch (e) {
        setErr(e.message || "部屋を作れませんでした");
      }
    };
    document.getElementById("join").onclick = () => {
      const code = $code.value.trim().toUpperCase();
      if (!getName()) return setErr("名前を入力してください");
      if (code.length !== 4) return setErr("部屋コード（4文字）を入力してください");
      begin(code);
    };
    $code.oninput = () => { $code.value = $code.value.toUpperCase(); };
    for (const el of [$name, $code]) el.onkeydown = (e) => { if (e.key === "Enter") document.getElementById(el === $name ? "create" : "join").click(); };
  }

  function colorOf(id) {
    const i = snap.players.findIndex((p) => p.id === id);
    return COLORS[(i < 0 ? 0 : i) % COLORS.length];
  }
  const avatar = (p) => `<div class="avatar" style="background:${colorOf(p.id)}">${esc([...p.name][0] || "?")}</div>`;

  function topbar() {
    return `
      <header class="topbar">
        <div class="brand">早押し<span>クイズ</span>バトル</div>
        <div class="roomcode"><small>部屋コード</small><b data-testid="room-code">${esc(snap.code)}</b>
          <button class="btn ghost" id="copy" type="button">リンクをコピー</button></div>
      </header>`;
  }
  function bindTopbar() {
    const b = document.getElementById("copy");
    if (b) b.onclick = async () => {
      const url = `${location.origin}/?room=${snap.code}`;
      try { await navigator.clipboard.writeText(url); toast("招待リンクをコピーしました"); } catch { toast(url); }
    };
  }

  function renderLobby() {
    view = "lobby";
    const isHost = snap.hostId === snap.you;
    const n = snap.players.length;
    const slots = [];
    for (let i = 0; i < snap.config.maxPlayers; i++) {
      const p = snap.players[i];
      slots.push(p
        ? `<div class="slot filled" data-testid="lobby-player" data-name="${esc(p.name)}">
             <div>${avatar(p)}<div class="pname">${esc(p.name)}${p.id === snap.you ? ' <span style="white-space:nowrap;color:var(--muted);font-size:13px">（あなた）</span>' : ""}</div>
             ${p.id === snap.hostId ? '<span class="badge host">ホスト</span>' : ""}${p.connected ? "" : '<span class="badge off">接続切れ</span>'}</div></div>`
        : `<div class="slot" data-testid="lobby-empty"><div>参加待ち…</div></div>`);
    }
    const can = n >= snap.config.minPlayers;
    $app.innerHTML = `${topbar()}
      <section class="panel">
        <h2>ロビー（${n} / ${snap.config.maxPlayers}人）</h2>
        <div class="lobby-grid">${slots.join("")}</div>
        <div class="lobby-foot">
          ${isHost
            ? `<button id="start" class="btn" data-testid="start-btn" ${can ? "" : "disabled"}>ゲーム開始</button>
               <div class="hint" data-testid="lobby-hint">${can ? "全員そろったら開始を押してください" : `開始には${snap.config.minPlayers}人以上必要です。部屋コードを友だちに伝えよう`}</div>`
            : `<div class="hint" data-testid="lobby-hint">ホストがゲームを始めるのを待っています…</div>`}
          <button id="leave" class="btn ghost" type="button">部屋を出る</button>
        </div>
      </section>`;
    bindTopbar();
    const s = document.getElementById("start");
    if (s) s.onclick = () => send({ t: "start" });
    document.getElementById("leave").onclick = leave;
  }

  function scoreboard() {
    return `<div class="board" data-testid="board">${snap.players.map((p) => {
      const answering = snap.answererId === p.id;
      const d = delta.get(p.id);
      const status = answering ? "回答中！" : !p.connected ? "接続切れ" : p.locked && (snap.phase === "question" || snap.phase === "answering") ? "お休み" : p.id === snap.you ? "あなた" : "&nbsp;";
      return `<div class="pcard ${p.id === snap.you ? "me" : ""} ${answering ? "answering" : ""} ${p.locked && !answering && snap.phase !== "reveal" ? "locked" : ""} ${p.connected ? "" : "offline"} ${d > 0 ? "gain" : d < 0 ? "loss" : ""}"
          data-testid="pcard" data-name="${esc(p.name)}" data-score="${p.score}" data-answering="${answering}">
          ${avatar(p)}<div><div class="pname">${esc(p.name)}</div><div class="status">${status}</div></div>
          <div class="score" data-testid="score">${p.score}</div></div>`;
    }).join("")}</div>`;
  }

  function renderGame() {
    view = "game";
    const q = snap.question;
    const me = snap.players.find((p) => p.id === snap.you);
    const nameOf = (id) => snap.players.find((p) => p.id === id)?.name ?? "?";
    const mineAnswering = snap.phase === "answering" && snap.answererId === snap.you;
    const rev = snap.reveal;

    let center = "";
    if (snap.phase === "question") {
      const locked = !!me?.locked;
      center = `<div class="buzzzone">
        <button id="buzz" class="buzz" data-testid="buzz-btn" ${locked ? "disabled" : ""}>${locked ? "この問題は<br>押せません" : "押す！"}</button>
        <div class="hint">${locked ? "ほかの人の回答を待っています" : "スペースキーでも押せます"}</div></div>`;
    } else if (snap.phase === "answering") {
      center = mineAnswering
        ? `<div class="banner mine" data-testid="banner">あなたの番！選択肢を選んでください<small>回答の残り <b id="atxt">--</b></small></div>`
        : `<div class="banner" data-testid="banner">${esc(nameOf(snap.answererId))}さんが回答中…<small>回答の残り <b id="atxt">--</b></small></div>`;
    } else if (rev) {
      const w = rev.winnerId ? nameOf(rev.winnerId) : "";
      const text = rev.outcome === "correct" ? `${esc(w)}さん正解！` : rev.outcome === "allWrong" ? "全員不正解…" : "時間切れ！";
      const cls = rev.outcome === "correct" ? "good" : "bad";
      center = `<div class="banner ${cls}" data-testid="banner">${text}<small data-testid="reveal-answer">正解は「${esc(q.choices[rev.correctIndex])}」 ・ 次の問題まで <b id="rtxt">--</b></small></div>`;
    }

    const choices = q.choices.map((c, i) => {
      const cls = rev ? (i === rev.correctIndex ? "correct" : "dim") : mineAnswering ? "live" : "";
      return `<button class="choice ${cls}" data-testid="choice-${i}" data-i="${i}" ${mineAnswering ? "" : "disabled"}>
        <span class="mark">${"ABCD"[i]}</span><span>${esc(c)}</span></button>`;
    }).join("");

    $app.innerHTML = `${topbar()}
      <div class="game">
        <section class="stage">
          <div class="qhead">
            <div class="qnum" data-testid="qnum">第 ${snap.qIndex + 1} 問 / ${snap.total}</div>
            <div class="timerbar"><i id="tbar"></i></div>
            <div class="timertxt" id="ttxt" data-testid="timer">--</div>
          </div>
          <div class="question" data-testid="question-text">${esc(q.text)}</div>
          <div class="choices">${choices}</div>
          ${center}
        </section>
        <aside class="side">
          ${scoreboard()}
          <div class="feed" data-testid="feed">${snap.log.map((l) => `<div class="k-${l.kind}">${esc(l.text)}</div>`).join("")}</div>
        </aside>
      </div>`;
    bindTopbar();
    const b = document.getElementById("buzz");
    if (b) b.onpointerdown = (e) => { e.preventDefault(); doBuzz(); };
    for (const el of document.querySelectorAll(".choice.live")) el.onclick = () => send({ t: "answer", choice: Number(el.dataset.i) });
    tickTimers();
  }

  function doBuzz() {
    if (!snap || snap.phase !== "question" || pendingBuzz) return;
    const me = snap.players.find((p) => p.id === snap.you);
    if (me?.locked) return;
    pendingBuzz = true;
    const b = document.getElementById("buzz");
    if (b) { b.disabled = true; b.innerHTML = "判定中…"; }
    send({ t: "buzz" });
  }

  function renderFinal() {
    view = "final";
    const medal = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r);
    const mine = snap.ranking.find((r) => r.id === snap.you);
    $app.innerHTML = `${topbar()}
      <section class="final">
        <div class="hint">全${snap.total}問終了</div>
        <h1 data-testid="final-title">最終結果</h1>
        <ol class="rank-list" data-testid="final-ranking">${snap.ranking.map((r) => {
          const p = snap.players.find((x) => x.id === r.id);
          return `<li class="rank r${r.rank} ${r.id === snap.you ? "me" : ""}" data-testid="rank-row" data-rank="${r.rank}" data-name="${esc(r.name)}" data-score="${r.score}">
            <div class="no">${medal(r.rank)}</div>${avatar(p)}<div class="pname">${esc(r.name)}</div>
            <div class="pts">${r.score}<small>点</small></div></li>`;
        }).join("")}</ol>
        <p class="hint" data-testid="my-rank">あなたは ${mine ? mine.rank : "-"} 位でした</p>
        <button id="leave" class="btn" data-testid="back-btn">最初に戻る</button>
      </section>`;
    bindTopbar();
    document.getElementById("leave").onclick = leave;
  }

  // ---------- タイマー表示（サーバー時刻の締め切りから計算） ----------
  const sec = (ms) => (Math.max(0, ms) / 1000).toFixed(1) + "秒";
  function tickTimers() {
    if (!snap || view !== "game") return;
    const now = serverNow();
    const bar = document.getElementById("tbar");
    const txt = document.getElementById("ttxt");
    if (!bar || !txt) return;
    let remain, total;
    if (snap.phase === "reveal") {
      remain = snap.revealUntil - now; total = snap.config.revealMs;
      txt.textContent = "";
    } else {
      remain = snap.questionDeadline - now; total = snap.config.questionMs;
      txt.textContent = sec(remain);
    }
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, remain / total))})`;
    const a = document.getElementById("atxt");
    if (a && snap.answerDeadline) a.textContent = sec(snap.answerDeadline - now);
    const r = document.getElementById("rtxt");
    if (r && snap.revealUntil) r.textContent = Math.ceil(Math.max(0, snap.revealUntil - now) / 1000) + "秒";
  }
  setInterval(tickTimers, 100);

  // ---------- キーボード ----------
  document.addEventListener("keydown", (e) => {
    if (!snap || e.repeat || e.target instanceof HTMLInputElement) return;
    if ((e.key === " " || e.key === "Enter") && snap.phase === "question") { e.preventDefault(); doBuzz(); return; }
    const idx = "abcd".indexOf(e.key.toLowerCase());
    const n = idx >= 0 ? idx : "1234".indexOf(e.key);
    if (n >= 0 && snap.phase === "answering" && snap.answererId === snap.you) send({ t: "answer", choice: n });
  });

  // ---------- 起動 ----------
  if (session && session.code) connect();
  render();
})();
