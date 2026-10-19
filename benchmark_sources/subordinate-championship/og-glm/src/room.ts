import type { ClientMessage, LastEvent, Phase, PlayerView, ServerMessage, StateMessage } from "./protocol";
import { QUESTIONS } from "./questions";

const MAX_PLAYERS = 4;

interface Player {
	id: string;
	token: string;
	name: string;
	score: number;
	connected: boolean;
	isHost: boolean;
}

interface SockMeta {
	playerId: string | null;
}

interface Timers {
	question?: number;
	answer?: number;
	reveal?: number;
}

/**
 * 1部屋 = 1 Durable Object。
 *
 * 早押しの「最初の1人だけが回答権を得る」判定は、Durable Object の
 * シングルスレッドなメッセージ処理の上で、await を挟まず同期的に
 * 状態チェックと書き込みを行うことで原子的に保証する。
 * 正誤判定・加点もすべてサーバー側で行う。
 */
export class Room {
	private players = new Map<string, Player>();
	private socks = new Map<WebSocket, SockMeta>();
	private socketsByPlayer = new Map<string, Set<WebSocket>>();

	private phase: Phase = "lobby";
	private qIndex = 0;
	private locked = new Set<string>(); // 今問題でもう押せないプレイヤー
	private answering: string | null = null;
	private lastEvent: LastEvent | null = null;
	private timers: Timers = {};
	private alarmScheduled = 0;

	constructor(
		private state: DurableObjectState,
		private env: {
			QUESTION_MS?: string;
			ANSWER_MS?: string;
			REVEAL_MS?: string;
		},
	) {}

	private get questionMs(): number {
		return Number(this.env.QUESTION_MS ?? "20000");
	}
	private get answerMs(): number {
		return Number(this.env.ANSWER_MS ?? "10000");
	}
	private get revealMs(): number {
		return Number(this.env.REVEAL_MS ?? "4000");
	}

