import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/questions";

/**
 * 結合テスト: 実際に worker 内で WebSocket 接続し、
 * 同時押し・得点・復帰・タイマー遷移を検証する。
 * vitest.config.ts で QUESTION_MS=2000 / ANSWER_MS=800 / REVEAL_MS=500 にしている。
 */

type AnyMsg = Record<string, any>;

class Client {
	ws: WebSocket;
	inbox: AnyMsg[] = [];
	private waiters: ((m: AnyMsg) => void)[] = [];

	constructor(ws: WebSocket) {
		this.ws = ws;
		ws.addEventListener("message", (ev) => {
			const msg = JSON.parse(ev.data as string);
			this.inbox.push(msg);
			for (const r of this.waiters.splice(0)) r(msg);
		});
	}

	next(timeoutMs = 3000): Promise<AnyMsg> {
		return new Promise((resolve, reject) => {
			const t = setTimeout(() => reject(new Error("timeout waiting for message")), timeoutMs);
			this.waiters.push((m) => {
				clearTimeout(t);
				resolve(m);
			});
		});
	}

	async waitFor(pred: (m: AnyMsg) => boolean, timeoutMs = 4000): Promise<AnyMsg> {
		// 呼び出し以降に届いたメッセージだけを対象にする(古い状態にマッチしないように)
		let cursor = this.inbox.length;
		for (;;) {
			if (cursor < this.inbox.length) {
				const msg = this.inbox[cursor++];
				if (pred(msg)) return msg;
				continue;
			}
			await this.next(timeoutMs);
		}
	}

	lastState(): AnyMsg {
		for (let i = this.inbox.length - 1; i >= 0; i--) {
			if (this.inbox[i].type === "state") return this.inbox[i];
		}
		throw new Error("no state received");
	}

	token(): string {
		const m = this.inbox.find((x) => typeof x.token === "string");
		if (!m) throw new Error("no token issued");
		return m.token;
	}

	send(obj: AnyMsg) {
		this.ws.send(JSON.stringify(obj));
	}

	async join(name: string, token?: string) {
		this.send({ type: "join", name, ...(token ? { token } : {}) });
		return this.waitFor((m) => m.type === "state" || m.type === "error");
	}

	close() {
		this.ws.close();
	}
}

let codeSeq = 0;
const nextCode = () => `T${String(++codeSeq).padStart(3, "0")}X`;

async function dial(code: string): Promise<Client> {
	const res = await SELF.fetch(`https://example.com/api/room/${code}/ws`, {
		headers: { Upgrade: "websocket" },
	});
	expect(res.status).toBe(101);
	const ws = res.webSocket!;
	ws.accept();
	return new Client(ws);
}

/** 4人が入った部屋を作る */
async function readyRoom() {
	const code = nextCode();
	const host = await dial(code);
	await host.join("host");
	const clients = [host];
	for (const n of ["b", "c", "d"]) {
		const c = await dial(code);
		await c.join(n);
		clients.push(c);
	}
	return { code, clients };
}

async function startGame(clients: Client[]) {
	clients[0].send({ type: "start" });
	await Promise.all(
		clients.map((c) => c.waitFor((m) => m.type === "state" && m.phase === "question")),
	);
}

const me = (st: AnyMsg) => st.players.find((p: any) => p.id === st.you);

describe("ロビー", () => {
	it("部屋を作るとホストになり、ロビー状態になる", async () => {
		const host = await dial(nextCode());
		const st = await host.join("host");
		expect(st.type).toBe("state");
		expect(st.phase).toBe("lobby");
		expect(st.players).toHaveLength(1);
		expect(st.players[0].isHost).toBe(true);
		host.close();
	});

	it("5人目は参加できず、満員の理由が返る", async () => {
		const { code, clients } = await readyRoom();
		const fifth = await dial(code);
		const res = await fifth.join("e");
		expect(res.type).toBe("error");
		expect(res.reason).toBe("full");
		expect(res.message).toContain("満員");
		clients.forEach((c) => c.close());
	});

	it("開始できるのは2人以上のときだけで、1人ではエラー", async () => {
		const host = await dial(nextCode());
		await host.join("host");
		host.send({ type: "start" });
		const err = await host.waitFor((m) => m.type === "error");
		expect(err.reason).toBe("cannot-start");
		host.close();
	});

	it("ホスト以外は開始できない", async () => {
		const { clients } = await readyRoom();
		clients[1].send({ type: "start" });
		const err = await clients[1].waitFor((m) => m.type === "error");
		expect(err.reason).toBe("not-host");
		clients.forEach((c) => c.close());
	});
});

