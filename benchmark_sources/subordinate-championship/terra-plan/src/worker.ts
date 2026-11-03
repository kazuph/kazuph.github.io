export { Room } from './room';
interface Env { ROOM: DurableObjectNamespace; ASSETS: Fetcher }
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code() { return Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join(''); }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let i = 0; i < 10; i++) {
        const roomCode = code();
        const headers = new Headers(request.headers); headers.set('x-room-code', roomCode);
        const response = await env.ROOM.get(env.ROOM.idFromName(roomCode)).fetch(new Request(`https://room/create`,
          { method: 'POST', body: request.clone().body, headers }));
        if (response.status !== 409) return response;
      }
      return Response.json({ error: '部屋を作れませんでした' }, { status: 503 });
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{6})\/(join|ws)$/);
    if (match) return env.ROOM.get(env.ROOM.idFromName(match[1])).fetch(request);
    if (url.pathname.startsWith('/api/')) return Response.json({ error: '見つかりません' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
