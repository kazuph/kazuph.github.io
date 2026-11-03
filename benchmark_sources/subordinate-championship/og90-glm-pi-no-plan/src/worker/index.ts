import { RoomDO } from "./room";

export { RoomDO };

export interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

function normalizeCode(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(c) ? c : null;
}

function sanitizeName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim().slice(0, 12);
  return name.length > 0 ? name : null;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }

    // 部屋を作る（ホストになる）
    if (url.pathname === "/api/create" && request.method === "POST") {
      const body = await readJson(request);
      const name = sanitizeName(body.name);
      if (!name) return Response.json({ error: "名前を入力してください" }, { status: 400 });
      // コードが万一重複した場合は作り直す
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = newCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await stub.fetch("https://room.internal/internal/create", {
          method: "POST",
          body: JSON.stringify({ name, fast: body.fast === true }),
        });
        if (res.status === 409) continue; // コード重複
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          return Response.json({ error: err.error ?? "部屋を作れませんでした" }, { status: res.status });
        }
        const { token } = (await res.json()) as { token: string };
        return Response.json({ code, token });
      }
      return Response.json({ error: "部屋コードの採番に失敗しました。もう一度お試しください" }, { status: 500 });
    }

    // 部屋に参加する
    if (url.pathname === "/api/join" && request.method === "POST") {
      const body = await readJson(request);
      const name = sanitizeName(body.name);
      const code = normalizeCode(body.code);
      if (!name) return Response.json({ error: "名前を入力してください" }, { status: 400 });
      if (!code) return Response.json({ error: "部屋コードは4文字の英数字です" }, { status: 400 });
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      // 部屋が存在しない場合: /internal/create 相当の状態チェックのために、まず join を試す
      const res = await stub.fetch("https://room.internal/internal/join", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (res.status === 400 || res.status === 409) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        // 未初期化の DO に join すると requireRoom が throw するので 500 になる。それを「見つからない」に寄せる
        return Response.json({ error: err.error ?? "部屋が見つかりません" }, { status: res.status === 400 ? 400 : 409 });
      }
      if (!res.ok) {
        return Response.json({ error: "部屋が見つかりません" }, { status: 404 });
      }
      const { token } = (await res.json()) as { token: string };
      return Response.json({ code, token });
    }

    // ゲーム用 WebSocket → 部屋の Durable Object へ
    if (url.pathname === "/ws") {
      const code = normalizeCode(url.searchParams.get("code"));
      const token = url.searchParams.get("token") ?? "";
      if (!code || !token) {
        return new Response("Bad Request", { status: 400 });
      }
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      const wsUrl = new URL("https://room.internal/ws");
      wsUrl.searchParams.set("token", token);
      return stub.fetch(wsUrl.toString(), request);
    }

    // それ以外は静的アセット（public/ の SPA）
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
