import { Room } from "./room";

export { Room };

interface Env {
	ROOMS: DurableObjectNamespace;
	ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

/**
 * - /api/room/<code>/ws (WebSocket) → 該当コードの Room Durable Object へ中継
 * - それ以外 → 静的アセット (public/) 、無ければ 404
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const match = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{3,8})\/ws$/);
		if (match) {
			const code = match[1];
			const id = env.ROOMS.idFromName(code);
			return env.ROOMS.get(id).fetch(request);
		}
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}
		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
