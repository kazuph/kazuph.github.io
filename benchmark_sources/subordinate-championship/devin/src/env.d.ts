interface Env {
  ROOMS: DurableObjectNamespace<import("./room").Room>;
  ASSETS: Fetcher;
  QUESTION_MS?: string;
  ANSWER_MS?: string;
  REVEAL_MS?: string;
}
