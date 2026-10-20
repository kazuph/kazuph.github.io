/* 最小限の Cloudflare ランタイム型シム（ローカル実行の実動作は wrangler/workerd が保証）。
   厳密な型は @cloudflare/workers-types ではなく、ゲームロジック側(src/engine.ts)で担保する。 */
declare module "cloudflare:workers" {
  class DurableObject<Env = any> {
    ctx: any;
    env: Env;
    constructor(ctx: any, env: Env);
  }
}

declare type DurableObjectNamespace = any;
declare type Fetcher = any;
declare const WebSocketPair: any;