	// ---------- HTTP / WebSocket エントリ ----------

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.endsWith("/ws") && request.headers.get("Upgrade") === "websocket") {
			return this.acceptSocket();
		}
		return new Response("Not Found", { status: 404 });
	}

	private acceptSocket(): Response {
		const pair = new WebSocketPair();
		const server = pair[1];
		server.accept();
		this.socks.set(server, { playerId: null });
		server.addEventListener("message", (ev) => {
			try {
				const msg = JSON.parse(String(ev.data)) as ClientMessage;
				this.onMessage(server, msg);
			} catch {
				this.send(server, { type: "error", reason: "bad-request", message: "不正なメッセージ" });
			}
		});
		server.addEventListener("close", () => this.onSocketClosed(server));
		server.addEventListener("error", () => this.onSocketClosed(server));
		return new Response(null, { status: 101, webSocket: pair[0] });
	}

	private onSocketClosed(sock: WebSocket) {
		const meta = this.socks.get(sock);
		this.socks.delete(sock);
		if (!meta?.playerId) return;
		const set = this.socketsByPlayer.get(meta.playerId);
		set?.delete(sock);
		if (set && set.size === 0) {
			this.socketsByPlayer.delete(meta.playerId);
			const player = this.players.get(meta.playerId);
			if (player && player.connected) {
				player.connected = false;
				if (this.phase === "lobby") this.ensureHost();
				this.broadcast();
			}
		}
	}

	private ensureHost() {
		const anyConnected = [...this.players.values()].some((p) => p.connected);
		if (anyConnected && ![...this.players.values()].some((p) => p.isHost && p.connected)) {
			const next = [...this.players.values()].find((p) => p.connected);
			if (next) {
				for (const p of this.players.values()) p.isHost = false;
				next.isHost = true;
			}
		}
	}

	// ---------- メッセージ処理 ----------

	private onMessage(sock: WebSocket, msg: ClientMessage) {
		switch (msg.type) {
			case "join":
				this.onJoin(sock, msg);
				return;
			case "start":
				this.onStart(sock);
				return;
			case "buzz":
				this.onBuzz(sock);
				return;
			case "answer":
				this.onAnswer(sock, msg);
				return;
			default:
				this.send(sock, { type: "error", reason: "bad-request", message: "不明なメッセージ" });
		}
	}

	private bind(sock: WebSocket, playerId: string) {
		this.socks.set(sock, { playerId });
		if (!this.socketsByPlayer.has(playerId)) this.socketsByPlayer.set(playerId, new Set());
		this.socketsByPlayer.get(playerId)!.add(sock);
	}

	private onJoin(sock: WebSocket, msg: Extract<ClientMessage, { type: "join" }>) {
		const name = String(msg.name ?? "").trim().slice(0, 12) || "名無し";

		// 再接続（トークン一致）
		if (msg.token) {
			for (const p of this.players.values()) {
				if (p.token === msg.token) {
					p.connected = true;
					p.name = name;
					this.bind(sock, p.id);
					this.send(sock, this.snapshot(p.id));
					this.broadcast();
					return;
				}
			}
		}

		if (this.phase !== "lobby") {
			this.send(sock, {
				type: "error",
				reason: "in-progress",
				message: "ゲーム進行中は新しい参加者を受け付けません",
			});
			sock.close(4001, "in-progress");
			return;
		}
		if (this.players.size >= MAX_PLAYERS) {
			this.send(sock, {
				type: "error",
				reason: "full",
				message: "部屋が満員です（定員4人）",
			});
			sock.close(4000, "full");
			return;
		}

		const id = crypto.randomUUID();
		const player: Player = {
			id,
			token: crypto.randomUUID(),
			name,
			score: 0,
			connected: true,
			isHost: this.players.size === 0,
		};
		this.players.set(id, player);
		this.bind(sock, id);
		this.send(sock, { ...this.snapshot(id), token: player.token } as StateMessage & { token: string });
		this.broadcast();
	}

	private onStart(sock: WebSocket) {
		const meta = this.socks.get(sock);
		const player = meta?.playerId ? this.players.get(meta.playerId) : undefined;
		if (!player?.isHost) {
			this.send(sock, { type: "error", reason: "not-host", message: "ホストだけが開始できます" });
			return;
		}
		if (this.phase !== "lobby" || this.players.size < 2 || this.players.size > MAX_PLAYERS) {
			this.send(sock, {
				type: "error",
				reason: "cannot-start",
				message: "開始できるのは2〜4人のときだけです",
			});
			return;
		}
		this.beginQuestion(0);
	}

	/**
	 * 早押し。
	 * Durable Object はイベントを順次処理するため、この関数内の
	 * 「回答権が空いているかの判定」と「占有」の間に await が無い = 原子的。
	 * 4人が同時に押しても、最初に処理された1人だけが回答権を得る。
	 */
	private onBuzz(sock: WebSocket) {
		const meta = this.socks.get(sock);
		const playerId = meta?.playerId;
		if (!playerId || this.phase !== "question") return;
		if (this.answering !== null || this.locked.has(playerId)) return;
		this.answering = playerId;
		this.timers.answer = Date.now() + this.answerMs;
		this.lastEvent = { kind: "buzz", playerId };
		this.scheduleAlarm();
		this.broadcast();
	}

	private onAnswer(sock: WebSocket, msg: Extract<ClientMessage, { type: "answer" }>) {
		const meta = this.socks.get(sock);
		const playerId = meta?.playerId;
		const player = playerId ? this.players.get(playerId) : undefined;
		if (!playerId || !player || this.phase !== "question" || this.answering !== playerId) return;
		const choice = Number(msg.choice);
		if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;

		const q = QUESTIONS[this.qIndex];
		const correct = choice === q.answer;
		if (correct) {
			// 正解: +10点、問題を締めて全員に正解を表示
			player.score += 10;
			this.lastEvent = { kind: "answer", playerId, choice, correct: true };
			this.beginReveal();
		} else {
			// 不正解: -5点、この問題ではもう押せない。残りで早押し再開
			player.score -= 5;
			this.locked.add(playerId);
			this.answering = null;
			this.lastEvent = { kind: "answer", playerId, choice, correct: false };
			if (this.locked.size >= this.players.size) {
				this.beginReveal();
			} else {
				this.scheduleAlarm();
				this.broadcast();
			}
		}
	}

	// ---------- 状態遷移 ----------

	private beginQuestion(index: number) {
		this.phase = "question";
		this.qIndex = index;
		this.locked.clear();
		this.answering = null;
		this.lastEvent = null;
		this.timers = { question: Date.now() + this.questionMs };
		this.scheduleAlarm();
		this.broadcast();
	}

	private beginReveal() {
		this.phase = "reveal";
		this.answering = null;
		this.timers = { reveal: Date.now() + this.revealMs };
		this.scheduleAlarm();
		this.broadcast();
	}

	private next() {
		if (this.qIndex + 1 >= QUESTIONS.length) {
			this.phase = "finished";
			this.timers = {};
			this.broadcast();
		} else {
			this.beginQuestion(this.qIndex + 1);
		}
	}

	async alarm(): Promise<void> {
		const now = Date.now();
		if (this.phase === "question") {
			if (this.answering && this.timers.answer !== undefined && now + 20 >= this.timers.answer) {
				// 回答制限時間切れ: 回答権をはく奪し（失点なし）、押せる人で再開
				this.lastEvent = { kind: "timeout", playerId: this.answering };
				this.locked.add(this.answering);
				this.answering = null;
				if (this.locked.size >= this.players.size) {
					this.beginReveal();
				} else {
					this.scheduleAlarm();
					this.broadcast();
				}
				return;
			}
			if (this.timers.question !== undefined && now + 20 >= this.timers.question) {
				// 出題から制限時間経過: 正解を表示
				this.beginReveal();
				return;
			}
			this.scheduleAlarm();
		} else if (this.phase === "reveal") {
			if (this.timers.reveal !== undefined && now + 20 >= this.timers.reveal) {
				this.next();
				return;
			}
			this.scheduleAlarm();
		}
	}

	private scheduleAlarm() {
		let deadline: number | undefined;
		if (this.phase === "question") {
			deadline = this.answering ? this.timers.answer : this.timers.question;
		} else if (this.phase === "reveal") {
			deadline = this.timers.reveal;
		}
		if (deadline === undefined || deadline === this.alarmScheduled) return;
		this.alarmScheduled = deadline;
		void this.state.storage.setAlarm(deadline);
	}

	// ---------- スナップショット / 送信 ----------

	private currentDeadline(): number | null {
		if (this.phase === "question") {
			return this.answering ? (this.timers.answer ?? null) : (this.timers.question ?? null);
		}
		if (this.phase === "reveal") return this.timers.reveal ?? null;
		return null;
	}

	private snapshot(forPlayer: string): StateMessage {
		const q = QUESTIONS[this.qIndex];
		const reveal = this.phase === "reveal";
		const players: PlayerView[] = [...this.players.values()].map((p) => ({
			id: p.id,
			name: p.name,
			score: p.score,
			connected: p.connected,
			isHost: p.isHost,
			locked: this.locked.has(p.id),
		}));
		return {
			type: "state",
			phase: this.phase,
			qIndex: this.qIndex,
			totalQuestions: QUESTIONS.length,
			you: forPlayer,
			now: Date.now(),
			players,
			question: this.phase === "lobby" ? null : { text: q.text, choices: [...q.choices] },
			answer: reveal ? q.answer : null,
			deadline: this.currentDeadline(),
			answering: this.phase === "question" ? this.answering : null,
			lastEvent: this.lastEvent,
		};
	}

	private send(sock: WebSocket, msg: ServerMessage | Record<string, unknown>) {
		try {
			sock.send(JSON.stringify(msg));
		} catch {
			// 送信失敗は無視（close イベントで接続切断を処理する）
		}
	}

	private broadcast() {
		for (const [sock, meta] of this.socks) {
			if (meta.playerId) {
				this.send(sock, this.snapshot(meta.playerId));
			}
		}
	}
}
