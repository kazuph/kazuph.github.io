/** テスト用の最小の `ws` 型定義（@types/ws を追加せずに済ませる） */
declare module 'ws' {
  export default class WebSocket {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;
    constructor(address: string, options?: unknown);
    readonly readyState: number;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    send(data: string | Uint8Array): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
  }
}
