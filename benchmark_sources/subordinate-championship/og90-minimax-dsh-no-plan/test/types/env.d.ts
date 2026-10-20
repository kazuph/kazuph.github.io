/** テストから env バインディングを型付けするための宣言 */
declare namespace Cloudflare {
  interface Env {
    ROOM: DurableObjectNamespace;
    ASSETS: Fetcher;
  }
}