describe("早押しと得点", () => {
	it("4人が同時に押しても、回答権を得るのは1人だけ", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		// 同時に全員が buzz を送る
		clients.forEach((c) => c.send({ type: "buzz" }));

		const answerers = await Promise.all(
			clients.map((c) =>
				c
					.waitFor((m) => m.type === "state" && m.answering !== null, 3000)
					.then((m) => m.answering)
					.catch(() => null),
			),
		);
		const unique = [...new Set(answerers.filter((a) => a !== null))];
		expect(unique).toHaveLength(1); // サーバーが最初に受け取った1人だけ
		clients.forEach((c) => c.close());
	});

	it("正解は+10点、不正解は-5点", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		// 1問目: clients[0] が押して choice 0 で答える
		clients[0].send({ type: "buzz" });
		await clients[0].waitFor((m) => m.type === "state" && m.answering === m.you);
		clients[0].send({ type: "answer", choice: 0 });
		const reveal1 = await clients[0].waitFor((m) => m.type === "state" && m.phase === "reveal");
		expect(reveal1.answer).not.toBeNull();
		const p0 = me(reveal1);
		if (reveal1.answer === 0) {
			expect(p0.score).toBe(10); // 正解 → +10
		} else {
			expect(p0.score).toBe(-5); // 不正解 → -5
		}
		expect(reveal1.lastEvent.correct).toBe(reveal1.answer === 0);

		// 2問目: clients[1] が正解の選択肢を答える → +10
		await clients[1].waitFor(
			(m) => m.type === "state" && m.phase === "question" && m.qIndex === 1,
		);
		clients[1].send({ type: "buzz" });
		await clients[1].waitFor((m) => m.type === "state" && m.answering === m.you);
		clients[1].send({ type: "answer", choice: QUESTIONS[1].answer });
		const reveal2 = await clients[1].waitFor((m) => m.type === "state" && m.phase === "reveal");
		expect(me(reveal2).score).toBe(10);
		clients.forEach((c) => c.close());
	});

	it("不正解の人はその問題ではもう押せず、残りで早押しを再開する", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		// clients[0] が押してわざと外す
		clients[0].send({ type: "buzz" });
		await clients[0].waitFor((m) => m.type === "state" && m.answering === m.you);
		const wrong = (QUESTIONS[0].answer + 1) % 4;
		clients[0].send({ type: "answer", choice: wrong });
		await clients[0].waitFor(
			(m) => m.type === "state" && m.lastEvent?.kind === "answer" && m.lastEvent.correct === false,
		);

		// clients[0] はロック状態で、押しても回答権を得られない
		const st0 = clients[0].lastState();
		expect(me(st0).locked).toBe(true);
		clients[0].send({ type: "buzz" });
		await new Promise((r) => setTimeout(r, 200));
		expect(clients[0].lastState().answering).not.toBe(clients[0].lastState().you);

		// clients[1] は押せる → 早押しが再開されている
		clients[1].send({ type: "buzz" });
		await clients[1].waitFor((m) => m.type === "state" && m.answering === m.you);
		clients.forEach((c) => c.close());
	});

	it("全員が押せなくなったら、制限時間を待たずに正解を表示する", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		const wrong = (QUESTIONS[0].answer + 1) % 4;
		for (let i = 0; i < 4; i++) {
			clients[i].send({ type: "buzz" });
			await clients[i].waitFor((m) => m.type === "state" && m.answering === m.you);
			clients[i].send({ type: "answer", choice: wrong });
		}
		const reveal = await clients[0].waitFor((m) => m.type === "state" && m.phase === "reveal");
		expect(reveal.answer).not.toBeNull();
		clients.forEach((c) => c.close());
	});

	it("回答権者が制限時間内に答えないと回答権を失い、押せる人で再開する", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		clients[0].send({ type: "buzz" });
		await clients[0].waitFor((m) => m.type === "state" && m.answering === m.you);

		// ANSWER_MS=800 を待つ → アラームで回答権はく奪(失点なし)
		await clients[1].waitFor(
			(m) =>
				m.type === "state" &&
				m.phase === "question" &&
				m.answering === null &&
				m.lastEvent?.kind === "timeout",
			5000,
		);
		// clients[1] はまだ押せる
		clients[1].send({ type: "buzz" });
		await clients[1].waitFor((m) => m.type === "state" && m.answering === m.you);
		clients.forEach((c) => c.close());
	});

	it("誰も押さないまま制限時間が経つと正解を表示して次へ進む", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		const reveal = await clients[0].waitFor((m) => m.type === "state" && m.phase === "reveal", 6000);
		expect(reveal.answer).not.toBeNull();
		// その後さらに待つと次の問題(または終了)に進む
		const next = await clients[0].waitFor(
			(m) => m.type === "state" && (m.phase === "question" || m.phase === "finished"),
			6000,
		);
		expect(["question", "finished"]).toContain(next.phase);
		clients.forEach((c) => c.close());
	});
});

