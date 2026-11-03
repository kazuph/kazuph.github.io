import type { Room } from "./room";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}
