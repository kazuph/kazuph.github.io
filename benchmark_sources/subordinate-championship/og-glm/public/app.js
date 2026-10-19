/* 早押しクイズ クライアント (vanilla JS, バンドラ不要) */
"use strict";

(() => {
	const $ = (id) => document.getElementById(id);

	const els = {
		body: document.body,
		roomBadge: $("room-badge"),
		roomCode: $("room-code"),
		entry: $("screen-entry"),
		entryError: $("entry-error"),
		nameInput: $("name-input"),
		codeInput: $("code-input"),
		btnCreate: $("btn-create"),
		btnJoin: $("btn-join"),
		game: $("screen-game"),
		playersStrip: $("players-strip"),
		lobbyBox: $("lobby-box"),
		lobbyCount: $("lobby-count"),
		btnStart: $("btn-start"),
		startNote: $("start-note"),
		quizBox: $("quiz-box"),
		qProgress: $("q-progress"),
		timerFill: $("timer-fill"),
		qText: $("q-text"),
		choices: $("choices"),
		statusLine: $("status-line"),
		buzzer: $("btn-buzzer"),
		result: $("screen-result"),
		ranking: $("ranking"),
		btnAgain: $("btn-again"),
		toast: $("toast"),
	};

	const LETTERS = ["A", "B", "C", "D"];
	const STATE = {
		code: null,
		token: null,
		playerId: null,
		name: null,
		ws: null,
		wsOpen: false,
		closedByUs: false,
		retry: 0,
		retryTimer: null,
		last: null, // 最後の state メッセージ
		offset: 0, // Date.now() - serverNow
		choiceEls: [],
		repliedChoice: null, // 自分が解答した選択肢 (reveal 表示用)
	};

	// ---------- ユーティリティ ----------

	function genCode() {
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		const buf = crypto.getRandomValues(new Uint8Array(4));
		return [...buf].map((n) => chars[n % chars.length]).join("");
	}

	function showToast(msg, ms = 4000) {
		els.toast.textContent = msg;
		els.toast.hidden = false;
		clearTimeout(showToast._t);
		showToast._t = setTimeout(() => (els.toast.hidden = true), ms);
	}

	function showScreen(id) {
		for (const s of document.querySelectorAll(".screen")) s.classList.remove("visible");
		$(id).classList.add("visible");
	}

	function saveSession() {
		if (STATE.code && STATE.token) {
			sessionStorage.setItem(
				`quiz:${STATE.code}`,
				JSON.stringify({ token: STATE.token, name: STATE.name }),
			);
		}
	}

	function loadSession(code) {
		try {
			return JSON.parse(sessionStorage.getItem(`quiz:${code}`) || "null");
		} catch {
			return null;
		}
	}

	function serverNow() {
		return Date.now() - STATE.offset;
	}

	// ---------- WebSocket ----------

	function connect(code, token, name) {
		clearTimeout(STATE.retryTimer);
		STATE.closedByUs = false;
		const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/room/${code}/ws`;
		const ws = new WebSocket(url);
		STATE.ws = ws;
		ws.addEventListener("open", () => {
			STATE.wsOpen = true;
			ws.send(JSON.stringify({ type: "join", name, token: token ?? undefined }));
		});
		ws.addEventListener("message", (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.type === "state") onState(msg);
			else if (msg.type === "error") onError(msg);
		});
		ws.addEventListener("close", (ev) => {
			STATE.wsOpen = false;
			if (STATE.closedByUs || STATE.ws !== ws) return;
			if (ev.code === 4000 || ev.code === 4001) return; // 満員/進行中は onError 済み
			scheduleReconnect(code, token, name);
		});
		ws.addEventListener("error", () => {});
	}

	function scheduleReconnect(code, token, name) {
		STATE.retry++;
		const delay = Math.min(5000, 500 * 2 ** Math.min(STATE.retry, 3));
		showToast(`回線が切れました。${Math.round(delay / 1000)}秒後に再接続します…`);
		STATE.retryTimer = setTimeout(() => connect(code, token, name), delay);
	}

	function onError(msg) {
		els.entryError.textContent = msg.message;
		els.entryError.hidden = false;
		if (msg.reason === "full" || msg.reason === "in-progress") {
			STATE.closedByUs = true;
			STATE.ws?.close();
			// 満員などで入れなかった場合は入力画面へ戻る
			if (els.game.classList.contains("visible")) {
				showScreen("screen-entry");
			}
		}
	}

	// ---------- state 描画 ----------

	function onState(msg) {
		STATE.offset = Date.now() - msg.now;
		STATE.last = msg;
		STATE.retry = 0;
		STATE.playerId = msg.you;
		if (msg.token) {
			// 初回参加時: サーバーが発行したトークンを保存し、再読み込み後の復帰に使う
			STATE.token = msg.token;
			saveSession();
		}
		els.entryError.hidden = true;

		renderPlayers(msg);
		renderPhase(msg);
	}

	function renderPlayers(msg) {
		els.playersStrip.replaceChildren(
			...msg.players.map((p) => {
				const chip = document.createElement("div");
				chip.className =
					"player-chip" +
					(p.id === msg.you ? " me" : "") +
					(p.id === msg.answering ? " answering" : "") +
					(p.connected ? "" : " offline");
				const dot = document.createElement("span");
				dot.className = "dot";
				dot.title = p.connected ? "オンライン" : "オフライン";
				const name = document.createElement("span");
				name.textContent = (p.isHost ? "👑 " : "") + p.name;
				const score = document.createElement("span");
				score.className = "score";
				const delta = scoreDelta(p, msg);
				if (delta) {
					const d = document.createElement("span");
					d.className = "score-delta " + (delta > 0 ? "plus" : "minus");
					d.textContent = delta > 0 ? `+${delta}` : `${delta}`;
					score.appendChild(d);
				}
				score.appendChild(document.createTextNode(`${p.score}`));
				chip.append(dot, name, score);
				return chip;
			}),
		);
	}

	function scoreDelta(p, msg) {
		if (!msg.lastEvent || msg.lastEvent.playerId !== p.id) return 0;
		if (msg.lastEvent.kind === "answer") return msg.lastEvent.correct ? 10 : -5;
		return 0;
	}

	function renderPhase(msg) {
		els.body.classList.remove("lobby", "question", "reveal", "finished", "answering");
		els.roomBadge.hidden = false;
		els.roomCode.textContent = STATE.code;

		if (msg.phase === "lobby") {
			showScreen("screen-game");
			els.lobbyBox.hidden = false;
			els.quizBox.hidden = true;
			els.body.classList.add("lobby");
			const n = msg.players.length;
			els.lobbyCount.textContent = `現在 ${n}人 / 定員4人`;
			const me = msg.players.find((p) => p.id === msg.you);
			const isHost = !!me?.isHost;
			els.btnStart.hidden = !isHost;
			els.btnStart.disabled = !(n >= 2 && n <= 4);
			els.startNote.textContent = isHost
				? n < 2
					? "2人以上で開始できます"
					: "準備ができたら開始!"
				: "ホストが開始するのを待っています…";
			return;
		}

		if (msg.phase === "finished") {
			showScreen("screen-result");
			els.body.classList.add("finished");
			const sorted = [...msg.players].sort((a, b) => b.score - a.score);
			els.ranking.replaceChildren(
				...sorted.map((p, i) => {
					const li = document.createElement("li");
					const rank = document.createElement("span");
					rank.className = "rank";
					rank.textContent = ["🥇", "🥈", "🥉", "4"][i] ?? `${i + 1}`;
					const name = document.createElement("span");
					name.className = "r-name";
					name.textContent = p.name + (p.id === msg.you ? " (あなた)" : "");
					const score = document.createElement("span");
					score.className = "r-score";
					score.textContent = `${p.score}点`;
					li.append(rank, name, score);
					return li;
				}),
			);
			return;
		}

		// question / reveal
		showScreen("screen-game");
		els.lobbyBox.hidden = true;
		els.quizBox.hidden = false;
		els.body.classList.add(msg.phase === "question" ? "question" : "reveal");

		els.qProgress.textContent = `第 ${msg.qIndex + 1} 問 / 全 ${msg.totalQuestions} 問`;
		els.qText.textContent = msg.question.text;

		renderChoices(msg);
		renderStatus(msg);
		startTimer(msg);
	}

	function renderChoices(msg) {
		const q = msg.question;
		const reveal = msg.phase === "reveal";
		const iAmAnswering = msg.answering === msg.you;
		const me = msg.players.find((p) => p.id === msg.you);
		STATE.repliedChoice = null;

		els.choices.replaceChildren(
			...q.choices.map((c, i) => {
				const b = document.createElement("button");
				b.className = "choice";
				b.dataset.label = LETTERS[i];
				b.textContent = c;
				b.disabled = true;
				if (reveal) {
					if (i === msg.answer) b.classList.add("correct");
					if (msg.lastEvent?.kind === "answer" && !msg.lastEvent.correct && lastEventPick(msg) === i) {
						b.classList.add("wrong-pick");
					}
				} else if (iAmAnswering) {
					b.disabled = false;
					b.addEventListener("click", () => {
						STATE.repliedChoice = i;
						for (const x of els.choices.querySelectorAll("button")) x.disabled = true;
						send({ type: "answer", choice: i });
					});
				}
				return b;
			}),
		);
		// 誤答で押せない人はその旨をボタン上に出す
		if (!reveal && me?.locked) {
			for (const b of els.choices.querySelectorAll("button")) b.disabled = true;
		}
	}

	function lastEventPick(msg) {
		return msg.lastEvent && msg.lastEvent.kind === "answer" ? msg.lastEvent.choice : null;
	}

	function renderStatus(msg) {
		const el = els.statusLine;
		el.replaceChildren();
		if (msg.phase === "reveal") {
			els.buzzer.disabled = true;
			const ev = msg.lastEvent;
			const div = document.createElement("div");
			if (ev && ev.kind === "answer" && ev.correct) {
				const name = nameOf(msg, ev.playerId);
				div.textContent = `⭕ 正解! ${name === msg.you ? "あなた" : name} さん +10点`;
				div.className = "reveal-banner good";
			} else if (ev && ev.kind === "answer") {
				const name = nameOf(msg, ev.playerId);
				div.textContent = `❌ はずれ… ${name === msg.you ? "あなた" : name} さん -5点`;
				div.className = "reveal-banner bad";
			} else if (ev && ev.kind === "timeout") {
				div.textContent = `⏰ 誰も答えられませんでした`;
				div.className = "reveal-banner bad";
			} else {
				div.textContent = `⏰ 時間切れ`;
				div.className = "reveal-banner bad";
			}
			el.appendChild(div);
			return;
		}

		// question フェーズ
		const me = msg.players.find((p) => p.id === msg.you);
		els.buzzer.disabled = !!msg.answering || !!me?.locked;
		if (msg.answering) {
			els.body.classList.add("answering");
			const name = nameOf(msg, msg.answering);
			const span = document.createElement("span");
			if (msg.answering === msg.you) {
				span.textContent = "🎉 あなたが回答権を獲得! 10秒以内に答えて!";
			} else {
				span.innerHTML = `<span class="who"></span> さんが押しました! 回答中…`;
				span.querySelector(".who").textContent = name;
			}
			el.appendChild(span);
		} else {
			if (me?.locked) {
				els.statusLine.textContent = "❌ この問題はもう押せません";
			} else {
				els.statusLine.textContent = "早い者勝ち! 押した人が回答権をゲット";
			}
		}
	}

	function nameOf(msg, id) {
		return msg.players.find((p) => p.id === id)?.name ?? "???";
	}

	function startTimer(msg) {
		cancelAnimationFrame(startTimer._raf);
		function tick() {
			const remain = Math.max(0, msg.deadline - serverNow());
			// 全体の制限時間を基準にゲージを描く(回答中は10秒基準)
			const denom = msg.phase === "question" && msg.answering ? 10000 : 20000;
			const frac = Math.min(1, remain / denom);
			els.timerFill.style.width = `${frac * 100}%`;
			els.timerFill.classList.toggle("low", remain < 5000);
			if (remain > 0) startTimer._raf = requestAnimationFrame(tick);
		}
		tick();
	}

	function send(obj) {
		if (STATE.ws && STATE.wsOpen) STATE.ws.send(JSON.stringify(obj));
	}

	// ---------- エントリ画面 ----------

	function start(code, name, token) {
		STATE.code = code;
		STATE.name = name;
		STATE.token = token ?? null;
		saveSession();
		location.hash = `#/room/${code}`;
		showScreen("screen-game");
		els.lobbyBox.hidden = false;
		els.quizBox.hidden = true;
		els.playersStrip.replaceChildren();
		connect(code, STATE.token, name);
	}

	els.btnCreate.addEventListener("click", () => {
		const name = els.nameInput.value.trim();
		if (!name) {
			els.entryError.textContent = "なまえを入力してください";
			els.entryError.hidden = false;
			return;
		}
		start(genCode(), name, null);
	});

	els.btnJoin.addEventListener("click", () => {
		const name = els.nameInput.value.trim();
		const code = els.codeInput.value.trim().toUpperCase();
		if (!name) {
			els.entryError.textContent = "なまえを入力してください";
			els.entryError.hidden = false;
			return;
		}
		if (!/^[A-Z0-9]{3,8}$/.test(code)) {
			els.entryError.textContent = "部屋コードを入力してください";
			els.entryError.hidden = false;
			return;
		}
		start(code, name, loadSession(code)?.token ?? null);
	});

	els.btnStart.addEventListener("click", () => send({ type: "start" }));
	els.buzzer.addEventListener("click", () => send({ type: "buzz" }));

	els.btnAgain.addEventListener("click", () => {
		for (let i = 0; i < sessionStorage.length; i++) {
			const k = sessionStorage.key(i);
			if (k?.startsWith("quiz:")) sessionStorage.removeItem(k);
		}
		location.hash = "";
		showScreen("screen-entry");
	});

	// ---------- 初期化 ----------

	(function init() {
		const m = location.hash.match(/^#\/room\/([A-Za-z0-9]{3,8})/);
		if (m) els.codeInput.value = m[1];
		const saved = m ? loadSession(m[1]) : null;
		if (saved) {
			// リロード・タブ復帰: 同じプレイヤーとして自動再参加
			start(m[1], saved.name, saved.token);
		}
	})();
})();
