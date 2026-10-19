import PAGE from "../public/index.html";
import { RoomObject } from "./room";

export { RoomObject };

export interface Env {
  ROOM: DurableObjectNamespace;
}

function roomCodeFromUrl(url: URL): string {
  // /ws?room=AB12 または /r/AB12
  const q = url.searchParams.get("room");
  if (q) return q.toUpperCase().slice(0, 8);
  const m = url.pathname.match(/^\/r\/([A-Za-z0-9]{1,8})/);
  if (m) return m[1].toUpperCase();
  return "";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws" || url.pathname.startsWith("/ws/")) {
      let code = roomCodeFromUrl(url);
      if (!code && url.pathname.startsWith("/ws/")) {
        code = url.pathname.slice(4).toUpperCase().slice(0, 8);
      }
      if (!code) return new Response("room code required", { status: 400 });
      const id = env.ROOM.idFromName(`room-${code}`);
      const stub = env.ROOM.get(id);
      const forward = new URL(request.url);
      forward.searchParams.set("room", code);
      return stub.fetch(new Request(forward.toString(), request));
    }
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }
    if (url.pathname === "/" || !url.pathname.includes(".")) {
      return new Response(PAGE, {
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    }
    return new Response("not found", { status: 404 });
  },
};
