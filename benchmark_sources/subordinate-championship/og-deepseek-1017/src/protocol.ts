/** クライアントとサーバーで共有するメッセージ型。 */

import type { RoomView } from "./engine.js";

export type ClientMessage =
  | { t: "join"; playerId: string; name: string }
  | { t: "start" }
  | { t: "buzz" }
  | { t: "answer"; choice: number }
  | { t: "again" }
  | { t: "ping" };

export interface StateMessage {
  t: "state";
  serverNow: number;
  state: RoomView;
}

export interface WelcomeMessage {
  t: "welcome";
  playerId: string;
  room: string;
}

export interface ErrorMessage {
  t: "error";
  message: string;
}

export interface PongMessage {
  t: "pong";
  serverNow: number;
}

export type ServerMessage = StateMessage | WelcomeMessage | ErrorMessage | PongMessage;
