import { spawn, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { BASE } from './helpers';

// テスト専用の wrangler dev（ポート 8790・別の保存先）を立てて、終わったら止める。
// 8782（開発用）には触らない。
const TEST_PORT = new URL(BASE).port || '8790';
let proc: ChildProcess | null = null;

export async function setup(): Promise<void> {
  rmSync('.wrangler/test-state', { recursive: true, force: true });
  proc = spawn(
    'node_modules/.bin/wrangler',
    ['dev', '--port', TEST_PORT, '--inspector-port', '9790', '--ip', '127.0.0.1', '--persist-to', '.wrangler/test-state'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  proc.stdout?.on('data', () => {});
  proc.stderr?.on('data', () => {});
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch {
      // まだ起動中
    }
    if (Date.now() > deadline) throw new Error('wrangler dev (test) did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
}

export async function teardown(): Promise<void> {
  proc?.kill('SIGTERM');
}
