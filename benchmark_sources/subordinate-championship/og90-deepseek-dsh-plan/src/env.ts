import type { Room } from "./room";

/** wrangler.jsonc の bindings に対応するバインディング。 */
export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
}
