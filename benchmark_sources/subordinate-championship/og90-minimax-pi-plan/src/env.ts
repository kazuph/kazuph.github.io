import type { Room } from "./room";

/** Worker と Durable Object が共有するbindings */
export interface Env {
  /** 1部屋 = 1 Durable Object */
  ROOM: DurableObjectNamespace<Room>;
  /** 静的アセット */
  ASSETS?: Fetcher;
}
