import type { QuizRoom } from './room';

export interface Env {
  QUIZ_ROOM: DurableObjectNamespace<QuizRoom>;
  ASSETS: Fetcher;
}
