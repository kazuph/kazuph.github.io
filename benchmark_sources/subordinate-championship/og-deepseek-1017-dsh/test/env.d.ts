/// <reference path="../node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts" />
import type { Env as WorkerEnv } from "../src/env";

// 結合テストで使う `cloudflare:test` モジュールの型を読み込む。
// (test/integration/*.test.ts は Workers ランタイム上で実行される)
//
// `cloudflare:test` の `env` は `Cloudflare.Env` 型なので、
// このアプリのバインディングをここで拡張しておく。
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {}
  }
}
