"use strict";
/* 早押しクイズ クライアント: RESTで入室 → WebSocketで同期。トークンはlocalStorageに保存し再読み込み復帰する。 */
const $ = (id) => document.getElementById(id);
const els = {
  conn: $("conn"), connText: $("connText"),
  home: $("screen-home"), lobby: $("screen-lobby"), game: $("screen-game"), result: $("screen-result"),
  name: $("nameInput"), code: $("codeInput"),
  createBtn: $("createBtn"), joinBtn: $("joinBtn"), homeError: $("homeError"),
  roomCode: $("roomCode"), copyBtn: $("copyBtn"),
  memberList: $("memberList"), memberCount: $("memberCount"),
  startBtn: $("startBtn"), leaveBtn: $("leaveBtn"), lobbyError: $("lobbyError"), startHint: $("startHint"),
  qNum: $("qNum"), phaseBadge: $("phaseBadge"), timerFill: $("timerFill"), timerText: $("timerText"),
  qText: $("qText"), choices: $("choices"), buzzBtn: $("buzzBtn"), buzzMsg: $("buzzMsg"),
  lockNote: $("lockNote"), revealBox: $("revealBox"), gameError: $("gameError"),
  scoreList: $("scoreList"), roomCodeMini: $("roomCodeMini"), youName: $("youName"), leaveBtn2: $("leaveBtn2"),
  rankList: $("rankList"), againBtn: $("againBtn"), leaveBtn3: $("leaveBtn3"),
  toast: $("toast"),
};

const S = {
  roomCode: null, playerId: null, token: null, name: "",
  ws: null, state: null, offset: 0, reconnectTimer: 0, reconnectTries: 0,
};

function storeKey(code) { return `bq:${code}:session`; }
function saveSession() {
  if (!S.roomCode) return;
  try {
    localStorage.setItem(storeKey(S.roomCode), JSON.stringify({
      playerId: S.playerId, token: S.token, name: S.name,
    }));
  } catch { /* ignore */ }
}
function loadSession(code) {
  try {
    const raw = localStorage.getItem(storeKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearSession(code) {
  try { localStorage.removeItem(storeKey(code)); } catch { /* ignore */ }
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { els.toast.hidden = true; }, 2600);
}
function showError(el, msg) {
  if (!msg) { el.hidden = true; el.textContent = ""; return; }
  el.hidden = false; el.textContent = msg;
}
function showOnly(which) {
  for (const k of ["home", "lobby", "game", "result"]) els[k].hidden = (k !== which);
}
function setConn(online, text) {
  els.conn.classList.toggle("online", online);
  els.conn.classList.toggle("offline", !online);
  els.connText.textContent = text;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || `エラー (${res.status})`);
  }
  return data;
}

async function createRoom() {
  const name = els.name.value.trim();
  if (!name) { showError(els.homeError, "名前を入力してください"); return; }
  showError(els.homeError, null);
  els.createBtn.disabled = true;
  try {
    const data = await api("/api/rooms", { name });
    enterRoom(data.roomCode, data.playerId, data.token, name);
  } catch (e) {
    showError(els.homeError, e.message);
  } finally {
    els.createBtn.disabled = false;
  }
}

async function joinRoom() {
  const name = els.name.value.trim();
  const code = els.code.value.trim().toUpperCase();
  if (!name) { showError(els.homeError, "名前を入力してください"); return; }
  if (!code) { showError(els.homeError, "部屋コードを入力してください"); return; }
  showError(els.homeError, null);
  els.joinBtn.disabled = true;
  try {
    const prev = loadSession(code);
    const data = await api(`/api/rooms/${code}/join`, {
      name, token: prev?.token || undefined,
    });
    enterRoom(data.roomCode, data.playerId, data.token, name);
    if (data.isRejoin) showToast("前回の続きから復帰しました");
  } catch (e) {
    showError(els.homeError, e.message);
  } finally {
    els.joinBtn.disabled = false;
  }
}

