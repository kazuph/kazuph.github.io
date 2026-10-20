/** Worker バインディング。wrangler.jsonc の設定と対応する。 */
export interface Env {
  /** 部屋ごとの Durable Object 名前空間 */
  ROOMS: DurableObjectNamespace;
  /** 静的アセット (public/) */
  ASSETS: Fetcher;
  /** テストや E2E で短縮できるようにしている時間設定（文字列で渡ってくる） */
  QUESTION_MS?: string;
  ANSWER_MS?: string;
  REVEAL_MS?: string;
}
