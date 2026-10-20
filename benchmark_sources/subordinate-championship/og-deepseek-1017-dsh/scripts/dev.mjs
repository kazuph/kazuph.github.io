#!/usr/bin/env node
/**
 * `wrangler dev` のラッパー。
 *
 * - アプリ本体は必ず 8787 (課題の決定済み事項)。
 * - inspector など補助ポートは固定値を避け、空いているポートを毎回探して使う。
 *   （他のエージェントと衝突しないようにするため）
 * - `--var KEY:VALUE` を後ろに付けると、時間設定などを上書きできる。
 *
 * 使い方:
 *   node scripts/dev.mjs --port 8787
 *   node scripts/dev.mjs --port 8899 --var REVEAL_MS:1200 --var QUESTION_MS:8000
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);

function takeFlag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1];
  argv.splice(index, 2);
  return value;
}

const port = Number(takeFlag("--port") || process.env.PORT || 8787);
const inspectorPortFlag = takeFlag("--inspector-port");
const ip = takeFlag("--ip") || process.env.WRANGLER_IP || "127.0.0.1";
const passThrough = [...argv];

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const found = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(found));
    });
  });
}

const inspectorPort = inspectorPortFlag ? Number(inspectorPortFlag) : await findFreePort();

const wranglerBin = path.join(root, "node_modules", ".bin", "wrangler");
const args = [
  "dev",
  "--ip",
  ip,
  "--port",
  String(port),
  "--inspector-port",
  String(inspectorPort),
  "--show-interactive-dev-session=false",
  ...passThrough,
];

console.log(`[dev] http://localhost:${port}  (bind: ${ip}, inspector: ${inspectorPort})`);

const child = spawn(wranglerBin, args, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    WRANGLER_SEND_METRICS: "false",
    CI: "1",
  },
});

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
