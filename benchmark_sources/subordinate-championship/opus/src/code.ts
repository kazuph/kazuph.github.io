// 部屋コードの生成と正規化
/** 読み間違えやすい 0/O/1/I を除いた文字で5桁の部屋コードを作る */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export function newRoomCode(): string {
  const a = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(a);
  return [...a].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code) ? code : null;
}
