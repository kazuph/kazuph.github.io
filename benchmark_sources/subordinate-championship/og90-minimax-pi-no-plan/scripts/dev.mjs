#!/usr/bin/env node
/**
 * ローカル開発サーバーの起動スクリプト。
 *
 * - アプリの URL は必ず http://localhost:8787
 * - inspector（デバッグ）ポートは 8787 以外の空きポートをランダムに選ぶ
 *   （他のエージェントと衝突しないため）
 */
import { spawn } from "node:child_process";
import net from "node:net";

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

const inspectorPort = await freePort();
const extra = process.argv.slice(2);

console.log(`[dev] inspector port: ${inspectorPort}`);
console.log("[dev] app url: http://localhost:8787");

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "wrangler",
    "dev",
    "--port",
    "8787",
    "--inspector-port",
    String(inspectorPort),
    ...extra,
  ],
  { stdio: "inherit", env: process.env },
);

const stop = () => {
  child.kill("SIGINT");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