describe("再接続と進行", () => {
	it("再読み込み(再接続)しても同じプレイヤーとして点数を保ったまま復帰できる", async () => {
		const { code, clients } = await readyRoom();
		await startGame(clients);

		// clients[1] が正解して +10
		clients[1].send({ type: "buzz" });
		await clients[1].waitFor((m) => m.type === "state" && m.answering === m.you);
		clients[1].send({ type: "answer", choice: QUESTIONS[0].answer });
		await clients[1].waitFor((m) => m.type === "state" && m.phase === "reveal");
		const myId = clients[1].lastState().you;
		expect(me(clients[1].lastState()).score).toBe(10);
		const token = clients[1].token();

		// WebSocket を切る (= 再読み込み・一時的な回線切断)
		clients[1].close();
		await new Promise((r) => setTimeout(r, 2500));

		// 同じトークンで再接続 → 同じプレイヤーid・点数で復帰
		const re = await dial(code);
		const st = await re.join("b", token);
		expect(st.type).toBe("state");
		expect(st.you).toBe(myId);
		expect(me(st).score).toBe(10);
		expect(me(st).connected).toBe(true);

		// 復帰後もゲームに参加できる: 誰も回答権を持っていない問題で押す
		await re.waitFor(
			(m) => m.type === "state" && m.phase === "question" && m.answering === null,
			10000,
		);
		re.send({ type: "buzz" });
		await re.waitFor((m) => m.type === "state" && m.answering === re.lastState().you, 5000);
		clients.forEach((c) => c.close());
		re.close();
	}, 30000);

	it("4人が同時に参加し、10問終わると finished になる (スモーク)", async () => {
		const { clients } = await readyRoom();
		await startGame(clients);

		let q = 0;
		for (;;) {
			const st = await clients[0].waitFor(
				(m) => m.type === "state" && (m.phase === "question" || m.phase === "finished"),
				10000,
			);
			if (st.phase === "finished") break;
			const p = clients[q % 4];
			p.send({ type: "buzz" });
			await p.waitFor((m) => m.type === "state" && m.answering === m.you, 3000);
			p.send({ type: "answer", choice: QUESTIONS[st.qIndex].answer }); // 正解して即 reveal
			q++;
			expect(q).toBeLessThan(30);
		}
		const fin = clients[0].lastState();
		expect(fin.players).toHaveLength(4);
		expect(fin.qIndex).toBe(9);
		clients.forEach((c) => c.close());
	}, 60000);
});
