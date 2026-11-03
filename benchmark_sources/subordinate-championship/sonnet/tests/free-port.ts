import { createServer } from "node:net";

/** OS に空きポートを選ばせる。ほかのプロセス（別のエージェントの開発サーバー等）と衝突しないための道具。 */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}