function enterRoom(code, playerId, token, name) {
  S.roomCode = code; S.playerId = playerId; S.token = token; S.name = name;
  saveSession();
  const u = new URL(location.href);
  u.searchParams.set("room", code);
  history.replaceState(null, "", u.toString());
  connectWs();
}

function connectWs() {
  if (S.ws) { try { S.ws.close(); } catch { /* ignore */ } S.ws = null; }
  if (!S.roomCode || !S.token) return;
  setConn(false, "接続中…");
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/api/rooms/${S.roomCode}/ws?token=${encodeURIComponent(S.token)}`);
  S.ws = ws;
  ws.onopen = () => {
    S.reconnectTries = 0;
    setConn(true, "接続中");
  };
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === "state") {
      S.offset = msg.state.serverNow - Date.now();
      S.state = msg.state;
      render();
    } else if (msg.type === "error") {
      showToast(msg.message || "エラー");
      const st = S.state?.phase;
      if (st === "lobby" || !st) showError(els.lobbyError, msg.message);
      else showError(els.gameError, msg.message);
      setTimeout(() => { showError(els.gameError, null); showError(els.lobbyError, null); }, 3000);
    }
  };
  ws.onclose = () => {
    setConn(false, "再接続中…");
    scheduleReconnect();
  };
  ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
}

function scheduleReconnect() {
  clearTimeout(S.reconnectTimer);
  S.reconnectTries += 1;
  const wait = Math.min(1000 * S.reconnectTries, 5000);
  S.reconnectTimer = setTimeout(() => {
    if (!S.roomCode) return;
    connectWs();
  }, wait);
}

function send(msg) {
  if (S.ws && S.ws.readyState === WebSocket.OPEN) S.ws.send(JSON.stringify(msg));
}

function me() {
  return S.state?.players.find((p) => p.id === S.playerId) || null;
}
function isHost() { return !!me()?.isHost; }

/* ---------- 描画 ---------- */
function render() {
  const st = S.state;
  if (!st) return;
  if (st.phase === "lobby") renderLobby(st);
  else if (st.phase === "finished") renderResult(st);
  else renderGame(st);
}

function renderLobby(st) {
  showOnly("lobby");
  els.roomCode.textContent = st.code;
  els.memberCount.textContent = `${st.players.length}/4`;
  els.memberList.innerHTML = "";
  for (const p of st.players) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = p.name;
    if (p.isHost) { const h = document.createElement("span"); h.className = "pill host"; h.textContent = "ホスト"; left.appendChild(h); }
    if (p.id === S.playerId) { const m = document.createElement("span"); m.className = "pill me"; m.textContent = "あなた"; left.appendChild(m); }
    if (!p.connected) { const o = document.createElement("span"); o.className = "pill off"; o.textContent = "切断中"; left.appendChild(o); }
    const right = document.createElement("span");
    right.textContent = `${p.score}点`;
    li.appendChild(left); li.appendChild(right);
    els.memberList.appendChild(li);
  }
  const canStart = isHost() && st.players.length >= 2 && st.players.length <= 4;
  els.startBtn.disabled = !canStart;
  els.startBtn.textContent = isHost() ? "ゲーム開始" : "ホストの開始待ち…";
  els.startHint.textContent = !isHost()
    ? "ホストが開始するのを待っています"
    : st.players.length < 2
      ? `あと${2 - st.players.length}人来たら開始できます（最大4人）`
      : "全員そろったら開始を押してください";
}

const PHASE_LABEL = { question: "出題中", answering: "回答中", reveal: "正解発表" };

function renderGame(st) {
  showOnly("game");
  const idx = Math.min(st.questionIndex, st.totalQuestions - 1);
  els.qNum.textContent = `第${idx + 1}問 / 全${st.totalQuestions}問`;
  const badge = PHASE_LABEL[st.phase] || st.phase;
  let badgeText = badge;
  if (st.phase === "answering" && st.buzzWinnerName) {
    badgeText = st.buzzWinnerId === S.playerId ? "あなたが回答中！" : `${st.buzzWinnerName} が回答中…`;
  }
  els.phaseBadge.textContent = badgeText;
  els.phaseBadge.className = "badge" + (st.phase === "answering" ? " answering" : st.phase === "reveal" ? " reveal" : "");
  els.qText.textContent = st.question ? st.question.text : "---";
  els.roomCodeMini.textContent = st.code;
  els.youName.textContent = me()?.name || "-";

  const locked = st.lockedOut.includes(S.playerId);
  els.lockNote.hidden = !locked;

  // 正解表示
  const lr = st.lastResult;
  if (st.phase === "reveal" && lr) {
    els.revealBox.hidden = false;
    const correctText = st.correctIndex !== null && st.question ? st.question.choices[st.correctIndex] : "";
    if (lr.kind === "correct") {
      els.revealBox.className = "reveal ok";
      els.revealBox.textContent = `⭕ ${lr.playerName} が正解！ +10点（正解：${correctText}）`;
    } else if (lr.kind === "wrong" || lr.kind === "reveal") {
      els.revealBox.className = "reveal ng";
      els.revealBox.textContent = `❌ ${lr.playerName || "回答者"} は不正解… −5点（正解：${correctText}）`;
    } else {
      els.revealBox.className = "reveal ng";
      els.revealBox.textContent = `⏰ 時間切れ！正解は「${correctText}」でした`;
    }
  } else if (st.phase === "answering" && st.buzzWinnerId && st.buzzWinnerId !== S.playerId) {
    els.revealBox.hidden = false;
    els.revealBox.className = "reveal";
    els.revealBox.textContent = `💡 ${st.buzzWinnerName} が早押し成功！回答を待っています…`;
  } else if (lr && (lr.kind === "wrong" || lr.kind === "timeout-answer") && st.phase === "question") {
    els.revealBox.hidden = false;
    els.revealBox.className = "reveal ng";
    els.revealBox.textContent = lr.kind === "wrong"
      ? `❌ ${lr.playerName} は不正解（−5点）。残りの人で早押し再開！`
      : `⏰ ${lr.playerName || "回答者"} の回答時間切れ。残りの人で早押し再開！`;
  } else {
    els.revealBox.hidden = true;
  }

  // 選択肢（回答権がある本人のみ押せる）
  els.choices.innerHTML = "";
  const canAnswer = st.phase === "answering" && st.buzzWinnerId === S.playerId;
  const labels = ["A", "B", "C", "D"];
  (st.question?.choices || []).forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.disabled = !canAnswer;
    b.textContent = `${labels[i]}. ${text}`;
    if (st.phase === "reveal" && st.correctIndex === i) b.classList.add("correct");
    if ((lr?.kind === "wrong" || lr?.kind === "reveal") && lr.choice === i && lr.playerId !== undefined) {
      if (st.phase === "reveal" && i !== st.correctIndex) b.classList.add("wrong");
    }
    b.onclick = () => { send({ type: "answer", choice: i }); b.disabled = true; };
    els.choices.appendChild(b);
  });

  // 早押しボタン
  const canBuzz = st.phase === "question" && !locked;
  els.buzzBtn.disabled = !canBuzz;
  els.buzzMsg.textContent = st.phase === "answering"
    ? (st.buzzWinnerId === S.playerId ? "あなたが選んでください（10秒以内）" : "他の人が回答中です…")
    : locked ? "この問題はもう押せません"
    : st.phase === "reveal" ? "まもなく次の問題です…"
    : "早押しボタン！サーバーに先に届いた1人が回答できます";

  // スコア
  els.scoreList.innerHTML = "";
  const sorted = [...st.players].sort((a, b) => b.score - a.score);
  for (const p of sorted) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    let mark = "";
    if (st.buzzWinnerId === p.id) mark = "🎙️ ";
    else if (st.lockedOut.includes(p.id)) mark = "🔒 ";
    left.textContent = mark + p.name;
    if (p.id === S.playerId) { const m = document.createElement("span"); m.className = "pill me"; m.textContent = "あなた"; left.appendChild(m); }
    if (!p.connected) { const o = document.createElement("span"); o.className = "pill off"; o.textContent = "切断中"; left.appendChild(o); }
    const right = document.createElement("b");
    right.textContent = `${p.score}点`;
    li.appendChild(left); li.appendChild(right);
    els.scoreList.appendChild(li);
  }
}

function renderResult(st) {
  showOnly("result");
  els.rankList.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉", "4位"];
  (st.ranking || []).forEach((r, i) => {
    const li = document.createElement("li");
    if (i === 0) li.classList.add("rank1");
    const m = document.createElement("span"); m.className = "medal"; m.textContent = medals[i] || `${i + 1}位`;
    const n = document.createElement("span"); n.textContent = r.name + (r.id === S.playerId ? "（あなた）" : "");
    const s = document.createElement("span"); s.className = "rscore"; s.textContent = `${r.score}点`;
    li.appendChild(m); li.appendChild(n); li.appendChild(s);
    els.rankList.appendChild(li);
  });
  els.againBtn.disabled = !isHost();
  els.againBtn.textContent = isHost() ? "もう一度遊ぶ" : "ホストの操作待ち…";
}

/* ---------- タイマー描画ループ ---------- */
function tickTimer() {
  const st = S.state;
  if (st && (st.phase === "question" || st.phase === "answering")) {
    const now = Date.now() + S.offset;
    let remain = 0, total = 1;
    if (st.phase === "answering" && st.answerEndsAt !== null) {
      remain = Math.max(0, (st.answerEndsAt - now) / 1000);
      total = 10;
    } else if (st.questionEndsAt !== null) {
      remain = Math.max(0, (st.questionEndsAt - now) / 1000);
      total = 20;
    }
    els.timerText.textContent = `残り ${remain.toFixed(1)} 秒`;
    const pct = Math.max(0, Math.min(100, (remain / total) * 100));
    els.timerFill.style.width = `${pct}%`;
    els.timerFill.classList.toggle("urgent", remain < 5);
  }
  requestAnimationFrame(tickTimer);
}

/* ---------- イベント ---------- */
els.createBtn.onclick = createRoom;
els.joinBtn.onclick = joinRoom;
els.name.addEventListener("keydown", (e) => { if (e.key === "Enter") createRoom(); });
els.startBtn.onclick = () => send({ type: "start" });
els.buzzBtn.onclick = () => send({ type: "buzz" });
els.againBtn.onclick = () => send({ type: "reset" });
els.copyBtn.onclick = async () => {
  const code = S.state?.code || S.roomCode || "";
  const link = `${location.origin}/?room=${code}`;
  try { await navigator.clipboard.writeText(link); showToast("招待リンクをコピーしました"); }
  catch { showToast(`部屋コード: ${code}`); }
};
function leave() {
  if (S.roomCode) clearSession(S.roomCode);
  if (S.ws) { try { S.ws.close(); } catch { /* ignore */ } }
  S.roomCode = S.playerId = S.token = null; S.state = null;
  const u = new URL(location.href); u.searchParams.delete("room");
  history.replaceState(null, "", u.toString());
  setConn(false, "未接続");
  showOnly("home");
}
els.leaveBtn.onclick = leave;
els.leaveBtn2.onclick = leave;
els.leaveBtn3.onclick = leave;

/* ---------- 初期化：?room=付きURLや保存セッションから復帰 ---------- */
(function init() {
  const params = new URLSearchParams(location.search);
  const code = (params.get("room") || "").toUpperCase();
  if (code) {
    els.code.value = code;
    const sess = loadSession(code);
    if (sess?.token) {
      // 自動復帰：名前は保存値を使い、サーバーがトークンで本人確認する
      S.roomCode = code; S.playerId = sess.playerId; S.token = sess.token; S.name = sess.name || "";
      els.name.value = S.name;
      connectWs();
      showToast("前回の続きに再接続しています…");
    }
  }
  const savedName = (() => { try { return localStorage.getItem("bq:name") || ""; } catch { return ""; } })();
  if (savedName && !els.name.value) els.name.value = savedName;
  els.name.addEventListener("change", () => {
    try { localStorage.setItem("bq:name", els.name.value.trim()); } catch { /* ignore */ }
  });
  setConn(false, "未接続");
  requestAnimationFrame(tickTimer);
})();
