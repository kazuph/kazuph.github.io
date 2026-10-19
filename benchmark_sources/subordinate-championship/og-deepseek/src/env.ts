import type { Room } from "./room";

export interface Env {
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace<Room>;
  ROOM_QUESTION_MS?: string;
  ROOM_ANSWER_MS?: string;
  ROOM_REVEAL_MS?: string;
}
